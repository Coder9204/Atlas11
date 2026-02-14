import React, { useState, useCallback, useEffect, useRef } from 'react';

// Real-world applications for LLM-to-SPICE design workflow
const realWorldApps = [
  {
    icon: '🔌',
    title: 'Power Electronics Design',
    short: 'AI-accelerated power converter design',
    tagline: 'From specs to silicon in hours, not weeks',
    description: 'Power supply designers use LLM-assisted workflows to generate initial converter topologies, component values, and control loop parameters. SPICE simulation validates efficiency, thermal performance, and transient response before any physical prototype.',
    connection: 'The LLM-to-SPICE pipeline enables rapid iteration through design space. LLMs suggest component values based on specifications, while SPICE validates against physics - exactly as demonstrated with buck converter optimization.',
    howItWorks: 'Engineers input voltage/current specs to LLMs, which generate netlists with initial component values. SPICE runs AC/DC/transient analysis. Results feed back to LLMs for refinement until specs are met.',
    stats: [
      { value: '10x', label: 'Faster iteration cycles', icon: '⚡' },
      { value: '$45B', label: 'Power electronics market', icon: '📈' },
      { value: '85%', label: 'Design time reduction', icon: '🚀' }
    ],
    examples: ['EV charging systems', 'Data center power supplies', 'Solar inverters', 'Laptop adapters'],
    companies: ['Texas Instruments', 'Analog Devices', 'Infineon', 'ON Semiconductor'],
    futureImpact: 'AI-assisted design will enable custom power solutions for IoT devices at fraction of current NRE costs, democratizing power electronics design.',
    color: '#f59e0b'
  },
  {
    icon: '📡',
    title: 'RF/Wireless Circuit Design',
    short: 'LLM-generated matching networks',
    tagline: 'Impedance matching meets machine learning',
    description: 'Radio frequency engineers leverage LLMs to propose matching network topologies for antennas and amplifiers. Electromagnetic simulators verify S-parameters, noise figure, and bandwidth - properties impossible to predict without solving Maxwell\'s equations.',
    connection: 'Just as buck converter phase margin requires actual simulation, RF performance depends on parasitic effects that only EM/SPICE tools can compute. LLMs generate starting points; physics reveals truth.',
    howItWorks: 'LLMs suggest L-C-R values for matching networks based on frequency and impedance targets. RF simulators compute actual S11/S21 parameters. Multiple iterations converge on optimal matching.',
    stats: [
      { value: '5G+', label: 'Frequency bands supported', icon: '📶' },
      { value: '$35B', label: 'RF component market', icon: '📈' },
      { value: '40dB', label: 'Typical isolation achieved', icon: '🎯' }
    ],
    examples: ['5G base stations', 'WiFi 6E routers', 'Satellite communications', 'Radar systems'],
    companies: ['Qualcomm', 'Broadcom', 'Skyworks', 'Qorvo'],
    futureImpact: 'Generative AI will design custom RF front-ends for emerging spectrum allocations, accelerating 6G and satellite internet deployment.',
    color: '#3b82f6'
  },
  {
    icon: '🧠',
    title: 'Analog IC Design Automation',
    short: 'Neural network-guided transistor sizing',
    tagline: 'Billions of transistors, intelligently placed',
    description: 'Integrated circuit designers use ML models to propose transistor sizes for amplifiers, filters, and data converters. SPICE simulation validates gain, bandwidth, noise, and yield across process corners that statistical models alone cannot capture.',
    connection: 'The game shows how plausible LLM outputs need physics validation. In IC design, process variation and temperature effects make simulation essential - no amount of training data captures your specific foundry process.',
    howItWorks: 'ML models trained on successful designs suggest W/L ratios and bias points. Foundry SPICE models simulate actual silicon behavior. Monte Carlo runs verify yield. Feedback improves suggestions.',
    stats: [
      { value: '3nm', label: 'Leading edge node', icon: '🔬' },
      { value: '$600B', label: 'Semiconductor market', icon: '📈' },
      { value: '99.9%', label: 'Target yield rate', icon: '✅' }
    ],
    examples: ['Smartphone SoCs', 'Automotive sensors', 'Medical implants', 'Industrial ADCs'],
    companies: ['TSMC', 'Intel', 'Samsung', 'Cadence'],
    futureImpact: 'AI-assisted analog design will close the productivity gap with digital design, enabling fully custom mixed-signal systems at Moore\'s Law pace.',
    color: '#8b5cf6'
  },
  {
    icon: '⚡',
    title: 'EMC/Signal Integrity Analysis',
    short: 'AI-predicted PCB routing with EM validation',
    tagline: 'Every trace is a transmission line',
    description: 'High-speed PCB designers use AI tools to suggest layer stackups and routing strategies for signal integrity. Full-wave electromagnetic solvers validate crosstalk, reflections, and EMI compliance - effects that emerge from physical geometry, not rules.',
    connection: 'Like the game\'s phase margin analysis, signal integrity depends on distributed effects that only field solvers can compute. AI suggests; Maxwell\'s equations decide.',
    howItWorks: 'AI recommends trace widths, spacing, and via patterns based on data rate targets. 3D EM solvers compute actual S-parameters and eye diagrams. DDR5 memory at 6400 MT/s demands sub-mm accuracy.',
    stats: [
      { value: '112G', label: 'PAM4 SerDes rates', icon: '🚀' },
      { value: '$8B', label: 'EDA tools market', icon: '📈' },
      { value: '<1ps', label: 'Timing margin budgets', icon: '⏱️' }
    ],
    examples: ['DDR5 memory interfaces', 'PCIe Gen5 backplanes', '400G Ethernet switches', 'AI accelerator boards'],
    companies: ['Ansys', 'Keysight', 'Siemens EDA', 'Altium'],
    futureImpact: 'Generative AI will enable first-pass SI success for 224G SerDes, reducing board respins from industry average of 3 to 1.',
    color: '#22c55e'
  }
];

// Phase type for internal state management
type SPICEPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface LLMToSPICERendererProps {
  gamePhase?: SPICEPhase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Sound utility for feedback
const playSound = (type: 'click' | 'success' | 'transition') => {
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
      transition: { freq: 500, duration: 0.15, type: 'sine' },
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

const LLMToSPICERenderer: React.FC<LLMToSPICERendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: SPICEPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<SPICEPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Stability',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  // Internal phase state management
  const getInitialPhase = (): SPICEPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<SPICEPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation refs for debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [targetVoltage, setTargetVoltage] = useState(3.3);
  const [loadCurrent, setLoadCurrent] = useState(500);
  const [rippleTarget, setRippleTarget] = useState(50);
  const [phaseMarginTarget, setPhaseMarginTarget] = useState(45);
  const [iterationCount, setIterationCount] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [currentDesign, setCurrentDesign] = useState({
    inductance: 10,
    capacitance: 100,
    frequency: 500,
    feedbackResistor: 10,
  });
  const [simResults, setSimResults] = useState({
    outputVoltage: 0,
    ripple: 0,
    efficiency: 0,
    phaseMargin: 0,
    stable: false,
  });

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
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

  // Colors
  const colors = {
    primary: '#8b5cf6', // purple-500
    primaryDark: '#7c3aed',
    secondary: '#f59e0b',
    success: '#22c55e',
    danger: '#ef4444',
    bgDark: '#0f172a',
    bgCard: '#1e293b',
    border: '#475569',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0', // Changed from #94a3b8 for better contrast
  };

  // Navigation function
  const goToPhase = useCallback((p: SPICEPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Simulate the buck converter physics
  const runSimulation = useCallback(() => {
    setSimRunning(true);
    setIterationCount(prev => prev + 1);

    const { inductance, capacitance, frequency, feedbackResistor } = currentDesign;
    const L = inductance * 1e-6;
    const C = capacitance * 1e-6;
    const f = frequency * 1e3;
    const Vin = 12;

    const D = targetVoltage / Vin;
    const Vout = Vin * D;
    const deltaI = (Vin - targetVoltage) * D / (L * f);
    const deltaV = deltaI / (8 * f * C) * 1000;

    const Rds = 0.01;
    const Pconduction = Math.pow(loadCurrent / 1000, 2) * Rds;
    const Pswitching = 0.5 * Vin * (loadCurrent / 1000) * 10e-9 * f;
    const Pout = targetVoltage * (loadCurrent / 1000);
    const efficiency = Pout / (Pout + Pconduction + Pswitching) * 100;

    const fc = 1 / (2 * Math.PI * feedbackResistor * 1e3 * C);
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    const phaseMargin = 90 - Math.atan2(fc, f0) * 180 / Math.PI - 45 * (fc / f0);
    const stablePhaseMargin = Math.max(0, Math.min(90, phaseMargin + 30 + Math.random() * 10));

    setTimeout(() => {
      setSimResults({
        outputVoltage: Vout * (0.98 + Math.random() * 0.04),
        ripple: deltaV * (0.9 + Math.random() * 0.2),
        efficiency: Math.min(98, efficiency * (0.95 + Math.random() * 0.1)),
        phaseMargin: stablePhaseMargin,
        stable: stablePhaseMargin > 30,
      });
      setSimRunning(false);
    }, 1500);
  }, [currentDesign, targetVoltage, loadCurrent]);

  const predictions = [
    { id: 'perfect', label: 'LLM will generate a perfect working design on the first try' },
    { id: 'iterate', label: 'LLM generates reasonable starting point, but needs simulation feedback to converge' },
    { id: 'useless', label: 'LLM cannot help with circuit design at all' },
    { id: 'validator', label: 'LLM should validate the simulation results' },
  ];

  const twistPredictions = [
    { id: 'llm_knows', label: 'The LLM already knows all the stability math' },
    { id: 'sim_truth', label: 'Only SPICE simulation reveals actual phase margin behavior' },
    { id: 'both_equal', label: 'LLM and simulation provide equally valid answers' },
    { id: 'unnecessary', label: 'Phase margin analysis is unnecessary for modern designs' },
  ];

  const transferApplications = [
    {
      title: 'PCB Layout Generation',
      description: 'LLMs can suggest component placement but cannot predict electromagnetic interference.',
      question: 'Why must LLM-generated PCB layouts be validated with EM simulation?',
      answer: 'Parasitic inductance, capacitance, and coupling depend on physical geometry that LLMs cannot compute. A trace routing that "looks right" may create ground loops, crosstalk, or antenna effects that only field solvers can reveal.',
    },
    {
      title: 'Analog IC Design',
      description: 'Operational amplifier design requires careful balancing of gain, bandwidth, and stability.',
      question: 'What role can LLMs play in analog IC design workflows?',
      answer: 'LLMs can suggest topology choices, initial component ratios, and bias points based on specs. But transistor-level SPICE simulation is essential because process variation, temperature effects, and nonlinearities determine actual performance.',
    },
    {
      title: 'RF Filter Design',
      description: 'Radio frequency filters require precise component values for target frequency response.',
      question: 'Why is physics simulation non-negotiable for RF circuit design?',
      answer: 'At RF frequencies, every wire is an inductor and every pad is a capacitor. Component parasitics, skin effect, and board dielectric properties shift filter response. Only EM simulation captures these effects accurately.',
    },
    {
      title: 'Power Integrity Analysis',
      description: 'High-speed digital systems require careful power delivery network design.',
      question: 'How does the LLM-to-simulation workflow apply to power integrity?',
      answer: 'LLMs can suggest decoupling capacitor values and placement strategies. But actual impedance profiles depend on PCB stackup, via inductance, and plane resonances. SPICE or specialized PDN tools validate the design meets impedance targets.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the primary role of SPICE simulation in circuit design?',
      options: [
        { text: 'To generate creative circuit ideas', correct: false },
        { text: 'To solve circuit equations and predict actual behavior', correct: true },
        { text: 'To replace the need for prototyping entirely', correct: false },
        { text: 'To write documentation for circuits', correct: false },
      ],
    },
    {
      question: 'Phase margin in a feedback system indicates:',
      options: [
        { text: 'The power efficiency of the circuit', correct: false },
        { text: 'How close the system is to oscillation/instability', correct: true },
        { text: 'The maximum output voltage', correct: false },
        { text: 'The cost of components', correct: false },
      ],
    },
    {
      question: 'A buck converter with insufficient phase margin will:',
      options: [
        { text: 'Have higher efficiency', correct: false },
        { text: 'Oscillate or have excessive ringing', correct: true },
        { text: 'Produce lower output voltage', correct: false },
        { text: 'Use less power', correct: false },
      ],
    },
    {
      question: 'Why can LLMs generate plausible but incorrect circuit designs?',
      options: [
        { text: 'LLMs are trained on wrong data', correct: false },
        { text: 'LLMs predict likely text, not solve physics equations', correct: true },
        { text: 'Circuit design is too simple for LLMs', correct: false },
        { text: 'LLMs cannot read schematics', correct: false },
      ],
    },
    {
      question: 'The feedback loop in an LLM-to-SPICE workflow involves:',
      options: [
        { text: 'LLM generates design, SPICE validates, results inform next iteration', correct: true },
        { text: 'SPICE generates the circuit, LLM validates it', correct: false },
        { text: 'Both run independently with no interaction', correct: false },
        { text: 'LLM replaces the need for SPICE', correct: false },
      ],
    },
    {
      question: 'Output ripple in a switching regulator is reduced by:',
      options: [
        { text: 'Increasing switching frequency or output capacitance', correct: true },
        { text: 'Decreasing the inductor value', correct: false },
        { text: 'Reducing the input voltage', correct: false },
        { text: 'Using smaller capacitors', correct: false },
      ],
    },
    {
      question: 'A Bode plot shows:',
      options: [
        { text: 'Time-domain waveforms', correct: false },
        { text: 'Gain and phase vs frequency', correct: true },
        { text: 'Component costs vs quantity', correct: false },
        { text: 'Power vs efficiency', correct: false },
      ],
    },
    {
      question: 'SPICE netlist contains:',
      options: [
        { text: 'Marketing descriptions of components', correct: false },
        { text: 'Component values and connections (circuit topology)', correct: true },
        { text: 'Manufacturing instructions', correct: false },
        { text: 'Test procedures', correct: false },
      ],
    },
    {
      question: 'The value of LLM-assisted circuit design is:',
      options: [
        { text: 'LLMs can replace simulation entirely', correct: false },
        { text: 'LLMs accelerate iteration by generating starting points quickly', correct: true },
        { text: 'LLMs guarantee correct designs', correct: false },
        { text: 'LLMs are better at math than simulators', correct: false },
      ],
    },
    {
      question: 'Physics-based simulation is the "truth source" because:',
      options: [
        { text: 'Simulators are trained on more data', correct: false },
        { text: 'Simulators solve the actual governing equations', correct: true },
        { text: 'LLMs cannot generate SPICE files', correct: false },
        { text: 'Simulation is faster than LLM inference', correct: false },
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        gap: isMobile ? '8px' : '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i < currentIdx && goToPhase(p)}
              style={{
                height: isMobile ? '8px' : '10px',
                width: i === currentIdx ? (isMobile ? '16px' : '24px') : (isMobile ? '8px' : '10px'),
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                cursor: i < currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s',
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
          {currentIdx + 1} / {phaseOrder.length}
        </span>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Next') => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: isMobile ? '10px 16px' : '12px 24px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: canBack ? colors.textPrimary : colors.textSecondary,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5,
            fontWeight: 600,
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textSecondary }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '12px 28px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: canGoNext ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : colors.border,
            color: colors.textPrimary,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.5,
            fontWeight: 700,
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = () => {
    const passVoltage = Math.abs(simResults.outputVoltage - targetVoltage) < 0.1;
    const passRipple = simResults.ripple < rippleTarget;
    const passPhase = simResults.phaseMargin >= phaseMarginTarget;
    const allPass = passVoltage && passRipple && passPhase && simResults.stable;

    return (
      <svg width="100%" height="500" viewBox="0 0 500 500" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="llmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="spiceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        <rect width="500" height="500" fill="#0f172a" rx="12" />

        <text x="250" y="30" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">
          LLM to SPICE Pipeline
        </text>

        <g transform="translate(20, 50)">
          <rect width="140" height="100" fill="rgba(59, 130, 246, 0.2)" rx="8" stroke="#3b82f6" strokeWidth="2" />
          <text x="70" y="20" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">SPECS</text>
          <text x="10" y="40" fill="#e2e8f0" fontSize="9">Vout: {targetVoltage}V</text>
          <text x="10" y="55" fill="#e2e8f0" fontSize="9">Iload: {loadCurrent}mA</text>
          <text x="10" y="70" fill="#e2e8f0" fontSize="9">Ripple: &lt;{rippleTarget}mV</text>
          <text x="10" y="85" fill="#e2e8f0" fontSize="9">Phase: &gt;{phaseMarginTarget} deg</text>
        </g>

        <path d="M 170 100 L 190 100" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

        <g transform="translate(200, 50)">
          <rect width="140" height="100" fill="url(#llmGrad)" rx="8" opacity="0.3" />
          <rect width="140" height="100" fill="none" rx="8" stroke="#8b5cf6" strokeWidth="2" />
          <text x="70" y="20" fill="#8b5cf6" fontSize="11" fontWeight="bold" textAnchor="middle">LLM GENERATOR</text>
          <text x="70" y="45" fill="#f8fafc" fontSize="9" textAnchor="middle">Generates netlist</text>
          <text x="70" y="60" fill="#f8fafc" fontSize="9" textAnchor="middle">+ testbench</text>
          <text x="70" y="80" fill="#e2e8f0" fontSize="9" textAnchor="middle">Iteration: {iterationCount}</text>
        </g>

        <path d="M 350 100 L 370 100" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

        <g transform="translate(340, 50)">
          <rect width="140" height="100" fill="url(#spiceGrad)" rx="8" opacity="0.3" />
          <rect width="140" height="100" fill="none" rx="8" stroke="#f59e0b" strokeWidth="2" />
          <text x="70" y="20" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">SPICE SIMULATOR</text>
          <text x="70" y="45" fill="#f8fafc" fontSize="9" textAnchor="middle">Solves physics</text>
          <text x="70" y="60" fill="#f8fafc" fontSize="9" textAnchor="middle">(truth source)</text>
          {simRunning && (
            <text x="70" y="80" fill="#f59e0b" fontSize="9" textAnchor="middle">Running...</text>
          )}
        </g>

        <g transform="translate(20, 170)">
          <rect width="220" height="90" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="110" y="18" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">CURRENT DESIGN</text>
          <text x="10" y="38" fill="#e2e8f0" fontSize="9">L = {currentDesign.inductance} uH</text>
          <text x="10" y="53" fill="#e2e8f0" fontSize="9">C = {currentDesign.capacitance} uF</text>
          <text x="120" y="38" fill="#e2e8f0" fontSize="9">f = {currentDesign.frequency} kHz</text>
          <text x="120" y="53" fill="#e2e8f0" fontSize="9">R_fb = {currentDesign.feedbackResistor} kOhm</text>

          <g transform="translate(30, 60)">
            <line x1="0" y1="10" x2="30" y2="10" stroke="#8b5cf6" strokeWidth="2" />
            <rect x="30" y="5" width="20" height="10" fill="none" stroke="#8b5cf6" strokeWidth="2" />
            <line x1="50" y1="10" x2="80" y2="10" stroke="#8b5cf6" strokeWidth="2" />
            <line x1="80" y1="10" x2="80" y2="25" stroke="#8b5cf6" strokeWidth="2" />
            <line x1="75" y1="25" x2="85" y2="25" stroke="#8b5cf6" strokeWidth="2" />
            <line x1="75" y1="28" x2="85" y2="28" stroke="#8b5cf6" strokeWidth="2" />
            <text x="40" y="0" fill="#e2e8f0" fontSize="8" textAnchor="middle">L</text>
            <text x="95" y="20" fill="#e2e8f0" fontSize="8">C</text>
          </g>
        </g>

        <g transform="translate(260, 170)">
          <rect width="220" height="90" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="110" y="18" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">SIM RESULTS</text>

          {iterationCount > 0 ? (
            <>
              <text x="10" y="38" fill={passVoltage ? '#22c55e' : '#ef4444'} fontSize="9">
                Vout: {simResults.outputVoltage.toFixed(2)}V {passVoltage ? 'PASS' : 'FAIL'}
              </text>
              <text x="10" y="53" fill={passRipple ? '#22c55e' : '#ef4444'} fontSize="9">
                Ripple: {simResults.ripple.toFixed(1)}mV {passRipple ? 'PASS' : 'FAIL'}
              </text>
              <text x="10" y="68" fill="#e2e8f0" fontSize="9">
                Efficiency: {simResults.efficiency.toFixed(1)}%
              </text>
              <text x="10" y="83" fill={passPhase ? '#22c55e' : '#ef4444'} fontSize="9">
                Phase Margin: {simResults.phaseMargin.toFixed(0)} deg {passPhase ? 'PASS' : 'FAIL'}
              </text>
            </>
          ) : (
            <text x="110" y="55" fill="#475569" fontSize="10" textAnchor="middle">Run simulation to see results</text>
          )}
        </g>

        <g transform="translate(20, 280)">
          <rect width="220" height="100" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="110" y="18" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">BODE PLOT (Phase)</text>

          <g transform="translate(20, 30)">
            <line x1="0" y1="50" x2="180" y2="50" stroke="#475569" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="50" stroke="#475569" strokeWidth="1" />

            <path
              d={`M 0 25 Q 40 25 80 ${25 + (90 - simResults.phaseMargin) * 0.3} Q 120 ${40 + (90 - simResults.phaseMargin) * 0.2} 180 45`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
            />

            <line x1="100" y1="50" x2="100" y2={25 + (90 - simResults.phaseMargin) * 0.3} stroke="#22c55e" strokeWidth="1" strokeDasharray="4,2" />

            <text x="90" y="65" fill="#e2e8f0" fontSize="9">f_c</text>
            <text x="180" y="65" fill="#e2e8f0" fontSize="9">freq</text>
            <text x="-15" y="5" fill="#e2e8f0" fontSize="9">0</text>
            <text x="-20" y="55" fill="#e2e8f0" fontSize="9">-180</text>
          </g>
        </g>

        <g transform="translate(260, 280)">
          <rect
            width="220"
            height="100"
            fill={allPass ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
            rx="8"
            stroke={allPass ? '#22c55e' : '#ef4444'}
            strokeWidth="2"
          />
          <text x="110" y="25" fill={allPass ? '#22c55e' : '#ef4444'} fontSize="14" fontWeight="bold" textAnchor="middle">
            {iterationCount === 0 ? 'WAITING' : allPass ? 'ALL SPECS MET' : 'ITERATE NEEDED'}
          </text>
          {iterationCount > 0 && !allPass && (
            <text x="110" y="50" fill="#e2e8f0" fontSize="10" textAnchor="middle">
              Adjust design parameters
            </text>
          )}
          {iterationCount > 0 && (
            <text x="110" y="75" fill="#e2e8f0" fontSize="9" textAnchor="middle">
              {simResults.stable ? 'Control loop is stable' : 'WARNING: Potential instability'}
            </text>
          )}
        </g>

        <g transform="translate(250, 400)">
          <path d="M 200 0 L 200 30 L -180 30 L -180 -230 L -150 -230" fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="5,3" />
          <text x="10" y="45" fill="#e2e8f0" fontSize="9" textAnchor="middle">Feedback loop: results inform next iteration</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Target Voltage: {targetVoltage}V
          </label>
          <input
            type="range"
            min="1.8"
            max="5"
            step="0.1"
            value={targetVoltage}
            onChange={(e) => setTargetVoltage(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Load Current: {loadCurrent}mA
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={loadCurrent}
            onChange={(e) => setLoadCurrent(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid #8b5cf6' }}>
        <h4 style={{ color: '#8b5cf6', marginBottom: '12px' }}>Adjust Design (LLM would generate these):</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ color: '#e2e8f0', fontSize: '12px' }}>Inductance: {currentDesign.inductance}uH</label>
            <input
              type="range"
              min="1"
              max="47"
              step="1"
              value={currentDesign.inductance}
              onChange={(e) => setCurrentDesign({ ...currentDesign, inductance: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ color: '#e2e8f0', fontSize: '12px' }}>Capacitance: {currentDesign.capacitance}uF</label>
            <input
              type="range"
              min="22"
              max="470"
              step="10"
              value={currentDesign.capacitance}
              onChange={(e) => setCurrentDesign({ ...currentDesign, capacitance: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ color: '#e2e8f0', fontSize: '12px' }}>Frequency: {currentDesign.frequency}kHz</label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={currentDesign.frequency}
              onChange={(e) => setCurrentDesign({ ...currentDesign, frequency: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ color: '#e2e8f0', fontSize: '12px' }}>Feedback R: {currentDesign.feedbackResistor}kOhm</label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={currentDesign.feedbackResistor}
              onChange={(e) => setCurrentDesign({ ...currentDesign, feedbackResistor: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={runSimulation}
        disabled={simRunning}
        style={{
          padding: '16px',
          borderRadius: '8px',
          border: 'none',
          background: simRunning ? '#475569' : '#f59e0b',
          color: 'white',
          fontWeight: 'bold',
          cursor: simRunning ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      >
        {simRunning ? 'Running SPICE Simulation...' : 'Run SPICE Simulation'}
      </button>
    </div>
  );

  // Render wrapper with progress bar and bottom navigation
  const renderPhaseContent = (content: React.ReactNode, canGoNext: boolean, nextLabel: string = 'Next') => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '70px' }}>
        {content}
      </div>
      {renderBottomBar(canGoNext, nextLabel)}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#8b5cf6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI + Circuit Design</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LLM to SPICE Pipeline
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '18px', marginTop: '8px' }}>
              Can an LLM design a regulator that actually meets specs?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #8b5cf6' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              LLMs can generate SPICE netlists that look correct. But circuit physics does not care about plausibility - it cares about equations. What happens when we close the loop between AI generation and physics simulation?
            </p>
          </div>
        </div>
      </div>,
      true,
      'Make a Prediction'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

          {/* Static SVG visualization for prediction context */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ maxWidth: '400px' }}>
              <rect width="400" height="200" fill="#0f172a" rx="8" />
              <text x="200" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">LLM Circuit Design Workflow</text>

              {/* LLM Box */}
              <rect x="30" y="60" width="100" height="60" fill="rgba(139, 92, 246, 0.2)" rx="8" stroke="#8b5cf6" strokeWidth="2" />
              <text x="80" y="85" fill="#8b5cf6" fontSize="11" fontWeight="bold" textAnchor="middle">LLM</text>
              <text x="80" y="105" fill="#e2e8f0" fontSize="9" textAnchor="middle">Generates design</text>

              {/* Arrow */}
              <path d="M 140 90 L 160 90" stroke="#475569" strokeWidth="2" />
              <polygon points="160,90 155,85 155,95" fill="#475569" />

              {/* Question Box */}
              <rect x="170" y="60" width="60" height="60" fill="rgba(245, 158, 11, 0.2)" rx="8" stroke="#f59e0b" strokeWidth="2" />
              <text x="200" y="95" fill="#f59e0b" fontSize="24" textAnchor="middle">?</text>

              {/* Arrow */}
              <path d="M 240 90 L 260 90" stroke="#475569" strokeWidth="2" />
              <polygon points="260,90 255,85 255,95" fill="#475569" />

              {/* SPICE Box */}
              <rect x="270" y="60" width="100" height="60" fill="rgba(34, 197, 94, 0.2)" rx="8" stroke="#22c55e" strokeWidth="2" />
              <text x="320" y="85" fill="#22c55e" fontSize="11" fontWeight="bold" textAnchor="middle">SPICE</text>
              <text x="320" y="105" fill="#e2e8f0" fontSize="9" textAnchor="middle">Validates physics</text>

              <text x="200" y="160" fill="#e2e8f0" fontSize="11" textAnchor="middle">What happens when LLM output meets physics simulation?</text>
              <text x="200" y="180" fill="#8b5cf6" fontSize="10" textAnchor="middle">Make your prediction below</text>
            </svg>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px' }}>
              If you ask an LLM to design a buck converter that outputs 3.3V from 12V input with less than 50mV ripple, what should you expect?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  minHeight: '44px',
                  borderRadius: '12px',
                  border: prediction === p.id ? '2px solid #8b5cf6' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      prediction !== null,
      'Test My Prediction'
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Design & Simulate</h2>
          <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
            Adjust design parameters and run SPICE to see if specs are met
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Try These Experiments:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Run the simulation with default values - do they pass?</li>
              <li>Increase capacitance to reduce ripple</li>
              <li>Adjust feedback resistor - watch phase margin change</li>
              <li>See how many iterations to meet all specs</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #8b5cf6' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '12px' }}>Real-World Relevance</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
              This LLM-to-SPICE workflow powers modern electronics design at companies like Texas Instruments and Analog Devices.
              Engineers use AI to rapidly explore design spaces, but physics simulation remains the ultimate truth source.
              Every phone charger, laptop power supply, and electric vehicle uses buck converters designed with this exact methodology.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Review the Concepts'
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'iterate';

    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'Not Quite!'}
            </h3>
            <p>
              LLMs excel at generating plausible starting points but cannot solve the differential equations that govern circuit behavior. SPICE is the truth source - it solves physics. The value is in the iteration loop.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '16px' }}>LLM as Generator, SPICE as Validator</h3>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>What LLMs Do Well:</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '20px' }}>
                <li>Generate syntactically correct SPICE netlists</li>
                <li>Suggest reasonable component values from prior examples</li>
                <li>Create testbenches for different analyses</li>
                <li>Iterate quickly based on simulation feedback</li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>What SPICE Provides:</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '20px' }}>
                <li>Actual solutions to circuit differential equations</li>
                <li>Accurate prediction of voltages, currents, stability</li>
                <li>Ground truth that cannot be hallucinated</li>
                <li>Pass/fail verdict against specifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>,
      true,
      'Next: A Twist!'
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>The Twist: Stability Analysis</h2>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px' }}>
              A circuit can have the right output voltage and acceptable ripple but still oscillate wildly under load transients. Bode plot analysis reveals phase margin - how close to instability the control loop is.
            </p>
            <p style={{ fontSize: '16px' }}>
              Who should determine if the phase margin is adequate?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      twistPrediction !== null,
      'Test My Prediction'
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Stability Check</h2>
          <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
            Adjust the feedback loop and see how phase margin changes
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #f59e0b' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Phase Margin Guidelines:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li><strong>&gt;60 deg:</strong> Overdamped, slow but very stable</li>
              <li><strong>45-60 deg:</strong> Good balance of speed and stability</li>
              <li><strong>30-45 deg:</strong> Acceptable but may ring on transients</li>
              <li><strong>&lt;30 deg:</strong> Dangerous - oscillation likely</li>
            </ul>
          </div>
        </div>
      </div>,
      true,
      'See the Explanation'
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'sim_truth';

    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p>
              Only SPICE simulation (or actual measurement) can reveal the true phase margin. LLMs may know the theory but cannot compute the specific transfer functions for a given design with all its parasitics.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Stability Truth</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
              A design that meets DC specifications can still fail dynamically. Phase margin depends on the exact component values, parasitics, and operating conditions. This is why "looks correct" from an LLM is not the same as "works correctly" from simulation. Real feedback is irreplaceable.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Apply This Knowledge'
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
            LLM + Simulation workflows across hardware design
          </p>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #475569',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: '#f8fafc' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>Complete</span>}
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#8b5cf6', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #8b5cf6',
                    background: 'transparent',
                    color: '#8b5cf6',
                    cursor: 'pointer',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e', marginBottom: '12px' }}>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                  </div>
                  <button
                    style={{
                      padding: '10px 20px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#22c55e',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>,
      transferCompleted.size >= 4,
      'Take the Test'
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <div style={{ color: '#f8fafc', padding: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      background: opt.correct ? 'rgba(34, 197, 94, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#94a3b8',
                    }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>,
        testScore >= 8,
        testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const allAnswered = !testAnswers.includes(null);

    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Knowledge Test</h2>
            <span style={{ color: '#e2e8f0' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#8b5cf6' : i === currentTestQuestion ? '#94a3b8' : '#475569',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px' }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #8b5cf6' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#8b5cf6',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={!allAnswered}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: allAnswered ? '#22c55e' : '#475569',
                  color: 'white',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>,
      false
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
            You understand the LLM-to-SPICE workflow
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>LLMs generate plausible designs, not correct designs</li>
              <li>SPICE simulation is the physics truth source</li>
              <li>Iteration loop: generate, simulate, feedback, refine</li>
              <li>Phase margin and stability analysis</li>
              <li>Bode plots reveal control loop behavior</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>The Bigger Picture:</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
              This pattern - AI generates, physics validates - applies broadly. LLMs cannot compute, they approximate. Whenever physical correctness matters (circuits, structures, chemistry), simulation or measurement must close the loop.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Complete'
    );
  }

  return null;
};

export default LLMToSPICERenderer;
