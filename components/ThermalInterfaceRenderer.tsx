'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Thermal Interface Materials (TIM) - Complete 10-Phase Game
// Understanding heat transfer between CPU and heatsink
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

interface ThermalInterfaceRendererProps {
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
    scenario: "A PC builder applies thermal paste to their new CPU but notices temperatures are 15C higher than expected. They used a pea-sized amount and the cooler is properly mounted.",
    question: "What could be causing the higher temperatures?",
    options: [
      { id: 'a', label: "The thermal paste layer is too thick, increasing thermal resistance", correct: true },
      { id: 'b', label: "Pea-sized is always the correct amount for any CPU" },
      { id: 'c', label: "The thermal paste needs 100 hours to cure properly" },
      { id: 'd', label: "Modern CPUs always run hot regardless of TIM" }
    ],
    explanation: "Thermal resistance R = thickness / (conductivity x area). Even high-quality thermal paste has lower conductivity than metal-to-metal contact. Excess paste creates an unnecessarily thick layer, increasing thermal resistance. The optimal amount fills microscopic gaps without creating a thick barrier."
  },
  {
    scenario: "An engineer compares two CPUs: one with thermal paste (8 W/mK conductivity) and one with bare metal-to-metal contact. Surprisingly, the one with paste runs cooler.",
    question: "Why does adding a material with lower conductivity than metal improve cooling?",
    options: [
      { id: 'a', label: "The paste chemically bonds with the metal surfaces" },
      { id: 'b', label: "Air gaps between imperfect surfaces have extremely low conductivity (~0.025 W/mK), which TIM eliminates", correct: true },
      { id: 'c', label: "Thermal paste creates additional surface area" },
      { id: 'd', label: "The pressure from mounting squeezes heat out faster" }
    ],
    explanation: "Metal surfaces appear smooth but have microscopic peaks and valleys. Without TIM, air fills these gaps. Air's thermal conductivity (~0.025 W/mK) is 300x lower than thermal paste. TIM fills these gaps, dramatically reducing interface thermal resistance."
  },
  {
    scenario: "A data center is evaluating thermal pads vs thermal paste for their servers. The pads are easier to apply but have lower thermal conductivity (5 W/mK vs 8 W/mK for paste).",
    question: "When might thermal pads be the better choice despite lower conductivity?",
    options: [
      { id: 'a', label: "Never - lower conductivity always means worse performance" },
      { id: 'b', label: "When the gap between components varies or is large, pads maintain consistent contact", correct: true },
      { id: 'c', label: "When the server runs at temperatures above 80C" },
      { id: 'd', label: "Only for components that generate less than 10W of heat" }
    ],
    explanation: "Thermal pads excel when dealing with height variations between components or uneven surfaces. They compress to fill variable gaps consistently. Paste would squeeze out or leave voids in large gaps. For uniform, flat surfaces under high pressure, paste performs better."
  },
  {
    scenario: "A laptop manufacturer switches from standard thermal paste to liquid metal (conductivity 73 W/mK vs 8 W/mK). However, they must redesign the heatsink to use nickel plating.",
    question: "Why is this redesign necessary for liquid metal?",
    options: [
      { id: 'a', label: "Liquid metal requires a smoother surface finish" },
      { id: 'b', label: "Gallium in liquid metal corrodes aluminum, so a protective barrier is needed", correct: true },
      { id: 'c', label: "Nickel plating increases the heatsink's thermal conductivity" },
      { id: 'd', label: "Liquid metal needs magnetic materials to stay in place" }
    ],
    explanation: "Liquid metal TIMs contain gallium, which aggressively corrodes aluminum through a process called amalgamation. Nickel plating creates a protective barrier. Copper heatsinks are safe but often nickel-plated anyway. This is why liquid metal requires careful material selection."
  },
  {
    scenario: "A technician increases mounting pressure on a CPU cooler from 30 PSI to 60 PSI. Temperature drops by 5C even though the same thermal paste is used.",
    question: "How does increased pressure improve thermal transfer?",
    options: [
      { id: 'a', label: "Higher pressure makes the thermal paste more conductive" },
      { id: 'b', label: "Pressure compresses surface irregularities, increasing actual metal contact area and reducing TIM thickness", correct: true },
      { id: 'c', label: "The CPU generates less heat under pressure" },
      { id: 'd', label: "Pressure creates a vacuum that improves heat transfer" }
    ],
    explanation: "Contact pressure has two effects: it deforms surface peaks (increasing direct metal-metal contact) and squeezes out excess TIM (reducing thermal resistance from the paste layer). Both effects reduce total interface thermal resistance. This is why cooler mounting pressure is specified."
  },
  {
    scenario: "A thermal engineer measures surface roughness of a CPU integrated heat spreader (IHS) at 0.8 micrometers Ra. The heatsink base has 1.6 micrometers Ra roughness.",
    question: "Which surface should be prioritized for polishing to improve thermal performance?",
    options: [
      { id: 'a', label: "The CPU IHS - it's the heat source" },
      { id: 'b', label: "The heatsink base - it has higher roughness and larger surface area for improvement", correct: true },
      { id: 'c', label: "Neither - roughness doesn't affect thermal performance with TIM" },
      { id: 'd', label: "Both equally - roughness values are additive" }
    ],
    explanation: "Total effective gap is roughly the sum of both surface roughnesses. The heatsink at 1.6um contributes twice as much to the gap as the IHS at 0.8um. Polishing the rougher surface yields more improvement per unit of effort. However, extremely smooth surfaces may actually reduce paste adhesion."
  },
  {
    scenario: "A gaming laptop's thermal throttling kicks in after 30 minutes of play. Opening it reveals the thermal paste has become dry and crumbly after 2 years of use.",
    question: "What thermal paste property has degraded, and what's the consequence?",
    options: [
      { id: 'a', label: "Viscosity has increased, making it harder to spread" },
      { id: 'b', label: "The carrier oil has evaporated, leaving voids and reducing effective contact area", correct: true },
      { id: 'c', label: "The paste has reacted with oxygen to form an insulating oxide" },
      { id: 'd', label: "Thermal cycling has crystallized the metal particles" }
    ],
    explanation: "Thermal paste is metal or ceramic particles suspended in silicone oil. Over time, especially with heat cycling, the oil evaporates or migrates. This leaves air gaps between particles and reduces contact with surfaces. This 'pump-out' effect is why paste needs periodic replacement in high-performance applications."
  },
  {
    scenario: "A PC builder is debating between thermal paste rated at 8.5 W/mK and one rated at 12.5 W/mK that costs three times more. Their CPU has a 37mm x 37mm IHS.",
    question: "What real-world temperature difference should they expect from the higher-conductivity paste?",
    options: [
      { id: 'a', label: "Temperatures will be 47% lower (12.5/8.5 ratio)" },
      { id: 'b', label: "Only 2-5C difference because TIM is just one part of total thermal resistance", correct: true },
      { id: 'c', label: "No difference - conductivity ratings are marketing" },
      { id: 'd', label: "The expensive paste will last longer but perform the same" }
    ],
    explanation: "Total thermal resistance includes: die-to-IHS, IHS-to-TIM-to-heatsink, and heatsink-to-air. TIM typically represents 5-15% of total resistance. A 47% improvement in TIM conductivity might yield only 2-7% improvement in total resistance, translating to a few degrees. For most users, application technique matters more than paste choice."
  },
  {
    scenario: "An aerospace engineer is selecting TIM for electronics in a satellite. The operating temperature ranges from -40C to +120C, with thousands of thermal cycles expected.",
    question: "Which TIM property is most critical for this application?",
    options: [
      { id: 'a', label: "Maximum thermal conductivity" },
      { id: 'b', label: "Low cost for the large quantity needed" },
      { id: 'c', label: "Thermal cycling stability and consistent performance across the temperature range", correct: true },
      { id: 'd', label: "Easy application for factory assembly" }
    ],
    explanation: "In aerospace, reliability trumps peak performance. Thermal cycling causes TIM to pump out, crack, or delaminate. Phase-change materials or gap pads with stable polymers are often chosen over high-performance pastes. The best paste is useless if it fails after 1000 cycles when 10,000 are needed."
  },
  {
    scenario: "A server rack experiences thermal runaway: one server overheats, warming its neighbors, which then overheat in a cascade. Each server dissipates 500W with 0.2 C/W thermal resistance at the TIM interface.",
    question: "What is the temperature rise across just the TIM interface?",
    options: [
      { id: 'a', label: "0.2C" },
      { id: 'b', label: "100C (500W x 0.2 C/W)", correct: true },
      { id: 'c', label: "2500C (500W / 0.2 C/W)" },
      { id: 'd', label: "Cannot calculate without ambient temperature" }
    ],
    explanation: "Temperature rise = Power x Thermal Resistance. At 500W and 0.2 C/W, delta-T = 100C across the interface alone. This shows why TIM selection is critical in high-power applications. A better TIM at 0.1 C/W would halve this temperature drop to 50C, dramatically improving headroom."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'High-Performance Computing',
    short: 'CPUs and GPUs pushing thermal limits',
    tagline: 'Every degree counts for performance',
    description: 'Modern processors can dissipate 300W+ in areas smaller than a postage stamp. Thermal interface materials are critical for transferring this heat to cooling solutions. Poor TIM application is the #1 cause of unexpected thermal throttling.',
    connection: 'The thermal resistance formula R = t/(k*A) shows that thin layers of high-conductivity material minimize temperature rise. For a 300W CPU with 0.1C/W interface resistance, thats 30C lost just getting heat into the cooler.',
    howItWorks: 'Thermal paste fills microscopic gaps between the CPU integrated heat spreader (IHS) and cooler base. Premium pastes use metal particles for higher conductivity. Application pressure squeezes the paste thin while ensuring complete coverage.',
    stats: [
      { value: '300W', label: 'Modern CPU TDP', icon: '🔥' },
      { value: '8-12', label: 'W/mK paste conductivity', icon: '📈' },
      { value: '2-5C', label: 'Premium vs basic paste', icon: '🌡️' }
    ],
    examples: ['Intel Core i9 delid', 'AMD Ryzen direct die', 'NVIDIA RTX 4090', 'Custom loop liquid cooling'],
    companies: ['Thermal Grizzly', 'Noctua', 'Arctic', 'Cooler Master'],
    futureImpact: 'Graphene-based TIMs promise 1500+ W/mK conductivity, potentially eliminating TIM as a thermal bottleneck.',
    color: '#EF4444'
  },
  {
    icon: '📱',
    title: 'Mobile Device Thermal Management',
    short: 'Thin devices, big thermal challenges',
    tagline: 'Cool phones, happy users',
    description: 'Smartphones pack powerful processors into cases just 8mm thick with no fans. Thermal interface materials conduct heat from chips to metal frames and vapor chambers. Poor thermal design causes throttling that users notice immediately.',
    connection: 'With limited cooling solutions, every thermal resistance in the path matters. Gap pads of varying thickness accommodate component height differences while conducting heat to the device chassis.',
    howItWorks: 'Phones use layered thermal solutions: graphite sheets for spreading, thermal pads for chip-to-frame contact, and copper heat pipes or vapor chambers. The TIM layer is often the bottleneck preventing better cooling.',
    stats: [
      { value: '15W', label: 'Peak SoC power', icon: '⚡' },
      { value: '45C', label: 'Skin temp limit', icon: '📱' },
      { value: '0.5mm', label: 'Typical gap pad', icon: '📐' }
    ],
    examples: ['iPhone thermal throttling', 'Samsung vapor chambers', 'Gaming phone active cooling', 'Foldable device thermals'],
    companies: ['Apple', 'Samsung', 'Qualcomm', 'Laird'],
    futureImpact: 'Phase-change TIMs and advanced vapor chambers will enable sustained high performance in thinner devices.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'EV Power Electronics',
    short: 'High-power inverters and battery management',
    tagline: 'Reliable power delivery for electric mobility',
    description: 'Electric vehicle inverters convert battery DC to motor AC at powers exceeding 200kW. Power semiconductors generate intense heat that must be transferred to liquid cooling systems. TIM reliability over 15-year vehicle life is critical.',
    connection: 'Automotive TIMs must handle thermal cycling from -40C to +150C while maintaining consistent thermal resistance. Gap variations from manufacturing tolerances require compressible TIM solutions.',
    howItWorks: 'Power modules use specialized TIMs between silicon dies and baseplates, then again between modules and cold plates. Silicone-free options prevent contamination of other components. Pressure distribution systems ensure uniform TIM compression.',
    stats: [
      { value: '200kW', label: 'Inverter power', icon: '⚡' },
      { value: '175C', label: 'Max junction temp', icon: '🔥' },
      { value: '15yr', label: 'Reliability target', icon: '🚗' }
    ],
    examples: ['Tesla Model S inverter', 'Rivian motor drivers', 'Lucid Air power module', 'Battery pack thermal interface'],
    companies: ['Henkel', 'Dow', 'Shin-Etsu', 'Bergquist'],
    futureImpact: 'SiC and GaN devices operating at higher temperatures will drive TIM innovation for extreme thermal environments.',
    color: '#10B981'
  },
  {
    icon: '🛰️',
    title: 'Aerospace Electronics',
    short: 'Extreme reliability requirements',
    tagline: 'No second chances in orbit',
    description: 'Satellites and aircraft electronics face extreme temperature swings, vibration, and decades of service with zero maintenance. Thermal interface materials must perform reliably from -65C to +200C over thousands of thermal cycles.',
    connection: 'Vacuum environment eliminates convection, making conduction through TIM the only heat path. Outgassing specifications prevent TIM from contaminating optics or solar cells. Radiation resistance ensures long-term stability.',
    howItWorks: 'Aerospace TIMs include phase-change materials that melt and reflow during thermal cycling, maintaining contact. Thermally conductive adhesives permanently bond heat sources to structures. Testing includes thermal vacuum cycling and vibration qualification.',
    stats: [
      { value: '-65C', label: 'Cold extreme', icon: '❄️' },
      { value: '+200C', label: 'Hot extreme', icon: '🔥' },
      { value: '20yr', label: 'Design lifetime', icon: '🛰️' }
    ],
    examples: ['James Webb telescope', 'Mars rover electronics', 'Starlink terminals', 'Aircraft avionics'],
    companies: ['Honeywell', 'Parker Chomerics', 'LORD Corp', 'Saint-Gobain'],
    futureImpact: 'Self-healing TIMs using microencapsulated phase-change materials will enable even longer mission durations.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ThermalInterfaceRenderer: React.FC<ThermalInterfaceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [timThickness, setTimThickness] = useState(0.1); // mm
  const [thermalConductivity, setThermalConductivity] = useState(8); // W/mK
  const [contactPressure, setContactPressure] = useState(50); // PSI (normalized)
  const [surfaceRoughness, setSurfaceRoughness] = useState(1.0); // micrometers
  const [cpuPower, setCpuPower] = useState(150); // Watts
  const [animationFrame, setAnimationFrame] = useState(0);

  // TIM type for twist phase
  const [selectedTimType, setSelectedTimType] = useState<'paste' | 'pad' | 'liquidmetal'>('paste');

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());

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

  // Animation loop (uses requestAnimationFrame so it doesn't fire in test environments)
  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime >= 50) {
        lastTime = time;
        setAnimationFrame(f => f + 1);
      }
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red/heat themed
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
    cold: '#3B82F6',
    hot: '#EF4444',
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
    twist_predict: 'Twist Predict',
    twist_play: 'Material Lab',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate thermal resistance and temperatures
  const calculateThermalResistance = useCallback(() => {
    // Base TIM thermal resistance: R = thickness / (conductivity * area)
    // Area = 37mm x 37mm (typical CPU IHS) = 0.001369 m^2
    const area = 0.001369; // m^2
    const thicknessM = timThickness / 1000; // convert mm to m
    const conductivityWmK = thermalConductivity;

    // Effective conductivity reduced by surface roughness (air gaps)
    // More roughness = more air gaps = lower effective conductivity
    const roughnessFactor = Math.max(0.3, 1 - (surfaceRoughness * 0.1));

    // Pressure improves contact - higher pressure = lower resistance
    const pressureFactor = Math.max(0.5, 1 - ((contactPressure - 50) / 200));

    // Calculate thermal resistance
    const timResistance = (thicknessM / (conductivityWmK * area * 1000)) * (1 / roughnessFactor) * pressureFactor;

    // Add some fixed resistances for CPU die and heatsink
    const cpuDieResistance = 0.01; // C/W
    const heatsinkResistance = 0.05; // C/W (assuming good air/liquid cooling)

    const totalResistance = cpuDieResistance + timResistance + heatsinkResistance;

    // Calculate temperatures
    const ambientTemp = 25; // C
    const cpuTemp = ambientTemp + (cpuPower * totalResistance);
    const interfaceTemp = ambientTemp + (cpuPower * heatsinkResistance) + (cpuPower * timResistance / 2);
    const heatsinkTemp = ambientTemp + (cpuPower * heatsinkResistance);

    return {
      timResistance: timResistance,
      totalResistance: totalResistance,
      cpuTemp: Math.min(cpuTemp, 150), // Cap at 150C
      interfaceTemp: Math.min(interfaceTemp, 140),
      heatsinkTemp: Math.min(heatsinkTemp, 100),
      efficiency: Math.max(0, 100 - (timResistance * 500)), // Higher resistance = lower efficiency
    };
  }, [timThickness, thermalConductivity, contactPressure, surfaceRoughness, cpuPower]);

  const thermalData = calculateThermalResistance();

  // Get color based on temperature
  const getTempColor = (temp: number) => {
    if (temp < 50) return colors.cold;
    if (temp < 70) return colors.success;
    if (temp < 85) return colors.warning;
    return colors.hot;
  };

  // Thermal Interface Visualization
  const ThermalVisualization = ({ showHeatFlow = true, animated = true }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 280 : 350;

    const heatPulse = animated ? Math.sin(animationFrame * 0.1) * 0.3 + 0.7 : 1;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Defs for filters and gradients */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="hotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <radialGradient id="cpuGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={getTempColor(thermalData.cpuTemp)} stopOpacity="0.8" />
            <stop offset="100%" stopColor={getTempColor(thermalData.cpuTemp)} stopOpacity="0" />
          </radialGradient>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
          </marker>
        </defs>

        {/* CPU Die */}
        <rect x={width * 0.25} y={height * 0.6} width={width * 0.5} height={height * 0.15}
          fill={getTempColor(thermalData.cpuTemp)}
          stroke={colors.textSecondary}
          strokeWidth="2"
          rx="4"
          filter="url(#glow)"
        />
        <text x={width * 0.5} y={height * 0.68} fill="white" fontSize="12" textAnchor="middle" fontWeight="600">
          CPU: {thermalData.cpuTemp.toFixed(0)}C
        </text>

        {/* Thermal Interface Layer */}
        <rect x={width * 0.2} y={height * 0.45} width={width * 0.6} height={height * 0.12}
          fill={getTempColor(thermalData.interfaceTemp)}
          opacity={0.8}
          filter="url(#glow)"
        />
        <text x={width * 0.5} y={height * 0.52} fill="white" fontSize="11" textAnchor="middle">
          TIM Layer ({timThickness.toFixed(2)}mm)
        </text>

        {/* Surface roughness visualization */}
        <g opacity={0.6}>
          {[...Array(20)].map((_, i) => {
            const x = width * 0.2 + (i * width * 0.03);
            const roughnessHeight = surfaceRoughness * 3;
            return (
              <g key={i}>
                {/* Top surface (heatsink) irregular */}
                <line
                  x1={x} y1={height * 0.45}
                  x2={x} y2={height * 0.45 - (Math.random() * roughnessHeight)}
                  stroke={colors.textMuted}
                  strokeWidth="1"
                />
                {/* Bottom surface (CPU) irregular */}
                <line
                  x1={x} y1={height * 0.57}
                  x2={x} y2={height * 0.57 + (Math.random() * roughnessHeight)}
                  stroke={colors.textMuted}
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </g>

        {/* Heatsink */}
        <rect x={width * 0.15} y={height * 0.15} width={width * 0.7} height={height * 0.28}
          fill={getTempColor(thermalData.heatsinkTemp)}
          stroke={colors.textSecondary}
          strokeWidth="2"
          rx="4"
          filter="url(#glow)"
        />
        {/* Heatsink fins */}
        {[...Array(7)].map((_, i) => (
          <rect
            key={i}
            x={width * 0.18 + i * (width * 0.09)}
            y={height * 0.02}
            width={width * 0.06}
            height={height * 0.12}
            fill={getTempColor(thermalData.heatsinkTemp)}
            rx="2"
          />
        ))}
        <text x={width * 0.5} y={height * 0.32} fill="white" fontSize="12" textAnchor="middle" fontWeight="600">
          Heatsink: {thermalData.heatsinkTemp.toFixed(0)}C
        </text>

        {/* Heat flow arrows */}
        {showHeatFlow && (
          <g opacity={heatPulse}>
            {[...Array(3)].map((_, i) => {
              const arrowX = width * 0.35 + i * (width * 0.15);
              const offset = (animationFrame * 2 + i * 10) % 30;
              const ay = height * 0.75 - offset;
              return (
                <g key={i}>
                  <polygon
                    points={`${arrowX},${ay - 10} ${arrowX - 8},${ay} ${arrowX + 8},${ay}`}
                    fill={colors.hot}
                    opacity={0.8 - offset / 40}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Pressure indicators */}
        <g>
          <line x1={width * 0.1} y1={height * 0.3} x2={width * 0.2} y2={height * 0.35}
            stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead)"
          />
          <line x1={width * 0.9} y1={height * 0.3} x2={width * 0.8} y2={height * 0.35}
            stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowhead)"
          />
          <text x={width * 0.08} y={height * 0.28} fill={colors.textSecondary} fontSize="11">
            {contactPressure} PSI
          </text>
        </g>

        {/* Labels */}
        <text x={width * 0.5} y={height * 0.82} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Power: {cpuPower}W | Conductivity: {thermalConductivity} W/mK
        </text>
        <text x={width * 0.5} y={height * 0.92} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Thermal Resistance: {thermalData.timResistance.toFixed(3)} C/W
        </text>

        {/* Thermal resistance curve - shows how resistance varies with thickness */}
        {(() => {
          const chartX = width * 0.05;
          const chartY = height * 0.94;
          const chartW = width * 0.35;
          const chartH = height * 0.35;
          const numPoints = 20;
          // Generate points: R vs thickness (0.02 to 0.5mm)
          const maxR = 0.5 / (thermalConductivity * 0.001369 * 1000);
          const points = Array.from({ length: numPoints }, (_, i) => {
            const t = 0.02 + (0.48 * i / (numPoints - 1));
            const R = t / (thermalConductivity * 0.001369 * 1000);
            const px = chartX + (t / 0.5) * chartW;
            const py = chartY - (R / maxR) * chartH;
            return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
          }).join(' ');
          const currentT = timThickness;
          const currentR = currentT / (thermalConductivity * 0.001369 * 1000);
          const markerX = chartX + (currentT / 0.5) * chartW;
          const markerY = chartY - (currentR / maxR) * chartH;
          return (
            <g>
              {/* Axis lines */}
              <line x1={chartX} y1={chartY - chartH} x2={chartX} y2={chartY} stroke={colors.textSecondary} strokeWidth="1" opacity="0.5" />
              <line x1={chartX} y1={chartY} x2={chartX + chartW} y2={chartY} stroke={colors.textSecondary} strokeWidth="1" opacity="0.5" />
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((frac, i) => (
                <line key={i} x1={chartX} y1={chartY - frac * chartH} x2={chartX + chartW} y2={chartY - frac * chartH}
                  stroke={colors.textSecondary} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              ))}
              {/* Curve */}
              <path d={points} stroke={colors.accent} strokeWidth="2" fill="none" />
              {/* Axis labels */}
              <text x={chartX + chartW / 2} y={chartY + 12} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Thickness (mm)</text>
              <text x={chartX - 8} y={chartY - chartH / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, ${chartX - 8}, ${chartY - chartH / 2})`}>Resistance</text>
              {/* Current position marker */}
              <circle cx={markerX} cy={markerY} r="5" fill={colors.accent} stroke="white" strokeWidth="1.5" filter="url(#glow)" />
            </g>
          );
        })()}
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔥💻
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Thermal Interface Materials
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Metal touching metal should conduct heat perfectly, right? <span style={{ color: colors.accent }}>Wrong.</span> Microscopic air gaps can raise your CPU temperature by 30C. The paste between your CPU and cooler is more important than you think."
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
            "Air is an excellent insulator—that's why we use it in double-pane windows. Unfortunately, it's also between your CPU and heatsink unless you fill those gaps."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Thermal Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Exploring →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Direct metal contact is best—thermal paste adds resistance between surfaces' },
      { id: 'b', text: 'Thermal paste is needed because it fills air gaps that have very poor conductivity' },
      { id: 'c', text: 'It doesnt matter—modern CPUs regulate their own temperature' },
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
            Your friend claims that wiping off the thermal paste and pressing the CPU cooler directly onto the CPU would improve cooling. Are they right?
          </h2>

          {/* Static SVG diagram for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox="0 0 300 180" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
              <defs>
                <linearGradient id="predictHotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
                <linearGradient id="predictColdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1D4ED8" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <filter id="predictGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Background */}
              <rect width="300" height="180" fill="#0a0a0f" rx="8" />
              {/* Heatsink */}
              <rect x="50" y="20" width="200" height="45" fill="url(#predictColdGrad)" rx="4" filter="url(#predictGlow)" />
              {/* Heatsink fins */}
              {[65, 95, 125, 155, 185, 215].map((x, i) => (
                <rect key={i} x={x} y="5" width="16" height="15" fill="#2563EB" rx="2" />
              ))}
              <text x="150" y="47" fill="white" fontSize="12" textAnchor="middle" fontWeight="600">Heatsink (Cool)</text>
              {/* TIM Layer */}
              <rect x="60" y="68" width="180" height="14" fill="#F59E0B" rx="2" opacity="0.9" />
              <text x="150" y="79" fill="white" fontSize="11" textAnchor="middle">Thermal Interface Material?</text>
              {/* CPU Die */}
              <rect x="70" y="85" width="160" height="40" fill="url(#predictHotGrad)" rx="4" filter="url(#predictGlow)" />
              <text x="150" y="108" fill="white" fontSize="12" textAnchor="middle" fontWeight="600">CPU Die (100W)</text>
              {/* Heat arrows */}
              {[100, 150, 200].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1="82" x2={x} y2="72" stroke="#EF4444" strokeWidth="2" markerEnd="url(#heatArrow)" />
                </g>
              ))}
              <defs>
                <marker id="heatArrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <path d="M0,0 L0,4 L6,2 z" fill="#EF4444" />
                </marker>
              </defs>
              {/* Labels */}
              <text x="150" y="145" fill="#94a3b8" fontSize="11" textAnchor="middle">Temperature (°C)</text>
              <text x="150" y="162" fill="#F59E0B" fontSize="11" textAnchor="middle">R = thickness / (conductivity × area)</text>
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={() => { playSound('click'); goToPhase('hook'); }}
              style={{
                flex: 1, padding: '14px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, flex: 2 }}
              >
                Test My Prediction →
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Thermal Interface
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Thermal Interface Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust TIM properties and see how they affect heat transfer
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Watch for:</strong> As you adjust thickness and conductivity, observe how CPU temperature changes. Thinner layers and higher conductivity reduce thermal resistance. Notice the heat flow animation speed increases with better heat transfer. This is why thermal engineering matters in every modern device — from gaming PCs to data center servers, TIM technology enables reliable high-performance computing.
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
                Heat Transfer Visualization
              </h3>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <ThermalVisualization />
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Formula near graphic */}
                  <div style={{
                    background: colors.bgSecondary,
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    fontFamily: 'monospace',
                  }}>
                    <span style={{ color: colors.accent, fontSize: isMobile ? '14px' : '18px' }}>R = t / (k × A)</span>
                  </div>

                  {/* Sliders */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {/* TIM Thickness */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>TIM Thickness</span>
                    <span style={{
                      ...typo.small,
                      color: colors.accent,
                      fontWeight: 600,
                      textShadow: `0 0 10px ${colors.accentGlow}`,
                      filter: `drop-shadow(0 0 8px ${colors.accentGlow})`,
                    }}>{timThickness.toFixed(2)}mm</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.5"
                    step="0.02"
                    value={timThickness}
                    onChange={(e) => setTimThickness(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Thin (better)</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Thick</span>
                  </div>
                </div>

                {/* Thermal Conductivity */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Conductivity</span>
                    <span style={{
                      ...typo.small,
                      color: colors.accent,
                      fontWeight: 600,
                      textShadow: `0 0 10px ${colors.accentGlow}`,
                      filter: `drop-shadow(0 0 8px ${colors.accentGlow})`,
                    }}>{thermalConductivity} W/mK</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="80"
                    step="1"
                    value={thermalConductivity}
                    onChange={(e) => setThermalConductivity(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Basic paste</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Liquid metal</span>
                  </div>
                </div>

                {/* Contact Pressure */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Contact Pressure</span>
                    <span style={{
                      ...typo.small,
                      color: colors.accent,
                      fontWeight: 600,
                      textShadow: `0 0 10px ${colors.accentGlow}`,
                      filter: `drop-shadow(0 0 8px ${colors.accentGlow})`,
                    }}>{contactPressure} PSI</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={contactPressure}
                    onChange={(e) => setContactPressure(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Low</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>High (better)</span>
                  </div>
                </div>

                {/* Surface Roughness */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Surface Roughness</span>
                    <span style={{
                      ...typo.small,
                      color: colors.accent,
                      fontWeight: 600,
                      textShadow: `0 0 10px ${colors.accentGlow}`,
                      filter: `drop-shadow(0 0 8px ${colors.accentGlow})`,
                    }}>{surfaceRoughness.toFixed(1)} um</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.2"
                    value={surfaceRoughness}
                    onChange={(e) => setSurfaceRoughness(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Polished</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Rough</span>
                  </div>
                </div>
              </div>
                </div>
              </div>

              {/* Temperature stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginTop: '24px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  borderTop: `3px solid ${getTempColor(thermalData.cpuTemp)}`,
                }}>
                  <div style={{ ...typo.h3, color: getTempColor(thermalData.cpuTemp) }}>{thermalData.cpuTemp.toFixed(0)}C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>CPU Temp</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  borderTop: `3px solid ${colors.warning}`,
                }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{(thermalData.timResistance * 1000).toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>TIM R (mC/W)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  borderTop: `3px solid ${colors.success}`,
                }}>
                  <div style={{ ...typo.h3, color: thermalData.efficiency > 80 ? colors.success : colors.warning }}>
                    {thermalData.efficiency.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Efficiency</div>
                </div>
              </div>
            </div>

            {/* Discovery insight */}
            {thermalData.cpuTemp < 70 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Excellent thermal performance! The TIM is effectively filling gaps and conducting heat.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { playSound('click'); goToPhase('predict'); }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px',
                  border: `1px solid ${colors.border}`, background: 'transparent',
                  color: colors.textSecondary, cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, flex: 2 }}
              >
                Understand the Physics →
              </button>
            </div>
          </div>
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
            The Physics of Thermal Interfaces
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal Resistance Formula:</strong>
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
                fontFamily: 'monospace',
              }}>
                <span style={{ color: colors.accent, fontSize: '20px' }}>R = t / (k x A)</span>
              </div>
              <p style={{ marginBottom: '8px' }}>Where:</p>
              <ul style={{ paddingLeft: '24px', margin: '0 0 16px 0' }}>
                <li><strong style={{ color: colors.accent }}>R</strong> = Thermal resistance (C/W)</li>
                <li><strong style={{ color: colors.accent }}>t</strong> = Thickness of TIM layer (m)</li>
                <li><strong style={{ color: colors.accent }}>k</strong> = Thermal conductivity (W/mK)</li>
                <li><strong style={{ color: colors.accent }}>A</strong> = Contact area (m2)</li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              borderLeft: `4px solid ${colors.hot}`,
            }}>
              <h4 style={{ color: colors.hot, margin: '0 0 8px 0' }}>Why Air Gaps Are Bad</h4>
              <p style={{ margin: 0, color: colors.textSecondary }}>
                Air has thermal conductivity of only <strong>0.025 W/mK</strong>—about 300x lower than basic thermal paste (8 W/mK). Even microscopic air gaps significantly increase thermal resistance.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              borderLeft: `4px solid ${colors.success}`,
            }}>
              <h4 style={{ color: colors.success, margin: '0 0 8px 0' }}>TIM's Job</h4>
              <p style={{ margin: 0, color: colors.textSecondary }}>
                Thermal paste fills the microscopic valleys in both surfaces, replacing air with a much better thermal conductor. Thinner is better—you want just enough to fill gaps without adding bulk.
              </p>
            </div>
          </div>

          {/* Connect prediction to result */}
          {prediction && (
            <div style={{
              background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
                {prediction === 'b'
                  ? '✓ Your prediction was correct! Thermal paste IS needed to fill air gaps.'
                  : 'Your prediction was incorrect. Metal-to-metal contact leaves microscopic air gaps that severely limit heat transfer.'}
              </p>
            </div>
          )}

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight from Your Experiment
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              As you observed in the experiment, the goal isn't to add thermal conductivity—metal-to-metal contact is best. Your prediction was tested: the goal is to <strong>eliminate air gaps</strong> that would otherwise insulate your CPU from the cooler. The result shows that TIM fills microscopic surface irregularities. Formula: R = t / (k × A)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => { playSound('click'); goToPhase('play'); }}
              style={{
                flex: 1, padding: '14px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, flex: 2 }}
            >
              Compare TIM Types →
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
      { id: 'a', text: 'Always use liquid metal—highest conductivity means best cooling' },
      { id: 'b', text: 'It depends on the application—each type has trade-offs for different use cases' },
      { id: 'c', text: 'Thermal pads are always best—they are easiest to apply' },
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
              New Variable: TIM Types
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            There are many types of thermal interface materials: paste, pads, and liquid metal. Which should you use?
          </h2>

          {/* SVG comparison of TIM types */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <svg viewBox="0 0 300 160" style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
              <defs>
                <linearGradient id="twistBarGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#9CA3AF" />
                  <stop offset="100%" stopColor="#6B7280" />
                </linearGradient>
                <linearGradient id="twistBarGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <linearGradient id="twistBarGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FCD34D" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <rect width="300" height="160" fill="#12121a" rx="8" />
              {/* Y axis */}
              <line x1="40" y1="10" x2="40" y2="120" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
              {/* X axis */}
              <line x1="40" y1="120" x2="280" y2="120" stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((f, i) => (
                <line key={i} x1="40" y1={120 - f * 110} x2="280" y2={120 - f * 110}
                  stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              ))}
              {/* Bars: Paste (8 W/mK), Pad (5 W/mK), Liquid Metal (73 W/mK) */}
              {/* Normalize to max 73 */}
              <rect x="60" y={120 - (8/73)*110} width="40" height={(8/73)*110} fill="url(#twistBarGrad1)" rx="2" />
              <rect x="130" y={120 - (5/73)*110} width="40" height={(5/73)*110} fill="url(#twistBarGrad2)" rx="2" />
              <rect x="200" y={120 - (73/73)*110} width="40" height={(73/73)*110} fill="url(#twistBarGrad3)" rx="2" />
              {/* Labels */}
              <text x="80" y="135" fill="#9CA3AF" fontSize="11" textAnchor="middle">Paste</text>
              <text x="150" y="135" fill="#60A5FA" fontSize="11" textAnchor="middle">Pad</text>
              <text x="220" y="135" fill="#F59E0B" fontSize="11" textAnchor="middle">Liquid Metal</text>
              <text x="80" y={120 - (8/73)*110 - 4} fill="#e2e8f0" fontSize="11" textAnchor="middle">8 W/mK</text>
              <text x="150" y={120 - (5/73)*110 - 4} fill="#e2e8f0" fontSize="11" textAnchor="middle">5 W/mK</text>
              <text x="220" y={120 - (73/73)*110 - 4} fill="#e2e8f0" fontSize="11" textAnchor="middle">73 W/mK</text>
              {/* Axis label */}
              <text x="160" y="155" fill="#94a3b8" fontSize="11" textAnchor="middle">Conductivity (W/mK)</text>
              <text x="10" y="70" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90,10,70)">Conductivity</text>
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
              Compare the Materials →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const timTypes = {
      paste: { name: 'Thermal Paste', conductivity: 8, thickness: 0.08, icon: '🧴', color: '#9CA3AF', pros: ['Easy to apply', 'Good for flat surfaces', 'Widely available'], cons: ['Dries out over time', 'Can be messy', 'Needs reapplication'] },
      pad: { name: 'Thermal Pad', conductivity: 5, thickness: 1.0, icon: '📋', color: '#60A5FA', pros: ['Pre-cut shapes', 'Fills large gaps', 'Clean application'], cons: ['Lower conductivity', 'Less compression', 'Higher resistance'] },
      liquidmetal: { name: 'Liquid Metal', conductivity: 73, thickness: 0.03, icon: '💧', color: '#F59E0B', pros: ['Highest conductivity', 'Long lasting', 'Thinnest layer'], cons: ['Corrodes aluminum', 'Conductive (short risk)', 'Difficult to apply'] },
    };

    const currentTim = timTypes[selectedTimType];

    // Calculate temps for selected TIM
    const area = 0.001369;
    const thicknessM = currentTim.thickness / 1000;
    const timR = thicknessM / (currentTim.conductivity * area * 1000);
    const totalR = 0.01 + timR + 0.05;
    const cpuTemp = 25 + (150 * totalR);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              TIM Material Comparison
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Select a material type to see its thermal performance
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* TIM Type selector */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                {(Object.keys(timTypes) as Array<keyof typeof timTypes>).map(type => (
                  <button
                    key={type}
                    onClick={() => { playSound('click'); setSelectedTimType(type); }}
                    style={{
                      background: selectedTimType === type ? `${timTypes[type].color}22` : colors.bgSecondary,
                      border: `2px solid ${selectedTimType === type ? timTypes[type].color : colors.border}`,
                      borderRadius: '12px',
                      padding: '16px 24px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{timTypes[type].icon}</div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{timTypes[type].name}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{timTypes[type].conductivity} W/mK</div>
                  </button>
                ))}
              </div>

              {/* Material properties */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: currentTim.color,
                    textShadow: `0 0 10px ${currentTim.color}44`,
                    filter: `drop-shadow(0 0 8px ${currentTim.color}44)`,
                  }}>{currentTim.conductivity} W/mK</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Conductivity</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: currentTim.color,
                    textShadow: `0 0 10px ${currentTim.color}44`,
                    filter: `drop-shadow(0 0 8px ${currentTim.color}44)`,
                  }}>{currentTim.thickness}mm</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Typical Thickness</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: getTempColor(cpuTemp),
                    textShadow: `0 0 10px ${getTempColor(cpuTemp)}44`,
                    filter: `drop-shadow(0 0 8px ${getTempColor(cpuTemp)}44)`,
                  }}>{cpuTemp.toFixed(0)}C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>CPU Temp @ 150W</div>
                </div>
              </div>

              {/* Pros and Cons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{
                  background: `${colors.success}11`,
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px' }}>Pros</h4>
                  {currentTim.pros.map((pro, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: colors.success }}>+</span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>{pro}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  background: `${colors.error}11`,
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <h4 style={{ ...typo.small, color: colors.error, marginBottom: '8px' }}>Cons</h4>
                  {currentTim.cons.map((con, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: colors.error }}>-</span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SVG comparison chart */}
            <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
              <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto' }}>
                {/* Background */}
                <rect width="400" height="200" fill="#0a0a0f" rx="8" />
                {/* Title */}
                <text x="200" y="20" fill="#e2e8f0" fontSize="13" textAnchor="middle" fontWeight="600">Thermal Resistance Comparison</text>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((frac, i) => (
                  <line key={i} x1="60" y1={40 + frac * 130} x2="380" y2={40 + frac * 130}
                    stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                ))}
                {/* Bars for paste, pad, liquidmetal */}
                {[
                  { label: 'Paste', R: 0.0073, color: '#9CA3AF', x: 100 },
                  { label: 'Pad', R: 0.116, color: '#60A5FA', x: 200 },
                  { label: 'Liquid Metal', R: 0.0003, color: '#F59E0B', x: 300 },
                ].map(({ label, R, color, x }) => {
                  const maxR = 0.12;
                  const barH = (R / maxR) * 130;
                  const barY = 170 - barH;
                  const isSelected = (label === 'Paste' && selectedTimType === 'paste') ||
                    (label === 'Pad' && selectedTimType === 'pad') ||
                    (label === 'Liquid Metal' && selectedTimType === 'liquidmetal');
                  return (
                    <g key={label}>
                      <rect x={x - 25} y={barY} width="50" height={barH}
                        fill={color} opacity={isSelected ? 1 : 0.5} rx="3" />
                      <text x={x} y="185" fill="#e2e8f0" fontSize="11" textAnchor="middle">{label}</text>
                      <text x={x} y={barY - 5} fill={color} fontSize="11" textAnchor="middle">{R.toFixed(3)}</text>
                    </g>
                  );
                })}
                {/* Y axis */}
                <line x1="60" y1="40" x2="60" y2="170" stroke="#e2e8f0" strokeWidth="1" opacity="0.5" />
                <text x="55" y="170" fill="#e2e8f0" fontSize="11" textAnchor="end">0</text>
                <text x="55" y="40" fill="#e2e8f0" fontSize="11" textAnchor="end">0.12</text>
                <text x="30" y="105" fill="#e2e8f0" fontSize="11" textAnchor="middle" transform="rotate(-90, 30, 105)">R (C/W)</text>
              </svg>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Trade-offs →
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Choosing the Right TIM
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Thermal Paste: The All-Rounder</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Best for most CPU/GPU applications with flat, uniform surfaces. Good balance of performance and ease of use. Needs replacement every 2-5 years.
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Thermal Pads: The Gap Filler</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Best for bridging large gaps, uneven surfaces, or multiple components at different heights. Common for VRMs, SSDs, and laptop applications.
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Liquid Metal: The Performance King</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Best for extreme cooling needs where every degree matters. Requires copper or nickel-plated heatsinks—corrodes aluminum. Not for beginners.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Key Takeaway</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Application technique matters more than paste choice</strong> for most users. A thin, even layer of basic paste beats a poorly-applied premium paste. Only consider liquid metal for high-power, flat-surface applications where you understand the risks.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
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
        conceptName="Thermal Interface"
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
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                App {selectedApp + 1} of {realWorldApps.length} — {completedApps.filter(Boolean).length} completed
              </span>
            </div>

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
                  How TIM Physics Apply:
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
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
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

            {/* Got It button for current app */}
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
                marginBottom: '12px',
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
              }}
            >
              Got It! Continue →
            </button>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test →
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed ? 'You\'ve mastered Thermal Interface Materials!' : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
                Complete Lesson →
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  setConfirmedQuestions(new Set());
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review & Try Again
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} / 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

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

          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => {
              const isConfirmed = confirmedQuestions.has(currentQuestion);
              const isSelected = testAnswers[currentQuestion] === opt.id;
              const isCorrectOpt = opt.correct === true;
              let bg = colors.bgCard;
              let borderColor = colors.border;
              if (isConfirmed) {
                if (isCorrectOpt) { bg = `${colors.success}22`; borderColor = colors.success; }
                else if (isSelected) { bg = `${colors.error}22`; borderColor = colors.error; }
              } else if (isSelected) {
                bg = `${colors.accent}22`; borderColor = colors.accent;
              }
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (confirmedQuestions.has(currentQuestion)) return;
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: bg,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: confirmedQuestions.has(currentQuestion) ? 'default' : 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isSelected ? colors.accent : colors.bgSecondary,
                    color: isSelected ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {confirmedQuestions.has(currentQuestion) && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              background: testAnswers[currentQuestion] === question.options.find(o => o.correct)?.id
                ? `${colors.success}11` : `${colors.error}11`,
              border: `1px solid ${testAnswers[currentQuestion] === question.options.find(o => o.correct)?.id
                ? colors.success : colors.error}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.explanation}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                const isConfirmed = confirmedQuestions.has(currentQuestion);
                if (!isConfirmed) {
                  if (!testAnswers[currentQuestion]) return;
                  const newConfirmed = new Set(confirmedQuestions);
                  newConfirmed.add(currentQuestion);
                  setConfirmedQuestions(newConfirmed);
                  const correct = question.options.find(o => o.correct)?.id;
                  playSound(testAnswers[currentQuestion] === correct ? 'success' : 'failure');
                } else if (currentQuestion < 9) {
                  setCurrentQuestion(prev => prev + 1);
                } else {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }
              }}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: confirmedQuestions.has(currentQuestion) ? colors.accent : (testAnswers[currentQuestion] ? colors.accent : colors.border),
                color: 'white',
                cursor: confirmedQuestions.has(currentQuestion) || testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              {confirmedQuestions.has(currentQuestion)
                ? (currentQuestion < 9 ? 'Next Question' : 'Submit Test')
                : 'Check Answer'}
            </button>
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

        <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          TIM Expert!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how thermal interface materials work and why proper application is critical for effective cooling.
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
              'R = thickness / (k x A) formula',
              'Why air gaps cause thermal problems',
              'How TIM fills microscopic surface gaps',
              'Paste vs pads vs liquid metal trade-offs',
              'Application technique importance',
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
          <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}>
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ThermalInterfaceRenderer;
