import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================
// TYPES
// =============================================
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
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
}

// =============================================
// CONSTANTS
// =============================================
const phaseNames = [
  'Hook',
  'Predict',
  'Experiment',
  'Measure',
  'Analyze',
  'Challenge',
  'Apply',
  'Transfer',
  'Test',
  'Mastery'
];

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
    explanation: "By Kirchhoff's Current Law (KCL), ΣI = 0 at any node. If 2.5A enters and 0.8A + 1.2A = 2.0A leaves through two branches, the third branch must carry 2.5A - 2.0A = 0.5A to conserve charge."
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
    explanation: "By Kirchhoff's Voltage Law (KVL), the sum of voltages around any closed loop equals zero: +12V - 4V - 5V - V₃ = 0, therefore V₃ = 3V."
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
    explanation: "KCL states that charge is conserved at every node. If 3A + 2.5A + 4A = 9.5A enters junction A, exactly 9.5A must leave. This is independent of resistance - it's conservation of charge."
  },
  {
    scenario: "You're analyzing a circuit with two parallel branches connected to a 9V source. One branch has a 30Ω resistor, the other has a 45Ω resistor.",
    question: "Applying KVL to each parallel branch, what can you conclude?",
    options: [
      { text: "Each branch has exactly 9V across it since they share the same two nodes", correct: true },
      { text: "The 30Ω branch has more voltage since it has less resistance", correct: false },
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
    scenario: "A technician connects an ammeter at three different points in a series circuit with a 10V source and two 100Ω resistors.",
    question: "What will the ammeter read at each of the three points?",
    options: [
      { text: "50mA at all three points - current is constant in series", correct: true },
      { text: "100mA, 50mA, 25mA - current decreases through circuit", correct: false },
      { text: "50mA before first resistor, 0mA after second resistor", correct: false },
      { text: "Different values depending on where measured", correct: false }
    ],
    explanation: "In a series circuit, there's only one path for current. By KCL, the same current (I = V/R_total = 10V/200Ω = 50mA) must flow through every point to conserve charge."
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
    icon: "⚡",
    title: "Power Grid Management",
    short: "Smart Grid",
    tagline: "Balancing electricity flow across continents",
    description: "Power utilities use Kirchhoff's Laws every second to balance generation and consumption across massive electrical grids spanning thousands of miles.",
    connection: "KCL ensures that power generated equals power consumed plus losses at every substation. KVL helps calculate voltage drops across transmission lines to maintain stable delivery.",
    howItWorks: [
      "Sensors measure current at thousands of junction points across the grid",
      "SCADA systems apply KCL to verify power balance at each node",
      "KVL calculations predict voltage levels at remote locations",
      "Automatic systems adjust generators and transformers to maintain balance",
      "Real-time analysis prevents blackouts by detecting imbalances early"
    ],
    stats: [
      { value: "450K+", label: "Miles of transmission lines in US" },
      { value: "99.97%", label: "Grid reliability target" },
      { value: "4,000+", label: "Power plants coordinated" },
      { value: "$400B", label: "Annual US electricity market" }
    ],
    examples: [
      "California ISO balances solar generation peaks",
      "Texas ERCOT managing wind power variability",
      "European grid synchronization across 35 countries",
      "New York City underground cable networks"
    ],
    companies: ["Siemens Energy", "GE Grid Solutions", "ABB", "Schneider Electric", "Eaton"],
    futureImpact: "As renewable energy grows, Kirchhoff's Laws become even more critical for integrating variable solar and wind sources while maintaining grid stability.",
    color: "from-yellow-600 to-orange-600"
  },
  {
    icon: "📱",
    title: "Smartphone Power Systems",
    short: "Mobile Tech",
    tagline: "Managing milliamps in your pocket",
    description: "Every smartphone contains sophisticated power management ICs that apply Kirchhoff's Laws to route current from the battery to dozens of components simultaneously.",
    connection: "KCL determines how battery current splits between display, processor, radios, and sensors. KVL ensures voltage regulators provide correct power levels to each component.",
    howItWorks: [
      "Power management IC monitors current draw from all subsystems",
      "KCL calculations ensure total current doesn't exceed battery capacity",
      "Multiple voltage rails use KVL for conversion efficiency",
      "Dynamic power allocation based on real-time demand",
      "Thermal management uses current distribution data"
    ],
    stats: [
      { value: "50+", label: "Components sharing power" },
      { value: "20+", label: "Different voltage rails" },
      { value: "95%+", label: "Power conversion efficiency" },
      { value: "5W-25W", label: "Fast charging power levels" }
    ],
    examples: [
      "Apple's A-series power management",
      "Qualcomm Quick Charge technology",
      "Samsung Adaptive Fast Charging",
      "Wireless charging power circuits"
    ],
    companies: ["Apple", "Qualcomm", "Texas Instruments", "MediaTek", "Dialog Semiconductor"],
    futureImpact: "Future phones with multiple batteries, solar charging, and AI-driven power optimization will rely even more heavily on advanced Kirchhoff's Laws implementations.",
    color: "from-blue-600 to-purple-600"
  },
  {
    icon: "🚗",
    title: "Electric Vehicle Battery Management",
    short: "EV Systems",
    tagline: "Orchestrating thousands of cells",
    description: "EV battery packs contain thousands of individual cells that must be balanced and monitored using Kirchhoff's Laws to ensure safety, longevity, and performance.",
    connection: "KCL monitors current distribution across parallel cell groups. KVL ensures voltage balance across series-connected cells, critical for preventing overcharge and maximizing range.",
    howItWorks: [
      "Battery Management System (BMS) monitors each cell's current contribution",
      "KCL detects cells providing more or less than their share",
      "KVL identifies voltage imbalances between series cells",
      "Active balancing circuits redistribute charge using Kirchhoff principles",
      "Regenerative braking circuits apply KCL for energy recovery"
    ],
    stats: [
      { value: "7,000+", label: "Cells in typical EV pack" },
      { value: "400V-800V", label: "Pack voltage ranges" },
      { value: "1,000+", label: "Current sensors per pack" },
      { value: "0.1%", label: "Cell balance tolerance" }
    ],
    examples: [
      "Tesla's custom battery management system",
      "Rivian's skateboard platform design",
      "Porsche Taycan 800V architecture",
      "Formula E race car power systems"
    ],
    companies: ["Tesla", "BYD", "CATL", "LG Energy Solution", "Panasonic"],
    futureImpact: "Solid-state batteries and vehicle-to-grid technology will require even more sophisticated applications of Kirchhoff's Laws for bidirectional power flow.",
    color: "from-green-600 to-teal-600"
  },
  {
    icon: "🖥️",
    title: "Computer Motherboard Design",
    short: "PCB Design",
    tagline: "Precision current paths on silicon",
    description: "Modern motherboards route power to dozens of components through complex multi-layer PCBs designed entirely using Kirchhoff's Laws to prevent hot spots and ensure reliability.",
    connection: "KCL ensures adequate current delivery to high-power components like CPUs and GPUs. KVL calculates voltage drops across traces to maintain signal integrity and power quality.",
    howItWorks: [
      "EDA software applies KCL/KVL to simulate power delivery networks",
      "Multiple power planes analyzed for current distribution",
      "Voltage drop calculations determine trace widths",
      "Decoupling capacitor placement based on current loop analysis",
      "Thermal analysis using current density maps"
    ],
    stats: [
      { value: "12+", label: "PCB layers in high-end boards" },
      { value: "300W+", label: "Power delivery capacity" },
      { value: "1M+", label: "Via connections per board" },
      { value: "0.1mm", label: "Minimum trace width" }
    ],
    examples: [
      "Server motherboards with 64-core support",
      "Gaming motherboards with 16-phase VRMs",
      "Data center compute blades",
      "High-frequency trading systems"
    ],
    companies: ["ASUS", "Intel", "AMD", "NVIDIA", "Cadence Design Systems"],
    futureImpact: "3D chip stacking and chiplet architectures will require novel power delivery solutions based on advanced Kirchhoff's Laws analysis.",
    color: "from-purple-600 to-pink-600"
  }
];

// =============================================
// COMPONENT
// =============================================
const KirchhoffsLawsRenderer: React.FC<Props> = ({
  currentPhase = 0,
  onPhaseComplete,
  onGameEvent
}) => {
  // Phase and navigation state
  const [phase, setPhase] = useState(currentPhase);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictionResult, setShowPredictionResult] = useState(false);
  const [challengePrediction, setChallengePrediction] = useState<string | null>(null);
  const [showChallengeResult, setShowChallengeResult] = useState(false);

  // Simulation states - Circuit visualization
  const [voltage1, setVoltage1] = useState(12);
  const [resistance1, setResistance1] = useState(200);
  const [resistance2, setResistance2] = useState(300);
  const [resistance3, setResistance3] = useState(400);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showCurrentFlow, setShowCurrentFlow] = useState(false);
  const [animationOffset, setAnimationOffset] = useState(0);

  // Node analysis
  const [selectedNode, setSelectedNode] = useState<'A' | 'B' | 'C' | null>(null);
  const [showNodeAnalysis, setShowNodeAnalysis] = useState(false);

  // Loop analysis
  const [selectedLoop, setSelectedLoop] = useState<1 | 2 | 3 | null>(null);
  const [showLoopAnalysis, setShowLoopAnalysis] = useState(false);

  // Transfer states
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // =============================================
  // EFFECTS
  // =============================================
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setPhase(currentPhase);
  }, [currentPhase]);

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
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'error':
          oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(277, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.2);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.6);
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
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    if (newPhase < 0 || newPhase > 9) return;

    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);

    onGameEvent?.({
      type: 'phase_change',
      data: { from: phase, to: newPhase, phaseName: phaseNames[newPhase] }
    });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [phase, playSound, onGameEvent]);

  const completePhase = useCallback(() => {
    onPhaseComplete?.(phase);
    if (phase < 9) {
      goToPhase(phase + 1);
    }
  }, [phase, onPhaseComplete, goToPhase]);

  // =============================================
  // CIRCUIT CALCULATIONS
  // =============================================
  // Using mesh current analysis for two-loop circuit
  // Loop 1: V1 - I1*R1 - (I1-I2)*R2 = 0
  // Loop 2: -(I2-I1)*R2 - I2*R3 = 0

  const calculateCurrents = useCallback(() => {
    // For a simple series-parallel circuit:
    // R2 and R3 in series, then parallel with that branch from source through R1
    const r23 = resistance2 + resistance3;
    const rParallel = (resistance1 * r23) / (resistance1 + r23);
    const totalCurrent = voltage1 / rParallel;

    // Current through R1
    const i1 = voltage1 / resistance1;

    // Current through R2 and R3 (series)
    const i23 = voltage1 / r23;

    // For node analysis, total current = i1 + i23
    return { i1, i23, totalCurrent: i1 + i23 };
  }, [voltage1, resistance1, resistance2, resistance3]);

  const calculateVoltages = useCallback(() => {
    const currents = calculateCurrents();
    const v1 = currents.i1 * resistance1; // Should equal voltage1 for parallel
    const v2 = currents.i23 * resistance2;
    const v3 = currents.i23 * resistance3;
    return { v1, v2, v3 };
  }, [calculateCurrents, resistance1, resistance2, resistance3]);

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

  const handleChallengePrediction = useCallback((answer: string) => {
    setChallengePrediction(answer);
    setShowChallengeResult(true);
    const isCorrect = answer === 'C';
    playSound(isCorrect ? 'success' : 'error');
    onGameEvent?.({ type: 'prediction_made', data: { answer, correct: isCorrect, phase: 'challenge' } });
  }, [playSound, onGameEvent]);

  const handleNodeSelect = useCallback((node: 'A' | 'B' | 'C') => {
    setSelectedNode(node);
    setShowNodeAnalysis(true);
    playSound('click');
    onGameEvent?.({ type: 'node_analyzed', data: { node } });
  }, [playSound, onGameEvent]);

  const handleLoopSelect = useCallback((loop: 1 | 2 | 3) => {
    setSelectedLoop(loop);
    setShowLoopAnalysis(true);
    playSound('click');
    onGameEvent?.({ type: 'loop_analyzed', data: { loop } });
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
      onGameEvent?.({ type: 'test_completed', data: { score: correctAnswers, total: testQuestions.length } });
      if (correctAnswers >= 7) {
        playSound('complete');
        completePhase();
      }
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
          <linearGradient id="currentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
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

        {/* Top wire - from battery + to Node A */}
        <line x1="50" y1="100" x2="120" y2="100" stroke="#64748b" strokeWidth="2" />

        {/* Node A */}
        <circle cx="120" cy="100" r="8" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="120" y="80" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">A</text>

        {/* R1 branch - vertical from A to B */}
        <rect x="110" y="120" width="20" height="60" fill="#3b82f6" rx="3" />
        <text x="120" y="155" textAnchor="middle" fill="white" fontSize="10">R1</text>
        <text x="145" y="155" textAnchor="start" fill="#60a5fa" fontSize="11">{resistance1}Ω</text>
        <line x1="120" y1="108" x2="120" y2="120" stroke="#64748b" strokeWidth="2" />
        <line x1="120" y1="180" x2="120" y2="200" stroke="#64748b" strokeWidth="2" />

        {/* Node B (bottom of R1, connects back to battery) */}
        <circle cx="120" cy="200" r="8" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="120" y="225" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">B</text>

        {/* Bottom wire from B back to battery */}
        <line x1="120" y1="200" x2="50" y2="200" stroke="#64748b" strokeWidth="2" />

        {/* Top wire from A to R2-R3 branch */}
        <line x1="128" y1="100" x2="250" y2="100" stroke="#64748b" strokeWidth="2" />

        {/* R2 */}
        <rect x="240" y="110" width="20" height="50" fill="#f59e0b" rx="3" />
        <text x="250" y="140" textAnchor="middle" fill="white" fontSize="10">R2</text>
        <text x="275" y="140" textAnchor="start" fill="#fbbf24" fontSize="11">{resistance2}Ω</text>
        <line x1="250" y1="100" x2="250" y2="110" stroke="#64748b" strokeWidth="2" />

        {/* Node C (between R2 and R3) */}
        <circle cx="250" cy="165" r="6" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="270" y="168" textAnchor="start" fill="#4ade80" fontSize="10">C</text>

        {/* R3 */}
        <line x1="250" y1="160" x2="250" y2="170" stroke="#64748b" strokeWidth="2" />
        <rect x="240" y="170" width="20" height="50" fill="#a855f7" rx="3" />
        <text x="250" y="200" textAnchor="middle" fill="white" fontSize="10">R3</text>
        <text x="275" y="200" textAnchor="start" fill="#c084fc" fontSize="11">{resistance3}Ω</text>
        <line x1="250" y1="220" x2="250" y2="240" stroke="#64748b" strokeWidth="2" />

        {/* Bottom return wire */}
        <line x1="250" y1="240" x2="120" y2="240" stroke="#64748b" strokeWidth="2" />
        <line x1="120" y1="240" x2="120" y2="208" stroke="#64748b" strokeWidth="2" />

        {/* Current flow animation */}
        {showAnimation && showCurrentFlow && (
          <>
            {/* Current direction arrows */}
            <g>
              {/* From battery through R1 */}
              <circle cx={70 + (animationOffset * 2) % 40} cy="100" r="3" fill="#fbbf24" />
              <circle cx={120} cy={100 + (animationOffset * 2) % 80} r="3" fill="#fbbf24" />

              {/* Through R2-R3 branch */}
              <circle cx={170 + (animationOffset * 2) % 60} cy="100" r="3" fill="#fbbf24" />
              <circle cx={250} cy={110 + (animationOffset * 2) % 130} r="3" fill="#fbbf24" />
            </g>
          </>
        )}

        {/* Current values display */}
        <text x="90" y="155" textAnchor="end" fill="#fbbf24" fontSize="11">
          I₁={currents.i1.toFixed(3)}A
        </text>
        <text x={width - 30} y="155" textAnchor="end" fill="#fbbf24" fontSize="11">
          I₂₃={currents.i23.toFixed(3)}A
        </text>

        {/* Voltage drops */}
        <text x="145" y="115" textAnchor="start" fill="#60a5fa" fontSize="10">
          V₁={voltages.v1.toFixed(2)}V
        </text>
        <text x="285" y="135" textAnchor="start" fill="#fbbf24" fontSize="10">
          V₂={voltages.v2.toFixed(2)}V
        </text>
        <text x="285" y="195" textAnchor="start" fill="#c084fc" fontSize="10">
          V₃={voltages.v3.toFixed(2)}V
        </text>

        {/* KCL/KVL labels */}
        <text x={width/2} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="10">
          KCL @ Node A: I_total = I₁ + I₂₃ = {(currents.i1 + currents.i23).toFixed(3)}A
        </text>
      </svg>
    );
  };

  const renderPhase0 = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Electrical Circuits</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
        Kirchhoff's Laws
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        The fundamental rules governing every circuit
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🔄</div>
            <p className="text-cyan-400 font-bold">KCL</p>
            <p className="text-sm text-slate-400">Current at nodes</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">➿</div>
            <p className="text-amber-400 font-bold">KVL</p>
            <p className="text-sm text-slate-400">Voltage around loops</p>
          </div>
        </div>

        {renderCircuit(false, isMobile ? 280 : 350, isMobile ? 220 : 260)}
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
      >
        Discover the Laws
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn how current and voltage obey these universal rules
      </p>
    </div>
  );

  const renderPhase1 = () => (
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
          {/* Junction node */}
          <circle cx={isMobile ? 140 : 175} cy="90" r="15" fill="#22c55e" stroke="#4ade80" strokeWidth="3" />
          {/* Wire 1 - incoming */}
          <line x1="30" y1="60" x2={isMobile ? 125 : 160} y2="85" stroke="#fbbf24" strokeWidth="4" />
          <polygon points="30,55 30,65 15,60" fill="#fbbf24" transform="rotate(180, 30, 60)" />
          <text x="50" y="45" fill="#fbbf24" fontSize="14" fontWeight="bold">5A →</text>
          {/* Wire 2 - incoming */}
          <line x1="30" y1="130" x2={isMobile ? 125 : 160} y2="95" stroke="#fbbf24" strokeWidth="4" />
          <polygon points="30,125 30,135 15,130" fill="#fbbf24" transform="rotate(180, 30, 130)" />
          <text x="50" y="150" fill="#fbbf24" fontSize="14" fontWeight="bold">2A →</text>
          {/* Wire 3 - outgoing */}
          <line x1={isMobile ? 155 : 190} y1="90" x2={isMobile ? 260 : 320} y2="90" stroke="#60a5fa" strokeWidth="4" />
          <polygon points={`${isMobile ? 260 : 320},85 ${isMobile ? 260 : 320},95 ${isMobile ? 275 : 335},90`} fill="#60a5fa" />
          <text x={isMobile ? 200 : 250} y="75" fill="#60a5fa" fontSize="14" fontWeight="bold">? A →</text>
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
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
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
              ? '✓ Correct! Current is conserved at every junction.'
              : '✗ Not quite. Charge cannot be created or destroyed!'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            By Kirchhoff's Current Law: What goes in must come out. 5A + 2A = 7A
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Explore the Circuit →
          </button>
        </div>
      )}
    </div>
  );

  const renderPhase2 = () => (
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
          <label className="text-xs text-slate-400">R1 (Ω)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={resistance1}
            onChange={(e) => setResistance1(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-blue-400 font-bold">{resistance1}Ω</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R2 (Ω)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={resistance2}
            onChange={(e) => setResistance2(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-amber-400 font-bold">{resistance2}Ω</span>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-3">
          <label className="text-xs text-slate-400">R3 (Ω)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={resistance3}
            onChange={(e) => setResistance3(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-purple-400 font-bold">{resistance3}Ω</span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setIsSimulating(!isSimulating);
            setShowCurrentFlow(!showCurrentFlow);
          }}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            isSimulating
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
        >
          {isSimulating ? '⏸ Pause Flow' : '▶ Show Current Flow'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 max-w-2xl">
        <h3 className="text-cyan-400 font-bold mb-2">What You're Seeing:</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>• <span className="text-cyan-400">Blue dots</span> represent current flow direction</li>
          <li>• Current splits at Node A between R1 and the R2-R3 branch</li>
          <li>• All current recombines at Node B (KCL in action!)</li>
          <li>• Adjust values to see how current distribution changes</li>
        </ul>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
      >
        Analyze the Nodes →
      </button>
    </div>
  );

  const renderPhase3 = () => {
    const currents = calculateCurrents();

    const nodeData = {
      A: {
        title: 'Node A (Top Junction)',
        description: 'Current enters from battery, splits into two branches',
        currentsIn: [`I_total = ${(currents.i1 + currents.i23).toFixed(4)}A`],
        currentsOut: [`I₁ = ${currents.i1.toFixed(4)}A`, `I₂₃ = ${currents.i23.toFixed(4)}A`],
        equation: 'ΣI = 0: I_in - I₁ - I₂₃ = 0',
        check: `${(currents.i1 + currents.i23).toFixed(4)} - ${currents.i1.toFixed(4)} - ${currents.i23.toFixed(4)} = 0 ✓`
      },
      B: {
        title: 'Node B (Bottom Junction)',
        description: 'Both branch currents recombine, return to battery',
        currentsIn: [`I₁ = ${currents.i1.toFixed(4)}A`, `I₂₃ = ${currents.i23.toFixed(4)}A`],
        currentsOut: [`I_return = ${(currents.i1 + currents.i23).toFixed(4)}A`],
        equation: 'ΣI = 0: I₁ + I₂₃ - I_return = 0',
        check: `${currents.i1.toFixed(4)} + ${currents.i23.toFixed(4)} - ${(currents.i1 + currents.i23).toFixed(4)} = 0 ✓`
      },
      C: {
        title: 'Node C (R2-R3 Junction)',
        description: 'Series connection - same current flows through',
        currentsIn: [`I₂ = ${currents.i23.toFixed(4)}A (through R2)`],
        currentsOut: [`I₃ = ${currents.i23.toFixed(4)}A (through R3)`],
        equation: 'ΣI = 0: I₂ - I₃ = 0',
        check: `${currents.i23.toFixed(4)} - ${currents.i23.toFixed(4)} = 0 ✓ (Series: same current)`
      }
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
          Kirchhoff's Current Law (KCL)
        </h2>

        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 mb-6 max-w-2xl">
          <p className="text-xl text-center text-cyan-400 font-bold mb-2">ΣI = 0</p>
          <p className="text-slate-300 text-center">
            The algebraic sum of currents at any node equals zero.
            <br />
            <span className="text-sm text-slate-400">Conservation of charge: what goes in must come out!</span>
          </p>
        </div>

        <p className="text-slate-400 mb-4">Click a node to analyze current flow:</p>

        <div className="flex gap-4 mb-6">
          {(['A', 'B', 'C'] as const).map(node => (
            <button
              key={node}
              onMouseDown={(e) => { e.preventDefault(); handleNodeSelect(node); }}
              className={`w-16 h-16 rounded-full text-2xl font-bold transition-all ${
                selectedNode === node
                  ? 'bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {node}
            </button>
          ))}
        </div>

        {showNodeAnalysis && selectedNode && (
          <div className="bg-slate-800/70 rounded-2xl p-6 max-w-2xl w-full animate-fade-in">
            <h3 className="text-xl font-bold text-emerald-400 mb-3">
              {nodeData[selectedNode].title}
            </h3>
            <p className="text-slate-400 mb-4">{nodeData[selectedNode].description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Currents IN:</h4>
                {nodeData[selectedNode].currentsIn.map((c, i) => (
                  <p key={i} className="text-white font-mono">{c}</p>
                ))}
              </div>
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Currents OUT:</h4>
                {nodeData[selectedNode].currentsOut.map((c, i) => (
                  <p key={i} className="text-white font-mono">{c}</p>
                ))}
              </div>
            </div>

            <div className="bg-emerald-900/30 rounded-xl p-4">
              <p className="text-emerald-400 font-mono mb-2">{nodeData[selectedNode].equation}</p>
              <p className="text-emerald-300 font-mono text-sm">{nodeData[selectedNode].check}</p>
            </div>
          </div>
        )}

        <button
          onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          Explore Voltage Law →
        </button>
      </div>
    );
  };

  const renderPhase4 = () => {
    const voltages = calculateVoltages();
    const currents = calculateCurrents();

    const loopData = {
      1: {
        title: 'Loop 1: Battery → R1 → Back',
        color: 'text-blue-400',
        elements: [
          { name: 'Battery', value: `+${voltage1}V`, type: 'source' },
          { name: 'R1', value: `-${voltages.v1.toFixed(2)}V`, type: 'drop' }
        ],
        sum: voltage1 - voltages.v1,
        note: `Since R1 is directly across the battery in parallel, V_R1 = ${voltage1}V`
      },
      2: {
        title: 'Loop 2: Battery → R2 → R3 → Back',
        color: 'text-amber-400',
        elements: [
          { name: 'Battery', value: `+${voltage1}V`, type: 'source' },
          { name: 'R2', value: `-${voltages.v2.toFixed(2)}V`, type: 'drop' },
          { name: 'R3', value: `-${voltages.v3.toFixed(2)}V`, type: 'drop' }
        ],
        sum: voltage1 - voltages.v2 - voltages.v3,
        note: 'V₂ + V₃ must equal the source voltage for series elements in this path'
      },
      3: {
        title: 'Loop 3: R1 → R2 → R3 (Internal)',
        color: 'text-purple-400',
        elements: [
          { name: 'R1 (up)', value: `+${voltages.v1.toFixed(2)}V`, type: 'rise' },
          { name: 'R2', value: `-${voltages.v2.toFixed(2)}V`, type: 'drop' },
          { name: 'R3', value: `-${voltages.v3.toFixed(2)}V`, type: 'drop' }
        ],
        sum: voltages.v1 - voltages.v2 - voltages.v3,
        note: 'The voltages across parallel branches must be equal (both = source)'
      }
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
          Kirchhoff's Voltage Law (KVL)
        </h2>

        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 mb-6 max-w-2xl">
          <p className="text-xl text-center text-amber-400 font-bold mb-2">ΣV = 0</p>
          <p className="text-slate-300 text-center">
            The algebraic sum of voltages around any closed loop equals zero.
            <br />
            <span className="text-sm text-slate-400">Conservation of energy: what goes up must come down!</span>
          </p>
        </div>

        <p className="text-slate-400 mb-4">Select a loop to analyze voltage drops:</p>

        <div className="flex gap-4 mb-6">
          {([1, 2, 3] as const).map(loop => (
            <button
              key={loop}
              onMouseDown={(e) => { e.preventDefault(); handleLoopSelect(loop); }}
              className={`px-6 py-3 rounded-xl text-lg font-bold transition-all ${
                selectedLoop === loop
                  ? 'bg-amber-600 text-white scale-105 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Loop {loop}
            </button>
          ))}
        </div>

        {showLoopAnalysis && selectedLoop && (
          <div className="bg-slate-800/70 rounded-2xl p-6 max-w-2xl w-full animate-fade-in">
            <h3 className={`text-xl font-bold ${loopData[selectedLoop].color} mb-3`}>
              {loopData[selectedLoop].title}
            </h3>

            <div className="space-y-2 mb-4">
              {loopData[selectedLoop].elements.map((el, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-700/50 rounded-lg p-3">
                  <span className="text-slate-300">{el.name}</span>
                  <span className={el.type === 'source' || el.type === 'rise' ? 'text-emerald-400' : 'text-red-400'} >
                    {el.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-amber-900/30 rounded-xl p-4 mb-3">
              <p className="text-amber-400 font-mono">
                Sum: {loopData[selectedLoop].sum.toFixed(4)}V ≈ 0V ✓
              </p>
            </div>

            <p className="text-slate-400 text-sm italic">
              {loopData[selectedLoop].note}
            </p>
          </div>
        )}

        <button
          onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all"
        >
          Take the Challenge →
        </button>
      </div>
    );
  };

  const renderPhase5 = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        Challenge: Complex Circuit Analysis
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          In a circuit with multiple loops and nodes, an engineer measures these values:
        </p>
        <ul className="text-slate-300 mb-4 space-y-1">
          <li>• Total current from supply: 500mA</li>
          <li>• Current through branch A: 200mA</li>
          <li>• Current through branch B: 150mA</li>
          <li>• There's a third branch C</li>
        </ul>
        <p className="text-lg text-purple-400 font-medium">
          What current flows through branch C?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'A', text: '50mA - The difference (200 - 150)' },
          { id: 'B', text: '350mA - The difference (500 - 150)' },
          { id: 'C', text: '150mA - Balance: 500 - 200 - 150 = 150mA' },
          { id: 'D', text: '500mA - All current goes through each branch' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleChallengePrediction(option.id); }}
            disabled={showChallengeResult}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showChallengeResult && challengePrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showChallengeResult && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showChallengeResult && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-md">
          <p className={`font-semibold ${challengePrediction === 'C' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {challengePrediction === 'C'
              ? '✓ Excellent! You applied KCL correctly!'
              : '✗ Remember: Current in = Current out at every node.'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            By KCL: I_total = I_A + I_B + I_C
            <br />
            500mA = 200mA + 150mA + I_C
            <br />
            I_C = 500 - 200 - 150 = 150mA
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Apply the Laws →
          </button>
        </div>
      )}
    </div>
  );

  const renderPhase6 = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Summary: Kirchhoff's Laws
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">
            Kirchhoff's Current Law (KCL)
          </h3>
          <div className="text-3xl text-center text-cyan-400 font-mono mb-4">ΣI = 0</div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Sum of currents at any node equals zero</li>
            <li>• Current entering = Current leaving</li>
            <li>• Based on conservation of charge</li>
            <li>• Applies to every junction in a circuit</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">
            Kirchhoff's Voltage Law (KVL)
          </h3>
          <div className="text-3xl text-center text-amber-400 font-mono mb-4">ΣV = 0</div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Sum of voltages around any closed loop equals zero</li>
            <li>• Voltage rises = Voltage drops</li>
            <li>• Based on conservation of energy</li>
            <li>• Applies to every loop in a circuit</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 max-w-4xl">
        <h3 className="text-xl font-bold text-emerald-400 mb-4">Key Applications</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Power Grids</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📱</div>
            <p className="text-sm text-slate-300">Electronics</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🚗</div>
            <p className="text-sm text-slate-300">EV Batteries</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🖥️</div>
            <p className="text-sm text-slate-300">PCB Design</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all"
      >
        See Real-World Applications →
      </button>
    </div>
  );

  const renderPhase7 = () => {
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
              onMouseDown={(e) => { e.preventDefault(); handleAppExplore(index); }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeApp === index
                  ? `bg-gradient-to-r ${a.color} text-white`
                  : completedApps.has(index)
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{app.icon}</span>
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
                  <li key={i}>• {item}</li>
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
            onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderPhase8 = () => {
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
                onMouseDown={(e) => { e.preventDefault(); handleAnswerSelect(index); }}
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
                {question.options[selectedAnswer!]?.correct ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-slate-300 text-sm">{question.explanation}</p>
            </div>
          )}
        </div>

        {showResult && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleNextQuestion(); }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            {currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →'}
          </button>
        )}
      </div>
    );
  };

  const renderPhase9 = () => {
    const passed = correctAnswers >= 7;

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className={`rounded-3xl p-8 max-w-2xl ${
          passed
            ? 'bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50'
            : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50'
        }`}>
          <div className="text-8xl mb-6">{passed ? '⚡' : '📚'}</div>
          <h1 className={`text-3xl font-bold mb-4 ${passed ? 'text-white' : 'text-slate-300'}`}>
            {passed ? 'Circuit Analysis Master!' : 'Keep Learning!'}
          </h1>

          <div className="text-5xl font-bold text-cyan-400 mb-4">
            {correctAnswers}/10
          </div>

          <p className="text-xl text-slate-300 mb-6">
            {passed
              ? "You've mastered Kirchhoff's Laws! You understand how current and voltage behave in complex circuits."
              : "Review the concepts and try again. Understanding Kirchhoff's Laws is fundamental to circuit analysis."}
          </p>

          {passed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🔄</div>
                <p className="text-sm text-slate-300">KCL Mastery</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">➿</div>
                <p className="text-sm text-slate-300">KVL Mastery</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🔌</div>
                <p className="text-sm text-slate-300">Node Analysis</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🔋</div>
                <p className="text-sm text-slate-300">Loop Analysis</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setShowResult(false);
                setCorrectAnswers(0);
                setAnsweredQuestions(new Set());
                goToPhase(passed ? 0 : 8);
              }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                passed
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
              }`}
            >
              {passed ? '↺ Start Over' : 'Try Again'}
            </button>
            {!passed && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
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
      case 0: return renderPhase0();
      case 1: return renderPhase1();
      case 2: return renderPhase2();
      case 3: return renderPhase3();
      case 4: return renderPhase4();
      case 5: return renderPhase5();
      case 6: return renderPhase6();
      case 7: return renderPhase7();
      case 8: return renderPhase8();
      case 9: return renderPhase9();
      default: return renderPhase0();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">
              {isMobile ? 'Kirchhoff' : "Kirchhoff's Laws"}
            </span>
            <span className="text-sm text-slate-500">{phaseNames[phase]}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {phaseNames.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= phase
                    ? 'bg-cyan-500'
                    : 'bg-slate-700'
                } ${i === phase ? 'w-6' : 'w-2'}`}
                title={phaseNames[i]}
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
