'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Thermal Contact Resistance - Complete 10-Phase Game
// Why microscopic air gaps are the enemy of heat transfer
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

interface ThermalContactRendererProps {
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
    scenario: "A technician is building a high-performance gaming PC. After mounting the CPU cooler, the processor immediately hits 95C and starts throttling, even though the cooler is rated for 250W TDP.",
    question: "What is the most likely cause of this overheating?",
    options: [
      { id: 'a', label: "The cooler fan is spinning in the wrong direction" },
      { id: 'b', label: "Missing or improperly applied thermal paste between CPU and cooler", correct: true },
      { id: 'c', label: "The CPU is defective from the factory" },
      { id: 'd', label: "The case has insufficient airflow" }
    ],
    explanation: "Without thermal paste, microscopic air gaps between the CPU and heatsink create enormous thermal contact resistance. Air's thermal conductivity (0.026 W/mK) is about 15,000 times worse than copper (400 W/mK), blocking heat transfer even with a good cooler."
  },
  {
    scenario: "An engineer examines two polished metal surfaces under a microscope at 1000x magnification. Even though they look mirror-smooth to the naked eye, the microscope reveals rough terrain with peaks and valleys.",
    question: "When these surfaces are pressed together, approximately what percentage of the area is in actual metal-to-metal contact?",
    options: [
      { id: 'a', label: "About 80-90% - most of the surface touches" },
      { id: 'b', label: "About 50% - half touches, half doesn't" },
      { id: 'c', label: "Only 1-2% - just the highest peaks make contact", correct: true },
      { id: 'd', label: "100% - pressure forces complete contact" }
    ],
    explanation: "Even highly polished metal surfaces only achieve 1-2% actual contact area. The remaining 98-99% is filled with air gaps. This is why thermal interface materials are essential - they fill these microscopic voids."
  },
  {
    scenario: "A data center is comparing thermal interface materials for thousands of servers. Material A costs $0.50 and has thermal conductivity of 4 W/mK. Material B costs $15 and has 12 W/mK conductivity.",
    question: "Why might the expensive material be worth it for the data center?",
    options: [
      { id: 'a', label: "Higher conductivity looks better in marketing materials" },
      { id: 'b', label: "Lower CPU temps allow higher clock speeds and reduce cooling costs", correct: true },
      { id: 'c', label: "Expensive materials are always better quality" },
      { id: 'd', label: "The expensive material has better color options" }
    ],
    explanation: "Better thermal interface materials can reduce CPU temperatures by 5-15C. This allows higher sustained clock speeds (more performance) and may allow running fans slower (less power, less noise). Over thousands of servers running 24/7 for years, the electricity savings alone can dwarf the material cost."
  },
  {
    scenario: "An automotive engineer is designing the battery thermal management system for an electric vehicle. The battery pack contains 7,000 cylindrical cells that must stay within 5C of each other during fast charging.",
    question: "Why are thermal pads used between cells and cooling plates instead of thermal paste?",
    options: [
      { id: 'a', label: "Thermal pads are better conductors than paste" },
      { id: 'b', label: "Pads accommodate manufacturing tolerances and are easier to apply at scale", correct: true },
      { id: 'c', label: "Paste would chemically react with battery cells" },
      { id: 'd', label: "Pads are cheaper than paste" }
    ],
    explanation: "Thermal pads are compressible and can bridge gaps of 0.5-5mm, accommodating manufacturing variations in cell heights and positions. With 7,000 cells, paste application would be impractical, and any missed spots would create hot spots. Pads also don't pump out or dry over time like paste can."
  },
  {
    scenario: "A laptop manufacturer wants to reduce the thickness of their cooling solution by 0.5mm. They propose eliminating the thermal pad between the GPU and heatsink, relying on the mounting pressure to create direct contact.",
    question: "What problem will this likely cause?",
    options: [
      { id: 'a', label: "The GPU will run cooler due to reduced thermal resistance" },
      { id: 'b', label: "The GPU will run much hotter due to air gaps at the interface", correct: true },
      { id: 'c', label: "No change - mounting pressure creates good thermal contact" },
      { id: 'd', label: "The heatsink will corrode faster" }
    ],
    explanation: "Even with mounting pressure, bare metal contact only touches at surface peaks (1-2% of area). The remaining air gaps have thermal resistance roughly 300x higher than thermal paste. The GPU would likely throttle or fail from overheating."
  },
  {
    scenario: "A spacecraft designer is planning thermal management for electronics that will operate for 15 years in vacuum. On Earth, convection and the atmosphere help dissipate heat, but in space there is no air.",
    question: "Why is thermal contact resistance even more critical for spacecraft electronics?",
    options: [
      { id: 'a', label: "Space is colder so less cooling is needed" },
      { id: 'b', label: "Conduction to radiators is the ONLY heat removal path - any interface resistance is fatal", correct: true },
      { id: 'c', label: "Spacecraft electronics generate less heat" },
      { id: 'd', label: "Thermal paste works better in vacuum" }
    ],
    explanation: "In space, heat can only be removed by conduction to radiator panels that emit infrared radiation. There's no convection cooling. Every thermal interface between electronics and radiators adds resistance to this critical heat path. Poor interfaces can cause mission failure."
  },
  {
    scenario: "An enthusiast applies thermal paste to their CPU using the 'spread' method - carefully coating the entire surface with a thin layer. Their friend uses the 'pea' method - a small blob in the center that spreads under mounting pressure.",
    question: "Which method is generally recommended by thermal paste manufacturers?",
    options: [
      { id: 'a', label: "Spread method - ensures complete coverage" },
      { id: 'b', label: "Pea method - mounting pressure spreads paste without trapping air bubbles", correct: true },
      { id: 'c', label: "Both methods work identically" },
      { id: 'd', label: "Neither - paste should be applied to the cooler, not the CPU" }
    ],
    explanation: "The pea/dot method allows paste to spread outward from the center under mounting pressure, pushing air out. Manually spreading paste often traps small air bubbles in the layer, which create thermal resistance. Too much paste is also problematic as it acts as an insulator."
  },
  {
    scenario: "A thermal engineer is troubleshooting a power electronics module that's overheating. The thermal interface material was applied correctly, but the engineer notices the mounting screws were only hand-tightened.",
    question: "How does mounting pressure affect thermal contact resistance?",
    options: [
      { id: 'a', label: "Pressure has no effect once thermal paste fills the gaps" },
      { id: 'b', label: "Higher pressure reduces thermal resistance by increasing contact area and compressing TIM", correct: true },
      { id: 'c', label: "Higher pressure always damages electronic components" },
      { id: 'd', label: "Pressure only matters for bare metal contact, not with TIM" }
    ],
    explanation: "Mounting pressure increases the real contact area between surfaces (deforming surface peaks) and compresses thermal interface materials to be thinner and more uniform. Most thermal solutions specify a torque value for mounting screws to ensure adequate pressure."
  },
  {
    scenario: "A PC builder notices their 5-year-old computer runs 15C hotter than when it was new, even after cleaning dust from the heatsink. The thermal paste hasn't been replaced since original assembly.",
    question: "What has likely happened to the thermal paste over time?",
    options: [
      { id: 'a', label: "The paste has evaporated completely" },
      { id: 'b', label: "Thermal cycling has pumped out paste and caused it to dry/crack", correct: true },
      { id: 'c', label: "The paste has become more conductive with age" },
      { id: 'd', label: "CPU manufacturing causes paste to fail after 5 years" }
    ],
    explanation: "Repeated heating and cooling cycles cause thermal paste to slowly 'pump out' from between surfaces. The paste also dries out over time, losing its ability to fill gaps. This is why enthusiasts often replace thermal paste every 3-5 years or when temperatures increase."
  },
  {
    scenario: "An LED lighting engineer must choose a thermal interface for high-power LED arrays that operate at junction temperatures up to 150C. Standard thermal paste is rated for 125C maximum.",
    question: "What type of thermal interface would be appropriate for this high-temperature application?",
    options: [
      { id: 'a', label: "Apply extra thick layer of standard paste for better coverage" },
      { id: 'b', label: "Use phase-change material or thermal adhesive rated for high temperatures", correct: true },
      { id: 'c', label: "Standard paste works fine - temperature ratings are conservative" },
      { id: 'd', label: "Use no thermal interface - high temps will bond the surfaces naturally" }
    ],
    explanation: "High-temperature applications require specialized thermal interface materials. Phase-change materials and certain thermal adhesives are formulated for elevated temperatures. Using standard paste above its rating causes it to break down, pump out, or even burn, dramatically increasing thermal resistance."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💻',
    title: 'CPU Thermal Management',
    short: 'Keeping processors from melting themselves',
    tagline: 'The thin line between performance and destruction',
    description: 'Modern CPUs generate 100-300W of heat in an area smaller than a postage stamp. Thermal paste between the CPU and heatsink is critical - poor contact means 20-30C higher temps, causing throttling or permanent damage.',
    connection: 'Thermal contact resistance from microscopic air gaps is the bottleneck. Even polished surfaces only touch at 1-2% of their area, with air (k=0.026 W/mK) filling the rest.',
    howItWorks: 'Thermal paste fills microscopic valleys between the CPU lid and heatsink base. Premium pastes use silver or diamond particles for conductivity 300x better than air.',
    stats: [
      { value: '30C', label: 'Temp difference without paste', icon: '🌡' },
      { value: '8.5 W/mK', label: 'Good paste conductivity', icon: '⚡' },
      { value: '0.026 W/mK', label: 'Air conductivity', icon: '💨' }
    ],
    examples: ['Gaming PCs', 'Servers', 'Laptops', 'Workstations'],
    companies: ['Thermal Grizzly', 'Noctua', 'Arctic', 'Cooler Master'],
    futureImpact: 'Liquid metal compounds and graphene-based pastes will push conductivity above 100 W/mK, enabling even more powerful processors.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Battery Cooling',
    short: 'Keeping EV batteries in the safe zone',
    tagline: 'Thermal management that goes the distance',
    description: 'EV battery packs use thermal pads between cells and cooling plates. Uniform thermal contact ensures even cell temperatures, maximizing range, charging speed, and preventing thermal runaway.',
    connection: 'Gap fillers accommodate manufacturing tolerances while maintaining thermal contact across thousands of cells. Hot spots from poor contact can trigger cascading failures.',
    howItWorks: 'Soft thermal pads compress to fill gaps while conducting heat. Liquid cooling plates remove heat from the pack, keeping cells within their optimal 20-40C range.',
    stats: [
      { value: '1000+', label: 'Cells per pack', icon: '🔋' },
      { value: '5C', label: 'Max cell temp variation', icon: '🌡' },
      { value: '200kW', label: 'Heat during fast charge', icon: '⚡' }
    ],
    examples: ['Tesla Model 3', 'Ford Mustang Mach-E', 'Rivian R1T', 'Lucid Air'],
    companies: ['Tesla', 'CATL', 'LG Energy', 'Panasonic'],
    futureImpact: 'Immersion cooling with dielectric fluids will enable 10-minute charging by eliminating thermal interfaces entirely.',
    color: '#10B981'
  },
  {
    icon: '💡',
    title: 'LED Thermal Design',
    short: 'Keeping LEDs bright for decades',
    tagline: 'Heat is the enemy of light',
    description: 'High-power LEDs convert 30-50% of energy to heat concentrated in a tiny chip. Thermal interface materials bond LED chips to heat sinks. Poor thermal management causes rapid dimming and early failure.',
    connection: 'LED junction temperature directly affects light output and lifespan - every 10C rise halves the LED life. Thermal interfaces must minimize resistance.',
    howItWorks: 'Thermally conductive adhesives or solder attach LED dies to metal-core PCBs. Heat spreads through the board to finned heatsinks, keeping junction temperatures below 85C.',
    stats: [
      { value: '50%', label: 'Energy becomes heat', icon: '🔥' },
      { value: '50,000hr', label: 'Well-cooled LED life', icon: '⏰' },
      { value: '85C', label: 'Max junction temp', icon: '🌡' }
    ],
    examples: ['Street lights', 'Stadium lighting', 'Automotive headlights', 'Grow lights'],
    companies: ['Cree', 'Lumileds', 'Osram', 'Seoul Semiconductor'],
    futureImpact: 'Integrated chip-on-board designs eliminate interface resistance, enabling 300+ lumen/watt efficiency.',
    color: '#F59E0B'
  },
  {
    icon: '🛰',
    title: 'Spacecraft Electronics',
    short: 'Cooling without air in the vacuum of space',
    tagline: 'No atmosphere, no convection, no second chances',
    description: 'In space, there is no air for convection cooling. Electronics rely entirely on conduction to radiators. Thermal interface materials and bolted joints must be perfect - there is no repair possible once launched.',
    connection: 'Space thermal management pushes contact resistance to its limits. Every interface adds thermal resistance to the only heat path: conduction to radiators that emit infrared into space.',
    howItWorks: 'Electronics mount to cold plates with high-pressure bolted joints and specialized space-rated thermal compounds. Heat conducts to external radiator panels that emit infrared into space.',
    stats: [
      { value: '200C', label: 'Sun-shade temp swing', icon: '☀' },
      { value: '15yr', label: 'Mission lifetime', icon: '🚀' },
      { value: '0', label: 'Repair opportunities', icon: '🔧' }
    ],
    examples: ['Mars rovers', 'GPS satellites', 'ISS computers', 'James Webb Telescope'],
    companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Loop heat pipes and advanced radiator coatings will enable higher-power spacecraft in extreme thermal environments.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ThermalContactRenderer: React.FC<ThermalContactRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Main experiment
  const [interfaceType, setInterfaceType] = useState<'air_gap' | 'bare_contact' | 'thermal_paste'>('bare_contact');
  const [hotBlockTemp, setHotBlockTemp] = useState(80);
  const [coldBlockTemp, setColdBlockTemp] = useState(20);
  const [simRunning, setSimRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);

  // Twist phase - CPU cooler comparison
  const [coolerType, setCoolerType] = useState<'no_paste' | 'with_paste'>('no_paste');
  const [cpuLoad, setCpuLoad] = useState(100); // percentage
  const [cpuTemp, setCpuTemp] = useState(35);
  const [twistSimRunning, setTwistSimRunning] = useState(false);

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

  // Animation frame for visuals
  const [animFrame, setAnimFrame] = useState(0);
  const [contactPressure, setContactPressure] = useState(50); // 0-100 range

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
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Main simulation
  useEffect(() => {
    if (!simRunning) return;

    const conductivities = {
      air_gap: 0.026,
      bare_contact: 2.5,
      thermal_paste: 8.5
    };
    const k = conductivities[interfaceType];
    const heatTransferRate = k * 0.003;

    const timer = setInterval(() => {
      setSimTime(t => t + 1);
      const tempDiff = hotBlockTemp - coldBlockTemp;
      if (tempDiff > 1) {
        const transfer = heatTransferRate * tempDiff;
        setHotBlockTemp(h => Math.max(coldBlockTemp, h - transfer));
        setColdBlockTemp(c => Math.min(hotBlockTemp, c + transfer));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [simRunning, interfaceType, hotBlockTemp, coldBlockTemp]);

  // Twist simulation - CPU cooling
  useEffect(() => {
    if (!twistSimRunning) return;

    const coolingPower = coolerType === 'with_paste' ? 3.0 : 0.5;
    const heatGeneration = cpuLoad * 1.5; // Heat from CPU load

    const timer = setInterval(() => {
      setCpuTemp(t => {
        const ambientTemp = 25;
        const targetDelta = heatGeneration / coolingPower;
        const targetTemp = ambientTemp + targetDelta;
        const diff = targetTemp - t;
        return t + diff * 0.05;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [twistSimRunning, coolerType, cpuLoad]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for heat theme
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    accentBlue: '#3B82F6', // Blue for cold
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
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
    twist_play: 'Twist Experiment',
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
        gameType: 'thermal-contact',
        gameTitle: 'Thermal Contact Resistance',
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

  // Heat Transfer Visualization
  const HeatTransferVisualization = () => {
    const svgW = 500;
    const svgH = 340;

    const getTempColor = (temp: number) => {
      if (temp > 70) return '#EF4444';
      if (temp > 50) return '#F59E0B';
      if (temp > 35) return '#10B981';
      return '#3B82F6';
    };

    const baseConductivity = interfaceType === 'thermal_paste' ? 1 : interfaceType === 'bare_contact' ? 0.4 : 0.05;
    // Contact pressure increases effective conductivity by up to 50%
    const conductivity = Math.min(1, baseConductivity * (1 + contactPressure * 0.008));
    const effectiveConductivityW = interfaceType === 'thermal_paste' ? 8.5 : interfaceType === 'bare_contact' ? (2.5 * (1 + contactPressure * 0.005)) : (0.026 * (1 + contactPressure * 0.003));
    const barWidth = Math.round(Math.min(460 * conductivity, 460));

    return (
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }}>
        <defs>
          <linearGradient id="htHotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="htColdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="htFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="htGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Anchor rects for width utilization */}
        <rect x="5" y="5" width="6" height="6" fill="#1e293b" opacity="0.3" />
        <rect x="489" y="5" width="6" height="6" fill="#1e293b" opacity="0.3" />

        {/* Grid lines */}
        <line x1="10" y1="60" x2="490" y2="60" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <line x1="10" y1="200" x2="490" y2="200" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <line x1="10" y1="270" x2="490" y2="270" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

        {/* Title */}
        <text x="250" y="32" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">Thermal Contact Experiment  |  Q = kA(T₁-T₂)/d</text>

        {/* Hot Block */}
        <g id="hot-block">
          <rect x="20" y="70" width="140" height="120" fill="url(#htHotGrad)" stroke="#f97316" strokeWidth="2" rx="8" filter="url(#htGlow)" />
          <text x="90" y="125" textAnchor="middle" fill="white" fontSize="24" fontWeight="700">{hotBlockTemp.toFixed(0)}°C</text>
          <text x="90" y="147" textAnchor="middle" fill="white" fontSize="12" opacity="0.9">HOT SOURCE</text>
          <text x="90" y="164" textAnchor="middle" fill="white" fontSize="11" opacity="0.7">k = 400 W/mK</text>
        </g>

        {/* Interface Zone */}
        <g id="interface-zone">
          <rect x="160" y="70" width="80" height="120"
            fill={interfaceType === 'thermal_paste' ? '#9ca3af' : interfaceType === 'bare_contact' ? '#475569' : '#bfdbfe44'}
            stroke={colors.border} strokeWidth="1" rx="4" />
          {interfaceType === 'air_gap' && (
            <>
              <circle cx="200" cy="100" r="9" fill="#60a5fa" opacity="0.5" />
              <circle cx="200" cy="125" r="7" fill="#60a5fa" opacity="0.4" />
              <circle cx="200" cy="148" r="9" fill="#60a5fa" opacity="0.5" />
              <text x="200" y="175" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600">AIR GAPS</text>
            </>
          )}
          {interfaceType === 'bare_contact' && (
            <>
              <rect x="168" y="88" width="15" height="6" fill="#64748b" rx="1" />
              <rect x="168" y="115" width="12" height="6" fill="#64748b" rx="1" />
              <rect x="168" y="142" width="16" height="6" fill="#64748b" rx="1" />
              <text x="200" y="175" textAnchor="middle" fill="#e2e8f0" fontSize="11">CONTACT</text>
            </>
          )}
          {interfaceType === 'thermal_paste' && (
            <text x="200" y="135" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="600">PASTE</text>
          )}
          <text x="200" y="55" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">Interface</text>
        </g>

        {/* Cold Block */}
        <g id="cold-block">
          <rect x="240" y="70" width="140" height="120" fill="url(#htColdGrad)" stroke="#38bdf8" strokeWidth="2" rx="8" />
          <text x="310" y="125" textAnchor="middle" fill="white" fontSize="24" fontWeight="700">{coldBlockTemp.toFixed(0)}°C</text>
          <text x="310" y="147" textAnchor="middle" fill="white" fontSize="12" opacity="0.9">COLD SINK</text>
          <text x="310" y="164" textAnchor="middle" fill="white" fontSize="11" opacity="0.7">k = 400 W/mK</text>
        </g>

        {/* Heat Flow Arrows */}
        {simRunning && hotBlockTemp > coldBlockTemp + 2 && (
          <g filter="url(#htGlow)">
            {[0, 1, 2].map(i => {
              const offset = (animFrame / 3 + i * 20) % 60;
              const xBase = 160 + offset * conductivity;
              return (
                <polygon
                  key={i}
                  points={`${140 + offset * conductivity},${98 + i * 22} ${155 + offset * conductivity},${90 + i * 22} ${155 + offset * conductivity},${94 + i * 22} ${175 + offset * conductivity},${94 + i * 22} ${175 + offset * conductivity},${90 + i * 22} ${190 + offset * conductivity},${98 + i * 22} ${175 + offset * conductivity},${106 + i * 22} ${175 + offset * conductivity},${102 + i * 22} ${155 + offset * conductivity},${102 + i * 22} ${155 + offset * conductivity},${106 + i * 22}`}
                  fill={colors.accent}
                  opacity={conductivity * (1 - (offset * conductivity) / 60)}
                />
              );
            })}
          </g>
        )}

        {/* Conductivity bar - functions as visual indicator for current value */}
        <g id="conductivity-bar">
          <rect x="20" y="215" width="460" height="18" rx="4" fill="#1e293b" stroke="#374151" strokeWidth="1" />
          <rect x="20" y="215" width={barWidth} height="18" rx="4" fill="url(#htFlowGrad)" filter="url(#htGlow)" />
          <text x="250" y="227" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
            k = {effectiveConductivityW.toFixed(2)} W/mK  |  Pressure: {contactPressure}%  |  R = d/(kA)
          </text>
        </g>

        {/* ΔT Display */}
        <g id="delta-t">
          <rect x="155" y="240" width="190" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="250" y="260" textAnchor="middle" fill={colors.textPrimary} fontSize="11">ΔT Temperature Difference</text>
          <text x="250" y="282" textAnchor="middle" fill={getTempColor(hotBlockTemp - coldBlockTemp)} fontSize="18" fontWeight="700">
            {(hotBlockTemp - coldBlockTemp).toFixed(1)}°C
          </text>
        </g>

        {/* Temperature indicator circles */}
        <circle cx="90" cy="190" r="12" fill={`rgba(239,68,68,${0.3 + (hotBlockTemp - 20) / 100})`} stroke="#f97316" strokeWidth="1.5" />
        <circle cx="200" cy="190" r="8" fill={interfaceType === 'thermal_paste' ? '#9ca3af' : interfaceType === 'bare_contact' ? '#64748b' : '#bfdbfe'} stroke="#475569" strokeWidth="1" />
        <circle cx="310" cy="190" r="12" fill={`rgba(59,130,246,${0.3 + (60 - coldBlockTemp) / 100})`} stroke="#38bdf8" strokeWidth="1.5" />

        {/* Conductivity labels on sides */}
        <text x="5" y="215" fill={colors.textPrimary} fontSize="11" dominantBaseline="hanging">Low</text>
        <text x="475" y="215" fill={colors.textPrimary} fontSize="11" dominantBaseline="hanging" textAnchor="start">High</text>

        {/* Heat flow path arc */}
        <path
          d={`M 90 60 Q 250 20 410 60`}
          stroke={`rgba(239,68,68,${0.2 + conductivity * 0.6})`}
          strokeWidth={`${1 + conductivity * 4}`}
          fill="none"
          strokeDasharray={conductivity > 0.5 ? "none" : "6 4"}
        />
      </svg>
    );
  };

  // CPU Cooling Visualization for twist phase
  const CPUCoolingVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 260 : 300;

    const getTempColor = (temp: number) => {
      if (temp > 90) return '#EF4444';
      if (temp > 75) return '#F59E0B';
      if (temp > 60) return '#EAB308';
      return '#10B981';
    };

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="cpuGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="heatsinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          CPU Cooling: {coolerType === 'with_paste' ? 'With Thermal Paste' : 'Without Thermal Paste'}
        </text>

        {/* Motherboard */}
        <rect x="40" y={height - 70} width={width - 80} height="50" fill="#166534" stroke="#22c55e" strokeWidth="1" rx="4" />

        {/* CPU */}
        <rect
          x={width/2 - 50}
          y={height - 120}
          width="100"
          height="50"
          fill={getTempColor(cpuTemp)}
          stroke={cpuTemp > 80 ? colors.error : colors.success}
          strokeWidth="2"
          rx="4"
        />
        <text x={width/2} y={height - 90} textAnchor="middle" fill="white" fontSize="20" fontWeight="700">
          {cpuTemp.toFixed(0)}°C
        </text>

        {/* Thermal Interface */}
        <rect
          x={width/2 - 45}
          y={height - 130}
          width="90"
          height="10"
          fill={coolerType === 'with_paste' ? '#9ca3af' : '#bfdbfe'}
          stroke={coolerType === 'with_paste' ? '#6b7280' : '#60a5fa'}
          strokeWidth="1"
        />
        {coolerType === 'no_paste' && (
          <text x={width/2} y={height - 123} textAnchor="middle" fill="#3B82F6" fontSize="11">AIR</text>
        )}

        {/* Heatsink */}
        <rect x={width/2 - 60} y={height - 200} width="120" height="70" fill="url(#heatsinkGrad)" stroke="#64748b" rx="4" />

        {/* Heatsink fins */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect
            key={i}
            x={width/2 - 55 + i * 20}
            y={height - 240}
            width="15"
            height="40"
            fill="#94a3b8"
            stroke="#64748b"
            strokeWidth="0.5"
            rx="2"
          />
        ))}

        {/* Heat flow particles */}
        {twistSimRunning && (
          <g>
            {[0, 1, 2].map(i => {
              const baseY = height - 120;
              const offset = (animFrame / 2 + i * 30) % 80;
              const opacity = coolerType === 'with_paste' ? 0.8 : 0.25;
              return (
                <circle
                  key={i}
                  cx={width/2 - 20 + i * 20}
                  cy={baseY - offset}
                  r={5}
                  fill={colors.accent}
                  opacity={opacity * (1 - offset / 80)}
                />
              );
            })}
          </g>
        )}

        {/* CPU Load bar */}
        <g>
          <rect x={width/2 - 60} y={height - 260} width="120" height="12" rx="4" fill="#1e293b" stroke="#374151" />
          <rect x={width/2 - 60} y={height - 260} width={Math.round(120 * cpuLoad / 100)} height="12" rx="4" fill={cpuLoad > 75 ? '#ef4444' : cpuLoad > 50 ? '#f59e0b' : '#22c55e'} />
          <text x={width/2} y={height - 265} textAnchor="middle" fill={colors.textPrimary} fontSize="11">CPU Load: {cpuLoad}%</text>
        </g>

        {/* Status text */}
        <text x={width/2} y={height - 30} textAnchor="middle" fill={getTempColor(cpuTemp)} fontSize="12" fontWeight="600">
          {cpuTemp > 90 ? 'THROTTLING!' : cpuTemp > 75 ? 'Running Hot' : cpuTemp > 60 ? 'Moderate' : 'Cool & Efficient'}
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
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots (inline, non-fixed)
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '8px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '8px',
            padding: '4px 0',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom bar with Back/Next buttons
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 200,
      }}>
        <button
          onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: isFirst ? colors.border : colors.textPrimary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.5 : 1,
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Back
        </button>
        {!isLast && (
          <button
            onClick={() => !isTestActive && nextPhase()}
            disabled={isTestActive}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              border: 'none',
              background: isTestActive ? colors.border : `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`,
              color: 'white',
              cursor: isTestActive ? 'not-allowed' : 'pointer',
              opacity: isTestActive ? 0.4 : 1,
              fontWeight: 700,
              minHeight: '44px',
            }}
          >
            Next
          </button>
        )}
      </div>
    );
  };

  // Primary button style
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

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔥❄️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Thermal Contact Resistance
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textPrimary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Press two metal blocks together - one hot, one cold. Heat should flow freely... right? But something invisible is blocking the way.
        </p>

        {/* Hook concept SVG */}
        <svg width="300" height="80" viewBox="0 0 300 80" style={{ marginBottom: '24px', display: 'block' }}>
          <rect x="10" y="20" width="110" height="40" rx="6" fill="#ef4444" stroke="#dc2626" strokeWidth="2" />
          <text x="65" y="45" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">HOT 80°C</text>
          <rect x="100" y="28" width="100" height="24" rx="3" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
          <text x="150" y="43" textAnchor="middle" fill="#94a3b8" fontSize="11">Air Gaps?</text>
          <rect x="180" y="20" width="110" height="40" rx="6" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" />
          <text x="235" y="45" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">COLD 20°C</text>
        </svg>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textPrimary, fontStyle: 'italic' }}>
            Even polished metal surfaces only touch at 1-2% of their area. The rest? Microscopic air gaps that block heat flow like an invisible wall.
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
            — Thermal Engineering Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Hidden Barrier
        </button>

        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // Static SVG for predict phase
  const PredictVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="hotGradPredict" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="coldGradPredict" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Metal Surfaces in Contact
        </text>

        {/* Hot Block */}
        <g transform="translate(40, 50)">
          <rect width="100" height="100" fill="url(#hotGradPredict)" stroke="#f97316" strokeWidth="2" rx="8" />
          <text x="50" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">HOT</text>
          <text x="50" y="75" textAnchor="middle" fill="white" fontSize="12" opacity="0.8">80°C</text>
        </g>

        {/* Interface Zone with question marks */}
        <g transform={`translate(140, 50)`}>
          <rect
            width="60"
            height="100"
            fill={`${colors.warning}33`}
            stroke={colors.warning}
            strokeWidth="2"
            strokeDasharray="4"
            rx="4"
          />
          <text x="30" y="45" textAnchor="middle" fill={colors.warning} fontSize="28" fontWeight="700">?</text>
          <text x="30" y="70" textAnchor="middle" fill={colors.warning} fontSize="10">What fills</text>
          <text x="30" y="82" textAnchor="middle" fill={colors.warning} fontSize="10">the gaps?</text>
        </g>

        {/* Cold Block */}
        <g transform={`translate(200, 50)`}>
          <rect width="100" height="100" fill="url(#coldGradPredict)" stroke="#38bdf8" strokeWidth="2" rx="8" />
          <text x="50" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">COLD</text>
          <text x="50" y="75" textAnchor="middle" fill="white" fontSize="12" opacity="0.8">20°C</text>
        </g>

        {/* Microscope hint */}
        <text x={width/2} y={height - 20} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Even polished surfaces have microscopic roughness
        </text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing - the surfaces are in perfect contact' },
      { id: 'b', text: 'Air - trapped in microscopic gaps between surface peaks', correct: true },
      { id: 'c', text: 'Vacuum - the surfaces push air out completely' },
    ];

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
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
            Two polished metal blocks are pressed firmly together. What fills the microscopic gaps between their surfaces?
          </h2>

          {/* Static SVG Diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <PredictVisualization />
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
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Heat Transfer Simulator
  if (phase === 'play') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Thermal Contact Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
            Compare heat transfer through different interface types.
          </p>

          {/* Observation Guidance */}
          <div style={{
            background: `${colors.accentBlue}22`,
            border: `1px solid ${colors.accentBlue}44`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.accentBlue, margin: 0 }}>
              👁️ Observe: Watch the heat flow arrows and temperature changes. Try each interface type and compare how fast the temperatures equalize.
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <HeatTransferVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {/* Interface type selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px' }}>
                Interface Type
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { id: 'air_gap' as const, name: 'Air Gap', k: '0.026 W/mK' },
                  { id: 'bare_contact' as const, name: 'Bare Contact', k: '2.5 W/mK' },
                  { id: 'thermal_paste' as const, name: 'Thermal Paste', k: '8.5 W/mK' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      playSound('click');
                      setInterfaceType(opt.id);
                      setSimRunning(false);
                      setHotBlockTemp(80);
                      setColdBlockTemp(20);
                      setSimTime(0);
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${interfaceType === opt.id ? colors.accent : colors.border}`,
                      background: interfaceType === opt.id ? `${colors.accent}22` : colors.bgSecondary,
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '44px',
                    }}
                  >
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{opt.name}</div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontSize: '11px' }}>{opt.k}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Pressure Slider */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...typo.small, color: colors.textPrimary, marginBottom: '6px' }}>
                Contact Pressure: {contactPressure}% — Higher pressure reduces air gap resistance
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={contactPressure}
                onChange={e => { setContactPressure(Number(e.target.value)); playSound('click'); }}
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ ...typo.small, color: colors.textSecondary, fontSize: '11px' }}>Low</span>
                <span style={{ ...typo.small, color: colors.textSecondary, fontSize: '11px' }}>High</span>
              </div>
            </div>

            {/* Simulate button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setHotBlockTemp(80);
                  setColdBlockTemp(20);
                  setSimTime(0);
                  setSimRunning(true);
                  playSound('click');
                }}
                disabled={simRunning}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: simRunning ? colors.border : colors.accentBlue,
                  color: 'white',
                  fontWeight: 600,
                  cursor: simRunning ? 'not-allowed' : 'pointer',
                  minHeight: '44px',
                }}
              >
                {simRunning ? 'Simulating...' : 'Start Heat Transfer'}
              </button>
              <button
                onClick={() => {
                  setSimRunning(false);
                  setHotBlockTemp(80);
                  setColdBlockTemp(20);
                  setSimTime(0);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Reset
              </button>
            </div>
              </div>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{hotBlockTemp.toFixed(1)}°C</div>
                <div style={{ ...typo.small, color: colors.textPrimary }}>Hot Block</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{(simTime / 10).toFixed(1)}s</div>
                <div style={{ ...typo.small, color: colors.textPrimary }}>Time Elapsed</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accentBlue }}>{coldBlockTemp.toFixed(1)}°C</div>
                <div style={{ ...typo.small, color: colors.textPrimary }}>Cold Block</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {interfaceType === 'air_gap' && simTime > 20 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how slowly heat transfers through air gaps! The low conductivity creates a thermal barrier.
              </p>
            </div>
          )}

          {/* Educational: cause-effect, key terms, real-world relevance */}
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Cause & Effect:</h4>
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
              Increasing the interface conductivity (k) causes faster heat equalization — because thermal resistance R = d/(kA). Higher k means lower R and faster heat flow Q = ΔT/R.
            </p>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Key Physics Terms:</h4>
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
              <strong>Thermal Conductivity (k)</strong>: material ability to conduct heat. <strong>Thermal Contact Resistance (R)</strong>: impedance at interface. <strong>Fourier's Law</strong>: Q = kA(ΔT)/d.
            </p>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>Why It Matters:</h4>
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
              Modern CPUs generate 100-250W of heat in a chip smaller than your thumbnail. Without thermal paste, the air gaps between chip and cooler would cause temperatures to exceed 150°C within seconds, permanently destroying the processor.
            </p>
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
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Thermal Contact
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textPrimary }}>
              <p style={{ marginBottom: '16px' }}>
                As you observed in the experiment, the interface material dramatically affects heat transfer speed. This follows Fourier's Law: <strong style={{ color: colors.textPrimary }}>Q = kA(T₁-T₂)/d</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Heat flow (Q) depends on thermal conductivity (k), contact area (A), temperature difference (T₁-T₂), and thickness (d).
              </p>
              <p>
                <strong style={{ color: colors.accent }}>The Problem:</strong> Air (k = 0.026 W/mK) is ~15,000 times worse than copper (k = 400 W/mK) at conducting heat!
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: Surface Roughness
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '8px' }}>
              Even "smooth" metal surfaces are rough at the microscopic level:
            </p>
            <ul style={{ ...typo.body, color: colors.textPrimary, margin: 0, paddingLeft: '20px' }}>
              <li>Only 1-2% of surfaces actually touch (peak contact)</li>
              <li>98-99% is filled with air (thermal barrier)</li>
              <li><strong>Thermal paste fills these gaps</strong>, dramatically improving heat transfer</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              The Solution: Thermal Interface Materials
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              Thermal paste, pads, and gap fillers displace air from microscopic voids. With conductivity 300x better than air, they create efficient heat paths where none existed before.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real CPU Cooling
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'No difference - the cooler does all the work regardless of interface' },
      { id: 'b', text: 'With paste: 20-30°C cooler due to eliminated air gap resistance', correct: true },
      { id: 'c', text: 'Without paste is actually better - paste adds a layer that blocks heat' },
    ];

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Scenario: Real CPU Cooling
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A 150W CPU with a 250W-rated cooler. How much temperature difference does thermal paste make?
          </h2>

          {/* Static SVG comparing CPU with/without paste */}
          <svg width="100%" height="160" viewBox="0 0 500 160" style={{ marginBottom: '24px', display: 'block' }}>
            <defs>
              <filter id="cpuGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="hotCpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="coolCpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Anchor rects */}
            <rect x="10" y="8" width="4" height="4" fill="#475569" opacity="0.5" />
            <rect x="486" y="8" width="4" height="4" fill="#475569" opacity="0.5" />
            {/* No paste block */}
            <g id="no-paste-block">
              <rect x="30" y="30" width="180" height="90" rx="8" fill="url(#hotCpuGrad)" filter="url(#cpuGlow)" />
              <text x="120" y="65" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">Without Paste</text>
              <text x="120" y="85" textAnchor="middle" fill="white" fontSize="18" fontWeight="800">~95°C</text>
              <text x="120" y="105" textAnchor="middle" fill="white" fontSize="11">THROTTLING</text>
            </g>
            {/* VS label */}
            <g id="vs-label">
              <text x="250" y="82" textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="800">vs</text>
              <line x1="250" y1="30" x2="250" y2="120" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            </g>
            {/* With paste block */}
            <g id="with-paste-block">
              <rect x="290" y="30" width="180" height="90" rx="8" fill="url(#coolCpuGrad)" filter="url(#cpuGlow)" />
              <text x="380" y="65" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">With Paste</text>
              <text x="380" y="85" textAnchor="middle" fill="white" fontSize="18" fontWeight="800">~65°C</text>
              <text x="380" y="105" textAnchor="middle" fill="white" fontSize="11">Full Speed</text>
            </g>
            {/* Bottom grid line */}
            <line x1="30" y1="130" x2="470" y2="130" stroke="#2a2a3a" strokeDasharray="4 4" opacity="0.3" />
          </svg>

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
              Test With CPU Simulation
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            CPU Cooling Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
            Watch the dramatic difference thermal paste makes.
          </p>

          {/* Observation Guidance */}
          <div style={{
            background: `${colors.accentBlue}22`,
            border: `1px solid ${colors.accentBlue}44`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.accentBlue, margin: 0 }}>
              👁️ Observe: Toggle between paste/no-paste and apply CPU load. Notice how the temperature stabilizes at very different levels.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <CPUCoolingVisualization />
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

            {/* Thermal paste toggle */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px' }}>
                Thermal Interface
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <button
                  onClick={() => {
                    playSound('click');
                    setCoolerType('no_paste');
                    setCpuTemp(35);
                    setTwistSimRunning(false);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: `2px solid ${coolerType === 'no_paste' ? colors.error : colors.border}`,
                    background: coolerType === 'no_paste' ? `${colors.error}22` : colors.bgSecondary,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>No Paste</div>
                  <div style={{ ...typo.small, color: colors.textPrimary }}>Air gaps blocking heat</div>
                </button>
                <button
                  onClick={() => {
                    playSound('click');
                    setCoolerType('with_paste');
                    setCpuTemp(35);
                    setTwistSimRunning(false);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: `2px solid ${coolerType === 'with_paste' ? colors.success : colors.border}`,
                    background: coolerType === 'with_paste' ? `${colors.success}22` : colors.bgSecondary,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>With Paste</div>
                  <div style={{ ...typo.small, color: colors.textPrimary }}>Gaps filled, heat flows</div>
                </button>
              </div>
            </div>

            {/* CPU Load slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textPrimary }}>CPU Load</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{cpuLoad}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={cpuLoad}
                onChange={(e) => setCpuLoad(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                }}
              />
            </div>

            {/* Simulate button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => {
                  setCpuTemp(35);
                  setTwistSimRunning(true);
                  playSound('click');
                }}
                disabled={twistSimRunning}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: twistSimRunning ? colors.border : colors.accentBlue,
                  color: 'white',
                  fontWeight: 600,
                  cursor: twistSimRunning ? 'not-allowed' : 'pointer',
                }}
              >
                {twistSimRunning ? 'Running...' : 'Apply CPU Load'}
              </button>
              <button
                onClick={() => {
                  setTwistSimRunning(false);
                  setCpuTemp(35);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
              </div>
            </div>
          </div>

          {/* Comparison stats */}
          {twistSimRunning && cpuTemp > 60 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: `${colors.error}22`,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                border: `1px solid ${colors.error}44`,
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>~95°C</div>
                <div style={{ ...typo.small, color: colors.textPrimary }}>Without Paste</div>
                <div style={{ ...typo.small, color: colors.error }}>THROTTLING!</div>
              </div>
              <div style={{
                background: `${colors.success}22`,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                border: `1px solid ${colors.success}44`,
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>~65°C</div>
                <div style={{ ...typo.small, color: colors.textPrimary }}>With Paste</div>
                <div style={{ ...typo.small, color: colors.success }}>Full Speed</div>
              </div>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Results
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Mastering Thermal Interfaces
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧴</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Thermal Paste</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                Best for CPU/GPU cooling. Fills microscopic gaps with conductive compound. Apply a small amount - excess acts as an insulator. Replace every 3-5 years as it dries out.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Thermal Pads</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                Compressible pads for bridging larger gaps (0.5-5mm). Used for VRMs, M.2 drives, and EV batteries. Easier to apply at scale but lower conductivity than paste.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💧</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Liquid Metal</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                Gallium-based alloys with 70+ W/mK conductivity - 10x better than paste. Used in high-end laptops. Caution: electrically conductive and can damage aluminum.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Key Takeaways</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                The interface between heat source and cooler is often the thermal bottleneck. Proper TIM selection and application can mean the difference between a throttling system and one running at full performance.
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
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Thermal Contact"
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} explored)
          </p>

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
                  minHeight: '44px',
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
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Thermal Contact Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {(app as unknown as Record<string, string>).howItWorks && (
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '8px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>How It Works:</h4>
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>{(app as unknown as Record<string, string>).howItWorks}</p>
              </div>
            )}
            {(app as unknown as Record<string, string>).futureImpact && (
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Future Impact:</h4>
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>{(app as unknown as Record<string, string>).futureImpact}</p>
              </div>
            )}

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
                  <div style={{ ...typo.small, color: colors.textPrimary }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Got It / Next Application button */}
          {!allAppsCompleted ? (
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Move to next uncompleted app
                const nextIndex = completedApps.findIndex((c, i) => i > selectedApp && !c);
                if (nextIndex !== -1) {
                  setSelectedApp(nextIndex);
                } else {
                  const firstUncompleted = completedApps.findIndex(c => !c);
                  if (firstUncompleted !== -1) {
                    setSelectedApp(firstUncompleted);
                  }
                }
              }}
              style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
            >
              {selectedApp < realWorldApps.length - 1 ? 'Got It - Next Application' : 'Got It'}
            </button>
          ) : (
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
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>
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
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '32px' }}>
              {passed
                ? 'You understand thermal contact resistance and interface materials!'
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
          {renderNavDots()}
          </div>
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textPrimary }}>
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
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
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
                  color: colors.textPrimary,
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
        {renderNavDots()}
        </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Thermal Contact Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textPrimary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the invisible barrier that blocks heat transfer and how engineers overcome it.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
          margin: '0 auto 32px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Surface roughness creates microscopic air gaps',
              'Air is 15,000x worse than copper at conducting heat',
              'Thermal paste fills gaps and enables heat flow',
              'Proper TIM application prevents throttling',
              'Different applications need different interface materials',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textPrimary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textPrimary,
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
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default ThermalContactRenderer;
