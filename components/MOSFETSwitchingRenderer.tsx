'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

// Real-world applications for MOSFET switching
const realWorldApps = [
  {
    icon: '⚡',
    title: 'Power Conversion Systems',
    short: 'Switching power supplies everywhere',
    tagline: 'Billions of transistors switching trillions of watts',
    description: 'Every laptop charger, phone charger, and data center power supply uses MOSFET switching to efficiently convert voltage levels. The switching frequency, rise/fall times, and losses you explored determine whether power supplies run cool or hot.',
    connection: 'The game showed how gate drive affects switching speed and losses. In real power supplies, MOSFET switching at 100kHz-1MHz converts AC to DC efficiently. The same Cgs charging dynamics determine switching loss.',
    howItWorks: 'MOSFETs switch on/off at high frequency (100kHz+). PWM duty cycle controls output voltage. Faster switching allows smaller inductors/capacitors. Switching losses (Coss, gate charge) limit frequency. GaN/SiC enable MHz operation.',
    stats: [
      { value: '95%', label: 'Modern PSU efficiency', icon: '⚡' },
      { value: '1MHz', label: 'GaN switching frequency', icon: '📊' },
      { value: '$50B', label: 'Power electronics market', icon: '📈' }
    ],
    examples: ['USB-C chargers', 'Server PSUs', 'EV onboard chargers', 'Solar inverters'],
    companies: ['Texas Instruments', 'Infineon', 'ON Semiconductor', 'GaN Systems'],
    futureImpact: 'GaN and SiC MOSFETs will enable 99% efficient power conversion, cutting data center energy waste in half.',
    color: '#f59e0b'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Inverters',
    short: 'MOSFETs driving motors at 400V',
    tagline: 'From battery to torque in microseconds',
    description: 'EV powertrains use MOSFET/IGBT inverters to convert battery DC to 3-phase AC for the motor. The same gate drive and switching dynamics determine motor efficiency, torque response, and driving range.',
    connection: 'The simulation showed switching transitions and losses. EV inverters switch at 10-20kHz, with each transition following the same gate charge, dead time, and loss mechanisms. Faster switching means smoother motor control.',
    howItWorks: 'Six MOSFETs/IGBTs form 3-phase bridge. PWM creates sinusoidal current in motor windings. Dead time prevents shoot-through (both switches on). Switching losses generate heat requiring cooling. SiC enables higher frequency and efficiency.',
    stats: [
      { value: '300kW', label: 'Peak inverter power', icon: '⚡' },
      { value: '97%', label: 'Inverter efficiency', icon: '📊' },
      { value: '$20B', label: 'EV power electronics', icon: '📈' }
    ],
    examples: ['Tesla Model S/3/X/Y', 'Porsche Taycan', 'Rivian R1T', 'Lucid Air'],
    companies: ['Tesla', 'BYD', 'Bosch', 'Denso'],
    futureImpact: '800V SiC inverters will enable 350kW charging and 400+ mile ranges in mainstream EVs.',
    color: '#22c55e'
  },
  {
    icon: '💻',
    title: 'CPU Voltage Regulators',
    short: 'Millions of switching cycles per second',
    tagline: 'Powering processors one nanosecond at a time',
    description: 'Modern CPUs require precise voltage (1V) at extreme currents (200A) that change in nanoseconds. Voltage regulator modules (VRMs) use banks of MOSFETs switching at MHz rates, with the same gate drive challenges explored in the game.',
    connection: 'The game\'s focus on gate charge and switching speed applies directly to VRMs. Each phase switches at 500kHz-2MHz, and gate driver strength determines how fast the MOSFET can respond to CPU load changes.',
    howItWorks: 'Multi-phase VRM with 12-20 MOSFET pairs. High-side and low-side switch alternately. Rapid switching enables fast load response. Gate drivers must charge Cgs in nanoseconds. Thermal management critical for 200A+ delivery.',
    stats: [
      { value: '200A', label: 'CPU current demand', icon: '⚡' },
      { value: '2MHz', label: 'Per-phase switching', icon: '📊' },
      { value: '<1%', label: 'Voltage tolerance', icon: '🎯' }
    ],
    examples: ['Intel desktop VRMs', 'AMD Ryzen motherboards', 'Laptop power delivery', 'GPU power stages'],
    companies: ['Renesas', 'Monolithic Power', 'Infineon', 'Texas Instruments'],
    futureImpact: 'GaN-based VRMs will triple power density, enabling thinner laptops with desktop-class performance.',
    color: '#3b82f6'
  },
  {
    icon: '🔊',
    title: 'Class D Audio Amplifiers',
    short: 'High-fidelity sound from switching transistors',
    tagline: 'Digital efficiency, analog quality',
    description: 'Class D amplifiers achieve 90%+ efficiency by using MOSFETs as switches rather than linear amplifiers. PWM encodes the audio signal, and the same switching dynamics explored in the game determine distortion and audio quality.',
    connection: 'The simulation showed how switching transitions create losses. In Class D, switching speed determines how accurately the PWM waveform represents the audio signal. Faster transitions mean lower distortion.',
    howItWorks: 'Audio signal modulates PWM duty cycle. MOSFETs switch at 400kHz-2MHz. LC filter recovers analog audio. Dead time causes crossover distortion. Feedback corrects errors. Switching noise must stay above audio band.',
    stats: [
      { value: '95%', label: 'Amplifier efficiency', icon: '⚡' },
      { value: '0.01%', label: 'THD achievable', icon: '📊' },
      { value: '$5B', label: 'Audio amplifier market', icon: '📈' }
    ],
    examples: ['Smartphone speakers', 'Bluetooth speakers', 'Car audio', 'PA systems'],
    companies: ['Texas Instruments', 'Cirrus Logic', 'Qualcomm', 'Analog Devices'],
    futureImpact: 'GaN Class D amplifiers will enable 1000W home theater systems that run cool without fans.',
    color: '#8b5cf6'
  }
];

type MOSFETPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface MOSFETSwitchingRendererProps {
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  chip: '#6366f1',
  power: '#ef4444',
  gate: '#22c55e',
};

const phaseOrder: MOSFETPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<MOSFETPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Explain',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const MOSFETSwitchingRenderer: React.FC<MOSFETSwitchingRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): MOSFETPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as MOSFETPhase)) {
      return gamePhase as MOSFETPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<MOSFETPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with external gamePhase if provided (for resume)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as MOSFETPhase)) {
      setPhase(gamePhase as MOSFETPhase);
    }
  }, [gamePhase]);

  // Detect mobile
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

  // Navigation functions
  const goToPhase = useCallback((newPhase: MOSFETPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(newPhase);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [switchingFrequency, setSwitchingFrequency] = useState(100); // MHz
  const [gateCharge, setGateCharge] = useState(10); // nC
  const [supplyVoltage, setSupplyVoltage] = useState(5); // V
  const [loadCurrent, setLoadCurrent] = useState(1); // A
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(t => (t + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Physics calculations
  const calculateLosses = useCallback(() => {
    // Gate charge loss: P_gate = Qg * Vg * f
    const gateDriverLoss = gateCharge * 1e-9 * supplyVoltage * switchingFrequency * 1e6; // Watts

    // Switching loss approximation: P_sw = 0.5 * V * I * (tr + tf) * f
    // Assume tr + tf ~ 20ns for typical MOSFET
    const riseAndFallTime = 20e-9; // 20ns
    const switchingLoss = 0.5 * supplyVoltage * loadCurrent * riseAndFallTime * switchingFrequency * 1e6;

    // Conduction loss (when fully on): P_cond = I^2 * Rds_on
    // Assume Rds_on ~ 10 mohm
    const rdsOn = 0.01; // 10 mohm
    const conductionLoss = loadCurrent * loadCurrent * rdsOn * 0.5; // 50% duty cycle

    // Total loss
    const totalLoss = gateDriverLoss + switchingLoss + conductionLoss;

    // Efficiency (assuming 10W load)
    const loadPower = 10; // W
    const efficiency = (loadPower / (loadPower + totalLoss)) * 100;

    return {
      gateDriverLoss: gateDriverLoss * 1000, // mW
      switchingLoss: switchingLoss * 1000, // mW
      conductionLoss: conductionLoss * 1000, // mW
      totalLoss: totalLoss * 1000, // mW
      efficiency,
    };
  }, [switchingFrequency, gateCharge, supplyVoltage, loadCurrent]);

  const predictions = [
    { id: 'conduction', label: 'Mostly conduction losses - heat from current flowing through resistance' },
    { id: 'switching', label: 'Mostly switching losses - heat from rapid on/off transitions' },
    { id: 'leakage', label: 'Mostly leakage losses - current sneaking through when "off"' },
    { id: 'capacitive', label: 'Mostly capacitive losses - charging/discharging internal capacitors' },
  ];

  const twistPredictions = [
    { id: 'always_faster', label: 'Higher frequency is always better - smaller components, faster response' },
    { id: 'balance', label: 'There is an optimal frequency - balancing switching losses vs component size' },
    { id: 'always_slower', label: 'Lower frequency is always better - less switching means less loss' },
    { id: 'irrelevant', label: 'Frequency does not matter - losses stay the same regardless' },
  ];

  const transferApplications = [
    {
      title: 'CPU Voltage Regulators (VRM)',
      description: 'Modern CPUs need hundreds of amps at very low voltages (< 1V). Voltage regulator modules switch at MHz frequencies to respond quickly to load changes.',
      question: 'Why do CPU VRMs use such high switching frequencies despite increased losses?',
      answer: 'Higher frequencies allow smaller inductors and faster response to rapid CPU power demands. Without fast regulation, voltage would droop during sudden current spikes, causing crashes or errors.',
    },
    {
      title: 'Electric Vehicle Inverters',
      description: 'EV motor controllers convert DC battery power to AC for the motors. Switching losses at high power levels create significant heat.',
      question: 'Why do EVs use silicon carbide (SiC) MOSFETs instead of regular silicon?',
      answer: 'SiC MOSFETs have lower switching losses and can operate at higher temperatures. This allows higher switching frequencies for smoother motor control while reducing cooling requirements.',
    },
    {
      title: 'Phone Chargers',
      description: 'GaN (Gallium Nitride) chargers can be much smaller than silicon-based chargers at the same power level.',
      question: 'How does GaN technology enable smaller, cooler chargers?',
      answer: 'GaN transistors switch faster with lower losses than silicon. Higher switching frequencies mean smaller transformers and capacitors. Lower losses mean less heat and no need for large heatsinks.',
    },
    {
      title: 'Data Center Power Supplies',
      description: 'Data centers consume megawatts of power. Even 1% efficiency improvement saves enormous amounts of energy and cooling.',
      question: 'Why is switching efficiency so critical in data centers?',
      answer: 'With megawatts of power, 1% loss means tens of kilowatts of heat. This heat requires additional cooling power. Improving switching efficiency from 95% to 96% can save millions of dollars annually.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes switching losses in a MOSFET?',
      options: [
        { text: 'Resistance when fully turned on', correct: false },
        { text: 'Energy lost during the transition between on and off states', correct: true },
        { text: 'Leakage current when turned off', correct: false },
        { text: 'Magnetic field energy in the package', correct: false },
      ],
    },
    {
      question: 'If you double the switching frequency, what happens to switching losses?',
      options: [
        { text: 'They stay the same', correct: false },
        { text: 'They approximately double', correct: true },
        { text: 'They decrease by half', correct: false },
        { text: 'They quadruple', correct: false },
      ],
    },
    {
      question: 'Gate charge (Qg) losses are important because:',
      options: [
        { text: 'The gate stores energy that is lost each switching cycle', correct: true },
        { text: 'Gate current causes significant voltage drop', correct: false },
        { text: 'The gate heats up from resistance', correct: false },
        { text: 'Gate charge affects the output voltage', correct: false },
      ],
    },
    {
      question: 'Why do faster-switching MOSFETs often have lower gate charge?',
      options: [
        { text: 'They use different semiconductor materials', correct: false },
        { text: 'Smaller gate capacitance means less charge needed, enabling faster switching', correct: true },
        { text: 'The package is designed differently', correct: false },
        { text: 'They operate at lower voltages', correct: false },
      ],
    },
    {
      question: 'During the switching transition, why is there significant power loss?',
      options: [
        { text: 'The MOSFET is partially conducting with high voltage across it', correct: true },
        { text: 'The gate driver consumes maximum power', correct: false },
        { text: 'Inductors release stored energy', correct: false },
        { text: 'Capacitors discharge through the load', correct: false },
      ],
    },
    {
      question: 'What is the overlap loss region?',
      options: [
        { text: 'When two MOSFETs conduct simultaneously', correct: false },
        { text: 'The time when both high voltage AND high current exist in the switch', correct: true },
        { text: 'When input and output voltages are equal', correct: false },
        { text: 'The overlap between switching cycles', correct: false },
      ],
    },
    {
      question: 'Silicon carbide (SiC) MOSFETs reduce switching losses because:',
      options: [
        { text: 'They have lower on-resistance', correct: false },
        { text: 'They can switch faster with lower gate charge', correct: true },
        { text: 'They operate at lower voltages', correct: false },
        { text: 'They have higher thermal resistance', correct: false },
      ],
    },
    {
      question: 'Why might a designer choose a lower switching frequency?',
      options: [
        { text: 'To reduce switching losses when they dominate', correct: true },
        { text: 'To increase output power', correct: false },
        { text: 'To reduce the size of passive components', correct: false },
        { text: 'To improve transient response', correct: false },
      ],
    },
    {
      question: 'In a synchronous buck converter, dead time is important because:',
      options: [
        { text: 'It allows the inductor to fully charge', correct: false },
        { text: 'It prevents both MOSFETs from conducting simultaneously (shoot-through)', correct: true },
        { text: 'It reduces switching frequency', correct: false },
        { text: 'It increases efficiency at light loads', correct: false },
      ],
    },
    {
      question: 'As MOSFET technology improves, switching losses decrease primarily due to:',
      options: [
        { text: 'Better thermal management', correct: false },
        { text: 'Faster switching speeds and lower parasitic capacitances', correct: true },
        { text: 'Higher operating voltages', correct: false },
        { text: 'Larger die sizes', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const losses = calculateLosses();
    const width = 400;
    const height = 350;

    // MOSFET switching waveform visualization
    const phaseAngle = (animationTime / 360) * 2 * Math.PI;
    const switchState = Math.sin(phaseAngle * switchingFrequency / 10) > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="mosfetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.chip} />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="heatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            MOSFET Switching Losses
          </text>

          {/* MOSFET Symbol */}
          <g transform="translate(50, 60)">
            {/* Gate */}
            <line x1={0} y1={40} x2={20} y2={40} stroke={colors.gate} strokeWidth={3} />
            <line x1={20} y1={20} x2={20} y2={60} stroke={colors.gate} strokeWidth={2} />

            {/* Channel */}
            <line x1={30} y1={20} x2={30} y2={60} stroke={colors.textPrimary} strokeWidth={2} />

            {/* Drain */}
            <line x1={30} y1={20} x2={60} y2={20} stroke={colors.textPrimary} strokeWidth={2} />
            <line x1={60} y1={0} x2={60} y2={20} stroke={colors.textPrimary} strokeWidth={2} />
            <text x={70} y={10} fill={colors.textMuted} fontSize={10}>D</text>

            {/* Source */}
            <line x1={30} y1={60} x2={60} y2={60} stroke={colors.textPrimary} strokeWidth={2} />
            <line x1={60} y1={60} x2={60} y2={80} stroke={colors.textPrimary} strokeWidth={2} />
            <text x={70} y={70} fill={colors.textMuted} fontSize={10}>S</text>

            {/* Gate label */}
            <text x={-5} y={44} fill={colors.textMuted} fontSize={10} textAnchor="end">G</text>

            {/* On/Off indicator */}
            <circle cx={45} cy={40} r={8} fill={switchState ? colors.success : colors.error} opacity={0.8}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Waveforms */}
          <g transform="translate(150, 50)">
            {/* Vds waveform */}
            <text x={0} y={0} fill={colors.accent} fontSize={10}>Vds (Drain-Source Voltage)</text>
            <rect x={0} y={5} width={200} height={40} fill="rgba(0,0,0,0.3)" rx={4} />
            <path
              d={`M 5 ${switchState ? 40 : 15} L 50 ${switchState ? 40 : 15} L 55 ${switchState ? 15 : 40} L 100 ${switchState ? 15 : 40} L 105 ${switchState ? 40 : 15} L 150 ${switchState ? 40 : 15} L 155 ${switchState ? 15 : 40} L 195 ${switchState ? 15 : 40}`}
              stroke={colors.accent}
              strokeWidth={2}
              fill="none"
            />

            {/* Id waveform */}
            <text x={0} y={60} fill={colors.success} fontSize={10}>Id (Drain Current)</text>
            <rect x={0} y={65} width={200} height={40} fill="rgba(0,0,0,0.3)" rx={4} />
            <path
              d={`M 5 ${switchState ? 75 : 100} L 50 ${switchState ? 75 : 100} L 55 ${switchState ? 100 : 75} L 100 ${switchState ? 100 : 75} L 105 ${switchState ? 75 : 100} L 150 ${switchState ? 75 : 100} L 155 ${switchState ? 100 : 75} L 195 ${switchState ? 100 : 75}`}
              stroke={colors.success}
              strokeWidth={2}
              fill="none"
            />

            {/* Power loss indication */}
            <text x={0} y={120} fill={colors.error} fontSize={10}>Power Loss (V x I overlap)</text>
            <rect x={0} y={125} width={200} height={40} fill="rgba(0,0,0,0.3)" rx={4} />
            {/* Spikes at transitions */}
            <path
              d="M 52 160 L 55 130 L 58 160 M 102 160 L 105 130 L 108 160 M 152 160 L 155 130 L 158 160"
              stroke={colors.error}
              strokeWidth={2}
              fill="none"
            />
          </g>

          {/* Loss breakdown */}
          <g transform="translate(20, 220)">
            <text x={0} y={0} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Power Losses:</text>

            <rect x={0} y={10} width={360} height={20} fill="rgba(0,0,0,0.3)" rx={4} />

            {/* Stacked bar for losses */}
            {(() => {
              const total = losses.totalLoss || 1;
              const switchWidth = (losses.switchingLoss / total) * 340;
              const gateWidth = (losses.gateDriverLoss / total) * 340;
              const condWidth = (losses.conductionLoss / total) * 340;

              return (
                <>
                  <rect x={10} y={12} width={switchWidth} height={16} fill={colors.error} rx={2} />
                  <rect x={10 + switchWidth} y={12} width={gateWidth} height={16} fill={colors.accent} rx={2} />
                  <rect x={10 + switchWidth + gateWidth} y={12} width={condWidth} height={16} fill={colors.chip} rx={2} />
                </>
              );
            })()}

            {/* Legend */}
            <g transform="translate(0, 40)">
              <rect x={0} y={0} width={12} height={12} fill={colors.error} rx={2} />
              <text x={18} y={10} fill={colors.textSecondary} fontSize={10}>Switching: {losses.switchingLoss.toFixed(1)} mW</text>

              <rect x={130} y={0} width={12} height={12} fill={colors.accent} rx={2} />
              <text x={148} y={10} fill={colors.textSecondary} fontSize={10}>Gate: {losses.gateDriverLoss.toFixed(1)} mW</text>

              <rect x={250} y={0} width={12} height={12} fill={colors.chip} rx={2} />
              <text x={268} y={10} fill={colors.textSecondary} fontSize={10}>Cond: {losses.conductionLoss.toFixed(1)} mW</text>
            </g>

            {/* Total and efficiency */}
            <text x={0} y={70} fill={colors.textPrimary} fontSize={12} fontWeight="bold">
              Total Loss: {losses.totalLoss.toFixed(1)} mW | Efficiency: {losses.efficiency.toFixed(1)}%
            </text>
          </g>

          {/* Frequency indicator */}
          <text x={width/2} y={height - 10} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Switching at {switchingFrequency} MHz
          </text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Switching Frequency: {switchingFrequency} MHz
        </label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={switchingFrequency}
          onChange={(e) => setSwitchingFrequency(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Gate Charge (Qg): {gateCharge} nC
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={gateCharge}
          onChange={(e) => setGateCharge(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Supply Voltage: {supplyVoltage} V
        </label>
        <input
          type="range"
          min="1"
          max="12"
          step="0.5"
          value={supplyVoltage}
          onChange={(e) => setSupplyVoltage(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Load Current: {loadCurrent} A
        </label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={loadCurrent}
          onChange={(e) => setLoadCurrent(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          P_switching proportional to f x V x I x t_transition
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Higher frequency = more transitions = more loss
        </div>
      </div>
    </div>
  );

  const buttonStyle = {
    WebkitTapHighlightColor: 'transparent' as const,
  };

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '6px' : '8px',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexWrap: 'wrap' as const,
    }}>
      {phaseOrder.map((p, index) => {
        const currentIndex = phaseOrder.indexOf(phase);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            style={{
              ...buttonStyle,
              width: isMobile ? '28px' : '32px',
              height: isMobile ? '28px' : '32px',
              borderRadius: '50%',
              border: 'none',
              background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.1)',
              color: isCompleted || isCurrent ? 'white' : colors.textMuted,
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );

  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={phase === 'hook'}
        style={{
          ...buttonStyle,
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: phase === 'hook' ? colors.textMuted : colors.textPrimary,
          fontWeight: 'bold',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          opacity: phase === 'hook' ? 0.5 : 1,
        }}
      >
        Back
      </button>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          ...buttonStyle,
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              MOSFET Switching Losses
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do fast chips run hot even when "idle"?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Modern processors contain billions of transistors switching billions of times per second.
                Even when doing "nothing," these switches are constantly flipping - and every flip wastes energy.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is why your laptop gets warm even when idle, and why phone chargers heat up.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Explore how switching frequency and gate charge affect power loss!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A MOSFET in a power supply switches on and off millions of times per second.
              Where does most of the wasted energy come from?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What causes the most power loss in high-frequency switching?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Switching Losses</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters to see how losses change
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Double the frequency - what happens to switching loss?</li>
              <li>Increase gate charge - how does gate driver loss change?</li>
              <li>Find the settings for highest efficiency</li>
              <li>Note how the loss breakdown shifts with frequency</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'switching';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              At high frequencies, switching losses dominate. Every time the MOSFET transitions,
              there is a brief moment when both high voltage AND high current exist simultaneously.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Switching Losses</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Overlap Loss:</strong> During switching,
                voltage falls while current rises (or vice versa). P = V x I is significant during this overlap.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Gate Charge:</strong> The gate capacitor
                must be charged and discharged every cycle. Energy = Qg x Vg, lost as heat.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Frequency Dependence:</strong> More cycles
                per second means more overlap events and more gate charging = more loss.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Formula:</strong> P_sw approximately equals
                0.5 x V x I x (tr + tf) x f, where f is frequency.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Higher frequency means more loss, but also enables smaller components...
            </p>
          </div>

          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Tradeoff:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Higher switching frequencies allow smaller inductors and capacitors (passive components).
              A 1MHz converter needs a much smaller inductor than a 100kHz converter.
              But higher frequency means more switching losses...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How should designers choose switching frequency?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Find the Optimal Frequency</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Balance efficiency against component size
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Inductor size proportional to 1/f. At 10x frequency, inductor can be 10x smaller.
              But switching loss proportional to f. The optimal point depends on application requirements!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'balance';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              There is always an optimal frequency that balances switching losses against component size.
              This is why different applications use different frequencies!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Engineering Tradeoff</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Low Frequency (10-100 kHz):</strong> Large
                inductors and capacitors, but very efficient. Used in high-power applications.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Medium Frequency (100 kHz - 1 MHz):</strong>
                Good balance for most applications. Common in laptop chargers.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>High Frequency (1-10 MHz):</strong> Tiny
                components but higher losses. Used when size matters most (phones, wearables).
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              MOSFET switching losses affect everything from phones to data centers
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ ...buttonStyle, padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand MOSFET switching losses!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ ...buttonStyle, padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left' as const, fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand MOSFET switching losses!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Switching losses occur during on/off transitions</li>
              <li>P_sw proportional to f x V x I x t_transition</li>
              <li>Gate charge losses scale with frequency</li>
              <li>Higher frequency allows smaller passives but more loss</li>
              <li>Optimal frequency depends on application requirements</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Advanced semiconductor materials like GaN and SiC are revolutionizing power electronics
              by enabling faster switching with lower losses. This is why modern phone chargers can be
              so small yet powerful - they can switch at MHz frequencies with minimal heat generation!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default MOSFETSwitchingRenderer;
