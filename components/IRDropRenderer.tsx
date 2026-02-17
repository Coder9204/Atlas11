'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// IR Drop (Voltage Drop) - Complete 10-Phase Game
// Why power distribution design matters for chip reliability
// ─────────────────────────────────────────────────────────────────────────────

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

interface IRDropRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A chip designer notices that logic gates far from the power bumps are failing during high-activity periods, while identical gates near the power bumps work perfectly.",
    question: "What is the most likely cause of this location-dependent failure?",
    options: [
      { id: 'a', label: "The distant gates are manufactured with defects" },
      { id: 'b', label: "IR drop reduces voltage below the minimum operating level for distant gates", correct: true },
      { id: 'c', label: "Heat from nearby gates causes thermal runaway" },
      { id: 'd', label: "Clock signals arrive late to distant gates" }
    ],
    explanation: "Current flowing through the power grid's resistance causes voltage drop (V = IR). Gates far from power sources see more cumulative resistance, resulting in lower supply voltage. When voltage drops below the minimum operating threshold, gates fail to switch correctly."
  },
  {
    scenario: "An engineer is designing a power grid for a high-performance processor. Doubling the metal width for power rails increases manufacturing cost but the design team insists it's necessary.",
    question: "Why does wider metal reduce IR drop problems?",
    options: [
      { id: 'a', label: "Wider metal carries more voltage" },
      { id: 'b', label: "Wider metal has lower resistance (R = rho * L / A), reducing V = IR drop", correct: true },
      { id: 'c', label: "Wider metal prevents electromigration only" },
      { id: 'd', label: "Wider metal improves clock distribution" }
    ],
    explanation: "Resistance is inversely proportional to cross-sectional area (R = rho * L / A). Doubling the width doubles the area, cutting resistance in half. With half the resistance, the voltage drop (V = IR) is also halved for the same current, ensuring more stable supply voltage."
  },
  {
    scenario: "A mobile processor shows 50mV average IR drop during normal operation but experiences 200mV peak drops during burst computations that last only a few nanoseconds.",
    question: "What type of IR drop is causing the 200mV peak?",
    options: [
      { id: 'a', label: "Static IR drop from steady-state current" },
      { id: 'b', label: "Dynamic IR drop from sudden current surges and inductance effects", correct: true },
      { id: 'c', label: "Manufacturing variation in the power grid" },
      { id: 'd', label: "Temperature-induced resistance changes" }
    ],
    explanation: "Dynamic IR drop occurs during rapid current changes. When many circuits switch simultaneously, the sudden current demand creates voltage droops due to both resistive drops and inductive effects (V = L * dI/dt). These transient peaks can be 3-5x worse than static IR drop."
  },
  {
    scenario: "Two identical chip designs use different power grid densities: Design A has power stripes every 10um, Design B has stripes every 20um. Design B shows twice the IR drop.",
    question: "Why does power grid density affect IR drop so dramatically?",
    options: [
      { id: 'a', label: "Denser grids use thicker metal" },
      { id: 'b', label: "Denser grids provide more parallel paths, reducing effective resistance", correct: true },
      { id: 'c', label: "Denser grids block signal routing" },
      { id: 'd', label: "Denser grids increase capacitance which filters noise" }
    ],
    explanation: "A denser power grid creates more parallel paths from power sources to each circuit. Parallel resistances combine to create lower total resistance (1/R_total = 1/R1 + 1/R2 + ...). Additionally, current distributes across more paths, reducing current per path and thus voltage drop."
  },
  {
    scenario: "A chip's power grid simulation shows acceptable IR drop at room temperature (25C), but the chip fails in production testing at 85C operating temperature.",
    question: "Why does higher temperature worsen IR drop?",
    options: [
      { id: 'a', label: "Higher temperature increases current consumption only" },
      { id: 'b', label: "Metal resistance increases with temperature, increasing V = IR drop", correct: true },
      { id: 'c', label: "Higher temperature causes power supply voltage to decrease" },
      { id: 'd', label: "Thermal expansion breaks power grid connections" }
    ],
    explanation: "Metal resistance increases with temperature (approximately 0.4%/C for copper). At 85C vs 25C, that's a 60C difference, meaning roughly 24% higher resistance. This directly increases IR drop by the same percentage, potentially pushing marginal designs over the edge."
  },
  {
    scenario: "A design team adds decoupling capacitors near high-activity circuit blocks. Dynamic IR drop improves significantly but static IR drop remains unchanged.",
    question: "Why do decoupling capacitors help only dynamic IR drop?",
    options: [
      { id: 'a', label: "Capacitors reduce resistance of the power grid" },
      { id: 'b', label: "Capacitors store charge and supply current during fast transients, reducing voltage droops", correct: true },
      { id: 'c', label: "Capacitors filter out high-frequency noise from power supplies" },
      { id: 'd', label: "Capacitors increase the power grid's thermal conductivity" }
    ],
    explanation: "Decoupling capacitors act as local charge reservoirs. During sudden current demands, they provide charge instantly (faster than current can flow from distant power sources), smoothing voltage dips. For steady-state (static) current, they don't help because they're not discharging - the current must still flow through resistive paths."
  },
  {
    scenario: "An ASIC designer places the highest-current-consuming blocks (like memory controllers) at the chip's periphery near power bumps. Critics say this wastes valuable center space.",
    question: "What is the power distribution advantage of this placement strategy?",
    options: [
      { id: 'a', label: "Peripheral placement makes the chip easier to test" },
      { id: 'b', label: "High-current blocks near power sources minimize IR drop for those blocks", correct: true },
      { id: 'c', label: "This placement improves signal integrity only" },
      { id: 'd', label: "Peripheral blocks run cooler due to edge heat dissipation" }
    ],
    explanation: "By placing high-current blocks near power bumps/rings, the current travels through minimal resistance before reaching those circuits. This reduces IR drop for the most power-hungry components. The remaining (lower-current) circuits in the center tolerate their higher resistance paths better."
  },
  {
    scenario: "A processor's voltage regulator supplies 1.0V, but IR drop analysis shows some regions receive only 0.85V. The minimum operating voltage for the logic is 0.9V.",
    question: "What solutions could address this 150mV IR drop problem?",
    options: [
      { id: 'a', label: "Reduce clock frequency only" },
      { id: 'b', label: "Add power bumps closer to affected areas, widen metal, or increase supply voltage", correct: true },
      { id: 'c', label: "Use smaller transistors that require less current" },
      { id: 'd', label: "Move all logic to a single location" }
    ],
    explanation: "Multiple strategies help: Adding power sources (bumps) closer to problem areas reduces path length and resistance. Widening metal reduces resistance directly. Increasing supply voltage (to 1.1V) means the 150mV drop still leaves 0.95V > 0.9V minimum. Often a combination is used."
  },
  {
    scenario: "A chip design uses a mesh power grid with power bumps on a 200um pitch. Simulation shows worst-case IR drop of 80mV. When bump pitch is reduced to 100um, IR drop improves to 35mV.",
    question: "Why doesn't halving the bump pitch simply halve the IR drop?",
    options: [
      { id: 'a', label: "Power bumps have their own internal resistance" },
      { id: 'b', label: "The relationship is roughly quadratic - halving pitch quarters the maximum distance to a bump", correct: true },
      { id: 'c', label: "Bump inductance limits improvement" },
      { id: 'd', label: "More bumps reduce total current capacity" }
    ],
    explanation: "With 100um pitch, the maximum distance from any point to a power bump is roughly 70um (diagonal to center of a grid square). With 200um pitch, that maximum distance is about 140um. IR drop scales with this distance, so denser bumps provide better-than-linear improvement."
  },
  {
    scenario: "A graphics processor with thousands of identical shader cores shows that cores in the chip center consistently run 5% slower than edge cores, even though they're the same design.",
    question: "What power distribution phenomenon explains this performance difference?",
    options: [
      { id: 'a', label: "Center cores are thermally throttled" },
      { id: 'b', label: "Higher IR drop in the center reduces voltage, slowing transistor switching", correct: true },
      { id: 'c', label: "Clock skew delays signals to center cores" },
      { id: 'd', label: "Manufacturing variations affect center cores more" }
    ],
    explanation: "Cores in the chip center are farthest from peripheral power sources, experiencing maximum IR drop. Lower voltage means slower transistor switching (delay scales with ~1/V). A 10% voltage reduction can cause 10-15% speed reduction. This creates performance asymmetry across identical cores."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💻',
    title: 'High-Performance Processors',
    short: 'CPU and GPU power delivery',
    tagline: 'Every millivolt matters at 5GHz',
    description: 'Modern processors consume 100-300W through billions of transistors switching billions of times per second. Power delivery networks must maintain stable voltage despite massive current fluctuations. IR drop directly limits maximum clock frequency and power density.',
    connection: 'At high frequencies, even 50mV of IR drop can cause setup time violations in critical paths. Processor designers spend significant effort on power grid design, using multiple metal layers, power bumps on fine pitch, and sophisticated simulation to ensure every transistor receives adequate voltage.',
    howItWorks: 'CPUs use hierarchical power distribution: motherboard VRMs provide bulk power, package-level power planes distribute it, and on-die mesh grids deliver it to transistors. Multiple voltage domains allow critical paths to receive higher voltage margins.',
    stats: [
      { value: '<50mV', label: 'Target IR drop', icon: '⚡' },
      { value: '1000+', label: 'Power bumps per chip', icon: '🔌' },
      { value: '10+ layers', label: 'Metal for power', icon: '📊' }
    ],
    examples: ['Intel Core Ultra processors', 'AMD Ryzen 9000 series', 'Apple M4 chips', 'NVIDIA Blackwell GPUs'],
    companies: ['Intel', 'AMD', 'Apple', 'NVIDIA'],
    futureImpact: 'Chiplet architectures will require innovative power delivery across package boundaries, with embedded voltage regulators and advanced package-level power distribution.',
    color: '#3B82F6'
  },
  {
    icon: '📱',
    title: 'Mobile SoC Design',
    short: 'Smartphone and tablet chips',
    tagline: 'Maximum performance per milliwatt',
    description: 'Mobile chips must deliver desktop-class performance while running on battery power. IR drop management is critical because lower supply voltages (0.5-0.9V) have tighter margins, and battery voltage drops during discharge add another variable.',
    connection: 'Mobile SoCs operate at lower voltages where the same absolute IR drop represents a larger percentage loss. A 50mV drop at 0.7V supply is 7% loss, versus only 5% at 1.0V. This makes power grid efficiency even more critical for battery life.',
    howItWorks: 'Mobile chips use dense power grids with fine-pitch bumps, aggressive voltage scaling, and multiple power domains. Dynamic voltage and frequency scaling (DVFS) adjusts supply voltage based on workload, but IR drop limits must be respected at each voltage level.',
    stats: [
      { value: '0.5-0.9V', label: 'Operating voltage', icon: '🔋' },
      { value: '<5%', label: 'Allowed IR drop', icon: '📉' },
      { value: '100um', label: 'Bump pitch', icon: '⚙️' }
    ],
    examples: ['Apple A18 Bionic', 'Qualcomm Snapdragon 8 Gen 4', 'Google Tensor G5', 'MediaTek Dimensity 9400'],
    companies: ['Apple', 'Qualcomm', 'Google', 'MediaTek'],
    futureImpact: 'On-chip voltage regulators and energy harvesting will work alongside traditional power grids to maximize battery life while maintaining performance.',
    color: '#10B981'
  },
  {
    icon: '🧠',
    title: 'AI Accelerators',
    short: 'Neural network hardware',
    tagline: 'Powering the intelligence revolution',
    description: 'AI chips like TPUs and neural processing units perform massive parallel computations with synchronized switching patterns. This creates severe dynamic IR drop challenges as thousands of multiply-accumulate units activate simultaneously.',
    connection: 'Neural network inference involves matrix operations where entire rows/columns of processing elements switch together. This correlated switching creates worst-case dynamic IR drop. Designers must add significant decoupling capacitance and stagger operations to manage voltage droops.',
    howItWorks: 'AI accelerators use thick power meshes, extensive on-chip decoupling, and sometimes deliberately desynchronize operations to spread current demand over time. Some use programmable power gating to limit simultaneous active regions.',
    stats: [
      { value: '500W+', label: 'Peak power draw', icon: '⚡' },
      { value: '95%', label: 'Power delivery efficiency', icon: '📊' },
      { value: '10000+', label: 'Processing elements', icon: '🧮' }
    ],
    examples: ['Google TPU v5', 'NVIDIA H200', 'AMD MI350', 'Intel Gaudi 3'],
    companies: ['Google', 'NVIDIA', 'AMD', 'Intel'],
    futureImpact: 'Near-memory computing and 3D-stacked architectures will bring power delivery directly to compute layers, dramatically reducing IR drop for AI workloads.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Vehicle computing platforms',
    tagline: 'Reliability at extreme temperatures',
    description: 'Automotive chips must operate reliably from -40C to 150C ambient temperature. This extreme range causes 80%+ variation in metal resistance, dramatically changing IR drop characteristics between cold morning starts and hot engine compartment operation.',
    connection: 'Automotive IR drop design must account for worst-case temperature resistance. A power grid that works perfectly at 25C may fail at 150C due to doubled metal resistance. Safety-critical systems like ADAS require guaranteed voltage margins across all conditions.',
    howItWorks: 'Automotive chips use conservative power grid design with extra margin, temperature-aware voltage scaling, and redundant power delivery paths. Some use on-chip temperature sensors to adjust operating voltage dynamically.',
    stats: [
      { value: '-40 to 150C', label: 'Operating range', icon: '🌡️' },
      { value: '15+ years', label: 'Reliability target', icon: '⏱️' },
      { value: '100mV+', label: 'Voltage margin', icon: '📐' }
    ],
    examples: ['Tesla FSD computer', 'Mobileye EyeQ6', 'Qualcomm Snapdragon Ride', 'NVIDIA DRIVE Thor'],
    companies: ['Tesla', 'Mobileye', 'Qualcomm', 'NVIDIA'],
    futureImpact: 'Fully autonomous vehicles will require even more reliable power delivery as computing demands increase while safety requirements become more stringent.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// SLIDER STYLE - meets all requirements
// ─────────────────────────────────────────────────────────────────────────────
const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  borderRadius: '4px',
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
  touchAction: 'pan-y',
  accentColor: '#3b82f6',
  background: 'transparent',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const IRDropRenderer: React.FC<IRDropRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [currentDraw, setCurrentDraw] = useState(50); // mA per cell
  const [metalThickness, setMetalThickness] = useState(2); // um
  const [gridDensity, setGridDensity] = useState(5); // stripes per 100um
  const [distanceFromBump, setDistanceFromBump] = useState(50); // um
  const [temperature, setTemperature] = useState(25); // Celsius
  const [animationFrame, setAnimationFrame] = useState(0);

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
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444',
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
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
    twist_predict: 'Explore',
    twist_play: 'Temperature Lab',
    twist_review: 'Apply',
    transfer: 'Transfer',
    test: 'Quiz',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate IR drop based on parameters
  const calculateIRDrop = useCallback((x: number, y: number) => {
    const gridSize = 100;
    const bumpPositions = [
      { x: 0, y: 0 },
      { x: gridSize, y: 0 },
      { x: 0, y: gridSize },
      { x: gridSize, y: gridSize },
      { x: gridSize / 2, y: gridSize / 2 },
    ];

    const minDistance = Math.min(...bumpPositions.map(b =>
      Math.sqrt(Math.pow(x - b.x, 2) + Math.pow(y - b.y, 2))
    ));

    const resistivity = 1.7e-8 * (1 + 0.004 * (temperature - 25));
    const effectiveResistance = (resistivity * minDistance * 1e-6) / (metalThickness * 1e-6 * gridDensity * 10 * 1e-6);
    const drop = currentDraw * 1e-3 * effectiveResistance * 1000;
    return Math.min(drop, 200);
  }, [currentDraw, metalThickness, gridDensity, temperature]);

  // Calculate average and max IR drop
  const calculateStats = useCallback(() => {
    let maxDrop = 0;
    let totalDrop = 0;
    let count = 0;

    for (let x = 10; x <= 90; x += 10) {
      for (let y = 10; y <= 90; y += 10) {
        const drop = calculateIRDrop(x, y);
        maxDrop = Math.max(maxDrop, drop);
        totalDrop += drop;
        count++;
      }
    }

    return {
      maxDrop,
      avgDrop: totalDrop / count,
      efficiency: Math.max(0, 100 - (maxDrop / 10))
    };
  }, [calculateIRDrop]);

  const stats = calculateStats();

  // Power Grid Visualization Component
  const PowerGridVisualization = ({ showHeatmap = true, showSliders = false }: { showHeatmap?: boolean; showSliders?: boolean }) => {
    const width = isMobile ? 320 : 420;
    const height = isMobile ? 280 : 340;
    const padding = 40;
    const gridSize = width - 2 * padding;
    const gridH = height - 2 * padding;

    // Generate heatmap data
    const heatmapCells: { x: number; y: number; drop: number }[] = [];
    const cellSizeX = gridSize / 10;
    const cellSizeY = gridH / 10;

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const x = (i + 0.5) * 10;
        const y = (j + 0.5) * 10;
        heatmapCells.push({
          x: padding + i * cellSizeX,
          y: padding + j * cellSizeY,
          drop: calculateIRDrop(x * 10, y * 10)
        });
      }
    }

    const getColor = (drop: number) => {
      const normalized = Math.min(drop / 100, 1);
      if (normalized < 0.3) {
        const t = normalized / 0.3;
        return `rgb(${Math.round(34 + t * 211)}, ${Math.round(197 - t * 38)}, ${Math.round(94 - t * 94)})`;
      } else {
        const t = (normalized - 0.3) / 0.7;
        return `rgb(${Math.round(245 - t * 6)}, ${Math.round(159 - t * 91)}, ${Math.round(t * 68)})`;
      }
    };

    // Interactive marker circle position based on currentDraw
    const markerNorm = (currentDraw - 10) / 90;
    const markerX = padding + markerNorm * gridSize;
    const markerY = padding + gridH / 2;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }}>
        <defs>
          <filter id="irdrop-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="irdrop-shadow">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.4" />
          </filter>
          <linearGradient id="irdrop-legendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getColor(0)} />
            <stop offset="30%" stopColor={getColor(30)} />
            <stop offset="100%" stopColor={getColor(100)} />
          </linearGradient>
          <linearGradient id="irdrop-bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.bgSecondary} />
            <stop offset="100%" stopColor={colors.bgCard} />
          </linearGradient>
        </defs>

        {/* Grid background */}
        <rect x={padding} y={padding} width={gridSize} height={gridH} fill="url(#irdrop-bgGrad)" stroke={colors.border} strokeWidth="2" rx="4" />

        {/* Grid lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`gv-${i}`} x1={padding + (i + 1) * gridSize / 6} y1={padding} x2={padding + (i + 1) * gridSize / 6} y2={padding + gridH}
            stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <line key={`gh-${i}`} x1={padding} y1={padding + (i + 1) * gridH / 4} x2={padding + gridSize} y2={padding + (i + 1) * gridH / 4}
            stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Heatmap cells */}
        {showHeatmap && heatmapCells.map((cell, i) => (
          <rect
            key={i}
            x={cell.x}
            y={cell.y}
            width={cellSizeX - 1}
            height={cellSizeY - 1}
            fill={getColor(cell.drop)}
            opacity="0.75"
            rx="1"
          />
        ))}

        {/* Power grid lines (vertical) */}
        {Array.from({ length: gridDensity + 1 }).map((_, i) => {
          const x = padding + (i * gridSize) / gridDensity;
          return (
            <line
              key={`v-${i}`}
              x1={x}
              y1={padding}
              x2={x}
              y2={padding + gridH}
              stroke={colors.accent}
              strokeWidth={Math.max(1, metalThickness / 2)}
              opacity="0.7"
            />
          );
        })}

        {/* Power grid lines (horizontal) */}
        {Array.from({ length: Math.ceil(gridDensity * gridH / gridSize) + 1 }).map((_, i) => {
          const y = padding + (i * gridH) / (gridDensity - 1 || 1);
          if (y > padding + gridH) return null;
          return (
            <line
              key={`h-${i}`}
              x1={padding}
              y1={y}
              x2={padding + gridSize}
              y2={y}
              stroke={colors.accent}
              strokeWidth={Math.max(1, metalThickness / 2)}
              opacity="0.7"
            />
          );
        })}

        {/* Power bumps */}
        {[
          { x: padding, y: padding },
          { x: padding + gridSize, y: padding },
          { x: padding, y: padding + gridH },
          { x: padding + gridSize, y: padding + gridH },
          { x: padding + gridSize / 2, y: padding + gridH / 2 },
        ].map((pos, i) => (
          <g key={`bump-${i}`} filter="url(#irdrop-shadow)">
            <circle cx={pos.x} cy={pos.y} r="10" fill={colors.success} stroke="white" strokeWidth="2" />
            <text x={pos.x} y={pos.y + 4} fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">V+</text>
          </g>
        ))}

        {/* Animated current flow */}
        {showHeatmap && (
          <g opacity="0.6">
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i * Math.PI / 3) + (animationFrame * 0.05);
              const centerX = padding + gridSize / 2;
              const centerY = padding + gridH / 2;
              const r = 20 + (animationFrame % 40);
              return (
                <circle
                  key={`flow-${i}`}
                  cx={centerX + Math.cos(angle) * r}
                  cy={centerY + Math.sin(angle) * r}
                  r="3"
                  fill={colors.warning}
                  opacity={1 - r / 60}
                />
              );
            })}
          </g>
        )}

        {/* Interactive marker circle - moves with currentDraw */}
        <circle
          cx={markerX}
          cy={markerY}
          r="9"
          fill={colors.accent}
          stroke="white"
          strokeWidth="2"
          filter="url(#irdrop-glow)"
        />
        {/* Axis labels with physics terms */}
        <text x={padding + gridSize / 2} y={padding + gridH + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Current (mA) →</text>
        <text x={padding - 5} y={padding + gridH / 2} fill={colors.textSecondary} fontSize="11" textAnchor="end"
          transform={`rotate(-90, ${padding - 18}, ${padding + gridH / 2})`}>Voltage Drop (mV)</text>

        {/* Legend */}
        <rect x={padding} y={height - 14} width="100" height="10" fill="url(#irdrop-legendGrad)" rx="2" />
        <text x={padding} y={height - 16} fill={colors.textSecondary} fontSize="11">0mV</text>
        <text x={padding + 100} y={height - 16} fill={colors.textSecondary} fontSize="11" textAnchor="end">100mV+</text>

        {/* Title */}
        <text x={width / 2} y={14} fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="600">
          IR Drop Heatmap (V = I × R)
        </text>

        {/* IR drop curve overlaid on heatmap - spans full vertical range */}
        {(() => {
          const pts = Array.from({ length: 11 }, (_, i) => {
            const frac = i / 10;
            // Curve shows IR drop vs distance for current settings (normalized to span full visual range)
            // Higher current or lower metal thickness → steeper curve
            const irFactor = (currentDraw / 100) / (metalThickness / 5); // 0.1 to 10
            const normalizedDrop = Math.min(frac * Math.min(irFactor, 1), 1);
            const cx = padding + frac * gridSize;
            const cy = padding + gridH * 0.05 + gridH * 0.88 * (1 - normalizedDrop);
            return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
          }).join(' ');
          return <path d={pts} stroke={colors.accent} strokeWidth="2" fill="none" strokeDasharray="5,3" opacity="0.7" />;
        })()}

        {/* Marker showing current position */}
        <circle cx={markerX} cy={markerY} r="9" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#irdrop-glow)" />
        <text x={markerX} y={markerY - 13} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">
          {currentDraw}mA
        </text>
      </svg>
    );
  };

  // Temperature Visualization for twist_play
  const TempVisualization = () => {
    const width = isMobile ? 320 : 420;
    const height = isMobile ? 260 : 300;
    const padding = 40;
    const graphW = width - 2 * padding;
    const graphH = height - 2 * padding - 20;

    // Resistance factor based on temperature
    const resistFactor = 1 + 0.004 * (temperature - 25);
    // IR drop at given distance using current temp
    const baseIR = (distanceFromBump / 100) * 50 * resistFactor;
    const irDrop = Math.min(baseIR, 150);

    // Normalized positions
    const tempNorm = (temperature - (-40)) / (125 - (-40));
    const distNorm = (distanceFromBump - 10) / (100 - 10);

    // IR drop indicator x position - moves with temperature slider
    const indicatorX = padding + tempNorm * graphW;
    // IR drop level y position - changes with distance from bump
    const indicatorY = padding + graphH - (irDrop / 150) * graphH;

    // Draw curve: IR drop vs temperature (normalized to full range for visual clarity)
    // Shows how IR drop scales from near-zero at cold to max at hot
    const curvePoints = Array.from({ length: 20 }, (_, i) => {
      const t = -40 + (i / 19) * 165;
      // Normalized IR drop: 0 at coldest, 1 at hottest - shows full range clearly
      const normalizedIR = (t - (-40)) / 165; // linearly 0→1 across temp range
      const rf = 1 + 0.004 * (t - 25);
      // Combined curve shows both linear temp trend and resistance effect
      const displayIR = Math.min(normalizedIR * 100 * rf, 150);
      const cx = padding + ((t - (-40)) / 165) * graphW;
      const cy = padding + graphH - (displayIR / 150) * graphH;
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`;
    }).join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }}>
        <defs>
          <filter id="temp-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="temp-shadow">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.4" />
          </filter>
          <linearGradient id="temp-curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor={colors.accent} />
          </linearGradient>
          <linearGradient id="temp-areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Axes */}
        <rect x={padding} y={padding} width={graphW} height={graphH} fill={colors.bgSecondary} rx="4" stroke={colors.border} />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={`tg-${i}`} x1={padding + t * graphW} y1={padding} x2={padding + t * graphW} y2={padding + graphH}
            stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={`hg-${i}`} x1={padding} y1={padding + t * graphH} x2={padding + graphW} y2={padding + t * graphH}
            stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Curve */}
        <path d={curvePoints} stroke="url(#temp-curveGrad)" strokeWidth="3" fill="none" />

        {/* Interactive marker - moves with temperature AND distance sliders */}
        <circle
          cx={indicatorX}
          cy={indicatorY}
          r="9"
          fill={temperature > 50 ? colors.error : colors.success}
          stroke="white"
          strokeWidth="2"
          filter="url(#temp-glow)"
        />
        <text x={indicatorX} y={indicatorY - 13} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">
          {irDrop.toFixed(0)}mV
        </text>

        {/* Axis labels */}
        <text x={padding + graphW / 2} y={height - 4} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Temperature (°C)
        </text>
        <text x={padding - 5} y={padding + graphH / 2} fill={colors.textSecondary} fontSize="11" textAnchor="end"
          transform={`rotate(-90, ${padding - 12}, ${padding + graphH / 2})`}>
          IR Drop (mV)
        </text>

        {/* Tick labels */}
        <text x={padding} y={padding + graphH + 14} fill={colors.textSecondary} fontSize="11" textAnchor="middle">-40</text>
        <text x={padding + graphW / 2} y={padding + graphH + 14} fill={colors.textSecondary} fontSize="11" textAnchor="middle">25</text>
        <text x={padding + graphW} y={padding + graphH + 14} fill={colors.textSecondary} fontSize="11" textAnchor="middle">125</text>

        <text x={padding - 5} y={padding + graphH} fill={colors.textSecondary} fontSize="11" textAnchor="end">0</text>
        <text x={padding - 5} y={padding} fill={colors.textSecondary} fontSize="11" textAnchor="end">150</text>

        {/* Formula */}
        <text x={padding + graphW / 2} y={padding - 8} fill={colors.warning} fontSize="13" textAnchor="middle" fontWeight="bold">
          R(T) = R₀(1 + 0.004×ΔT)
        </text>

        {/* Title */}
        <text x={width / 2} y={15} fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="600">
          IR Drop vs Temperature
        </text>
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
          aria-label={phaseLabels[p]}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            display: 'block',
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
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

  // Navigation bar with Back and Next buttons
  const renderNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIndex === 0}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: currentIndex === 0 ? colors.textMuted : colors.textSecondary,
            padding: '6px 14px',
            borderRadius: '8px',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            minHeight: '44px',
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
          <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>IR Drop</span>
          <span style={{ ...typo.small, color: colors.textSecondary }}>
            {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
          </span>
        </div>
        <button
          onClick={nextPhase}
          disabled={currentIndex === phaseOrder.length - 1}
          style={{
            background: currentIndex === phaseOrder.length - 1 ? 'transparent' : colors.accent,
            border: `1px solid ${currentIndex === phaseOrder.length - 1 ? colors.border : colors.accent}`,
            color: 'white',
            padding: '6px 14px',
            borderRadius: '8px',
            cursor: currentIndex === phaseOrder.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚡🔌</div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            IR Drop: The Hidden Voltage Thief
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
            "Why do chips fail when they're physically perfect? Because{' '}
            <span style={{ color: colors.accent }}>voltage never reaches them intact</span>.
            Every millimeter of wire steals power."
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
              "V = IR isn't just a formula—it's the reason your processor throttles, your phone heats up, and billion-dollar chips sometimes fail."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Power Integrity Engineering
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore the Voltage Drop →
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Voltage is the same everywhere—wires just carry it without loss' },
      { id: 'b', text: 'Voltage drops proportionally to distance and current (V = IR)', correct: true as const },
      { id: 'c', text: 'Only the power supply voltage matters, not the wiring' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A chip receives 1.0V from its power supply. What voltage do circuits at the center of the chip actually see?
            </h2>

            {/* SVG diagram */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
              <svg width="100%" height="180" viewBox="0 0 400 180" style={{ maxWidth: '400px' }}>
                <defs>
                  <filter id="pred-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <marker id="pred-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
                  </marker>
                </defs>
                {/* Power supply */}
                <rect x="20" y="60" width="60" height="60" fill={colors.success} rx="8" filter="url(#pred-glow)" />
                <text x="50" y="95" fill="white" fontSize="14" textAnchor="middle" fontWeight="bold">1.0V</text>
                <text x="50" y="140" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Supply</text>

                {/* Wire with resistance */}
                <line x1="80" y1="90" x2="160" y2="90" stroke={colors.accent} strokeWidth="3" strokeDasharray="8,4" />
                <path d="M160,90 L170,80 L180,100 L190,80 L200,100 L210,80 L220,100 L230,90 L240,90" stroke={colors.accent} strokeWidth="3" fill="none" />
                <text x="200" y="130" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Wire Resistance (R)</text>

                {/* Circuit load */}
                <rect x="260" y="60" width="60" height="60" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="2" rx="8" />
                <text x="290" y="95" fill={colors.warning} fontSize="14" textAnchor="middle" fontWeight="bold">???V</text>
                <text x="290" y="140" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Circuit</text>

                {/* Current flow label */}
                <text x="200" y="30" fill={colors.accent} fontSize="12" textAnchor="middle">Current Flow (I)</text>
                <line x1="100" y1="40" x2="300" y2="40" stroke={colors.accent} strokeWidth="1" markerEnd="url(#pred-arrow)" />
              </svg>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                V = I × R: Current flowing through wire resistance causes voltage drop
              </p>
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
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
                Test My Prediction →
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Power Grid
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '48px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Experiment with IR Drop
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              This visualization shows the IR drop heatmap across your chip&apos;s power grid. When current increases, voltage drop increases proportionally because V = I × R — this is critical for chip engineers designing reliable power delivery networks.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              When you increase current draw, the heatmap becomes more red (higher voltage drop). When metal thickness increases, resistance decreases so drop is reduced. Higher grid density means more parallel paths, reducing effective resistance. This matters because chips fail to operate correctly if supply voltage drops too far.
            </p>

            {/* Key physics terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Key Physics Terms:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><span style={{ color: colors.accent, fontWeight: 600 }}>IR Drop:</span> <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Voltage lost due to resistance in power grid wires</span></div>
                <div><span style={{ color: colors.accent, fontWeight: 600 }}>Resistance (R):</span> <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Opposition to current flow in conductor material</span></div>
                <div><span style={{ color: colors.accent, fontWeight: 600 }}>Current (I):</span> <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Flow of electric charge through the power grid</span></div>
                <div><span style={{ color: colors.accent, fontWeight: 600 }}>Power Bump:</span> <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Physical connection point between chip and package</span></div>
              </div>
            </div>

            {/* Main visualization */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <PowerGridVisualization showHeatmap={true} />
              </div>

              {/* Current draw slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Current Draw</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{currentDraw}mA per cell</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={currentDraw}
                  onChange={(e) => setCurrentDraw(parseInt(e.target.value))}
                  onInput={(e) => setCurrentDraw(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
              </div>

              {/* Metal thickness slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Metal Thickness</span>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{metalThickness}um</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={metalThickness}
                  onChange={(e) => setMetalThickness(parseFloat(e.target.value))}
                  onInput={(e) => setMetalThickness(parseFloat((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
              </div>

              {/* Grid density slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Grid Density</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{gridDensity} stripes</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={gridDensity}
                  onChange={(e) => setGridDensity(parseInt(e.target.value))}
                  onInput={(e) => setGridDensity(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
              </div>

              {/* Stats display */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: stats.maxDrop > 50 ? colors.error : stats.maxDrop > 30 ? colors.warning : colors.success }}>
                    {stats.maxDrop.toFixed(1)}mV
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Max IR Drop</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{stats.avgDrop.toFixed(1)}mV</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Average Drop</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: stats.efficiency > 95 ? colors.success : stats.efficiency > 90 ? colors.warning : colors.error }}>
                    {stats.efficiency.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Grid Efficiency</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionCorrect = prediction === 'b';
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of IR Drop
            </h2>

            <div style={{
              background: predictionCorrect ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${predictionCorrect ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: predictionCorrect ? colors.success : colors.warning, margin: 0 }}>
                {predictionCorrect
                  ? 'Your prediction was correct! Voltage drops proportionally to distance and current (V = IR).'
                  : `You predicted option ${prediction?.toUpperCase()}. Let's see why voltage actually drops along the power grid.`}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                <p style={{ ...typo.h2, color: colors.accent, margin: 0 }}>V = I × R</p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>Ohm's Law — The foundation of IR drop</p>
              </div>

              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Every wire has resistance (R)</strong> — even the best copper conductors. When current (I) flows through this resistance, voltage drops proportionally.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.accent }}>More current</span> = More voltage drop (V = IR scales with I)
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <span style={{ color: colors.accent }}>Longer distance</span> = Higher resistance R = More drop
                </p>
                <p>
                  <span style={{ color: colors.success }}>Thicker/wider metal</span> = Lower R = Less drop (R = ρL/A)
                </p>
              </div>
            </div>

            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Insight</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In a chip, circuits far from power sources see less voltage. If the drop is too large, transistors switch slowly or fail entirely. That's why power grid design is critical for chip performance.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Temperature Effects →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'IR drop stays the same—temperature only affects transistors, not wires' },
      { id: 'b', text: 'IR drop decreases because hot metal conducts better' },
      { id: 'c', text: 'IR drop increases because metal resistance rises with temperature', correct: true as const },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>Explore: New Variable — Temperature</p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A chip heats up from 25°C to 85°C during heavy computation. What happens to IR drop?
            </h2>

            {/* Static preview graphic */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
              <svg width="320" height="160" viewBox="0 0 320 160">
                <defs>
                  <filter id="tp-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <linearGradient id="tp-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor={colors.accent} />
                  </linearGradient>
                </defs>
                <rect x="40" y="20" width="240" height="100" fill={colors.bgSecondary} rx="4" stroke={colors.border} />
                {/* Grid lines */}
                {[0.33, 0.66].map((t, i) => (
                  <line key={i} x1={40 + t * 240} y1="20" x2={40 + t * 240} y2="120"
                    stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                ))}
                {[0.5].map((t, i) => (
                  <line key={i} x1="40" y1={20 + t * 100} x2="280" y2={20 + t * 100}
                    stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                ))}
                {/* Curve: rising IR drop with temperature */}
                <path d="M40,110 L80,100 L120,85 L160,68 L200,50 L240,33 L280,18"
                  stroke="url(#tp-grad)" strokeWidth="3" fill="none" />
                {/* Marker at 25C */}
                <circle cx={120} cy={85} r="8" fill={colors.success} stroke="white" strokeWidth="2" filter="url(#tp-glow)" />
                {/* Marker at 85C */}
                <circle cx={220} cy={42} r="8" fill={colors.error} stroke="white" strokeWidth="2" filter="url(#tp-glow)" />
                <text x="100" y="145" fill={colors.textSecondary} fontSize="11" textAnchor="middle">25°C</text>
                <text x="220" y="145" fill={colors.textSecondary} fontSize="11" textAnchor="middle">85°C</text>
                <text x="160" y="15" fill={colors.textMuted} fontSize="11" textAnchor="middle">Temperature →</text>
                <text x="35" y="75" fill={colors.textMuted} fontSize="11" textAnchor="end"
                  transform="rotate(-90, 22, 75)">IR Drop</text>
                {/* Formula */}
                <text x="160" y="155" fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="bold">R(T) = R₀(1 + αΔT)</text>
              </svg>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                Preview: How does IR drop change with temperature?
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
                    minHeight: '44px',
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
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
                See the Temperature Effect →
              </button>
            )}
          </div>
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
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Temperature Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              See how temperature and distance from power bump affect IR drop
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <TempVisualization />
              </div>

              {/* Temperature slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Chip Temperature</span>
                  <span style={{
                    ...typo.small,
                    color: temperature > 70 ? colors.error : temperature > 50 ? colors.warning : colors.success,
                    fontWeight: 600
                  }}>
                    {temperature}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="125"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  onInput={(e) => setTemperature(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Cold (-40°C)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Hot (125°C)</span>
                </div>
              </div>

              {/* Distance from bump slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Distance from Power Bump</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{distanceFromBump}um</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={distanceFromBump}
                  onChange={(e) => setDistanceFromBump(parseInt(e.target.value))}
                  onInput={(e) => setDistanceFromBump(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
              </div>

              {/* Resistance change indicator */}
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  Resistance change from 25°C:{' '}
                  <span style={{ color: temperature > 25 ? colors.error : colors.success, fontWeight: 600 }}>
                    {temperature > 25 ? '+' : ''}{((temperature - 25) * 0.4).toFixed(0)}%
                  </span>
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                  Copper: ~0.4%/°C temperature coefficient
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Static vs Dynamic IR Drop →
            </button>
          </div>
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
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Apply: Static vs Dynamic IR Drop
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Static IR Drop</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Steady-state voltage drop from average current draw. Predictable and easier to model. Depends on{' '}
                  <span style={{ color: colors.accent }}>grid resistance</span> and{' '}
                  <span style={{ color: colors.accent }}>average current</span>.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚡</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Dynamic IR Drop</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Transient voltage droops from{' '}
                  <span style={{ color: colors.warning }}>sudden current surges</span>. Can be 3-5x worse than static drop. Includes{' '}
                  <span style={{ color: colors.warning }}>inductive effects (V = L × dI/dt)</span>. Hardest to design for.
                </p>
              </div>

              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💡</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Design Solutions</h3>
                </div>
                <div style={{ ...typo.body, color: colors.textSecondary }}>
                  <p style={{ marginBottom: '8px' }}><strong>For Static Drop:</strong> More power bumps, wider metal, denser grids</p>
                  <p style={{ margin: 0 }}><strong>For Dynamic Drop:</strong> Decoupling capacitors, staggered switching, power gating</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications →
            </button>
          </div>
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
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Real-World Applications of IR Drop
            </h2>

            <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', textAlign: 'center' }}>
              <span style={{ ...typo.body, color: colors.textSecondary }}>
                Application {selectedApp + 1} of {realWorldApps.length}
              </span>
              <span style={{ ...typo.small, color: colors.textMuted, marginLeft: '12px' }}>
                ({completedCount} explored)
              </span>
            </div>

            {/* App selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
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
                    minHeight: '44px',
                  }}
                >
                  {completedApps[i] && (
                    <div style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: colors.success, color: 'white', fontSize: '10px', lineHeight: '18px', textAlign: 'center',
                    }}>✓</div>
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

              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How IR Drop Matters:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>{app.howItWorks}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginBottom: '16px',
                background: completedApps[selectedApp] ? colors.success : `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
              }}
            >
              {completedApps[selectedApp] ? 'Got It! Next Application' : 'Got It!'}
            </button>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Quiz →
              </button>
            )}
          </div>
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
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          {renderNavigationBar()}
          {renderProgressBar()}

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
                {passed ? "You've mastered IR Drop concepts!" : 'Review the concepts and try again.'}
              </p>

              {/* Answer review */}
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Review:</h3>
                {testQuestions.map((q, i) => {
                  const correct = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correct;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', marginBottom: '6px',
                      background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                      borderRadius: '8px',
                      border: `1px solid ${isCorrect ? colors.success : colors.error}33`,
                    }}>
                      <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : `Incorrect (answer: ${correct?.toUpperCase()})`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Play Again
                </button>
                {passed && (
                  <button
                    onClick={() => { playSound('complete'); nextPhase(); }}
                    style={primaryButtonStyle}
                  >
                    Complete Lesson →
                  </button>
                )}
              </div>
            </div>
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
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            <div style={{
              background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

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
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px',
                    border: `1px solid ${colors.border}`, background: 'transparent',
                    color: colors.textSecondary, cursor: 'pointer', minHeight: '44px',
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
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600, minHeight: '44px',
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
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600, minHeight: '44px',
                  }}
                >
                  Submit Quiz
                </button>
              )}
            </div>
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
        paddingTop: '48px',
        paddingBottom: '100px',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          IR Drop Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how voltage drops in power distribution networks and why it matters for chip design.
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '400px' }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>You Learned:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              "V = IR and Ohm's Law in chip design",
              'How distance affects voltage drop',
              'Temperature effects on metal resistance',
              'Static vs dynamic IR drop',
              'Power grid design strategies',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: 'transparent',
              color: colors.textSecondary, cursor: 'pointer', minHeight: '44px',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}
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

export default IRDropRenderer;
