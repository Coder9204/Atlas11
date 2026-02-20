'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Liquid Cooling Heat Transfer - Complete 10-Phase Game
// Why water is 25x better at cooling than air
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

interface LiquidCoolingRendererProps {
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
    scenario: "A data center engineer needs to cool a 500W GPU. Using air cooling with a flow rate of 100 CFM, the chip runs at 85C. They're considering switching to liquid cooling.",
    question: "Why would water-based cooling dramatically reduce the chip temperature?",
    options: [
      { id: 'a', label: "Water is colder than air at room temperature" },
      { id: 'b', label: "Water has ~4x higher specific heat capacity, absorbing more energy per unit mass per degree", correct: true },
      { id: 'c', label: "Water flows faster than air through cooling channels" },
      { id: 'd', label: "Water is denser, creating more pressure on the chip" }
    ],
    explanation: "Water's specific heat capacity (4.18 J/g*K) is about 4x higher than air (1.0 J/g*K). This means water can absorb 4x more thermal energy per gram for each degree of temperature rise. Combined with water's higher density and thermal conductivity, liquid cooling is roughly 25x more effective than air."
  },
  {
    scenario: "An engineer is designing a cold plate for CPU cooling. Water enters at 25C and must remove 300W of heat. The flow rate is 1 L/min (about 16.7 g/s).",
    question: "What will be the approximate outlet water temperature?",
    options: [
      { id: 'a', label: "About 26C (1C rise)" },
      { id: 'b', label: "About 29C (4C rise)", correct: true },
      { id: 'c', label: "About 45C (20C rise)" },
      { id: 'd', label: "About 75C (50C rise)" }
    ],
    explanation: "Using Q = m_dot * Cp * deltaT: 300W = 16.7 g/s * 4.18 J/(g*K) * deltaT. Solving: deltaT = 300 / (16.7 * 4.18) = 4.3C. So outlet temperature is approximately 25 + 4 = 29C. Water's high specific heat keeps the temperature rise small."
  },
  {
    scenario: "A gaming PC builder is choosing between a 240mm and 360mm radiator for their custom loop. Both use the same fans and coolant.",
    question: "Why does the larger radiator provide better cooling?",
    options: [
      { id: 'a', label: "It holds more coolant, which stays cooler longer" },
      { id: 'b', label: "Larger surface area increases heat transfer to air (Q = h*A*deltaT)", correct: true },
      { id: 'c', label: "Bigger radiators create more water pressure" },
      { id: 'd', label: "The coolant moves faster through larger radiators" }
    ],
    explanation: "Heat transfer from the radiator to air is governed by Q = h*A*deltaT, where A is surface area. A 360mm radiator has 50% more surface area than a 240mm, allowing more heat to be rejected to the air for the same temperature difference."
  },
  {
    scenario: "In a direct-to-chip liquid cooling system, an engineer notices that increasing the flow rate from 0.5 to 2 L/min dramatically improved cooling, but going from 2 to 4 L/min showed diminishing returns.",
    question: "What explains this diminishing return at higher flow rates?",
    options: [
      { id: 'a', label: "The pump can't maintain pressure at higher flows" },
      { id: 'b', label: "At high flow, thermal resistance at the chip-water interface becomes the limiting factor", correct: true },
      { id: 'c', label: "Water specific heat decreases at higher velocities" },
      { id: 'd', label: "Turbulence reduces heat transfer at high flow rates" }
    ],
    explanation: "Heat must transfer from chip to cold plate to water. At low flows, the water's capacity to carry heat limits performance. At high flows, the thermal interface (chip-to-cold plate conduction and cold plate-to-water convection) becomes the bottleneck. The total thermal resistance has multiple components in series."
  },
  {
    scenario: "A data center is comparing two cooling approaches: traditional air cooling using CRACs vs. rear-door heat exchangers with chilled water. Both maintain the same inlet air temperature.",
    question: "What is a key advantage of the rear-door heat exchanger approach?",
    options: [
      { id: 'a', label: "It eliminates the need for any air movement" },
      { id: 'b', label: "Heat is captured at the source before entering the room, reducing CRAC load", correct: true },
      { id: 'c', label: "Water cooling is always cheaper than air cooling" },
      { id: 'd', label: "It requires no chilled water infrastructure" }
    ],
    explanation: "Rear-door heat exchangers intercept hot exhaust air right at the rack, transferring heat to chilled water before it enters the room. This dramatically reduces the load on room-level cooling (CRACs), can eliminate hot aisles, and improves overall efficiency by capturing heat at a higher temperature differential."
  },
  {
    scenario: "An immersion cooling tank uses 3M Novec fluid instead of water. The servers are completely submerged. An operator notices small bubbles forming on the hottest chips.",
    question: "What phenomenon is occurring and why is it beneficial?",
    options: [
      { id: 'a', label: "Dissolved gas is escaping, which is harmful and should be avoided" },
      { id: 'b', label: "Two-phase boiling absorbs massive heat via latent heat of vaporization", correct: true },
      { id: 'c', label: "Chemical decomposition is occurring due to overheating" },
      { id: 'd', label: "Cavitation is damaging the chip surface" }
    ],
    explanation: "Two-phase immersion cooling uses fluids with low boiling points (34-61C). When chips get hot, the fluid boils at the surface. The latent heat of vaporization absorbs enormous energy without temperature increase. For example, water's latent heat (2260 J/g) is 540x its sensible heat for 1C rise."
  },
  {
    scenario: "Tesla's battery thermal management system circulates coolant through channels between battery cells. During DC fast charging at 250kW, the system works overtime to keep cells between 25-35C.",
    question: "Why is precise temperature control so critical for EV batteries?",
    options: [
      { id: 'a', label: "Hot batteries produce more power, but they must be limited for comfort" },
      { id: 'b', label: "Lithium-ion cells degrade faster outside optimal temperature range and can become unsafe", correct: true },
      { id: 'c', label: "The coolant itself is damaged by temperatures above 35C" },
      { id: 'd', label: "Vehicle regulations mandate exact temperature ranges" }
    ],
    explanation: "Lithium-ion batteries have an optimal operating window (typically 20-40C). Below this, internal resistance increases, reducing performance. Above this, degradation accelerates exponentially (Arrhenius behavior), reducing battery lifespan. At extreme temperatures, thermal runaway can occur, making cooling safety-critical."
  },
  {
    scenario: "A supercomputer design team is comparing direct-to-chip water cooling vs. full immersion cooling. Both can handle the same heat load.",
    question: "What is a key advantage of direct-to-chip over immersion cooling?",
    options: [
      { id: 'a', label: "Direct-to-chip provides better thermal performance" },
      { id: 'b', label: "Direct-to-chip allows easy maintenance access and component replacement", correct: true },
      { id: 'c', label: "Direct-to-chip uses less coolant overall" },
      { id: 'd', label: "Direct-to-chip eliminates all water leakage risk" }
    ],
    explanation: "While immersion cooling can handle very high heat densities, it requires draining tanks and cleaning components for any maintenance. Direct-to-chip systems allow technicians to access, diagnose, and replace components without draining fluid, significantly improving serviceability in production environments."
  },
  {
    scenario: "An engineer is optimizing a liquid cooling loop and wants to reduce the temperature difference between coolant inlet and outlet while maintaining the same heat removal.",
    question: "According to Q = m_dot * Cp * deltaT, what should they increase?",
    options: [
      { id: 'a', label: "The radiator size" },
      { id: 'b', label: "The coolant flow rate (m_dot)", correct: true },
      { id: 'c', label: "The coolant inlet temperature" },
      { id: 'd', label: "The number of cooling loops" }
    ],
    explanation: "From Q = m_dot * Cp * deltaT, for constant Q and Cp: deltaT = Q / (m_dot * Cp). Increasing flow rate (m_dot) directly reduces deltaT. This keeps the outlet temperature closer to inlet, improving thermal uniformity across the system."
  },
  {
    scenario: "A new data center is designed with liquid cooling infrastructure that can deliver chilled water at 18C to server racks. Compared to air cooling that requires 15C supply air, this allows higher supply temperatures.",
    question: "Why can liquid cooling operate with warmer supply temperatures?",
    options: [
      { id: 'a', label: "Liquids naturally cool down faster than gases" },
      { id: 'b', label: "Higher heat transfer coefficient of liquids maintains adequate chip-to-coolant temperature gradient", correct: true },
      { id: 'c', label: "Water has a higher boiling point than air" },
      { id: 'd', label: "Liquid systems use more energy-efficient chillers" }
    ],
    explanation: "The heat transfer coefficient (h) for liquid convection is typically 100-1000x higher than for air. Since Q = h*A*deltaT, high h allows the same heat transfer with smaller deltaT. This means liquid cooling can use warmer supply temperatures while still maintaining acceptable chip temperatures, enabling free cooling and chiller efficiency gains."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💻',
    title: 'Data Center Cooling',
    short: 'Keeping AI servers running cool',
    tagline: 'The liquid revolution in computing',
    description: 'Modern data centers increasingly use liquid cooling to handle intense heat from AI and HPC workloads. Direct-to-chip cooling can remove 10x more heat than air, enabling denser server deployments.',
    connection: "Water's high specific heat (4.18 kJ/kg*K) allows it to carry away much more heat per unit mass than air. The heat transfer equation Q = m_dot*Cp*deltaT shows why liquid cooling enables higher power densities.",
    howItWorks: 'Cold plates attach directly to CPUs and GPUs. Chilled water flows through microchannels, absorbing heat. The warm water circulates to cooling towers or heat exchangers. Some systems use immersion where servers are fully submerged.',
    stats: [
      { value: '1000W/chip', label: 'Cooling capacity', icon: '⚡' },
      { value: '40%', label: 'Energy savings', icon: '📈' },
      { value: '$25B', label: 'DC cooling market', icon: '💰' }
    ],
    examples: ['Microsoft Azure liquid cooling', 'Google TPU cooling', 'NVIDIA DGX systems', 'Meta AI clusters'],
    companies: ['Asetek', 'CoolIT', 'GRC', 'LiquidCool Solutions'],
    futureImpact: 'Two-phase immersion cooling using engineered fluids will enable chip power densities exceeding 2000W while recovering waste heat for building heating.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'EV Battery Thermal Management',
    short: 'Keeping batteries in the optimal zone',
    tagline: 'Temperature equals range and lifespan',
    description: 'Electric vehicle batteries perform best between 20-40C. Liquid cooling systems circulate glycol through cooling plates between cells, managing heat during fast charging and high-power driving.',
    connection: 'The convective heat transfer equation governs battery cooling. Flow rate, coolant properties, and temperature differential determine how quickly heat can be removed - critical during 250kW DC fast charging.',
    howItWorks: 'Cooling plates with serpentine channels sandwich battery modules. A pump circulates coolant to a heat exchanger or chiller. Intelligent controls balance cooling power against pump energy. Cold weather operation reverses flow through a heater.',
    stats: [
      { value: '250kW', label: 'Charging power', icon: '⚡' },
      { value: '30%', label: 'Range improvement', icon: '📈' },
      { value: '$50B', label: 'EV thermal market', icon: '💰' }
    ],
    examples: ['Tesla battery packs', 'Rivian thermal system', 'Porsche Taycan 800V', 'Lucid Air cooling'],
    companies: ['Tesla', 'Rivian', 'Hanon Systems', 'Valeo'],
    futureImpact: 'Immersive cell cooling and advanced thermal interface materials will enable safe 500kW charging, achieving 80% charge in under 10 minutes.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Superconductor Cooling',
    short: 'Reaching near absolute zero',
    tagline: 'Where electrical resistance vanishes',
    description: 'Superconducting systems like MRI machines and particle accelerators require cooling to cryogenic temperatures. Liquid helium at 4.2K or liquid nitrogen at 77K provide the extreme cooling needed.',
    connection: 'Cryogenic cooling applies the same heat transfer principles at extreme temperatures. Latent heat of vaporization provides enormous cooling capacity. Maintaining temperature stability requires careful thermal management of multiple heat leak sources.',
    howItWorks: 'Superconducting magnets sit in liquid helium baths. Cryocoolers recondense boiled helium. Multi-layer insulation minimizes heat leak from room temperature. Some systems use closed-loop circulation of subcooled helium.',
    stats: [
      { value: '4.2K', label: 'LHe temperature', icon: '❄️' },
      { value: '1500L', label: 'MRI helium', icon: '🧊' },
      { value: '$10B', label: 'Cryogenics market', icon: '💰' }
    ],
    examples: ['MRI scanners', 'LHC superconducting magnets', 'Fusion reactor magnets', 'Quantum computers'],
    companies: ['Linde', 'Air Liquide', 'Bruker', 'Oxford Instruments'],
    futureImpact: 'High-temperature superconductors operating at 77K (liquid nitrogen) will dramatically reduce cooling requirements, making fusion power and maglev transport more practical.',
    color: '#8B5CF6'
  },
  {
    icon: '🎮',
    title: 'Gaming PC Cooling',
    short: 'Maximum performance for enthusiasts',
    tagline: 'Custom loops for extreme builds',
    description: 'High-end gaming PCs use custom liquid cooling loops to handle 500+ watts from overclocked CPUs and GPUs. Larger radiators, higher flow rates, and premium thermal paste enable peak performance.',
    connection: 'Custom loops demonstrate heat transfer fundamentals clearly. Radiator surface area, fan airflow, coolant flow rate, and temperature differential all appear in the cooling performance equation.',
    howItWorks: 'A pump circulates coolant through water blocks on CPU and GPU. Heat transfers through copper bases into the coolant. Radiators with large surface area and fans reject heat to room air. Reservoirs aid in filling and monitoring.',
    stats: [
      { value: '600W+', label: 'Heat dissipation', icon: '🔥' },
      { value: '20C', label: 'Temp reduction', icon: '📉' },
      { value: '$6B', label: 'PC cooling market', icon: '💰' }
    ],
    examples: ['Custom hardline builds', 'AIO liquid coolers', 'EKWB loop kits', 'Overclocker competition rigs'],
    companies: ['EKWB', 'Corsair', 'NZXT', 'Alphacool'],
    futureImpact: 'Factory-sealed modular systems will bring custom loop performance to mainstream PCs without the complexity of building and maintaining open loops.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const LiquidCoolingRenderer: React.FC<LiquidCoolingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [coolantType, setCoolantType] = useState<'air' | 'water' | 'oil'>('water');
  const [flowRate, setFlowRate] = useState(5); // L/min
  const [heatLoad, setHeatLoad] = useState(500); // Watts
  const [inletTemp, setInletTemp] = useState(25); // Celsius
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - two-phase cooling
  const [useTwoPhase, setUseTwoPhase] = useState(false);
  const [twistHeatLoad, setTwistHeatLoad] = useState(500);

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
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Coolant properties
  const coolantProps: Record<string, { cp: number; k: number; density: number; name: string; color: string }> = {
    air: { cp: 1.005, k: 0.026, density: 1.2, name: 'Air', color: '#e2e8f0' },
    water: { cp: 4.186, k: 0.60, density: 1000, name: 'Water', color: '#3b82f6' },
    oil: { cp: 2.0, k: 0.15, density: 900, name: 'Mineral Oil', color: '#eab308' },
  };

  // Calculate heat transfer metrics
  const calcCoolingMetrics = useCallback(() => {
    const props = coolantProps[coolantType];
    // Convert L/min to kg/s
    const volumeFlowRate = flowRate / 60000; // m^3/s
    const massFlowRate = volumeFlowRate * props.density; // kg/s

    // Q = m_dot * Cp * deltaT -> deltaT = Q / (m_dot * Cp)
    const deltaT = heatLoad / (massFlowRate * props.cp * 1000);
    const outletTemp = inletTemp + deltaT;

    // Relative cooling effectiveness (normalized to water at 5 L/min)
    const waterBaseline = (5 / 60000) * 1000 * 4.186 * 1000;
    const currentCapacity = massFlowRate * props.cp * 1000;
    const relativeCapacity = (currentCapacity / waterBaseline) * 100;

    return {
      deltaT: Math.min(deltaT, 200),
      outletTemp: Math.min(outletTemp, 225),
      relativeCapacity: Math.min(relativeCapacity, 300),
      coolantName: props.name,
      coolantColor: props.color,
      specificHeat: props.cp,
      massFlowRate: massFlowRate * 1000 // g/s
    };
  }, [coolantType, flowRate, heatLoad, inletTemp]);

  const metrics = calcCoolingMetrics();

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6', // Blue for liquid/water
    accentGlow: 'rgba(59, 130, 246, 0.3)',
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
    twist_play: 'Explore Two-Phase',
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
        gameType: 'liquid-cooling',
        gameTitle: 'Liquid Cooling Heat Transfer',
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

  const getTempColor = (temp: number) => {
    if (temp < 40) return colors.success;
    if (temp < 60) return colors.warning;
    if (temp < 80) return '#f97316';
    return colors.error;
  };

  // Liquid Cooling Visualization SVG Component
  const LiquidCoolingVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 320 : 380;
    const props = coolantProps[coolantType];

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="heatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background layer */}
        <g id="background-layer">
          <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
            Liquid Cooling Heat Transfer
          </text>
          {/* Grid lines */}
          <line x1="30" y1="95" x2={width - 20} y2="95" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="30" y1="170" x2={width - 20} y2="170" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="30" y1="245" x2={width - 20} y2="245" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="30" y1="320" x2={width - 20} y2="320" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,4" />
          {/* Axis labels */}
          <text x="14" y={height/2} textAnchor="middle" fill="#9CA3AF" fontSize="11" transform={`rotate(-90,14,${height/2})`}>Temp (C)</text>
          <text x={width/2} y={height - 2} textAnchor="middle" fill="#9CA3AF" fontSize="11">Flow Rate (L/min)</text>
        </g>

        {/* Pipes layer */}
        <g id="pipes-layer">
          {/* Inlet pipe */}
          <line x1="30" y1="95" x2={width/2 - 78} y2="95" stroke={props.color} strokeWidth="14" strokeLinecap="round" />
          <text x="55" y="82" textAnchor="middle" fontSize="12" fill={props.color} fontWeight="700">IN</text>
          <text x="55" y="115" textAnchor="middle" fontSize="11" fill={props.color}>{inletTemp}°C</text>
          {/* Flow particles */}
          {[...Array(4)].map((_, i) => {
            const x = 40 + ((animationFrame * (flowRate / 3) + i * 30) % (width/2 - 118));
            return <circle key={`in-${i}`} cx={x} cy={95} r={4} fill="white" opacity={0.7} />;
          })}

          {/* Outlet pipe */}
          <line x1={width/2 + 82} y1="95" x2={width - 20} y2="95" stroke={getTempColor(metrics.outletTemp)} strokeWidth="14" strokeLinecap="round" filter="url(#glowFilter)" />
          <text x={width - 48} y="82" textAnchor="middle" fontSize="12" fill={getTempColor(metrics.outletTemp)} fontWeight="700">OUT</text>
          <text x={width - 48} y="115" textAnchor="middle" fontSize="11" fill={getTempColor(metrics.outletTemp)}>{metrics.outletTemp.toFixed(1)}°C</text>
          {/* Flow particles */}
          {[...Array(4)].map((_, i) => {
            const x = width/2 + 92 + ((animationFrame * (flowRate / 3) + i * 30) % (width/2 - 118));
            return <circle key={`out-${i}`} cx={x} cy={95} r={4} fill="white" opacity={0.7} />;
          })}
        </g>

        {/* Heat source layer */}
        <g id="heatsource-layer">
          {(() => {
            const hsX = width/2 - 68;
            const hsY = 30;
            return (
              <>
                {/* Cold plate */}
                <rect x={hsX - 8} y={hsY} width="156" height="20" fill="#374151" stroke="#4b5563" strokeWidth="2" rx="3" />
                <text x={hsX + 70} y={hsY + 14} textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="600">Cold Plate</text>
                {/* Heat source */}
                <rect x={hsX} y={hsY + 22} width="136" height="70" fill="url(#heatGrad)" stroke="#ef4444" strokeWidth="2" rx="5" />
                <text x={hsX + 68} y={hsY + 47} textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Heat Source</text>
                <text x={hsX + 68} y={hsY + 67} textAnchor="middle" fontSize="16" fill="white" fontWeight="bold">{heatLoad}W</text>
                <text x={hsX + 68} y={hsY + 84} textAnchor="middle" fontSize="11" fill="#fca5a5">T={Math.min(metrics.outletTemp + 15, 150).toFixed(0)}°C</text>
              </>
            );
          })()}
        </g>

        {/* Formula layer */}
        <g id="formula-layer">
          {(() => {
            const fbX = width/2 - 100;
            const fbY = 135;
            return (
              <>
                <rect x={fbX} y={fbY} width="200" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5" />
                <text x={fbX + 100} y={fbY + 18} textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="700">Q = ṁ × Cp × ΔT</text>
                <text x={fbX + 100} y={fbY + 36} textAnchor="middle" fill="#C4B5FD" fontSize="11">
                  {heatLoad}W = {metrics.massFlowRate.toFixed(1)}g/s × {metrics.specificHeat.toFixed(2)} × {metrics.deltaT.toFixed(1)}°C
                </text>
              </>
            );
          })()}
        </g>

        {/* Metrics layer */}
        <g id="metrics-layer">
          {(() => {
            const mpX = 20;
            const mpY = 200;
            const colW = (width - 40) / 3;
            return (
              <>
                <rect x={mpX} y={mpY} width={width - 40} height="78" rx="8" fill={colors.bgSecondary} />
                {/* Col 1: Coolant */}
                <text x={mpX + 16} y={mpY + 17} fill="#D1D5DB" fontSize="11">Coolant Type</text>
                <text x={mpX + 16} y={mpY + 37} fill={props.color} fontSize="16" fontWeight="700">{props.name}</text>
                <text x={mpX + 16} y={mpY + 56} fill="#C4B5FD" fontSize="11">Cp={props.cp.toFixed(2)} J/g·K</text>
                {/* Col 2: Temp Rise */}
                <text x={mpX + colW + 8} y={mpY + 17} fill="#D1D5DB" fontSize="11">Temp Rise</text>
                <text x={mpX + colW + 8} y={mpY + 37} fill={getTempColor(metrics.outletTemp)} fontSize="16" fontWeight="700">{metrics.deltaT.toFixed(1)}°C</text>
                <text x={mpX + colW + 8} y={mpY + 56} fill="#C4B5FD" fontSize="11">ΔT=Q/ṁCp</text>
                {/* Col 3: Capacity */}
                <text x={mpX + 2*colW + 8} y={mpY + 17} fill="#D1D5DB" fontSize="11">Capacity</text>
                <text x={mpX + 2*colW + 8} y={mpY + 37} fill={metrics.relativeCapacity > 80 ? colors.success : colors.warning} fontSize="16" fontWeight="700">{metrics.relativeCapacity.toFixed(0)}%</text>
                <text x={mpX + 2*colW + 8} y={mpY + 56} fill="#C4B5FD" fontSize="11">vs water</text>
              </>
            );
          })()}
        </g>

        {/* Comparison bar layer */}
        <g id="comparison-layer">
          {(() => {
            const cbX = 20;
            const cbY = 292;
            return (
              <>
                <text x={cbX} y={cbY + 12} fill="#D1D5DB" fontSize="11" fontWeight="600">Cooling Effectiveness:</text>
                <rect x={cbX} y={cbY + 18} width={width - 40} height="14" rx="7" fill={colors.border} />
                <rect x={cbX} y={cbY + 18} width={Math.min((width - 40) * (metrics.relativeCapacity / 200), width - 40)} height="14" rx="7" fill={props.color} />
                <text x={cbX + (width-40)/6} y={cbY + 48} textAnchor="middle" fill="#D1D5DB" fontSize="11">Air (1x)</text>
                <text x={cbX + (width-40)/2} y={cbY + 48} textAnchor="middle" fill="#D1D5DB" fontSize="11">Oil (8x)</text>
                <text x={cbX + 5*(width-40)/6} y={cbY + 48} textAnchor="middle" fill="#D1D5DB" fontSize="11">Water (25x)</text>
              </>
            );
          })()}
        </g>
      </svg>
    );
  };

  // Two-Phase Visualization for twist phase
  const TwoPhaseVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;

    const singlePhaseDeltaT = twistHeatLoad / ((5 / 60000) * 1000 * 4.186 * 1000);
    const twoPhaseDeltaT = useTwoPhase ? twistHeatLoad / ((5 / 60000) * 1000 * 100 * 1000) : singlePhaseDeltaT; // Effective Cp with latent heat

    // Tank absolute coords (no transform groups)
    const tankLeft = width / 2 - 80;
    const tankTop = 40;
    const tankH = 110;
    const heatSrcTop = tankTop + tankH - 35;
    const tempTextY = tankTop + tankH + 18;
    // Condenser above tank (two-phase)
    const condTop = tankTop - 28;
    // Explanation panel
    const panelTop = tempTextY + 18;
    const panelH = height - panelTop - 8;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Title */}
        <text x={width/2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          {useTwoPhase ? 'Two-Phase (Boiling) Cooling' : 'Single-Phase Liquid Cooling'}
        </text>

        {/* Condenser at top for two-phase */}
        {useTwoPhase && (
          <g id="condenser-layer">
            <rect x={tankLeft + 20} y={condTop} width="120" height="20" fill="#374151" stroke="#60a5fa" strokeWidth="2" rx="3" />
            <text x={tankLeft + 80} y={condTop + 14} textAnchor="middle" fontSize="11" fill="#60a5fa">Condenser</text>
            {/* Dripping condensate */}
            {[...Array(3)].map((_, i) => {
              const cx = tankLeft + 50 + i * 30;
              const cy = condTop + 20 + ((animationFrame + i * 40) % 15);
              return <circle key={`drop-${i}`} cx={cx} cy={cy} r={2} fill="#60a5fa" />;
            })}
          </g>
        )}

        {/* Fluid/tank */}
        <g id="tank-layer">
          <rect x={tankLeft} y={tankTop} width="160" height={tankH} fill={useTwoPhase ? '#7c3aed22' : '#3b82f622'} stroke={useTwoPhase ? '#7c3aed' : '#3b82f6'} strokeWidth="2" rx="8" />

          {/* Heat source at bottom of tank */}
          <rect x={tankLeft + 30} y={heatSrcTop} width="100" height="25" fill="url(#heatGrad)" stroke="#ef4444" strokeWidth="2" rx="4" />
          <text x={tankLeft + 80} y={heatSrcTop + 17} textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">{twistHeatLoad}W</text>

          {/* Bubbles for two-phase */}
          {useTwoPhase && [...Array(12)].map((_, i) => {
            const cx = tankLeft + 40 + (i % 4) * 30;
            const baseY = tankTop + tankH - 20;
            const cy = baseY - ((animationFrame * 1.5 + i * 20) % (tankH - 30));
            const r = 4 + Math.sin(animationFrame / 10 + i) * 2;
            return (
              <circle key={`bubble-${i}`} cx={cx} cy={cy} r={r} fill="white" opacity={0.6} />
            );
          })}
        </g>

        {/* Temperature indicator */}
        <text x={tankLeft + 80} y={tempTextY} textAnchor="middle" fontSize="11" fill="#D1D5DB">
          Surface: {useTwoPhase ? '34C (boiling point)' : `${(25 + singlePhaseDeltaT + 10).toFixed(0)}C`}
        </text>

        {/* Explanation panel */}
        <g id="explanation-layer">
          <rect x={20} y={panelTop} width={width - 40} height={panelH} rx="8" fill={colors.bgSecondary} />

          {useTwoPhase ? (
            <g id="twophase-text">
              <text x={35} y={panelTop + 20} fill="#7c3aed" fontSize="12" fontWeight="600">Two-Phase (Boiling) Advantage:</text>
              <text x={35} y={panelTop + 40} fill="#D1D5DB" fontSize="11">Latent heat of vaporization: 2260 J/g</text>
              <text x={35} y={panelTop + 56} fill="#D1D5DB" fontSize="11">vs sensible heat: 4.2 J/g per 1C</text>
              <text x={35} y={panelTop + 76} fill={colors.success} fontSize="11" fontWeight="600">540x more energy absorbed at constant temp!</text>
            </g>
          ) : (
            <g id="singlephase-text">
              <text x={35} y={panelTop + 20} fill={colors.accent} fontSize="12" fontWeight="600">Single-Phase Limitation:</text>
              <text x={35} y={panelTop + 40} fill="#D1D5DB" fontSize="11">Heat absorbed: Q = m*Cp*deltaT</text>
              <text x={35} y={panelTop + 56} fill="#D1D5DB" fontSize="11">Temperature must rise to transfer heat</text>
              <text x={35} y={panelTop + 76} fill={colors.warning} fontSize="11" fontWeight="600">Temperature rise: {singlePhaseDeltaT.toFixed(1)}C at {twistHeatLoad}W</text>
            </g>
          )}
        </g>
      </svg>
    );
  };

  // Navigation bar component
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: colors.bgSecondary,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            padding: '8px 12px',
            borderRadius: '6px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>Back</span>
        </button>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>
            {phaseLabels[phase]}
          </span>
          <div style={{
            height: '4px',
            width: '100px',
            background: colors.border,
            borderRadius: '2px',
          }}>
            <div style={{
              height: '100%',
              width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
              transition: 'width 0.3s ease',
              borderRadius: '2px',
            }} />
          </div>
        </div>
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            background: 'transparent',
            border: 'none',
            color: canGoNext ? colors.textSecondary : colors.textMuted,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            padding: '8px 12px',
            borderRadius: '6px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>Next</span>
        </button>
      </div>
    );
  };

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
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
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
    background: `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
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
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '24px',
      }}>
        {renderNavBar()}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '56px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          💧🔥
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Liquid Cooling Heat Transfer
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why is <span style={{ color: colors.accent }}>water</span> 25x better at cooling than <span style={{ color: '#e2e8f0' }}>air</span>? The secret lies in a fundamental property called specific heat capacity."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '12px' }}>
            A 500W GPU generates as much heat as a small space heater!
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            Air cooling struggles to keep up. But run water through a cold plate and temperatures drop dramatically. The physics behind this powers everything from gaming PCs to data centers to electric vehicles.
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Liquid Cooling
        </button>

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Water is denser than air, so more mass contacts the heat source' },
      { id: 'b', text: 'Water has ~4x higher specific heat capacity, absorbing more energy per degree', correct: true },
      { id: 'c', text: 'Water is naturally colder than air at room temperature' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '80px', overflowY: 'auto', flex: 1 }}>
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
            Why can water remove much more heat than air at the same flow rate?
          </h2>

          {/* Simple diagram - static SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 400} height={160} viewBox={`0 0 ${isMobile ? 320 : 400} 160`} style={{ maxWidth: '100%' }}>
              {/* Heat source */}
              <rect x="20" y="40" width="80" height="80" rx="8" fill="#dc2626" />
              <text x="60" y="75" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">500W</text>
              <text x="60" y="95" textAnchor="middle" fill="white" fontSize="10">Heat</text>

              {/* Arrow */}
              <path d="M110 80 L140 80" stroke={colors.textMuted} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={colors.textMuted} />
                </marker>
              </defs>

              {/* Coolant */}
              <rect x="150" y="40" width="100" height="80" rx="8" fill={colors.accent + '44'} stroke={colors.accent} strokeWidth="2" />
              <text x="200" y="75" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="bold">Coolant</text>
              <text x="200" y="95" textAnchor="middle" fill={colors.textSecondary} fontSize="10">Q = m*Cp*dT</text>

              {/* Arrow */}
              <path d="M260 80 L290 80" stroke={colors.textMuted} strokeWidth="2" markerEnd="url(#arrowhead)" />

              {/* Cool chip */}
              <rect x={isMobile ? 240 : 300} y="40" width="80" height="80" rx="8" fill={colors.success} />
              <text x={isMobile ? 280 : 340} y="75" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">Cool</text>
              <text x={isMobile ? 280 : 340} y="95" textAnchor="middle" fill="white" fontSize="10">Chip</text>
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
    );
  }

  // PLAY PHASE - Interactive Liquid Cooling Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '80px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Liquid Cooling Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Compare different coolants and see how specific heat affects temperature rise.
            The visualization below shows how heat flows from the source through the coolant.
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Real-world relevance: This same physics powers cooling in data centers, EVs, and gaming PCs.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Main visualization */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <LiquidCoolingVisualization />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Coolant selector */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                    Select Coolant Type:
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {(['air', 'water', 'oil'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => { playSound('click'); setCoolantType(type); }}
                        style={{
                          flex: 1,
                          minWidth: '100px',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: `2px solid ${coolantType === type ? coolantProps[type].color : colors.border}`,
                          background: coolantType === type ? `${coolantProps[type].color}22` : colors.bgSecondary,
                          color: coolantType === type ? coolantProps[type].color : colors.textSecondary,
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                      >
                        {coolantProps[type].name}
                        <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 400 }}>
                          Cp = {coolantProps[type].cp.toFixed(2)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flow rate slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textPrimary }}>Flow Rate</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowRate} L/min</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={flowRate}
                    onChange={(e) => setFlowRate(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, ${colors.accent} ${((flowRate - 1) / 19) * 100}%, ${colors.border} ${((flowRate - 1) / 19) * 100}%)`,
                      cursor: 'pointer',
                      touchAction: 'pan-y' as const,
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>

                {/* Heat load slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textPrimary }}>Heat Load (GPU Power)</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{heatLoad}W</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={heatLoad}
                    onChange={(e) => setHeatLoad(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, ${colors.warning} ${((heatLoad - 100) / 900) * 100}%, ${colors.border} ${((heatLoad - 100) / 900) * 100}%)`,
                      cursor: 'pointer',
                      touchAction: 'pan-y' as const,
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {coolantType === 'air' && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Notice the huge temperature rise with air! Try switching to water.
              </p>
            </div>
          )}

          {coolantType === 'water' && metrics.deltaT < 10 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Water keeps temperature rise under control! High specific heat means more energy absorbed per degree.
              </p>
            </div>
          )}

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
    const predictionOptions: Record<string, string> = {
      'a': 'Water is denser than air, so more mass contacts the heat source',
      'b': 'Water has ~4x higher specific heat capacity, absorbing more energy per degree',
      'c': 'Water is naturally colder than air at room temperature',
    };
    const userPrediction = prediction ? predictionOptions[prediction] : null;
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '80px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Liquid Cooling
          </h2>

          {/* Reference user's prediction */}
          {userPrediction ? (
            <div style={{
              background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: wasCorrect ? colors.success : colors.warning, margin: 0, fontWeight: 600 }}>
                {wasCorrect
                  ? `You predicted correctly: "${userPrediction}"`
                  : `You predicted: "${userPrediction}"`}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '8px 0 0 0' }}>
                {wasCorrect
                  ? 'As you observed, the key factor is specific heat capacity.'
                  : 'Let\'s explore why specific heat capacity is the key factor.'}
              </p>
            </div>
          ) : (
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                As you observed from the experiment, liquid cooling dramatically outperforms air cooling.
              </p>
            </div>
          )}

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Heat Transfer Equation:</strong>
              </p>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <span style={{ color: colors.accent, fontSize: '20px', fontWeight: 700, fontFamily: 'monospace' }}>
                  Q = m_dot x Cp x deltaT
                </span>
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}><strong>Q</strong> = Heat transfer rate (Watts)</li>
                <li style={{ marginBottom: '8px' }}><strong>m_dot</strong> = Mass flow rate (g/s)</li>
                <li style={{ marginBottom: '8px' }}><strong>Cp</strong> = Specific heat capacity (J/g*K)</li>
                <li style={{ marginBottom: '8px' }}><strong>deltaT</strong> = Temperature rise (C or K)</li>
              </ul>
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
              Key Insight: Specific Heat Matters!
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              For the same Q and m_dot, the temperature rise is:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e2e8f0' }}>Air (Cp = 1.0):</span>
                <span style={{ color: colors.error, fontWeight: 600 }}>High deltaT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#eab308' }}>Oil (Cp = 2.0):</span>
                <span style={{ color: colors.warning, fontWeight: 600 }}>Medium deltaT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.accent }}>Water (Cp = 4.2):</span>
                <span style={{ color: colors.success, fontWeight: 600 }}>Low deltaT</span>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Why Water is 25x Better
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Water combines high specific heat (4x air) with high density (800x air) and thermal conductivity (23x air). Together, these properties make water approximately 25x more effective at removing heat than air for the same volumetric flow.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover Something Even Better
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Vapor rises faster, improving circulation' },
      { id: 'b', text: 'Phase change absorbs massive energy via latent heat at constant temperature', correct: true },
      { id: 'c', text: 'Bubbles create turbulence that mixes the fluid better' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '64px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Two-Phase Cooling
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What if the liquid actually BOILS at the chip surface? Why would that be even better?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              In two-phase immersion cooling, servers are submerged in a special fluid (like 3M Novec) that boils at low temperatures (34-61C). The fluid boils on hot chips, vapor rises, condenses, and drips back.
            </p>
            {/* Static SVG diagram for two-phase concept */}
            <svg width={isMobile ? 320 : 400} height={140} viewBox={`0 0 ${isMobile ? 320 : 400} 140`} style={{ display: 'block', margin: '0 auto' }}>
              {/* Tank */}
              <rect x="80" y="20" width="240" height="100" rx="8" fill="#7c3aed22" stroke="#7c3aed" strokeWidth="2" />

              {/* Chip at bottom */}
              <rect x="150" y="85" width="100" height="25" rx="4" fill="#dc2626" />
              <text x="200" y="102" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Hot Chip</text>

              {/* Bubbles rising */}
              <circle cx="170" cy="70" r="6" fill="white" opacity="0.6" />
              <circle cx="200" cy="55" r="8" fill="white" opacity="0.5" />
              <circle cx="230" cy="65" r="5" fill="white" opacity="0.6" />

              {/* Condenser at top */}
              <rect x="100" y="5" width="200" height="15" rx="3" fill="#374151" stroke="#60a5fa" strokeWidth="2" />
              <text x="200" y="15" textAnchor="middle" fill="#60a5fa" fontSize="9">Condenser</text>

              {/* Labels */}
              <text x="200" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="10">Liquid boils → Vapor rises → Condenses → Drips back</text>
            </svg>
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
              Explore Two-Phase Cooling
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '64px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Two-Phase vs Single-Phase Cooling
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare the cooling performance with and without phase change.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <TwoPhaseVisualization />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexDirection: 'column' }}>
                  <button
                    onClick={() => { playSound('click'); setUseTwoPhase(false); }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      border: `2px solid ${!useTwoPhase ? colors.accent : colors.border}`,
                      background: !useTwoPhase ? `${colors.accent}22` : colors.bgSecondary,
                      color: !useTwoPhase ? colors.accent : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Single-Phase (Water)
                  </button>
                  <button
                    onClick={() => { playSound('click'); setUseTwoPhase(true); }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      border: `2px solid ${useTwoPhase ? '#7c3aed' : colors.border}`,
                      background: useTwoPhase ? '#7c3aed22' : colors.bgSecondary,
                      color: useTwoPhase ? '#7c3aed' : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Two-Phase (Boiling)
                  </button>
                </div>

                {/* Heat load slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Heat Load</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{twistHeatLoad}W</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={twistHeatLoad}
                    onChange={(e) => setTwistHeatLoad(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y' as const,
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {useTwoPhase && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Boiling absorbs 540x more energy than sensible heating! Temperature stays constant at boiling point.
              </p>
            </div>
          )}

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

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '64px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Power of Phase Change
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Sensible Heat vs Latent Heat</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Sensible heat:</strong> Q = m * Cp * deltaT (temperature changes)<br/>
                <strong>Latent heat:</strong> Q = m * L (temperature stays constant!)<br/><br/>
                Water: L = 2260 J/g vs Cp*deltaT = 4.2 J/g per 1C<br/>
                <span style={{ color: colors.success }}>One gram boiling absorbs as much heat as heating 540g by 1C!</span>
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🫧</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Benefits of Two-Phase Cooling</h3>
              </div>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li>Constant temperature operation at boiling point</li>
                <li>Extremely high heat transfer coefficients</li>
                <li>Self-regulating: more heat = more boiling</li>
                <li>No pump needed (thermosyphon effect)</li>
              </ul>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛁</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Immersion Cooling in Practice</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Modern two-phase immersion uses fluids like 3M Novec that boil at 34-61C (safe for electronics). Servers sit in tanks of this fluid. Heat causes boiling, vapor rises to a condenser, and liquid drips back. PUE (Power Usage Effectiveness) can drop below 1.05!
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
    return (
      <TransferPhaseView
        conceptName="Liquid Cooling"
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

    const handleGotIt = () => {
      playSound('click');
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      // Move to next uncompleted app if available
      const nextUncompleted = completedApps.findIndex((c, i) => !c && i !== selectedApp);
      if (nextUncompleted !== -1 && !allAppsCompleted) {
        setSelectedApp(nextUncompleted);
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '80px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} | Completed: {completedCount}/{realWorldApps.length}
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
                Connection to Heat Transfer:
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
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
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

            {/* Got It button */}
            {!completedApps[selectedApp] && (
              <button
                onClick={handleGotIt}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                }}
              >
                Got It
              </button>
            )}
            {completedApps[selectedApp] && (
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: `${colors.success}22`,
                borderRadius: '8px',
                color: colors.success,
                fontWeight: 600,
              }}>
                Completed!
              </div>
            )}
          </div>

          {allAppsCompleted ? (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          ) : (
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                boxShadow: 'none',
              }}
            >
              Skip to Test ({completedCount}/{realWorldApps.length} apps viewed)
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
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '64px', flex: 1, textAlign: 'center', overflowY: 'auto' }}>
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
                ? 'You understand liquid cooling heat transfer!'
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', paddingTop: '80px', overflowY: 'auto', flex: 1 }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentQuestion + 1} of 10
              </span>
              <span style={{ ...typo.small, color: colors.textMuted, marginLeft: '12px' }}>
                Progress: {testAnswers.filter(a => a !== null).length}/10 answered
              </span>
            </div>
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
        {renderNavBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          💧
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Liquid Cooling Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the fundamental physics that makes liquid cooling essential for high-power computing.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Q = m_dot x Cp x deltaT governs heat transfer',
              "Water's high Cp (4.2 J/g*K) enables efficient cooling",
              'Liquid cooling is ~25x more effective than air',
              'Two-phase boiling provides massive heat absorption',
              'Latent heat is 540x sensible heat for water',
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

export default LiquidCoolingRenderer;
