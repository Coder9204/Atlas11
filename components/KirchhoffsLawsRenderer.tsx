'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Kirchhoff's Laws - Complete 10-Phase Game
// The fundamental rules governing every electrical circuit
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

interface KirchhoffsLawsRendererProps {
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
    scenario: "You're designing a circuit board for a new smartphone. At a junction where the main power line splits to feed three components (display, processor, WiFi), the incoming current measures 2.5A.",
    question: "If the display draws 0.8A and the processor draws 1.2A, how much current flows to the WiFi module?",
    options: [
      { id: 'a', label: "0.5A - The sum of currents entering must equal currents leaving", correct: true },
      { id: 'b', label: "1.0A - The current splits equally" },
      { id: 'c', label: "2.5A - All current goes to each branch" },
      { id: 'd', label: "Cannot be determined without voltage" }
    ],
    explanation: "By Kirchhoff's Current Law (KCL), the sum of currents at a node is zero. If 2.5A enters and 0.8A + 1.2A = 2.0A leaves through two branches, the third branch must carry 2.5A - 2.0A = 0.5A to conserve charge."
  },
  {
    scenario: "An electrician is troubleshooting a series circuit with a 12V battery and three resistors. Measurements show 4V across the first resistor and 5V across the second.",
    question: "What voltage should appear across the third resistor?",
    options: [
      { id: 'a', label: "3V - The voltages around the loop must sum to zero", correct: true },
      { id: 'b', label: "12V - Each resistor sees full battery voltage" },
      { id: 'c', label: "4V - Voltage divides equally" },
      { id: 'd', label: "9V - The remaining voltage after the first drop" }
    ],
    explanation: "By Kirchhoff's Voltage Law (KVL), the sum of voltages around any closed loop equals zero: +12V - 4V - 5V - V3 = 0, therefore V3 = 3V."
  },
  {
    scenario: "A solar panel array has four panels connected with a complex network. You measure currents at various points and find 3A from panel 1, 2.5A from panel 2, and 4A from panel 3 all meeting at junction A.",
    question: "What total current leaves junction A toward the inverter?",
    options: [
      { id: 'a', label: "9.5A - Total current in equals total current out", correct: true },
      { id: 'b', label: "3.17A - Average of the three inputs" },
      { id: 'c', label: "4A - Only the largest current passes through" },
      { id: 'd', label: "Depends on the wire resistance" }
    ],
    explanation: "KCL states that charge is conserved at every node. If 3A + 2.5A + 4A = 9.5A enters junction A, exactly 9.5A must leave. This is independent of resistance."
  },
  {
    scenario: "You're analyzing a circuit with two parallel branches connected to a 9V source. One branch has a 30 ohm resistor, the other has a 45 ohm resistor.",
    question: "Applying KVL to each parallel branch, what can you conclude?",
    options: [
      { id: 'a', label: "Each branch has exactly 9V across it since they share the same two nodes", correct: true },
      { id: 'b', label: "The 30 ohm branch has more voltage since it has less resistance" },
      { id: 'c', label: "The voltages add up to 9V split between branches" },
      { id: 'd', label: "Voltage distribution depends on current flow" }
    ],
    explanation: "In a parallel circuit, both branches connect to the same two nodes. By KVL, any path between the same two points must have the same voltage difference. Therefore, both branches have exactly 9V across them."
  },
  {
    scenario: "A car's electrical system has the battery connected to multiple circuits. The headlights draw 8A, the radio draws 2A, and the dashboard draws 1.5A. The alternator supplies charging current.",
    question: "If the battery is neither charging nor discharging, what current must the alternator supply?",
    options: [
      { id: 'a', label: "11.5A - Must equal total load current for equilibrium", correct: true },
      { id: 'b', label: "13.5A - Battery needs extra current for charging" },
      { id: 'c', label: "8A - Only needs to match the largest load" },
      { id: 'd', label: "Cannot determine without voltage information" }
    ],
    explanation: "For the battery to maintain constant charge, KCL requires that current in equals current out. Total load is 8A + 2A + 1.5A = 11.5A, so the alternator must supply exactly 11.5A."
  },
  {
    scenario: "In a resistor network, you trace a loop that goes through: +24V source, -6V drop across R1, +3V from a second source, -15V across R2, and back to start.",
    question: "What voltage appears across the remaining element in this loop?",
    options: [
      { id: 'a', label: "-6V (a 6V drop in the direction of travel)", correct: true },
      { id: 'b', label: "+6V (element adds energy to the circuit)" },
      { id: 'c', label: "0V (loop must have no missing elements)" },
      { id: 'd', label: "24V (returns to battery voltage)" }
    ],
    explanation: "By KVL: +24V - 6V + 3V - 15V + V_remaining = 0. Solving: 24 - 6 + 3 - 15 = 6V, so V_remaining = -6V (a drop of 6V)."
  },
  {
    scenario: "A technician connects an ammeter at three different points in a series circuit with a 10V source and two 100 ohm resistors.",
    question: "What will the ammeter read at each of the three points?",
    options: [
      { id: 'a', label: "50mA at all three points - current is constant in series", correct: true },
      { id: 'b', label: "100mA, 50mA, 25mA - current decreases through circuit" },
      { id: 'c', label: "50mA before first resistor, 0mA after second resistor" },
      { id: 'd', label: "Different values depending on where measured" }
    ],
    explanation: "In a series circuit, there's only one path for current. By KCL, the same current (I = V/R_total = 10V/200 ohms = 50mA) must flow through every point to conserve charge."
  },
  {
    scenario: "A complex circuit has three loops sharing some common branches. An engineer applies KVL to analyze it.",
    question: "How many independent KVL equations can be written for a circuit with 3 loops that share components?",
    options: [
      { id: 'a', label: "3 equations - one for each independent loop", correct: true },
      { id: 'b', label: "1 equation - all loops give the same result" },
      { id: 'c', label: "6 equations - KVL in both directions for each loop" },
      { id: 'd', label: "Depends on the number of components" }
    ],
    explanation: "Each independent loop provides one unique KVL equation. While you can trace multiple paths, only as many equations as independent loops (fundamental cycles) provide new information."
  },
  {
    scenario: "In a Wheatstone bridge used for precise measurements, current flows from node A through two parallel paths (R1-R3 and R2-R4) to node B, with a galvanometer connecting the midpoints.",
    question: "When the bridge is balanced and the galvanometer shows zero current, what does KCL tell us?",
    options: [
      { id: 'a', label: "Current through R1 equals current through R3, and current through R2 equals current through R4", correct: true },
      { id: 'b', label: "All four resistors carry equal current" },
      { id: 'c', label: "No current flows in the entire circuit" },
      { id: 'd', label: "Current through R1 equals current through R2" }
    ],
    explanation: "At balance, zero current through the galvanometer means the current entering each midpoint equals the current leaving (excluding the galvanometer path). So I through R1 must continue through R3, and I through R2 must continue through R4."
  },
  {
    scenario: "An electrical engineer is debugging a circuit where the calculated and measured currents don't match. The circuit has 5 nodes and 8 branches.",
    question: "How many independent KCL equations should the engineer write?",
    options: [
      { id: 'a', label: "4 equations (nodes - 1)", correct: true },
      { id: 'b', label: "5 equations (one per node)" },
      { id: 'c', label: "8 equations (one per branch)" },
      { id: 'd', label: "3 equations (8 - 5)" }
    ],
    explanation: "For N nodes, only (N-1) KCL equations are independent. The Nth equation is always a combination of the others because total current entering the circuit equals total current leaving. Here: 5 - 1 = 4 independent equations."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔋',
    title: 'Battery Management Systems',
    short: 'Balancing EV battery cells',
    tagline: 'Keeping thousands of cells in harmony',
    description: 'Electric vehicles contain thousands of battery cells that must be monitored and balanced. Kirchhoff\'s laws govern how current flows through cell arrays and balancing circuits, ensuring each cell charges evenly.',
    connection: 'KCL tells us the current entering a battery pack equals the current leaving. KVL shows that cell voltages must sum to pack voltage. BMS systems use these laws to detect imbalances.',
    howItWorks: 'BMS circuits apply KVL around cell loops to identify voltage imbalances. Active balancing transfers charge between cells. Current sensors verify KCL at every junction to detect faults.',
    stats: [
      { value: '7000+', label: 'Cells in Tesla', icon: '⚡' },
      { value: '$15B', label: 'BMS market', icon: '📈' },
      { value: '10mV', label: 'Balance accuracy', icon: '🎯' }
    ],
    examples: ['Tesla battery pack management', 'Grid-scale energy storage', 'Laptop power circuits', 'Electric aircraft batteries'],
    companies: ['Tesla', 'LG Energy', 'CATL', 'Panasonic'],
    futureImpact: 'Solid-state batteries will require new BMS architectures, but Kirchhoff\'s laws remain fundamental.',
    color: '#3B82F6'
  },
  {
    icon: '☀️',
    title: 'Solar Array Optimization',
    short: 'Maximizing solar harvest',
    tagline: 'Every photon counts',
    description: 'Solar installations require careful circuit analysis to maximize power output. Kirchhoff\'s laws help engineers understand how partial shading affects string current and how bypass diodes protect panels.',
    connection: 'KCL explains why a shaded cell limits current for the entire string - current must be equal through series-connected cells. KVL shows how bypass diodes activate when cells underperform.',
    howItWorks: 'Maximum power point tracking (MPPT) controllers continuously solve Kirchhoff equations. String inverters sum panel voltages per KVL. Microinverters apply KCL at each panel junction.',
    stats: [
      { value: '99.5%', label: 'MPPT efficiency', icon: '⚡' },
      { value: '$200B', label: 'Solar market', icon: '📈' },
      { value: '30%', label: 'Shade loss possible', icon: '☁️' }
    ],
    examples: ['Utility-scale solar farms', 'Rooftop residential systems', 'Building-integrated PV', 'Solar trackers'],
    companies: ['Enphase', 'SolarEdge', 'SMA', 'Huawei'],
    futureImpact: 'AI-powered optimizers will predict shading and reconfigure arrays in real-time using Kirchhoff\'s laws.',
    color: '#F59E0B'
  },
  {
    icon: '🔌',
    title: 'Power Grid Analysis',
    short: 'Keeping the lights on',
    tagline: 'Balancing supply and demand at scale',
    description: 'Electrical grids are massive networks where Kirchhoff\'s laws govern power flow. Grid operators use these laws to calculate load distribution, identify bottlenecks, and prevent blackouts.',
    connection: 'At every substation, currents entering must equal currents leaving (KCL). Around any loop in the grid, voltage drops must sum to zero (KVL). Violations indicate faults.',
    howItWorks: 'SCADA systems model the grid as thousands of nodes and branches. State estimation algorithms verify Kirchhoff equations. Contingency analysis simulates failures to ensure reliability.',
    stats: [
      { value: '450K mi', label: 'US transmission', icon: '🔌' },
      { value: '1T kWh', label: 'US yearly use', icon: '📈' },
      { value: '99.97%', label: 'Grid reliability', icon: '✓' }
    ],
    examples: ['Regional transmission networks', 'Distribution substations', 'Microgrid controllers', 'Renewable integration'],
    companies: ['GE Grid', 'Siemens Energy', 'ABB', 'Schneider Electric'],
    futureImpact: 'Distributed energy resources will require real-time Kirchhoff analysis at millions of nodes.',
    color: '#10B981'
  },
  {
    icon: '💻',
    title: 'PCB Power Distribution',
    short: 'Powering complex electronics',
    tagline: 'Millivolts matter at GHz speeds',
    description: 'Modern circuit boards have complex power distribution networks delivering clean power to processors at billions of cycles per second. Kirchhoff\'s laws govern voltage drops and current sharing.',
    connection: 'KVL shows why voltage regulators must be placed close to loads - IR drops reduce voltage at the chip. KCL determines how current divides between parallel power planes.',
    howItWorks: 'PDN design uses KVL to calculate trace resistance and inductance. Decoupling capacitors provide local charge. Engineers analyze current sharing to prevent hotspots.',
    stats: [
      { value: '1mohm', label: 'Target impedance', icon: '⚡' },
      { value: '100A+', label: 'CPU current', icon: '🔥' },
      { value: '±3%', label: 'Voltage tolerance', icon: '🎯' }
    ],
    examples: ['Server motherboard design', 'Smartphone PCB layout', 'GPU power delivery', 'Automotive ECU design'],
    companies: ['Intel', 'AMD', 'NVIDIA', 'Qualcomm'],
    futureImpact: 'Chiplet architectures will require sophisticated power delivery with Kirchhoff analysis at the microscale.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const KirchhoffsLawsRenderer: React.FC<KirchhoffsLawsRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Circuit simulation state
  const [voltage, setVoltage] = useState(12); // V
  const [resistance1, setResistance1] = useState(200); // ohms
  const [resistance2, setResistance2] = useState(300); // ohms
  const [resistance3, setResistance3] = useState(400); // ohms
  const [showCurrentFlow, setShowCurrentFlow] = useState(false);
  const [animationOffset, setAnimationOffset] = useState(0);

  // Twist phase - multi-loop circuit
  const [voltage2, setVoltage2] = useState(9); // V
  const [loopR1, setLoopR1] = useState(100); // ohms
  const [loopR2, setLoopR2] = useState(150); // ohms
  const [loopR3, setLoopR3] = useState(200); // ohms
  const [showMultiLoopFlow, setShowMultiLoopFlow] = useState(false);

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

  // Animation timer
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationOffset(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Calculate circuit values
  const calculateCurrents = () => {
    // R2 and R3 in series
    const r23 = resistance2 + resistance3;
    // R1 in parallel with R2+R3
    const rParallel = (resistance1 * r23) / (resistance1 + r23);
    const totalCurrent = voltage / rParallel;
    const i1 = voltage / resistance1;
    const i23 = voltage / r23;
    return { i1, i23, totalCurrent: i1 + i23, rParallel };
  };

  const calculateVoltages = () => {
    const { i23 } = calculateCurrents();
    const v2 = i23 * resistance2;
    const v3 = i23 * resistance3;
    return { v1: voltage, v2, v3 };
  };

  // Multi-loop calculations
  const calculateMultiLoop = () => {
    const i1 = voltage / (loopR1 + loopR2);
    const i2 = voltage2 / (loopR2 + loopR3);
    return { i1, i2, iShared: i1 + i2 };
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for circuits
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
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
    twist_play: 'Multi-Loop',
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
        gameType: 'kirchhoffs-laws',
        gameTitle: "Kirchhoff's Laws",
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

  // Circuit Visualization SVG
  const CircuitVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const currents = calculateCurrents();
    const voltages = calculateVoltages();

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Parallel-Series Circuit
        </text>

        {/* Battery */}
        <g transform="translate(30, 80)">
          <rect x="0" y="0" width="25" height="80" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
          <rect x="5" y="15" width="15" height="8" fill="#ef4444" rx="2" />
          <rect x="5" y="57" width="15" height="5" fill="#22c55e" rx="1" />
          <text x="12" y="40" textAnchor="middle" fill={colors.textPrimary} fontSize="10">{voltage}V</text>
        </g>

        {/* Wires and components */}
        {/* Top wire from battery */}
        <line x1="55" y1="90" x2="110" y2="90" stroke="url(#wireGrad)" strokeWidth="3" />

        {/* Node A */}
        <circle cx="120" cy="90" r="10" fill="url(#nodeGlow)" filter="url(#glowFilter)" />
        <circle cx="120" cy="90" r="6" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="120" y="75" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="600">A</text>

        {/* R1 branch (vertical) */}
        <line x1="120" y1="100" x2="120" y2="120" stroke="url(#wireGrad)" strokeWidth="3" />
        <rect x="108" y="120" width="24" height="60" fill="#3b82f6" rx="4" />
        <text x="120" y="155" textAnchor="middle" fill="white" fontSize="9">R1</text>
        <text x="145" y="150" fill="#60a5fa" fontSize="9">{resistance1}Ω</text>
        <line x1="120" y1="180" x2="120" y2="200" stroke="url(#wireGrad)" strokeWidth="3" />

        {/* Wire to R2-R3 branch */}
        <line x1="130" y1="90" x2="220" y2="90" stroke="url(#wireGrad)" strokeWidth="3" />

        {/* R2 */}
        <line x1="220" y1="90" x2="220" y2="110" stroke="url(#wireGrad)" strokeWidth="3" />
        <rect x="208" y="110" width="24" height="50" fill="#f59e0b" rx="4" />
        <text x="220" y="140" textAnchor="middle" fill="white" fontSize="9">R2</text>
        <text x="240" y="135" fill="#fbbf24" fontSize="9">{resistance2}Ω</text>

        {/* Node C between R2 and R3 */}
        <circle cx="220" cy="170" r="6" fill="#22c55e" stroke="#4ade80" strokeWidth="1" />
        <text x="235" y="175" fill="#4ade80" fontSize="9">C</text>

        {/* R3 */}
        <line x1="220" y1="176" x2="220" y2="185" stroke="url(#wireGrad)" strokeWidth="3" />
        <rect x="208" y="185" width="24" height="50" fill="#a855f7" rx="4" />
        <text x="220" y="215" textAnchor="middle" fill="white" fontSize="9">R3</text>
        <text x="240" y="210" fill="#c084fc" fontSize="9">{resistance3}Ω</text>
        <line x1="220" y1="235" x2="220" y2="250" stroke="url(#wireGrad)" strokeWidth="3" />

        {/* Bottom wires */}
        <line x1="120" y1="200" x2="120" y2="250" stroke="url(#wireGrad)" strokeWidth="3" />

        {/* Node B */}
        <circle cx="120" cy="200" r="10" fill="url(#nodeGlow)" filter="url(#glowFilter)" />
        <circle cx="120" cy="200" r="6" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x="120" y="220" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="600">B</text>

        <line x1="120" y1="250" x2="55" y2="250" stroke="url(#wireGrad)" strokeWidth="3" />
        <line x1="220" y1="250" x2="120" y2="250" stroke="url(#wireGrad)" strokeWidth="3" />
        <line x1="42" y1="160" x2="42" y2="250" stroke="url(#wireGrad)" strokeWidth="3" />
        <line x1="42" y1="250" x2="120" y2="250" stroke="url(#wireGrad)" strokeWidth="3" />

        {/* Current flow animation */}
        {showCurrentFlow && (
          <g filter="url(#glowFilter)">
            {/* Current through main path */}
            <circle cx={60 + (animationOffset * 0.5) % 50} cy="90" r="4" fill="#fbbf24" />
            {/* Current through R1 */}
            <circle cx={120} cy={105 + (animationOffset * 0.7) % 90} r="4" fill="#fbbf24" />
            {/* Current through R2-R3 */}
            <circle cx={220} cy={95 + (animationOffset * 0.5) % 150} r="4" fill="#fbbf24" />
            {/* Return current */}
            <circle cx={200 - (animationOffset * 0.6) % 150} cy="250" r="4" fill="#fbbf24" />
          </g>
        )}

        {/* Current values display */}
        <g transform={`translate(${width - 120}, 60)`}>
          <rect x="0" y="0" width="110" height="90" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x="55" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="10">Currents</text>
          <text x="10" y="38" fill="#60a5fa" fontSize="11">I1: {currents.i1.toFixed(3)}A</text>
          <text x="10" y="55" fill="#fbbf24" fontSize="11">I23: {currents.i23.toFixed(3)}A</text>
          <text x="10" y="75" fill="#22c55e" fontSize="11">Total: {currents.totalCurrent.toFixed(3)}A</text>
        </g>

        {/* KCL verification */}
        <g transform={`translate(${width - 120}, 160)`}>
          <rect x="0" y="0" width="110" height="55" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
          <text x="55" y="18" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="600">KCL at Node A</text>
          <text x="55" y="38" textAnchor="middle" fill={colors.textPrimary} fontSize="10">
            I_in = I1 + I23
          </text>
          <text x="55" y="50" textAnchor="middle" fill={colors.success} fontSize="9">Verified!</text>
        </g>
      </svg>
    );
  };

  // Multi-loop circuit visualization
  const MultiLoopVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const { i1, i2, iShared } = calculateMultiLoop();

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="wireGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Multi-Loop Circuit (Two Sources)
        </text>

        {/* Loop 1 region */}
        <ellipse cx="100" cy="150" rx="70" ry="60" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="5,3" />
        <text x="100" y="210" textAnchor="middle" fill="#60a5fa" fontSize="10">Loop 1</text>

        {/* Loop 2 region */}
        <ellipse cx={width - 100} cy="150" rx="70" ry="60" fill="rgba(168, 85, 247, 0.1)" stroke="#a855f7" strokeWidth="1" strokeDasharray="5,3" />
        <text x={width - 100} y="210" textAnchor="middle" fill="#c084fc" fontSize="10">Loop 2</text>

        {/* Battery 1 */}
        <g transform="translate(30, 100)">
          <rect x="0" y="0" width="20" height="60" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="3" />
          <rect x="4" y="10" width="12" height="6" fill="#ef4444" rx="1" />
          <rect x="4" y="44" width="12" height="4" fill="#22c55e" rx="1" />
          <text x="10" y="32" textAnchor="middle" fill={colors.textPrimary} fontSize="8">{voltage}V</text>
        </g>

        {/* Battery 2 */}
        <g transform={`translate(${width - 50}, 100)`}>
          <rect x="0" y="0" width="20" height="60" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="3" />
          <rect x="4" y="10" width="12" height="6" fill="#ef4444" rx="1" />
          <rect x="4" y="44" width="12" height="4" fill="#22c55e" rx="1" />
          <text x="10" y="32" textAnchor="middle" fill={colors.textPrimary} fontSize="8">{voltage2}V</text>
        </g>

        {/* Top wires */}
        <line x1="50" y1="100" x2="50" y2="70" stroke="url(#wireGrad2)" strokeWidth="3" />
        <line x1="50" y1="70" x2="130" y2="70" stroke="url(#wireGrad2)" strokeWidth="3" />

        {/* R1 */}
        <rect x="130" y="58" width="50" height="24" fill="#3b82f6" rx="4" />
        <text x="155" y="75" textAnchor="middle" fill="white" fontSize="9">R1 {loopR1}Ω</text>

        <line x1="180" y1="70" x2={width/2 - 10} y2="70" stroke="url(#wireGrad2)" strokeWidth="3" />

        {/* Shared node N1 */}
        <circle cx={width/2} cy="70" r="10" fill="rgba(34, 197, 94, 0.3)" />
        <circle cx={width/2} cy="70" r="6" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />
        <text x={width/2} y="55" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="600">N1</text>

        {/* R2 (shared, vertical) */}
        <line x1={width/2} y1="80" x2={width/2} y2="100" stroke="url(#wireGrad2)" strokeWidth="3" />
        <rect x={width/2 - 12} y="100" width="24" height="60" fill="#f59e0b" rx="4" />
        <text x={width/2} y="135" textAnchor="middle" fill="white" fontSize="9">R2</text>
        <text x={width/2 + 20} y="130" fill="#fbbf24" fontSize="9">{loopR2}Ω</text>
        <line x1={width/2} y1="160" x2={width/2} y2="200" stroke="url(#wireGrad2)" strokeWidth="3" />

        {/* Continue to R3 */}
        <line x1={width/2 + 10} y1="70" x2={width - 130} y2="70" stroke="url(#wireGrad2)" strokeWidth="3" />

        {/* R3 */}
        <rect x={width - 130} y="58" width="50" height="24" fill="#a855f7" rx="4" />
        <text x={width - 105} y="75" textAnchor="middle" fill="white" fontSize="9">R3 {loopR3}Ω</text>

        <line x1={width - 80} y1="70" x2={width - 40} y2="70" stroke="url(#wireGrad2)" strokeWidth="3" />
        <line x1={width - 40} y1="70" x2={width - 40} y2="100" stroke="url(#wireGrad2)" strokeWidth="3" />

        {/* Bottom wires */}
        <line x1="50" y1="160" x2="50" y2="200" stroke="url(#wireGrad2)" strokeWidth="3" />
        <line x1="50" y1="200" x2={width/2} y2="200" stroke="url(#wireGrad2)" strokeWidth="3" />
        <line x1={width/2} y1="200" x2={width - 40} y2="200" stroke="url(#wireGrad2)" strokeWidth="3" />
        <line x1={width - 40} y1="160" x2={width - 40} y2="200" stroke="url(#wireGrad2)" strokeWidth="3" />

        {/* Current flow animation */}
        {showMultiLoopFlow && (
          <g>
            {/* Loop 1 current */}
            <circle cx={70 + (animationOffset * 0.6) % 100} cy="70" r="4" fill="#60a5fa" />
            {/* Loop 2 current */}
            <circle cx={width - 70 - (animationOffset * 0.6) % 100} cy="70" r="4" fill="#c084fc" />
            {/* Shared R2 current */}
            <circle cx={width/2} cy={110 + (animationOffset * 0.5) % 80} r="5" fill="#fbbf24" />
          </g>
        )}

        {/* Current values */}
        <g transform={`translate(${width - 130}, 230)`}>
          <rect x="0" y="0" width="120" height="80" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x="60" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="10">Loop Currents</text>
          <text x="10" y="38" fill="#60a5fa" fontSize="11">I1: {i1.toFixed(3)}A</text>
          <text x="10" y="55" fill="#c084fc" fontSize="11">I2: {i2.toFixed(3)}A</text>
          <text x="10" y="72" fill="#fbbf24" fontSize="11">I_R2: {iShared.toFixed(3)}A</text>
        </g>

        {/* KCL at N1 */}
        <g transform="translate(10, 230)">
          <rect x="0" y="0" width="120" height="60" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
          <text x="60" y="18" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="600">KCL at N1</text>
          <text x="60" y="38" textAnchor="middle" fill={colors.textPrimary} fontSize="10">I1 + I2 = I_R2</text>
          <text x="60" y="52" textAnchor="middle" fill={colors.success} fontSize="9">Currents combine!</text>
        </g>
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
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
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
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
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🔌
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Kirchhoff&apos;s Laws
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Two simple rules discovered in 1845 that govern <span style={{ color: colors.accent }}>every electrical circuit ever built</span> - from your smartphone to the power grid.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: colors.accent, fontWeight: 700 }}>KCL</div>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 0' }}>Current Law</p>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Sum of currents = 0</p>
            </div>
            <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: colors.warning, fontWeight: 700 }}>KVL</div>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 0' }}>Voltage Law</p>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Sum of voltages = 0</p>
            </div>
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            Gustav Kirchhoff discovered these conservation laws that form the foundation of all circuit analysis.
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Laws
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: '3A - The difference between inputs' },
      { id: 'b', text: '7A - The sum of the inputs', correct: true },
      { id: 'c', text: '5A - Only the largest current continues' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            At a junction where wires meet, 5A flows in through wire 1 and 2A flows in through wire 2. How much current flows out through wire 3?
          </h2>

          {/* Simple junction diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 280 : 350} height="150" style={{ margin: '0 auto' }}>
              <defs>
                <filter id="nodeGlow2">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Junction node */}
              <circle cx={isMobile ? 140 : 175} cy="75" r="15" fill="rgba(34, 197, 94, 0.3)" filter="url(#nodeGlow2)" />
              <circle cx={isMobile ? 140 : 175} cy="75" r="10" fill="#22c55e" stroke="#4ade80" strokeWidth="2" />

              {/* Input wire 1 */}
              <line x1="30" y1="45" x2={isMobile ? 125 : 160} y2="70" stroke="#64748b" strokeWidth="4" />
              <polygon points={`${isMobile ? 128 : 163},68 ${isMobile ? 118 : 153},62 ${isMobile ? 122 : 157},72`} fill="#fbbf24" />
              <text x="50" y="35" fill="#fbbf24" fontSize="14" fontWeight="600">5A in</text>

              {/* Input wire 2 */}
              <line x1="30" y1="115" x2={isMobile ? 125 : 160} y2="82" stroke="#64748b" strokeWidth="4" />
              <polygon points={`${isMobile ? 128 : 163},84 ${isMobile ? 118 : 153},90 ${isMobile ? 122 : 157},80`} fill="#fbbf24" />
              <text x="50" y="130" fill="#fbbf24" fontSize="14" fontWeight="600">2A in</text>

              {/* Output wire */}
              <line x1={isMobile ? 155 : 190} y1="75" x2={isMobile ? 260 : 320} y2="75" stroke="#64748b" strokeWidth="4" />
              <polygon points={`${isMobile ? 263 : 323},75 ${isMobile ? 253 : 313},69 ${isMobile ? 253 : 313},81`} fill="#60a5fa" />
              <text x={isMobile ? 210 : 260} y="65" fill="#60a5fa" fontSize="14" fontWeight="600">? A out</text>
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

  // PLAY PHASE - Interactive Circuit Simulator
  if (phase === 'play') {
    const currents = calculateCurrents();

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Interactive Circuit Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust component values to see how KCL and KVL work in real circuits
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CircuitVisualization />
            </div>

            {/* Voltage slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Source Voltage</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{voltage}V</span>
              </div>
              <input
                type="range"
                min="5"
                max="24"
                value={voltage}
                onChange={(e) => setVoltage(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Resistance sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: '#60a5fa' }}>R1</span>
                  <span style={{ ...typo.small, color: '#60a5fa', fontWeight: 600 }}>{resistance1}ohm</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={resistance1}
                  onChange={(e) => setResistance1(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: '#fbbf24' }}>R2</span>
                  <span style={{ ...typo.small, color: '#fbbf24', fontWeight: 600 }}>{resistance2}ohm</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={resistance2}
                  onChange={(e) => setResistance2(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: '#c084fc' }}>R3</span>
                  <span style={{ ...typo.small, color: '#c084fc', fontWeight: 600 }}>{resistance3}ohm</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={resistance3}
                  onChange={(e) => setResistance3(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Show current flow button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setShowCurrentFlow(!showCurrentFlow);
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: showCurrentFlow ? colors.warning : colors.bgSecondary,
                  color: showCurrentFlow ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showCurrentFlow ? 'Hide Current Flow' : 'Show Current Flow'}
              </button>
            </div>

            {/* KCL/KVL verification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                border: `1px solid ${colors.accent}`,
              }}>
                <div style={{ ...typo.small, color: colors.accent, marginBottom: '4px' }}>KCL at Node A</div>
                <div style={{ ...typo.body, color: colors.textPrimary }}>
                  I_total = I1 + I23 = {currents.totalCurrent.toFixed(3)}A
                </div>
                <div style={{ ...typo.small, color: colors.success }}>Current conserved!</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                border: `1px solid ${colors.warning}`,
              }}>
                <div style={{ ...typo.small, color: colors.warning, marginBottom: '4px' }}>KVL around Loop</div>
                <div style={{ ...typo.body, color: colors.textPrimary }}>
                  V - V_R1 = {voltage}V - {voltage}V = 0
                </div>
                <div style={{ ...typo.small, color: colors.success }}>Voltage balanced!</div>
              </div>
            </div>
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
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Kirchhoff&apos;s Laws
          </h2>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
            {/* KCL */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.accent}22, ${colors.accent}11)`,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Kirchhoff&apos;s Current Law (KCL)
              </h3>
              <div style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', margin: '16px 0', fontFamily: 'monospace' }}>
                Sum I = 0
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                At any junction (node) in a circuit, the algebraic sum of all currents equals zero.
                <strong style={{ color: colors.textPrimary }}> Current in = Current out.</strong>
              </p>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Based on: Conservation of electric charge - charge cannot accumulate at a point.
                </p>
              </div>
            </div>

            {/* KVL */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.warning}22, ${colors.warning}11)`,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Kirchhoff&apos;s Voltage Law (KVL)
              </h3>
              <div style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', margin: '16px 0', fontFamily: 'monospace' }}>
                Sum V = 0
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                Around any closed loop in a circuit, the algebraic sum of all voltages equals zero.
                <strong style={{ color: colors.textPrimary }}> Voltage rises = Voltage drops.</strong>
              </p>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Based on: Conservation of energy - a charge returning to its starting point has no net energy change.
                </p>
              </div>
            </div>

            {/* Key insight */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}44`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Why These Laws Matter
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Every circuit analysis technique - from simple resistor networks to complex integrated circuits with billions of transistors - ultimately relies on applying these two fundamental conservation laws systematically.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Try a Multi-Loop Challenge
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Only the larger current flows through the shared resistor' },
      { id: 'b', text: 'The currents cancel each other out' },
      { id: 'c', text: 'Both currents combine and flow through the shared resistor', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Challenge: Multi-Loop Circuit
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A circuit has two voltage sources sharing a common resistor. What happens to the current through that shared resistor?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Consider two loops sharing resistor R2:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Loop 1: 12V source drives current through R1 and R2</li>
              <li style={{ marginBottom: '8px' }}>Loop 2: 9V source drives current through R3 and R2</li>
              <li>Both currents flow through the shared R2</li>
            </ul>
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
              Explore Multi-Loop Circuit
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Multi-Loop Circuit Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how currents from different loops combine at shared nodes
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <MultiLoopVisualization />
            </div>

            {/* Control sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>V1 (Loop 1)</span>
                  <span style={{ ...typo.small, color: '#60a5fa', fontWeight: 600 }}>{voltage}V</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={voltage}
                  onChange={(e) => setVoltage(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>V2 (Loop 2)</span>
                  <span style={{ ...typo.small, color: '#c084fc', fontWeight: 600 }}>{voltage2}V</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={voltage2}
                  onChange={(e) => setVoltage2(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: '#60a5fa' }}>R1</span>
                  <span style={{ ...typo.small, color: '#60a5fa' }}>{loopR1}ohm</span>
                </div>
                <input type="range" min="50" max="300" step="25" value={loopR1}
                  onChange={(e) => setLoopR1(parseInt(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: '#fbbf24' }}>R2 (shared)</span>
                  <span style={{ ...typo.small, color: '#fbbf24' }}>{loopR2}ohm</span>
                </div>
                <input type="range" min="50" max="300" step="25" value={loopR2}
                  onChange={(e) => setLoopR2(parseInt(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: '#c084fc' }}>R3</span>
                  <span style={{ ...typo.small, color: '#c084fc' }}>{loopR3}ohm</span>
                </div>
                <input type="range" min="50" max="300" step="25" value={loopR3}
                  onChange={(e) => setLoopR3(parseInt(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                onClick={() => { setShowMultiLoopFlow(!showMultiLoopFlow); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: showMultiLoopFlow ? colors.warning : colors.bgSecondary,
                  color: showMultiLoopFlow ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showMultiLoopFlow ? 'Hide Current Flow' : 'Show Current Flow'}
              </button>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Multi-Loop Analysis
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Systematic Circuit Analysis
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: colors.accent }}>1</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Identify Nodes</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Find all junction points where three or more wires meet. Apply KCL to each: sum of currents in = sum of currents out.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: colors.warning }}>2</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Identify Loops</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Find all independent closed loops. Apply KVL to each: sum of voltage rises = sum of voltage drops.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: colors.success }}>3</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Solve the System</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Write KCL equations for (N-1) nodes and KVL equations for each loop. Solve simultaneously to find all unknown currents and voltages.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Key Insight</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When multiple sources share components, currents combine at nodes per KCL. Each loop still independently satisfies KVL. This systematic approach can solve any circuit, no matter how complex!
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

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                    ok
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
                Kirchhoff&apos;s Laws Connection:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? "You understand Kirchhoff's Laws and circuit analysis!"
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Circuit Analysis Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand Kirchhoff&apos;s Laws - the foundation of all electrical circuit analysis.
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
              'KCL: Current is conserved at every node',
              'KVL: Voltage around any loop sums to zero',
              'How to analyze parallel-series circuits',
              'Multi-loop analysis with multiple sources',
              'Real-world applications in EVs, solar, and grids',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>ok</span>
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

export default KirchhoffsLawsRenderer;
