'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// =============================================================================
// Stepper Motor Control - Complete 10-Phase Game (#269)
// How stepper motors achieve precise open-loop position control
// by energizing coils in sequence: full-step, half-step, microstepping
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

interface StepperMotorRendererProps {
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
// COIL ENERGIZATION SEQUENCES
// =============================================================================
const fullStepSequence = [
  { A: 1, B: 0, C: -1, D: 0 },
  { A: 0, B: 1, C: 0, D: -1 },
  { A: -1, B: 0, C: 1, D: 0 },
  { A: 0, B: -1, C: 0, D: 1 },
];

const halfStepSequence = [
  { A: 1, B: 0, C: -1, D: 0 },
  { A: 1, B: 1, C: -1, D: -1 },
  { A: 0, B: 1, C: 0, D: -1 },
  { A: -1, B: 1, C: 1, D: -1 },
  { A: -1, B: 0, C: 1, D: 0 },
  { A: -1, B: -1, C: 1, D: 1 },
  { A: 0, B: -1, C: 0, D: 1 },
  { A: 1, B: -1, C: -1, D: 1 },
];

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple-choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: 'A 3D printer specification states it uses a 200-step-per-revolution stepper motor with a lead screw that has a pitch of 2 mm per revolution.',
    question: 'What is the minimum linear movement the printer can make per full step?',
    options: [
      { id: 'a', label: '0.1 mm' },
      { id: 'b', label: '0.01 mm', correct: true },
      { id: 'c', label: '1 mm' },
      { id: 'd', label: '0.001 mm' },
    ],
    explanation: 'A 200-step motor has a step angle of 1.8 degrees (360/200). One revolution = 2 mm of linear travel. Each step moves 2mm / 200 = 0.01 mm. This is the full-step resolution; microstepping can improve this further.'
  },
  {
    scenario: 'An engineer switches a CNC machine from full-step mode to 1/16 microstepping. The motor has 200 steps per revolution.',
    question: 'How does microstepping improve resolution, and what trade-off occurs?',
    options: [
      { id: 'a', label: 'Resolution improves 16x with no downsides' },
      { id: 'b', label: 'Resolution improves 16x to 3200 steps/rev, but holding torque per microstep decreases significantly', correct: true },
      { id: 'c', label: 'Resolution stays the same but the motor runs more quietly' },
      { id: 'd', label: 'Resolution improves 16x and torque also increases proportionally' },
    ],
    explanation: 'Microstepping divides each full step into 16 microsteps, giving 3200 positions per revolution. However, each microstep produces a smaller torque increment. At high microstep divisions, the incremental torque per step drops to a small fraction of the full-step torque, reducing positional accuracy under load.'
  },
  {
    scenario: 'A stepper motor is driving a conveyor belt at increasing speed. At 800 RPM, the operator notices the belt suddenly stops moving even though the controller is still sending step pulses.',
    question: 'What caused the motor to stall at high speed?',
    options: [
      { id: 'a', label: 'The motor overheated and thermal protection engaged' },
      { id: 'b', label: 'Back-EMF at high speed reduces coil current, causing torque to drop below the load requirement', correct: true },
      { id: 'c', label: 'The step pulses exceeded the maximum clock frequency of the driver chip' },
      { id: 'd', label: 'Centrifugal force on the rotor magnets caused them to demagnetize' },
    ],
    explanation: 'As the rotor spins faster, it generates increasing back-EMF that opposes the supply voltage. This reduces the net voltage driving current into the coils, lowering current and therefore torque. When available torque drops below the load torque, the rotor can no longer keep up with the step pulses and loses synchronization -- this is called "losing steps."'
  },
  {
    scenario: 'A robotics team is choosing between a stepper motor and a servo motor for a robotic arm joint that must hold a heavy tool in position while powered.',
    question: 'What advantage does a stepper motor have for holding position?',
    options: [
      { id: 'a', label: 'Stepper motors are lighter and generate less heat' },
      { id: 'b', label: 'Stepper motors provide high holding torque with energized coils and maintain position without feedback sensors', correct: true },
      { id: 'c', label: 'Stepper motors automatically increase torque when load increases' },
      { id: 'd', label: 'Stepper motors consume no power while holding position' },
    ],
    explanation: 'Stepper motors have inherent holding torque when their coils are energized -- the rotor magnets lock to the stator field. This provides precise position holding without any encoder or feedback loop. Servo motors need continuous closed-loop control to maintain position, making steppers simpler for static holding applications.'
  },
  {
    scenario: 'An engineer designs a telescope tracking mount using a stepper motor. During testing at a certain step rate, the telescope vibrates violently even though the motor is not overloaded.',
    question: 'What phenomenon is causing the violent vibration?',
    options: [
      { id: 'a', label: 'The motor bearings are worn and need replacement' },
      { id: 'b', label: 'Mid-band resonance: the step frequency matches the rotor natural frequency, causing oscillation', correct: true },
      { id: 'c', label: 'The power supply voltage is fluctuating' },
      { id: 'd', label: 'Gravitational effects from the telescope weight' },
    ],
    explanation: 'Stepper motors have a natural resonant frequency determined by rotor inertia and magnetic stiffness. When the stepping rate matches this frequency (typically 100-200 Hz for small motors), the rotor oscillations amplify instead of damping. This mid-band resonance can cause missed steps, excessive vibration, and even stalling. Microstepping and damping circuits help mitigate this.'
  },
  {
    scenario: 'A 3D printer uses a bipolar stepper motor with two coils (Phase A and Phase B). The driver energizes the coils in the sequence: A+, B+, A-, B-.',
    question: 'How many full steps does it take for the rotor to complete one electrical cycle?',
    options: [
      { id: 'a', label: '2 steps' },
      { id: 'b', label: '4 steps', correct: true },
      { id: 'c', label: '8 steps' },
      { id: 'd', label: '200 steps' },
    ],
    explanation: 'One electrical cycle consists of energizing each phase in both polarities: A+, B+, A-, B-. That is 4 full steps per electrical cycle. For a 200-step motor with 50 rotor pole pairs, there are 50 electrical cycles per mechanical revolution: 50 x 4 = 200 full steps for one complete rotation.'
  },
  {
    scenario: 'A factory automation engineer is troubleshooting a stepper-driven linear slide. The motor moves correctly at low speed, but at high speed the actual position consistently falls short of the commanded position.',
    question: 'What is the most likely cause, and how can it be fixed?',
    options: [
      { id: 'a', label: 'The lead screw has backlash; add a preloaded ball screw nut' },
      { id: 'b', label: 'The motor is losing steps due to insufficient torque at speed; increase supply voltage or reduce acceleration', correct: true },
      { id: 'c', label: 'The controller software has a rounding error in position calculation' },
      { id: 'd', label: 'The motor is overheating and magnets are weakening' },
    ],
    explanation: 'Stepper motors are open-loop: the controller assumes every commanded step is executed. When torque is insufficient at high speed (due to back-EMF), steps are lost silently. Increasing supply voltage allows faster current rise in the coils (overcoming inductance), and reducing acceleration lowers peak torque demand. Alternatively, adding an encoder creates a closed-loop system.'
  },
  {
    scenario: 'A stepper motor datasheet shows two current-waveform options for driving the coils: a square wave (full step) and a sinusoidal wave (microstepping).',
    question: 'Why does a sinusoidal current waveform produce smoother motion?',
    options: [
      { id: 'a', label: 'Sine waves have more energy per cycle than square waves' },
      { id: 'b', label: 'Sinusoidal currents create a smoothly rotating magnetic field, eliminating the abrupt jumps between discrete positions', correct: true },
      { id: 'c', label: 'Sinusoidal drives use lower current so vibration is reduced' },
      { id: 'd', label: 'The motor windings filter out harmonics naturally' },
    ],
    explanation: 'In full-step mode, current switches abruptly between phases, causing the rotor to jump between detent positions. With sinusoidal microstepping, the currents in both phases vary smoothly (sin and cos), creating a continuously rotating magnetic field. The rotor follows this smooth field rotation rather than jumping between positions, dramatically reducing vibration and noise.'
  },
  {
    scenario: 'A stepper motor rated at 2A per phase is driven at its rated current. The engineer notices the motor case temperature reaches 80 degrees C during continuous operation, even when the motor is stationary.',
    question: 'Why does a stationary stepper motor generate significant heat?',
    options: [
      { id: 'a', label: 'Friction in the bearings generates heat even when stationary' },
      { id: 'b', label: 'The coils are continuously energized to maintain holding torque, dissipating I-squared-R power as heat', correct: true },
      { id: 'c', label: 'Eddy currents in the rotor magnets cause heating' },
      { id: 'd', label: 'The driver chip efficiency drops to zero at zero speed' },
    ],
    explanation: 'Unlike DC or servo motors that draw minimal current at rest, stepper motors maintain full rated current in their coils to produce holding torque. The power dissipated is P = I^2 x R per phase, which is constant regardless of speed. This is why stepper motors often run hot even when stationary, and current reduction (idle current mode) is commonly used to reduce heat.'
  },
  {
    scenario: 'An engineer compares two stepper motors for a precision positioning application. Motor A has 200 steps/rev (1.8 degree step angle), and Motor B has 400 steps/rev (0.9 degree step angle).',
    question: 'Besides higher resolution, what other characteristic differs between these motors?',
    options: [
      { id: 'a', label: 'Motor B has exactly twice the torque of Motor A' },
      { id: 'b', label: 'Motor B has more rotor teeth and higher inductance, reducing maximum speed but improving low-speed positioning accuracy', correct: true },
      { id: 'c', label: 'Motor B uses permanent magnets while Motor A uses only electromagnets' },
      { id: 'd', label: 'Motor B requires twice the supply voltage' },
    ],
    explanation: 'A 400-step motor has 100 rotor pole pairs versus 50 for a 200-step motor. More poles means more winding turns and higher inductance, which limits how fast current can change in the coils. This reduces the maximum stepping rate (speed). However, the finer step angle (0.9 degrees) provides better positioning accuracy at low speeds without microstepping.'
  },
];

// =============================================================================
// REAL WORLD APPLICATIONS
// =============================================================================
const realWorldApps = [
  {
    icon: '🖨',
    title: '3D Printing & Additive Manufacturing',
    short: '3D Printers',
    tagline: 'Layer-by-layer precision at 0.01mm resolution',
    description: 'FDM 3D printers use 3-4 stepper motors to control X, Y, Z axes and filament extrusion. Each motor moves the print head or bed in precise increments to build objects layer by layer.',
    connection: 'The step angle and microstepping you explored directly determine print resolution. A 200-step motor with 1/16 microstepping on a 2mm lead screw gives 0.000625mm theoretical resolution per microstep.',
    howItWorks: 'G-code commands are translated to step pulses. The firmware calculates acceleration profiles to avoid missed steps at high travel speeds. Microstepping smooths motion to reduce visible layer lines.',
    stats: [
      { value: '0.05mm', label: 'Typical layer height' },
      { value: '3-5', label: 'Motors per printer' },
      { value: '80mm/s', label: 'Typical print speed' },
    ],
    examples: ['Prusa MK4 uses NEMA 17 steppers', 'Voron uses TMC2209 silent drivers', 'Belt printers use continuous Z motion', 'Resin printers use steppers for build plate'],
    companies: ['Prusa Research', 'Bambu Lab', 'Creality', 'Ultimaker'],
    futureImpact: 'Closed-loop stepper systems with encoders are eliminating missed steps, enabling faster and more reliable printing without the cost of full servo systems.',
    color: '#3B82F6',
  },
  {
    icon: '🏭',
    title: 'CNC Machining & Milling',
    short: 'CNC Machines',
    tagline: 'Cutting metal with micron-level accuracy',
    description: 'CNC routers and mills use stepper motors (in hobby/light-industrial machines) or servos (in production machines) to control tool position in 3+ axes while cutting material.',
    connection: 'The torque-speed curve you studied is critical here: CNC cutting forces create load torque, and if the motor speed exceeds the torque-speed limit, the cutter will deviate from the programmed path.',
    howItWorks: 'CAM software generates tool paths, which are converted to coordinated step pulses for each axis. Acceleration ramping prevents lost steps during rapid moves. Ball screws convert rotation to linear motion with minimal backlash.',
    stats: [
      { value: '0.01mm', label: 'Typical positioning accuracy' },
      { value: '4-5', label: 'Axes of motion' },
      { value: '24,000', label: 'Spindle RPM' },
    ],
    examples: ['Hobby CNC routers for woodworking', 'PCB milling machines', 'Laser cutters with stepper XY stages', 'Plasma cutting tables'],
    companies: ['Haas Automation', 'Tormach', 'Carbide 3D', 'Stepcraft'],
    futureImpact: 'Hybrid stepper-servo drives combine open-loop simplicity with closed-loop correction, bringing production-grade accuracy to desktop CNC machines.',
    color: '#F59E0B',
  },
  {
    icon: '🔬',
    title: 'Scientific Instruments & Optics',
    short: 'Lab Equipment',
    tagline: 'Nanometer precision for research',
    description: 'Microscope stages, spectrometers, and telescope mounts use stepper motors with high microstepping ratios to achieve sub-micron positioning for sample manipulation and optical alignment.',
    connection: 'The resonance phenomenon you discovered is especially critical in optics: vibration at even 1 micron can blur images. Anti-resonance techniques from your exploration are essential in these applications.',
    howItWorks: 'Precision stages use stepper motors with harmonic drives or fine-pitch lead screws. Microstepping with 256 divisions provides smooth sub-micron motion. Closed-loop encoders verify position for critical applications.',
    stats: [
      { value: '50nm', label: 'Positioning resolution' },
      { value: '1/256', label: 'Microstepping ratio' },
      { value: '< 1 arc-sec', label: 'Angular accuracy' },
    ],
    examples: ['Confocal microscope stages', 'Telescope equatorial mounts', 'Spectrophotometer gratings', 'Semiconductor wafer steppers'],
    companies: ['Thorlabs', 'Newport (MKS)', 'PI (Physik Instrumente)', 'Celestron'],
    futureImpact: 'Piezo-stepper hybrid systems combine stepper motor range with piezoelectric nanometer precision for next-generation lithography and microscopy.',
    color: '#8B5CF6',
  },
  {
    icon: '🤖',
    title: 'Robotics & Automation',
    short: 'Robots',
    tagline: 'Repeatable motion for manufacturing',
    description: 'Pick-and-place machines, SCARA robots, and automated assembly lines use stepper motors for repeatable positioning where the open-loop nature (no encoder needed) reduces cost and complexity.',
    connection: 'The holding torque and open-loop control you studied make steppers ideal for applications that need to hold position reliably without continuous servo control and feedback sensors.',
    howItWorks: 'Stepper motors drive robot joints through timing belts or gear trains. Motion profiles are pre-calculated to stay within the torque-speed envelope. Multiple axes are coordinated via interpolation algorithms in the motion controller.',
    stats: [
      { value: '0.05mm', label: 'Pick-place accuracy' },
      { value: '120+', label: 'Picks per minute' },
      { value: '< $500', label: 'Cost per axis' },
    ],
    examples: ['SMT pick-and-place machines', 'Automated dispensing systems', 'Delta robots for packaging', 'Collaborative robot grippers'],
    companies: ['FANUC', 'ABB', 'Universal Robots', 'Omron'],
    futureImpact: 'AI-powered motion planning dynamically adjusts stepper profiles based on real-time load sensing, enabling adaptive robotic manipulation without expensive force-torque sensors.',
    color: '#EF4444',
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const StepperMotorRenderer: React.FC<StepperMotorRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Play phase state
  const [stepMode, setStepMode] = useState<'full' | 'half' | 'micro'>('full');
  const [rotorAngle, setRotorAngle] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [stepRate, setStepRate] = useState(5); // steps per second
  const [coilCurrent, setCoilCurrent] = useState(2.0); // Amps

  // Twist phase state
  const [twistSpeed, setTwistSpeed] = useState(100); // RPM
  const [loadTorque, setLoadTorque] = useState(30); // percentage of max
  const [missedSteps, setMissedSteps] = useState(0);
  const [isTwistRunning, setIsTwistRunning] = useState(false);
  const [twistRotorAngle, setTwistRotorAngle] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const isNavigating = useRef(false);
  const autoStepRef = useRef<NodeJS.Timeout | null>(null);
  const twistIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Auto-stepping
  useEffect(() => {
    if (isAutoStepping) {
      autoStepRef.current = setInterval(() => {
        handleStep(1);
      }, 1000 / stepRate);
    }
    return () => {
      if (autoStepRef.current) clearInterval(autoStepRef.current);
    };
  }, [isAutoStepping, stepRate, stepMode]);

  // Twist phase animation
  useEffect(() => {
    if (isTwistRunning) {
      const maxTorqueAtSpeed = getMaxTorque(twistSpeed, coilCurrent);
      const loadFraction = loadTorque / 100;
      const actualTorqueNeeded = loadFraction * 100; // Nm equivalent
      const losing = actualTorqueNeeded > maxTorqueAtSpeed;

      twistIntervalRef.current = setInterval(() => {
        setTwistRotorAngle(prev => {
          if (losing) {
            setMissedSteps(m => m + 1);
            return prev + (twistSpeed / 60) * 1.8 * 0.5; // partial movement
          }
          return prev + (twistSpeed / 60) * 1.8;
        });
      }, 50);
    }
    return () => {
      if (twistIntervalRef.current) clearInterval(twistIntervalRef.current);
    };
  }, [isTwistRunning, twistSpeed, loadTorque, coilCurrent]);

  // Torque-speed curve calculation
  const getMaxTorque = (rpm: number, current: number): number => {
    const baseTorque = current * 50; // base torque scales with current
    // Back-EMF reduces available torque at speed
    const backEmfFactor = Math.max(0, 1 - (rpm / 1200));
    // Inductance roll-off
    const inductanceRolloff = 1 / (1 + (rpm / 400) ** 2);
    return baseTorque * Math.min(backEmfFactor, inductanceRolloff);
  };

  // Step angle based on mode
  const getStepAngle = (): number => {
    switch (stepMode) {
      case 'full': return 1.8;
      case 'half': return 0.9;
      case 'micro': return 1.8 / 16; // 1/16 microstepping
    }
  };

  // Get current coil states based on step mode and index
  const getCoilStates = (): { A: number; B: number; C: number; D: number } => {
    if (stepMode === 'full') {
      return fullStepSequence[stepIndex % 4];
    } else if (stepMode === 'half') {
      return halfStepSequence[stepIndex % 8];
    } else {
      // Microstepping: sinusoidal
      const microAngle = (stepIndex * (2 * Math.PI)) / 64;
      return {
        A: Math.cos(microAngle),
        B: Math.sin(microAngle),
        C: -Math.cos(microAngle),
        D: -Math.sin(microAngle),
      };
    }
  };

  // Handle stepping
  const handleStep = useCallback((direction: 1 | -1) => {
    const angle = getStepAngle();
    setRotorAngle(prev => prev + angle * direction);
    setStepIndex(prev => {
      const maxIdx = stepMode === 'full' ? 4 : stepMode === 'half' ? 8 : 64;
      return ((prev + direction) % maxIdx + maxIdx) % maxIdx;
    });
    setTotalSteps(prev => prev + 1);
    playSound('click');
  }, [stepMode]);

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#6366f1', // Indigo for electromechanical theme
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    coilA: '#ef4444',
    coilB: '#3b82f6',
    coilC: '#22c55e',
    coilD: '#f59e0b',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, #818cf8)`,
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '16px',
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setIsAutoStepping(false);
    setIsTwistRunning(false);
    setPhase(p);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'stepper-motor',
        gameTitle: 'Stepper Motor Control',
        details: { phase: p },
        timestamp: Date.now(),
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

  // Progress bar
  const renderProgressBar = () => {
    const idx = phaseOrder.indexOf(phase);
    const pct = ((idx + 1) / phaseOrder.length) * 100;
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: `${colors.bgPrimary}ee`, backdropFilter: 'blur(12px)',
        padding: '8px 16px', borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Step {idx + 1}/{phaseOrder.length} -- {phaseLabels[phase]}
          </span>
          <span style={{ fontSize: '11px', color: colors.accent }}>{Math.round(pct)}%</span>
        </div>
        <div style={{ height: '3px', background: colors.border, borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${colors.accent}, #818cf8)`, borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
      </div>
    );
  };

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: '6px',
      padding: '16px', flexWrap: 'wrap',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          title={phaseLabels[p]}
          style={{
            width: '10px', height: '10px', borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: p === phase ? colors.accent : i < phaseOrder.indexOf(phase) ? colors.success : colors.border,
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );

  // =====================================================================
  // SVG: STEPPER MOTOR CROSS-SECTION
  // =====================================================================
  const renderMotorVisualization = (angle: number, showCoils = true) => {
    const width = isMobile ? 320 : 420;
    const height = isMobile ? 300 : 360;
    const cx = width / 2;
    const cy = height / 2 + 10;
    const statorR = isMobile ? 100 : 130;
    const rotorR = isMobile ? 55 : 72;
    const coils = getCoilStates();
    const teethCount = 8;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px' }}
        preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="Stepper Motor Cross-Section">
        <defs>
          <radialGradient id="statorGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>
          <radialGradient id="rotorGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>
          <filter id="coilGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="magnetGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill={colors.bgSecondary} rx="12" />

        {/* Title */}
        <text x={cx} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Stepper Motor Cross-Section ({stepMode === 'full' ? 'Full Step' : stepMode === 'half' ? 'Half Step' : 'Microstep'})
        </text>

        {/* Stator housing */}
        <circle cx={cx} cy={cy} r={statorR} fill="url(#statorGrad)" stroke="#475569" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={statorR - 8} fill="none" stroke="#334155" strokeWidth="1" />

        {/* Stator coils (4 poles: A at 0deg, B at 90deg, C at 180deg, D at 270deg) */}
        {showCoils && [
          { label: 'A', angle: 0, color: colors.coilA, val: coils.A },
          { label: 'B', angle: 90, color: colors.coilB, val: coils.B },
          { label: 'C', angle: 180, color: colors.coilC, val: coils.C },
          { label: 'D', angle: 270, color: colors.coilD, val: coils.D },
        ].map(coil => {
          const rad = (coil.angle * Math.PI) / 180;
          const coilDist = statorR - 28;
          const coilX = cx + Math.cos(rad) * coilDist;
          const coilY = cy + Math.sin(rad) * coilDist;
          const intensity = Math.abs(coil.val);
          const isPositive = coil.val > 0;
          const coilR = isMobile ? 16 : 20;

          return (
            <g key={coil.label}>
              {/* Coil body */}
              <circle cx={coilX} cy={coilY} r={coilR}
                fill={intensity > 0 ? (isPositive ? `${coil.color}` : `${coil.color}88`) : '#1e293b'}
                stroke={coil.color} strokeWidth="2"
                opacity={0.3 + intensity * 0.7}
                filter={intensity > 0.5 ? 'url(#coilGlow)' : undefined}
              />
              {/* Coil winding lines */}
              {[0.4, 0.7, 1.0].map((r, i) => (
                <circle key={i} cx={coilX} cy={coilY} r={coilR * r}
                  fill="none" stroke={coil.color} strokeWidth="0.8"
                  opacity={intensity > 0 ? 0.4 + intensity * 0.3 : 0.15}
                />
              ))}
              {/* Current direction indicator */}
              {intensity > 0.01 && (
                <text x={coilX} y={coilY + 4} textAnchor="middle"
                  fill="white" fontSize="12" fontWeight="bold">
                  {isPositive ? '+' : '-'}
                </text>
              )}
              {/* Phase label */}
              <text
                x={cx + Math.cos(rad) * (statorR + 14)}
                y={cy + Math.sin(rad) * (statorR + 14) + 4}
                textAnchor="middle"
                fill={coil.color} fontSize="12" fontWeight="700">
                {coil.label}
              </text>
            </g>
          );
        })}

        {/* Rotor with teeth/magnets */}
        <g transform={`rotate(${angle}, ${cx}, ${cy})`}>
          <circle cx={cx} cy={cy} r={rotorR} fill="url(#rotorGrad)" stroke="#64748b" strokeWidth="2" />

          {/* Rotor teeth (permanent magnet poles) */}
          {Array.from({ length: teethCount }).map((_, i) => {
            const toothAngle = (i * 360) / teethCount;
            const rad = (toothAngle * Math.PI) / 180;
            const innerR = rotorR - 6;
            const outerR = rotorR + 6;
            const isNorth = i % 2 === 0;
            return (
              <g key={i}>
                <line
                  x1={cx + Math.cos(rad) * innerR}
                  y1={cy + Math.sin(rad) * innerR}
                  x2={cx + Math.cos(rad) * outerR}
                  y2={cy + Math.sin(rad) * outerR}
                  stroke={isNorth ? '#ef4444' : '#3b82f6'}
                  strokeWidth="6" strokeLinecap="round"
                  filter="url(#magnetGlow)"
                />
                {/* N/S labels */}
                <text
                  x={cx + Math.cos(rad) * (rotorR - 18)}
                  y={cy + Math.sin(rad) * (rotorR - 18) + 4}
                  textAnchor="middle" fill={isNorth ? '#fca5a5' : '#93c5fd'}
                  fontSize="8" fontWeight="600">
                  {isNorth ? 'N' : 'S'}
                </text>
              </g>
            );
          })}

          {/* Shaft */}
          <circle cx={cx} cy={cy} r="8" fill="#475569" stroke="#64748b" strokeWidth="2" />
          {/* Shaft dot for orientation */}
          <circle cx={cx} cy={cy - 5} r="2" fill={colors.accent} />
        </g>

        {/* Angle indicator */}
        <text x={cx} y={height - 12} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Rotor: {(angle % 360).toFixed(1)} deg | Steps: {totalSteps} | Resolution: {getStepAngle().toFixed(4)} deg/step
        </text>
      </svg>
    );
  };

  // =====================================================================
  // SVG: TORQUE-SPEED CURVE
  // =====================================================================
  const renderTorqueSpeedCurve = () => {
    const width = isMobile ? 320 : 420;
    const height = isMobile ? 220 : 260;
    const margin = { top: 35, right: 20, bottom: 40, left: 50 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const maxRPM = 1200;
    const maxTorque = getMaxTorque(0, coilCurrent);

    // Generate curve points
    const points: string[] = [];
    for (let rpm = 0; rpm <= maxRPM; rpm += 10) {
      const t = getMaxTorque(rpm, coilCurrent);
      const x = margin.left + (rpm / maxRPM) * plotW;
      const y = margin.top + plotH - (t / maxTorque) * plotH;
      points.push(`${x},${y}`);
    }

    // Current operating point
    const opX = margin.left + (twistSpeed / maxRPM) * plotW;
    const opTorque = getMaxTorque(twistSpeed, coilCurrent);
    const opY = margin.top + plotH - (opTorque / maxTorque) * plotH;

    // Load line
    const loadLevel = (loadTorque / 100) * maxTorque;
    const loadY = margin.top + plotH - (loadLevel / maxTorque) * plotH;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <rect width={width} height={height} fill={colors.bgSecondary} rx="12" />

        <text x={width / 2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Torque-Speed Characteristic
        </text>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={`grid-${f}`}>
            <line
              x1={margin.left} y1={margin.top + plotH * (1 - f)}
              x2={margin.left + plotW} y2={margin.top + plotH * (1 - f)}
              stroke={colors.border} strokeDasharray="3,3" opacity="0.4"
            />
            <text x={margin.left - 5} y={margin.top + plotH * (1 - f) + 4}
              textAnchor="end" fill={colors.textMuted} fontSize="10">
              {(maxTorque * f).toFixed(0)}%
            </text>
          </g>
        ))}
        {[0, 300, 600, 900, 1200].map(rpm => (
          <g key={`rpm-${rpm}`}>
            <line
              x1={margin.left + (rpm / maxRPM) * plotW} y1={margin.top}
              x2={margin.left + (rpm / maxRPM) * plotW} y2={margin.top + plotH}
              stroke={colors.border} strokeDasharray="3,3" opacity="0.3"
            />
            <text x={margin.left + (rpm / maxRPM) * plotW} y={height - 8}
              textAnchor="middle" fill={colors.textMuted} fontSize="10">
              {rpm}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={width / 2} y={height - 0} textAnchor="middle" fill={colors.textMuted} fontSize="10">Speed (RPM)</text>
        <text x="12" y={margin.top + plotH / 2} textAnchor="middle" fill={colors.textMuted} fontSize="10"
          transform={`rotate(-90, 12, ${margin.top + plotH / 2})`}>Torque</text>

        {/* Torque-speed curve */}
        <polyline points={points.join(' ')} fill="none" stroke={colors.accent} strokeWidth="2.5" />

        {/* Fill under curve */}
        <polygon
          points={`${margin.left},${margin.top + plotH} ${points.join(' ')} ${margin.left + plotW},${margin.top + plotH}`}
          fill={`${colors.accent}15`}
        />

        {/* Load torque line */}
        <line
          x1={margin.left} y1={loadY} x2={margin.left + plotW} y2={loadY}
          stroke={colors.error} strokeWidth="1.5" strokeDasharray="6,3"
        />
        <text x={margin.left + plotW + 2} y={loadY + 4} fill={colors.error} fontSize="9" textAnchor="start">Load</text>

        {/* Operating point */}
        <circle cx={opX} cy={opY} r="6" fill={opTorque > loadLevel ? colors.success : colors.error}
          stroke="white" strokeWidth="2" filter="url(#coilGlow)" />

        {/* Status */}
        <text x={opX} y={opY - 12} textAnchor="middle"
          fill={opTorque > loadLevel ? colors.success : colors.error} fontSize="10" fontWeight="600">
          {opTorque > loadLevel ? 'OK' : 'STALL'}
        </text>
      </svg>
    );
  };

  // =====================================================================
  // COIL ENERGIZATION DISPLAY
  // =====================================================================
  const renderCoilDisplay = () => {
    const coils = getCoilStates();
    const coilEntries = [
      { label: 'A', val: coils.A, color: colors.coilA },
      { label: 'B', val: coils.B, color: colors.coilB },
      { label: 'C', val: coils.C, color: colors.coilC },
      { label: 'D', val: coils.D, color: colors.coilD },
    ];
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
        background: colors.bgCard, borderRadius: '10px', padding: '12px',
        border: `1px solid ${colors.border}`,
      }}>
        {coilEntries.map(c => {
          const intensity = Math.abs(c.val);
          const barH = Math.round(intensity * 40);
          return (
            <div key={c.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '12px', fontWeight: 700, color: c.color, marginBottom: '4px',
              }}>Phase {c.label}</div>
              <div style={{
                height: '44px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              }}>
                <div style={{
                  width: '20px', height: `${barH}px`, borderRadius: '3px',
                  background: intensity > 0 ? c.color : colors.border,
                  opacity: 0.3 + intensity * 0.7,
                  transition: 'height 0.15s ease',
                }} />
              </div>
              <div style={{
                fontSize: '10px', color: colors.textMuted, marginTop: '2px',
              }}>
                {c.val > 0 ? '+' : c.val < 0 ? '-' : 'OFF'} {(intensity * coilCurrent).toFixed(1)}A
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =============================================================================
  // PHASE: HOOK
  // =============================================================================
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>&#9881;</div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            How Does a 3D Printer Move Exactly 0.1mm?
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '560px', marginBottom: '12px' }}>
            Every 3D printer, CNC machine, and telescope mount relies on a special type of motor that doesn't spin freely --
            it moves in precise, discrete steps.
          </p>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '560px', marginBottom: '32px' }}>
            Unlike regular motors, a <strong style={{ color: colors.accent }}>stepper motor</strong> divides one full rotation
            into 200 equal steps. No feedback sensor needed -- just count the steps and you know exactly where you are.
          </p>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '32px',
            maxWidth: '480px', border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>DID YOU KNOW?</p>
            <p style={{ ...typo.body, color: colors.accent }}>
              A single stepper motor in a 3D printer can position the print head
              to within 0.01mm -- that is thinner than a human hair (0.07mm).
            </p>
          </div>

          <button onClick={nextPhase} style={primaryButtonStyle}>
            Let's Explore Steppers
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: PREDICT
  // =============================================================================
  if (phase === 'predict') {
    const options = [
      { id: 'a', label: '0.9 degrees -- The motor divides 360 by 400 steps' },
      { id: 'b', label: '1.8 degrees -- The motor divides 360 by 200 steps' },
      { id: 'c', label: '3.6 degrees -- The motor divides 360 by 100 steps' },
      { id: 'd', label: '7.2 degrees -- The motor divides 360 by 50 steps' },
    ];
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '560px', width: '100%' }}>
            <p style={{ ...typo.small, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Make a Prediction
            </p>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
              What is the step angle of a 200-step-per-revolution motor?
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              A standard stepper motor completes one full rotation (360 degrees) in exactly 200 steps.
              What angle does the rotor move per step?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    setPrediction(opt.id);
                    onGameEvent?.({
                      eventType: 'prediction_made',
                      gameType: 'stepper-motor',
                      gameTitle: 'Stepper Motor Control',
                      details: { prediction: opt.id },
                      timestamp: Date.now(),
                    });
                  }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                    fontSize: '12px', fontWeight: 700,
                  }}>{opt.id.toUpperCase()}</span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{
                background: prediction === 'b' ? `${colors.success}15` : `${colors.warning}15`,
                border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}40`,
                borderRadius: '10px', padding: '16px', marginBottom: '16px',
              }}>
                <p style={{ color: prediction === 'b' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
                  {prediction === 'b' ? 'Correct!' : 'Not quite -- let\'s explore why!'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Step angle = 360 / 200 = 1.8 degrees per full step. This is the most common step angle
                  for NEMA 17 motors used in 3D printers and CNC machines.
                </p>
              </div>
            )}

            {prediction && (
              <button onClick={nextPhase} style={primaryButtonStyle}>
                Explore the Motor
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: PLAY
  // =============================================================================
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
            Step the Motor
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Try different step modes. Watch the coil sequence and rotor position change.
          </p>

          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: '16px', maxWidth: '900px', margin: '0 auto',
          }}>
            {/* LEFT: Motor visualization */}
            <div style={{ flex: isMobile ? undefined : 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {renderMotorVisualization(rotorAngle)}
              {renderCoilDisplay()}
            </div>

            {/* RIGHT: Controls */}
            <div style={{ flex: isMobile ? undefined : 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Step Mode Selector */}
              <div style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px',
                border: `1px solid ${colors.border}`,
              }}>
                <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 600 }}>
                  Step Mode
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'full' as const, label: 'Full Step', sub: '1.8 deg' },
                    { id: 'half' as const, label: 'Half Step', sub: '0.9 deg' },
                    { id: 'micro' as const, label: 'Microstep', sub: '0.1125 deg' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setStepMode(m.id); setStepIndex(0); playSound('click'); }}
                      style={{
                        flex: 1, padding: '10px 6px', borderRadius: '8px',
                        border: `2px solid ${stepMode === m.id ? colors.accent : colors.border}`,
                        background: stepMode === m.id ? `${colors.accent}22` : 'transparent',
                        color: stepMode === m.id ? colors.accent : colors.textSecondary,
                        cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                      }}
                    >
                      {m.label}<br />
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>{m.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Step Buttons */}
              <div style={{
                display: 'flex', gap: '8px',
              }}>
                <button
                  onClick={() => handleStep(-1)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}`,
                    background: colors.bgCard, color: colors.textPrimary, cursor: 'pointer',
                    fontSize: '16px', fontWeight: 700,
                  }}
                >
                  Step CCW
                </button>
                <button
                  onClick={() => handleStep(1)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: `linear-gradient(135deg, ${colors.accent}, #818cf8)`,
                    color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 700,
                  }}
                >
                  Step CW
                </button>
              </div>

              {/* Auto-step controls */}
              <div style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>
                    Auto Step: {stepRate} steps/sec
                  </span>
                  <button
                    onClick={() => setIsAutoStepping(!isAutoStepping)}
                    style={{
                      padding: '6px 16px', borderRadius: '8px', border: 'none',
                      background: isAutoStepping ? colors.error : colors.success,
                      color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                    }}
                  >
                    {isAutoStepping ? 'Stop' : 'Start'}
                  </button>
                </div>
                <input
                  type="range" min="1" max="50" value={stepRate}
                  onChange={e => setStepRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: colors.accent }}
                />
              </div>

              {/* Coil Current */}
              <div style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px',
                border: `1px solid ${colors.border}`,
              }}>
                <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>
                  Coil Current: {coilCurrent.toFixed(1)} A
                </span>
                <input
                  type="range" min="0.5" max="3" step="0.1" value={coilCurrent}
                  onChange={e => setCoilCurrent(Number(e.target.value))}
                  style={{ width: '100%', accentColor: colors.accent, marginTop: '6px' }}
                />
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
              }}>
                {[
                  { label: 'Position', value: `${(rotorAngle % 360).toFixed(1)} deg`, color: colors.accent },
                  { label: 'Total Steps', value: `${totalSteps}`, color: colors.textPrimary },
                  { label: 'Resolution', value: `${getStepAngle().toFixed(4)} deg`, color: colors.warning },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: colors.bgCard, borderRadius: '8px', padding: '10px',
                    textAlign: 'center', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: '14px', color: s.color, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Insight box */}
              {totalSteps >= 10 && (
                <div style={{
                  background: `${colors.success}10`, border: `1px solid ${colors.success}30`,
                  borderRadius: '10px', padding: '12px',
                }}>
                  <p style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '4px' }}>
                    Observation
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>
                    {stepMode === 'full' && 'Notice how the rotor jumps 1.8 degrees per step. Try switching to half-step or microstep mode for smoother motion!'}
                    {stepMode === 'half' && 'Half-step mode doubles the resolution to 0.9 degrees by energizing two coils simultaneously between full steps.'}
                    {stepMode === 'micro' && 'Microstepping uses sinusoidal currents to smoothly blend between positions. 1/16 microstepping gives 3200 positions per revolution!'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={nextPhase} style={primaryButtonStyle}>
              Understand the Physics
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: REVIEW
  // =============================================================================
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              How Stepper Motors Work
            </h2>

            {[
              {
                title: 'Step Angle = 360 / Steps Per Revolution',
                content: 'A 200-step motor has a 1.8 degree step angle. This is determined by the number of rotor teeth and stator poles. The rotor has permanent magnets that align with the energized stator coil, locking into position at each step.',
                highlight: '1.8 deg = 360 / 200 steps',
              },
              {
                title: 'Coil Energization Sequence',
                content: 'Full stepping energizes one coil pair at a time (A, B, C, D). Half stepping interleaves single and double coil states for twice the resolution. Microstepping uses sinusoidal currents for ultra-smooth motion.',
                highlight: 'Full: 200 | Half: 400 | Micro-16: 3200 steps/rev',
              },
              {
                title: 'Holding Torque',
                content: 'When coils are energized, the rotor is magnetically locked in position. This holding torque resists external forces without any feedback sensor. The torque is proportional to coil current: more current = stronger hold.',
                highlight: 'Torque = k x I (proportional to current)',
              },
              {
                title: 'Open-Loop Control',
                content: 'Stepper motors are "open loop" -- the controller simply counts step pulses without verifying actual position. This works perfectly as long as the motor never misses a step. No encoder needed!',
                highlight: 'Position = step_count x step_angle',
              },
            ].map((concept, i) => (
              <div key={i} style={{
                background: colors.bgCard, borderRadius: '12px', padding: '18px',
                border: `1px solid ${colors.border}`, marginBottom: '14px',
              }}>
                <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>{concept.title}</h3>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '10px' }}>{concept.content}</p>
                <div style={{
                  background: `${colors.accent}15`, borderRadius: '8px', padding: '10px',
                  fontFamily: 'monospace', fontSize: '13px', color: colors.accent, textAlign: 'center',
                }}>
                  {concept.highlight}
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>
                What Happens at High Speed?
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: TWIST PREDICT
  // =============================================================================
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'a', label: 'The motor overheats and the thermal switch cuts power' },
      { id: 'b', label: 'Back-EMF from the spinning rotor reduces coil current, dropping torque below the load requirement' },
      { id: 'c', label: 'The controller CPU cannot generate step pulses fast enough' },
      { id: 'd', label: 'Centrifugal force loosens the rotor magnets at high RPM' },
    ];
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '560px', width: '100%' }}>
            <div style={{
              background: `${colors.warning}15`, borderRadius: '10px', padding: '14px',
              border: `1px solid ${colors.warning}30`, marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                THE TWIST: Speed Limits
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px' }}>
              Why do steppers lose steps at high speed?
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              Stepper motors work perfectly at low speed, but every stepper has a speed limit.
              Beyond a certain RPM, the motor suddenly stops following commands and "loses steps."
              What causes this failure?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {twistOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    setTwistPrediction(opt.id);
                    onGameEvent?.({
                      eventType: 'prediction_made',
                      gameType: 'stepper-motor',
                      gameTitle: 'Stepper Motor Control',
                      details: { twist_prediction: opt.id },
                      timestamp: Date.now(),
                    });
                  }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                    fontSize: '12px', fontWeight: 700,
                  }}>{opt.id.toUpperCase()}</span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{
                background: twistPrediction === 'b' ? `${colors.success}15` : `${colors.warning}15`,
                border: `1px solid ${twistPrediction === 'b' ? colors.success : colors.warning}40`,
                borderRadius: '10px', padding: '16px', marginBottom: '16px',
              }}>
                <p style={{ color: twistPrediction === 'b' ? colors.success : colors.warning, fontWeight: 600, marginBottom: '8px' }}>
                  {twistPrediction === 'b' ? 'Exactly right!' : 'Close, but the real culprit is electromagnetic.'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  As the rotor spins faster, it generates back-EMF that opposes the supply voltage. This reduces the net voltage
                  available to drive current into the coils. Less current means less torque. When torque drops below the load, steps are lost.
                </p>
              </div>
            )}

            {twistPrediction && (
              <button onClick={nextPhase} style={primaryButtonStyle}>
                See It In Action
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: TWIST PLAY
  // =============================================================================
  if (phase === 'twist_play') {
    const maxTorqueHere = getMaxTorque(twistSpeed, coilCurrent);
    const maxTorqueBase = getMaxTorque(0, coilCurrent);
    const loadLevel = (loadTorque / 100) * maxTorqueBase;
    const isLosing = loadLevel > maxTorqueHere;

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
            Find the Speed Limit
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Increase speed and load. Watch the torque-speed curve. Find where the motor stalls.
          </p>

          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: '16px', maxWidth: '900px', margin: '0 auto',
          }}>
            {/* LEFT: Visualizations */}
            <div style={{ flex: isMobile ? undefined : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              {renderMotorVisualization(twistRotorAngle, false)}
              {renderTorqueSpeedCurve()}
            </div>

            {/* RIGHT: Controls */}
            <div style={{ flex: isMobile ? undefined : 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Speed control */}
              <div style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Speed</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>{twistSpeed} RPM</span>
                </div>
                <input
                  type="range" min="10" max="1200" step="10" value={twistSpeed}
                  onChange={e => { setTwistSpeed(Number(e.target.value)); setMissedSteps(0); }}
                  style={{ width: '100%', accentColor: colors.accent }}
                />
              </div>

              {/* Load torque control */}
              <div style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Load Torque</span>
                  <span style={{ ...typo.small, color: colors.error, fontWeight: 700 }}>{loadTorque}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={loadTorque}
                  onChange={e => { setLoadTorque(Number(e.target.value)); setMissedSteps(0); }}
                  style={{ width: '100%', accentColor: colors.error }}
                />
              </div>

              {/* Current control */}
              <div style={{
                background: colors.bgCard, borderRadius: '10px', padding: '14px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Coil Current</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 700 }}>{coilCurrent.toFixed(1)} A</span>
                </div>
                <input
                  type="range" min="0.5" max="3" step="0.1" value={coilCurrent}
                  onChange={e => setCoilCurrent(Number(e.target.value))}
                  style={{ width: '100%', accentColor: colors.warning }}
                />
              </div>

              {/* Run button */}
              <button
                onClick={() => { setIsTwistRunning(!isTwistRunning); if (!isTwistRunning) setMissedSteps(0); }}
                style={{
                  padding: '14px', borderRadius: '10px', border: 'none',
                  background: isTwistRunning ? colors.error : colors.success,
                  color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '16px',
                }}
              >
                {isTwistRunning ? 'Stop Motor' : 'Run Motor'}
              </button>

              {/* Status display */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px',
              }}>
                {[
                  { label: 'Available Torque', value: `${maxTorqueHere.toFixed(0)}%`, color: maxTorqueHere > loadLevel ? colors.success : colors.error },
                  { label: 'Load Demand', value: `${loadLevel.toFixed(0)}%`, color: colors.error },
                  { label: 'Missed Steps', value: `${missedSteps}`, color: missedSteps > 0 ? colors.error : colors.success },
                  { label: 'Status', value: isLosing ? 'STALLING' : 'OK', color: isLosing ? colors.error : colors.success },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: colors.bgCard, borderRadius: '8px', padding: '10px',
                    textAlign: 'center', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: '15px', color: s.color, fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Insight */}
              {missedSteps > 5 && (
                <div style={{
                  background: `${colors.error}10`, border: `1px solid ${colors.error}30`,
                  borderRadius: '10px', padding: '12px',
                }}>
                  <p style={{ ...typo.small, color: colors.error, fontWeight: 600, marginBottom: '4px' }}>
                    Steps Lost!
                  </p>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>
                    The motor is losing steps because back-EMF at {twistSpeed} RPM reduces current below
                    what is needed for the load. Try reducing speed, increasing current, or lowering the load.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={nextPhase} style={primaryButtonStyle}>
              Understand the Limits
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: TWIST REVIEW
  // =============================================================================
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              Why Steppers Have Speed Limits
            </h2>

            {[
              {
                title: 'Back-EMF: The Speed Killer',
                content: 'A spinning rotor generates voltage (back-EMF) that opposes the supply voltage. At high speed, back-EMF nearly equals the supply voltage, leaving almost no voltage to push current through the coils. Less current = less torque = lost steps.',
                icon: '&#9889;',
              },
              {
                title: 'Inductance: The Current Limiter',
                content: 'Motor coils have inductance (L), which resists rapid current changes. At high step rates, each step pulse is so short that current never reaches its full value: I = V/R * (1 - e^(-t*R/L)). This further reduces torque at speed.',
                icon: '&#128268;',
              },
              {
                title: 'Mid-Band Resonance',
                content: 'At certain speeds (typically 100-200 steps/sec), the step frequency matches the rotor natural frequency. This causes violent oscillation and potential stalling -- even below the torque-speed limit. Microstepping and dampers help mitigate this.',
                icon: '&#127926;',
              },
              {
                title: 'Solutions: Higher Voltage, Chopper Drives',
                content: 'Modern stepper drivers use much higher voltage than the motor rating and "chop" the current to the rated value. This forces current to rise faster in the coils, pushing the torque-speed curve to higher speeds. A motor rated at 3V may be driven at 24-48V!',
                icon: '&#128161;',
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard, borderRadius: '12px', padding: '18px',
                border: `1px solid ${colors.border}`, marginBottom: '14px',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '28px' }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '6px' }}>{item.title}</h3>
                    <p style={{ ...typo.small, color: colors.textSecondary }}>{item.content}</p>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button onClick={nextPhase} style={primaryButtonStyle}>
                Real-World Applications
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: TRANSFER
  // =============================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Stepper Motor Control"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={{
          primary: colors.accent,
          primaryDark: '#4f46e5',
          accent: colors.accent,
          secondary: colors.success,
          success: colors.success,
          danger: colors.error,
          bgDark: colors.bgPrimary,
          bgCard: colors.bgCard,
          bgCardLight: colors.bgSecondary,
          textPrimary: colors.textPrimary,
          textSecondary: colors.textSecondary,
          textMuted: colors.textMuted,
          border: colors.border,
        }}
        playSound={playSound}
      />
    );
  }

  // =============================================================================
  // PHASE: TEST
  // =============================================================================
  if (phase === 'test') {
    if (testSubmitted) {
      goToPhase('mastery');
    }
    const question = testQuestions[currentQuestion];
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ ...typo.h2, color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ ...typo.small, color: colors.textMuted }}>
                {currentQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: testAnswers[i] ? colors.accent : colors.border,
                  transition: 'background 0.3s ease',
                }} />
              ))}
            </div>

            {/* Scenario */}
            <div style={{
              background: `${colors.accent}10`, border: `1px solid ${colors.accent}30`,
              borderRadius: '10px', padding: '14px', marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, fontWeight: 600, marginBottom: '6px' }}>SCENARIO</p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>{question.scenario}</p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                    fontSize: '12px', fontWeight: 700,
                  }}>{opt.id.toUpperCase()}</span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px',
                    border: `1px solid ${colors.border}`, background: 'transparent',
                    color: colors.textSecondary, cursor: 'pointer',
                  }}
                >
                  Previous
                </button>
              )}
              {currentQuestion < 9 ? (
                <button
                  onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                  disabled={!testAnswers[currentQuestion]}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white',
                    cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correct = testQuestions[i].options.find(o => (o as { correct?: boolean }).correct)?.id;
                      return acc + (ans === correct ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSound(score >= 7 ? 'complete' : 'failure');
                  }}
                  disabled={testAnswers.some(a => a === null)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white',
                    cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // =============================================================================
  // PHASE: MASTERY
  // =============================================================================
  if (phase === 'mastery') {
    const grade = testScore >= 9 ? 'A+' : testScore >= 8 ? 'A' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : testScore >= 5 ? 'D' : 'F';
    const gradeColor = testScore >= 7 ? colors.success : testScore >= 5 ? colors.warning : colors.error;

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ maxWidth: '640px', width: '100%' }}>
            {/* Score Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '80px', marginBottom: '12px' }}>
                {testScore >= 7 ? '&#127942;' : testScore >= 5 ? '&#128170;' : '&#128218;'}
              </div>
              <h1 style={{ ...typo.h1, color: gradeColor, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Stepper Motor Master!' : testScore >= 5 ? 'Good Effort!' : 'Keep Learning!'}
              </h1>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '16px',
                background: colors.bgCard, borderRadius: '16px', padding: '16px 32px',
                border: `1px solid ${colors.border}`,
              }}>
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 800, color: gradeColor }}>{grade}</div>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>Grade</div>
                </div>
                <div style={{ width: '1px', height: '50px', background: colors.border }} />
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 800, color: colors.textPrimary }}>{testScore}/10</div>
                  <div style={{ fontSize: '12px', color: colors.textMuted }}>Score</div>
                </div>
              </div>
            </div>

            {/* Key Learnings */}
            <div style={{
              background: colors.bgCard, borderRadius: '12px', padding: '20px',
              border: `1px solid ${colors.border}`, marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>You Learned:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Step angle = 360 / steps per revolution (1.8 deg for 200-step)',
                  'Full, half, and microstepping trade resolution vs torque',
                  'Back-EMF limits maximum speed by reducing coil current',
                  'Mid-band resonance causes vibration at certain step rates',
                  'Open-loop control: position = step_count x step_angle',
                  'Chopper drivers use high voltage to push the torque-speed curve',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success, flexShrink: 0 }}>&#10003;</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rich Answer Key */}
            <div style={{
              background: colors.bgCard, borderRadius: '12px', padding: '20px',
              border: `1px solid ${colors.border}`, marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Key</h3>
              {testQuestions.map((q, idx) => {
                const correctOption = q.options.find(o => (o as { correct?: boolean }).correct);
                const userAnswer = testAnswers[idx];
                const isCorrect = userAnswer === correctOption?.id;
                const userOption = q.options.find(o => o.id === userAnswer);

                return (
                  <div
                    key={idx}
                    style={{
                      background: isCorrect ? `${colors.success}10` : `${colors.error}10`,
                      border: `1px solid ${isCorrect ? `${colors.success}30` : `${colors.error}30`}`,
                      borderRadius: '10px', padding: '14px', marginBottom: '12px',
                    }}
                  >
                    <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                      {idx + 1}. {q.question}
                    </p>
                    {!isCorrect && userOption && (
                      <div style={{
                        padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                        background: `${colors.error}20`, color: colors.error, fontSize: '13px',
                      }}>
                        Your answer: {userOption.label}
                      </div>
                    )}
                    <div style={{
                      padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                      background: `${colors.success}20`, color: colors.success, fontSize: '13px',
                    }}>
                      Correct: {correctOption?.label}
                    </div>
                    <div style={{
                      padding: '6px 10px', marginTop: '6px', borderRadius: '6px',
                      background: `${colors.warning}15`, color: colors.warning, fontSize: '12px', lineHeight: 1.5,
                    }}>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px',
                  border: `1px solid ${colors.border}`, background: 'transparent',
                  color: colors.textSecondary, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  playSound('complete');
                  onGameEvent?.({
                    eventType: 'game_completed',
                    gameType: 'stepper-motor',
                    gameTitle: 'Stepper Motor Control',
                    details: {
                      score: testScore,
                      total: 10,
                      grade,
                      mastery_achieved: testScore >= 7,
                    },
                    timestamp: Date.now(),
                  });
                  window.location.href = '/games';
                }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '16px',
                }}
              >
                Complete Game
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // Default fallback
  return null;
};

export default StepperMotorRenderer;
