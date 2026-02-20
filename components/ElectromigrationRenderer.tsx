'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Electromigration in Chips - Complete 10-Phase Game
// Why metal atoms migrate under current flow and how chips fail over time
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

interface ElectromigrationRendererProps {
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
    scenario: "A chip designer is analyzing why a new 5nm processor fails after only 2 years of operation, well short of its 10-year target lifetime. Post-mortem analysis reveals gaps in the copper interconnects near high-current regions.",
    question: "What physical phenomenon caused these gaps to form in the copper wires?",
    options: [
      { id: 'a', label: "Thermal expansion cracked the copper during temperature cycling" },
      { id: 'b', label: "Electron momentum transfer pushed copper atoms along the wire, creating voids", correct: true },
      { id: 'c', label: "Chemical corrosion from moisture penetrating the chip package" },
      { id: 'd', label: "Manufacturing defects left during the copper deposition process" }
    ],
    explanation: "Electromigration occurs when high-density electron flow transfers momentum to metal atoms, physically pushing them in the direction of current. Over time, atoms accumulate at one end (forming hillocks) while voids form at the other, eventually causing open circuits."
  },
  {
    scenario: "Engineers are comparing two processor designs: Design A runs at 2 MA/cm^2 current density, while Design B runs at 4 MA/cm^2. Both operate at the same temperature and use identical copper metallization.",
    question: "According to Black's equation (MTTF ~ J^-2), how does Design B's lifetime compare to Design A?",
    options: [
      { id: 'a', label: "Design B lasts 1/2 as long (2x shorter lifetime)" },
      { id: 'b', label: "Design B lasts 1/4 as long (4x shorter lifetime)", correct: true },
      { id: 'c', label: "Design B lasts 1/8 as long (8x shorter lifetime)" },
      { id: 'd', label: "Both designs have similar lifetimes since they use the same materials" }
    ],
    explanation: "Black's equation shows MTTF is proportional to J^-2, meaning lifetime scales with the inverse square of current density. Doubling current density from 2 to 4 MA/cm^2 reduces lifetime by a factor of 4 (2^2 = 4). This is why current density limits are strictly enforced in chip design."
  },
  {
    scenario: "A server CPU runs at 85C junction temperature during normal operation. During a heat wave, the data center cooling fails and the CPU reaches 105C for several hours before cooling is restored.",
    question: "How does the temperature spike affect electromigration damage during those hours?",
    options: [
      { id: 'a', label: "Linear increase - 24% more damage since temperature rose 24%" },
      { id: 'b', label: "No significant increase - modern CPUs are designed for temperature variations" },
      { id: 'c', label: "Exponential acceleration - significantly more damage due to Arrhenius behavior", correct: true },
      { id: 'd', label: "Decreased damage - higher temperatures improve atomic mobility" }
    ],
    explanation: "The Arrhenius term e^(Ea/kT) in Black's equation means electromigration rate increases exponentially with temperature. A 20C increase from 85C to 105C can roughly double or triple the migration rate. Those few hours at elevated temperature may have caused more cumulative damage than weeks of normal operation."
  },
  {
    scenario: "A reliability engineer notices that electromigration failures in a new chip always occur at the same location: where the copper trace meets the tungsten via connecting to another metal layer.",
    question: "Why are via interfaces particularly susceptible to electromigration failure?",
    options: [
      { id: 'a', label: "Tungsten is more conductive, causing local current crowding" },
      { id: 'b', label: "The material interface creates a diffusion barrier that traps migrating atoms", correct: true },
      { id: 'c', label: "Via holes are drilled too deep during manufacturing" },
      { id: 'd', label: "Tungsten contains impurities that contaminate the copper" }
    ],
    explanation: "At via interfaces, copper atoms migrating along grain boundaries encounter a diffusion barrier at the tungsten interface. Atoms pile up on one side (causing stress) or leave voids on the other. These interfaces often determine the electromigration-limited current carrying capacity of the entire interconnect stack."
  },
  {
    scenario: "An automotive chip designer is qualifying a new motor controller IC for under-hood operation at temperatures up to 150C. The current design passes reliability testing at 105C ambient but fails the high-temperature qualification.",
    question: "What design change would most effectively improve electromigration resistance at 150C?",
    options: [
      { id: 'a', label: "Switch from copper to aluminum interconnects for better thermal conductivity" },
      { id: 'b', label: "Widen traces and reduce current density while adding redundant vias", correct: true },
      { id: 'c', label: "Increase clock frequency to reduce the time current flows through each wire" },
      { id: 'd', label: "Use thinner traces to reduce total metal mass subject to migration" }
    ],
    explanation: "At elevated temperatures, the exponential Arrhenius term dominates. The most effective mitigation is reducing current density (J) since MTTF ~ J^-2. Wider traces carry the same current at lower density. Redundant vias provide backup paths if one fails. Together, these changes can achieve the required lifetime even at extreme temperatures."
  },
  {
    scenario: "A memory manufacturer is transitioning from 10nm to 7nm process technology. Despite using identical copper materials and barrier layers, the new 7nm chips show significantly higher electromigration failure rates in testing.",
    question: "Why does shrinking to smaller geometries worsen electromigration reliability?",
    options: [
      { id: 'a', label: "Smaller wires have higher resistance, generating more heat" },
      { id: 'b', label: "The same current in a smaller wire means higher current density", correct: true },
      { id: 'c', label: "Smaller features are harder to manufacture without defects" },
      { id: 'd', label: "Quantum effects become significant at 7nm scales" }
    ],
    explanation: "When wire dimensions shrink but current requirements remain similar, current density (current/area) increases dramatically. A 7nm wire with half the cross-section of a 10nm wire has roughly 4x higher current density for the same current. Since MTTF ~ J^-2, lifetime drops by a factor of 16. This is why advanced nodes require aggressive design rules."
  },
  {
    scenario: "A chip architect is reviewing a power delivery network design. Some traces carry DC current continuously, while others carry high-frequency switching currents that average to zero over each clock cycle.",
    question: "Which traces are more susceptible to electromigration failure?",
    options: [
      { id: 'a', label: "High-frequency traces - rapid current changes stress the metal more" },
      { id: 'b', label: "DC traces - sustained unidirectional current causes net atom migration", correct: true },
      { id: 'c', label: "Both equally susceptible - total current magnitude determines failure rate" },
      { id: 'd', label: "Neither - modern chips are designed to prevent electromigration entirely" }
    ],
    explanation: "Electromigration requires net unidirectional current flow to cause cumulative atom displacement. High-frequency AC currents alternate direction rapidly, so atoms move back and forth with minimal net migration. DC and low-frequency currents allow atoms to accumulate in one direction, making power supply traces and clock trees more vulnerable than high-speed signal lines."
  },
  {
    scenario: "During accelerated life testing at 200C, a test chip develops visible hillocks - bumps of copper that have grown above the wire surface. One hillock is tall enough to touch the metal layer above it.",
    question: "What type of failure do these hillocks cause?",
    options: [
      { id: 'a', label: "Open circuit - the hillock breaks the current path" },
      { id: 'b', label: "Short circuit - the hillock bridges to adjacent conductors", correct: true },
      { id: 'c', label: "Increased resistance - the hillock acts as a bottleneck" },
      { id: 'd', label: "Electrostatic discharge - the hillock creates charge buildup" }
    ],
    explanation: "While voids cause open circuits, hillocks cause the opposite failure mode: short circuits. As atoms pile up, they can extrude through dielectric layers and contact adjacent metal lines or layers. This is particularly dangerous in dense multi-layer interconnects where vertical spacing between layers is only tens of nanometers."
  },
  {
    scenario: "A fab is experimenting with different copper alloys for next-generation interconnects. Adding 1% manganese to the copper increases resistivity by 15% but improves electromigration lifetime by 3x.",
    question: "Why does alloying improve electromigration resistance despite increasing resistivity?",
    options: [
      { id: 'a', label: "Higher resistance reduces current flow, lowering electron wind force" },
      { id: 'b', label: "Alloying elements segregate to grain boundaries and block diffusion paths", correct: true },
      { id: 'c', label: "The alloy has lower thermal conductivity, reducing hot spots" },
      { id: 'd', label: "Manganese atoms are heavier and harder for electrons to move" }
    ],
    explanation: "Electromigration primarily occurs along grain boundaries where atoms can diffuse most easily. Alloying elements like manganese preferentially segregate to these grain boundaries during annealing. Once there, they act as barriers that block the diffusion paths, dramatically slowing atomic migration despite the modest increase in bulk resistivity."
  },
  {
    scenario: "A design team is debugging a chip that passes electromigration verification in simulation but fails in the field. Investigation reveals the failures occur only in chips from one wafer lot that ran 50C hotter during a specific manufacturing step.",
    question: "How did the manufacturing temperature variation cause premature electromigration failure?",
    options: [
      { id: 'a', label: "Higher temperature caused immediate electromigration during manufacturing" },
      { id: 'b', label: "The thermal spike changed the copper grain structure, creating more diffusion paths", correct: true },
      { id: 'c', label: "Hot processing melted some interconnects, weakening them" },
      { id: 'd', label: "Temperature variations are normal and unrelated to the failures" }
    ],
    explanation: "Copper grain structure is determined during thermal processing. Higher annealing temperatures promote larger grains, which sounds beneficial but can also create more grain boundary area oriented along the current flow direction. The resulting microstructure has faster diffusion paths for electromigration, reducing effective activation energy and lifetime."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'CPU & GPU Design',
    short: 'Billions of wires that must last a decade',
    tagline: 'Every wire in your processor is a ticking clock',
    description: 'Modern CPUs contain over 100 billion transistors connected by more than 10 kilometers of copper wiring, some traces only 20 atoms wide. At these scales, electromigration sets fundamental limits on how much current each wire can carry and thus how fast the chip can operate. Every interconnect must be carefully designed to survive 10+ years of continuous use.',
    connection: 'The current density and temperature effects you explored directly apply to every wire in your CPU. Design teams run extensive simulations using Black\'s equation to verify that no wire exceeds safe current density limits, even under worst-case power virus workloads that maximize current flow.',
    howItWorks: 'Electronic Design Automation (EDA) tools analyze current flow through every segment of every wire in the chip. Wires carrying high current are automatically widened. Vias connecting metal layers are replicated for redundancy. Power delivery networks use thick top-metal layers and sophisticated mesh structures to distribute current evenly across the die.',
    stats: [
      { value: '2 MA/cm^2', label: 'Typical limit', icon: '⚡' },
      { value: '10+ years', label: 'Target MTTF', icon: '⏱️' },
      { value: '15+ layers', label: 'Metal stack', icon: '📚' }
    ],
    examples: ['Intel Core i9 with 10km of copper interconnects', 'AMD EPYC server CPUs with 24-hour operation', 'Apple M3 with advanced power gating', 'NVIDIA H100 GPUs running continuous AI training'],
    companies: ['Intel', 'AMD', 'NVIDIA', 'Apple', 'Qualcomm'],
    futureImpact: 'As chips shrink to 2nm and beyond, interconnects approach atomic dimensions where traditional copper may become impractical. Research into ruthenium and cobalt interconnects promises better electromigration resistance. 3D stacking and chiplet architectures reduce interconnect length by stacking chips vertically.',
    color: '#3B82F6'
  },
  {
    icon: '🔋',
    title: 'Power Electronics',
    short: 'High currents in compact packages',
    tagline: 'Pushing amps through millimeter-scale traces',
    description: 'Power management ICs, voltage regulators, and motor drivers route currents of 10-100+ amps through bond wires, lead frames, and on-chip interconnects. These compact devices must dissipate significant heat while maintaining reliable current paths. Electromigration in power devices directly limits how much current can be safely handled in a given package size.',
    connection: 'Power devices operate at much higher current densities than digital logic, often near the electromigration limit. The temperature dependence you observed is critical here - power devices self-heat significantly during operation, creating a dangerous feedback loop where heat accelerates electromigration.',
    howItWorks: 'Power IC designers use specialized thick metal layers (sometimes 10x thicker than signal layers) for high-current paths. Multiple parallel bond wires share current to reduce density in each. Thermal design is integrated with electrical design to minimize hot spots. Copper wire bonding replaces gold for better current handling.',
    stats: [
      { value: '100+ Amps', label: 'Peak current', icon: '⚡' },
      { value: '200C', label: 'Junction temp', icon: '🌡️' },
      { value: '25 um', label: 'Bond wire', icon: '🔗' }
    ],
    examples: ['Laptop USB-C PD controllers handling 100W', 'Electric vehicle motor drivers at 400V', 'Server VRM modules powering CPUs', 'GaN fast chargers for mobile devices'],
    companies: ['Texas Instruments', 'Infineon', 'ON Semiconductor', 'Analog Devices', 'Monolithic Power Systems'],
    futureImpact: 'Wide-bandgap semiconductors (GaN, SiC) enable higher switching frequencies and smaller magnetics, but create new electromigration challenges with higher current density and temperature. Advanced packaging with embedded die and direct copper bonding will push power density limits further.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Reliability when failure means danger',
    tagline: 'Chips that must survive 15 years in an engine bay',
    description: 'Automotive chips face the harshest operating conditions: temperatures from -40C in arctic cold starts to 175C next to the engine, combined with vibration, humidity, and 15+ year lifetime requirements. Engine controllers, ADAS systems, and EV battery management electronics must never fail. Electromigration qualification for automotive is far more stringent than consumer electronics.',
    connection: 'The exponential temperature dependence you observed becomes critical for automotive. A chip that lasts 10 years at 85C might fail in 2 years at 125C. Automotive designers must account for the entire temperature range over the vehicle lifetime, including cumulative damage from thermal cycling.',
    howItWorks: 'Automotive chips use specialized metallization with copper alloys (adding aluminum, manganese) that resist electromigration. Design rules are 50-100% more conservative than consumer devices. AEC-Q100 qualification includes 1000+ hours of accelerated testing at extreme temperatures. Redundant signal paths and diagnostic circuits detect early degradation.',
    stats: [
      { value: '-40 to 175C', label: 'Temp range', icon: '🌡️' },
      { value: '15+ years', label: 'Required life', icon: '⏱️' },
      { value: 'AEC-Q100', label: 'Qualification', icon: '✓' }
    ],
    examples: ['Tesla Autopilot computer at 500+ TOPS', 'Bosch engine control units', 'EV battery management with 400V isolation', 'ADAS cameras with image processors'],
    companies: ['NXP', 'Infineon', 'STMicroelectronics', 'Renesas', 'Texas Instruments'],
    futureImpact: 'Autonomous vehicles require even higher reliability (ISO 26262 ASIL-D) with chips that detect and mitigate their own degradation. Vehicle-to-everything (V2X) communication adds more always-on electronics. Solid-state batteries may enable extreme underhood temperatures that push current metallization beyond its limits.',
    color: '#F59E0B'
  },
  {
    icon: '🛰️',
    title: 'Aerospace & Space Electronics',
    short: 'Decades of operation with zero maintenance',
    tagline: 'You cannot send a repair technician to Mars',
    description: 'Satellites, spacecraft, and deep-space probes must operate for 20+ years without any possibility of repair. Communication satellites in geosynchronous orbit, Mars rovers, and space telescopes rely on electronics that experience extreme temperature swings, radiation damage, and vacuum conditions. Electromigration is one of many wear-out mechanisms that limit mission duration.',
    connection: 'Space electronics combine the temperature challenges you explored with additional stresses from radiation. Cosmic rays create defects in the metal structure that accelerate electromigration. Extended missions must budget for cumulative degradation over decades, with margins for unexpected operating conditions.',
    howItWorks: 'Space-grade chips use extremely conservative current density rules (often 50% of terrestrial limits). Radiation-hardened designs include larger transistors and wider traces that better tolerate damage. Triple-redundant systems allow continued operation even when one copy fails. Some missions include spare electronics that activate only when primary systems degrade.',
    stats: [
      { value: '20+ years', label: 'Mission life', icon: '🚀' },
      { value: '-150 to +125C', label: 'Thermal cycle', icon: '🌡️' },
      { value: '0 repairs', label: 'Maintenance', icon: '🔧' }
    ],
    examples: ['James Webb Space Telescope electronics', 'Mars Perseverance rover computers', 'Starlink satellite network processors', 'GPS satellite atomic clock systems'],
    companies: ['BAE Systems', 'Microchip (Microsemi)', 'Cobham', 'Teledyne', 'Honeywell'],
    futureImpact: 'Mega-constellations of thousands of satellites need cost-effective reliability. CubeSats and small satellites use commercial-grade components with mission-level redundancy instead of space-grade parts. Deep space missions to Jupiter and beyond face radiation environments that push current technology limits.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ElectromigrationRenderer: React.FC<ElectromigrationRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [currentDensity, setCurrentDensity] = useState(5); // MA/cm^2
  const [temperature, setTemperature] = useState(85); // Celsius
  const [wireWidth, setWireWidth] = useState(100); // nm
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [voidSize, setVoidSize] = useState(0);
  const [hillockSize, setHillockSize] = useState(0);

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

  // Simulation effect - void and hillock growth
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      // Growth rate based on current density and temperature (simplified Black's equation behavior)
      const tempFactor = Math.exp((temperature - 85) / 30); // Arrhenius-like
      const densityFactor = Math.pow(currentDensity / 5, 2); // J^2 relationship
      const growthRate = densityFactor * tempFactor * 0.3;

      setVoidSize(prev => Math.min(prev + growthRate, 100));
      setHillockSize(prev => Math.min(prev + growthRate * 0.8, 100));
    }, 100);
    return () => clearInterval(interval);
  }, [isSimulating, currentDensity, temperature]);

  // Calculate MTTF using Black's equation
  const calculateMTTF = useCallback(() => {
    const J = currentDensity;
    const T = temperature + 273; // Kelvin
    const Ea = 0.7; // eV (typical for copper)
    const k = 8.617e-5; // eV/K
    const n = 2; // current density exponent
    const A = 1.75e-7; // calibrated constant for realistic MTTF in years

    const mttf = A * Math.pow(J, -n) * Math.exp(Ea / (k * T));
    return Math.min(mttf, 1000); // Return in years, cap at 1000
  }, [currentDensity, temperature]);

  const mttf = calculateMTTF();

  // Premium design colors - using brightness >= 180 for text contrast
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber/copper theme for electromigration
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast (brightness >= 180)
    textMuted: '#cbd5e1', // High contrast (brightness >= 180)
    border: '#2a2a3a',
    copper: '#B87333',
    electron: '#60A5FA',
    void: '#1F2937',
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
    twist_play: 'Twist Explore',
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
        gameType: 'electromigration',
        gameTitle: 'Electromigration in Chips',
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

  const resetSimulation = useCallback(() => {
    setVoidSize(0);
    setHillockSize(0);
    setIsSimulating(false);
  }, []);

  // Get status based on MTTF
  const getMTTFStatus = () => {
    if (mttf >= 10) return { status: 'Safe', color: colors.success };
    if (mttf >= 5) return { status: 'Marginal', color: colors.warning };
    return { status: 'Critical', color: colors.error };
  };

  const mttfStatus = getMTTFStatus();

  // Electromigration Visualization SVG
  const renderElectromigrationVisualization = (showTemperature = false) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const wireY = 100;
    const wireHeight = 60;

    // Calculate electron speed based on current density
    const electronSpeed = currentDensity / 5;
    const atomDisplacement = isSimulating ? Math.sin(animationFrame * 0.1) * (currentDensity * 0.3) : 0;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          {/* Copper gradient */}
          <linearGradient id="copperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#CD7F32" />
            <stop offset="50%" stopColor="#B87333" />
            <stop offset="100%" stopColor="#8B5A2B" />
          </linearGradient>

          {/* Electron glow */}
          <radialGradient id="electronGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="1" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>

          {/* Void darkness */}
          <radialGradient id="voidGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="100%" stopColor="#1F2937" />
          </radialGradient>

          {/* Hillock glow */}
          <radialGradient id="hillockGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.5" />
          </radialGradient>

          {/* Temperature heat gradient */}
          <linearGradient id="heatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={colors.border} strokeWidth="0.5" />
        </pattern>
        <rect width={width} height={height} fill="url(#grid)" opacity="0.3" />

        {/* Copper wire */}
        <rect
          x={40}
          y={wireY}
          width={width - 80}
          height={wireHeight}
          rx={4}
          fill="url(#copperGrad)"
        />

        {/* Void (growing from cathode side) */}
        {voidSize > 5 && (
          <ellipse
            cx={80 + voidSize * 0.3}
            cy={wireY + wireHeight / 2}
            rx={Math.min(voidSize * 0.4, 35)}
            ry={Math.min(voidSize * 0.3, wireHeight / 2.5)}
            fill="url(#voidGrad)"
            opacity={Math.min(voidSize / 50, 1)}
            filter="url(#glow)"
          />
        )}

        {/* Hillock (growing at anode side) */}
        {hillockSize > 5 && (
          <ellipse
            cx={width - 100 - hillockSize * 0.2}
            cy={wireY - 5}
            rx={Math.min(hillockSize * 0.3, 25)}
            ry={Math.min(hillockSize * 0.2, 15)}
            fill="url(#hillockGlow)"
            opacity={Math.min(hillockSize / 50, 0.9)}
            filter="url(#glow)"
          />
        )}

        {/* Copper atoms */}
        {Array.from({ length: 16 }, (_, i) => {
          const col = i % 8;
          const row = Math.floor(i / 8);
          const baseX = 70 + col * 45;
          const baseY = wireY + 15 + row * 30;
          const displacement = isSimulating ? atomDisplacement * (1 + col * 0.1) : 0;
          const opacity = voidSize > 30 && col < 2 ? Math.max(0.2, 1 - voidSize / 80) : 0.9;

          return (
            <g key={i}>
              <circle
                cx={baseX + displacement}
                cy={baseY}
                r={8}
                fill="#FCD34D"
                opacity={opacity}
                filter="url(#glow)"
              />
              <circle
                cx={baseX + displacement}
                cy={baseY}
                r={5}
                fill="#F59E0B"
                opacity={opacity}
              />
            </g>
          );
        })}

        {/* Electrons flowing */}
        {isSimulating && Array.from({ length: Math.floor(currentDensity * 2) }, (_, i) => {
          const x = ((animationFrame * electronSpeed * 3 + i * 50) % (width - 100)) + 50;
          const y = wireY + 15 + (i % 2) * 30;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="url(#electronGlow)"
              filter="url(#glow)"
            />
          );
        })}

        {/* Electron flow arrow */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.electron} />
          </marker>
        </defs>
        <line
          x1={60}
          y1={wireY + wireHeight + 30}
          x2={width - 60}
          y2={wireY + wireHeight + 30}
          stroke={colors.electron}
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          opacity={0.7}
        />
        <text x={width / 2} y={wireY + wireHeight + 48} textAnchor="middle" fill={colors.textMuted} fontSize="12">
          Electron Flow (e-)
        </text>

        {/* Cathode/Anode labels */}
        <text x={50} y={wireY - 15} fill={colors.error} fontSize="12" fontWeight="600">(-) Cathode</text>
        <text x={width - 120} y={wireY - 15} fill={colors.success} fontSize="12" fontWeight="600">Anode (+)</text>

        {/* Status displays */}
        <g transform={`translate(${width / 2 - 60}, ${height - 60})`}>
          <rect x="0" y="0" width="120" height="50" rx="8" fill={colors.bgSecondary} stroke={mttfStatus.color} strokeWidth="2" />
          <text x="60" y="22" textAnchor="middle" fill={mttfStatus.color} fontSize="18" fontWeight="bold">
            {mttf.toFixed(1)} yrs
          </text>
          <text x="60" y="40" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            MTTF ({mttfStatus.status})
          </text>
        </g>

        {/* Temperature gauge when in twist phase */}
        {showTemperature && (
          <g transform={`translate(${width - 60}, 20)`}>
            <rect x="0" y="0" width="40" height="120" rx="4" fill={colors.bgSecondary} stroke={colors.border} />
            <rect x="8" y="10" width="24" height="100" rx="2" fill={colors.bgPrimary} />
            <rect
              x="8"
              y={10 + 100 - ((temperature - 25) / 150) * 100}
              width="24"
              height={((temperature - 25) / 150) * 100}
              rx="2"
              fill="url(#heatGrad)"
            />
            <text x="20" y="135" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">
              {temperature}C
            </text>
          </g>
        )}

        {/* Wire info */}
        <text x={40} y={height - 15} fill={colors.textMuted} fontSize="11">
          Wire: {wireWidth}nm | J = {currentDensity} MA/cm^2
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
      gap: '2px',
      padding: '0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            minWidth: '16px',
            minHeight: '44px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            display: 'block',
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Bottom navigation bar with Back/Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestPhase = phase === 'test';
    const nextDisabled = currentIndex >= phaseOrder.length - 1 || isTestPhase;
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1001,
      }}>
        <button
          onClick={() => { if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]); }}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: currentIndex > 0 ? colors.textSecondary : colors.border,
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: currentIndex > 0 ? 'pointer' : 'default',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          ← Back
        </button>
        {renderNavDots()}
        <button
          disabled={nextDisabled}
          onClick={() => { if (!nextDisabled) nextPhase(); }}
          style={{
            background: !nextDisabled ? colors.accent : colors.border,
            border: 'none',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: !nextDisabled ? 'pointer' : 'not-allowed',
            opacity: nextDisabled ? 0.4 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next →
        </button>
      </nav>
    );
  };

  // Primary button style with minHeight 44px for touch targets
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Fixed navigation bar at top
  const renderNavigationBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1001,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚡</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
          Electromigration in Chips
        </span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

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
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{
          flex: '1',
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡💀
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Electromigration in Chips
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Every chip has a hidden death sentence. Deep inside, <span style={{ color: colors.accent }}>electrons are slowly pushing metal atoms</span> out of place, creating gaps that will eventually break the circuit."
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
            "At the nanoscale, flowing electrons act like a river eroding its banks. Over years of operation, they physically push copper atoms along the wire, creating voids that break circuits and hillocks that cause shorts."
          </p>
          <p className="text-secondary text-muted" style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Semiconductor Reliability Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={{ ...primaryButtonStyle, minHeight: '44px' }}
          data-testid="hook-continue-button"
        >
          Discover the Silent Killer
        </button>

        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Excessive heat melts the copper wires over time' },
      { id: 'b', text: 'Electrons transfer momentum to metal atoms, pushing them along the wire', correct: true },
      { id: 'c', text: 'Oxygen in the chip package corrodes the copper connections' },
      { id: 'd', text: 'Mechanical vibration causes metal fatigue and cracking' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', padding: '24px', paddingTop: '80px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          {/* Progress indicator */}
          <div style={{
            ...typo.small,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Prediction 1 of 1
          </div>

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
            What causes copper interconnects inside microchips to eventually fail after years of use?
          </h2>

          {/* Static Diagram with SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {/* SVG static visualization */}
            <svg width={isMobile ? 300 : 400} height={140} viewBox={`0 0 ${isMobile ? 300 : 400} 140`} style={{ marginBottom: '16px' }}>
              <defs>
                <linearGradient id="copperGradPredict" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#CD7F32" />
                  <stop offset="50%" stopColor="#B87333" />
                  <stop offset="100%" stopColor="#8B5A2B" />
                </linearGradient>
                <radialGradient id="atomGlowPredict" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="100%" stopColor="#FCD34D" />
                </radialGradient>
              </defs>
              {/* Background */}
              <rect x={0} y={0} width={isMobile ? 300 : 400} height={140} fill="#1a1a24" rx={8} />
              {/* Copper wire */}
              <rect x={30} y={45} width={isMobile ? 240 : 340} height={40} rx={4} fill="url(#copperGradPredict)" />
              {/* Wire outline */}
              <rect x={30} y={45} width={isMobile ? 240 : 340} height={40} rx={4} fill="none" stroke="#8B5A2B" strokeWidth={1} />
              {/* Atoms representation */}
              {Array.from({ length: 8 }, (_, i) => (
                <g key={i}>
                  <circle cx={50 + i * (isMobile ? 30 : 42)} cy={65} r={12} fill="url(#atomGlowPredict)" opacity={0.9} />
                  <circle cx={50 + i * (isMobile ? 30 : 42)} cy={65} r={7} fill="#F59E0B" opacity={1} />
                </g>
              ))}
              {/* Labels */}
              <text x={30} y={25} fill="#e2e8f0" fontSize="11" fontWeight="600">Copper Interconnect</text>
              <text x={isMobile ? 200 : 280} y={25} fill="#60A5FA" fontSize="11">Metal Atoms</text>
              <text x={(isMobile ? 150 : 200)} y={125} textAnchor="middle" fill={colors.textMuted} fontSize="12">
                Static cross-section view
              </text>
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px' }}>🖥️</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>New Chip</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{
                background: colors.accent + '33',
                padding: '16px 24px',
                borderRadius: '8px',
                border: `2px dashed ${colors.accent}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.accent }}>10 years</div>
                <p style={{ ...typo.small, color: colors.textSecondary }}>Billions of electrons flowing</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px' }}>💥</div>
                <p style={{ ...typo.small, color: colors.error }}>Failed Chip</p>
              </div>
            </div>
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
              See It In Action
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Electromigration Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Watch how current density affects atomic migration and chip lifetime
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}22`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Adjust the current density slider and click "Start Simulation" to observe how electrons push copper atoms, creating voids and hillocks over time.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: '900px',
            marginBottom: '24px',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
          }}>
            {/* MTTF vs Current Density Chart */}
            {(() => {
              const chartW = isMobile ? 340 : 480;
              const chartH = 340;
              const padL = 60, padR = 40, padT = 20, padB = 40;
              const plotW = chartW - padL - padR;
              const plotH = chartH - padT - padB;
              const jMin = 1, jMax = 20;
              const calcMTTFForJ = (j: number) => {
                const T = temperature + 273;
                return Math.min(1.75e-7 * Math.pow(j, -2) * Math.exp(0.7 / (8.617e-5 * T)), 1000);
              };
              // Use log scale for Y axis to show the wide MTTF range
              const logMin = Math.log10(0.01); // -2
              const logMax = Math.log10(1000); // 3
              const logRange = logMax - logMin; // 5 decades
              const yForMTTF = (m: number) => {
                const logVal = Math.log10(Math.max(m, 0.01));
                return padT + (1 - (logVal - logMin) / logRange) * plotH;
              };
              const points: {x: number; y: number}[] = [];
              for (let i = 0; i <= 40; i++) {
                const j = jMin + (jMax - jMin) * (i / 40);
                const m = calcMTTFForJ(j);
                const px = padL + (j - jMin) / (jMax - jMin) * plotW;
                const py = yForMTTF(m);
                points.push({ x: px, y: py });
              }
              const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
              const curX = padL + (currentDensity - jMin) / (jMax - jMin) * plotW;
              const curY = yForMTTF(mttf);
              // Color zones
              const safeY = yForMTTF(10);
              const warnY = yForMTTF(5);
              return (
                <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ background: colors.bgSecondary, borderRadius: '8px', marginBottom: '16px' }}>
                  <defs>
                    <filter id="chartGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id="chartFillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={colors.accent} stopOpacity="0.02" />
                    </linearGradient>
                    <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={colors.accent} stopOpacity="1" />
                      <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {/* Color zone backgrounds */}
                  <g opacity="0.15">
                    <rect x={padL} y={padT} width={plotW} height={Math.max(0, safeY - padT)} fill={colors.success} />
                    <rect x={padL} y={safeY} width={plotW} height={Math.max(0, warnY - safeY)} fill={colors.warning} />
                    <rect x={padL} y={warnY} width={plotW} height={Math.max(0, padT + plotH - warnY)} fill={colors.error} />
                  </g>
                  {/* Grid lines */}
                  <g>
                  {[0.25, 0.5, 0.75].map((f, i) => (
                    <line key={`hg${i}`} x1={padL} y1={padT + plotH * f} x2={padL + plotW} y2={padT + plotH * f} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                  ))}
                  {[0.25, 0.5, 0.75].map((f, i) => (
                    <line key={`vg${i}`} x1={padL + plotW * f} y1={padT} x2={padL + plotW * f} y2={padT + plotH} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                  ))}
                  </g>
                  {/* Axes */}
                  <g>
                  <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={colors.textMuted} strokeWidth="1" />
                  <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={colors.textMuted} strokeWidth="1" />
                  </g>
                  {/* Fill area under curve */}
                  <path d={`${pathD} L ${points[points.length-1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`} fill="url(#chartFillGrad)" />
                  {/* Curve */}
                  <path d={pathD} fill="none" stroke={colors.accent} strokeWidth="2.5" />
                  {/* Reference lines for safe/critical thresholds */}
                  <g>
                  <line x1={padL} y1={safeY} x2={padL + plotW} y2={safeY} stroke={colors.success} strokeWidth="1" strokeDasharray="6 3" opacity="0.6" />
                  <text x={padL + plotW + 2} y={safeY + 4} fill={colors.success} fontSize="11">10yr</text>
                  <line x1={padL} y1={warnY} x2={padL + plotW} y2={warnY} stroke={colors.error} strokeWidth="1" strokeDasharray="6 3" opacity="0.6" />
                  <text x={padL + plotW + 2} y={warnY + 4} fill={colors.error} fontSize="11">5yr</text>
                  </g>
                  {/* Interactive point */}
                  <circle cx={curX} cy={curY} r={8} fill={colors.accent} filter="url(#chartGlow)" stroke="#fff" strokeWidth={2} />
                  {/* Axis labels */}
                  <text x={padL + plotW / 2} y={chartH - 4} textAnchor="middle" fill={colors.textMuted} fontSize="12">Current Density (MA/cm²)</text>
                  <text x={14} y={padT + plotH / 2} textAnchor="middle" fill={colors.textMuted} fontSize="12" transform={`rotate(-90, 14, ${padT + plotH / 2})`}>MTTF (years)</text>
                  {/* Value label */}
                  <text x={curX} y={Math.max(curY - 14, padT + 10)} textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">{mttf.toFixed(1)} yrs</text>
                </svg>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderElectromigrationVisualization()}
            </div>
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
          }}>
            {/* Current density slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Current Density (J)</span>
                <span style={{ ...typo.small, color: currentDensity > 10 ? colors.error : colors.accent, fontWeight: 600 }}>
                  {currentDensity} MA/cm^2
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={currentDensity}
                onChange={(e) => setCurrentDensity(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none' as const,
                  accentColor: '#3b82f6',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Low (Safe)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>High (Dangerous)</span>
              </div>
            </div>

            {/* Wire width slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Wire Width</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{wireWidth} nm</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={wireWidth}
                onChange={(e) => setWireWidth(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none' as const,
                  accentColor: '#3b82f6',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Simulation controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={{
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {isSimulating ? 'Pause Simulation' : 'Start Simulation'}
              </button>
              <button
                onClick={resetSimulation}
                style={{
                  background: colors.bgSecondary,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Reset
              </button>
            </div>

            {/* Stats grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: mttfStatus.color }}>{mttf.toFixed(1)} yrs</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>MTTF</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: voidSize > 50 ? colors.error : colors.warning }}>{voidSize.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Void Growth</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: hillockSize > 50 ? colors.error : colors.accent }}>{hillockSize.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Hillock Growth</div>
              </div>
            </div>
          </div>
          </div>
          </div>

          {/* Warning/discovery message */}
          {voidSize > 50 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Critical void formation! The wire is approaching failure.
              </p>
            </div>
          )}

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Real-World Relevance
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              This exact phenomenon limits how much current can flow through the billions of copper wires in your CPU and GPU.
              Chip designers use Black's equation to predict wire lifetime and set maximum current density rules.
              Violating these rules even slightly can reduce a 10-year lifetime to just 2-3 years.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); resetSimulation(); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Black's Equation: Predicting Chip Lifetime
          </h2>

          {/* Reference to user's prediction */}
          <div style={{
            background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
              {prediction === 'b'
                ? "Your prediction was correct! Electron momentum transfer is indeed the cause of electromigration failure."
                : prediction
                  ? "Your prediction about chip failure was close, but electron momentum transfer (not heat, corrosion, or vibration) is the true mechanism behind electromigration."
                  : "As you observed in the experiment, electron momentum transfer is the true mechanism behind electromigration - the result of current pushing metal atoms along the wire."
              }
            </p>
          </div>

          {/* Black's equation display */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.accent}22, ${colors.accent}11)`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.accent, marginBottom: '12px' }}>Black's Equation for Electromigration</p>
            <div style={{
              fontSize: isMobile ? '20px' : '28px',
              fontFamily: 'monospace',
              color: colors.textPrimary,
              fontWeight: 700,
            }}>
              MTTF = A × J^(-n) × e^(Ea/kT)
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>J = Current Density</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>n ~ 2</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>Ea = Activation Energy</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>T = Temperature</span>
            </div>
          </div>

          {/* Key concepts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Electron Wind</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                High-energy electrons collide with metal atoms, transferring momentum and pushing them in the direction of current flow. This "electron wind" force is proportional to current density.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🕳️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Void Formation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                As atoms migrate away from the cathode end, they leave behind empty spaces (voids). These voids grow until they span the wire cross-section, causing an open circuit.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⛰️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Hillock Growth</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Displaced atoms pile up at the anode end, forming hillocks that can extrude through dielectric layers and short-circuit to adjacent wires or metal layers above.
              </p>
            </div>

            <div style={{
              background: `${colors.error}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.error}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📉</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>J^-2 Relationship</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Doubling current density reduces lifetime by 4x.</strong> This is why design rules strictly limit current density - small violations have huge reliability consequences.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Temperature Effect
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Higher temperature increases failure rate linearly (2x temp = 2x faster failure)' },
      { id: 'b', text: 'Higher temperature exponentially accelerates failure (Arrhenius behavior)', correct: true },
      { id: 'c', text: 'Temperature has no significant effect on electromigration rate' },
      { id: 'd', text: 'Higher temperature actually slows electromigration by reducing electron scattering' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <div style={{
            background: `${colors.error}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.error}44`,
          }}>
            <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
              New Variable: Temperature
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A chip normally runs at 85C. During a heat wave or heavy gaming, it reaches 105C. How does this 20C increase affect electromigration?
          </h2>

          {/* Static SVG for twist predict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 280 : 360} height={100} viewBox={`0 0 ${isMobile ? 280 : 360} 100`}>
              <defs>
                <linearGradient id="tempGradTwist" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="50%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
              <rect x={0} y={0} width={isMobile ? 280 : 360} height={100} fill="#1a1a24" rx={8} />
              {/* Temperature scale */}
              <rect x={30} y={20} width={30} height={60} rx={4} fill="#12121a" stroke="#2a2a3a" />
              <rect x={35} y={30} width={20} height={45} rx={2} fill="url(#tempGradTwist)" />
              <text x={45} y={90} textAnchor="middle" fill="#e2e8f0" fontSize="10">Temp</text>
              {/* Two chips showing comparison */}
              <g transform="translate(90, 25)">
                <rect x={0} y={0} width={60} height={50} rx={4} fill="#22C55E" opacity={0.3} />
                <text x={30} y={30} textAnchor="middle" fill="#22C55E" fontSize="14" fontWeight="600">85C</text>
                <text x={30} y={65} textAnchor="middle" fill="#e2e8f0" fontSize="10">Normal</text>
              </g>
              <g transform={`translate(${isMobile ? 180 : 220}, 25)`}>
                <rect x={0} y={0} width={60} height={50} rx={4} fill="#EF4444" opacity={0.3} />
                <text x={30} y={30} textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="600">105C</text>
                <text x={30} y={65} textAnchor="middle" fill="#e2e8f0" fontSize="10">Heat wave</text>
              </g>
              <text x={(isMobile ? 160 : 200)} y={50} textAnchor="middle" fill="#cbd5e1" fontSize="20">?</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.error}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.error : colors.border}`,
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
                  background: twistPrediction === opt.id ? colors.error : colors.bgSecondary,
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
              See Temperature Effects
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate baseline MTTF at 25C for comparison
    const baselineMTTF = Math.min(1.75e-7 * Math.pow(currentDensity, -2) * Math.exp(0.7 / (8.617e-5 * 298)), 1000);
    const lifetimeRatio = (mttf / baselineMTTF) * 100;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Temperature vs. Chip Lifetime
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how temperature dramatically affects the Arrhenius exponential term
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: '900px',
            marginBottom: '24px',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderElectromigrationVisualization(true)}
            </div>
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
          }}>
            {/* Temperature slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Junction Temperature</span>
                <span style={{ ...typo.small, color: temperature > 105 ? colors.error : temperature > 85 ? colors.warning : colors.success, fontWeight: 600 }}>
                  {temperature}C
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="150"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none' as const,
                  accentColor: '#3b82f6',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>25C (Room)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>85C (Normal)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>150C (Extreme)</span>
              </div>
            </div>

            {/* Stats comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h2, color: mttfStatus.color }}>{mttf.toFixed(1)} yrs</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>MTTF at {temperature}C</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h2, color: lifetimeRatio > 50 ? colors.success : lifetimeRatio > 20 ? colors.warning : colors.error }}>
                  {lifetimeRatio.toFixed(0)}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>vs. Room Temp (25C)</div>
              </div>
            </div>
          </div>
          </div>
          </div>

          {/* Key insight box */}
          <div style={{
            background: `${colors.error}22`,
            border: `1px solid ${colors.error}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.error }}>Key insight:</strong> Every 10-15C increase roughly halves the chip's lifetime due to the exponential Arrhenius term!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Deep Physics
          </button>
        </div>
        </div>
        {renderBottomNav()}
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
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Thermal Management = Reliability
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧊</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Cool Operation = Long Life</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A chip running at 65C might achieve 20+ year MTTF. Better heatsinks, thermal paste, and airflow directly translate to longer chip life.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔥</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>Hot Operation = Short Life</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A chip running at 105C might only last 3-5 years. This is why gaming laptops throttle during heavy loads - they're protecting your investment.
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>The Activation Energy Barrier</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Atoms need energy to jump from one lattice site to another. Higher temperature provides more thermal energy, making these jumps exponentially more frequent. The activation energy Ea (about 0.7 eV for copper) sets this sensitivity.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why This Matters</h4>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>Gaming laptops throttle to protect chip lifetime</li>
                <li style={{ marginBottom: '8px' }}>Data centers spend billions on cooling infrastructure</li>
                <li style={{ marginBottom: '8px' }}>Automotive chips are rated for higher temps but use derating</li>
                <li>Overclocking without adequate cooling reduces long-term reliability</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Electromigration"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
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
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.short}
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
                How Electromigration Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>Examples:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((ex, i) => (
                  <span key={i} style={{
                    background: colors.bgSecondary,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>Key Companies:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.companies.map((co, i) => (
                  <span key={i} style={{
                    background: `${app.color}22`,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: app.color,
                    fontWeight: 600,
                  }}>
                    {co}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${app.color}33`,
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>Future Impact:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            Explore all 4 applications to continue ({completedApps.filter(c => c).length}/4 completed)
          </p>

          {/* Got It button for within-phase navigation */}
          {!allAppsCompleted && (
            <button
              onClick={() => {
                playSound('click');
                if (selectedApp < realWorldApps.length - 1) {
                  const nextApp = selectedApp + 1;
                  setSelectedApp(nextApp);
                  const newCompleted = [...completedApps];
                  newCompleted[nextApp] = true;
                  setCompletedApps(newCompleted);
                } else {
                  // Mark current app as completed if on last app
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginBottom: '12px',
              }}
            >
              Got It
            </button>
          )}

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        </div>
        {renderBottomNav()}
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
        }}>
          {renderNavigationBar()}
          {renderProgressBar()}
          <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
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
                ? 'You understand electromigration and chip reliability!'
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
          </div>
          {renderBottomNav()}
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
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: '1', overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
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
        </div>
        {renderBottomNav()}
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
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{
          flex: '1',
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Electromigration Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why chips wear out and how engineers design for decades of reliable operation.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '450px',
          textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'Electrons push metal atoms, creating voids and hillocks',
              'MTTF scales with J^-2 (current density is critical)',
              'Temperature has exponential effect (Arrhenius behavior)',
              'Cooling directly improves chip reliability and lifetime',
              'Design rules limit current density for long lifetimes',
              'Advanced nodes face greater challenges as wires shrink',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: colors.success, fontSize: '16px' }}>✅</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
          borderRadius: '12px',
          padding: '16px 32px',
          marginBottom: '32px',
        }}>
          <p style={{ ...typo.body, color: 'white', margin: 0, fontWeight: 700 }}>
            Final Score: {testScore}/10
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => {
              resetSimulation();
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setTestScore(0);
              setPrediction(null);
              setTwistPrediction(null);
              setCompletedApps([false, false, false, false]);
              goToPhase('hook');
            }}
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
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default ElectromigrationRenderer;
