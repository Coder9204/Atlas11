import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '\u26A1',
    title: 'High-Voltage Transmission',
    short: 'Power grids use high voltage to minimize losses',
    tagline: 'Moving megawatts across continents',
    description: 'Power transmission lines carry electricity at 115-765 kV to minimize current and therefore I\u00B2R losses. Transformers step voltage up for transmission and down for distribution.',
    connection: 'Since Power = V \u00D7 I, higher voltage means lower current for the same power. Since losses are I\u00B2R, halving current reduces losses by 75%.',
    howItWorks: 'Generator output at 11-25 kV is stepped up to transmission voltage. Multiple voltage steps occur before reaching homes at 120/240V. Each transformation has some loss.',
    stats: [
      { value: '765', label: 'kV max transmission', icon: '\u26A1' },
      { value: '5-6%', label: 'total grid loss', icon: '\uD83D\uDCC9' },
      { value: '$400B', label: 'transmission market', icon: '\uD83D\uDCC8' }
    ],
    examples: ['Interstate transmission lines', 'Offshore wind connections', 'HVDC links', 'Grid interconnections'],
    companies: ['National Grid', 'Duke Energy', 'ABB', 'Siemens Energy'],
    futureImpact: 'HVDC and superconducting cables will further reduce transmission losses for renewable energy integration.',
    color: '#F59E0B'
  },
  {
    icon: '\uD83D\uDD0C',
    title: 'USB Charging Cables',
    short: 'Cable quality affects charging speed',
    tagline: 'Not all cables are created equal',
    description: 'Cheap USB cables use thin 28 AWG wires that significantly drop voltage at high currents. Quality cables use 20-24 AWG wires to maintain voltage for fast charging.',
    connection: 'At 3A charging current, a thin wire might drop 0.5V or more, reducing charging power by 10%+ and causing the phone to reduce current.',
    howItWorks: 'Fast charging protocols require maintaining voltage within tight tolerances. Thick cables have lower resistance, ensuring the voltage at the phone stays high enough.',
    stats: [
      { value: '20 AWG', label: 'quality cable gauge', icon: '\uD83D\uDD27' },
      { value: '100W', label: 'USB-PD max power', icon: '\u26A1' },
      { value: '<0.3\u03A9', label: 'good cable resistance', icon: '\uD83D\uDCCA' }
    ],
    examples: ['Phone charging cables', 'Laptop USB-C chargers', 'Power bank cables', 'Car charger cables'],
    companies: ['Apple', 'Anker', 'Belkin', 'Samsung'],
    futureImpact: 'Gallium nitride chargers and cables with active electronics will optimize power delivery.',
    color: '#3B82F6'
  },
  {
    icon: '\uD83D\uDD0A',
    title: 'Speaker Wire Selection',
    short: 'Long runs need thick wire for full power',
    tagline: 'Every watt to the speaker',
    description: 'Speaker wire resistance creates a voltage divider with the speaker, wasting power as heat and potentially affecting sound quality. Longer runs require thicker gauge.',
    connection: 'An 8-ohm speaker with 1-ohm wire resistance loses 11% of power in the wire. Audiophiles use heavy gauge wire to minimize this loss.',
    howItWorks: 'The amplifier sees wire resistance in series with the speaker. This reduces damping factor and can cause frequency-dependent response changes.',
    stats: [
      { value: '12 AWG', label: 'long run gauge', icon: '\uD83D\uDD27' },
      { value: '50ft', label: 'typical max run', icon: '\uD83D\uDCCF' },
      { value: '<5%', label: 'acceptable loss', icon: '\uD83D\uDCCA' }
    ],
    examples: ['Home theater systems', 'PA systems', 'Car audio', 'Studio monitors'],
    companies: ['Monster Cable', 'Blue Jeans Cable', 'AudioQuest', 'Monoprice'],
    futureImpact: 'Active speakers with built-in amplifiers eliminate long speaker wire runs entirely.',
    color: '#22C55E'
  },
  {
    icon: '\uD83D\uDE97',
    title: 'EV Charging Cables',
    short: 'DC fast charging requires massive conductors',
    tagline: 'Megawatts through a cable',
    description: 'DC fast chargers deliver 350 kW or more at 400-800V. Even with high voltage, currents reach 500A, requiring liquid-cooled cables to prevent overheating.',
    connection: 'At 500A, even 1 milliohm of resistance generates 250W of heat. Liquid cooling removes this heat, allowing higher currents in manageable cable sizes.',
    howItWorks: 'Coolant flows through channels in the cable assembly, removing I\u00B2R heat. The cable can then use smaller conductors than air-cooled cables at the same current.',
    stats: [
      { value: '350', label: 'kW charging power', icon: '\u26A1' },
      { value: '500', label: 'A maximum current', icon: '\uD83D\uDD25' },
      { value: '15min', label: '10-80% charge', icon: '\u23F1\uFE0F' }
    ],
    examples: ['Tesla Superchargers', 'Electrify America', 'IONITY stations', 'ChargePoint DC'],
    companies: ['Tesla', 'ABB', 'Tritium', 'EVBox'],
    futureImpact: 'Megawatt charging for trucks will require even more advanced cooling and high-voltage architectures.',
    color: '#8B5CF6'
  }
];

interface PowerLossRendererProps {
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1',
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

const PHASE_ORDER: Array<'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery'> = [
  'hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'
];

const PowerLossRenderer: React.FC<PowerLossRendererProps> = ({
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase management - start at hook
  const [internalPhase, setInternalPhase] = useState<typeof PHASE_ORDER[number]>('hook');

  // Determine actual phase: prefer gamePhase prop, then phase prop, then internal state
  const getValidPhase = (p: string | undefined): typeof PHASE_ORDER[number] | null => {
    if (p && PHASE_ORDER.includes(p as typeof PHASE_ORDER[number])) {
      return p as typeof PHASE_ORDER[number];
    }
    return null;
  };

  const phase = getValidPhase(gamePhase) || getValidPhase(phaseProp) || internalPhase;
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);

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
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
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

  // Navigation handlers
  const goToNextPhase = useCallback(() => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < PHASE_ORDER.length) {
      setInternalPhase(PHASE_ORDER[nextIndex]);
    }
    if (onPhaseComplete) {
      onPhaseComplete();
    }
  }, [currentPhaseIndex, onPhaseComplete]);

  const goToPreviousPhase = useCallback(() => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setInternalPhase(PHASE_ORDER[prevIndex]);
    }
  }, [currentPhaseIndex]);

  const goToPhase = useCallback((index: number) => {
    if (index >= 0 && index < PHASE_ORDER.length) {
      setInternalPhase(PHASE_ORDER[index]);
    }
  }, []);

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

          {/* Interactive marker - positioned first so getInteractivePoint finds it */}
          <circle
            cx={130 + (wireLength / 50) * 430}
            cy={170 + (1 - brightness) * 60}
            r={8}
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#plossElectronBlur)"
          />

          {/* === POWER STATION / BATTERY === */}
          {/* Battery housing - translate(30,100) applied to rects */}
          <rect x="30" y="100" width="70" height="140" rx="8" fill="url(#plossBatteryBody)" stroke="#78350f" strokeWidth="2" />
          <rect x="35" y="105" width="60" height="130" rx="6" fill="#92400e" opacity="0.3" />
          {/* Battery positive terminal */}
          <rect x="52" y="85" width="26" height="18" rx="4" fill="url(#plossBatteryTerminal)" stroke="#52525b" strokeWidth="1" />
          <text x="65" y="70" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="bold">+</text>
          {/* Battery negative terminal */}
          <rect x="52" y="237" width="26" height="18" rx="4" fill="url(#plossBatteryTerminal)" stroke="#52525b" strokeWidth="1" />
          <text x="65" y="260" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="bold">-</text>
          {/* Voltage label */}
          <rect x="40" y="155" width="50" height="30" rx="4" fill="#78350f" />
          <text x="65" y="175" textAnchor="middle" fill="#fef3c7" fontSize="14" fontWeight="bold">12V</text>
          {/* Power indicator */}
          <circle cx="65" cy="210" r="8" fill="#22c55e" opacity="0.8">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="65" y="230" textAnchor="middle" fill="#fef3c7" fontSize="11">PWR</text>

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

            {/* Power loss indicators along transmission path - absolute coords */}
            {powerLoss > 0.5 && (
              <g>
                {[250, 400].map((hx, i) => {
                  const lossAtPoint = (powerLoss / 2) * (i + 1) / 2;
                  const showIndicator = lossAtPoint > 0.2;
                  const hy = isCoiled ? (i % 2 === 0 ? 75 : 125) : 75;
                  return showIndicator ? (
                    <g key={i}>
                      <ellipse cx={hx} cy={hy} rx={8 + lossAtPoint * 5} ry={12 + lossAtPoint * 8} fill="url(#plossHeatSpot)" opacity={heatIntensity * 0.6}>
                        <animate attributeName="ry" values={`${12 + lossAtPoint * 8};${18 + lossAtPoint * 10};${12 + lossAtPoint * 8}`} dur="0.8s" repeatCount="indefinite" />
                      </ellipse>
                    </g>
                  ) : null;
                })}
              </g>
            )}

            {/* Bottom return wire */}
            <line x1={130} y1={240} x2={560} y2={240} stroke="url(#plossWireCopper)" strokeWidth={wireThickness} strokeLinecap="round" />
          </g>

          {/* === LED LOAD === (absolute coords, was translate(590, 170)) */}
          {brightness > 0.3 && (
            <circle cx="590" cy="170" r={50} fill="url(#plossLEDOuterGlow)" filter="url(#plossLEDGlowFilter)" />
          )}
          <ellipse cx="590" cy="170" rx="35" ry="40" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <ellipse cx="590" cy="165" rx="28" ry="32" fill={`rgba(254, 240, 138, ${0.1 + brightness * 0.4})`} stroke={brightness > 0.5 ? '#fef08a' : '#854d0e'} strokeWidth="2" />
          <ellipse cx="590" cy="170" rx="18" ry="22" fill="url(#plossLEDGlow)" filter={brightness > 0.5 ? "url(#plossLEDGlowFilter)" : undefined} />
          {brightness > 0.4 && (
            <g>
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <line
                  key={angle}
                  x1={590 + Math.cos((angle * Math.PI) / 180) * 38}
                  y1={170 + Math.sin((angle * Math.PI) / 180) * 42}
                  x2={590 + Math.cos((angle * Math.PI) / 180) * (45 + brightness * 15)}
                  y2={170 + Math.sin((angle * Math.PI) / 180) * (50 + brightness * 15)}
                  stroke="#fef08a"
                  strokeWidth={1.5}
                  opacity={brightness * 0.7}
                >
                  <animate attributeName="opacity" values={`${brightness * 0.5};${brightness * 0.8};${brightness * 0.5}`} dur="0.5s" repeatCount="indefinite" />
                </line>
              ))}
            </g>
          )}
          <rect x="575" y="205" width="30" height="20" rx="3" fill="#475569" stroke="#64748b" strokeWidth="1" />
          <line x1="560" y1="100" x2="590" y2="135" stroke="url(#plossWireCopper)" strokeWidth={wireThickness / 2} />
          <line x1="560" y1="240" x2="590" y2="205" stroke="url(#plossWireCopper)" strokeWidth={wireThickness / 2} />
          <text x="645" y="165" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">LOAD</text>
          <text x="645" y="180" textAnchor="middle" fill={brightness > 0.5 ? '#22c55e' : '#ef4444'} fontSize="11">
            {brightness > 0.7 ? 'BRIGHT' : brightness > 0.4 ? 'DIM' : brightness > 0.1 ? 'VERY DIM' : 'OFF'}
          </text>

          {/* Vertical connections */}
          <line x1="100" y1="100" x2="100" y2="240" stroke="url(#plossWireCopper)" strokeWidth={wireThickness} />
          <line x1="560" y1="100" x2="560" y2="240" stroke="url(#plossWireCopper)" strokeWidth={wireThickness} />

          {/* === EFFICIENCY METER === (absolute coords, was translate(180, 280)) */}
          <rect x="180" y="280" width="340" height="110" rx="10" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1.5" filter="url(#plossMeterGlow)" />
          <text x="350" y="298" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold" letterSpacing="1">EFFICIENCY</text>
          <rect x="200" y="308" width="300" height="16" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <rect x="200" y="308" width={300 * (efficiency / 100)} height="16" rx="4" fill="url(#plossEfficiencyGrad)" opacity="0.9">
            <animate attributeName="opacity" values="0.7;0.95;0.7" dur="2s" repeatCount="indefinite" />
          </rect>
          {/* Efficiency percentage markers */}
          {[0, 50, 100].map((pct) => (
            <g key={pct}>
              <line x1={200 + pct * 3} y1="324" x2={200 + pct * 3} y2="328" stroke="#64748b" strokeWidth="1" />
              <text x={200 + pct * 3} y="340" textAnchor="middle" fill="#cbd5e1" fontSize="11">{pct}%</text>
            </g>
          ))}
          <text x="350" y="360" textAnchor="middle" fill={efficiency > 70 ? '#22c55e' : efficiency > 40 ? '#f59e0b' : '#ef4444'} fontSize="12" fontWeight="bold">
            {efficiency.toFixed(1)}% Efficient
          </text>
          <text x="185" y="320" textAnchor="end" fill="#22c55e" fontSize="11">IN</text>
          <text x="515" y="320" textAnchor="start" fill={efficiency > 50 ? '#22c55e' : '#ef4444'} fontSize="11">OUT</text>

          {/* === DATA READOUTS (absolute coords) === */}
          {/* Voltage at load - was translate(550, 20) */}
          <rect x="550" y="20" width="120" height="50" rx="6" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1" />
          <text x="610" y="35" textAnchor="middle" fill="#e2e8f0" fontSize="11" letterSpacing="0.5">LOAD VOLTAGE</text>
          <text x="610" y="56" textAnchor="middle" fill={loadVoltage > 9 ? '#22c55e' : loadVoltage > 6 ? '#f59e0b' : '#ef4444'} fontSize="16" fontWeight="bold">
            {loadVoltage.toFixed(2)}V
          </text>

          {/* Power loss readout - was translate(30, 280) */}
          <rect x="30" y="280" width="130" height="60" rx="6" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1" />
          <text x="95" y="295" textAnchor="middle" fill="#e2e8f0" fontSize="11" letterSpacing="0.5">POWER LOSS</text>
          <text x="95" y="316" textAnchor="middle" fill="#ef4444" fontSize="16" fontWeight="bold">
            {powerLoss.toFixed(2)}W
          </text>
          <text x="95" y="334" textAnchor="middle" fill="#f97316" fontSize="11">as heat</text>

          {/* Wire specs readout - was translate(30, 20) */}
          <rect x="30" y="20" width="180" height="55" rx="6" fill="url(#plossMeterPanel)" stroke="#475569" strokeWidth="1" />
          <text x="120" y="35" textAnchor="middle" fill="#e2e8f0" fontSize="11" letterSpacing="0.5">WIRE SPECS</text>
          <text x="120" y="50" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="bold">{gauge.label}</text>
          <text x="120" y="65" textAnchor="middle" fill="#cbd5e1" fontSize="11">
            {effectiveLength}m | R={resistance.toFixed(4)}{'\u03A9'}
          </text>

          {/* Current flow indicator - was translate(230, 20) */}
          <rect x="230" y="20" width="100" height="50" rx="6" fill="url(#plossMeterPanel)" stroke="#8b5cf6" strokeWidth="1.5" />
          <text x="280" y="35" textAnchor="middle" fill="#e2e8f0" fontSize="11" letterSpacing="0.5">CURRENT</text>
          <text x="280" y="56" textAnchor="middle" fill="#8b5cf6" fontSize="16" fontWeight="bold">
            {current.toFixed(1)}A
          </text>

          {/* Grid lines for visualization */}
          <line x1="130" y1="170" x2="560" y2="170" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />

          {/* Coiled indicator - absolute coords */}
          {isCoiled && (
            <g>
              <rect x="350" y="20" width="90" height="50" rx="6" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="395" y="38" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">COILED 3x</text>
              <text x="395" y="56" textAnchor="middle" fill="#fbbf24" fontSize="11">MORE LOSS</text>
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
              <div style={{ color: colors.accent, fontSize: '18px', fontWeight: 'bold' }}>{resistance.toFixed(4)}\u03A9</div>
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
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, WebkitAppearance: 'none' } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>1 (Min)</span>
          <span>50 (Max)</span>
        </div>
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
                minHeight: '44px',
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
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, WebkitAppearance: 'none' } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0.5 (Min)</span>
          <span>10 (Max)</span>
        </div>
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
          R = {'\u03C1'} {'\u00D7'} L / A = {COPPER_RESISTIVITY} {'\u00D7'} {effectiveLength} / {gauge.area} = {resistance.toFixed(4)} {'\u03A9'}
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          P = I{'\u00B2'} {'\u00D7'} R = {current.toFixed(1)}{'\u00B2'} {'\u00D7'} {resistance.toFixed(4)} = {powerLoss.toFixed(3)} W
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          V_drop = I {'\u00D7'} R = {current.toFixed(1)} {'\u00D7'} {resistance.toFixed(4)} = {voltageDrop.toFixed(3)} V
        </div>
      </div>
    </div>
  );

  // Top navigation bar with Back/Next and progress
  const renderNavBar = () => (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
      }}
      aria-label="Game navigation"
    >
      <button
        onClick={goToPreviousPhase}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? colors.textMuted : colors.textPrimary,
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          minHeight: '44px',
          minWidth: '44px',
          opacity: currentPhaseIndex === 0 ? 0.5 : 1,
        }}
      >
        Back
      </button>

      {/* Progress indicator - navigation dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {PHASE_ORDER.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(i)}
            aria-label={`Go to ${p} phase`}
            title={p}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: 'none',
              background: i === currentPhaseIndex ? colors.accent : i < currentPhaseIndex ? colors.success : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: 0,
              minHeight: '10px',
              minWidth: '10px',
            }}
          />
        ))}
      </div>

      <button
        onClick={goToNextPhase}
        disabled={currentPhaseIndex === PHASE_ORDER.length - 1}
        aria-label="Next"
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          background: currentPhaseIndex === PHASE_ORDER.length - 1 ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
          color: currentPhaseIndex === PHASE_ORDER.length - 1 ? colors.textMuted : 'white',
          cursor: currentPhaseIndex === PHASE_ORDER.length - 1 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          minHeight: '44px',
          minWidth: '44px',
          transition: 'all 0.2s ease',
        }}
      >
        Next
      </button>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div
      role="progressbar"
      aria-valuenow={currentPhaseIndex + 1}
      aria-valuemin={1}
      aria-valuemax={PHASE_ORDER.length}
      style={{
        width: '100%',
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          width: `${((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100}%`,
          height: '100%',
          background: colors.accent,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );

  // Common page wrapper
  const renderPageWrapper = (children: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {renderNavBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        {children}
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPageWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          {renderProgressBar()}
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            Power Loss in Wires
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
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
              Let's explore and discover what happens when electricity flows through wires of different lengths and thicknesses!
            </p>
          </div>
        </div>
      </>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPageWrapper(
      <>
        <div style={{ padding: '16px' }}>
          {renderProgressBar()}
          <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
            Step {currentPhaseIndex + 1} of {PHASE_ORDER.length}: Make your prediction
          </p>
        </div>

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
                  minHeight: '44px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPageWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {renderProgressBar()}
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Wire Resistance</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
            Adjust length, gauge, and current to see power loss in action. This is important in real-world engineering and everyday technology.
          </p>
          <p style={{ color: colors.textMuted, fontSize: '13px', fontStyle: 'italic' }}>
            Observe how changing each parameter affects the LED brightness and power loss readings. That's why engineers carefully design cable thickness for applications from phone chargers to power grids.
          </p>
        </div>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization(true)}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

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
      </>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'dimmer';

    return renderPageWrapper(
      <>
        <div style={{ padding: '16px' }}>
          {renderProgressBar()}
        </div>

        {/* SVG diagram for review */}
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <svg width="100%" height="120" viewBox="0 0 400 120" style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}>
            <defs>
              <linearGradient id="reviewWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b87333" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b87333" />
              </linearGradient>
            </defs>
            <rect x="10" y="40" width="60" height="40" rx="4" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <text x="40" y="65" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="bold">12V</text>
            <line x1="70" y1="60" x2="330" y2="60" stroke="url(#reviewWireGrad)" strokeWidth="6" />
            <text x="200" y="45" textAnchor="middle" fill="#ef4444" fontSize="11">Heat Loss = I\u00B2R</text>
            <circle cx="360" cy="60" r="25" fill="#fef08a" stroke="#eab308" strokeWidth="2" />
            <text x="360" y="65" textAnchor="middle" fill="#78350f" fontSize="11">LED</text>
            <text x="200" y="100" textAnchor="middle" fill="#e2e8f0" fontSize="11">Longer wire = More resistance = More loss</text>
          </svg>
        </div>

        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Your prediction was correct!' : 'Not quite what you predicted!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            As you observed in the experiment, the bulb dims because wire resistance "uses up" voltage before it reaches the load!
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
      </>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPageWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {renderProgressBar()}
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary, marginBottom: '8px' }}>
            What if you coil the thin wire into a tight bundle?
          </p>
          <p style={{ color: colors.textMuted, fontSize: '13px' }}>
            Step {currentPhaseIndex + 1} of {PHASE_ORDER.length}: Make your prediction
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
                  minHeight: '44px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPageWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {renderProgressBar()}
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Coiling Effects</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
            Toggle coiling and observe the dramatic change
          </p>
          <p style={{ color: colors.textMuted, fontSize: '13px', fontStyle: 'italic' }}>
            Observe: Watch the efficiency meter and power loss readings as you toggle coiling
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
              minHeight: '44px',
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
      </>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'dimmer';

    return renderPageWrapper(
      <>
        <div style={{ padding: '16px' }}>
          {renderProgressBar()}
        </div>

        {/* SVG diagram for twist review */}
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <svg width="100%" height="140" viewBox="0 0 400 140" style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}>
            <defs>
              <linearGradient id="coilGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b87333" />
                <stop offset="25%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="75%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b87333" />
              </linearGradient>
            </defs>
            <rect x="10" y="50" width="50" height="40" rx="4" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <text x="35" y="75" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">12V</text>
            {/* Coiled wire representation */}
            <path d="M 60 70 Q 100 30, 140 70 Q 180 110, 220 70 Q 260 30, 300 70 Q 340 110, 350 70" fill="none" stroke="url(#coilGrad)" strokeWidth="5" />
            <text x="200" y="25" textAnchor="middle" fill="#ef4444" fontSize="11">3x path length = 3x resistance!</text>
            <circle cx="375" cy="70" r="20" fill="#854d0e" stroke="#78350f" strokeWidth="2" />
            <text x="375" y="75" textAnchor="middle" fill="#fef3c7" fontSize="11">DIM</text>
            <text x="200" y="130" textAnchor="middle" fill="#e2e8f0" fontSize="11">Coiling increases effective wire length</text>
          </svg>
        </div>

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
      </>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Power Loss"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const currentApp = realWorldApps[currentAppIndex];

    return renderPageWrapper(
      <>
        <div style={{ padding: '16px' }}>
          {renderProgressBar()}
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
            Wire resistance affects everything from power grids to phone chargers. Understanding power loss helps engineers design better electrical systems and save billions of dollars annually.
          </p>
          <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
            Application {currentAppIndex + 1} of {realWorldApps.length} - Explore how the P = I{'\u00B2'}R equation applies across industries
          </p>
        </div>

        {/* App progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          {realWorldApps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentAppIndex(i)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                background: transferCompleted.has(i) ? colors.success : i === currentAppIndex ? colors.accent : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={`Go to application ${i + 1}`}
            />
          ))}
        </div>

        <div
          style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: transferCompleted.has(currentAppIndex) ? `2px solid ${colors.success}` : `1px solid ${currentApp.color}40`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{currentApp.icon}</span>
            <div>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '4px' }}>{currentApp.title}</h3>
              <p style={{ color: currentApp.color, fontSize: '13px' }}>{currentApp.tagline}</p>
            </div>
          </div>

          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
            {currentApp.description}
          </p>

          <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px', lineHeight: 1.5 }}>
            {currentApp.connection}
          </p>

          {/* Stats shown upfront */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {currentApp.stats.map((stat, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ color: currentApp.color, fontSize: '14px', fontWeight: 'bold' }}>{stat.value}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '8px' }}>
            Examples: {currentApp.examples.join(', ')}
          </p>

          {/* Companies */}
          <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '12px' }}>
            Key players: {currentApp.companies.join(', ')}
          </p>

          <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '12px' }}>
            Future outlook: {currentApp.futureImpact}
          </p>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>
              {transferApplications[currentAppIndex]?.question || currentApp.connection}
            </p>
          </div>

          {!transferCompleted.has(currentAppIndex) ? (
            <button
              onClick={() => setTransferCompleted(new Set([...transferCompleted, currentAppIndex]))}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                cursor: 'pointer',
                fontSize: '14px',
                minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
            >
              Got It - Reveal Answer
            </button>
          ) : (
            <>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '13px', lineHeight: 1.5 }}>
                  {transferApplications[currentAppIndex]?.answer || currentApp.howItWorks}
                </p>
              </div>

              <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '12px' }}>
                {currentApp.futureImpact}
              </p>

              <button
                onClick={() => {
                  if (currentAppIndex < realWorldApps.length - 1) {
                    setCurrentAppIndex(currentAppIndex + 1);
                  }
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, ${colors.accent})`,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  minHeight: '44px',
                  transition: 'all 0.2s ease',
                }}
              >
                {currentAppIndex < realWorldApps.length - 1 ? 'Got It - Next Application' : 'Got It - All Complete!'}
              </button>
            </>
          )}
        </div>

        <div style={{ padding: '16px', textAlign: 'center' }}>
          <p style={{ color: colors.textMuted, fontSize: '13px' }}>
            Completed: {transferCompleted.size} of {realWorldApps.length} applications
          </p>
        </div>
      </>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPageWrapper(
        <>
          <div style={{ padding: '16px' }}>
            {renderProgressBar()}
          </div>
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
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>Q{qIndex + 1} of {testQuestions.length}: {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                    {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
                  </div>
                ))}
              </div>
            );
          })}
        </>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderPageWrapper(
      <>
        <div style={{ padding: '16px' }}>
          {renderProgressBar()}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 'normal' as const }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '12px', fontWeight: 400 }}>
            Test your understanding of power loss in wires, resistance calculations, and real-world applications of electrical engineering principles. Each question covers a key concept from the lesson.
          </p>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
              Consider the relationship between resistance (R = rho * L / A), power loss (P = I squared * R), and voltage drop (V = IR) when answering.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', minHeight: '44px', transition: 'all 0.15s ease' }}>
                {opt.text}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', minHeight: '44px', transition: 'all 0.15s ease' }}>Previous</button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', minHeight: '44px', transition: 'all 0.15s ease' }}>Next Question</button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', minHeight: '44px', transition: 'all 0.15s ease' }}>Submit Test</button>
          )}
        </div>
      </>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPageWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          {renderProgressBar()}
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\uD83C\uDFC6'}</div>
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
      </>
    );
  }

  // Default fallback - return hook phase content
  return renderPageWrapper(
    <>
      <div style={{ padding: '24px', textAlign: 'center' }}>
        {renderProgressBar()}
        <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
          Power Loss in Wires
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
          Same battery - will a long thin wire dim a bulb?
        </p>
      </div>
      {renderVisualization(true)}
    </>
  );
};

export default PowerLossRenderer;
