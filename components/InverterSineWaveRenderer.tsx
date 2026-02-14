'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Inverter Sine Wave Synthesis - Complete 10-Phase Game
// How inverters create AC power from DC using PWM and filtering
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

interface InverterSineWaveRendererProps {
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
    scenario: "A solar installation company is choosing between a cheap square-wave inverter and an expensive pure sine wave inverter for a residential customer who wants to power their refrigerator, computer, and LED lights.",
    question: "Why should they recommend the pure sine wave inverter despite the higher cost?",
    options: [
      { id: 'a', label: "Square waves deliver more power so the cheaper option is actually better" },
      { id: 'b', label: "Pure sine wave inverters have lower THD, preventing motor overheating and electronic interference", correct: true },
      { id: 'c', label: "Both work identically for these appliances" },
      { id: 'd', label: "Square wave inverters are more efficient" }
    ],
    explanation: "Pure sine wave inverters produce clean AC power with low Total Harmonic Distortion (THD < 3%). Square waves have ~48% THD, which causes motors (refrigerator compressor) to overheat and can interfere with sensitive electronics like computers. The extra cost prevents equipment damage and energy waste."
  },
  {
    scenario: "An engineer is designing a grid-tied solar inverter. The utility requires that the inverter output must have THD below 5% and the output frequency must be synchronized to exactly 60Hz.",
    question: "What technique does the inverter use to achieve these requirements?",
    options: [
      { id: 'a', label: "Simple square wave switching at 60Hz" },
      { id: 'b', label: "High-frequency PWM switching with sinusoidal duty cycle modulation and LC filtering", correct: true },
      { id: 'c', label: "Mechanical rotating switches synchronized to a clock" },
      { id: 'd', label: "Resistive voltage dividers to shape the waveform" }
    ],
    explanation: "PWM (Pulse Width Modulation) switches at high frequency (10-50kHz) with duty cycle that varies sinusoidally. The LC filter removes the high-frequency components, leaving only the 60Hz fundamental. A phase-locked loop (PLL) synchronizes the output to the grid frequency."
  },
  {
    scenario: "A factory's Variable Frequency Drive (VFD) is controlling a large motor. The drive switches at 8kHz PWM frequency. The motor is making an audible whining noise.",
    question: "What causes this noise and how can it be reduced?",
    options: [
      { id: 'a', label: "The motor is broken and needs replacement" },
      { id: 'b', label: "The 8kHz switching frequency is in the audible range; increasing PWM frequency above 16kHz eliminates the noise", correct: true },
      { id: 'c', label: "Adding more capacitors to the motor terminals" },
      { id: 'd', label: "The noise is normal and cannot be reduced" }
    ],
    explanation: "Human hearing ranges from 20Hz to 20kHz. PWM switching at 8kHz creates acoustic noise as motor windings vibrate at the switching frequency. Increasing the PWM frequency above 16kHz pushes the noise into the ultrasonic range, making it inaudible. This is why modern VFDs use switching frequencies of 12-20kHz."
  },
  {
    scenario: "An electric vehicle manufacturer is comparing silicon (Si) IGBT inverters with newer silicon carbide (SiC) MOSFET inverters for their traction drive. The SiC version costs 30% more.",
    question: "What advantage makes SiC worth the extra cost?",
    options: [
      { id: 'a', label: "SiC devices have prettier packaging" },
      { id: 'b', label: "SiC can switch faster with lower losses, enabling higher efficiency and smaller cooling systems", correct: true },
      { id: 'c', label: "SiC is more resistant to crash damage" },
      { id: 'd', label: "SiC inverters are quieter" }
    ],
    explanation: "Silicon Carbide (SiC) MOSFETs have much lower switching losses than silicon IGBTs. This enables higher PWM frequencies (20kHz vs 8kHz), reducing filter size and improving waveform quality. Lower losses mean higher efficiency (98%+ vs 95%) and smaller heatsinks. Tesla's Model 3 uses SiC inverters for extended range."
  },
  {
    scenario: "A UPS (Uninterruptible Power Supply) system uses double-conversion topology where AC is rectified to DC, stored in batteries, then inverted back to AC. This seems inefficient.",
    question: "Why do high-end UPS systems use double-conversion despite the efficiency penalty?",
    options: [
      { id: 'a', label: "It's the only way to charge batteries" },
      { id: 'b', label: "Double conversion provides complete isolation from grid disturbances and zero transfer time to battery", correct: true },
      { id: 'c', label: "Single conversion UPS don't exist" },
      { id: 'd', label: "It's required by electrical codes" }
    ],
    explanation: "Double-conversion (online) UPS systems continuously regenerate clean AC power regardless of input quality. The load never sees grid disturbances like sags, surges, or harmonics. When grid power fails, there's zero transfer time because the inverter is already supplying power. This protects critical equipment like servers and medical devices."
  },
  {
    scenario: "A grid-tied solar inverter has anti-islanding protection. During a grid outage, it immediately shuts down even though the solar panels are producing full power.",
    question: "Why is this safety feature required?",
    options: [
      { id: 'a', label: "To prevent damage to the solar panels" },
      { id: 'b', label: "To protect utility workers from electrocution by preventing the inverter from energizing the 'dead' grid", correct: true },
      { id: 'c', label: "To conserve solar panel power during outages" },
      { id: 'd', label: "To prevent the inverter from overheating" }
    ],
    explanation: "Anti-islanding protection is a critical safety requirement. When the grid goes down for maintenance, utility workers assume the lines are de-energized. If solar inverters continued feeding power into the grid, workers could be electrocuted. IEEE 1547 requires inverters to detect grid loss and disconnect within 2 seconds."
  },
  {
    scenario: "An H-bridge inverter has four MOSFETs arranged in pairs: Q1-Q4 and Q2-Q3. To create AC output, the controller alternates between turning on Q1-Q4 (positive output) and Q2-Q3 (negative output).",
    question: "What happens if Q1 and Q2 are accidentally turned on simultaneously?",
    options: [
      { id: 'a', label: "The output voltage doubles" },
      { id: 'b', label: "A direct short circuit from DC+ to DC- occurs, potentially destroying the MOSFETs", correct: true },
      { id: 'c', label: "The output becomes zero volts" },
      { id: 'd', label: "The frequency increases" }
    ],
    explanation: "This is called a 'shoot-through' fault. If both high-side (Q1) and low-side (Q2) switches on the same leg are ON simultaneously, they create a direct short circuit across the DC bus. Massive current flows, potentially destroying both switches in microseconds. PWM controllers include 'dead-time' delays to prevent this."
  },
  {
    scenario: "A modified sine wave inverter produces a stepped waveform that approximates a sine wave. It's cheaper than a pure sine inverter but more expensive than a square wave inverter.",
    question: "What determines the THD of a modified sine wave?",
    options: [
      { id: 'a', label: "The voltage level" },
      { id: 'b', label: "The number of steps used to approximate the sine wave - more steps mean lower THD", correct: true },
      { id: 'c', label: "The output frequency" },
      { id: 'd', label: "The battery voltage" }
    ],
    explanation: "Modified sine wave inverters use multiple voltage levels to approximate a sine wave. A simple 3-level design (0, +V, -V) has about 24% THD. Adding more steps reduces THD - a 5-level design might achieve 12% THD, and 7-level achieves 8%. However, PWM with filtering achieves under 3% THD more cost-effectively."
  },
  {
    scenario: "A 10kW solar inverter is connected to a 400V DC bus from the solar panels. The output is 240V AC RMS at 60Hz. The inverter claims 97% efficiency.",
    question: "Where does the 3% power loss primarily occur?",
    options: [
      { id: 'a', label: "In the solar panels" },
      { id: 'b', label: "In MOSFET switching losses, conduction losses, and inductor/capacitor losses", correct: true },
      { id: 'c', label: "In the output cables" },
      { id: 'd', label: "In the display screen" }
    ],
    explanation: "Inverter losses occur in: (1) MOSFET switching losses - energy lost during on/off transitions, (2) MOSFET conduction losses - I^2*R_ds_on heating, (3) Inductor core and copper losses in the output filter, (4) Control circuit power consumption. Higher PWM frequencies reduce filter size but increase switching losses - engineers optimize this tradeoff."
  },
  {
    scenario: "An electric vehicle's bidirectional inverter supports V2G (Vehicle-to-Grid) operation. During peak demand, the car can feed power back to the grid.",
    question: "What makes V2G inverter control more complex than simple charging?",
    options: [
      { id: 'a', label: "V2G requires a larger battery" },
      { id: 'b', label: "V2G requires four-quadrant operation: controlling both direction and phase of power flow", correct: true },
      { id: 'c', label: "V2G needs special cables" },
      { id: 'd', label: "V2G only works with specific car models" }
    ],
    explanation: "Four-quadrant operation means the inverter must handle: (1) Charging - rectifying AC to DC, (2) Discharging - inverting DC to AC, (3) Absorbing reactive power - phase angle lagging, (4) Supplying reactive power - phase angle leading. The control system must seamlessly transition between modes while maintaining grid synchronization and power quality."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '☀️',
    title: 'Solar Power Inverters',
    short: 'Converting solar DC to grid-quality AC',
    tagline: 'The heart of every solar power system',
    description: 'Solar panels produce DC electricity that must be converted to AC for home use and grid connection. Modern solar inverters use advanced PWM techniques with switching frequencies of 20-50kHz to produce pure sine wave output with THD below 3%.',
    connection: 'The PWM sine wave synthesis and LC filtering you learned is exactly how solar inverters create grid-quality AC from solar panel DC. High-frequency switching with sinusoidal duty cycle modulation produces clean power.',
    howItWorks: 'Solar panels produce variable DC (300-600V). The inverter uses an H-bridge with high-frequency PWM where duty cycle varies sinusoidally. An LC output filter removes switching harmonics. A phase-locked loop synchronizes to grid frequency for net metering.',
    stats: [
      { value: '97-99%', label: 'Peak Efficiency' },
      { value: '<3%', label: 'THD Requirement' },
      { value: '25 years', label: 'Typical Lifespan' }
    ],
    examples: ['Residential rooftop systems (3-10kW)', 'Commercial installations (50-500kW)', 'Utility-scale solar farms (1-500MW)', 'Microinverters on each panel'],
    companies: ['Enphase', 'SolarEdge', 'SMA', 'Fronius', 'Huawei'],
    futureImpact: 'Solar inverters are driving the renewable energy transition. Next-generation inverters incorporate AI-based maximum power point tracking, predictive maintenance, and smart grid support for frequency regulation.',
    color: '#F59E0B'
  },
  {
    icon: '🔋',
    title: 'UPS Systems',
    short: 'Uninterruptible power for critical loads',
    tagline: 'Zero-transfer-time power protection',
    description: 'Online UPS systems use double-conversion topology where incoming AC is rectified to DC, stored in batteries, and continuously inverted back to AC. This provides complete isolation from grid disturbances and instant backup power.',
    connection: 'UPS inverters use the same H-bridge PWM and filtering principles, maintaining precise voltage and frequency regulation while seamlessly transitioning between grid and battery power.',
    howItWorks: 'The rectifier continuously converts AC to DC, charging batteries while powering the inverter. The inverter always generates output, providing zero transfer time. Pure sine wave output protects sensitive equipment from grid disturbances.',
    stats: [
      { value: '0 ms', label: 'Transfer Time' },
      { value: '94-96%', label: 'Efficiency' },
      { value: '<2%', label: 'Output THD' }
    ],
    examples: ['Data center server protection', 'Hospital life-support equipment', 'Industrial process control', 'Telecommunications infrastructure'],
    companies: ['APC (Schneider)', 'Eaton', 'Vertiv', 'CyberPower'],
    futureImpact: 'Modern UPS systems are evolving into grid-interactive energy storage, providing demand response, peak shaving, and renewable integration. Lithium-ion batteries are replacing lead-acid for higher density.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'EV Traction Inverters',
    short: 'Powering electric vehicle motors',
    tagline: 'High-performance power conversion',
    description: 'Electric vehicle traction inverters convert DC from the battery pack (400-800V) into three-phase AC to drive the motor. Using silicon carbide MOSFETs and PWM frequencies up to 20kHz, these achieve 98%+ efficiency.',
    connection: 'EV inverters create three-phase AC using space vector PWM. The V/f ratio control and field-oriented control algorithms build on the fundamental switching concepts you learned for single-phase inverters.',
    howItWorks: 'Six switches (three half-bridges) create three-phase AC. Space vector modulation calculates optimal duty cycles. Field-oriented control provides precise torque response. Regenerative braking reverses power flow to charge the battery.',
    stats: [
      { value: '98%+', label: 'Inverter Efficiency' },
      { value: '200kW+', label: 'Peak Power' },
      { value: '20kHz', label: 'Switch Frequency' }
    ],
    examples: ['Tesla Model 3/Y rear motor', 'Electric bus drivetrains', 'Electric aircraft propulsion', 'High-speed electric trains'],
    companies: ['Tesla', 'BorgWarner', 'Infineon', 'STMicroelectronics', 'Wolfspeed'],
    futureImpact: 'Next-generation 800V architectures with SiC inverters enable faster charging and longer range. Vehicle-to-grid (V2G) capability turns EVs into mobile power plants during grid emergencies.',
    color: '#22C55E'
  },
  {
    icon: '⚡',
    title: 'Variable Frequency Drives',
    short: 'Industrial motor speed control',
    tagline: 'Energy-efficient motor operation',
    description: 'VFDs control motor speed by varying the frequency and voltage of the AC output. By running motors at optimal speed rather than full speed with throttling, VFDs save 20-50% energy in pumps, fans, and compressors.',
    connection: 'VFDs use the same PWM principles with variable output frequency. The V/Hz ratio is kept constant to maintain motor torque. Higher PWM frequencies reduce motor heating from harmonics.',
    howItWorks: 'The rectifier converts AC to DC. The PWM inverter generates variable-frequency AC. By changing fundamental frequency from 0-60Hz and voltage proportionally, motor speed is controlled precisely with maintained torque.',
    stats: [
      { value: '20-50%', label: 'Energy Savings' },
      { value: '4-20kHz', label: 'PWM Frequency' },
      { value: '150:1', label: 'Speed Range' }
    ],
    examples: ['HVAC fan and pump control', 'Conveyor belt systems', 'Elevator drives', 'Industrial compressors'],
    companies: ['ABB', 'Siemens', 'Danfoss', 'Yaskawa', 'Rockwell'],
    futureImpact: 'AI-enabled VFDs optimize motor operation in real-time. Integrated motor-drive units eliminate external wiring. Regenerative VFDs feed braking energy back to the grid instead of wasting it as heat.',
    color: '#A855F7'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const InverterSineWaveRenderer: React.FC<InverterSineWaveRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [waveformType, setWaveformType] = useState<'square' | 'modified' | 'pwm'>('square');
  const [dcVoltage, setDcVoltage] = useState(400);
  const [frequency, setFrequency] = useState(60);
  const [pwmFrequency, setPwmFrequency] = useState(20); // kHz
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Twist phase - motor load scenario
  const [motorLoad, setMotorLoad] = useState(50); // % load
  const [motorTemp, setMotorTemp] = useState(60); // degrees C

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

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.05) % (2 * Math.PI * 4));
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Calculate motor temperature based on THD and load
  useEffect(() => {
    const baseTHD = waveformType === 'square' ? 48.3 : waveformType === 'modified' ? 23.8 : 3.2;
    const extraHeat = (baseTHD / 100) * 0.25 * motorLoad;
    const baseTemp = 40 + (motorLoad * 0.4);
    setMotorTemp(Math.round(baseTemp + extraHeat));
  }, [waveformType, motorLoad]);

  // Generate waveform data
  const generateWaveform = useCallback((type: string, numPoints: number = 200) => {
    const points: { x: number; y: number }[] = [];
    const period = 2 * Math.PI;

    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * period * 2;
      let y = 0;

      if (type === 'square') {
        y = Math.sin(t) >= 0 ? 1 : -1;
      } else if (type === 'modified') {
        const sine = Math.sin(t);
        if (Math.abs(sine) < 0.33) y = 0;
        else y = sine > 0 ? 1 : -1;
      } else if (type === 'pwm') {
        const sine = Math.sin(t);
        const pwmPhase = (t * pwmFrequency) % (2 * Math.PI);
        const dutyCycle = (sine + 1) / 2;
        y = pwmPhase < dutyCycle * 2 * Math.PI ? 1 : -1;
        y = sine * 0.9 + y * 0.1;
      } else if (type === 'sine') {
        y = Math.sin(t);
      }

      points.push({ x: i, y: y * dcVoltage / 2 });
    }
    return points;
  }, [dcVoltage, pwmFrequency]);

  // Calculate THD
  const calculateTHD = useCallback(() => {
    if (waveformType === 'square') return 48.3;
    if (waveformType === 'modified') return 23.8;
    if (waveformType === 'pwm') return Math.max(1.5, 8 - pwmFrequency * 0.15);
    return 0;
  }, [waveformType, pwmFrequency]);

  const squareWave = generateWaveform('square');
  const outputWave = generateWaveform(waveformType);
  const sineWave = generateWaveform('sine');
  const thd = calculateTHD();

  // Premium design colors
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
    textMuted: '#e2e8f0',
    border: '#2a2a3a',
    dc: '#3b82f6',
    ac: '#22c55e',
    pwm: '#a855f7',
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
    twist_play: 'Motor Effects',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'inverter-sine-wave',
        gameTitle: 'Inverter Sine Wave Synthesis',
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

  // Inverter Visualization Component
  const InverterVisualization = ({ interactive }: { interactive: boolean }) => {
    const width = isMobile ? 360 : 680;
    const height = isMobile ? 400 : 480;
    const graphWidth = isMobile ? 320 : 620;
    const graphHeight = 100;
    const graphX = isMobile ? 20 : 30;

    const scaleX = (i: number) => graphX + (i / 200) * graphWidth;
    const scaleY = (v: number, centerY: number) => centerY - (v / (dcVoltage / 2)) * (graphHeight / 2 - 8);

    const switchState1 = Math.sin(animationTime * 2) > 0;
    const switchState2 = !switchState1;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '720px', background: colors.bgCard }}
        >
          <defs>
            <linearGradient id="iswSineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="iswPwmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={width/2} y="24" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
            DC to AC: {waveformType === 'square' ? 'Square Wave' : waveformType === 'modified' ? 'Modified Sine' : 'PWM Pure Sine'}
          </text>

          {/* H-Bridge Circuit Diagram */}
          <g transform={`translate(${isMobile ? 20 : 40}, 40)`}>
            {/* DC Source */}
            <rect x="0" y="15" width="50" height="40" rx="4" fill={colors.bgSecondary} stroke={colors.dc} strokeWidth="2" />
            <text x="25" y="32" textAnchor="middle" fill={colors.dc} fontSize="10" fontWeight="bold">DC</text>
            <text x="25" y="48" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">{dcVoltage}V</text>

            {/* H-Bridge Box */}
            <rect x="70" y="0" width={isMobile ? 100 : 120} height="70" rx="6" fill={colors.bgSecondary} stroke={colors.pwm} strokeWidth="2" />
            <text x={70 + (isMobile ? 50 : 60)} y="16" textAnchor="middle" fill={colors.pwm} fontSize="10" fontWeight="bold">H-BRIDGE</text>

            {/* Switches */}
            <rect x="80" y="25" width="30" height="18" rx="3" fill={switchState1 ? colors.success : colors.bgCard} stroke={switchState1 ? colors.success : colors.textMuted} strokeWidth="1.5" />
            <text x="95" y="37" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Q1</text>

            <rect x={isMobile ? 120 : 130} y="25" width="30" height="18" rx="3" fill={switchState2 ? colors.success : colors.bgCard} stroke={switchState2 ? colors.success : colors.textMuted} strokeWidth="1.5" />
            <text x={isMobile ? 135 : 145} y="37" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Q2</text>

            <rect x="80" y="47" width="30" height="18" rx="3" fill={switchState2 ? colors.success : colors.bgCard} stroke={switchState2 ? colors.success : colors.textMuted} strokeWidth="1.5" />
            <text x="95" y="59" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Q3</text>

            <rect x={isMobile ? 120 : 130} y="47" width="30" height="18" rx="3" fill={switchState1 ? colors.success : colors.bgCard} stroke={switchState1 ? colors.success : colors.textMuted} strokeWidth="1.5" />
            <text x={isMobile ? 135 : 145} y="59" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Q4</text>

            {/* LC Filter */}
            <rect x={isMobile ? 190 : 210} y="15" width={isMobile ? 60 : 80} height="40" rx="4" fill={colors.bgSecondary} stroke={colors.warning} strokeWidth="2" />
            <text x={isMobile ? 220 : 250} y="32" textAnchor="middle" fill={colors.warning} fontSize="10" fontWeight="bold">LC Filter</text>
            <text x={isMobile ? 220 : 250} y="48" textAnchor="middle" fill={colors.textMuted} fontSize="9">L + C</text>

            {/* AC Output */}
            <rect x={isMobile ? 270 : 310} y="15" width="55" height="40" rx="4" fill={colors.bgSecondary} stroke={colors.ac} strokeWidth="2" />
            <text x={isMobile ? 297 : 337} y="32" textAnchor="middle" fill={colors.ac} fontSize="10" fontWeight="bold">AC OUT</text>
            <text x={isMobile ? 297 : 337} y="48" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">{frequency}Hz</text>

            {/* Connection arrows */}
            <line x1="50" y1="35" x2="70" y2="35" stroke={colors.dc} strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1={isMobile ? 170 : 190} y1="35" x2={isMobile ? 190 : 210} y2="35" stroke={colors.pwm} strokeWidth="2" />
            <line x1={isMobile ? 250 : 290} y1="35" x2={isMobile ? 270 : 310} y2="35" stroke={colors.ac} strokeWidth="2" />
          </g>

          {/* Before Filter Graph */}
          <g transform={`translate(0, ${isMobile ? 115 : 125})`}>
            <rect x={graphX - 5} y="0" width={graphWidth + 10} height={graphHeight + 25} rx="6" fill={colors.bgSecondary} />
            <text x={graphX} y="14" fill={colors.pwm} fontSize="11" fontWeight="bold">Before Filter: PWM Switching</text>

            {/* Zero line */}
            <line x1={graphX} y1={graphHeight/2 + 15} x2={graphX + graphWidth} y2={graphHeight/2 + 15} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

            {/* Y labels */}
            <text x={graphX - 3} y={22} fill={colors.textMuted} fontSize="8" textAnchor="end">+</text>
            <text x={graphX - 3} y={graphHeight + 12} fill={colors.textMuted} fontSize="8" textAnchor="end">-</text>

            {/* PWM waveform */}
            <path
              d={squareWave.map((p, i) => {
                const x = scaleX(p.x);
                const y = scaleY(p.y, graphHeight/2 + 15);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="url(#iswPwmGrad)"
              strokeWidth="2"
              filter="url(#glowFilter)"
            />
          </g>

          {/* After Filter Graph */}
          <g transform={`translate(0, ${isMobile ? 250 : 265})`}>
            <rect x={graphX - 5} y="0" width={graphWidth + 10} height={graphHeight + 25} rx="6" fill={colors.bgSecondary} />
            <text x={graphX} y="14" fill={colors.ac} fontSize="11" fontWeight="bold">After Filter: Clean AC Output</text>

            {/* Zero line */}
            <line x1={graphX} y1={graphHeight/2 + 15} x2={graphX + graphWidth} y2={graphHeight/2 + 15} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

            {/* Ideal sine (dashed) */}
            <path
              d={sineWave.map((p, i) => {
                const x = scaleX(p.x);
                const y = scaleY(p.y, graphHeight/2 + 15);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={colors.textMuted}
              strokeWidth="1.5"
              strokeDasharray="6,4"
              opacity="0.4"
            />

            {/* Actual output */}
            <path
              d={outputWave.map((p, i) => {
                const x = scaleX(p.x);
                const y = scaleY(p.y, graphHeight/2 + 15);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="url(#iswSineGrad)"
              strokeWidth="2.5"
              filter="url(#glowFilter)"
            />

            <text x={graphX + graphWidth - 5} y={graphHeight + 22} fill={colors.textMuted} fontSize="9" textAnchor="end">
              Dashed = ideal sine
            </text>
          </g>

          {/* THD Stats Panel */}
          <g transform={`translate(${graphX - 5}, ${isMobile ? 365 : 385})`}>
            <rect x="0" y="0" width={graphWidth + 10} height="30" rx="6" fill={colors.bgSecondary} stroke={thd < 5 ? colors.success : thd < 25 ? colors.warning : colors.error} strokeWidth="1.5" />
            <text x="15" y="20" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
              THD: <tspan fill={thd < 5 ? colors.success : thd < 25 ? colors.warning : colors.error}>{thd.toFixed(1)}%</tspan>
            </text>
            <text x={isMobile ? 100 : 150} y="20" fill={colors.textMuted} fontSize="11">
              {thd < 5 ? 'Excellent - Grid Compatible' : thd < 25 ? 'Moderate - Light Loads OK' : 'Poor - Motor Damage Risk'}
            </text>
            <text x={graphWidth - 10} y="20" fill={colors.textSecondary} fontSize="10" textAnchor="end">
              PWM: {pwmFrequency}kHz | Efficiency: {waveformType === 'pwm' ? '95-98%' : waveformType === 'modified' ? '85-90%' : '80-85%'}
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            {(['square', 'modified', 'pwm'] as const).map(type => (
              <button
                key={type}
                onClick={() => { playSound('click'); setWaveformType(type); }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: waveformType === type ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  background: waveformType === type ? `${colors.accent}22` : colors.bgCard,
                  color: waveformType === type ? colors.accent : colors.textPrimary,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                }}
              >
                {type === 'square' ? 'Square Wave' : type === 'modified' ? 'Modified Sine' : 'PWM Pure Sine'}
              </button>
            ))}
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {isAnimating ? 'Pause' : 'Play'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Motor Temperature Visualization for twist phase
  const MotorVisualization = () => {
    const tempColor = motorTemp < 70 ? colors.success : motorTemp < 90 ? colors.warning : colors.error;
    const dangerLevel = motorTemp >= 90 ? 'DANGER' : motorTemp >= 70 ? 'WARNING' : 'SAFE';

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Motor icon */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tempColor}33 0%, ${colors.bgSecondary} 70%)`,
            border: `4px solid ${tempColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: motorTemp >= 80 ? `0 0 20px ${tempColor}66` : 'none',
            animation: motorTemp >= 90 ? 'pulse 0.5s infinite' : 'none',
          }}>
            <span style={{ fontSize: '32px' }}>Motor</span>
            <span style={{ color: tempColor, fontSize: '24px', fontWeight: 'bold' }}>{motorTemp}C</span>
            <span style={{ color: colors.textMuted, fontSize: '12px' }}>{dangerLevel}</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: colors.textSecondary, width: '100px' }}>Waveform:</span>
              <span style={{ color: colors.textPrimary, fontWeight: 'bold' }}>
                {waveformType === 'square' ? 'Square Wave' : waveformType === 'modified' ? 'Modified Sine' : 'Pure Sine'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: colors.textSecondary, width: '100px' }}>THD:</span>
              <span style={{ color: thd < 5 ? colors.success : thd < 25 ? colors.warning : colors.error, fontWeight: 'bold' }}>
                {thd.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: colors.textSecondary, width: '100px' }}>Motor Load:</span>
              <span style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{motorLoad}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: colors.textSecondary, width: '100px' }}>Extra Heat:</span>
              <span style={{ color: tempColor, fontWeight: 'bold' }}>
                +{Math.round((thd / 100) * 0.25 * motorLoad)}C from harmonics
              </span>
            </div>
          </div>
        </div>

        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }`}</style>
      </div>
    );
  };

  // Navigation bar component with fixed position
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚡</span>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Inverter Sine Wave</span>
      </div>
      <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
        {phaseLabels[phase]}
      </div>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
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
        <button
          key={p}
          onClick={() => goToPhase(p)}
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
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Secondary button style
  const secondaryButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 24px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ☀️⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Inverter Sine Wave Synthesis
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Solar panels produce <span style={{ color: colors.dc }}>DC power</span>, but your home needs <span style={{ color: colors.ac }}>AC power</span>. How do inverters create a smooth sinusoidal waveform from switched DC?
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "A cheap square-wave inverter can destroy motors and electronics. The difference between a $50 inverter and a $500 pure sine inverter is the quality of the waveform - and that comes down to PWM switching and filtering."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Power Electronics Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Learn How Inverters Work
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Switching very fast creates a smooth sine wave automatically' },
      { id: 'b', text: 'PWM switching with sinusoidal duty cycle modulation + LC filtering creates a sine wave', correct: true },
      { id: 'c', text: 'Resistors shape the square wave into a sine' },
      { id: 'd', text: 'Capacitors alone can convert DC to AC' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            How does an inverter create a smooth sine wave from DC?
          </h2>

          {/* Static SVG diagram for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg
              width="100%"
              height="180"
              viewBox="0 0 400 180"
              preserveAspectRatio="xMidYMid meet"
              style={{ maxWidth: '400px' }}
            >
              {/* DC Source */}
              <rect x="20" y="60" width="70" height="60" rx="8" fill={`${colors.dc}33`} stroke={colors.dc} strokeWidth="2" />
              <text x="55" y="85" textAnchor="middle" fill={colors.dc} fontSize="16" fontWeight="bold">DC</text>
              <text x="55" y="105" textAnchor="middle" fill={colors.textMuted} fontSize="11">Battery</text>

              {/* Arrow 1 */}
              <line x1="95" y1="90" x2="130" y2="90" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="130,85 140,90 130,95" fill={colors.textMuted} />

              {/* Mystery Box */}
              <rect x="145" y="60" width="110" height="60" rx="8" fill={`${colors.pwm}33`} stroke={colors.pwm} strokeWidth="2" strokeDasharray="5,5" />
              <text x="200" y="85" textAnchor="middle" fill={colors.pwm} fontSize="18" fontWeight="bold">???</text>
              <text x="200" y="105" textAnchor="middle" fill={colors.textMuted} fontSize="11">Mystery</text>

              {/* Arrow 2 */}
              <line x1="260" y1="90" x2="295" y2="90" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="295,85 305,90 295,95" fill={colors.textMuted} />

              {/* AC Output with sine wave */}
              <rect x="310" y="60" width="70" height="60" rx="8" fill={`${colors.ac}33`} stroke={colors.ac} strokeWidth="2" />
              <text x="345" y="82" textAnchor="middle" fill={colors.ac} fontSize="14" fontWeight="bold">AC~</text>
              {/* Mini sine wave */}
              <path d="M320,95 Q330,80 340,95 Q350,110 360,95 Q370,80 375,95" fill="none" stroke={colors.ac} strokeWidth="2" />

              {/* Question marks */}
              <text x="117" y="55" fill={colors.warning} fontSize="20">?</text>
              <text x="270" y="55" fill={colors.warning} fontSize="20">?</text>
            </svg>
          </div>

          {/* Options */}
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

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Inverter Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Inverter Waveform Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Compare square wave, modified sine, and PWM pure sine inverters
          </p>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Real-World Relevance:</strong> This exact technology powers solar inverters, electric vehicles, and UPS systems. Understanding waveform quality helps you choose the right inverter for your needs.
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <InverterVisualization interactive={true} />
          </div>

          {/* Control sliders */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            {/* DC Voltage slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>DC Input Voltage</span>
                <span style={{ ...typo.small, color: colors.dc, fontWeight: 600 }}>{dcVoltage}V</span>
              </div>
              <input
                type="range"
                min="100"
                max="600"
                step="10"
                value={dcVoltage}
                onChange={(e) => setDcVoltage(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>100V (Low)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>600V (Grid-Tied)</span>
              </div>
            </div>

            {/* PWM Frequency slider (only for PWM mode) */}
            {waveformType === 'pwm' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>PWM Switching Frequency</span>
                  <span style={{ ...typo.small, color: colors.pwm, fontWeight: 600 }}>{pwmFrequency}kHz</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={pwmFrequency}
                  onChange={(e) => setPwmFrequency(parseInt(e.target.value))}
                  style={{ width: '100%', height: '8px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>5kHz (Large filter)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>50kHz (Small filter)</span>
                </div>
              </div>
            )}

            {/* Output frequency */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Output Frequency</span>
                <span style={{ ...typo.small, color: colors.ac, fontWeight: 600 }}>{frequency}Hz</span>
              </div>
              <input
                type="range"
                min="50"
                max="60"
                step="10"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>50Hz (Europe/Asia)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>60Hz (Americas)</span>
              </div>
            </div>
          </div>

          {/* Experiments prompt */}
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
              Experiments to Try:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Compare THD: Square (48%) vs Modified (24%) vs PWM (&lt;5%)</li>
              <li>With PWM mode, increase switching frequency and watch THD improve</li>
              <li>Grid-tied inverters must achieve THD under 5% by law!</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'b';
    const predictionLabels: Record<string, string> = {
      'a': 'fast switching creates smooth waves automatically',
      'b': 'PWM + LC filtering creates sine waves',
      'c': 'resistors shape the waveform',
      'd': 'capacitors alone convert DC to AC',
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Your Prediction Was Correct!' : 'Let\'s Review Your Prediction'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              You predicted that {prediction ? predictionLabels[prediction] : 'no answer was selected'}.
            </p>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              <strong>PWM + LC filtering</strong> is the key! By switching at high frequency with a duty cycle that varies sinusoidally, then filtering out the high-frequency components, we get a clean sine wave.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How Inverters Create Sine Waves
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Step 1: H-Bridge Switching</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Four MOSFETs in an H-bridge configuration can connect the output to +V, -V, or 0V. By switching Q1+Q4 ON or Q2+Q3 ON, we alternate the output polarity to create AC.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Step 2: PWM Modulation</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Instead of switching at the output frequency (60Hz), we switch at <span style={{ color: colors.pwm }}>10-50kHz</span>. The duty cycle follows a sine pattern - high near the peak, low near zero crossings. The average voltage traces out a sine wave.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Step 3: LC Filter</strong>
              </p>
              <p>
                A low-pass filter (inductor + capacitor) removes the high-frequency PWM components, leaving only the fundamental <span style={{ color: colors.ac }}>60Hz sine wave</span>. Higher PWM frequencies allow smaller filters.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: Total Harmonic Distortion (THD)
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              THD measures how much the output deviates from a pure sine wave:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Square wave: ~48% THD (causes motor heating, equipment damage)</li>
              <li>Modified sine: ~24% THD (acceptable for light loads)</li>
              <li>PWM pure sine: &lt;5% THD (grid-compatible, safe for all loads)</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Consequences
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Square waves work fine for all appliances' },
      { id: 'b', text: 'Motors and transformers waste energy and overheat on distorted waveforms', correct: true },
      { id: 'c', text: 'Only LED lights are affected by waveform quality' },
      { id: 'd', text: 'Square waves actually deliver more power and are better' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              The Twist: Real-World Consequences
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens when you run motors and transformers on distorted waveforms?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              A homeowner buys a cheap square-wave inverter to power their refrigerator, air conditioner, and power tools during a power outage. The inverter has 48% THD. After a few hours of use...
            </p>
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Effects
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Motor Temperature vs Waveform Quality
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how harmonics cause motor overheating
          </p>

          {/* Motor visualization */}
          <MotorVisualization />

          {/* Waveform selector */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Inverter Type</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['square', 'modified', 'pwm'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => { playSound('click'); setWaveformType(type); }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: waveformType === type ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                      background: waveformType === type ? `${colors.accent}22` : 'transparent',
                      color: waveformType === type ? colors.accent : colors.textPrimary,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {type === 'square' ? 'Square Wave' : type === 'modified' ? 'Modified Sine' : 'Pure Sine'}
                  </button>
                ))}
              </div>
            </div>

            {/* Motor load slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Motor Load</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{motorLoad}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={motorLoad}
                onChange={(e) => setMotorLoad(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Warning message */}
          {motorTemp >= 80 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                {motorTemp >= 90
                  ? 'DANGER: Motor insulation breakdown! Premature failure likely.'
                  : 'WARNING: Motor running hot. Reduced lifespan and efficiency.'}
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              Motors and transformers are highly sensitive to harmonics. The extra frequency components cause additional losses, vibration, noise, and <strong>significant overheating</strong> that can reduce equipment lifespan by 50% or more.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Harmonics Cause Problems
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Motor</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Motor Heating (15-25% extra)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Harmonics (3rd, 5th, 7th...) induce currents in the rotor that create heat without producing useful torque. The motor's cooling system isn't designed for this extra heat, causing insulation breakdown.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Transformer</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Transformer Losses (49x for 7th harmonic)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Eddy current losses scale with frequency squared. The 7th harmonic (420Hz on a 60Hz system) causes 49x more eddy current loss than the fundamental! This leads to severe overheating.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Electronics</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Electronic Interference</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Switching power supplies may malfunction, produce audible noise, or have reduced lifespan. Sensitive equipment like medical devices and audio systems require pure sine wave power.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Check</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Solution: Pure Sine Inverters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Pure sine wave inverters with THD under 5% eliminate these problems. The extra cost ($200-500 more) is far less than replacing damaged motors or shortened equipment lifespan.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
          </p>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    Check
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Connection to What You Learned:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for each application */}
            {!completedApps[selectedApp] ? (
              <button
                onClick={() => {
                  playSound('success');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Got It
              </button>
            ) : (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <span style={{ color: colors.success, fontWeight: 600 }}>
                  Completed - {selectedApp < realWorldApps.length - 1 ? 'Select another application above' : 'All applications explored!'}
                </span>
              </div>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '80px 24px 24px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? 'Trophy' : 'Book'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand inverter technology and power quality!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
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
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 24px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
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
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
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

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
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
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
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
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
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

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 24px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          Trophy
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Inverter Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how inverters synthesize clean AC power from DC - the technology powering solar energy, electric vehicles, and modern power systems.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'H-bridge switching creates alternating polarity',
              'PWM modulation synthesizes sine waves',
              'LC filtering removes switching harmonics',
              'THD measures waveform quality',
              'Harmonics cause motor overheating',
              'Grid-tie requires <5% THD',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>Check</span>
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default InverterSineWaveRenderer;
