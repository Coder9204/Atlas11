'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON ACTUATOR LIMITS - Complete 10-Phase Game
// Robot actuator physics — torque-speed curves, gear reduction, and joint design
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

interface ELON_ActuatorLimitsRendererProps {
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A robot arm joint uses a brushless DC motor rated at 2 N-m stall torque and 5000 rpm no-load speed. The joint must lift a 3 kg payload at the end of a 0.4 m arm against gravity.",
    question: "Looking at the torque-speed curve, what happens to the motor's operating speed as load torque approaches stall torque?",
    options: [
      { id: 'a', label: "Speed increases linearly with torque" },
      { id: 'b', label: "Speed drops linearly to zero at stall torque — the motor cannot spin faster than allowed by the torque-speed tradeoff", correct: true },
      { id: 'c', label: "Speed stays constant regardless of torque" },
      { id: 'd', label: "Speed oscillates unpredictably near stall" }
    ],
    explanation: "For a DC motor, the torque-speed relationship is linear: omega = omega_no_load * (1 - tau/tau_stall). As load torque increases toward the stall value, speed decreases proportionally until the motor stalls at zero speed."
  },
  {
    scenario: "An engineer notices that a robot motor gets extremely hot when holding a heavy object stationary at a fixed position. The motor draws maximum current but the arm is not moving.",
    question: "What physical phenomenon explains why the motor overheats at stall even though no mechanical work is being done?",
    options: [
      { id: 'a', label: "The motor generates back-EMF that causes heating" },
      { id: 'b', label: "At stall there is zero back-EMF, so the full supply voltage drives maximum current through the winding resistance, dissipating I-squared-R heat", correct: true },
      { id: 'c', label: "The permanent magnets demagnetize and create friction" },
      { id: 'd', label: "Stall heating is a myth — motors only heat when spinning" }
    ],
    explanation: "Back-EMF is proportional to motor speed. At stall (zero speed), back-EMF is zero, meaning the full supply voltage appears across the winding resistance. This drives maximum current, and all electrical power is dissipated as heat with none converted to mechanical work."
  },
  {
    scenario: "A motor datasheet lists a torque constant Kt = 0.05 N-m/A. The motor is running at 2 A current and needs to produce 0.15 N-m of torque for a specific manipulation task.",
    question: "Using the motor torque constant relationship tau = Kt * I, what current is needed to achieve 0.15 N-m?",
    options: [
      { id: 'a', label: "1.5 A" },
      { id: 'b', label: "2.0 A" },
      { id: 'c', label: "3.0 A — since tau = Kt * I, we need I = 0.15 / 0.05 = 3.0 A", correct: true },
      { id: 'd', label: "7.5 A" }
    ],
    explanation: "The torque constant Kt directly relates torque to current: tau = Kt * I. Rearranging, I = tau / Kt = 0.15 / 0.05 = 3.0 A. This linear relationship is fundamental to motor control — double the current, double the torque."
  },
  {
    scenario: "A humanoid robot knee joint needs 200 N-m torque but the motor can only produce 4 N-m. An engineer proposes a 50:1 gear reduction to bridge the gap.",
    question: "What are the main tradeoffs of using a 50:1 gear reduction?",
    options: [
      { id: 'a', label: "Torque multiplied by 50 but speed divided by 50, plus added backlash, friction, and weight", correct: true },
      { id: 'b', label: "Both torque and speed are multiplied by 50" },
      { id: 'c', label: "Only torque changes; speed is unaffected" },
      { id: 'd', label: "The gear ratio only affects efficiency, not torque or speed" }
    ],
    explanation: "A gear reduction of N:1 multiplies torque by N but divides speed by N — this is a fundamental energy conservation constraint. Additionally, gears introduce backlash (angular dead zone), friction losses (typically 10-30%), added mass, and compliance that can degrade control precision."
  },
  {
    scenario: "Boston Dynamics uses harmonic drive gears in many Atlas robot joints. These compact gearboxes achieve 100:1 reduction in a package the size of a hockey puck, with near-zero backlash.",
    question: "What makes harmonic drives uniquely suited to robot joints compared to conventional spur gears?",
    options: [
      { id: 'a', label: "They are cheaper and easier to manufacture" },
      { id: 'b', label: "Their flexspline design achieves very high reduction ratios in a compact, coaxial package with minimal backlash — critical for precise position control", correct: true },
      { id: 'c', label: "They eliminate all friction losses" },
      { id: 'd', label: "They can operate without lubrication" }
    ],
    explanation: "Harmonic drives use a flexible element (flexspline) that meshes with an internal ring gear (circular spline) via a wave generator. This achieves high ratios (50:1 to 320:1) in a thin, coaxial form factor with backlash under 1 arcminute — essential for precise robotic manipulation."
  },
  {
    scenario: "A collaborative robot arm continuously lifts 5 kg packages in a warehouse. The motor temperature rises to 90 degrees C after 2 hours. The datasheet specifies continuous torque of 1.5 N-m and peak torque of 4.5 N-m.",
    question: "Why does the motor have different continuous and peak torque ratings?",
    options: [
      { id: 'a', label: "Peak torque is for marketing only and should never be used" },
      { id: 'b', label: "Continuous torque is limited by thermal dissipation — the motor can briefly produce 3x more torque but will overheat if sustained, as I-squared-R losses exceed cooling capacity", correct: true },
      { id: 'c', label: "The magnets physically cannot produce more than continuous torque" },
      { id: 'd', label: "Peak torque requires a different power supply" }
    ],
    explanation: "Continuous torque is the maximum torque the motor can sustain indefinitely without exceeding its thermal limit. Peak torque (typically 2-4x continuous) can be produced briefly because the motor winding has thermal mass that absorbs heat temporarily. Exceeding continuous torque for too long causes winding insulation degradation or demagnetization."
  },
  {
    scenario: "An engineer is designing a robot arm for human-robot collaboration. A person accidentally collides with the arm moving at moderate speed. The arm uses high-ratio (160:1) gears.",
    question: "Why does high gear reduction make the arm more dangerous in a collision?",
    options: [
      { id: 'a', label: "The gears make the arm heavier" },
      { id: 'b', label: "High gear ratios reflect the motor inertia multiplied by the gear ratio squared, making the arm non-backdrivable and unable to yield during impact", correct: true },
      { id: 'c', label: "The gears generate sparks on collision" },
      { id: 'd', label: "High-ratio gears are louder, scaring the person" }
    ],
    explanation: "Reflected inertia scales as the square of the gear ratio: J_reflected = N-squared * J_motor. A 160:1 ratio means the motor's inertia appears 25,600 times larger at the output. This makes the arm effectively non-backdrivable — it cannot be pushed out of the way during a collision, posing serious safety risks for human-robot interaction."
  },
  {
    scenario: "Tesla Optimus uses 28 actuators across its body. The robot weighs 73 kg and must walk, climb stairs, and manipulate objects. Battery capacity is 2.3 kWh.",
    question: "What metric is most critical for selecting actuators in a battery-powered humanoid robot?",
    options: [
      { id: 'a', label: "Maximum speed — faster actuators let the robot move quickly" },
      { id: 'b', label: "Power density (watts per kilogram) — every gram of actuator the robot carries reduces payload capacity and battery life", correct: true },
      { id: 'c', label: "Cost per actuator — cheaper actuators reduce the robot price" },
      { id: 'd', label: "Color and aesthetics of the motor housing" }
    ],
    explanation: "In a mobile robot, the actuators must carry their own weight plus the payload. Higher power density means more output force per unit mass. With a 2.3 kWh battery, every watt wasted on moving heavy actuators reduces runtime. This is why Tesla developed custom actuators rather than using off-the-shelf industrial motors."
  },
  {
    scenario: "A research lab compares two robot arms: Arm A uses rigid gearboxes with position control, achieving 0.01 mm repeatability. Arm B uses series elastic actuators (SEAs) with a deliberate spring between motor and link, achieving only 0.5 mm precision.",
    question: "Why would Arm B with lower precision be preferred for some tasks?",
    options: [
      { id: 'a', label: "Lower precision is always cheaper" },
      { id: 'b', label: "The spring in SEAs acts as a force sensor and energy buffer — enabling safe human interaction, shock absorption, and compliant manipulation of delicate objects", correct: true },
      { id: 'c', label: "SEAs are smaller and lighter" },
      { id: 'd', label: "Rigid gearboxes cannot be controlled electronically" }
    ],
    explanation: "Series elastic actuators intentionally place a calibrated spring between the motor output and the link. By measuring spring deflection, the actuator directly senses applied force. The spring also absorbs impact energy during collisions, stores energy for explosive movements (like jumping), and enables compliant interaction with uncertain environments."
  },
  {
    scenario: "Boston Dynamics Atlas uses hydraulic actuators while Tesla Optimus uses electric motors. Atlas can perform backflips and parkour; Optimus focuses on walking and manipulation tasks.",
    question: "What fundamental advantage do hydraulic actuators have over electric motors for dynamic locomotion?",
    options: [
      { id: 'a', label: "Hydraulics are cheaper and simpler" },
      { id: 'b', label: "Hydraulic actuators achieve roughly 10x higher power density than electric motors — critical for the explosive force needed in dynamic movements like jumping", correct: true },
      { id: 'c', label: "Hydraulics are more energy efficient" },
      { id: 'd', label: "Hydraulic fluid is lighter than copper windings" }
    ],
    explanation: "Hydraulic actuators achieve power densities of ~2000 W/kg compared to ~200 W/kg for the best electric motors. This is because hydraulic fluid can transmit enormous pressures through small tubes, while electric motors require heavy copper windings and magnets. However, hydraulic systems suffer from fluid leaks, noise, and lower efficiency (~60% vs ~90% for electrics)."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🤖',
    title: 'Tesla Optimus',
    short: '28 DOF with custom rotary and linear actuators',
    tagline: 'Purpose-built actuators for mass-produced humanoids',
    description: 'Tesla Optimus uses 28 custom actuators — a mix of rotary and linear designs — each optimized for its specific joint. The rotary actuators use brushless DC motors with planetary gearboxes, while the linear actuators in the hands use compact ball-screw mechanisms for precise finger control.',
    connection: 'Each Optimus actuator must operate within strict torque-speed limits defined by the motor\'s characteristic curve. Overloading any single joint triggers thermal protection, demonstrating why understanding actuator limits is essential for real-time robot control.',
    howItWorks: 'Custom motor designs with integrated encoders, strain gauges, and thermal sensors enable closed-loop torque control at 1 kHz, keeping each joint within its safe operating envelope.',
    stats: [
      { value: '28', label: 'Total actuators' },
      { value: '~150W', label: 'Per actuator avg' },
      { value: '2.3 kWh', label: 'Battery capacity' }
    ],
    examples: ['Hip rotary actuator', 'Knee linear actuator', 'Hand tendon actuator', 'Shoulder abduction joint'],
    companies: ['Tesla', 'Figure AI', 'Sanctuary AI', '1X Technologies'],
    futureImpact: 'Custom actuator manufacturing at automotive scale could reduce per-actuator cost below $50, making humanoid robots cheaper than used cars.',
    color: '#EF4444'
  },
  {
    icon: '🏋️',
    title: 'Boston Dynamics Atlas',
    short: 'Hydraulic actuators with extreme power density',
    tagline: 'Where physics pushes the limits of actuation',
    description: 'Boston Dynamics Atlas uses custom hydraulic actuators that achieve roughly 10x the power density of electric motors. This enables explosive movements like backflips, parkour, and dynamic recovery from pushes that would topple any electric-motor humanoid.',
    connection: 'Atlas actuators operate far beyond the continuous torque ratings — using peak torque bursts for milliseconds during jumps. The torque-speed curve\'s peak region is where the magic happens, but thermal limits strictly constrain how long those peaks can be sustained.',
    howItWorks: 'A central hydraulic pump pressurizes fluid to 3000 PSI, distributed through manifolds to servo valves at each joint. Each valve modulates fluid flow to control joint torque and speed independently.',
    stats: [
      { value: '~2000', label: 'W/kg power density' },
      { value: '3000 PSI', label: 'Hydraulic pressure' },
      { value: '28', label: 'Active joints' }
    ],
    examples: ['Backflip landing', 'Parkour vault', 'Balance recovery', 'Heavy box lifting'],
    companies: ['Boston Dynamics', 'Sarcos Robotics', 'Guardian XO', 'Moog Inc'],
    futureImpact: 'The new electric Atlas platform aims to match hydraulic performance using advanced electric actuators, potentially making dynamic humanoids more practical and maintainable.',
    color: '#3B82F6'
  },
  {
    icon: '🔬',
    title: 'Intuitive Surgical da Vinci',
    short: 'Sub-millimeter cable-driven actuators for surgery',
    tagline: 'Where actuator precision saves lives',
    description: 'The da Vinci surgical robot uses cable-driven actuators that transmit motor force through ultra-thin steel cables to instrument tips inside the patient. Each cable must maintain precise tension to achieve sub-millimeter positioning accuracy while the surgeon operates through 8mm ports.',
    connection: 'Cable-driven actuators trade direct motor coupling for remote actuation — the motor sits outside the patient while cables transmit force. This introduces cable stretch, friction, and hysteresis that must be modeled on the torque-speed curve to achieve surgical precision.',
    howItWorks: 'High-resolution encoders track motor position at 10,000 counts per revolution, while force sensors on cables detect tissue contact. A control loop at 1 kHz compensates for cable elasticity and friction.',
    stats: [
      { value: '<1mm', label: 'Tip precision' },
      { value: '7 DOF', label: 'Per instrument' },
      { value: '8mm', label: 'Port diameter' }
    ],
    examples: ['Prostatectomy', 'Cardiac valve repair', 'Microsurgery', 'Endoscopic procedures'],
    companies: ['Intuitive Surgical', 'Medtronic Hugo', 'CMR Surgical Versius', 'Johnson & Johnson Ottava'],
    futureImpact: 'Next-generation surgical robots may use shape-memory alloy actuators that bend like biological muscle, enabling even smaller instruments for micro-scale procedures.',
    color: '#F59E0B'
  },
  {
    icon: '🦿',
    title: 'Agility Robotics Digit',
    short: 'Series elastic actuators for safe locomotion',
    tagline: 'Springs that make robots walk safely among humans',
    description: 'Agility Robotics Digit uses series elastic actuators (SEAs) that place a calibrated spring between each motor and its joint link. This intentional compliance enables Digit to sense contact forces, absorb impacts from uneven terrain, and safely interact with humans in warehouse environments.',
    connection: 'SEAs fundamentally change the torque-speed curve by adding a spring element. The motor does not directly control joint torque — instead it controls spring deflection, which creates torque. This decoupling provides inherent shock tolerance and force sensing at the cost of bandwidth and precision.',
    howItWorks: 'Each SEA measures spring deflection with a secondary encoder. The difference between motor-side and link-side encoder readings gives real-time force measurement, enabling impedance control without external force sensors.',
    stats: [
      { value: 'SEA', label: 'Actuator type' },
      { value: '16+', label: 'Active joints' },
      { value: '~16kg', label: 'Payload capacity' }
    ],
    examples: ['Warehouse walking', 'Stair climbing', 'Box manipulation', 'Human environment navigation'],
    companies: ['Agility Robotics', 'Apptronik', 'Fourier Intelligence', 'UBTECH Robotics'],
    futureImpact: 'Variable-stiffness actuators may allow robots to dynamically switch between compliant (safe) and rigid (precise) modes, combining the best of both worlds.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_ActuatorLimitsRenderer: React.FC<ELON_ActuatorLimitsRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const [animFrame, setAnimFrame] = useState(0);

  // Simulation state
  const [loadMass, setLoadMass] = useState(5); // kg
  const [gearReduction, setGearReduction] = useState(false); // twist

  // Prediction state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Test state
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Transfer state
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [selectedApp, setSelectedApp] = useState(0);

  // Responsive
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation
  useEffect(() => {
    const timer = setInterval(() => setAnimFrame(f => f + 1), 50);
    return () => clearInterval(timer);
  }, []);

  // Physics calculations
  const armLength = 0.4; // m
  const gravity = 9.81;
  const torqueRequired = loadMass * gravity * armLength; // N-m
  const motorStallTorque = 50; // N-m
  const motorNoLoadSpeed = 300; // rpm
  const gearRatio = gearReduction ? 50 : 1;
  const effectiveTorque = motorStallTorque * gearRatio;
  const effectiveSpeed = motorNoLoadSpeed / gearRatio;
  const operatingTorque = torqueRequired / gearRatio;
  const operatingSpeed = motorNoLoadSpeed * (1 - operatingTorque / motorStallTorque);
  const powerOutput = torqueRequired * (operatingSpeed * 2 * Math.PI / 60);
  const thermalLoad = (operatingTorque / motorStallTorque) * 100; // percentage of thermal capacity
  const isOverloaded = torqueRequired > effectiveTorque;
  const isNearStall = operatingSpeed < effectiveSpeed * 0.15;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    torque: '#EF4444',
    speed: '#3B82F6',
    power: '#10B981',
    thermal: '#F59E0B',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'actuator-limits',
        gameTitle: 'Actuator Limits',
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
  }, [phase, goToPhase]);

  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.torque})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <div
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          role="button"
          tabIndex={0}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.torque})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Navigation bar
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // -----------------------------------------------------------------------
  // SVG VISUALIZATION: Robot Arm Joint with Torque-Speed Curve
  // -----------------------------------------------------------------------
  const ActuatorVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 440;
    const plotLeft = 40;
    const plotRight = width - 40;
    const plotTop = 200;
    const plotBottom = 370;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    // Torque-speed curve points
    const curvePoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const torque = effectiveTorque * t;
      const speed = effectiveSpeed * (1 - t);
      const x = plotLeft + (torque / effectiveTorque) * plotWidth;
      const y = plotTop + (1 - speed / effectiveSpeed) * plotHeight;
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Operating point position
    const opTorqueNorm = Math.min(1, torqueRequired / effectiveTorque);
    const opSpeedNorm = Math.max(0, 1 - opTorqueNorm);
    const opX = plotLeft + opTorqueNorm * plotWidth;
    const opY = plotTop + (1 - opSpeedNorm) * plotHeight;

    // Power curve (parabolic, peaks at half stall)
    const powerPoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const torque = effectiveTorque * t;
      const speed = effectiveSpeed * (1 - t);
      const power = torque * speed * 2 * Math.PI / 60;
      const maxPower = effectiveTorque * effectiveSpeed * Math.PI / 120; // peak at midpoint
      const normalizedPower = power / maxPower;
      const x = plotLeft + t * plotWidth;
      const y = plotBottom - normalizedPower * plotHeight * 0.7;
      powerPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Arm angle based on load (heavier = droops more)
    const armAngle = -30 + (loadMass / 25) * 50;
    const motorPulse = Math.sin(animFrame * 0.1) * 2;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="torqueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
          <linearGradient id="motorBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <linearGradient id="powerCurveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="thermalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="motorGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="opPointGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="armShadow" x="-5%" y="-5%" width="110%" height="120%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isNearStall ? '#EF4444' : '#F59E0B'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isNearStall ? '#EF4444' : '#F59E0B'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Title */}
        <text x={width / 2} y={18} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Robot Arm Joint — {gearReduction ? '50:1 Gear Reduction' : 'Direct Drive'}
        </text>

        {/* --- Robot arm visualization (top section) --- */}
        {/* Motor housing */}
        <rect x={width / 2 - 30} y={55} width="60" height="40" rx="6" fill="url(#motorBodyGrad)" stroke="#6B7280" strokeWidth="1" />
        {/* Motor heat glow */}
        <circle cx={width / 2} cy={75} r={30 + motorPulse} fill="url(#heatGrad)" opacity={thermalLoad / 100} />
        {/* Motor label */}
        <text x={width / 2} y={78} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">MOTOR</text>

        {/* Gear indicator (if gear reduction active) */}
        {gearReduction && (
          <g>
            <circle cx={width / 2 + 40} cy={75} r="12" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={width / 2 + 40} cy={75} r="6" fill="#F59E0B" opacity="0.3" />
            <text x={width / 2 + 40} y={78} fill="#F59E0B" fontSize="11" fontWeight="700" textAnchor="middle">50:1</text>
          </g>
        )}

        {/* Joint pivot */}
        <circle cx={width / 2} cy={100} r="8" fill={colors.accent} stroke="#D97706" strokeWidth="2" />

        {/* Robot arm link */}
        <g transform={`rotate(${armAngle}, ${width / 2}, 100)`}>
          <rect
            x={width / 2}
            y={95}
            width={isMobile ? 100 : 140}
            height="10"
            rx="4"
            fill="url(#armGrad)"
            filter="url(#armShadow)"
          />
          {/* End effector / payload */}
          <circle
            cx={width / 2 + (isMobile ? 105 : 145)}
            cy={100}
            r={6 + loadMass * 0.3}
            fill={isOverloaded ? colors.error : colors.speed}
            stroke="white"
            strokeWidth="1"
            />
          <text
            x={width / 2 + (isMobile ? 105 : 145)}
            y={104}
            fill="white"
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
          >
            {loadMass}kg
          </text>
        </g>

        {/* Torque arrow indicator */}
        <path
          d={`M ${width / 2 - 20} 120 A 20 20 0 0 1 ${width / 2 + 20} 120`}
          fill="none"
          stroke={colors.torque}
          strokeWidth="2"
          opacity={0.5 + opTorqueNorm * 0.5}
          markerEnd="url(#arrowTorque)"
        />
        <text x={width / 2} y={140} fill={colors.torque} fontSize="11" fontWeight="600" textAnchor="middle">
          {torqueRequired.toFixed(1)} N-m required
        </text>

        {/* Status indicator */}
        <rect
          x={width / 2 - 60}
          y={150}
          width="120"
          height="22"
          rx="6"
          fill={isOverloaded ? 'rgba(239,68,68,0.2)' : isNearStall ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}
          stroke={isOverloaded ? colors.error : isNearStall ? colors.warning : colors.success}
          strokeWidth="1"
        />
        <text
          x={width / 2}
          y={165}
          fill={isOverloaded ? colors.error : isNearStall ? colors.warning : colors.success}
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          {isOverloaded ? 'OVERLOADED' : isNearStall ? 'NEAR STALL' : 'OPERATING OK'}
        </text>

        {/* Gravity arrow */}
        <path d={`M ${width / 2 + 60} 60 L ${width / 2 + 60} 90`} stroke={colors.textMuted} strokeWidth="1.5" markerEnd="url(#arrowGrav)" />
        <text x={width / 2 + 60} y={55} fill={colors.textMuted} fontSize="11" textAnchor="middle">g</text>

        {/* --- Torque-Speed Curve Plot (bottom section) --- */}
        {/* Plot background */}
        <rect x={plotLeft} y={plotTop} width={plotWidth} height={plotHeight} rx="4" fill="rgba(255,255,255,0.02)" stroke={colors.border} strokeWidth="1" />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(t => (
          <g key={`grid-h-${t}`}>
            <line x1={plotLeft} y1={plotTop + t * plotHeight} x2={plotRight} y2={plotTop + t * plotHeight} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          </g>
        ))}
        {[0.25, 0.5, 0.75].map(t => (
          <g key={`grid-v-${t}`}>
            <line x1={plotLeft + t * plotWidth} y1={plotTop} x2={plotLeft + t * plotWidth} y2={plotBottom} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          </g>
        ))}

        {/* Torque-Speed curve */}
        <path
          d={curvePoints.join(' ')}
          stroke="url(#torqueGrad)"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Power curve */}
        <path
          d={powerPoints.join(' ')}
          stroke={colors.power}
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="4,3"
          opacity="0.6"
        />

        {/* Thermal limit zone (near stall) */}
        <rect
          x={plotLeft + plotWidth * 0.8}
          y={plotTop}
          width={plotWidth * 0.2}
          height={plotHeight}
          fill="rgba(239,68,68,0.08)"
        />
        <text x={plotLeft + plotWidth * 0.9} y={plotTop + 14} fill={colors.error} fontSize="11" textAnchor="middle" opacity="0.7">
          Thermal Danger
        </text>

        {/* Operating point */}
        <g>
            {/* Crosshair lines */}
            <line x1={opX} y1={plotTop} x2={opX} y2={plotBottom} stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            <line x1={plotLeft} y1={opY} x2={plotRight} y2={opY} stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
            {/* Operating point dot */}
            <circle
              cx={opX}
              cy={opY}
              r="8"
              fill={isOverloaded ? colors.error : colors.accent}
              stroke="white"
              strokeWidth="2"
              filter="url(#opPointGlow)"
            />
            <text x={opX} y={opY - 14} fill={isOverloaded ? colors.error : colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
              {isOverloaded ? "Overloaded!" : "Operating Point"}
            </text>
          </g>

        {/* Axis labels */}
        <text x={plotLeft + plotWidth / 2} y={plotBottom + 15} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Torque (N-m)
        </text>
        <text x={plotLeft - 5} y={plotTop + plotHeight / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform={`rotate(-90, ${plotLeft - 5}, ${plotTop + plotHeight / 2})`}>
          Speed (rpm)
        </text>

        {/* Axis values */}
        <text x={plotRight} y={plotBottom + 15} fill={colors.textMuted} fontSize="11" textAnchor="end">{effectiveTorque.toFixed(0)}</text>
        <text x={plotLeft - 4} y={plotTop + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">{effectiveSpeed.toFixed(0)}</text>
        <text x={plotLeft - 4} y={plotBottom + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">0</text>

        {/* Legend - compact row at bottom */}
        <g transform={`translate(0, ${height - 8})`}>
          <line x1={plotLeft} y1={0} x2={plotLeft + 15} y2={0} stroke="url(#torqueGrad)" strokeWidth="2" />
          <text x={plotLeft + 19} y={3} fill={colors.textMuted} fontSize="11">T-S Curve</text>
          <line x1={plotLeft + 75} y1={0} x2={plotLeft + 90} y2={0} stroke={colors.power} strokeWidth="1.5" strokeDasharray="4,3" />
          <text x={plotLeft + 94} y={3} fill={colors.textMuted} fontSize="11">Power</text>
          <circle cx={plotLeft + 135} cy={0} r="3" fill={colors.accent} />
          <text x={plotLeft + 141} y={3} fill={colors.textMuted} fontSize="11">Op Pt</text>
          <rect x={plotLeft + 178} y={-4} width="8" height="8" rx="2" fill="rgba(239,68,68,0.15)" />
          <text x={plotLeft + 190} y={3} fill={colors.textMuted} fontSize="11">Thermal</text>
        </g>

        {/* Stats overlay */}
        <rect x={5} y={35} width="125" height="85" rx="8" fill="rgba(26,26,36,0.9)" stroke={colors.border} strokeWidth="1" />
        <text x={68} y={50} fill={colors.textMuted} fontSize="11" textAnchor="middle">Stats</text>
        <text x={15} y={65} fill={colors.torque} fontSize="11">Torque: {torqueRequired.toFixed(1)} N-m</text>
        <text x={15} y={80} fill={colors.speed} fontSize="11">Speed: {(isOverloaded ? 0 : operatingSpeed).toFixed(0)} rpm</text>
        <text x={15} y={95} fill={colors.power} fontSize="11">Power: {(isOverloaded ? 0 : powerOutput).toFixed(0)} W</text>
        <text x={15} y={110} fill={thermalLoad > 80 ? colors.error : colors.thermal} fontSize="11">Thermal: {thermalLoad.toFixed(0)}%</text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            🦾⚡
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Actuator Limits
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;Every robot joint has an invisible boundary — a <span style={{ color: colors.torque }}>torque-speed curve</span> that dictates what the motor can and cannot do. Push beyond it, and the joint stalls, overheats, or fails. Let&apos;s discover where that boundary lives.&quot;
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              &quot;The actuator is everything. If you cannot make a motor that is light enough, powerful enough, and efficient enough, the robot simply will not work. Physics does not negotiate.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Elon Musk, on Optimus actuator design
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>What You Will Explore</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Torque-speed curves: the fundamental motor operating envelope',
                'How load mass shifts the operating point toward stall',
                'Gear reduction: trading speed for torque (and its hidden costs)',
                'Why different robots choose different actuator strategies',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.accent }}>→</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The arm moves faster — heavier loads accelerate the motor' },
      { id: 'b', text: 'Nothing changes — the motor always runs at its rated speed' },
      { id: 'c', text: 'The operating point slides toward stall — more torque needed means less speed available' },
      { id: 'd', text: 'The motor switches to a different torque-speed curve' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              A robot arm holds a light payload. You increase the load from 1 kg to 20 kg. What happens on the motor&apos;s torque-speed curve?
            </h2>

            {/* Static SVG showing concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictCurveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <linearGradient id="predictLoadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Torque-Speed Curve: Where Does the Load Take You?</text>
                {/* Axes */}
                <line x1="60" y1="40" x2="60" y2="140" stroke={colors.textMuted} strokeWidth="1" />
                <line x1="60" y1="140" x2="350" y2="140" stroke={colors.textMuted} strokeWidth="1" />
                {/* T-S curve */}
                <path d="M 60 45 L 350 140" stroke="url(#predictCurveGrad)" strokeWidth="3" fill="none" />
                {/* Light load point */}
                <circle cx="120" cy="68" r="8" fill="#10B981" stroke="white" strokeWidth="2" />
                <text x="120" y="60" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">1 kg</text>
                {/* Heavy load point — question mark */}
                <circle cx="280" cy="120" r="8" fill={colors.accent} stroke="white" strokeWidth="2" />
                <text x="280" y="112" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">20 kg ?</text>
                {/* Arrow between */}
                <path d="M 135 72 L 263 116" stroke="url(#predictLoadGrad)" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrow)" />
                {/* Labels */}
                <text x="55" y="45" textAnchor="end" fill={colors.speed} fontSize="11">Fast</text>
                <text x="55" y="140" textAnchor="end" fill={colors.speed} fontSize="11">Slow</text>
                <text x="60" y="155" fill={colors.torque} fontSize="11">Low torque</text>
                <text x="290" y="155" fill={colors.torque} fontSize="11">High torque</text>
                <text x="200" y="170" textAnchor="middle" fill={colors.textMuted} fontSize="11">What happens when load increases?</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE — Actuator Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Actuator Limits Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Every robot joint has a torque-speed curve that defines its operating envelope. As you increase the payload mass, watch the operating point slide along this curve toward the stall region — where the motor produces maximum torque but zero speed, and overheats rapidly.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Torque-Speed Curve</strong> is the linear relationship between a DC motor&apos;s output torque and shaft speed: as torque demand increases, speed decreases proportionally.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.torque }}>Stall Torque</strong> is the maximum torque the motor produces at zero speed — but at maximum current draw and heat generation.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.thermal }}>Thermal Limit</strong> defines how long a motor can sustain a given torque before overheating. Operating near stall exceeds this limit within seconds.
              </p>
            </div>

            {/* Visualization */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Drag the Load Mass slider to see how payload affects the joint&apos;s operating point on the torque-speed curve. The arm visualization above the plot shows the physical effect — heavier loads cause the arm to droop as the motor approaches its limits.
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <ActuatorVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Load Mass slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Load Mass</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {loadMass.toFixed(1)} kg {isOverloaded ? '(OVERLOADED!)' : isNearStall ? '(Near Stall!)' : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="25"
                      step="0.5"
                      value={loadMass}
                      onChange={(e) => setLoadMass(parseFloat(e.target.value))}
                      onInput={(e) => setLoadMass(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Load Mass"
                      style={sliderStyle(colors.accent, loadMass, 0.5, 25)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0.5 kg (Light)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>12.5 kg</span>
                      <span style={{ ...typo.small, color: colors.error }}>25 kg (Heavy)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.torque }}>{torqueRequired.toFixed(1)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Torque (N-m)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.speed }}>{isOverloaded ? 0 : operatingSpeed.toFixed(0)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Speed (rpm)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.power }}>{isOverloaded ? 0 : powerOutput.toFixed(0)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Power (W)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: thermalLoad > 80 ? colors.error : colors.thermal }}>{thermalLoad.toFixed(0)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Thermal Load</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Actuator Limits
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Increasing load mass demands more torque, sliding the operating point along the torque-speed curve toward stall — exactly as you predicted.'
                : 'As you observed in the simulator, increasing load mass demands more torque from the motor. The operating point slides along the linear torque-speed curve toward stall, where speed drops to zero and thermal load spikes.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Torque-Speed Relationship: omega = omega_NL * (1 - tau / tau_stall)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is a <span style={{ color: colors.accent }}>linear tradeoff</span> — for every Newton-meter of additional torque the motor produces, the shaft speed drops by a fixed amount. The motor&apos;s operating point must always lie on this line. At <span style={{ color: colors.success }}>no load</span>, the motor spins at maximum speed. At <span style={{ color: colors.error }}>stall</span>, it produces maximum torque but cannot rotate.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Required torque = m * g * L = {loadMass} * 9.81 * 0.4 = <strong>{torqueRequired.toFixed(1)} N-m</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Stall is Dangerous
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                At stall, the motor draws maximum current but produces zero mechanical power because all electrical energy converts to heat. This happens because back-EMF (the voltage generated by a spinning motor that opposes current flow) drops to zero at stall, so nothing limits current except winding resistance. The reason motors operating near stall overheat in seconds is because the I-squared-R losses are at their maximum while producing zero mechanical output.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.power, marginBottom: '12px' }}>
                The Power Curve
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'No Load', torque: '0 N-m', speed: `${effectiveSpeed.toFixed(0)} rpm`, power: '0 W', color: colors.success },
                  { name: 'Peak Power', torque: `${(effectiveTorque / 2).toFixed(0)} N-m`, speed: `${(effectiveSpeed / 2).toFixed(0)} rpm`, power: 'Maximum', color: colors.power },
                  { name: 'Stall', torque: `${effectiveTorque.toFixed(0)} N-m`, speed: '0 rpm', power: '0 W', color: colors.error },
                ].map(point => (
                  <div key={point.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: point.color, fontWeight: 600 }}>{point.name}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{point.torque}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{point.speed}</div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{point.power}</div>
                  </div>
                ))}
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px', textAlign: 'center' }}>
                Mechanical power = torque x speed. It peaks at the midpoint of the curve and is zero at both extremes.
              </p>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Gear reduction just makes everything faster and stronger with no downside' },
      { id: 'b', text: 'Gears multiply torque but divide speed by the same ratio, and introduce backlash that degrades precision' },
      { id: 'c', text: 'Gear reduction has no effect on the torque-speed curve' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Gear Reduction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              What if we add a 50:1 gear reduction between the motor and the joint? The motor can only produce 50 N-m stall torque, but the joint needs up to 100 N-m. What tradeoffs does gear reduction introduce?
            </h2>

            {/* Static SVG showing gear concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="150" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="gearInGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                  <linearGradient id="gearOutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">50:1 Gear Reduction: What Changes?</text>
                {/* Motor side */}
                <rect x="40" y="45" width="100" height="40" rx="6" fill="url(#gearInGrad)" opacity="0.7" />
                <text x="90" y="62" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Motor Side</text>
                <text x="90" y="78" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">50 N-m / 300 rpm</text>
                {/* Gear icon */}
                <circle cx="200" cy="65" r="20" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6,3" />
                <text x="200" y="69" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="700">50:1</text>
                {/* Output side */}
                <rect x="260" y="45" width="100" height="40" rx="6" fill="url(#gearOutGrad)" opacity="0.7" />
                <text x="310" y="62" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Joint Side</text>
                <text x="310" y="78" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">??? N-m / ??? rpm</text>
                {/* Arrows */}
                <text x="155" y="69" textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700">→</text>
                <text x="245" y="69" textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700">→</text>
                {/* Backlash indicator */}
                <text x="200" y="110" textAnchor="middle" fill={colors.warning} fontSize="11">+ Backlash? + Friction? + Weight?</text>
                <text x="200" y="135" textAnchor="middle" fill={colors.textMuted} fontSize="11">What are the hidden costs?</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Gear Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE — Gear Reduction Explorer
  if (phase === 'twist_play') {
    const directTorqueLimit = motorStallTorque;
    const gearedTorqueLimit = motorStallTorque * 50;
    const directSpeedLimit = motorNoLoadSpeed;
    const gearedSpeedLimit = motorNoLoadSpeed / 50;
    const backlashDeg = gearReduction ? 0.3 : 0; // degrees of backlash

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Gear Reduction Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Toggle gear reduction on/off and adjust load mass to see how gears transform the torque-speed operating envelope
            </p>

            {/* Educational panel */}
            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                <strong style={{ color: colors.accent }}>What you're seeing:</strong> The torque-speed curve reshapes dramatically when you toggle the 50:1 gear reduction -- the operating envelope stretches along the torque axis while compressing along the speed axis, showing the fundamental energy conservation tradeoff.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> Enabling gear reduction multiplies the motor stall torque by 50 (letting it handle heavier loads without overloading), but divides maximum speed by 50 and introduces 0.3 degrees of backlash that degrades positioning precision.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <ActuatorVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Gear reduction toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ ...typo.body, color: colors.textSecondary }}>Gear Reduction (50:1)</span>
                      <button
                        onClick={() => { playSound('click'); setGearReduction(!gearReduction); }}
                        style={{
                          background: gearReduction ? colors.warning : colors.bgSecondary,
                          color: gearReduction ? 'white' : colors.textMuted,
                          border: `2px solid ${gearReduction ? colors.warning : colors.border}`,
                          padding: '10px 24px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          minHeight: '44px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {gearReduction ? 'ON — 50:1 Geared' : 'OFF — Direct Drive'}
                      </button>
                    </div>
                  </div>

                  {/* Load mass slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Load Mass</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{loadMass.toFixed(1)} kg</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="25"
                      step="0.5"
                      value={loadMass}
                      onChange={(e) => setLoadMass(parseFloat(e.target.value))}
                      onInput={(e) => setLoadMass(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Load Mass"
                      style={sliderStyle(colors.accent, loadMass, 0.5, 25)}
                    />
                  </div>

                  {/* Comparison grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: `${colors.speed}11`, borderRadius: '12px', padding: '16px', textAlign: 'center', border: `1px solid ${colors.speed}33` }}>
                      <div style={{ ...typo.small, color: colors.speed, marginBottom: '4px', fontWeight: 600 }}>Direct Drive</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>Max {directTorqueLimit} N-m</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>at {directSpeedLimit} rpm no-load</div>
                      <div style={{ ...typo.small, color: colors.success, marginTop: '4px' }}>0 backlash</div>
                    </div>
                    <div style={{ background: `${colors.warning}11`, borderRadius: '12px', padding: '16px', textAlign: 'center', border: `1px solid ${colors.warning}33` }}>
                      <div style={{ ...typo.small, color: colors.warning, marginBottom: '4px', fontWeight: 600 }}>50:1 Geared</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>Max {gearedTorqueLimit} N-m</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>at {gearedSpeedLimit} rpm no-load</div>
                      <div style={{ ...typo.small, color: colors.error, marginTop: '4px' }}>0.3° backlash</div>
                    </div>
                  </div>

                  {/* Key insight */}
                  <div style={{
                    background: isOverloaded ? `${colors.error}22` : `${colors.success}22`,
                    border: `1px solid ${isOverloaded ? colors.error : colors.success}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      {gearReduction
                        ? `With 50:1 gears: ${effectiveTorque} N-m max torque, ${effectiveSpeed} rpm max speed. Backlash = ${backlashDeg}°. ${isOverloaded ? 'Still overloaded!' : `Handling ${loadMass} kg with ${thermalLoad.toFixed(0)}% thermal load.`}`
                        : `Direct drive: ${effectiveTorque} N-m max torque, ${effectiveSpeed} rpm max speed. ${isOverloaded ? `Cannot handle ${loadMass} kg — need gear reduction!` : `Handling ${loadMass} kg at ${operatingSpeed.toFixed(0)} rpm.`}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              Gear Reduction: The Fundamental Tradeoff
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Gear Equation</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
                  tau_out = N * tau_motor &nbsp;&nbsp;|&nbsp;&nbsp; omega_out = omega_motor / N
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  A 50:1 gear reduction multiplies torque by 50 (from 50 N-m to 2,500 N-m) but divides speed by 50 (from 300 rpm to 6 rpm). This is not free energy — it is a conservation of power tradeoff. The gearbox reshapes the torque-speed curve from a high-speed/low-torque motor into a low-speed/high-torque output suitable for heavy robot joints.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>The Hidden Costs of Gears</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Backlash', desc: 'Angular dead zone (0.1-1°) where output does not respond to input — limits positioning precision', color: colors.error },
                    { label: 'Friction', desc: 'Gear mesh friction wastes 10-30% of power as heat, reducing overall actuator efficiency', color: colors.warning },
                    { label: 'Reflected Inertia', desc: 'Motor inertia appears N-squared larger at output — a 50:1 gear makes it 2,500x harder to backdrive', color: colors.torque },
                    { label: 'Added Mass', desc: 'Gearbox adds 0.5-2 kg per joint, reducing payload capacity and increasing energy consumption', color: colors.speed },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                    }}>
                      <div style={{ ...typo.body, color: item.color, fontWeight: 600, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Design Choice</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Every robot actuator involves a fundamental design choice: direct drive (no gears) gives transparency, backdrivability, and zero backlash but limits torque. High-ratio gears enable massive torque but sacrifice speed, precision, and safety. Modern solutions like harmonic drives and series elastic actuators attempt to find the optimal compromise for each application.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Actuator Limits"
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
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Actuator Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Key players: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app or go to test
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > idx);
                      const anyUncompleted = newCompleted.findIndex(c => !c);
                      if (newCompleted.every(c => c)) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else if (nextUncompleted !== -1) {
                        // Scroll to next uncompleted app
                        setSelectedApp(nextUncompleted);
                      } else if (anyUncompleted !== -1) {
                        setSelectedApp(anyUncompleted);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand actuator physics, torque-speed curves, and gear reduction tradeoffs!' : 'Review the concepts and try again to master actuator limits.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review &amp; Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Actuator Limits
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of actuator physics, torque-speed curves, gear reduction tradeoffs, and robotic manipulation to real-world engineering scenarios.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Actuator Limits Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the physics that govern every robot joint — from the fundamental torque-speed curve to the engineering tradeoffs that define actuator design.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Torque-speed curves define the motor operating envelope',
                'Heavier loads slide the operating point toward stall',
                'Gear reduction trades speed for torque with hidden costs',
                'Reflected inertia scales as N-squared, affecting safety',
                'Different actuator types suit different robotic applications',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Play Again
            </button>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_ActuatorLimitsRenderer;
