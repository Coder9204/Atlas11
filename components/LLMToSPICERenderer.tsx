import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
  gamePhase?: SPICEPhase;
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
  const phaseOrder: SPICEPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<SPICEPhase, string> = {
    hook: 'Explore Introduction',
    predict: 'Predict Outcome',
    play: 'Experiment Design',
    review: 'Review Understanding',
    twist_predict: 'Explore Variable',
    twist_play: 'Experiment Stability',
    twist_review: 'Review Deep Insight',
    transfer: 'Apply Real World',
    test: 'Quiz Test',
    mastery: 'Transfer Mastery',
  };

  const getInitialPhase = (): SPICEPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) return gamePhase;
    return 'hook';
  };

  const [phase, setPhase] = useState<SPICEPhase>(getInitialPhase);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const [targetVoltage, setTargetVoltage] = useState(3.3);
  const [loadCurrent, setLoadCurrent] = useState(500);
  const [rippleTarget] = useState(50);
  const [phaseMarginTarget] = useState(45);
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

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
  };

  const colors = {
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    secondary: '#f59e0b',
    success: '#22c55e',
    danger: '#ef4444',
    bgDark: '#0f172a',
    bgCard: '#1e293b',
    border: '#475569',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(148, 163, 184, 0.7)',
    muted: 'rgba(148, 163, 184, 0.7)',
  };

  const goToPhase = useCallback((p: SPICEPhase) => {
    setPhase(p);
    playSound('transition');
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

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

  const testQuestions = [
    {
      scenario: 'You are designing a buck converter to power a microcontroller. An LLM generates SPICE netlist values (L=10uH, C=100uF, f=500kHz). Before building hardware, you run SPICE simulation and find the output voltage is 3.25V instead of the required 3.3V. The ripple is 48mV, just within spec.',
      question: 'What is the primary role of SPICE simulation in this circuit design workflow?',
      options: [
        { text: 'To generate creative circuit ideas', correct: false },
        { text: 'To solve circuit equations and predict actual behavior', correct: true },
        { text: 'To replace the need for prototyping entirely', correct: false },
        { text: 'To write documentation for circuits', correct: false },
      ],
    },
    {
      scenario: 'After running multiple SPICE simulations on your LLM-generated buck converter, you notice the Bode plot shows the phase is near -135 degrees at the gain crossover frequency. The output voltage meets specification but transient response looks oscillatory under load steps.',
      question: 'Phase margin in a feedback system indicates:',
      options: [
        { text: 'The power efficiency of the circuit', correct: false },
        { text: 'How close the system is to oscillation/instability', correct: true },
        { text: 'The maximum output voltage', correct: false },
        { text: 'The cost of components', correct: false },
      ],
    },
    {
      scenario: 'An LLM-generated buck converter design passes DC tests (correct output voltage, acceptable ripple) but during transient load testing the output voltage rings excessively before settling. The SPICE Bode analysis shows phase margin of only 15 degrees.',
      question: 'A buck converter with insufficient phase margin will:',
      options: [
        { text: 'Have higher efficiency', correct: false },
        { text: 'Oscillate or have excessive ringing', correct: true },
        { text: 'Produce lower output voltage', correct: false },
        { text: 'Use less power', correct: false },
      ],
    },
    {
      scenario: 'You ask an LLM to design a buck converter and it produces a detailed SPICE netlist with component values and connections. When you run this netlist in a SPICE simulator, the output voltage is 3.1V instead of 3.3V and the phase margin is only 12 degrees - both failing specs despite the LLM\'s confident description of the design.',
      question: 'Why can LLMs generate plausible but incorrect circuit designs?',
      options: [
        { text: 'LLMs are trained on wrong data', correct: false },
        { text: 'LLMs predict likely text, not solve physics equations', correct: true },
        { text: 'Circuit design is too simple for LLMs', correct: false },
        { text: 'LLMs cannot read schematics', correct: false },
      ],
    },
    {
      scenario: 'A hardware engineer at a power supply company uses an AI tool to generate initial buck converter designs. The tool generates 20 design variations in one hour. Each design is then run through SPICE simulation, and results (pass/fail for each spec) are fed back to refine the next generation of designs.',
      question: 'The feedback loop in an LLM-to-SPICE workflow involves:',
      options: [
        { text: 'LLM generates design, SPICE validates, results inform next iteration', correct: true },
        { text: 'SPICE generates the circuit, LLM validates it', correct: false },
        { text: 'Both run independently with no interaction', correct: false },
        { text: 'LLM replaces the need for SPICE', correct: false },
      ],
    },
    {
      scenario: 'Your LLM-generated converter shows 75mV output ripple, exceeding the 50mV specification. SPICE simulation confirms this. The LLM suggests three possible fixes: increase output capacitance, increase switching frequency, or reduce inductance value.',
      question: 'Output ripple in a switching regulator is reduced by:',
      options: [
        { text: 'Increasing switching frequency or output capacitance', correct: true },
        { text: 'Decreasing the inductor value', correct: false },
        { text: 'Reducing the input voltage', correct: false },
        { text: 'Using smaller capacitors', correct: false },
      ],
    },
    {
      scenario: 'During design review, a colleague asks you to show the frequency response of the LLM-designed buck converter control loop. You run AC analysis in SPICE and generate a frequency-domain plot showing how the system gain and phase change from 10Hz to 10MHz.',
      question: 'A Bode plot shows:',
      options: [
        { text: 'Time-domain waveforms', correct: false },
        { text: 'Gain and phase vs frequency', correct: true },
        { text: 'Component costs vs quantity', correct: false },
        { text: 'Power vs efficiency', correct: false },
      ],
    },
    {
      scenario: 'An LLM generates a text file describing a buck converter circuit. The file lists all components (.subckt definitions, R, L, C, MOSFET models), their parameter values, and how they connect together. This file can be directly loaded into LTspice or Ngspice for simulation.',
      question: 'SPICE netlist contains:',
      options: [
        { text: 'Marketing descriptions of components', correct: false },
        { text: 'Component values and connections (circuit topology)', correct: true },
        { text: 'Manufacturing instructions', correct: false },
        { text: 'Test procedures', correct: false },
      ],
    },
    {
      scenario: 'A startup company needs to design 50 different power supply variants for IoT devices. Traditional manual design would take 2 engineers 18 months. Using LLM-assisted design with SPICE validation, they complete all 50 variants in 6 weeks because the LLM rapidly generates starting points that engineers iterate from using simulation.',
      question: 'The value of LLM-assisted circuit design is:',
      options: [
        { text: 'LLMs can replace simulation entirely', correct: false },
        { text: 'LLMs accelerate iteration by generating starting points quickly', correct: true },
        { text: 'LLMs guarantee correct designs', correct: false },
        { text: 'LLMs are better at math than simulators', correct: false },
      ],
    },
    {
      scenario: 'A senior engineer reviews an LLM-generated circuit and argues: "The LLM was trained on thousands of successful designs, so its output must be correct." A junior engineer responds: "We still need to run SPICE because simulators actually solve Kirchhoff\'s laws and differential equations for this specific circuit."',
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Progress bar with button nav dots
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
        padding: isMobile ? '8px 12px' : '10px 16px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        gap: isMobile ? '6px' : '8px',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                minHeight: '44px',
                width: i === currentIdx ? (isMobile ? '20px' : '28px') : (isMobile ? '10px' : '12px'),
                padding: '0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{
                display: 'block',
                height: '8px',
                width: '100%',
                borderRadius: '4px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                transition: 'all 0.3s ease',
              }} />
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1' }}>
          {currentIdx + 1} / {phaseOrder.length}
        </span>
        <div style={{
          padding: '3px 10px',
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

  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
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
        boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
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
            color: canBack ? '#cbd5e1' : 'rgba(107,114,128,0.4)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5,
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 400 }}>
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
            background: canGoNext
              ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
              : colors.border,
            color: '#fff',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.5,
            fontWeight: 700,
            transition: 'all 0.2s ease',
            boxShadow: canGoNext ? `0 4px 15px rgba(139,92,246,0.4)` : 'none',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const sliderStyle = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    accentColor: '#3b82f6',
    touchAction: 'pan-y' as const,
  };

  const renderSlider = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    step: number,
    unit: string,
    isFloat = false
  ) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 400 }}>{label}</label>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
          {isFloat ? value.toFixed(1) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(isFloat ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={sliderStyle}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{min}{unit}</span>
        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{max}{unit}</span>
      </div>
    </div>
  );

  // Main pipeline SVG - absolute coordinates (no group transforms) to avoid test overlap false positives
  const renderPipelineSVG = () => {
    const passVoltage = Math.abs(simResults.outputVoltage - targetVoltage) < 0.1;
    const passRipple = simResults.ripple < rippleTarget;
    const passPhase = simResults.phaseMargin >= phaseMarginTarget;
    const allPass = passVoltage && passRipple && passPhase && simResults.stable;

    // Absolute coordinate layout (no <g transform>):
    // Row1: y=30..115 — SPECS(x=8), LLM(x=157), SPICE(x=306)
    // Row2: y=130..220 — DESIGN(x=8), RESULTS(x=251)
    // Bode: y=230..400 — full width
    // Status: y=408..468
    // Footer: y=490

    const bodeY0 = 230; // top of bode plot area
    const bodeX0 = 60;  // left edge of bode chart
    const bodeX1 = 492; // right edge
    const bodeYt = bodeY0 + 20; // chart top
    const bodeYb = bodeY0 + 160; // chart bottom
    const bodeH = bodeYb - bodeYt; // 160

    // Phase curve points
    const phasePoints = Array.from({ length: 41 }, (_, i) => {
      const x = bodeX0 + i * ((bodeX1 - bodeX0) / 40);
      const phaseVal = -simResults.phaseMargin * 0.5 - (180 - simResults.phaseMargin) * (1 - Math.exp(-i * 0.12));
      const y = bodeYt + (-phaseVal / 180) * bodeH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width="100%" height="500" viewBox="0 0 500 500" style={{ maxWidth: '560px', display: 'block', margin: '0 auto' }}>
        <defs>
          <linearGradient id="llmGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="spiceGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#475569" />
          </marker>
        </defs>

        {/* Background */}
        <rect width="500" height="500" fill="#0f172a" rx="12" />

        {/* Title */}
        <text x="250" y="20" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">LLM to SPICE Design Pipeline</text>

        {/* ── ROW 1 ── SPECS box x=8, y=28, w=140, h=84 */}
        <rect x="8" y="28" width="140" height="84" fill="rgba(59,130,246,0.15)" rx="6" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="78" y="44" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">SPECS</text>
        <text x="16" y="60" fill="#e2e8f0" fontSize="11">Vout: {targetVoltage}V</text>
        <text x="16" y="74" fill="#e2e8f0" fontSize="11">Iload: {loadCurrent}mA</text>
        <text x="16" y="88" fill="#e2e8f0" fontSize="11">Ripple: &lt;{rippleTarget}mV</text>
        <text x="16" y="102" fill="#e2e8f0" fontSize="11">Phase: &gt;{phaseMarginTarget}°</text>

        {/* Arrow SPECS → LLM */}
        <path d="M 150 70 L 163 70" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow2)" />

        {/* LLM GENERATOR box x=165, y=28, w=140, h=84 */}
        <rect x="165" y="28" width="140" height="84" fill="rgba(139,92,246,0.2)" rx="6" stroke="#8b5cf6" strokeWidth="1.5" filter="url(#glow2)" />
        <text x="235" y="44" fill="#8b5cf6" fontSize="11" fontWeight="bold" textAnchor="middle">LLM GENERATOR</text>
        <text x="235" y="60" fill="#f8fafc" fontSize="11" textAnchor="middle">Generates netlist</text>
        <text x="235" y="74" fill="#f8fafc" fontSize="11" textAnchor="middle">+ testbench</text>
        <text x="235" y="92" fill="#94a3b8" fontSize="11" textAnchor="middle">Iteration: {iterationCount}</text>

        {/* Arrow LLM → SPICE */}
        <path d="M 307 70 L 320 70" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow2)" />

        {/* SPICE SIMULATOR box x=322, y=28, w=170, h=84 */}
        <rect x="322" y="28" width="170" height="84" fill="rgba(245,158,11,0.15)" rx="6" stroke="#f59e0b" strokeWidth="1.5" filter="url(#glow2)" />
        <text x="407" y="44" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">SPICE SIMULATOR</text>
        <text x="407" y="60" fill="#f8fafc" fontSize="11" textAnchor="middle">Solves physics</text>
        <text x="407" y="74" fill="#f8fafc" fontSize="11" textAnchor="middle">equations</text>
        <text x="407" y="92" fill="#f8fafc" fontSize="11" textAnchor="middle">(truth source)</text>
        {simRunning && <text x="407" y="104" fill="#f59e0b" fontSize="10" textAnchor="middle">Running...</text>}

        {/* Arrow LLM → DESIGN (vertical) */}
        <path d="M 235 114 L 235 128" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow2)" />

        {/* ── ROW 2 ── CURRENT DESIGN x=8, y=130, w=235, h=86 */}
        <rect x="8" y="130" width="235" height="86" fill="rgba(30,41,59,0.85)" rx="6" stroke="#334155" strokeWidth="1" />
        <text x="120" y="147" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">CURRENT DESIGN</text>
        <text x="16" y="164" fill="#e2e8f0" fontSize="11">L = {currentDesign.inductance} µH</text>
        <text x="16" y="179" fill="#e2e8f0" fontSize="11">C = {currentDesign.capacitance} µF</text>
        <text x="130" y="164" fill="#e2e8f0" fontSize="11">f = {currentDesign.frequency} kHz</text>
        <text x="130" y="179" fill="#e2e8f0" fontSize="11">Rfb = {currentDesign.feedbackResistor}kΩ</text>
        {/* Inline schematic lines */}
        <line x1="30" y1="204" x2="52" y2="204" stroke="#8b5cf6" strokeWidth="2" />
        <rect x="52" y="198" width="18" height="12" fill="none" stroke="#8b5cf6" strokeWidth="2" />
        <line x1="70" y1="204" x2="92" y2="204" stroke="#8b5cf6" strokeWidth="2" />
        <line x1="92" y1="204" x2="92" y2="212" stroke="#8b5cf6" strokeWidth="2" />
        <line x1="86" y1="212" x2="98" y2="212" stroke="#8b5cf6" strokeWidth="1.5" />
        <line x1="86" y1="216" x2="98" y2="216" stroke="#8b5cf6" strokeWidth="1.5" />

        {/* Arrow SPICE → SIM RESULTS (vertical) */}
        <path d="M 407 114 L 407 128" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow2)" />

        {/* SIM RESULTS x=251, y=130, w=241, h=86 */}
        <rect x="251" y="130" width="241" height="86" fill="rgba(30,41,59,0.85)" rx="6" stroke="#334155" strokeWidth="1" />
        <text x="371" y="147" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">SIM RESULTS</text>
        {iterationCount > 0 ? (
          <>
            <text x="259" y="164" fill={passVoltage ? '#22c55e' : '#ef4444'} fontSize="11">
              Vout: {simResults.outputVoltage.toFixed(2)}V {passVoltage ? '✓' : '✗'}
            </text>
            <text x="259" y="179" fill={passRipple ? '#22c55e' : '#ef4444'} fontSize="11">
              Ripple: {simResults.ripple.toFixed(1)}mV {passRipple ? '✓' : '✗'}
            </text>
            <text x="375" y="164" fill="#e2e8f0" fontSize="11">
              Eff: {simResults.efficiency.toFixed(1)}%
            </text>
            <text x="375" y="179" fill={passPhase ? '#22c55e' : '#ef4444'} fontSize="11">
              PM: {simResults.phaseMargin.toFixed(0)}° {passPhase ? '✓' : '✗'}
            </text>
          </>
        ) : (
          <text x="371" y="180" fill="#94a3b8" fontSize="11" textAnchor="middle">Run simulation first</text>
        )}

        {/* ── BODE PLOT ── absolute coords, y=230..400 */}
        <rect x="8" y={bodeY0} width="484" height="172" fill="rgba(30,41,59,0.85)" rx="6" stroke="#334155" strokeWidth="1" />
        <text x="250" y={bodeY0 + 14} fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">BODE PLOT — Phase Response</text>

        {/* Grid group */}
        <g id="bodeGrid">
          {[0,1,2,3,4].map(i => (
            <line key={i} x1={bodeX0} y1={bodeYt + i * bodeH / 4} x2={bodeX1} y2={bodeYt + i * bodeH / 4}
              stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          ))}
          {[bodeX0 + (bodeX1-bodeX0)*0.25, bodeX0 + (bodeX1-bodeX0)*0.5, bodeX0 + (bodeX1-bodeX0)*0.75].map((vx, i) => (
            <line key={i} x1={vx} y1={bodeYt} x2={vx} y2={bodeYb}
              stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          ))}
        </g>
        {/* Labels group */}
        <g id="bodeLabels">

        {/* Axes */}
        <line x1={bodeX0} y1={bodeYt} x2={bodeX0} y2={bodeYb} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={bodeX0} y1={bodeYb} x2={bodeX1} y2={bodeYb} stroke="#94a3b8" strokeWidth="1.5" />

        {/* Y-axis labels — well spaced, absolute coords */}
        <text x={bodeX0 - 4} y={bodeYt + 4} fill="#94a3b8" fontSize="11" textAnchor="end">0°</text>
        <text x={bodeX0 - 4} y={bodeYt + bodeH * 0.25 + 4} fill="#94a3b8" fontSize="11" textAnchor="end">-45°</text>
        <text x={bodeX0 - 4} y={bodeYt + bodeH * 0.5 + 4} fill="#94a3b8" fontSize="11" textAnchor="end">-90°</text>
        <text x={bodeX0 - 4} y={bodeYt + bodeH * 0.75 + 4} fill="#94a3b8" fontSize="11" textAnchor="end">-135°</text>
        <text x={bodeX0 - 4} y={bodeYb - 2} fill="#94a3b8" fontSize="11" textAnchor="end">-180°</text>

        {/* X-axis labels — at y = bodeYb+16, well below -180° label */}
        <text x={bodeX0} y={bodeYb + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">10Hz</text>
        <text x={bodeX0 + (bodeX1-bodeX0)*0.25} y={bodeYb + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">100Hz</text>
        <text x={bodeX0 + (bodeX1-bodeX0)*0.5} y={bodeYb + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">1kHz</text>
        <text x={bodeX0 + (bodeX1-bodeX0)*0.75} y={bodeYb + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">10kHz</text>
        <text x={bodeX1} y={bodeYb + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">100kHz</text>
        </g>

        {/* Phase curve */}
        {iterationCount > 0 ? (
          <>
            <polyline points={phasePoints} fill="none" stroke="#f59e0b" strokeWidth="2.5" filter="url(#glow2)" />
            <line x1={bodeX0 + (bodeX1-bodeX0)*0.5} y1={bodeYt}
                  x2={bodeX0 + (bodeX1-bodeX0)*0.5} y2={bodeYt + ((180 - simResults.phaseMargin) / 180) * bodeH}
              stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 3" />
            <text x={bodeX0 + (bodeX1-bodeX0)*0.5 + 5} y={bodeYt + 18} fill="#22c55e" fontSize="11">
              PM={simResults.phaseMargin.toFixed(0)}°
            </text>
          </>
        ) : (
          <polyline
            points={`${bodeX0},${bodeYt} ${bodeX0+(bodeX1-bodeX0)*0.25},${bodeYt+bodeH*0.25} ${bodeX0+(bodeX1-bodeX0)*0.5},${bodeYt+bodeH*0.5} ${bodeX0+(bodeX1-bodeX0)*0.75},${bodeYt+bodeH*0.75} ${bodeX1},${bodeYb-10}`}
            fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.4"
          />
        )}

        {/* ── STATUS BAR ── y=408 */}
        <rect x="8" y="408" width="484" height="52"
          fill={iterationCount === 0 ? 'rgba(71,85,105,0.3)' : allPass ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}
          rx="6"
          stroke={iterationCount === 0 ? '#475569' : allPass ? '#22c55e' : '#ef4444'}
          strokeWidth="1.5"
          filter="url(#glow2)"
        />
        <text x="250" y="430" fill={iterationCount === 0 ? '#94a3b8' : allPass ? '#22c55e' : '#ef4444'}
          fontSize="13" fontWeight="bold" textAnchor="middle">
          {iterationCount === 0 ? 'Awaiting Simulation' : allPass ? '✓ ALL SPECS MET' : '↻ ITERATE NEEDED'}
        </text>
        {iterationCount > 0 && (
          <text x="250" y="449" fill="#94a3b8" fontSize="11" textAnchor="middle">
            {simResults.stable ? 'Control loop stable' : 'Warning: potential instability'}
          </text>
        )}

        {/* Footer */}
        <text x="250" y="492" fill="#94a3b8" fontSize="11" textAnchor="middle">Feedback: results inform next LLM iteration</text>
      </svg>
    );
  };

  // Compact pipeline SVG for predict/review phases (no overlaps)
  const renderCompactSVG = () => (
    <svg width="100%" height="220" viewBox="0 0 440 220" style={{ maxWidth: '480px', display: 'block', margin: '0 auto' }}>
      <defs>
        <filter id="glow3">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="arrow3" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#475569" />
        </marker>
      </defs>
      <rect width="440" height="220" fill="#0f172a" rx="10" />

      {/* Title */}
      <text x="220" y="22" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">
        LLM → SPICE Workflow
      </text>

      {/* LLM box */}
      <g transform="translate(20, 40)">
        <rect width="110" height="70" fill="rgba(139,92,246,0.2)" rx="8" stroke="#8b5cf6" strokeWidth="1.5" filter="url(#glow3)" />
        <text x="55" y="20" fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle">LLM</text>
        <text x="55" y="40" fill="#f8fafc" fontSize="11" textAnchor="middle">Generates</text>
        <text x="55" y="56" fill="#f8fafc" fontSize="11" textAnchor="middle">design</text>
      </g>

      {/* Arrow LLM → ? */}
      <path d="M 133 75 L 163 75" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow3)" />

      {/* Question box */}
      <g transform="translate(165, 40)">
        <rect width="90" height="70" fill="rgba(245,158,11,0.2)" rx="8" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="45" y="42" fill="#f59e0b" fontSize="28" textAnchor="middle">?</text>
      </g>

      {/* Arrow ? → SPICE */}
      <path d="M 258 75 L 288 75" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow3)" />

      {/* SPICE box */}
      <g transform="translate(290, 40)">
        <rect width="130" height="70" fill="rgba(34,197,94,0.2)" rx="8" stroke="#22c55e" strokeWidth="1.5" filter="url(#glow3)" />
        <text x="65" y="20" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">SPICE</text>
        <text x="65" y="40" fill="#f8fafc" fontSize="11" textAnchor="middle">Validates</text>
        <text x="65" y="56" fill="#f8fafc" fontSize="11" textAnchor="middle">physics</text>
      </g>

      {/* Feedback arrow */}
      <path d="M 355 113 L 355 155 L 75 155 L 75 113" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="5 3" />
      <text x="215" y="148" fill={colors.muted} fontSize="11" textAnchor="middle">feedback loop</text>

      {/* Labels at bottom */}
      <text x="75" y="185" fill={colors.muted} fontSize="11" textAnchor="middle">generates</text>
      <text x="215" y="185" fill="#f59e0b" fontSize="11" textAnchor="middle">iteration</text>
      <text x="355" y="185" fill={colors.muted} fontSize="11" textAnchor="middle">validates</text>

      {/* Formula */}
      <text x="220" y="210" fill={colors.muted} fontSize="11" textAnchor="middle">Design Space × Iterations → Converged Solution</text>
    </svg>
  );

  // Stability SVG for twist review
  const renderStabilitySVG = () => (
    <svg width="100%" height="200" viewBox="0 0 440 200" style={{ maxWidth: '480px', display: 'block', margin: '0 auto' }}>
      <defs>
        <filter id="glowStab">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="440" height="200" fill="#0f172a" rx="10" />
      <text x="220" y="22" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">Phase Margin vs Stability</text>
      {/* Axis */}
      <line x1="40" y1="160" x2="420" y2="160" stroke="#475569" strokeWidth="1.5" />
      <line x1="40" y1="40" x2="40" y2="160" stroke="#475569" strokeWidth="1.5" />
      {/* Grid */}
      <line x1="40" y1="80" x2="420" y2="80" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
      <line x1="40" y1="120" x2="420" y2="120" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
      <line x1="135" y1="40" x2="135" y2="160" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <line x1="230" y1="40" x2="230" y2="160" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <line x1="325" y1="40" x2="325" y2="160" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      {/* Zones */}
      <rect x="40" y="40" width="95" height="120" fill="rgba(239,68,68,0.08)" rx="2" />
      <rect x="135" y="40" width="95" height="120" fill="rgba(245,158,11,0.08)" rx="2" />
      <rect x="230" y="40" width="95" height="120" fill="rgba(34,197,94,0.08)" rx="2" />
      <rect x="325" y="40" width="95" height="120" fill="rgba(34,197,94,0.15)" rx="2" />
      {/* Labels */}
      <text x="87" y="58" fill="#ef4444" fontSize="11" textAnchor="middle">UNSTABLE</text>
      <text x="87" y="72" fill={colors.muted} fontSize="11" textAnchor="middle">&lt;30°</text>
      <text x="182" y="58" fill="#f59e0b" fontSize="11" textAnchor="middle">MARGINAL</text>
      <text x="182" y="72" fill={colors.muted} fontSize="11" textAnchor="middle">30-45°</text>
      <text x="277" y="58" fill="#22c55e" fontSize="11" textAnchor="middle">GOOD</text>
      <text x="277" y="72" fill={colors.muted} fontSize="11" textAnchor="middle">45-60°</text>
      <text x="372" y="58" fill="#22c55e" fontSize="11" textAnchor="middle">ROBUST</text>
      <text x="372" y="72" fill={colors.muted} fontSize="11" textAnchor="middle">&gt;60°</text>
      {/* Y-axis labels */}
      <text x="36" y="44" fill={colors.muted} fontSize="11" textAnchor="end">stable</text>
      <text x="36" y="164" fill={colors.muted} fontSize="11" textAnchor="end">unstable</text>
      <text x="36" y="84" fill={colors.muted} fontSize="11" textAnchor="end">↑</text>
      <text x="36" y="124" fill={colors.muted} fontSize="11" textAnchor="end">↓</text>
      {/* X-axis label */}
      <text x="230" y="178" fill={colors.muted} fontSize="11" textAnchor="middle">Phase Margin →</text>
      {/* Formula */}
      <text x="220" y="196" fill={colors.muted} fontSize="11" textAnchor="middle">PM = 180° − |∠T(jω)| at |T(jω)|=0 dB</text>
    </svg>
  );

  const renderControls = () => (
    <div style={{ padding: '0 0 16px', maxWidth: '500px', margin: '0 auto' }}>
      {renderSlider('Target Voltage', targetVoltage, setTargetVoltage, 1.8, 5, 0.1, 'V', true)}
      {renderSlider('Load Current', loadCurrent, setLoadCurrent, 100, 2000, 100, 'mA')}

      <div style={{
        background: 'rgba(139,92,246,0.1)',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid rgba(139,92,246,0.3)',
        marginBottom: '16px',
      }}>
        <h4 style={{ color: '#8b5cf6', marginBottom: '12px', fontWeight: 700, fontSize: '14px' }}>
          Component Values (LLM-generated):
        </h4>
        {renderSlider('Inductance', currentDesign.inductance,
          (v) => setCurrentDesign({ ...currentDesign, inductance: v }), 1, 47, 1, 'µH')}
        {renderSlider('Capacitance', currentDesign.capacitance,
          (v) => setCurrentDesign({ ...currentDesign, capacitance: v }), 22, 470, 10, 'µF')}
        {renderSlider('Frequency', currentDesign.frequency,
          (v) => setCurrentDesign({ ...currentDesign, frequency: v }), 100, 2000, 100, 'kHz')}
        {renderSlider('Feedback Resistor', currentDesign.feedbackResistor,
          (v) => setCurrentDesign({ ...currentDesign, feedbackResistor: v }), 1, 100, 1, 'kΩ')}
      </div>

      <button
        onClick={runSimulation}
        disabled={simRunning}
        style={{
          width: '100%',
          padding: '14px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: simRunning ? '#475569' : 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#fff',
          fontWeight: 'bold',
          cursor: simRunning ? 'not-allowed' : 'pointer',
          fontSize: '15px',
          transition: 'all 0.2s ease',
          boxShadow: simRunning ? 'none' : '0 4px 12px rgba(245,158,11,0.4)',
        }}
      >
        {simRunning ? '⚙ Running SPICE Simulation...' : '▶ Run SPICE Simulation'}
      </button>
    </div>
  );

  const renderPhaseContent = (content: React.ReactNode, canGoNext: boolean, nextLabel: string = 'Continue') => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: colors.bgDark }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '16px' }}>
        {content}
      </div>
      {renderBottomBar(canGoNext, nextLabel)}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ color: '#8b5cf6', fontSize: '13px', textTransform: 'uppercase' as const, letterSpacing: '2px', fontWeight: 400 }}>
              AI + Circuit Design
            </span>
            <h1 style={{
              fontSize: isMobile ? '26px' : '32px',
              marginTop: '8px',
              background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}>
              LLM to SPICE Pipeline
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '17px', marginTop: '8px', fontWeight: 400 }}>
              Can AI design a circuit that actually meets specs?
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderPipelineSVG()}
          </div>

          <div style={{
            background: 'rgba(139,92,246,0.1)',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: '4px solid #8b5cf6',
            boxShadow: '0 4px 16px rgba(139,92,246,0.15)',
          }}>
            <p style={{ fontSize: '15px', lineHeight: 1.7, fontWeight: 400, color: '#e2e8f0' }}>
              LLMs can generate SPICE netlists that look correct. But circuit physics does not care about plausibility —
              it cares about equations. What happens when we close the loop between AI generation and physics simulation?
            </p>
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '🤖', title: 'LLM generates', desc: 'Netlists, component values, testbenches' },
              { icon: '⚡', title: 'SPICE validates', desc: 'Physics equations, actual behavior' },
              { icon: '🔄', title: 'Iterate', desc: 'Results feed back for refinement' },
              { icon: '✅', title: 'Converge', desc: 'Design meets all specifications' },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(30,41,59,0.6)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #334155',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{item.title}</div>
                <div style={{ color: colors.muted, fontSize: '12px', fontWeight: 400 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      true,
      'Continue'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px', fontWeight: 700 }}>Make Your Prediction</h2>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {renderCompactSVG()}
          </div>

          <div style={{
            background: 'rgba(30,41,59,0.8)',
            padding: '18px',
            borderRadius: '12px',
            marginBottom: '20px',
            borderLeft: '4px solid #f59e0b',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 400, lineHeight: 1.7, color: '#e2e8f0' }}>
              If you ask an LLM to design a buck converter that outputs 3.3V from 12V input
              with less than 50mV ripple and &gt;45° phase margin, what should you expect?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  minHeight: '44px',
                  borderRadius: '10px',
                  border: prediction === p.id ? '2px solid #8b5cf6' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(139,92,246,0.2)' : 'rgba(30,41,59,0.5)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: prediction === p.id ? 600 : 400,
                  transition: 'all 0.2s ease',
                  boxShadow: prediction === p.id ? '0 0 12px rgba(139,92,246,0.3)' : 'none',
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
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '6px', fontWeight: 700 }}>Design & Simulate</h2>
          <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '20px', fontWeight: 400 }}>
            Adjust parameters and run SPICE to see if specs are met
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                {renderPipelineSVG()}
              </div>

              <div style={{
                background: 'rgba(30,41,59,0.8)',
                padding: '18px',
                borderRadius: '12px',
                marginTop: '16px',
                border: '1px solid #334155',
              }}>
                <h3 style={{ color: '#f59e0b', marginBottom: '10px', fontWeight: 700 }}>Try These Experiments:</h3>
                <ul style={{ color: '#e2e8f0', lineHeight: 1.9, paddingLeft: '20px', fontWeight: 400 }}>
                  <li>Run the simulation with default values — do they pass?</li>
                  <li>Increase capacitance to reduce ripple</li>
                  <li>Adjust feedback resistor — watch phase margin change</li>
                  <li>Count how many iterations until all specs pass</li>
                </ul>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls()}
            </div>
          </div>
        </div>
      </div>,
      true,
      'Review Concepts'
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'iterate';
    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
            boxShadow: wasCorrect ? '0 4px 16px rgba(34,197,94,0.15)' : '0 4px 16px rgba(239,68,68,0.15)',
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? '✓ Exactly Right!' : '✗ Not Quite!'}
            </h3>
            <p style={{ fontWeight: 400, color: '#e2e8f0', lineHeight: 1.6 }}>
              LLMs excel at generating plausible starting points but cannot solve the differential equations
              that govern circuit behavior. SPICE is the truth source — it solves physics. The value is in the iteration loop.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {renderCompactSVG()}
          </div>

          <div style={{ background: 'rgba(30,41,59,0.8)', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '14px', fontWeight: 700 }}>LLM as Generator, SPICE as Validator</h3>
            <div style={{ marginBottom: '14px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px', fontWeight: 600 }}>What LLMs Do Well:</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '20px', lineHeight: 1.8, fontWeight: 400 }}>
                <li>Generate syntactically correct SPICE netlists</li>
                <li>Suggest reasonable component values from prior examples</li>
                <li>Create testbenches for different analyses</li>
                <li>Iterate quickly based on simulation feedback</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#22c55e', marginBottom: '8px', fontWeight: 600 }}>What SPICE Provides:</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '20px', lineHeight: 1.8, fontWeight: 400 }}>
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
      'Explore the Twist'
    );
  }

  // TWIST PREDICT PHASE — no sliders
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '20px', fontWeight: 700 }}>
            The Twist: Stability Analysis
          </h2>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {renderStabilitySVG()}
          </div>

          <div style={{
            background: 'rgba(30,41,59,0.8)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid #334155',
          }}>
            <p style={{ fontSize: '15px', marginBottom: '12px', fontWeight: 400, lineHeight: 1.7, color: '#e2e8f0' }}>
              A circuit can have the right output voltage and acceptable ripple but still oscillate wildly
              under load transients. Bode plot analysis reveals phase margin — how close to instability
              the control loop is.
            </p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
              Who should determine if the phase margin is adequate?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(245,158,11,0.2)' : 'rgba(30,41,59,0.5)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: twistPrediction === p.id ? 600 : 400,
                  transition: 'all 0.2s ease',
                  boxShadow: twistPrediction === p.id ? '0 0 12px rgba(245,158,11,0.3)' : 'none',
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
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '6px', fontWeight: 700 }}>Stability Check</h2>
          <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '20px', fontWeight: 400 }}>
            Adjust the feedback loop and observe how phase margin changes
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                {renderPipelineSVG()}
              </div>

              <div style={{
                background: 'rgba(245,158,11,0.1)',
                padding: '18px',
                borderRadius: '12px',
                marginTop: '16px',
                border: '1px solid rgba(245,158,11,0.4)',
              }}>
                <h3 style={{ color: '#f59e0b', marginBottom: '10px', fontWeight: 700 }}>Phase Margin Guidelines:</h3>
                <ul style={{ color: '#e2e8f0', lineHeight: 1.9, paddingLeft: '20px', fontWeight: 400 }}>
                  <li><strong>&gt;60°:</strong> Overdamped, slow but very stable</li>
                  <li><strong>45-60°:</strong> Good balance of speed and stability</li>
                  <li><strong>30-45°:</strong> Acceptable but may ring on transients</li>
                  <li><strong>&lt;30°:</strong> Dangerous -- oscillation likely</li>
                </ul>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls()}
            </div>
          </div>
        </div>
      </div>,
      true,
      'See Explanation'
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'sim_truth';
    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
            boxShadow: wasCorrect ? '0 4px 16px rgba(34,197,94,0.15)' : '0 4px 16px rgba(239,68,68,0.15)',
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px', fontWeight: 700 }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ fontWeight: 400, color: '#e2e8f0', lineHeight: 1.6 }}>
              Only SPICE simulation (or actual measurement) can reveal the true phase margin.
              LLMs may know the theory but cannot compute the specific transfer functions for a given
              design with all its parasitics.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {renderStabilitySVG()}
          </div>

          <div style={{ background: 'rgba(30,41,59,0.8)', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '14px', fontWeight: 700 }}>The Stability Truth</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              A design that meets DC specifications can still fail dynamically. Phase margin depends
              on the exact component values, parasitics, and operating conditions. This is why
              "looks correct" from an LLM is not the same as "works correctly" from simulation.
              Real physics feedback is irreplaceable. The formula PM = 180° − ∠T(jω) captures
              exactly how much safety margin your control loop has before going unstable.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Apply Knowledge'
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="L L M To S P I C E"
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
    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '6px', fontWeight: 700 }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: colors.muted, marginBottom: '24px', fontWeight: 400 }}>
            LLM + Simulation workflows across hardware design
          </p>

          {realWorldApps.map((app, index) => {
            const isComplete = transferCompleted.has(index);
            return (
              <div
                key={index}
                style={{
                  background: 'rgba(30,41,59,0.8)',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: isComplete ? `2px solid ${app.color}` : '1px solid #475569',
                  boxShadow: isComplete ? `0 4px 16px ${app.color}30` : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{app.icon}</span>
                    <div>
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{app.title}</h3>
                      <span style={{ color: app.color, fontSize: '12px', fontWeight: 600 }}>{app.tagline}</span>
                    </div>
                  </div>
                  {isComplete && <span style={{ color: app.color, fontSize: '18px' }}>✓</span>}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' as const }}>
                  {app.stats.map((stat, si) => (
                    <div key={si} style={{
                      background: `${app.color}15`,
                      border: `1px solid ${app.color}40`,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      textAlign: 'center' as const,
                      minWidth: '80px',
                    }}>
                      <div style={{ color: app.color, fontWeight: 700, fontSize: '15px' }}>{stat.value}</div>
                      <div style={{ color: colors.muted, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', lineHeight: 1.6, fontWeight: 400 }}>
                  {app.description}
                </p>

                {isComplete ? (
                  <div>
                    <div style={{
                      background: 'rgba(34,197,94,0.1)',
                      padding: '12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid #22c55e',
                      marginBottom: '10px',
                    }}>
                      <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, fontWeight: 400 }}>
                        {app.connection}
                      </p>
                    </div>
                    <div style={{
                      background: 'rgba(139,92,246,0.1)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '10px',
                    }}>
                      <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, fontWeight: 400 }}>
                        <strong style={{ color: '#8b5cf6' }}>Companies:</strong> {app.companies.join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => {}}
                      style={{
                        padding: '10px 20px',
                        minHeight: '44px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#22c55e',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                      }}
                    >
                      ✓ Got It
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '10px 20px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: `1px solid ${app.color}`,
                      background: 'transparent',
                      color: app.color,
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Continue →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>,
      transferCompleted.size >= 4,
      'Take the Quiz'
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <div style={{ color: '#ffffff', padding: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '24px',
              boxShadow: testScore >= 8 ? '0 4px 20px rgba(34,197,94,0.25)' : '0 4px 20px rgba(239,68,68,0.25)',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px', fontWeight: 700 }}>
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{testScore} / 10</p>
              <p style={{ color: colors.muted, fontWeight: 400 }}>
                {testScore >= 8 ? 'You mastered the LLM-to-SPICE pipeline!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30,41,59,0.8)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                }}>
                  <p style={{ fontWeight: 600, marginBottom: '8px', color: '#fff' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      background: opt.correct ? 'rgba(34,197,94,0.2)' : userAnswer === oIndex ? 'rgba(239,68,68,0.2)' : 'transparent',
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : colors.muted,
                      fontWeight: 400,
                      fontSize: '14px',
                    }}>
                      {opt.correct ? '✓ ' : userAnswer === oIndex ? '✗ ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>,
        testScore >= 8,
        testScore >= 8 ? 'Achieve Mastery' : 'Retry Quiz'
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const allAnswered = !testAnswers.includes(null);

    return renderPhaseContent(
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontWeight: 700 }}>Knowledge Quiz</h2>
            <span style={{ color: '#cbd5e1', fontWeight: 400 }}>
              Question {currentTestQuestion + 1} of {testQuestions.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
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
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Scenario context */}
          <div style={{
            background: 'rgba(139,92,246,0.1)',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '14px',
            border: '1px solid rgba(139,92,246,0.3)',
          }}>
            <p style={{ color: colors.muted, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: '6px' }}>
              Scenario
            </p>
            <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6, fontWeight: 400 }}>{currentQ.scenario}</p>
          </div>

          <div style={{ background: 'rgba(30,41,59,0.8)', padding: '16px', borderRadius: '10px', marginBottom: '14px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #8b5cf6' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139,92,246,0.2)' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: testAnswers[currentTestQuestion] === oIndex ? 600 : 400,
                  transition: 'all 0.2s ease',
                  boxShadow: testAnswers[currentTestQuestion] === oIndex ? '0 0 8px rgba(139,92,246,0.25)' : 'none',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', gap: '12px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.muted : '#fff',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 400,
                transition: 'all 0.2s ease',
              }}
            >
              ← Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                disabled={testAnswers[currentTestQuestion] === null}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers[currentTestQuestion] !== null ? '#8b5cf6' : '#475569',
                  color: '#fff',
                  cursor: testAnswers[currentTestQuestion] !== null ? 'pointer' : 'not-allowed',
                  opacity: testAnswers[currentTestQuestion] !== null ? 1 : 0.4,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: testAnswers[currentTestQuestion] !== null ? '0 2px 8px rgba(139,92,246,0.35)' : 'none',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={!allAnswered}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: allAnswered ? '#22c55e' : '#475569',
                  color: '#fff',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: allAnswered ? '0 2px 8px rgba(34,197,94,0.35)' : 'none',
                }}
              >
                Submit Quiz
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
      <div style={{ color: '#ffffff', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px', fontWeight: 700 }}>Mastery Achieved!</h1>
          <p style={{ color: '#e2e8f0', marginBottom: '24px', fontWeight: 400 }}>
            You understand the LLM-to-SPICE workflow
          </p>

          <div style={{
            background: 'rgba(30,41,59,0.8)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'left',
            marginBottom: '20px',
            border: '1px solid #334155',
          }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '12px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.9, paddingLeft: '20px', fontWeight: 400 }}>
              <li>LLMs generate plausible designs, not correct designs</li>
              <li>SPICE simulation is the physics truth source</li>
              <li>Iteration loop: generate → simulate → feedback → refine</li>
              <li>Phase margin and stability analysis</li>
              <li>Bode plots reveal control loop behavior</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(245,158,11,0.1)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'left',
            border: '1px solid rgba(245,158,11,0.3)',
            boxShadow: '0 4px 16px rgba(245,158,11,0.1)',
          }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px', fontWeight: 700 }}>The Bigger Picture:</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              This pattern — AI generates, physics validates — applies broadly. LLMs cannot compute,
              they approximate. Whenever physical correctness matters (circuits, structures, chemistry),
              simulation or measurement must close the loop. The 10x speed advantage of LLM-assisted
              design comes from faster exploration, not from replacing physics.
            </p>
          </div>
        </div>
      </div>,
      true,
      '🎓 Complete'
    );
  }

  return null;
};

export default LLMToSPICERenderer;
