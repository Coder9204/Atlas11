'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface NoiseMarginRendererProps {
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
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  logicHigh: '#22c55e',
  logicLow: '#3b82f6',
  forbidden: '#ef4444',
  noise: '#f97316',
  vdd: '#a855f7',
};

const realWorldApps = [
  {
    icon: '💻',
    title: 'Computer Processors',
    short: 'CPUs rely on noise margins for reliable operation',
    tagline: 'Billions of transistors switching correctly',
    description: 'Modern processors contain billions of transistors that must correctly interpret 0s and 1s. Noise margins ensure that electrical interference, temperature variations, and manufacturing tolerances don\'t cause bit errors.',
    connection: 'The voltage thresholds VIH and VIL define safe regions where logic states are guaranteed. Without adequate noise margins, processors would make constant errors from electrical noise.',
    howItWorks: 'CMOS logic uses complementary transistor pairs that switch between VDD and ground. The threshold voltages are set at approximately 30% and 70% of VDD, leaving margin for noise immunity.',
    stats: [
      { value: '100B+', label: 'transistors (M3)', icon: '⚡' },
      { value: '3nm', label: 'process node', icon: '🔬' },
      { value: '$574B', label: 'semiconductor market', icon: '📈' }
    ],
    examples: ['Intel and AMD processors', 'Apple M-series chips', 'Server CPUs', 'Mobile SoCs'],
    companies: ['Intel', 'AMD', 'Apple', 'Qualcomm'],
    futureImpact: 'As transistors shrink below 2nm, maintaining noise margins becomes increasingly challenging, driving innovation in materials and circuit design.',
    color: '#3B82F6'
  },
  {
    icon: '📡',
    title: 'Digital Communication',
    short: 'Data transmission requires robust signal levels',
    tagline: 'Bits traveling through noisy channels',
    description: 'Digital communication systems like USB, HDMI, and Ethernet define strict voltage levels for 0 and 1. Noise margins allow data to travel through cables and across boards without corruption.',
    connection: 'Signal integrity depends on maintaining voltage levels within specified thresholds. The noise margin provides headroom for reflections, crosstalk, and EMI.',
    howItWorks: 'Differential signaling in high-speed interfaces compares two complementary signals, doubling noise immunity. Eye diagrams measure actual noise margins in real systems.',
    stats: [
      { value: '40', label: 'Gbps (USB4)', icon: '⚡' },
      { value: '48', label: 'Gbps (HDMI 2.1)', icon: '📺' },
      { value: '$52B', label: 'interface market', icon: '📈' }
    ],
    examples: ['USB connections', 'HDMI video cables', 'Ethernet networking', 'PCIe data buses'],
    companies: ['USB-IF', 'HDMI Licensing', 'IEEE', 'PCI-SIG'],
    futureImpact: 'Faster interfaces like USB5 and PCIe 7.0 will require advanced equalization and error correction to maintain margins at 100+ Gbps speeds.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Vehicles operate in extreme electrical environments',
    tagline: 'Reliability in the harshest conditions',
    description: 'Cars contain hundreds of electronic modules that must function despite ignition noise, motor switching, temperature extremes, and vibration. Enhanced noise margins are essential for safety-critical systems.',
    connection: 'Automotive-grade chips have wider noise margins than consumer electronics to handle load dumps, ESD, and EMI from engines and power systems.',
    howItWorks: 'ISO 16750 and AEC-Q100 standards define stringent voltage tolerance requirements. Automotive chips use larger transistors and more robust I/O circuits for reliability.',
    stats: [
      { value: '3,000+', label: 'chips per vehicle', icon: '🔧' },
      { value: '-40/150', label: '°C temp range', icon: '🌡️' },
      { value: '$50B', label: 'auto chip market', icon: '📈' }
    ],
    examples: ['Engine control units', 'ABS brake systems', 'Infotainment displays', 'ADAS sensors'],
    companies: ['NXP', 'Infineon', 'Texas Instruments', 'Renesas'],
    futureImpact: 'Electric vehicles and autonomous driving demand even higher reliability, pushing noise margin requirements for mission-critical automotive systems.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Industrial Control Systems',
    short: 'Factory automation requires noise immunity',
    tagline: 'Reliable signals in noisy factories',
    description: 'PLCs and industrial controllers operate alongside motors, welders, and high-power equipment. Extended noise margins and industrial communication protocols ensure reliable operation in electrically hostile environments.',
    connection: 'Industrial voltage standards like 24V logic provide massive noise margins compared to 3.3V CMOS, allowing signals to survive factory floor interference.',
    howItWorks: 'Opto-isolation, differential signaling, and shielded cables create physical barriers to noise. Industrial Ethernet uses robust PHYs designed for high EMI environments.',
    stats: [
      { value: '24V', label: 'industrial logic', icon: '⚡' },
      { value: '99.99%', label: 'uptime required', icon: '✅' },
      { value: '$200B', label: 'automation market', icon: '📈' }
    ],
    examples: ['Assembly line robotics', 'Chemical plant control', 'Power grid SCADA', 'Water treatment systems'],
    companies: ['Siemens', 'Rockwell', 'ABB', 'Schneider Electric'],
    futureImpact: 'Industry 4.0 and smart factories will deploy more sensors and edge computing, requiring robust noise margins for reliable real-time control.',
    color: '#8B5CF6'
  }
];

const NoiseMarginRenderer: React.FC<NoiseMarginRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [vdd, setVdd] = useState(3.3); // Supply voltage
  const [vih, setVih] = useState(2.0); // Input high threshold
  const [vil, setVil] = useState(0.8); // Input low threshold
  const [voh, setVoh] = useState(2.9); // Output high level
  const [vol, setVol] = useState(0.4); // Output low level
  const [inputVoltage, setInputVoltage] = useState(2.5);
  const [noiseAmplitude, setNoiseAmplitude] = useState(0.3);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
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

  // Calculate noise margins
  const nmh = voh - vih; // Noise margin high
  const nml = vil - vol; // Noise margin low

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Update thresholds when VDD changes (simplified CMOS approximation)
  useEffect(() => {
    setVih(vdd * 0.6);
    setVil(vdd * 0.3);
    setVoh(vdd * 0.9);
    setVol(vdd * 0.1);
  }, [vdd]);

  // Determine if current input would be valid
  const noise = isAnimating ? Math.sin(animationTime * 5) * noiseAmplitude : 0;
  const effectiveVoltage = inputVoltage + noise;
  const isValidHigh = effectiveVoltage >= vih;
  const isValidLow = effectiveVoltage <= vil;
  const isUndefined = !isValidHigh && !isValidLow;

  const predictions = [
    { id: 'exact', label: 'By exact voltage levels - 0V is "0" and VDD is "1"' },
    { id: 'threshold', label: 'Using threshold regions with safety margins for noise' },
    { id: 'current', label: 'By measuring current flow, not voltage' },
    { id: 'time', label: 'By how long the signal stays at a level' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Noise margins stay the same at any voltage' },
    { id: 'smaller', label: 'Lower voltages mean smaller noise margins' },
    { id: 'larger', label: 'Lower voltages increase noise margins' },
    { id: 'irrelevant', label: 'Supply voltage does not affect noise margins' },
  ];

  const transferApplications = [
    {
      title: 'CMOS Logic Families',
      description: 'Different CMOS families (3.3V, 2.5V, 1.8V, 1.2V) have different thresholds. Level shifters are needed when connecting different voltage domains.',
      icon: '🔧',
    },
    {
      title: 'I2C and SPI Buses',
      description: 'Communication buses define VOL and VOH specs that all devices must meet. Open-drain I2C uses pullups, affecting rise times and noise immunity.',
      icon: '🔌',
    },
    {
      title: 'PCB Signal Integrity',
      description: 'Long traces act as antennas picking up noise. Proper termination, ground planes, and differential signaling maintain noise margins.',
      icon: '📟',
    },
    {
      title: 'Automotive Electronics',
      description: 'Cars have massive electrical noise from ignition, motors, and switching. Automotive ICs have enhanced noise margins and filtering.',
      icon: '🚗',
    },
  ];

  const testQuestions = [
    {
      question: 'What is VIH in digital logic?',
      options: [
        { text: 'The minimum input voltage recognized as logic HIGH', correct: true },
        { text: 'The maximum output voltage for HIGH', correct: false },
        { text: 'The supply voltage', correct: false },
        { text: 'The voltage drop across a transistor', correct: false },
      ],
    },
    {
      question: 'What is the noise margin high (NMH)?',
      options: [
        { text: 'VOH - VIH (output high minus input high threshold)', correct: true },
        { text: 'VDD - VOH', correct: false },
        { text: 'VIH - VIL', correct: false },
        { text: 'VOH - VOL', correct: false },
      ],
    },
    {
      question: 'What happens when input voltage is between VIL and VIH?',
      options: [
        { text: 'The output is always HIGH', correct: false },
        { text: 'The output is always LOW', correct: false },
        { text: 'The logic state is undefined/forbidden zone', correct: true },
        { text: 'The chip enters sleep mode', correct: false },
      ],
    },
    {
      question: 'Why do lower supply voltages make digital design harder?',
      options: [
        { text: 'They consume more power', correct: false },
        { text: 'Noise margins become smaller, less room for error', correct: true },
        { text: 'The clock speed must decrease', correct: false },
        { text: 'They require more transistors', correct: false },
      ],
    },
    {
      question: 'What is VOL in CMOS logic?',
      options: [
        { text: 'Maximum output voltage when driving LOW', correct: true },
        { text: 'Minimum output voltage when driving HIGH', correct: false },
        { text: 'The input threshold for LOW', correct: false },
        { text: 'The supply voltage', correct: false },
      ],
    },
    {
      question: 'In 3.3V CMOS logic, typical VIH is approximately:',
      options: [
        { text: '0.5V', correct: false },
        { text: '1.0V', correct: false },
        { text: '2.0V (about 60% of VDD)', correct: true },
        { text: '3.3V', correct: false },
      ],
    },
    {
      question: 'Why is the noise margin important?',
      options: [
        { text: 'It determines clock speed', correct: false },
        { text: 'It defines tolerance for electrical noise without errors', correct: true },
        { text: 'It sets the power consumption', correct: false },
        { text: 'It controls the chip temperature', correct: false },
      ],
    },
    {
      question: 'What causes a signal to enter the forbidden region?',
      options: [
        { text: 'Correct circuit operation', correct: false },
        { text: 'Excessive noise, slow transitions, or improper voltage levels', correct: true },
        { text: 'Low power mode', correct: false },
        { text: 'High clock frequencies', correct: false },
      ],
    },
    {
      question: 'When connecting 3.3V logic to 1.8V logic:',
      options: [
        { text: 'Direct connection is always safe', correct: false },
        { text: 'Level shifting is required to match voltage domains', correct: true },
        { text: 'No connection is possible', correct: false },
        { text: 'Only ground needs to be connected', correct: false },
      ],
    },
    {
      question: 'What is the typical relationship between VIL and VIH in CMOS?',
      options: [
        { text: 'VIL is about 30% of VDD, VIH is about 60% of VDD', correct: true },
        { text: 'VIL equals VIH', correct: false },
        { text: 'VIL is always 0V', correct: false },
        { text: 'VIH is always VDD', correct: false },
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (showVoltageLevels: boolean = true, showNoise: boolean = false) => {
    const width = 400;
    const height = 350;
    const margin = { top: 40, right: 60, bottom: 40, left: 60 };
    const chartHeight = height - margin.top - margin.bottom;

    // Scale voltage to pixels
    const vToY = (v: number) => margin.top + chartHeight * (1 - v / vdd);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="highRegion" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.logicHigh} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.logicHigh} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lowRegion" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.logicLow} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.logicLow} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="forbiddenRegion" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.forbidden} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.forbidden} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x="200" y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
          CMOS Logic Voltage Levels
        </text>

        {/* HIGH region */}
        <rect
          x={margin.left}
          y={vToY(vdd)}
          width={width - margin.left - margin.right}
          height={vToY(vih) - vToY(vdd)}
          fill="url(#highRegion)"
        />
        <text x={width - margin.right + 5} y={vToY(vdd) + 15} fill={colors.logicHigh} fontSize="10">
          HIGH
        </text>

        {/* LOW region */}
        <rect
          x={margin.left}
          y={vToY(vil)}
          width={width - margin.left - margin.right}
          height={vToY(0) - vToY(vil)}
          fill="url(#lowRegion)"
        />
        <text x={width - margin.right + 5} y={vToY(0) - 10} fill={colors.logicLow} fontSize="10">
          LOW
        </text>

        {/* Forbidden region */}
        <rect
          x={margin.left}
          y={vToY(vih)}
          width={width - margin.left - margin.right}
          height={vToY(vil) - vToY(vih)}
          fill="url(#forbiddenRegion)"
        />
        <text x={200} y={(vToY(vih) + vToY(vil)) / 2 + 4} fill={colors.forbidden} fontSize="9" textAnchor="middle">
          FORBIDDEN ZONE
        </text>

        {/* Voltage level lines */}
        {showVoltageLevels && (
          <>
            {/* VDD */}
            <line x1={margin.left} y1={vToY(vdd)} x2={width - margin.right} y2={vToY(vdd)} stroke={colors.vdd} strokeWidth="2" strokeDasharray="5,3" />
            <text x={margin.left - 5} y={vToY(vdd) + 4} fill={colors.vdd} fontSize="10" textAnchor="end">VDD</text>
            <text x={margin.left - 5} y={vToY(vdd) + 16} fill={colors.textMuted} fontSize="9" textAnchor="end">{vdd.toFixed(1)}V</text>

            {/* VOH */}
            <line x1={margin.left} y1={vToY(voh)} x2={width - margin.right} y2={vToY(voh)} stroke={colors.logicHigh} strokeWidth="2" />
            <text x={margin.left - 5} y={vToY(voh) + 4} fill={colors.logicHigh} fontSize="10" textAnchor="end">VOH</text>

            {/* VIH */}
            <line x1={margin.left} y1={vToY(vih)} x2={width - margin.right} y2={vToY(vih)} stroke={colors.logicHigh} strokeWidth="2" strokeDasharray="3,3" />
            <text x={margin.left - 5} y={vToY(vih) + 4} fill={colors.logicHigh} fontSize="10" textAnchor="end">VIH</text>

            {/* VIL */}
            <line x1={margin.left} y1={vToY(vil)} x2={width - margin.right} y2={vToY(vil)} stroke={colors.logicLow} strokeWidth="2" strokeDasharray="3,3" />
            <text x={margin.left - 5} y={vToY(vil) + 4} fill={colors.logicLow} fontSize="10" textAnchor="end">VIL</text>

            {/* VOL */}
            <line x1={margin.left} y1={vToY(vol)} x2={width - margin.right} y2={vToY(vol)} stroke={colors.logicLow} strokeWidth="2" />
            <text x={margin.left - 5} y={vToY(vol) + 4} fill={colors.logicLow} fontSize="10" textAnchor="end">VOL</text>

            {/* GND */}
            <line x1={margin.left} y1={vToY(0)} x2={width - margin.right} y2={vToY(0)} stroke={colors.textMuted} strokeWidth="2" />
            <text x={margin.left - 5} y={vToY(0) + 4} fill={colors.textMuted} fontSize="10" textAnchor="end">GND</text>
          </>
        )}

        {/* Noise margin annotations */}
        {showVoltageLevels && (
          <>
            {/* NMH bracket */}
            <line x1={width - margin.right - 20} y1={vToY(voh)} x2={width - margin.right - 20} y2={vToY(vih)} stroke={colors.success} strokeWidth="2" />
            <line x1={width - margin.right - 25} y1={vToY(voh)} x2={width - margin.right - 15} y2={vToY(voh)} stroke={colors.success} strokeWidth="2" />
            <line x1={width - margin.right - 25} y1={vToY(vih)} x2={width - margin.right - 15} y2={vToY(vih)} stroke={colors.success} strokeWidth="2" />
            <text x={width - margin.right - 10} y={(vToY(voh) + vToY(vih)) / 2} fill={colors.success} fontSize="8" textAnchor="start">
              NMH
            </text>

            {/* NML bracket */}
            <line x1={width - margin.right - 20} y1={vToY(vil)} x2={width - margin.right - 20} y2={vToY(vol)} stroke={colors.success} strokeWidth="2" />
            <line x1={width - margin.right - 25} y1={vToY(vil)} x2={width - margin.right - 15} y2={vToY(vil)} stroke={colors.success} strokeWidth="2" />
            <line x1={width - margin.right - 25} y1={vToY(vol)} x2={width - margin.right - 15} y2={vToY(vol)} stroke={colors.success} strokeWidth="2" />
            <text x={width - margin.right - 10} y={(vToY(vil) + vToY(vol)) / 2} fill={colors.success} fontSize="8" textAnchor="start">
              NML
            </text>
          </>
        )}

        {/* Signal with noise */}
        {showNoise && (
          <g>
            {/* Generate noisy signal path */}
            <path
              d={`M ${margin.left} ${vToY(inputVoltage)} ` +
                Array.from({ length: 50 }, (_, i) => {
                  const x = margin.left + (i / 50) * (width - margin.left - margin.right);
                  const noiseVal = Math.sin((animationTime * 5) + i * 0.5) * noiseAmplitude;
                  const y = vToY(inputVoltage + noiseVal);
                  return `L ${x} ${y}`;
                }).join(' ')}
              fill="none"
              stroke={colors.noise}
              strokeWidth="2"
            />

            {/* Input marker */}
            <circle
              cx={margin.left + (width - margin.left - margin.right) / 2}
              cy={vToY(effectiveVoltage)}
              r="6"
              fill={isUndefined ? colors.forbidden : isValidHigh ? colors.logicHigh : colors.logicLow}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Status box */}
        {showNoise && (
          <g transform={`translate(${margin.left + 10}, ${margin.top + 10})`}>
            <rect x="0" y="0" width="120" height="50" fill={colors.bgCard} rx="6" />
            <text x="60" y="18" fill={colors.textMuted} fontSize="10" textAnchor="middle">Logic State</text>
            <text x="60" y="38" fill={isUndefined ? colors.forbidden : isValidHigh ? colors.logicHigh : colors.logicLow} fontSize="14" textAnchor="middle" fontWeight="bold">
              {isUndefined ? 'UNDEFINED' : isValidHigh ? 'HIGH (1)' : 'LOW (0)'}
            </text>
          </g>
        )}
      </svg>
    );
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(51, 65, 85, 0.8)',
    color: colors.textPrimary,
    border: `1px solid ${colors.accent}`,
  };

  const renderHook = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>0️⃣1️⃣</div>
      <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
        How Does a Chip Tell 0 from 1?
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
        Digital signals are not perfect. They have noise, ringing, and voltage drops. Yet computers work flawlessly. How?
      </p>
      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Margin of Safety</h3>
        <p style={{ color: colors.textMuted, fontSize: '14px' }}>
          Digital logic doesn't need exact voltages - it uses threshold regions with built-in tolerance for the messy real world.
        </p>
      </div>
      {renderVisualization(true)}
      <button
        onClick={() => onPhaseComplete?.()}
        style={primaryButtonStyle}
      >
        Explore Logic Levels
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Make Your Prediction
      </h2>
      <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          How does a CMOS gate determine if an input is logic "1" or logic "0"?
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {predictions.map((p) => (
          <button
            key={p.id}
            onClick={() => setPrediction(p.id)}
            style={{
              ...secondaryButtonStyle,
              background: prediction === p.id
                ? (p.id === 'threshold' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: prediction === p.id ? (p.id === 'threshold' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {prediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'threshold' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: prediction === 'threshold' ? colors.success : colors.warning }}>
            {prediction === 'threshold'
              ? 'Correct! VIH and VIL thresholds define valid regions, with a forbidden zone between them. Noise margins ensure reliable operation.'
              : 'Not quite. Digital logic uses voltage threshold regions with safety margins, not exact voltage values.'}
          </p>
        </div>
      )}
      {prediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          See It In Action
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Logic Level Explorer
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        Adjust input voltage and add noise to see how thresholds work
      </p>

      {renderVisualization(true, true)}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Input Voltage: {inputVoltage.toFixed(2)}V
        </label>
        <input
          type="range"
          min="0"
          max={vdd}
          step="0.05"
          value={inputVoltage}
          onChange={(e) => setInputVoltage(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '16px' }}>
        <label style={{ color: colors.noise, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Noise Amplitude: {noiseAmplitude.toFixed(2)}V
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={noiseAmplitude}
          onChange={(e) => setNoiseAmplitude(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          style={isAnimating ? secondaryButtonStyle : primaryButtonStyle}
        >
          {isAnimating ? 'Stop Noise' : 'Add Noise'}
        </button>
      </div>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.logicHigh, fontSize: '12px' }}>NMH (High Margin)</div>
          <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
            {nmh.toFixed(2)}V
          </div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.logicLow, fontSize: '12px' }}>NML (Low Margin)</div>
          <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
            {nml.toFixed(2)}V
          </div>
        </div>
      </div>

      {isUndefined && (
        <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ color: colors.error, margin: 0 }}>
            Signal in forbidden zone! Logic state is undefined and may cause errors.
          </p>
        </div>
      )}

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
      >
        Continue to Review
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Understanding Noise Margins
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Noise Margin Equations</div>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}>
          NMH = VOH - VIH
        </div>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '8px' }}>
          NML = VIL - VOL
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { icon: '📈', title: 'VIH (Input High)', desc: 'Minimum voltage the chip recognizes as logic HIGH', color: colors.logicHigh },
          { icon: '📉', title: 'VIL (Input Low)', desc: 'Maximum voltage the chip recognizes as logic LOW', color: colors.logicLow },
          { icon: '⬆️', title: 'VOH (Output High)', desc: 'Minimum voltage the chip outputs for HIGH (usually > VIH)', color: colors.logicHigh },
          { icon: '⬇️', title: 'VOL (Output Low)', desc: 'Maximum voltage the chip outputs for LOW (usually < VIL)', color: colors.logicLow },
        ].map((item, i) => (
          <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '24px' }}>{item.icon}</div>
            <div>
              <h3 style={{ color: item.color, margin: '0 0 4px' }}>{item.title}</h3>
              <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        Discover the Voltage Challenge
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
        The Voltage Twist
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
        As supply voltages drop (5V to 3.3V to 1.8V to 1.2V), what happens to noise margins?
      </p>

      <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Modern chips use lower voltages for power efficiency. How does this affect reliability?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {twistPredictions.map((p) => (
          <button
            key={p.id}
            onClick={() => setTwistPrediction(p.id)}
            style={{
              ...secondaryButtonStyle,
              background: twistPrediction === p.id
                ? (p.id === 'smaller' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                : 'rgba(51, 65, 85, 0.5)',
              borderColor: twistPrediction === p.id ? (p.id === 'smaller' ? colors.success : colors.error) : 'transparent',
              textAlign: 'left',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'smaller' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
          <p style={{ color: twistPrediction === 'smaller' ? colors.success : colors.warning }}>
            {twistPrediction === 'smaller'
              ? 'Correct! Lower VDD means thresholds get closer together. A 1.2V chip has much less margin for noise than a 3.3V chip!'
              : 'Actually, noise margins scale with supply voltage. Lower voltages = smaller margins = tighter tolerances required.'}
          </p>
        </div>
      )}

      {twistPrediction && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ ...primaryButtonStyle, marginTop: '20px', width: '100%' }}
        >
          Explore Voltage Scaling
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Voltage Scaling Explorer
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
        Lower the supply voltage and watch noise margins shrink
      </p>

      {renderVisualization(true, true)}

      <div style={{ marginTop: '20px' }}>
        <label style={{ color: colors.vdd, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Supply Voltage (VDD): {vdd.toFixed(1)}V
        </label>
        <input
          type="range"
          min="1.0"
          max="5.0"
          step="0.1"
          value={vdd}
          onChange={(e) => {
            const newVdd = Number(e.target.value);
            setVdd(newVdd);
            setInputVoltage(newVdd / 2);
          }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '16px' }}>
        <label style={{ color: colors.noise, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
          Noise Amplitude: {noiseAmplitude.toFixed(2)}V
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={noiseAmplitude}
          onChange={(e) => setNoiseAmplitude(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          style={isAnimating ? secondaryButtonStyle : primaryButtonStyle}
        >
          {isAnimating ? 'Stop Noise' : 'Add Noise'}
        </button>
      </div>

      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.vdd, fontSize: '12px' }}>VDD</div>
          <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
            {vdd.toFixed(1)}V
          </div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.logicHigh, fontSize: '12px' }}>NMH</div>
          <div style={{ color: nmh < 0.3 ? colors.error : colors.success, fontSize: '18px', fontWeight: 'bold' }}>
            {nmh.toFixed(2)}V
          </div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ color: colors.logicLow, fontSize: '12px' }}>NML</div>
          <div style={{ color: nml < 0.3 ? colors.error : colors.success, fontSize: '18px', fontWeight: 'bold' }}>
            {nml.toFixed(2)}V
          </div>
        </div>
      </div>

      {(nmh < 0.3 || nml < 0.3) && (
        <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ color: colors.error, margin: 0 }}>
            Warning: Very small noise margins! This design is susceptible to noise errors.
          </p>
        </div>
      )}

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        Continue
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        The Low-Voltage Challenge
      </h2>

      <div style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          Lower Voltage = Smaller Margins
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
          Modern chips trade noise immunity for power efficiency
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.success, fontWeight: 'bold', marginBottom: '4px' }}>5V CMOS</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>NMH ~ 1.5V</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Good noise immunity</div>
        </div>
        <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
          <div style={{ color: colors.warning, fontWeight: 'bold', marginBottom: '4px' }}>1.2V CMOS</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>NMH ~ 0.3V</div>
          <div style={{ color: colors.textMuted, fontSize: '12px' }}>Tight margins</div>
        </div>
      </div>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Design Implications</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
          <li>Better shielding and ground planes required</li>
          <li>Differential signaling for critical paths</li>
          <li>Shorter trace lengths to reduce noise pickup</li>
          <li>Level shifters between voltage domains</li>
        </ul>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ ...primaryButtonStyle, marginTop: '24px', width: '100%' }}
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
        Real-World Applications
      </h2>
      <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
        Explore all 4 applications to continue
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {transferApplications.map((app, i) => (
          <div
            key={i}
            onClick={() => setTransferCompleted(prev => new Set([...prev, i]))}
            style={{
              background: transferCompleted.has(i) ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '2px solid transparent',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>{app.icon}</div>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', textAlign: 'center', margin: '0 0 8px' }}>
              {app.title}
            </h3>
            <p style={{ color: colors.textMuted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
              {app.description}
            </p>
            {transferCompleted.has(i) && (
              <div style={{ color: colors.success, textAlign: 'center', marginTop: '8px', fontSize: '12px' }}>
                Explored
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>
          Progress: {transferCompleted.size}/4 applications
        </p>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        disabled={transferCompleted.size < 4}
        style={{
          ...primaryButtonStyle,
          marginTop: '20px',
          width: '100%',
          opacity: transferCompleted.size < 4 ? 0.5 : 1,
          cursor: transferCompleted.size < 4 ? 'not-allowed' : 'pointer',
        }}
      >
        {transferCompleted.size < 4 ? `Explore ${4 - transferCompleted.size} more` : 'Take the Test'}
      </button>
    </div>
  );

  const renderTest = () => (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
        Knowledge Check
      </h2>

      {!testSubmitted ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            {testQuestions.map((q, qIndex) => (
              <div key={qIndex} style={{ marginBottom: '24px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '12px' }}>
                  {qIndex + 1}. {q.question}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => handleTestAnswer(qIndex, oIndex)}
                      style={{
                        ...secondaryButtonStyle,
                        background: testAnswers[qIndex] === oIndex ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                        borderColor: testAnswers[qIndex] === oIndex ? colors.accent : 'transparent',
                        textAlign: 'left',
                        fontSize: '14px',
                        padding: '10px 16px',
                      }}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={submitTest}
            disabled={testAnswers.includes(null)}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              opacity: testAnswers.includes(null) ? 0.5 : 1,
              cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
            }}
          >
            Submit Answers
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {testScore >= 7 ? '🎉' : '📚'}
          </div>
          <h3 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '8px' }}>
            Score: {testScore}/10
          </h3>
          <p style={{ color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '24px' }}>
            {testScore >= 7 ? 'Excellent! You understand noise margins and logic levels!' : 'Review the concepts and try again.'}
          </p>

          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            {testQuestions.map((q, i) => (
              <div key={i} style={{
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: testAnswers[i] !== null && q.options[testAnswers[i]!].correct
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)'
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', margin: '0 0 4px' }}>
                  {i + 1}. {q.question}
                </p>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                  Correct: {q.options.find(o => o.correct)?.text}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => onPhaseComplete?.()}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {testScore >= 7 ? 'Complete!' : 'Continue Anyway'}
          </button>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
      <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
        Noise Margin Master!
      </h1>
      <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        You now understand how digital logic reliably distinguishes between 0 and 1.
      </p>

      <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
        <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
        <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>VIH and VIL define the input threshold regions</li>
          <li style={{ marginBottom: '8px' }}>VOH and VOL are the guaranteed output levels</li>
          <li style={{ marginBottom: '8px' }}>Noise margins (NMH, NML) provide tolerance for noise</li>
          <li style={{ marginBottom: '8px' }}>Lower supply voltages mean smaller noise margins</li>
          <li>The forbidden zone between VIL and VIH causes undefined behavior</li>
        </ul>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', padding: '16px' }}>
        <p style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
          Score: {testScore}/10
        </p>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 100%)`,
      color: colors.textPrimary,
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default NoiseMarginRenderer;
