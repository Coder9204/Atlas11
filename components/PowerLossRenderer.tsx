import React, { useState, useEffect, useCallback } from 'react';

const realWorldApps = [
  {
    icon: '⚡',
    title: 'High-Voltage Transmission',
    short: 'Power grids use high voltage to minimize losses',
    tagline: 'Moving megawatts across continents',
    description: 'Power transmission lines carry electricity at 115-765 kV to minimize current and therefore I²R losses. Transformers step voltage up for transmission and down for distribution.',
    connection: 'Since Power = V × I, higher voltage means lower current for the same power. Since losses are I²R, halving current reduces losses by 75%.',
    howItWorks: 'Generator output at 11-25 kV is stepped up to transmission voltage. Multiple voltage steps occur before reaching homes at 120/240V. Each transformation has some loss.',
    stats: [
      { value: '765', label: 'kV max transmission', icon: '⚡' },
      { value: '5-6%', label: 'total grid loss', icon: '📉' },
      { value: '$400B', label: 'transmission market', icon: '📈' }
    ],
    examples: ['Interstate transmission lines', 'Offshore wind connections', 'HVDC links', 'Grid interconnections'],
    companies: ['National Grid', 'Duke Energy', 'ABB', 'Siemens Energy'],
    futureImpact: 'HVDC and superconducting cables will further reduce transmission losses for renewable energy integration.',
    color: '#F59E0B'
  },
  {
    icon: '🔌',
    title: 'USB Charging Cables',
    short: 'Cable quality affects charging speed',
    tagline: 'Not all cables are created equal',
    description: 'Cheap USB cables use thin 28 AWG wires that significantly drop voltage at high currents. Quality cables use 20-24 AWG wires to maintain voltage for fast charging.',
    connection: 'At 3A charging current, a thin wire might drop 0.5V or more, reducing charging power by 10%+ and causing the phone to reduce current.',
    howItWorks: 'Fast charging protocols require maintaining voltage within tight tolerances. Thick cables have lower resistance, ensuring the voltage at the phone stays high enough.',
    stats: [
      { value: '20 AWG', label: 'quality cable gauge', icon: '🔧' },
      { value: '100W', label: 'USB-PD max power', icon: '⚡' },
      { value: '<0.3Ω', label: 'good cable resistance', icon: '📊' }
    ],
    examples: ['Phone charging cables', 'Laptop USB-C chargers', 'Power bank cables', 'Car charger cables'],
    companies: ['Apple', 'Anker', 'Belkin', 'Samsung'],
    futureImpact: 'Gallium nitride chargers and cables with active electronics will optimize power delivery.',
    color: '#3B82F6'
  },
  {
    icon: '🔊',
    title: 'Speaker Wire Selection',
    short: 'Long runs need thick wire for full power',
    tagline: 'Every watt to the speaker',
    description: 'Speaker wire resistance creates a voltage divider with the speaker, wasting power as heat and potentially affecting sound quality. Longer runs require thicker gauge.',
    connection: 'An 8-ohm speaker with 1-ohm wire resistance loses 11% of power in the wire. Audiophiles use heavy gauge wire to minimize this loss.',
    howItWorks: 'The amplifier sees wire resistance in series with the speaker. This reduces damping factor and can cause frequency-dependent response changes.',
    stats: [
      { value: '12 AWG', label: 'long run gauge', icon: '🔧' },
      { value: '50ft', label: 'typical max run', icon: '📏' },
      { value: '<5%', label: 'acceptable loss', icon: '📊' }
    ],
    examples: ['Home theater systems', 'PA systems', 'Car audio', 'Studio monitors'],
    companies: ['Monster Cable', 'Blue Jeans Cable', 'AudioQuest', 'Monoprice'],
    futureImpact: 'Active speakers with built-in amplifiers eliminate long speaker wire runs entirely.',
    color: '#22C55E'
  },
  {
    icon: '🚗',
    title: 'EV Charging Cables',
    short: 'DC fast charging requires massive conductors',
    tagline: 'Megawatts through a cable',
    description: 'DC fast chargers deliver 350 kW or more at 400-800V. Even with high voltage, currents reach 500A, requiring liquid-cooled cables to prevent overheating.',
    connection: 'At 500A, even 1 milliohm of resistance generates 250W of heat. Liquid cooling removes this heat, allowing higher currents in manageable cable sizes.',
    howItWorks: 'Coolant flows through channels in the cable assembly, removing I²R heat. The cable can then use smaller conductors than air-cooled cables at the same current.',
    stats: [
      { value: '350', label: 'kW charging power', icon: '⚡' },
      { value: '500', label: 'A maximum current', icon: '🔥' },
      { value: '15min', label: '10-80% charge', icon: '⏱️' }
    ],
    examples: ['Tesla Superchargers', 'Electrify America', 'IONITY stations', 'ChargePoint DC'],
    companies: ['Tesla', 'ABB', 'Tritium', 'EVBox'],
    futureImpact: 'Megawatt charging for trucks will require even more advanced cooling and high-voltage architectures.',
    color: '#8B5CF6'
  }
];

interface PowerLossRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
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
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wireCopper: '#b87333',
  wireThin: '#cd7f32',
  battery: '#fbbf24',
  bulbOn: '#fef08a',
  bulbDim: '#854d0e',
  heat: '#ef4444',
};

// Wire gauge data (AWG to diameter in mm)
const wireGauges = [
  { awg: 10, diameter: 2.59, area: 5.26, label: '10 AWG (Thick)' },
  { awg: 14, diameter: 1.63, area: 2.08, label: '14 AWG (Medium)' },
  { awg: 18, diameter: 1.02, area: 0.82, label: '18 AWG (Thin)' },
  { awg: 22, diameter: 0.64, area: 0.32, label: '22 AWG (Very Thin)' },
];

// Resistivity of copper (ohm*mm^2/m)
const COPPER_RESISTIVITY = 0.0172;

const PowerLossRenderer: React.FC<PowerLossRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [wireLength, setWireLength] = useState(10); // meters
  const [gaugeIndex, setGaugeIndex] = useState(1); // Start with 14 AWG
  const [current, setCurrent] = useState(2); // Amps
  const [isCoiled, setIsCoiled] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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

  // Calculate resistance, power loss, voltage drop
  const gauge = wireGauges[gaugeIndex];
  const effectiveLength = isCoiled ? wireLength * 3 : wireLength; // Coiling triples effective length
  const resistance = (COPPER_RESISTIVITY * effectiveLength) / gauge.area;
  const powerLoss = current * current * resistance;
  const voltageDrop = current * resistance;
  const supplyVoltage = 12;
  const loadVoltage = Math.max(0, supplyVoltage - voltageDrop);
  const brightness = Math.max(0, Math.min(1, loadVoltage / supplyVoltage));

  // Animation for electron flow
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const predictions = [
    { id: 'same', label: 'The bulb will be just as bright - same battery, same power' },
    { id: 'brighter', label: 'The bulb will be brighter - longer wire carries more energy' },
    { id: 'dimmer', label: 'The bulb will be dimmer - the wire "uses up" some voltage' },
    { id: 'flicker', label: 'The bulb will flicker due to the long wire' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Coiling has no effect - same amount of copper' },
    { id: 'brighter', label: 'Coiling makes it brighter - magnetic field helps' },
    { id: 'dimmer', label: 'Coiling makes it even dimmer - more wire length to travel' },
    { id: 'heat', label: 'Coiling only makes the wire hotter, bulb stays the same' },
  ];

  const transferApplications = [
    {
      title: 'Power Grid Transmission',
      description: 'Power plants send electricity hundreds of miles through transmission lines. Why use high voltage (hundreds of thousands of volts)?',
      question: 'If power loss is I squared R, how does high voltage reduce losses over long distances?',
      answer: 'Power = Voltage x Current. For the same power, higher voltage means lower current. Since losses are I squared R, halving the current reduces losses by 4x! This is why transmission lines use 115kV-765kV.',
    },
    {
      title: 'USB Charging Cables',
      description: 'You may notice that cheap, thin USB cables charge your phone slower or not at all for power-hungry devices.',
      question: 'Why do high-quality USB cables use thicker wires inside?',
      answer: 'Thicker wires have lower resistance (R = rho*L/A). With 2-3 amps for fast charging, thin wires can drop enough voltage that the phone reduces charging current. Quality cables maintain voltage for full-speed charging.',
    },
    {
      title: 'Speaker Wires',
      description: 'Audiophiles debate speaker wire gauge. For a 100W speaker 50 feet from the amplifier, wire choice matters.',
      question: 'How does speaker wire resistance affect sound quality?',
      answer: 'Speaker wire resistance creates a voltage divider with the speaker. High resistance wastes power as heat and can cause frequency-dependent damping. Thick gauge (12-14 AWG) ensures <5% power loss for long runs.',
    },
    {
      title: 'EV Charging',
      description: 'Electric vehicle charging stations deliver 50-350 kW through thick cables. The cables are often liquid-cooled!',
      question: 'Why do DC fast chargers need such thick, cooled cables?',
      answer: 'At 500A (some chargers), even low-resistance cables generate massive heat (P = I squared R). A 0.001 ohm cable at 500A loses 250W as heat per meter! Thick copper and liquid cooling prevent fire and maintain efficiency.',
    },
  ];

  const testQuestions = [
    {
      question: 'The resistance of a wire depends on:',
      options: [
        { text: 'Length only', correct: false },
        { text: 'Cross-sectional area only', correct: false },
        { text: 'Both length and cross-sectional area', correct: true },
        { text: 'Only the material type', correct: false },
      ],
    },
    {
      question: 'If you double the length of a wire, its resistance:',
      options: [
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: true },
        { text: 'Halves', correct: false },
        { text: 'Quadruples', correct: false },
      ],
    },
    {
      question: 'If you double the cross-sectional area of a wire, its resistance:',
      options: [
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: false },
        { text: 'Halves', correct: true },
        { text: 'Quadruples', correct: false },
      ],
    },
    {
      question: 'Power loss in a wire is calculated as:',
      options: [
        { text: 'P = IR', correct: false },
        { text: 'P = V/R', correct: false },
        { text: 'P = I squared R', correct: true },
        { text: 'P = R/I', correct: false },
      ],
    },
    {
      question: 'If current doubles while resistance stays the same, power loss:',
      options: [
        { text: 'Doubles', correct: false },
        { text: 'Stays the same', correct: false },
        { text: 'Quadruples', correct: true },
        { text: 'Halves', correct: false },
      ],
    },
    {
      question: 'Why do power transmission lines use high voltage?',
      options: [
        { text: 'To increase the speed of electricity', correct: false },
        { text: 'To reduce current and thus I squared R losses', correct: true },
        { text: 'Because transformers only work at high voltage', correct: false },
        { text: 'To prevent lightning strikes', correct: false },
      ],
    },
    {
      question: 'A wire carrying 3A has resistance of 2 ohms. The power lost as heat is:',
      options: [
        { text: '6 watts', correct: false },
        { text: '9 watts', correct: false },
        { text: '18 watts', correct: true },
        { text: '1.5 watts', correct: false },
      ],
    },
    {
      question: 'Coiling a wire (without overlapping) affects its resistance by:',
      options: [
        { text: 'No effect - same amount of material', correct: false },
        { text: 'Increasing it - longer path for current', correct: true },
        { text: 'Decreasing it - magnetic field helps', correct: false },
        { text: 'Making it variable', correct: false },
      ],
    },
    {
      question: 'Why do phone charger cables get warm during fast charging?',
      options: [
        { text: 'The phone generates heat that travels up the cable', correct: false },
        { text: 'I squared R power loss in the cable resistance', correct: true },
        { text: 'Chemical reactions in the wire', correct: false },
        { text: 'Friction from moving electrons', correct: false },
      ],
    },
    {
      question: 'A 12V battery powers an LED through a long thin wire. The LED gets 9V. The wire has dropped:',
      options: [
        { text: '9 volts', correct: false },
        { text: '3 volts', correct: true },
        { text: '12 volts', correct: false },
        { text: '21 volts', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 400;

    // Wire thickness based on gauge
    const wireThickness = 3 + (10 - gaugeIndex * 2);
    const heatIntensity = Math.min(1, powerLoss / 15);
    const efficiency = (loadVoltage / supplyVoltage) * 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '700px' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium battery gradient with metallic depth */}
            <linearGradient id="plossBatteryBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Battery terminal gradient */}
            <linearGradient id="plossBatteryTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a1a1aa" />
              <stop offset="30%" stopColor="#71717a" />
              <stop offset="70%" stopColor="#52525b" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>

            {/* Copper wire gradient with realistic metallic sheen */}
            <linearGradient id="plossWireCopper" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc8c5a" />
              <stop offset="20%" stopColor="#cd7f32" />
              <stop offset="50%" stopColor="#b87333" />
              <stop offset="80%" stopColor="#a0522d" />
              <stop offset="100%" stopColor="#8b4513" />
            </linearGradient>

            {/* Wire heat gradient - dynamic based on power loss */}
            <linearGradient id="plossWireHeat" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b87333" />
              <stop offset="15%" stopColor={heatIntensity > 0.3 ? '#ef4444' : '#b87333'} stopOpacity={0.3 + heatIntensity * 0.7} />
              <stop offset="35%" stopColor={heatIntensity > 0.5 ? '#f97316' : '#cd7f32'} stopOpacity={0.5 + heatIntensity * 0.5} />
              <stop offset="50%" stopColor={heatIntensity > 0.7 ? '#fbbf24' : '#dc8c5a'} stopOpacity={heatIntensity} />
              <stop offset="65%" stopColor={heatIntensity > 0.5 ? '#f97316' : '#cd7f32'} stopOpacity={0.5 + heatIntensity * 0.5} />
              <stop offset="85%" stopColor={heatIntensity > 0.3 ? '#ef4444' : '#b87333'} stopOpacity={0.3 + heatIntensity * 0.7} />
              <stop offset="100%" stopColor="#b87333" />
            </linearGradient>

            {/* Heat radial gradient for hot spots */}
            <radialGradient id="plossHeatSpot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="30%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Energy flow gradient - cyan electrons */}
            <radialGradient id="plossElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* LED bulb glow gradient */}
            <radialGradient id="plossLEDGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity={brightness} />
              <stop offset="40%" stopColor="#fde047" stopOpacity={brightness * 0.7} />
              <stop offset="70%" stopColor="#facc15" stopOpacity={brightness * 0.4} />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* LED outer glow for bright states */}
            <radialGradient id="plossLEDOuterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity={brightness * 0.6} />
              <stop offset="50%" stopColor="#fef08a" stopOpacity={brightness * 0.3} />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
            </radialGradient>

            {/* Efficiency meter gradient - green to red */}
            <linearGradient id="plossEfficiencyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Premium dark background gradient */}
            <linearGradient id="plossLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Meter panel gradient */}
            <linearGradient id="plossMeterPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Power loss indicator gradient */}
            <linearGradient id="plossPowerLossBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset={`${Math.max(0, 100 - heatIntensity * 100)}%`} stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset={`${Math.max(0, 100 - heatIntensity * 100)}%`} stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
            </linearGradient>

            {/* Transmission tower gradient */}
            <linearGradient id="plossTowerMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="25%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="75%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Glow filter for electrons */}
            <filter id="plossElectronBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow filter for LED */}
            <filter id="plossLEDGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat shimmer filter */}
            <filter id="plossHeatShimmer" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow for meters */}
            <filter id="plossMeterGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="plossLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width={width} height={height} fill="url(#plossLabBg)" />
          <rect width={width} height={height} fill="url(#plossLabGrid)" />

          {/* === POWER STATION / BATTERY === */}
          <g transform="translate(30, 100)">
            {/* Battery housing */}
            <rect x="0" y="0" width="70" height="140" rx="8" fill="url(#plossBatteryBody)" stroke="#78350f" strokeWidth="2" />
            <rect x="5" y="5" width="60" height="130" rx="6" fill="#92400e" opacity="0.3" />

            {/* Battery positive terminal */}
            <rect x="22" y="-15" width="26" height="18" rx="4" fill="url(#plossBatteryTerminal)" stroke="#52525b" strokeWidth="1" />
            <text x="35" y="-2" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="bold">+</text>

            {/* Battery negative terminal */}
            <rect x="22" y="137" width="26" height="18" rx="4" fill="url(#plossBatteryTerminal)" stroke="#52525b" strokeWidth="1" />
            <text x="35" y="150" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="bold">-</text>

            {/* Voltage label */}
            <rect x="10" y="55" width="50" height="30" rx="4" fill="#78350f" />
            <text x="35" y="75" textAnchor="middle" fill="#fef3c7" fontSize="14" fontWeight="bold">12V</text>

            {/* Power indicator */}
            <circle cx="35" cy="110" r="8" fill="#22c55e" opacity="0.8">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x="35" y="130" textAnchor="middle" fill="#fef3c7" fontSize="8">POWER</text>

            {/* Label */}
            <text x="35" y="-30" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">POWER SOURCE</text>
          </g>

          {/* === TRANSMISSION PATH WITH POWER LOSS INDICATORS === */}
          <g>
            {/* Connection from battery */}
            <line x1="100" y1="100" x2="130" y2="100" stroke="url(#plossWireCopper)" strokeWidth={wireThickness} strokeLinecap="round" />
            <line x1="100" y1="240" x2="130" y2="240" stroke="url(#plossWireCopper)" strokeWidth={wireThickness} strokeLinecap="round" />

            {/* Main transmission line - top (with heat) */}
            {isCoiled ? (
              <g>
                <path
                  d={`M 130 100
                      Q 180 50, 230 100 Q 280 150, 330 100 Q 380 50, 430 100
                      Q 480 150, 530 100 L 560 100`}
                  fill="none"
                  stroke="url(#plossWireHeat)"
                  strokeWidth={wireThickness}
                  strokeLinecap="round"
                  filter={heatIntensity > 0.5 ? "url(#plossHeatShimmer)" : undefined}
                />
                {/* Electron flow animation for coiled */}
                {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
                  <circle
                    key={i}
                    r={4}
                    fill="url(#plossElectronGlow)"
                    filter="url(#plossElectronBlur)"
                  >
                    <animateMotion
                      dur={`${2.5 - current * 0.1}s`}
                      repeatCount="indefinite"
                      begin={`${offset}s`}
                      path="M 130 100 Q 180 50, 230 100 Q 280 150, 330 100 Q 380 50, 430 100 Q 480 150, 530 100 L 560 100"
                    />
                  </circle>
                ))}
              </g>
            ) : (
              <g>
                <line
                  x1={130}
                  y1={100}
                  x2={560}
                  y2={100}
                  stroke="url(#plossWireHeat)"
                  strokeWidth={wireThickness}
                  strokeLinecap="round"
                  filter={heatIntensity > 0.5 ? "url(#plossHeatShimmer)" : undefined}
                />
                {/* Electron flow animation */}
                {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
                  <circle
                    key={i}
                    cx={130 + ((animationFrame / 100 + offset) % 1) * 430}
                    cy={100}
                    r={4}
                    fill="url(#plossElectronGlow)"
                    filter="url(#plossElectronBlur)"
                  />
                ))}
              </g>
            )}

            {/* Power loss indicators along transmission path */}
            {powerLoss > 0.5 && (
              <g>
                {[200, 300, 400, 500].map((x, i) => {
                  const lossAtPoint = (powerLoss / 4) * (i + 1) / 4;
                  const showIndicator = lossAtPoint > 0.2;
                  return showIndicator ? (
                    <g key={i} transform={`translate(${x}, ${isCoiled ? (i % 2 === 0 ? 75 : 125) : 75})`}>
                      {/* Heat wave indicator */}
                      <ellipse cx="0" cy="0" rx={8 + lossAtPoint * 5} ry={12 + lossAtPoint * 8} fill="url(#plossHeatSpot)" opacity={heatIntensity * 0.6}>
                        <animate attributeName="ry" values={`${12 + lossAtPoint * 8};${18 + lossAtPoint * 10};${12 + lossAtPoint * 8}`} dur="0.8s" repeatCount="indefinite" />
                      </ellipse>
                      {/* Loss value */}
                      <text y={-25} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">
                        -{(powerLoss / 4).toFixed(1)}W
                      </text>
                    </g>
                  ) : null;
                })}
              </g>
            )}

            {/* Bottom return wire */}
            <line x1={130} y1={240} x2={560} y2={240} stroke="url(#plossWireCopper)" strokeWidth={wireThickness} strokeLinecap="round" />
          </g>

          {/* === LED LOAD === */}
          <g transform="translate(590, 170)">
            {/* LED outer glow when bright */}
            {brightness > 0.3 && (
              <circle cx="0" cy="0" r={50} fill="url(#plossLEDOuterGlow)" filter="url(#plossLEDGlowFilter)" />
            )}

            {/* LED housing */}
            <ellipse cx="0" cy="0" rx="35" ry="40" fill="#1e293b" stroke="#475569" strokeWidth="2" />

            {/* LED dome */}
            <ellipse cx="0" cy="-5" rx="28" ry="32" fill={`rgba(254, 240, 138, ${0.1 + brightness * 0.4})`} stroke={brightness > 0.5 ? '#fef08a' : '#854d0e'} strokeWidth="2" />

            {/* LED filament glow */}
            <ellipse cx="0" cy="0" rx="18" ry="22" fill="url(#plossLEDGlow)" filter={brightness > 0.5 ? "url(#plossLEDGlowFilter)" : undefined} />

            {/* Light rays when bright */}
            {brightness > 0.4 && (
              <g>
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                  <line
                    key={angle}
                    x1={Math.cos((angle * Math.PI) / 180) * 38}
                    y1={Math.sin((angle * Math.PI) / 180) * 42}
                    x2={Math.cos((angle * Math.PI) / 180) * (45 + brightness * 15)}
                    y2={Math.sin((angle * Math.PI) / 180) * (50 + brightness * 15)}
                    stroke="#fef08a"
                    strokeWidth={1.5}
                    opacity={brightness * 0.7}
                  >
                    <animate attributeName="opacity" values={`${brightness * 0.5};${brightness * 0.8};${brightness * 0.5}`} dur="0.5s" repeatCount="indefinite" />
                  </line>
                ))}
              </g>
            )}

            {/* LED base */}
            <rect x="-15" y="35" width="30" height="20" rx="3" fill="#475569" stroke="#64748b" strokeWidth="1" />

            {/* Wire connections to LED */}
            <line x1="-30" y1="-70" x2="0" y2="-35" stroke="url(#plossWireCopper)" strokeWidth={wireThickness / 2} />
            <line x1="-30" y1="70" x2="0" y2="35" stroke="url(#plossWireCopper)" strokeWidth={wireThickness / 2} />

            {/* Labels */}
            <text x="0" y="70" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">LOAD</text>
            <text x="0" y="82" textAnchor="middle" fill={brightness > 0.5 ? '#22c55e' : '#ef4444'} fontSize="9">
              {brightness > 0.7 ? 'BRIGHT' : brightness > 0.4 ? 'DIM' : brightness > 0.1 ? 'VERY DIM' : 'OFF'}
            </text>
          </g>

          {/* Vertical connections */}
          <line x1="100" y1="100" x2="100" y2="240" stroke="url(#plossWireCopper)" strokeWidth={wireThickness} />
          <line x1="560" y1="100" x2="560" y2="240" stroke="url(#plossWireCopper)" strokeWidth={wireThickness} />

          {/* === EFFICIENCY METER === */}
          <g transform="translate(180, 280)">
            {/* Meter background panel */}
            <rect x="0" y="0" width="340" height="80" rx="10" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1.5" filter="url(#plossMeterGlow)" />

            {/* Meter title */}
            <text x="170" y="18" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">TRANSMISSION EFFICIENCY</text>

            {/* Efficiency bar background */}
            <rect x="20" y="28" width="300" height="20" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />

            {/* Efficiency bar fill with gradient */}
            <rect x="20" y="28" width={300 * (efficiency / 100)} height="20" rx="4" fill="url(#plossEfficiencyGrad)" opacity="0.9">
              <animate attributeName="opacity" values="0.7;0.95;0.7" dur="2s" repeatCount="indefinite" />
            </rect>

            {/* Efficiency percentage markers */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <g key={pct}>
                <line x1={20 + pct * 3} y1="48" x2={20 + pct * 3} y2="52" stroke="#64748b" strokeWidth="1" />
                <text x={20 + pct * 3} y="62" textAnchor="middle" fill="#64748b" fontSize="8">{pct}%</text>
              </g>
            ))}

            {/* Current efficiency value */}
            <text x="170" y="75" textAnchor="middle" fill={efficiency > 70 ? '#22c55e' : efficiency > 40 ? '#f59e0b' : '#ef4444'} fontSize="14" fontWeight="bold">
              {efficiency.toFixed(1)}% Efficient
            </text>

            {/* Power flow indicators */}
            <g transform="translate(20, 28)">
              <text x="-15" y="14" textAnchor="end" fill="#22c55e" fontSize="8">IN</text>
              <text x="315" y="14" textAnchor="start" fill={efficiency > 50 ? '#22c55e' : '#ef4444'} fontSize="8">OUT</text>
            </g>
          </g>

          {/* === DATA READOUTS === */}
          {/* Voltage at load */}
          <g transform="translate(550, 20)">
            <rect x="0" y="0" width="120" height="50" rx="6" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1" />
            <text x="60" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8" letterSpacing="0.5">LOAD VOLTAGE</text>
            <text x="60" y="38" textAnchor="middle" fill={loadVoltage > 9 ? '#22c55e' : loadVoltage > 6 ? '#f59e0b' : '#ef4444'} fontSize="18" fontWeight="bold">
              {loadVoltage.toFixed(2)}V
            </text>
          </g>

          {/* Power loss readout */}
          <g transform="translate(30, 280)">
            <rect x="0" y="0" width="130" height="80" rx="6" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1" />
            <text x="65" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8" letterSpacing="0.5">POWER LOSS</text>
            <text x="65" y="42" textAnchor="middle" fill="#ef4444" fontSize="20" fontWeight="bold">
              {powerLoss.toFixed(2)}W
            </text>
            <text x="65" y="58" textAnchor="middle" fill="#f97316" fontSize="9">
              as HEAT
            </text>
            {/* Heat icon */}
            {powerLoss > 2 && (
              <g transform="translate(65, 70)">
                <text textAnchor="middle" fill="#ef4444" fontSize="10">
                  {powerLoss > 10 ? 'HOT!' : powerLoss > 5 ? 'WARM' : '~'}
                </text>
              </g>
            )}
          </g>

          {/* Wire specs readout */}
          <g transform="translate(30, 20)">
            <rect x="0" y="0" width="180" height="60" rx="6" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1" />
            <text x="90" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8" letterSpacing="0.5">WIRE SPECIFICATIONS</text>
            <text x="90" y="32" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="bold">{gauge.label}</text>
            <text x="90" y="48" textAnchor="middle" fill="#64748b" fontSize="9">
              {effectiveLength}m | R = {resistance.toFixed(4)}Ω
            </text>
          </g>

          {/* Current flow indicator */}
          <g transform="translate(230, 20)">
            <rect x="0" y="0" width="100" height="50" rx="6" fill="url(#plossMeterPanel)" stroke="#8b5cf6" strokeWidth="1.5" />
            <text x="50" y="15" textAnchor="middle" fill="#94a3b8" fontSize="8" letterSpacing="0.5">CURRENT</text>
            <text x="50" y="38" textAnchor="middle" fill="#8b5cf6" fontSize="18" fontWeight="bold">
              {current.toFixed(1)}A
            </text>
          </g>

          {/* Coiled indicator */}
          {isCoiled && (
            <g transform="translate(350, 20)">
              <rect x="0" y="0" width="90" height="50" rx="6" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="45" y="15" textAnchor="middle" fill="#f59e0b" fontSize="8" letterSpacing="0.5">COILED</text>
              <text x="45" y="35" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">3x LENGTH</text>
              <text x="45" y="46" textAnchor="middle" fill="#fbbf24" fontSize="8">MORE LOSS!</text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '10px 20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>VOLTAGE DROP</div>
              <div style={{ color: colors.warning, fontSize: '18px', fontWeight: 'bold' }}>{voltageDrop.toFixed(2)}V</div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '10px 20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>POWER LOSS</div>
              <div style={{ color: colors.error, fontSize: '18px', fontWeight: 'bold' }}>{powerLoss.toFixed(2)}W</div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '10px 20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>RESISTANCE</div>
              <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 'bold' }}>{resistance.toFixed(4)}Ω</div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '10px 20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: `1px solid ${efficiency > 70 ? 'rgba(34, 197, 94, 0.3)' : efficiency > 40 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>EFFICIENCY</div>
              <div style={{ color: efficiency > 70 ? colors.success : efficiency > 40 ? colors.warning : colors.error, fontSize: '18px', fontWeight: 'bold' }}>{efficiency.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Length: {wireLength}m {isCoiled && `(Effective: ${effectiveLength}m coiled)`}
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={wireLength}
          onChange={(e) => setWireLength(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Gauge: {gauge.label}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {wireGauges.map((g, i) => (
            <button
              key={g.awg}
              onClick={() => setGaugeIndex(i)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: gaugeIndex === i ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: gaugeIndex === i ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {g.awg} AWG
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Current: {current.toFixed(1)} A
        </label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={current}
          onChange={(e) => setCurrent(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Physics Equations:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace' }}>
          R = rho * L / A = {COPPER_RESISTIVITY} * {effectiveLength} / {gauge.area} = {resistance.toFixed(4)} ohm
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          P = I squared * R = {current.toFixed(1)} squared * {resistance.toFixed(4)} = {powerLoss.toFixed(3)} W
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          V_drop = I * R = {current.toFixed(1)} * {resistance.toFixed(4)} = {voltageDrop.toFixed(3)} V
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Power Loss in Wires
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Same battery - will a long thin wire dim a bulb?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Ever noticed phone charger cables getting warm? Or wondered why power lines
                use such thick wires? The answer lies in a simple equation that costs
                power companies billions of dollars a year.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Wires are not perfect conductors - they fight back.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try the controls: adjust wire length and gauge to see the effect on the LED!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A 12V battery connected to an LED through copper wire. The wire has some length
              and thickness (gauge). Current flows through the circuit, and we measure the
              voltage that actually reaches the LED.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you use a much longer, thinner wire, what happens to the LED brightness?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Wire Resistance</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust length, gauge, and current to see power loss in action
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Max out the length (50m) with thin wire - watch the LED dim!</li>
              <li>Switch to thick wire (10 AWG) - see the difference</li>
              <li>Increase current to 10A - feel the (virtual) heat</li>
              <li>Notice: doubling current quadruples power loss (I squared!)</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'dimmer';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
              The bulb dims because wire resistance "uses up" voltage before it reaches the load!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Wire Resistance</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resistance Formula:</strong> R = rho * L / A
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>rho = resistivity (material property, copper approx 0.017 ohm*mm squared/m)</li>
                <li>L = length (longer wire = more resistance)</li>
                <li>A = cross-sectional area (thicker wire = less resistance)</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Loss:</strong> P = I squared * R
              </p>
              <p style={{ marginBottom: '12px' }}>
                This is why current matters so much! Double the current means 4x the power
                wasted as heat. This energy comes from the source and never reaches your device.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Voltage Drop:</strong> V = I * R
              </p>
              <p>
                The wire acts like a voltage divider. The more resistance, the more voltage
                is "dropped" across the wire instead of powering your load.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you coil the thin wire into a tight bundle?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You have 10 meters of thin wire. Instead of running it straight, you coil it
              up so it fits in a small space. The coil is tight - the wire loops back and
              forth multiple times, effectively tripling the path length the current must travel.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does coiling affect the bulb brightness?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Coiling Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle coiling and observe the dramatic change
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px' }}>
            <button
              onClick={() => setIsCoiled(!isCoiled)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                background: isCoiled ? colors.warning : colors.accent,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
                marginBottom: '16px',
              }}
            >
              {isCoiled ? 'Uncoil Wire (Straight)' : 'Coil Wire (3x Path Length)'}
            </button>
          </div>

          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Coiling doesn't change the amount of copper, but it dramatically increases
              the path length! Current must travel through every loop, so resistance
              increases proportionally. This is why extension cords should be uncoiled
              when carrying high current - a coiled cord can overheat!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'dimmer';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
              Coiling makes the bulb even dimmer because the current must travel a longer path!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Coiling Matters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Path Length vs. Physical Length:</strong> Resistance
                depends on how far electrons must travel, not how compact the wire is.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Real-World Hazard:</strong> A coiled extension
                cord carrying high current can overheat and start fires! The heat from I squared R
                is concentrated in a small volume when coiled.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Positive Use:</strong> This principle is used
                in heating elements! Nichrome wire coiled tightly provides high resistance in
                a small space for toasters, hair dryers, and electric stoves.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Wire resistance affects everything from power grids to phone chargers
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Completed</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered power loss in wires!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand why long cables get warm</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>R = rho * L / A (resistance depends on length and area)</li>
              <li>P = I squared * R (power loss, why current matters so much)</li>
              <li>V = IR (voltage drop across wires)</li>
              <li>Why power transmission uses high voltage</li>
              <li>Practical implications for cables and cords</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This simple relationship - P = I squared R - is why Nikola Tesla's AC power won over Edison's
              DC. AC can be easily transformed to high voltage for efficient transmission, then
              stepped down for safe use. Without this, we'd need power plants every few miles!
              Today, HVDC (High Voltage DC) is making a comeback for very long distances where
              AC losses become significant.
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default PowerLossRenderer;
