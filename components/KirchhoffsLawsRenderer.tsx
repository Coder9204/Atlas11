import React, { useState, useEffect, useCallback } from 'react';

// =============================================
// TYPES
// =============================================
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'node_analyzed'
  | 'loop_analyzed'
  | 'current_calculated'
  | 'voltage_calculated'
  | 'circuit_solved'
  | 'component_adjusted'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string[];
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
}

// =============================================
// CONSTANTS
// =============================================
const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery'
];

const phaseNames: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

const testQuestions: TestQuestion[] = [
  {
    scenario: "You're designing a circuit board for a new smartphone. At a junction where the main power line splits to feed three components (display, processor, WiFi), the incoming current measures 2.5A.",
    question: "If the display draws 0.8A and the processor draws 1.2A, how much current flows to the WiFi module?",
    options: [
      { text: "0.5A - The sum of currents entering must equal currents leaving", correct: true },
      { text: "1.0A - The current splits equally", correct: false },
      { text: "2.5A - All current goes to each branch", correct: false },
      { text: "Cannot be determined without voltage", correct: false }
    ],
    explanation: "By Kirchhoff's Current Law (KCL), the sum of currents at a node is zero. If 2.5A enters and 0.8A + 1.2A = 2.0A leaves through two branches, the third branch must carry 2.5A - 2.0A = 0.5A to conserve charge."
  },
  {
    scenario: "An electrician is troubleshooting a series circuit with a 12V battery and three resistors. Measurements show 4V across the first resistor and 5V across the second.",
    question: "What voltage should appear across the third resistor?",
    options: [
      { text: "3V - The voltages around the loop must sum to zero", correct: true },
      { text: "12V - Each resistor sees full battery voltage", correct: false },
      { text: "4V - Voltage divides equally", correct: false },
      { text: "9V - The remaining voltage after the first drop", correct: false }
    ],
    explanation: "By Kirchhoff's Voltage Law (KVL), the sum of voltages around any closed loop equals zero: +12V - 4V - 5V - V3 = 0, therefore V3 = 3V."
  },
  {
    scenario: "A solar panel array has four panels connected with a complex network. You measure currents at various points and find 3A from panel 1, 2.5A from panel 2, and 4A from panel 3 all meeting at junction A.",
    question: "What total current leaves junction A toward the inverter?",
    options: [
      { text: "9.5A - Total current in equals total current out", correct: true },
      { text: "3.17A - Average of the three inputs", correct: false },
      { text: "4A - Only the largest current passes through", correct: false },
      { text: "Depends on the wire resistance", correct: false }
    ],
    explanation: "KCL states that charge is conserved at every node. If 3A + 2.5A + 4A = 9.5A enters junction A, exactly 9.5A must leave. This is independent of resistance."
  },
  {
    scenario: "You're analyzing a circuit with two parallel branches connected to a 9V source. One branch has a 30 ohm resistor, the other has a 45 ohm resistor.",
    question: "Applying KVL to each parallel branch, what can you conclude?",
    options: [
      { text: "Each branch has exactly 9V across it since they share the same two nodes", correct: true },
      { text: "The 30 ohm branch has more voltage since it has less resistance", correct: false },
      { text: "The voltages add up to 9V split between branches", correct: false },
      { text: "Voltage distribution depends on current flow", correct: false }
    ],
    explanation: "In a parallel circuit, both branches connect to the same two nodes. By KVL, any path between the same two points must have the same voltage difference. Therefore, both branches have exactly 9V across them."
  },
  {
    scenario: "A car's electrical system has the battery connected to multiple circuits. The headlights draw 8A, the radio draws 2A, and the dashboard draws 1.5A. The alternator supplies charging current.",
    question: "If the battery is neither charging nor discharging, what current must the alternator supply?",
    options: [
      { text: "11.5A - Must equal total load current for equilibrium", correct: true },
      { text: "13.5A - Battery needs extra current for charging", correct: false },
      { text: "8A - Only needs to match the largest load", correct: false },
      { text: "Cannot determine without voltage information", correct: false }
    ],
    explanation: "For the battery to maintain constant charge, KCL requires that current in equals current out. Total load is 8A + 2A + 1.5A = 11.5A, so the alternator must supply exactly 11.5A."
  },
  {
    scenario: "In a resistor network, you trace a loop that goes through: +24V source, -6V drop across R1, +3V from a second source, -15V across R2, and back to start.",
    question: "What voltage appears across the remaining element in this loop?",
    options: [
      { text: "-6V (a 6V drop in the direction of travel)", correct: true },
      { text: "+6V (element adds energy to the circuit)", correct: false },
      { text: "0V (loop must have no missing elements)", correct: false },
      { text: "24V (returns to battery voltage)", correct: false }
    ],
    explanation: "By KVL: +24V - 6V + 3V - 15V + V_remaining = 0. Solving: 24 - 6 + 3 - 15 = 6V, so V_remaining = -6V (a drop of 6V)."
  },
  {
    scenario: "A technician connects an ammeter at three different points in a series circuit with a 10V source and two 100 ohm resistors.",
    question: "What will the ammeter read at each of the three points?",
    options: [
      { text: "50mA at all three points - current is constant in series", correct: true },
      { text: "100mA, 50mA, 25mA - current decreases through circuit", correct: false },
      { text: "50mA before first resistor, 0mA after second resistor", correct: false },
      { text: "Different values depending on where measured", correct: false }
    ],
    explanation: "In a series circuit, there's only one path for current. By KCL, the same current (I = V/R_total = 10V/200 ohms = 50mA) must flow through every point to conserve charge."
  },
  {
    scenario: "A complex circuit has three loops sharing some common branches. An engineer applies KVL to analyze it.",
    question: "How many independent KVL equations can be written for a circuit with 3 loops that share components?",
    options: [
      { text: "3 equations - one for each independent loop", correct: true },
      { text: "1 equation - all loops give the same result", correct: false },
      { text: "6 equations - KVL in both directions for each loop", correct: false },
      { text: "Depends on the number of components", correct: false }
    ],
    explanation: "Each independent loop provides one unique KVL equation. While you can trace multiple paths, only as many equations as independent loops (fundamental cycles) provide new information."
  },
  {
    scenario: "In a Wheatstone bridge used for precise measurements, current flows from node A through two parallel paths (R1-R3 and R2-R4) to node B, with a galvanometer connecting the midpoints.",
    question: "When the bridge is balanced and the galvanometer shows zero current, what does KCL tell us?",
    options: [
      { text: "Current through R1 equals current through R3, and current through R2 equals current through R4", correct: true },
      { text: "All four resistors carry equal current", correct: false },
      { text: "No current flows in the entire circuit", correct: false },
      { text: "Current through R1 equals current through R2", correct: false }
    ],
    explanation: "At balance, zero current through the galvanometer means the current entering each midpoint equals the current leaving (excluding the galvanometer path). So I through R1 must continue through R3, and I through R2 must continue through R4."
  },
  {
    scenario: "An electrical engineer is debugging a circuit where the calculated and measured currents don't match. The circuit has 5 nodes and 8 branches.",
    question: "How many independent KCL equations should the engineer write?",
    options: [
      { text: "4 equations (nodes - 1)", correct: true },
      { text: "5 equations (one per node)", correct: false },
      { text: "8 equations (one per branch)", correct: false },
      { text: "3 equations (8 - 5)", correct: false }
    ],
    explanation: "For N nodes, only (N-1) KCL equations are independent. The Nth equation is always a combination of the others because total current entering the circuit equals total current leaving. Here: 5 - 1 = 4 independent equations."
  }
];

const transferApps: TransferApp[] = [
  {
    icon: "C",
    title: "Circuit Design",
    short: "Circuits",
    tagline: "Building reliable electronic systems",
    description: "Every electronic device from smartphones to satellites relies on Kirchhoff's Laws during the design phase to ensure proper current flow and voltage distribution.",
    connection: "Engineers use KCL to verify that current divides correctly at junctions and KVL to ensure voltage drops sum correctly around loops, preventing overheating and component damage.",
    howItWorks: [
      "Schematic design applies KCL/KVL to calculate component values",
      "SPICE simulators solve thousands of Kirchhoff equations",
      "PCB layout tools verify current capacity of traces",
      "Power integrity analysis ensures stable voltage delivery",
      "Signal integrity checks use KVL for impedance matching"
    ],
    stats: [
      { value: "1M+", label: "Nodes in modern chip" },
      { value: "10B+", label: "Transistors per chip" },
      { value: "0.001%", label: "Design error tolerance" },
      { value: "$500B", label: "Semiconductor market" }
    ],
    examples: [
      "CPU voltage regulator design",
      "LED driver circuits for displays",
      "Audio amplifier design",
      "Sensor interface circuits"
    ],
    companies: ["Intel", "AMD", "Texas Instruments", "Analog Devices", "Cadence"],
    futureImpact: "As chips become more complex with billions of transistors, automated Kirchhoff analysis becomes essential for designing next-generation processors.",
    color: "from-blue-600 to-cyan-600"
  },
  {
    icon: "P",
    title: "Power Grids",
    short: "Grids",
    tagline: "Balancing electricity across continents",
    description: "Power utilities use Kirchhoff's Laws every second to balance generation and consumption across massive electrical grids spanning thousands of miles.",
    connection: "KCL ensures that power generated equals power consumed plus losses at every substation. KVL helps calculate voltage drops across transmission lines to maintain stable delivery.",
    howItWorks: [
      "Sensors measure current at thousands of junction points",
      "SCADA systems apply KCL to verify power balance at each node",
      "KVL calculations predict voltage levels at remote locations",
      "Automatic systems adjust generators and transformers",
      "Real-time analysis prevents blackouts by detecting imbalances"
    ],
    stats: [
      { value: "450K+", label: "Miles of US transmission" },
      { value: "99.97%", label: "Grid reliability target" },
      { value: "4,000+", label: "Power plants coordinated" },
      { value: "$400B", label: "Annual US electricity" }
    ],
    examples: [
      "California ISO solar balancing",
      "Texas ERCOT wind management",
      "European grid synchronization",
      "NYC underground networks"
    ],
    companies: ["Siemens", "GE Grid", "ABB", "Schneider Electric", "Eaton"],
    futureImpact: "As renewable energy grows, Kirchhoff's Laws become critical for integrating variable solar and wind sources while maintaining grid stability.",
    color: "from-yellow-600 to-orange-600"
  },
  {
    icon: "E",
    title: "Electronic Devices",
    short: "Electronics",
    tagline: "Powering the digital world",
    description: "Every smartphone, laptop, and IoT device contains power management circuits that continuously apply Kirchhoff's Laws to route current efficiently.",
    connection: "KCL determines how battery current splits between components. KVL ensures voltage regulators provide correct power levels to each subsystem.",
    howItWorks: [
      "Power management ICs monitor all current draws",
      "KCL ensures total current doesn't exceed battery capacity",
      "Multiple voltage rails use KVL for conversion",
      "Dynamic power allocation based on demand",
      "Thermal management uses current distribution data"
    ],
    stats: [
      { value: "50+", label: "Components sharing power" },
      { value: "20+", label: "Voltage rails in phones" },
      { value: "95%+", label: "Conversion efficiency" },
      { value: "5-25W", label: "Fast charging power" }
    ],
    examples: [
      "Smartphone power management",
      "Laptop battery systems",
      "Wireless charging circuits",
      "IoT sensor nodes"
    ],
    companies: ["Apple", "Qualcomm", "Texas Instruments", "MediaTek", "Samsung"],
    futureImpact: "Future devices with multiple batteries, solar charging, and AI-driven optimization will rely even more on Kirchhoff's Laws.",
    color: "from-purple-600 to-pink-600"
  },
  {
    icon: "F",
    title: "Fault Detection",
    short: "Faults",
    tagline: "Finding problems before they fail",
    description: "Maintenance engineers use Kirchhoff's Laws to diagnose electrical problems, from household wiring issues to industrial equipment failures.",
    connection: "When measured currents or voltages don't match Kirchhoff predictions, it indicates faults like shorts, opens, or degraded components.",
    howItWorks: [
      "Compare measured values to Kirchhoff predictions",
      "Current imbalance at nodes indicates shorts or leakage",
      "Voltage loop errors reveal damaged components",
      "Thermal imaging combined with current analysis",
      "Predictive maintenance from trending data"
    ],
    stats: [
      { value: "30%", label: "Equipment downtime reduced" },
      { value: "$1T+", label: "Annual maintenance costs" },
      { value: "80%", label: "Failures predictable" },
      { value: "5x", label: "Equipment life extension" }
    ],
    examples: [
      "EV battery cell monitoring",
      "Industrial motor diagnostics",
      "Building electrical audits",
      "Aircraft system checks"
    ],
    companies: ["Fluke", "Keysight", "Emerson", "Honeywell", "Rockwell"],
    futureImpact: "AI-powered diagnostic systems will automatically apply Kirchhoff analysis to predict failures before they occur.",
    color: "from-red-600 to-orange-600"
  }
];

// =============================================
// COMPONENT
// =============================================
const KirchhoffsLawsRenderer: React.FC<Props> = ({
  gamePhase,
  onPhaseComplete,
  onGameEvent
}) => {
  // Phase and navigation state
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictionResult, setShowPredictionResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Simulation states - Circuit visualization
  const [voltage1, setVoltage1] = useState(12);
  const [resistance1, setResistance1] = useState(200);
  const [resistance2, setResistance2] = useState(300);
  const [resistance3, setResistance3] = useState(400);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showCurrentFlow, setShowCurrentFlow] = useState(false);
  const [animationOffset, setAnimationOffset] = useState(0);

  // Multi-loop circuit states
  const [voltage2, setVoltage2] = useState(9);
  const [loopResistance1, setLoopResistance1] = useState(100);
  const [loopResistance2, setLoopResistance2] = useState(150);
  const [loopResistance3, setLoopResistance3] = useState(200);
  const [showMultiLoopFlow, setShowMultiLoopFlow] = useState(false);

  // Transfer states
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [testScore, setTestScore] = useState(0);

  // =============================================
  // EFFECTS
  // =============================================
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

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setAnimationOffset(prev => (prev + 1) % 20);
    }, 50);
    return () => clearInterval(interval);
  }, [isSimulating]);

  // =============================================
  // AUDIO
  // =============================================
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'transition' | 'complete') => {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'click':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'error':
          oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(277, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.6);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  // =============================================
  // NAVIGATION
  // =============================================
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);

    onGameEvent?.({
      type: 'phase_change',
      data: { from: phase, to: newPhase, phaseName: phaseNames[newPhase] }
    });
  }, [phase, playSound, onGameEvent]);

  const completePhase = useCallback(() => {
    onPhaseComplete?.(phase);
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, onPhaseComplete, goToPhase]);

  // =============================================
  // CIRCUIT CALCULATIONS
  // =============================================
  const calculateCurrents = useCallback(() => {
    const r23 = resistance2 + resistance3;
    const rParallel = (resistance1 * r23) / (resistance1 + r23);
    const totalCurrent = voltage1 / rParallel;
    const i1 = voltage1 / resistance1;
    const i23 = voltage1 / r23;
    return { i1, i23, totalCurrent: i1 + i23 };
  }, [voltage1, resistance1, resistance2, resistance3]);

  const calculateVoltages = useCallback(() => {
    const currents = calculateCurrents();
    const v1 = currents.i1 * resistance1;
    const v2 = currents.i23 * resistance2;
    const v3 = currents.i23 * resistance3;
    return { v1, v2, v3 };
  }, [calculateCurrents, resistance1, resistance2, resistance3]);

  // Multi-loop calculations
  const calculateMultiLoopCurrents = useCallback(() => {
    // Simplified two-source circuit
    const i1 = voltage1 / (loopResistance1 + loopResistance2);
    const i2 = voltage2 / (loopResistance2 + loopResistance3);
    return { i1, i2, total: i1 + i2 };
  }, [voltage1, voltage2, loopResistance1, loopResistance2, loopResistance3]);

  // =============================================
  // EVENT HANDLERS
  // =============================================
  const handlePrediction = useCallback((answer: string) => {
    setPrediction(answer);
    setShowPredictionResult(true);
    const isCorrect = answer === 'B';
    playSound(isCorrect ? 'success' : 'error');
    onGameEvent?.({ type: 'prediction_made', data: { answer, correct: isCorrect } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((answer: string) => {
    setTwistPrediction(answer);
    setShowTwistResult(true);
    const isCorrect = answer === 'C';
    playSound(isCorrect ? 'success' : 'error');
    onGameEvent?.({ type: 'prediction_made', data: { answer, correct: isCorrect, phase: 'twist' } });
  }, [playSound, onGameEvent]);

  const handleAppExplore = useCallback((index: number) => {
    setActiveApp(index);
    if (!completedApps.has(index)) {
      setCompletedApps(prev => new Set([...prev, index]));
      playSound('success');
      onGameEvent?.({ type: 'app_explored', data: { app: transferApps[index].title } });
    }
  }, [completedApps, playSound, onGameEvent]);

  const handleAnswerSelect = useCallback((index: number) => {
    if (answeredQuestions.has(currentQuestion)) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = testQuestions[currentQuestion].options[index].correct;
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      playSound('success');
    } else {
      playSound('error');
    }

    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    onGameEvent?.({ type: 'test_answered', data: { question: currentQuestion, correct: isCorrect } });
  }, [currentQuestion, answeredQuestions, playSound, onGameEvent]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const finalScore = correctAnswers;
      setTestScore(finalScore);
      onGameEvent?.({ type: 'test_completed', data: { score: finalScore, total: testQuestions.length } });
      if (finalScore >= 7) {
        playSound('complete');
      }
      completePhase();
    }
  }, [currentQuestion, correctAnswers, playSound, completePhase, onGameEvent]);

  // =============================================
  // RENDER FUNCTIONS
  // =============================================

  const renderCircuit = (showAnimation: boolean = true, width: number = 400, height: number = 300) => {
    const currents = calculateCurrents();
    const voltages = calculateVoltages();

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <marker id="arrowYellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#eab308" />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="12" />

        {/* Battery */}
        <rect x="30" y="100" width="20" height="100" fill="none" stroke="#64748b" strokeWidth="2" />
        <line x1="25" y1="130" x2="55" y2="130" stroke="#ef4444" strokeWidth="3" />
        <line x1="30" y1="150" x2="50" y2="150" stroke="#22c55e" strokeWidth="2" />
        <text x="40" y="85" textAnchor="middle" fill="#94a3b8" fontSize="12">+</text>
        <text x="40" y="220" textAnchor="middle" fill="#94a3b8" fontSize="12">-</text>
        <text x="40" y="260" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">{voltage1}V</text>

        {/* Top wire */}
        <line x1="50" y1="100" x2="120" y2="100" stroke="#64748b" strokeWidth="2" />

        {/* Node A */}
        <circle cx="120" cy="100" r="8" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="120" y="80" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">A</text>

        {/* R1 branch */}
        <rect x="110" y="120" width="20" height="60" fill="#3b82f6" rx="3" />
        <text x="120" y="155" textAnchor="middle" fill="white" fontSize="10">R1</text>
        <text x="145" y="155" textAnchor="start" fill="#60a5fa" fontSize="11">{resistance1}O</text>
        <line x1="120" y1="108" x2="120" y2="120" stroke="#64748b" strokeWidth="2" />
        <line x1="120" y1="180" x2="120" y2="200" stroke="#64748b" strokeWidth="2" />

        {/* Node B */}
        <circle cx="120" cy="200" r="8" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="120" y="225" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">B</text>

        {/* Bottom wire */}
        <line x1="120" y1="200" x2="50" y2="200" stroke="#64748b" strokeWidth="2" />

        {/* Top wire to R2-R3 */}
        <line x1="128" y1="100" x2="250" y2="100" stroke="#64748b" strokeWidth="2" />

        {/* R2 */}
        <rect x="240" y="110" width="20" height="50" fill="#f59e0b" rx="3" />
        <text x="250" y="140" textAnchor="middle" fill="white" fontSize="10">R2</text>
        <text x="275" y="140" textAnchor="start" fill="#fbbf24" fontSize="11">{resistance2}O</text>
        <line x1="250" y1="100" x2="250" y2="110" stroke="#64748b" strokeWidth="2" />

        {/* Node C */}
        <circle cx="250" cy="165" r="6" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="270" y="168" textAnchor="start" fill="#4ade80" fontSize="10">C</text>

        {/* R3 */}
        <line x1="250" y1="160" x2="250" y2="170" stroke="#64748b" strokeWidth="2" />
        <rect x="240" y="170" width="20" height="50" fill="#a855f7" rx="3" />
        <text x="250" y="200" textAnchor="middle" fill="white" fontSize="10">R3</text>
        <text x="275" y="200" textAnchor="start" fill="#c084fc" fontSize="11">{resistance3}O</text>
        <line x1="250" y1="220" x2="250" y2="240" stroke="#64748b" strokeWidth="2" />

        {/* Bottom return */}
        <line x1="250" y1="240" x2="120" y2="240" stroke="#64748b" strokeWidth="2" />
        <line x1="120" y1="240" x2="120" y2="208" stroke="#64748b" strokeWidth="2" />

        {/* Animation */}
        {showAnimation && showCurrentFlow && (
          <g>
            <circle cx={70 + (animationOffset * 2) % 40} cy="100" r="3" fill="#fbbf24" />
            <circle cx={120} cy={100 + (animationOffset * 2) % 80} r="3" fill="#fbbf24" />
            <circle cx={170 + (animationOffset * 2) % 60} cy="100" r="3" fill="#fbbf24" />
            <circle cx={250} cy={110 + (animationOffset * 2) % 130} r="3" fill="#fbbf24" />
          </g>
        )}

        {/* Current values */}
        <text x="90" y="155" textAnchor="end" fill="#fbbf24" fontSize="11">
          I1={currents.i1.toFixed(3)}A
        </text>
        <text x={width - 30} y="155" textAnchor="end" fill="#fbbf24" fontSize="11">
          I23={currents.i23.toFixed(3)}A
        </text>

        {/* Voltage drops */}
        <text x="145" y="115" textAnchor="start" fill="#60a5fa" fontSize="10">
          V1={voltages.v1.toFixed(2)}V
        </text>
        <text x="285" y="135" textAnchor="start" fill="#fbbf24" fontSize="10">
          V2={voltages.v2.toFixed(2)}V
        </text>
        <text x="285" y="195" textAnchor="start" fill="#c084fc" fontSize="10">
          V3={voltages.v3.toFixed(2)}V
        </text>

        {/* KCL label */}
        <text x={width/2} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="10">
          KCL @ Node A: I_total = I1 + I23 = {(currents.i1 + currents.i23).toFixed(3)}A
        </text>
      </svg>
    );
  };

  const renderMultiLoopCircuit = (width: number = 450, height: number = 320) => {
    const currents = calculateMultiLoopCurrents();

    return (
      <svg width={width} height={height} className="mx-auto">
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="12" />

        {/* Battery 1 */}
        <rect x="30" y="80" width="15" height="80" fill="none" stroke="#64748b" strokeWidth="2" />
        <line x1="25" y1="100" x2="50" y2="100" stroke="#ef4444" strokeWidth="3" />
        <line x1="28" y1="120" x2="47" y2="120" stroke="#22c55e" strokeWidth="2" />
        <text x="37" y="70" textAnchor="middle" fill="#fbbf24" fontSize="12">{voltage1}V</text>

        {/* Battery 2 */}
        <rect x={width - 45} y="80" width="15" height="80" fill="none" stroke="#64748b" strokeWidth="2" />
        <line x1={width - 50} y1="100" x2={width - 25} y2="100" stroke="#ef4444" strokeWidth="3" />
        <line x1={width - 47} y1="120" x2={width - 28} y2="120" stroke="#22c55e" strokeWidth="2" />
        <text x={width - 37} y="70" textAnchor="middle" fill="#fbbf24" fontSize="12">{voltage2}V</text>

        {/* Top wire left */}
        <line x1="45" y1="60" x2="130" y2="60" stroke="#64748b" strokeWidth="2" />

        {/* R1 */}
        <rect x="130" y="50" width="60" height="20" fill="#3b82f6" rx="3" />
        <text x="160" y="65" textAnchor="middle" fill="white" fontSize="10">R1: {loopResistance1}O</text>

        {/* Node 1 */}
        <circle cx="210" cy="60" r="8" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="210" y="45" textAnchor="middle" fill="#4ade80" fontSize="10">N1</text>

        {/* R2 vertical */}
        <rect x="200" y="80" width="20" height="60" fill="#f59e0b" rx="3" />
        <text x="210" y="115" textAnchor="middle" fill="white" fontSize="9">R2</text>
        <text x="230" y="115" textAnchor="start" fill="#fbbf24" fontSize="10">{loopResistance2}O</text>
        <line x1="210" y1="68" x2="210" y2="80" stroke="#64748b" strokeWidth="2" />
        <line x1="210" y1="140" x2="210" y2="160" stroke="#64748b" strokeWidth="2" />

        {/* Top wire right */}
        <line x1="218" y1="60" x2="290" y2="60" stroke="#64748b" strokeWidth="2" />

        {/* R3 */}
        <rect x="290" y="50" width="60" height="20" fill="#a855f7" rx="3" />
        <text x="320" y="65" textAnchor="middle" fill="white" fontSize="10">R3: {loopResistance3}O</text>

        {/* Connect to Battery 2 */}
        <line x1="350" y1="60" x2={width - 45} y2="60" stroke="#64748b" strokeWidth="2" />
        <line x1={width - 37} y1="60" x2={width - 37} y2="80" stroke="#64748b" strokeWidth="2" />

        {/* Bottom wires */}
        <line x1="37" y1="160" x2="37" y2="200" stroke="#64748b" strokeWidth="2" />
        <line x1="37" y1="200" x2="210" y2="200" stroke="#64748b" strokeWidth="2" />
        <line x1="210" y1="160" x2="210" y2="200" stroke="#64748b" strokeWidth="2" />
        <line x1="210" y1="200" x2={width - 37} y2="200" stroke="#64748b" strokeWidth="2" />
        <line x1={width - 37} y1="160" x2={width - 37} y2="200" stroke="#64748b" strokeWidth="2" />

        {/* Loop labels */}
        <text x="100" y="130" textAnchor="middle" fill="#60a5fa" fontSize="11">Loop 1</text>
        <text x="320" y="130" textAnchor="middle" fill="#c084fc" fontSize="11">Loop 2</text>

        {/* Current animation */}
        {showMultiLoopFlow && (
          <g>
            <circle cx={60 + (animationOffset * 2) % 60} cy="60" r="3" fill="#fbbf24" />
            <circle cx={280 + (animationOffset * 2) % 60} cy="60" r="3" fill="#fbbf24" />
            <circle cx={210} cy={90 + (animationOffset * 2) % 50} r="3" fill="#fbbf24" />
          </g>
        )}

        {/* Current values */}
        <text x={width / 2} y={height - 30} textAnchor="middle" fill="#94a3b8" fontSize="11">
          I1 = {currents.i1.toFixed(3)}A | I2 = {currents.i2.toFixed(3)}A
        </text>
        <text x={width / 2} y={height - 12} textAnchor="middle" fill="#4ade80" fontSize="10">
          KCL at N1: I1 + I2 = {currents.total.toFixed(3)}A (through R2)
        </text>
      </svg>
    );
  };

  // =============================================
  // PHASE RENDERS
  // =============================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Electrical Circuits</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
        Kirchhoff's Laws
      </h1>

      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        The fundamental rules governing every electrical circuit
      </p>

      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2 text-cyan-400 font-bold">KCL</div>
            <p className="text-cyan-400 font-bold">Current Law</p>
            <p className="text-sm text-slate-400">Sum of currents = 0</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2 text-amber-400 font-bold">KVL</div>
            <p className="text-amber-400 font-bold">Voltage Law</p>
            <p className="text-sm text-slate-400">Sum of voltages = 0</p>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4">
          <p className="text-slate-300 text-sm text-center">
            Every smartphone, power grid, and electronic device obeys these two simple laws discovered by Gustav Kirchhoff in 1845.
          </p>
        </div>
      </div>

      <button
        onClick={() => completePhase()}
        style={{ zIndex: 10 }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
      >
        Discover the Laws
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <p className="text-slate-500 text-sm mt-6">
        Learn how current and voltage follow these universal rules
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Make Your Prediction
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          At a junction in a circuit where three wires meet, 5A flows in through wire 1 and 2A flows in through wire 2.
        </p>
        <svg width={isMobile ? 280 : 350} height={180} className="mx-auto mb-4">
          <rect x="0" y="0" width={isMobile ? 280 : 350} height="180" fill="#1e293b" rx="12" />
          <circle cx={isMobile ? 140 : 175} cy="90" r="15" fill="#22c55e" stroke="#4ade80" strokeWidth="3" />
          <line x1="30" y1="60" x2={isMobile ? 125 : 160} y2="85" stroke="#fbbf24" strokeWidth="4" />
          <text x="50" y="45" fill="#fbbf24" fontSize="14" fontWeight="bold">5A in</text>
          <line x1="30" y1="130" x2={isMobile ? 125 : 160} y2="95" stroke="#fbbf24" strokeWidth="4" />
          <text x="50" y="150" fill="#fbbf24" fontSize="14" fontWeight="bold">2A in</text>
          <line x1={isMobile ? 155 : 190} y1="90" x2={isMobile ? 260 : 320} y2="90" stroke="#60a5fa" strokeWidth="4" />
          <text x={isMobile ? 200 : 250} y="75" fill="#60a5fa" fontSize="14" fontWeight="bold">? A out</text>
        </svg>
        <p className="text-lg text-cyan-400 font-medium">
          How much current flows out through wire 3?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'A', text: '3A - The difference between inputs' },
          { id: 'B', text: '7A - The sum of the inputs' },
          { id: 'C', text: '5A - Only the largest current continues' },
          { id: 'D', text: '2.5A - The average of the inputs' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showPredictionResult}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionResult && prediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionResult && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionResult && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-md">
          <p className={`font-semibold ${prediction === 'B' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {prediction === 'B'
              ? 'Correct! Current is conserved at every junction.'
              : 'Not quite. Charge cannot be created or destroyed!'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            By Kirchhoff's Current Law: What goes in must come out. 5A + 2A = 7A
          </p>
          <button
            onClick={() => completePhase()}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Explore the Circuit
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
        Interactive Circuit Lab
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderCircuit(true, isMobile ? 340 : 450, isMobile ? 280 : 340)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 w-full max-w-2xl">
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">Voltage (V)</label>
          <input
            type="range"
            min="5"
            max="24"
            value={voltage1}
            onChange={(e) => setVoltage1(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-cyan-400 font-bold">{voltage1}V</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R1 (O)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={resistance1}
            onChange={(e) => setResistance1(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-blue-400 font-bold">{resistance1}O</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R2 (O)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={resistance2}
            onChange={(e) => setResistance2(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-amber-400 font-bold">{resistance2}O</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R3 (O)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={resistance3}
            onChange={(e) => setResistance3(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-purple-400 font-bold">{resistance3}O</span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            setIsSimulating(!isSimulating);
            setShowCurrentFlow(!showCurrentFlow);
          }}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            isSimulating
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          {isSimulating ? 'Pause Flow' : 'Show Current Flow'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 max-w-2xl">
        <h3 className="text-cyan-400 font-bold mb-2">What You're Seeing:</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>* Yellow dots represent current flow direction</li>
          <li>* Current splits at Node A between R1 and the R2-R3 branch</li>
          <li>* All current recombines at Node B (KCL in action!)</li>
          <li>* Adjust values to see how current distribution changes</li>
        </ul>
      </div>

      <button
        onClick={() => completePhase()}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
      >
        Learn the Laws
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Understanding Kirchhoff's Laws
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">
            Kirchhoff's Current Law (KCL)
          </h3>
          <div className="text-3xl text-center text-cyan-400 font-mono mb-4">Sum of I = 0</div>
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <p className="text-slate-300 text-sm mb-2">
              At any junction (node) in a circuit, the algebraic sum of all currents equals zero.
            </p>
            <p className="text-cyan-400 font-mono text-center">
              I_in1 + I_in2 = I_out
            </p>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Based on conservation of electric charge</li>
            <li>* Current entering = Current leaving</li>
            <li>* Applies to every node in a circuit</li>
            <li>* Charge cannot accumulate at a point</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">
            Kirchhoff's Voltage Law (KVL)
          </h3>
          <div className="text-3xl text-center text-amber-400 font-mono mb-4">Sum of V = 0</div>
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <p className="text-slate-300 text-sm mb-2">
              Around any closed loop in a circuit, the algebraic sum of all voltages equals zero.
            </p>
            <p className="text-amber-400 font-mono text-center">
              V_source = V_R1 + V_R2 + V_R3
            </p>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Based on conservation of energy</li>
            <li>* Voltage rises = Voltage drops</li>
            <li>* Applies to every closed loop</li>
            <li>* Energy supplied = Energy consumed</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 max-w-4xl w-full">
        <h3 className="text-xl font-bold text-emerald-400 mb-4 text-center">Why These Laws Matter</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center bg-slate-800/30 rounded-xl p-4">
            <div className="text-2xl mb-2 text-emerald-400">1845</div>
            <p className="text-sm text-slate-300">Discovered by Gustav Kirchhoff</p>
          </div>
          <div className="text-center bg-slate-800/30 rounded-xl p-4">
            <div className="text-2xl mb-2 text-emerald-400">100%</div>
            <p className="text-sm text-slate-300">Of circuits obey these laws</p>
          </div>
          <div className="text-center bg-slate-800/30 rounded-xl p-4">
            <div className="text-2xl mb-2 text-emerald-400">2</div>
            <p className="text-sm text-slate-300">Simple equations solve any circuit</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => completePhase()}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all"
      >
        Try a Challenge
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        Challenge: Multi-Loop Circuit
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A circuit has two voltage sources sharing a common resistor. Current from a 12V source flows through resistors and meets current from a 9V source at a junction.
        </p>
        <ul className="text-slate-300 mb-4 space-y-1">
          <li>* 12V source pushes current through R1 (100 ohms)</li>
          <li>* 9V source pushes current through R3 (200 ohms)</li>
          <li>* Both currents meet at node N1 and flow through R2 (150 ohms)</li>
        </ul>
        <p className="text-lg text-purple-400 font-medium">
          What happens to the current through R2?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'A', text: 'Only the larger current flows through R2' },
          { id: 'B', text: 'The currents cancel each other out' },
          { id: 'C', text: 'Both currents combine and flow through R2' },
          { id: 'D', text: 'Current splits equally from both sources' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            style={{ zIndex: 10 }}
            disabled={showTwistResult}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistResult && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistResult && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistResult && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-md">
          <p className={`font-semibold ${twistPrediction === 'C' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {twistPrediction === 'C'
              ? 'Excellent! KCL tells us currents combine at nodes!'
              : 'Remember: KCL says all currents at a node must be accounted for.'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            By KCL at node N1: Current from the 12V path plus current from the 9V path both flow through R2. The shared resistor carries the combined current.
          </p>
          <button
            onClick={() => completePhase()}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Explore Multi-Loop Circuit
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
        Multi-Loop Circuit Lab
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderMultiLoopCircuit(isMobile ? 360 : 450, isMobile ? 280 : 320)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 w-full max-w-2xl">
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">V1 (Volts)</label>
          <input
            type="range"
            min="5"
            max="20"
            value={voltage1}
            onChange={(e) => setVoltage1(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-cyan-400 font-bold">{voltage1}V</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">V2 (Volts)</label>
          <input
            type="range"
            min="5"
            max="15"
            value={voltage2}
            onChange={(e) => setVoltage2(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-amber-400 font-bold">{voltage2}V</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R1 (Ohms)</label>
          <input
            type="range"
            min="50"
            max="300"
            step="25"
            value={loopResistance1}
            onChange={(e) => setLoopResistance1(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-blue-400 font-bold">{loopResistance1}O</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R2 (Ohms)</label>
          <input
            type="range"
            min="50"
            max="300"
            step="25"
            value={loopResistance2}
            onChange={(e) => setLoopResistance2(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-amber-400 font-bold">{loopResistance2}O</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R3 (Ohms)</label>
          <input
            type="range"
            min="50"
            max="300"
            step="25"
            value={loopResistance3}
            onChange={(e) => setLoopResistance3(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-purple-400 font-bold">{loopResistance3}O</span>
        </div>
      </div>

      <button
        onClick={() => setShowMultiLoopFlow(!showMultiLoopFlow)}
        style={{ zIndex: 10 }}
        className={`mb-6 px-4 py-2 rounded-xl font-semibold transition-all ${
          showMultiLoopFlow
            ? 'bg-amber-600 hover:bg-amber-500 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
        }`}
      >
        {showMultiLoopFlow ? 'Hide Current Flow' : 'Show Current Flow'}
      </button>

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 max-w-2xl">
        <h3 className="text-purple-400 font-bold mb-2">Multi-Loop Analysis:</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>* Each loop follows KVL independently</li>
          <li>* Currents from both loops meet at shared nodes (KCL)</li>
          <li>* The shared resistor R2 carries combined current</li>
          <li>* Adjust values to see how loops interact</li>
        </ul>
      </div>

      <button
        onClick={() => completePhase()}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        Learn Analysis Techniques
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Analyzing Complex Circuits
      </h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-3xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4 text-center">Systematic Analysis Method</h3>

        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-cyan-400 font-bold mb-2">Step 1: Identify Nodes</h4>
            <p className="text-slate-300 text-sm">
              Find all junction points where three or more wires meet. Label them (A, B, C...). Apply KCL to each node: sum of currents in = sum of currents out.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-amber-400 font-bold mb-2">Step 2: Identify Loops</h4>
            <p className="text-slate-300 text-sm">
              Find all independent closed loops in the circuit. Apply KVL to each: sum of voltage rises = sum of voltage drops around the loop.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-emerald-400 font-bold mb-2">Step 3: Set Up Equations</h4>
            <p className="text-slate-300 text-sm">
              Write KCL equations for (N-1) nodes and KVL equations for each independent loop. Solve the system of equations simultaneously.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-pink-400 font-bold mb-2">Step 4: Solve and Verify</h4>
            <p className="text-slate-300 text-sm">
              Calculate unknown currents and voltages. Verify by checking that KCL and KVL are satisfied at all nodes and loops.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-cyan-400 font-bold mb-2">For N Nodes:</h4>
          <p className="text-slate-300 text-sm">
            You need (N-1) independent KCL equations. The Nth equation is redundant since total current in equals total current out for the whole circuit.
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-amber-400 font-bold mb-2">For B Branches:</h4>
          <p className="text-slate-300 text-sm">
            The number of independent loops equals B - N + 1. These are called the fundamental loops or mesh currents.
          </p>
        </div>
      </div>

      <button
        onClick={() => completePhase()}
        style={{ zIndex: 10 }}
        className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = transferApps[activeApp];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
          Real-World Applications
        </h2>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {transferApps.map((a, index) => (
            <button
              key={index}
              onClick={() => handleAppExplore(index)}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeApp === index
                  ? `bg-gradient-to-r ${a.color} text-white`
                  : completedApps.has(index)
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              [{a.icon}] {a.short}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl font-bold text-white">[{app.icon}]</span>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-slate-400">{app.tagline}</p>
            </div>
          </div>

          <p className="text-slate-300 mb-4">{app.description}</p>

          <div className={`bg-gradient-to-r ${app.color} bg-opacity-20 rounded-xl p-4 mb-4`}>
            <h4 className="font-semibold text-white mb-2">Physics Connection:</h4>
            <p className="text-slate-200 text-sm">{app.connection}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-cyan-400 mb-2">How It Works:</h4>
              <ul className="text-slate-300 text-sm space-y-1">
                {app.howItWorks.slice(0, 3).map((item, i) => (
                  <li key={i}>* {item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-amber-400 mb-2">Key Stats:</h4>
              <div className="grid grid-cols-2 gap-2">
                {app.stats.slice(0, 4).map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4">
            <h4 className="font-semibold text-purple-400 mb-2">Industry Leaders:</h4>
            <div className="flex flex-wrap gap-2">
              {app.companies.map((company, i) => (
                <span key={i} className="px-3 py-1 bg-slate-600/50 rounded-full text-sm text-slate-300">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-slate-400">Explored:</span>
          <div className="flex gap-1">
            {transferApps.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/{transferApps.length}</span>
        </div>

        {completedApps.size >= transferApps.length && (
          <button
            onClick={() => completePhase()}
            style={{ zIndex: 10 }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];
    const progress = (answeredQuestions.size / testQuestions.length) * 100;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
          Knowledge Test
        </h2>

        <div className="w-full max-w-2xl mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentQuestion + 1} of {testQuestions.length}</span>
            <span>{correctAnswers} correct</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
            <p className="text-sm text-cyan-400 font-medium mb-2">Scenario:</p>
            <p className="text-slate-300">{question.scenario}</p>
          </div>

          <p className="text-lg text-white font-medium mb-4">{question.question}</p>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                style={{ zIndex: 10 }}
                disabled={answeredQuestions.has(currentQuestion)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  showResult
                    ? option.correct
                      ? 'bg-emerald-600/40 border-2 border-emerald-400'
                      : selectedAnswer === index
                      ? 'bg-red-600/40 border-2 border-red-400'
                      : 'bg-slate-700/30 border-2 border-transparent opacity-50'
                    : selectedAnswer === index
                    ? 'bg-cyan-600/40 border-2 border-cyan-400'
                    : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                }`}
              >
                <span className="text-slate-200">{option.text}</span>
              </button>
            ))}
          </div>

          {showResult && (
            <div className={`mt-4 p-4 rounded-xl ${
              question.options[selectedAnswer!]?.correct
                ? 'bg-emerald-900/30 border border-emerald-600'
                : 'bg-amber-900/30 border border-amber-600'
            }`}>
              <p className={`font-semibold mb-2 ${
                question.options[selectedAnswer!]?.correct ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {question.options[selectedAnswer!]?.correct ? 'Correct!' : 'Not quite'}
              </p>
              <p className="text-slate-300 text-sm">{question.explanation}</p>
            </div>
          )}
        </div>

        {showResult && (
          <button
            onClick={() => handleNextQuestion()}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => {
    const passed = testScore >= 7;

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className={`rounded-3xl p-8 max-w-2xl ${
          passed
            ? 'bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50'
            : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50'
        }`}>
          <div className="text-8xl mb-6">{passed ? '[LIGHTNING]' : '[BOOK]'}</div>
          <h1 className={`text-3xl font-bold mb-4 ${passed ? 'text-white' : 'text-slate-300'}`}>
            {passed ? 'Circuit Analysis Master!' : 'Keep Learning!'}
          </h1>

          <div className="text-5xl font-bold text-cyan-400 mb-4">
            {testScore}/10
          </div>

          <p className="text-xl text-slate-300 mb-6">
            {passed
              ? "You've mastered Kirchhoff's Laws! You understand how current and voltage behave in complex circuits."
              : "Review the concepts and try again. Understanding Kirchhoff's Laws is fundamental to circuit analysis."}
          </p>

          {passed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2 text-cyan-400">KCL</div>
                <p className="text-sm text-slate-300">Current Mastery</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2 text-amber-400">KVL</div>
                <p className="text-sm text-slate-300">Voltage Mastery</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2 text-emerald-400">N</div>
                <p className="text-sm text-slate-300">Node Analysis</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2 text-purple-400">L</div>
                <p className="text-sm text-slate-300">Loop Analysis</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setShowResult(false);
                setCorrectAnswers(0);
                setAnsweredQuestions(new Set());
                setTestScore(0);
                goToPhase(passed ? 'hook' : 'test');
              }}
              style={{ zIndex: 10 }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                passed
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
              }`}
            >
              {passed ? 'Start Over' : 'Try Again'}
            </button>
            {!passed && (
              <button
                onClick={() => goToPhase('review')}
                style={{ zIndex: 10 }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
              >
                Review Concepts
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // =============================================
  // MAIN RENDER
  // =============================================
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

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">
              {isMobile ? 'Kirchhoff' : "Kirchhoff's Laws"}
            </span>
            <span className="text-sm text-slate-500">{phaseNames[phase]}</span>
          </div>
          <div className="flex justify-between px-1">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= currentPhaseIndex
                    ? 'bg-cyan-500'
                    : 'bg-slate-700'
                } ${i === currentPhaseIndex ? 'w-6' : 'w-2'}`}
                title={phaseNames[p]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-8 relative z-10">
        {renderPhase()}
      </div>
    </div>
  );
};

export default KirchhoffsLawsRenderer;
