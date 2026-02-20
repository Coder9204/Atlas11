'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Heat Sink Thermal Resistance - Complete 10-Phase Game
// Why managing heat flow through thermal resistance chains keeps CPUs alive
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

interface HeatSinkThermalRendererProps {
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
    scenario: "A gaming laptop is experiencing thermal throttling during intense gameplay. The user notices CPU temperatures hitting 100C despite having a clean cooling system with a copper heatsink.",
    question: "What is the most likely cause of the thermal problem?",
    options: [
      { id: 'a', label: "The copper heatsink has oxidized and lost conductivity" },
      { id: 'b', label: "Dried or poorly applied thermal paste creating high interface resistance", correct: true },
      { id: 'c', label: "The CPU is generating too much heat for any cooling solution" },
      { id: 'd', label: "Room temperature is affecting the cooling capacity" }
    ],
    explanation: "Thermal paste degrades over time and creates a high-resistance interface. Even with an excellent heatsink, a dried TIM layer (R_tim = 2+ K/W vs 0.2 K/W for fresh paste) can bottleneck the entire thermal chain, causing temperatures to spike."
  },
  {
    scenario: "An engineer is designing a heatsink for a 200W power amplifier. The thermal chain includes: junction-to-case (0.2 K/W), thermal pad (0.5 K/W), heatsink base (0.1 K/W), and fins-to-air (0.4 K/W).",
    question: "What is the expected temperature rise from junction to ambient?",
    options: [
      { id: 'a', label: "40 degrees Celsius (0.2 x 200)" },
      { id: 'b', label: "80 degrees Celsius (0.4 x 200)" },
      { id: 'c', label: "240 degrees Celsius (1.2 x 200)", correct: true },
      { id: 'd', label: "24 degrees Celsius (0.12 x 200)" }
    ],
    explanation: "Thermal resistances in series add up: R_total = 0.2 + 0.5 + 0.1 + 0.4 = 1.2 K/W. Temperature rise = Power x R_total = 200W x 1.2 K/W = 240 degrees C. This is why thermal design is critical for high-power applications."
  },
  {
    scenario: "A data center is comparing two heatsink designs for server CPUs. Design A has 40 thin fins packed tightly. Design B has 25 thicker fins with more spacing. Both have the same total surface area.",
    question: "Which design will likely perform better with active cooling?",
    options: [
      { id: 'a', label: "Design A - more fins always means better cooling" },
      { id: 'b', label: "Design B - better airflow between fins compensates for fewer fins", correct: true },
      { id: 'c', label: "Both identical - surface area is all that matters" },
      { id: 'd', label: "Neither - fin design doesn't affect thermal performance" }
    ],
    explanation: "Tightly packed fins restrict airflow and create boundary layer merging, reducing convective efficiency. With active cooling, adequate fin spacing allows air to flow freely and maintains thin boundary layers, resulting in better heat transfer despite fewer fins."
  },
  {
    scenario: "A technician replaces thermal paste on a CPU using a pea-sized amount in the center. The new temperatures are 5C higher than before the repaste, even with premium thermal compound.",
    question: "What most likely went wrong?",
    options: [
      { id: 'a', label: "Too much thermal paste was applied" },
      { id: 'b', label: "Air pockets formed due to incomplete spreading", correct: true },
      { id: 'c', label: "The thermal paste needs time to cure" },
      { id: 'd', label: "Premium thermal paste requires special application techniques" }
    ],
    explanation: "The pea method can leave air pockets if the heatsink isn't seated perfectly. Air has extremely high thermal resistance (~40 K/(W*m) vs 1-12 W/(m*K) for thermal paste), so even small air gaps dramatically increase total thermal resistance."
  },
  {
    scenario: "A GPU manufacturer is comparing a direct-die cooling solution (heatsink touching the GPU die) versus a traditional IHS (integrated heat spreader) design for their flagship card.",
    question: "What is the primary thermal advantage of direct-die cooling?",
    options: [
      { id: 'a', label: "It allows for larger heatsinks to be used" },
      { id: 'b', label: "Eliminates two thermal interfaces (die-to-IHS and IHS-to-TIM)", correct: true },
      { id: 'c', label: "It reduces the power consumption of the GPU" },
      { id: 'd', label: "Direct contact increases the thermal mass of the system" }
    ],
    explanation: "Each thermal interface adds resistance. The IHS adds: die-to-solder (0.1 K/W), IHS spreading (0.05 K/W), and IHS-to-TIM (0.2 K/W). Direct-die removes these layers, potentially saving 0.3+ K/W of thermal resistance for significant temperature improvements."
  },
  {
    scenario: "An overclocker notices that their CPU temperatures spike by 15C during the first seconds of a stress test, then stabilize. The cooling system is a large tower cooler with heat pipes.",
    question: "What thermal phenomenon causes this initial temperature spike?",
    options: [
      { id: 'a', label: "The heat pipes haven't started working yet", correct: true },
      { id: 'b', label: "The thermal paste is still warming up" },
      { id: 'c', label: "The fan speed controller is slow to respond" },
      { id: 'd', label: "The CPU is throttling to protect itself" }
    ],
    explanation: "Heat pipes require the working fluid to evaporate before they conduct heat efficiently. At startup, the fluid is cool and in liquid phase. Once it reaches operating temperature and begins the evaporation-condensation cycle, thermal conductivity dramatically improves."
  },
  {
    scenario: "A power electronics engineer must choose between thermal grease (1.5 mm thick, k=4 W/mK) and a thermal pad (2 mm thick, k=6 W/mK) for mounting IGBTs. Contact area is 10 cm^2.",
    question: "Which option provides lower thermal interface resistance?",
    options: [
      { id: 'a', label: "Thermal grease - lower thickness wins", correct: true },
      { id: 'b', label: "Thermal pad - higher conductivity wins" },
      { id: 'c', label: "Both are identical in thermal performance" },
      { id: 'd', label: "Cannot determine without knowing the power dissipation" }
    ],
    explanation: "R = thickness / (k x Area). Grease: 0.0015 / (4 x 0.001) = 0.375 K/W. Pad: 0.002 / (6 x 0.001) = 0.333 K/W. Actually the pad is slightly better! But the grease can fill surface irregularities better, often making it preferable in practice."
  },
  {
    scenario: "A server experiences intermittent overheating only during specific workloads that create hot spots on the CPU die. The overall package power remains within specs.",
    question: "What cooling enhancement would best address this issue?",
    options: [
      { id: 'a', label: "Increase fan speed for more airflow" },
      { id: 'b', label: "Use a vapor chamber instead of heat pipes", correct: true },
      { id: 'c', label: "Apply more thermal paste for better coverage" },
      { id: 'd', label: "Switch to a larger heatsink with more fins" }
    ],
    explanation: "Vapor chambers spread heat in 2D, quickly distributing hot spots across the entire base. Heat pipes only conduct along their axis. For workloads with concentrated heat, vapor chambers' superior spreading capability prevents localized overheating."
  },
  {
    scenario: "An LED luminaire designer is selecting between aluminum (k=205 W/mK) and copper (k=400 W/mK) for the heatsink. The heatsink weighs 200g in aluminum.",
    question: "Why might the designer choose aluminum despite copper's better conductivity?",
    options: [
      { id: 'a', label: "Aluminum is always better for LED applications" },
      { id: 'b', label: "Weight and cost benefits outweigh the conductivity difference for typical LED powers", correct: true },
      { id: 'c', label: "Copper cannot be used with LEDs due to corrosion" },
      { id: 'd', label: "Aluminum has better emissivity for radiation cooling" }
    ],
    explanation: "For most LED applications (5-50W), aluminum's conductivity is sufficient - the bottleneck is fin-to-air convection, not conduction. Copper would cost 3-4x more and weigh 3.3x more (copper density 8.96 vs aluminum 2.7 g/cm^3) with marginal temperature improvement."
  },
  {
    scenario: "A thermal engineer calculates that a 150W processor needs a heatsink with R_total < 0.4 K/W to stay under 85C at 25C ambient. Available heatsinks offer R_total = 0.35 K/W.",
    question: "What happens if the ambient temperature rises to 35C during summer?",
    options: [
      { id: 'a', label: "Nothing changes - heatsink performance is absolute" },
      { id: 'b', label: "CPU will exceed 85C since T_junction = T_ambient + P x R", correct: true },
      { id: 'c', label: "The heatsink becomes more efficient at higher ambient" },
      { id: 'd', label: "Thermal throttling will reduce power to compensate automatically" }
    ],
    explanation: "At 25C: T_j = 25 + (150 x 0.35) = 77.5C (safe). At 35C: T_j = 35 + (150 x 0.35) = 87.5C (exceeds limit). Thermal design must account for maximum ambient temperature. The 10C ambient increase directly translates to 10C higher junction temperature."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💻',
    title: 'CPU & GPU Cooling',
    short: 'High-performance computing thermal management',
    tagline: 'Keeping billions of transistors from melting',
    description: 'Modern processors pack billions of transistors into a chip smaller than a postage stamp, generating 65-350W of heat. Heat sinks with optimized fin arrays and thermal interface materials create a low-resistance path from silicon to air, preventing thermal throttling and extending component lifespan.',
    connection: 'The thermal resistance chain you explored - die to TIM to heatsink to fins to air - is exactly how every computer stays cool. Each layer adds resistance, and the total determines whether your CPU runs at full speed or throttles down to survive.',
    howItWorks: 'Heat conducts from the CPU die through the IHS (integrated heat spreader), across thermal paste, into the heatsink base, then spreads through fins where forced airflow carries it away. Tower coolers use heat pipes to transport heat vertically, while AIO liquid coolers move heat to a remote radiator.',
    stats: [
      { value: '350W', label: 'Max CPU TDP', icon: '🔥' },
      { value: '25%', label: 'TIM quality impact', icon: '💧' },
      { value: '65W', label: 'Typical CPU TDP', icon: '⚠️' }
    ],
    examples: ['Tower coolers with 6+ heat pipes', 'AIO liquid coolers with 360mm radiators', 'Vapor chamber laptop designs', 'Direct-die cooling for enthusiasts'],
    companies: ['Noctua', 'Corsair', 'NZXT', 'be quiet!'],
    futureImpact: 'As chiplet architectures and 3D stacking increase power density, advanced cooling like microfluidic cold plates and integrated thermoelectric coolers will become essential for next-generation processors.',
    color: '#f97316'
  },
  {
    icon: '💡',
    title: 'LED Thermal Management',
    short: 'Light output depends on junction temperature',
    tagline: 'Cool LEDs shine brighter and live longer',
    description: 'High-power LEDs convert only 30-50% of electrical energy to light - the rest becomes heat concentrated in a tiny junction. Without proper thermal management, junction temperatures soar, reducing light output by 10-20% and cutting lifespan from 50,000 hours to just a few thousand.',
    connection: 'LED thermal design uses the same series resistance concept: junction to substrate, substrate to heatsink, heatsink to air. The thermal resistance chain directly determines junction temperature and LED performance over time.',
    howItWorks: 'Heat flows from the LED die through a metal-core PCB or ceramic substrate, across thermal interface material, into an aluminum heatsink. Passive convection or active cooling dissipates heat to ambient. Lower total resistance means cooler junctions and brighter, longer-lasting LEDs.',
    stats: [
      { value: '50,000h', label: 'LED Lifespan', icon: '⏰' },
      { value: '10C Rule', label: 'Halves Life', icon: '📉' },
      { value: '150 lm/W', label: 'Cool LED Efficacy', icon: '💡' }
    ],
    examples: ['Stadium and arena lighting', 'Automotive headlights', 'Horticultural grow lights', 'Stage and entertainment'],
    companies: ['Cree', 'Lumileds', 'OSRAM', 'Seoul Semiconductor'],
    futureImpact: 'Micro-LED displays and laser-based lighting will push thermal management further, requiring graphene heat spreaders and phase-change materials integrated directly into LED packages.',
    color: '#eab308'
  },
  {
    icon: '⚡',
    title: 'Power Electronics',
    short: 'IGBTs and MOSFETs in industrial systems',
    tagline: 'Managing megawatts without meltdown',
    description: 'Power semiconductors in industrial drives, inverters, and power supplies switch thousands of amps at high frequencies. Switching and conduction losses generate intense heat that must be carefully managed to prevent thermal runaway and ensure decades of reliable operation.',
    connection: 'Industrial power modules specify junction-to-case thermal resistance as a critical datasheet parameter. Your understanding of series resistance helps engineers calculate exactly what heatsink is needed to keep devices within safe operating area.',
    howItWorks: 'Power modules mount to large extruded aluminum heatsinks using thermal grease or pads. High-power applications use liquid cold plates with circulating coolant. The thermal resistance from junction to ambient determines maximum continuous power - exceed it and the device fails.',
    stats: [
      { value: '175C', label: 'SiC Max Tj', icon: '🌡️' },
      { value: '500 kW', label: 'Drive Power', icon: '⚡' },
      { value: '0.05 K/W', label: 'Cold Plate R', icon: '❄️' }
    ],
    examples: ['Variable frequency drives', 'Welding inverters', 'UPS systems', 'Solar inverters'],
    companies: ['Infineon', 'Semikron', 'Danfoss', 'ABB'],
    futureImpact: 'Wide-bandgap semiconductors (SiC, GaN) operate at higher temperatures, enabling more compact designs but requiring advanced thermal solutions including double-sided cooling.',
    color: '#8b5cf6'
  },
  {
    icon: '🚗',
    title: 'EV Traction Inverters',
    short: 'Power electronics for electric vehicles',
    tagline: 'Thermal precision powers the EV revolution',
    description: 'EV traction inverters convert battery DC to AC for drive motors, handling 100-300kW in compact spaces. The power modules experience extreme thermal cycling as drivers accelerate and brake, making thermal management critical for range, performance, and reliability.',
    connection: 'EV inverters are the ultimate thermal design challenge. The resistance from power module through TIM and cold plate to coolant determines sustained power capability - directly affecting acceleration and hill climbing without derating.',
    howItWorks: 'Power modules bond to liquid-cooled cold plates with optimized pin-fin or jet-impingement designs. Coolant circulates through the cold plate to a front radiator. Advanced designs use direct substrate cooling to minimize thermal resistance between silicon and coolant.',
    stats: [
      { value: '300 kW', label: 'Peak Power', icon: '🏎️' },
      { value: '65C', label: 'Coolant Limit', icon: '💧' },
      { value: '1M Cycles', label: 'Thermal Cycles', icon: '🔄' }
    ],
    examples: ['Tesla integrated drive unit', 'Porsche Taycan 800V SiC', 'Commercial EV buses', 'Formula E race cars'],
    companies: ['Tesla', 'BorgWarner', 'Vitesco', 'Bosch'],
    futureImpact: 'Next-gen EVs will use 800V+ architectures and SiC devices, enabling faster charging. Immersion cooling and integrated motor-inverter designs will push thermal boundaries for greater power density.',
    color: '#10b981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const HeatSinkThermalRenderer: React.FC<HeatSinkThermalRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [cpuPower, setCpuPower] = useState(100); // Watts
  const [finCount, setFinCount] = useState(25);
  const [finHeight, setFinHeight] = useState(50); // mm
  const [fanSpeed, setFanSpeed] = useState(60); // percent
  const [thermalPaste, setThermalPaste] = useState<'none' | 'cheap' | 'premium'>('cheap');
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

  // Calculate thermal resistance chain
  const calcThermalResistance = useCallback(() => {
    const R_jc = 0.3; // Junction to case (fixed for CPU)
    const R_tim = thermalPaste === 'none' ? 2.0 : thermalPaste === 'cheap' ? 0.5 : 0.2;
    const R_base = 0.1; // Heatsink base spreading

    // Fin resistance depends on fin count, height, and airflow
    const finArea = finCount * finHeight * 0.05;
    const airflowFactor = 0.3 + (fanSpeed / 100) * 1.7;
    const finEfficiency = Math.min(1, 20 / finCount); // Diminishing returns
    const R_fins = 1.0 / (finArea * airflowFactor * 0.1 * finEfficiency);

    return {
      R_jc,
      R_tim,
      R_base,
      R_fins,
      total: R_jc + R_tim + R_base + R_fins
    };
  }, [finCount, finHeight, fanSpeed, thermalPaste]);

  const thermalRes = calcThermalResistance();
  const ambientTemp = 25;
  const cpuTemp = ambientTemp + cpuPower * thermalRes.total;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#f97316', // Orange
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#cbd5e1',
    textMuted: 'rgba(148,163,184,0.8)',
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
    hook: 'Explore',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Deep Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge',
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
        gameType: 'heatsink-thermal',
        gameTitle: 'Heat Sink Thermal Resistance',
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

  // Temperature status
  const getTempStatus = () => {
    if (cpuTemp < 60) return { status: 'Cool', color: colors.success };
    if (cpuTemp < 80) return { status: 'Warm', color: colors.warning };
    return { status: 'Hot!', color: colors.error };
  };

  const tempStatus = getTempStatus();

  // Heat Sink Visualization
  const HeatSinkVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const baseWidth = 180;
    const finWidth = Math.max(2, (baseWidth - 20) / finCount);
    const finSpacing = (baseWidth - finWidth * finCount) / (finCount + 1);

    const heatColor = cpuTemp < 60 ? '#22c55e' : cpuTemp < 80 ? '#f59e0b' : '#ef4444';

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="cpuHeatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={heatColor} />
            <stop offset="100%" stopColor={heatColor} stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="finMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
          <linearGradient id="baseMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="airflowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
          <filter id="heatGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <g opacity="0.2">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line key={`vg-${i}`} x1={80 + i * 60} y1="20" x2={80 + i * 60} y2={height - 20} stroke={colors.border} strokeDasharray="2,4" />
          ))}
        </g>

        {/* Heat waves rising from CPU */}
        {Array.from({ length: 4 }).map((_, i) => {
          const yOffset = (animationFrame * 0.8 + i * 30) % 120;
          const opacity = Math.max(0, 1 - yOffset / 120) * (cpuPower / 200);
          return (
            <ellipse
              key={`heat-${i}`}
              cx={width / 2}
              cy={height - 40 - yOffset}
              rx={12 + i * 4}
              ry={3}
              fill={heatColor}
              opacity={opacity * 0.4}
              filter="url(#heatGlow)"
            />
          );
        })}

        {/* CPU Die */}
        <rect
          x={width / 2 - 30}
          y={height - 65}
          width="60"
          height="25"
          fill="url(#cpuHeatGrad)"
          stroke="#374151"
          strokeWidth="2"
          rx="3"
          filter="url(#heatGlow)"
        />
        <text x={width / 2} y={height - 48} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">CPU DIE</text>

        {/* Thermal Paste */}
        <rect
          x={width / 2 - 45}
          y={height - 75}
          width="90"
          height="10"
          fill={thermalPaste === 'none' ? '#374151' : thermalPaste === 'cheap' ? '#6b7280' : '#a855f7'}
          rx="2"
        />

        {/* Heatsink Base */}
        <rect
          x={width / 2 - baseWidth / 2}
          y={height - 95}
          width={baseWidth}
          height="20"
          fill="url(#baseMetalGrad)"
          stroke="#374151"
          strokeWidth="1"
        />

        {/* Fins */}
        {Array.from({ length: finCount }).map((_, i) => {
          const x = width / 2 - baseWidth / 2 + finSpacing + i * (finWidth + finSpacing);
          const displayHeight = finHeight * 1.5;
          const heatIntensity = Math.max(0.3, 1 - Math.abs(i - finCount / 2) / (finCount / 2) * 0.5);

          return (
            <g key={`fin-${i}`}>
              <rect
                x={x}
                y={height - 95 - displayHeight}
                width={finWidth}
                height={displayHeight}
                fill="url(#finMetalGrad)"
                stroke="#374151"
                strokeWidth="0.5"
              />
              <rect
                x={x}
                y={height - 95 - displayHeight}
                width={finWidth}
                height={displayHeight}
                fill={heatColor}
                opacity={heatIntensity * 0.2}
              />
            </g>
          );
        })}

        {/* Airflow arrows */}
        {fanSpeed > 0 && Array.from({ length: 5 }).map((_, i) => {
          const x = (width / 2 - baseWidth / 2 - 30) + ((animationFrame * (fanSpeed / 30) + i * 50) % (baseWidth + 60));
          const y = height - 95 - finHeight * 0.75;
          return (
            <g key={`air-${i}`} transform={`translate(${x}, ${y})`}>
              <path
                d="M0,0 L15,0 L12,-4 M15,0 L12,4"
                fill="none"
                stroke="url(#airflowGrad)"
                strokeWidth="2"
                opacity={fanSpeed / 100}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Temperature Display */}
        <rect x={width - 110} y="20" width="90" height="60" rx="8" fill={colors.bgSecondary} stroke={tempStatus.color} strokeWidth="2" />
        <text x={width - 65} y="48" textAnchor="middle" fill={tempStatus.color} fontSize="22" fontWeight="bold">
          {cpuTemp.toFixed(0)}C
        </text>
        <text x={width - 65} y="68" textAnchor="middle" fill={tempStatus.color} fontSize="12" fontWeight="600">
          {tempStatus.status}
        </text>

        {/* Formula label */}
        <text x={width / 2} y={height - 20} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Temperature rise: ΔT = P × R_total = {(cpuPower * thermalRes.total).toFixed(1)}°C
        </text>

        {/* Thermal Resistance Chain */}
        <g transform="translate(20, 20)">
          <text x="0" y="0" fill={colors.textSecondary} fontSize="11" fontWeight="600">Thermal Chain:</text>
          <text x="0" y="16" fill={colors.textMuted} fontSize="11">R_jc: {thermalRes.R_jc.toFixed(2)}</text>
          <text x="0" y="32" fill={colors.textMuted} fontSize="11">R_tim: {thermalRes.R_tim.toFixed(2)}</text>
          <text x="0" y="48" fill={colors.textMuted} fontSize="11">R_base: {thermalRes.R_base.toFixed(2)}</text>
          <text x="0" y="64" fill={colors.textMuted} fontSize="11">R_fins: {thermalRes.R_fins.toFixed(2)}</text>
          <text x="0" y="84" fill={colors.accent} fontSize="12" fontWeight="700">Total: {thermalRes.total.toFixed(2)}</text>
        </g>

        {/* Power indicator - spaced below chain group to avoid overlap */}
        <text x="20" y="128" fill={colors.textSecondary} fontSize="11">Input: {cpuPower}W</text>
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
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

  // Navigation bar component
  const renderNavBar = () => (
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
        <span style={{ fontSize: '24px' }}>🔥</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Heat Sink Thermal</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // Bottom navigation bar with Back and Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < phaseOrder.length - 1;
    return (
      <nav style={{
        position: 'sticky',
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
          onClick={() => hasPrev && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!hasPrev}
          aria-label="Back"
          style={{
            background: 'transparent',
            border: `1px solid ${hasPrev ? colors.border : 'transparent'}`,
            borderRadius: '8px',
            padding: '8px 16px',
            color: hasPrev ? colors.textSecondary : 'transparent',
            cursor: hasPrev ? 'pointer' : 'default',
            fontSize: '14px',
          }}
        >
          Back
        </button>
        <span style={{ ...typo.small, color: colors.textSecondary }}>
          {currentIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={() => hasNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!hasNext}
          aria-label="Next"
          style={{
            background: hasNext ? colors.accent : 'transparent',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: hasNext ? 'white' : 'transparent',
            cursor: hasNext ? 'pointer' : 'default',
            fontSize: '14px',
            fontWeight: 600,
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
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '80px',
          textAlign: 'center',
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🔥💻❄️
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Heat Sink Thermal Resistance
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "A CPU generates 150 watts of heat in a chip smaller than your fingernail. Without cooling, it would hit <span style={{ color: colors.error }}>1000C in seconds</span>. How does heat escape through layers of metal and paste?"
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
              "Every interface between your CPU and the air is a thermal resistance. Like resistors in a circuit, they add up - and the total determines whether your chip runs cool or catches fire."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              - Thermal Engineering Fundamentals
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore Thermal Resistance
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Take the average of all thermal resistances' },
      { id: 'b', text: 'Add all thermal resistances together (like series resistors)', correct: true },
      { id: 'c', text: 'Use only the largest resistance - it dominates' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step 1 of 1 - Make your prediction
              </span>
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
              A CPU's heat must pass through: the die, thermal paste, heatsink base, and fins. How is total thermal resistance calculated?
            </h2>

            {/* Static SVG Diagram */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="480" height="200" viewBox="0 0 480 200" style={{ background: colors.bgCard, borderRadius: '12px' }}>
                {/* CPU Die block */}
                <rect x="20" y="80" width="70" height="40" rx="4" fill="#ef4444" opacity="0.8" />
                <text x="55" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">CPU Die</text>
                <text x="55" y="112" textAnchor="middle" fill="white" fontSize="11">0.3 K/W</text>
                {/* Arrow */}
                <line x1="90" y1="100" x2="120" y2="100" stroke="#6b7280" strokeWidth="2" />
                <polygon points="118,96 126,100 118,104" fill="#6b7280" />
                <text x="105" y="93" textAnchor="middle" fill="#6b7280" fontSize="11">+</text>
                {/* TIM block */}
                <rect x="126" y="80" width="70" height="40" rx="4" fill="#a855f7" opacity="0.8" />
                <text x="161" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">TIM</text>
                <text x="161" y="112" textAnchor="middle" fill="white" fontSize="11">0.5 K/W</text>
                {/* Arrow */}
                <line x1="196" y1="100" x2="226" y2="100" stroke="#6b7280" strokeWidth="2" />
                <polygon points="224,96 232,100 224,104" fill="#6b7280" />
                <text x="211" y="93" textAnchor="middle" fill="#6b7280" fontSize="11">+</text>
                {/* Base block */}
                <rect x="232" y="80" width="70" height="40" rx="4" fill="#6b7280" opacity="0.8" />
                <text x="267" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Base</text>
                <text x="267" y="112" textAnchor="middle" fill="white" fontSize="11">0.1 K/W</text>
                {/* Arrow */}
                <line x1="302" y1="100" x2="332" y2="100" stroke="#6b7280" strokeWidth="2" />
                <polygon points="330,96 338,100 330,104" fill="#6b7280" />
                <text x="317" y="93" textAnchor="middle" fill="#6b7280" fontSize="11">+</text>
                {/* Fins block */}
                <rect x="338" y="80" width="70" height="40" rx="4" fill="#3b82f6" opacity="0.8" />
                <text x="373" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Fins</text>
                <text x="373" y="112" textAnchor="middle" fill="white" fontSize="11">0.6 K/W</text>
                {/* Equals */}
                <text x="415" y="105" textAnchor="middle" fill="#9ca3af" fontSize="16" fontWeight="700">=</text>
                {/* Total */}
                <text x="455" y="97" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="700">?</text>
                <text x="455" y="112" textAnchor="middle" fill={colors.accent} fontSize="11">K/W</text>
                {/* Title */}
                <text x="240" y="30" textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">Thermal Resistance Chain (Series)</text>
                <text x="240" y="170" textAnchor="middle" fill={colors.textMuted} fontSize="11">R_total = R_jc + R_tim + R_base + R_fins</text>
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
      </div>
    );
  }

  // PLAY PHASE - Interactive Thermal Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          padding: '24px',
          paddingTop: '80px',
          paddingBottom: '88px',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Thermal Resistance Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust each parameter to see how it affects CPU temperature
            </p>

            {/* Why it matters */}
            <div style={{
              background: `${colors.success}15`,
              border: `1px solid ${colors.success}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why it matters:</strong> This is how every computer, phone, and electric vehicle stays cool. Engineers use these exact calculations to prevent thermal throttling and component failure in real products — from gaming GPUs to EV inverters.
              </p>
            </div>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Watch how each resistance value contributes to total thermal resistance. Try changing the thermal paste - notice how the R_tim value and temperature change together.
              </p>
            </div>

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
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <HeatSinkVisualization />
              </div>
            </div>

            {/* Before/after comparison */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '16px',
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ flex: 1, textAlign: 'center', borderRight: `1px solid ${colors.border}`, paddingRight: '16px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>No TIM (Air)</p>
                <p style={{ ...typo.h3, color: colors.error, margin: '4px 0' }}>{(ambientTemp + cpuPower * (0.3 + 2.0 + 0.1 + thermalRes.R_fins)).toFixed(0)}°C</p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>R_tim = 2.0 K/W</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>Premium TIM</p>
                <p style={{ ...typo.h3, color: colors.success, margin: '4px 0' }}>{(ambientTemp + cpuPower * (0.3 + 0.2 + 0.1 + thermalRes.R_fins)).toFixed(0)}°C</p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>R_tim = 0.2 K/W</p>
              </div>
            </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Power slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>CPU Power (Watts)</span>
                  <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>{cpuPower}W</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="250"
                  value={cpuPower}
                  onChange={(e) => setCpuPower(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: colors.accent, WebkitAppearance: 'none', appearance: 'none', touchAction: 'pan-y' }}
                />
              </div>

              {/* Thermal paste selector */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Thermal Interface Material
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'none', label: 'None (Air)', r: '2.0 K/W' },
                    { id: 'cheap', label: 'Basic', r: '0.5 K/W' },
                    { id: 'premium', label: 'Premium', r: '0.2 K/W' }
                  ].map(tim => (
                    <button
                      key={tim.id}
                      onClick={() => setThermalPaste(tim.id as typeof thermalPaste)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${thermalPaste === tim.id ? colors.accent : colors.border}`,
                        background: thermalPaste === tim.id ? colors.accent + '22' : 'transparent',
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                    >
                      <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{tim.label}</div>
                      <div style={{ ...typo.small, color: colors.textSecondary }}>{tim.r}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fin count slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Fin Count</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{finCount} fins</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={finCount}
                  onChange={(e) => setFinCount(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: colors.accent, WebkitAppearance: 'none', appearance: 'none', touchAction: 'pan-y' }}
                />
              </div>

              {/* Fan speed slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Fan Speed</span>
                  <span style={{ ...typo.small, color: '#60a5fa', fontWeight: 600 }}>{fanSpeed}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fanSpeed}
                  onChange={(e) => setFanSpeed(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: colors.accent, WebkitAppearance: 'none', appearance: 'none', touchAction: 'pan-y' }}
                />
              </div>
            </div>
            </div>

            {/* Discovery prompts */}
            {thermalPaste === 'none' && (
              <div style={{
                background: `${colors.error}22`,
                border: `1px solid ${colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                  No thermal paste! Air gaps create massive resistance (2+ K/W). Notice the temperature spike!
                </p>
              </div>
            )}

            {cpuTemp < 70 && thermalPaste === 'premium' && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Excellent cooling! Premium TIM and good airflow keep things frosty.
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
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Thermal Ohm's Law
          </h2>

          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              As you observed in the experiment: thermal resistances in a series chain add up, just like electrical resistors in series. You predicted how resistances combine — now let's understand the physics behind it.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontFamily: 'monospace', color: colors.accent, marginBottom: '16px' }}>
              Delta T = P x R_thermal
            </div>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              Temperature rise = Power x Total thermal resistance
            </div>
            <div style={{ marginTop: '16px', ...typo.small, color: colors.textSecondary }}>
              Just like V = IR in electrical circuits!
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Series Resistance Chain
            </h3>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px' }}>
                Heat flows through each layer in sequence. Total resistance is the <span style={{ color: colors.accent }}>sum of all layers</span>:
              </p>
              <div style={{ fontFamily: 'monospace', color: colors.accent, margin: '16px 0', fontSize: '14px' }}>
                R_total = R_junction + R_TIM + R_base + R_fins
              </div>
              <ul style={{ marginLeft: '20px', lineHeight: '2' }}>
                <li><strong>R_junction:</strong> Die to package (fixed by CPU design)</li>
                <li><strong>R_TIM:</strong> Thermal paste quality matters hugely!</li>
                <li><strong>R_base:</strong> Heatsink base spreading (copper vs aluminum)</li>
                <li><strong>R_fins:</strong> Surface area and airflow determine this</li>
              </ul>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Key Insight: The Weakest Link
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A single bad interface (like dried thermal paste at 2 K/W) can bottleneck your entire cooling system. No amount of fans or fins can compensate for a poor TIM layer!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Fin Paradox
          </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Cooling doubles - twice the fins, twice the surface area!' },
      { id: 'b', text: 'Cooling improves by 50% - more fins help but not linearly' },
      { id: 'c', text: 'Diminishing returns - much less than double improvement', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Step 1 of 1 - Make your prediction
              </span>
            </div>

            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Fin Design Trade-offs
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              You double the fin count from 25 to 50. What happens to cooling performance?
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="400" height="180" viewBox="0 0 400 180" style={{ background: colors.bgCard, borderRadius: '12px' }}>
                {/* 25 fins visualization */}
                <text x="100" y="25" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">25 Fins - Good Spacing</text>
                {Array.from({ length: 8 }).map((_, i) => (
                  <rect key={`f25-${i}`} x={40 + i * 17} y="35" width="8" height="80" rx="2" fill="#6b7280" opacity="0.8" />
                ))}
                <rect x="30" y="115" width="150" height="12" rx="2" fill="#9ca3af" />
                <text x="100" y="145" textAnchor="middle" fill={colors.success} fontSize="11">Airflow: Good</text>
                <text x="100" y="160" textAnchor="middle" fill={colors.textMuted} fontSize="11">R_fins ~ 0.5 K/W</text>

                {/* 50 fins visualization */}
                <text x="300" y="25" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="600">50 Fins - Packed</text>
                {Array.from({ length: 14 }).map((_, i) => (
                  <rect key={`f50-${i}`} x={222 + i * 9} y="35" width="5" height="80" rx="1" fill="#6b7280" opacity="0.8" />
                ))}
                <rect x="212" y="115" width="150" height="12" rx="2" fill="#9ca3af" />
                <text x="300" y="145" textAnchor="middle" fill={colors.warning} fontSize="11">Airflow: Restricted</text>
                <text x="300" y="160" textAnchor="middle" fill={colors.textMuted} fontSize="11">R_fins ~ 0.4 K/W</text>

                {/* VS divider */}
                <text x="200" y="95" textAnchor="middle" fill="#9ca3af" fontSize="16" fontWeight="700">vs</text>
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
              See the Fin Paradox
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const finEfficiency = Math.min(1, 20 / finCount);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          padding: '24px',
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            The Fin Count Paradox
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Watch how efficiency drops as fins get crowded
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Slide the fin count from 10 to 60. Notice how fin efficiency drops as spacing decreases - more fins doesn't always mean better cooling!
            </p>
          </div>

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
              <HeatSinkVisualization />
            </div>
          </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Fin count slider with efficiency display */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Fin Count</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{finCount} fins</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={finCount}
                onChange={(e) => setFinCount(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: colors.accent, WebkitAppearance: 'none', appearance: 'none', touchAction: 'pan-y' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>10 (sparse)</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>35 (optimal)</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>60 (packed)</span>
              </div>
            </div>

            {/* Efficiency indicator */}
            <div style={{
              background: finEfficiency > 0.7 ? `${colors.success}22` : finEfficiency > 0.4 ? `${colors.warning}22` : `${colors.error}22`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                ...typo.h2,
                color: finEfficiency > 0.7 ? colors.success : finEfficiency > 0.4 ? colors.warning : colors.error,
                marginBottom: '8px',
              }}>
                {(finEfficiency * 100).toFixed(0)}% Fin Efficiency
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {finCount <= 20 ? 'Wide spacing - each fin works at full potential!' :
                 finCount <= 35 ? 'Good balance - moderate airflow restriction' :
                 'Too crowded! Air cannot flow between fins effectively.'}
              </p>
            </div>

            {/* Airflow visualization description */}
            <div style={{
              padding: '12px',
              background: colors.bgSecondary,
              borderRadius: '8px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong>Boundary Layer Effect:</strong> Air flowing past each fin develops a slow-moving boundary layer. When fins are too close, these layers merge and block fresh air from reaching fin surfaces.
              </p>
            </div>
          </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Trade-offs
          </button>
        </div>

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{ flex: 1, padding: '24px', paddingTop: '80px', paddingBottom: '16px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Heatsink Design Optimization
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌬️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Boundary Layer Physics</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Air velocity drops to zero at the fin surface. This creates a <span style={{ color: colors.accent }}>thermal boundary layer</span> that insulates the fin. Fins too close together cause these layers to merge, blocking fresh air and killing convective heat transfer.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Optimal Fin Spacing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                For forced convection (with fans): <span style={{ color: colors.success }}>1-3mm spacing</span>. For natural convection (passive): <span style={{ color: colors.warning }}>5-10mm spacing</span>. Taller fins often beat more fins!
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💎</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Advanced Solutions</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Vapor chambers</strong> spread heat in 2D before reaching fins. <strong>Heat pipes</strong> transport heat to remote fin arrays. <strong>Liquid cooling</strong> bypasses air convection entirely with much lower thermal resistance.
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Heat Sink Thermal"
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
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '80px',
          paddingBottom: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress: App X of Y */}
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              App {selectedApp + 1} of {realWorldApps.length} — {completedCount} of {realWorldApps.length} explored
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

            {/* Scroll container for app cards */}
            <div style={{
              overflowY: 'auto',
              maxHeight: '600px',
              borderRadius: '16px',
            }}>
              {/* Selected app details */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
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
                    Connection to Thermal Resistance:
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {app.connection}
                  </p>
                </div>

                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                  {app.howItWorks}
                </p>

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
                      <div style={{ ...typo.small, color: colors.textSecondary }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                  Future Impact: {app.futureImpact}
                </p>

                {/* Got It button */}
                <button
                  onClick={() => {
                    playSound('click');
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                    // Move to next app if not at last
                    if (selectedApp < realWorldApps.length - 1) {
                      setSelectedApp(selectedApp + 1);
                    }
                  }}
                  style={{
                    background: completedApps[selectedApp] ? colors.success : colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '15px',
                    width: '100%',
                  }}
                >
                  {completedApps[selectedApp] ? '✓ Got It!' : 'Got It'}
                </button>
              </div>
            </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ flex: 1, padding: '24px', paddingTop: '80px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🔥' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Thermal Master!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand thermal resistance and heatsink design!'
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
                Review & Try Again
              </button>
            )}
          </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, padding: '24px', paddingTop: '80px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
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
          🔥
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.accent, marginBottom: '16px' }}>
          Thermal Resistance Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how heat flows through thermal systems and how to design effective cooling solutions.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Thermal Ohm\'s Law: Delta T = P x R',
              'Series resistance chains add up',
              'TIM quality is often the bottleneck',
              'Fin count diminishing returns',
              'Boundary layer effects on cooling',
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

export default HeatSinkThermalRenderer;
