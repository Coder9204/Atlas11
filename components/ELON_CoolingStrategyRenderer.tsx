'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// COOLING STRATEGY - Complete 10-Phase Game (ELON Game #10 of 36)
// Thermal management hierarchy — chip to facility level, heat through multiple mediums
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

interface ELON_CoolingStrategyRendererProps {
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
    scenario: "A data center in Phoenix, Arizona experiences outdoor temperatures of 45°C in summer. The facility uses air-side economization (free cooling) when outdoor temps are below 27°C.",
    question: "Approximately how many hours per year can this facility use free cooling?",
    options: [
      { id: 'a', label: "About 2,000 hours — roughly 23% of the year" },
      { id: 'b', label: "About 4,500 hours — roughly half the year", correct: true },
      { id: 'c', label: "About 7,500 hours — most of the year" },
      { id: 'd', label: "Zero hours — it's always too hot" }
    ],
    explanation: "Phoenix can achieve ~4,500 free cooling hours annually. Despite extreme summer heat, nights and winter months bring enough cool air. Nordic locations can exceed 8,000+ hours."
  },
  {
    scenario: "An NVIDIA GB200 NVL72 rack generates 120kW of heat. A standard server rack with air cooling handles about 10-15kW.",
    question: "Why can't traditional air cooling handle the GB200 rack?",
    options: [
      { id: 'a', label: "Air has too low a specific heat capacity — it physically cannot absorb enough heat per volume", correct: true },
      { id: 'b', label: "The fans would be too noisy" },
      { id: 'c', label: "Air cooling is just outdated technology" },
      { id: 'd', label: "The servers would need to be spaced too far apart" }
    ],
    explanation: "Air's volumetric heat capacity (~1.2 kJ/m³·K) is ~3,500x lower than water's (~4,180 kJ/m³·K). At 120kW, you'd need impossibly high airflow velocities."
  },
  {
    scenario: "A cooling tower uses evaporation to reject heat. The wet-bulb temperature today is 20°C and the dry-bulb temperature is 35°C.",
    question: "What is the significance of wet-bulb vs dry-bulb temperature for data center cooling?",
    options: [
      { id: 'a', label: "Wet-bulb determines the minimum temperature achievable by evaporative cooling", correct: true },
      { id: 'b', label: "Dry-bulb is always more important for cooling design" },
      { id: 'c', label: "They measure the same thing in different units" },
      { id: 'd', label: "Wet-bulb only matters for indoor humidity control" }
    ],
    explanation: "Wet-bulb temperature represents the lowest temp achievable through evaporation. A cooling tower can approach (within 3-5°C) the wet-bulb temp, not the dry-bulb. Lower wet-bulb = better cooling."
  },
  {
    scenario: "A hyperscale data center reports a PUE (Power Usage Effectiveness) of 1.10. It consumes 100MW total.",
    question: "How much power goes to the actual computing vs cooling and overhead?",
    options: [
      { id: 'a', label: "~91MW computing, ~9MW overhead", correct: true },
      { id: 'b', label: "~50MW computing, ~50MW overhead" },
      { id: 'c', label: "~100MW computing, ~10MW overhead" },
      { id: 'd', label: "~80MW computing, ~20MW overhead" }
    ],
    explanation: "PUE = Total Facility Power / IT Equipment Power. So IT Power = 100MW / 1.10 = ~91MW. The remaining ~9MW covers cooling, lighting, power distribution losses. Google achieves ~1.10 PUE."
  },
  {
    scenario: "A chip junction temperature must stay below 105°C. The thermal resistance chain is: junction-to-spreader (0.05°C/W), spreader-to-heatsink (0.10°C/W), heatsink-to-air (0.20°C/W). Ambient air is 35°C.",
    question: "What is the maximum power this chip can dissipate?",
    options: [
      { id: 'a', label: "200W — (105-35) / (0.05+0.10+0.20) = 200W", correct: true },
      { id: 'b', label: "700W — thermal resistance doesn't limit power" },
      { id: 'c', label: "50W — each resistance halves the capacity" },
      { id: 'd', label: "350W — only junction-to-spreader matters" }
    ],
    explanation: "Total thermal resistance = 0.05 + 0.10 + 0.20 = 0.35 °C/W. Max power = ΔT / R_total = (105-35) / 0.35 = 200W. This is exactly like Ohm's law: V=IR becomes ΔT=P×R."
  },
  {
    scenario: "Microsoft's Project Natick submerged a data center pod in the ocean off Scotland's coast. The servers were sealed in a nitrogen atmosphere.",
    question: "What was the primary cooling advantage of underwater deployment?",
    options: [
      { id: 'a', label: "Ocean water provides infinite heat sink at stable low temperature with zero water consumption", correct: true },
      { id: 'b', label: "Fish help circulate the water" },
      { id: 'c', label: "Underwater pressure improves chip performance" },
      { id: 'd', label: "Saltwater is a better coolant than freshwater" }
    ],
    explanation: "Ocean water at depth maintains ~12-15°C year-round. The massive thermal mass means effectively unlimited cooling capacity with PUE approaching 1.07 and zero freshwater consumption (WUE = 0)."
  },
  {
    scenario: "A facility in Singapore (1°N latitude) wants to build a data center. Average temperature is 27-32°C year-round with 80%+ humidity.",
    question: "Why did Singapore impose a moratorium on new data centers from 2019-2022?",
    options: [
      { id: 'a', label: "Near-zero free cooling hours and high water usage made DCs environmentally unsustainable", correct: true },
      { id: 'b', label: "Singapore ran out of physical space" },
      { id: 'c', label: "Internet bandwidth was insufficient" },
      { id: 'd', label: "Labor shortages prevented construction" }
    ],
    explanation: "Singapore's tropical climate means near-zero free cooling hours and high wet-bulb temperatures. Data centers consumed ~7% of Singapore's electricity. The PUE floor in such climates is ~1.3+."
  },
  {
    scenario: "Direct liquid cooling (DLC) uses cold plates mounted directly on CPUs/GPUs. The coolant (typically water-glycol mix) flows through micro-channels.",
    question: "How does DLC achieve 1000x better heat transfer than air cooling?",
    options: [
      { id: 'a', label: "Water has ~4,000x higher volumetric heat capacity and direct contact eliminates air gaps", correct: true },
      { id: 'b', label: "The pumps run 1000x faster than fans" },
      { id: 'c', label: "Liquid cooling uses special refrigerants" },
      { id: 'd', label: "The cold plates are made of diamond" }
    ],
    explanation: "Water's volumetric heat capacity (~4,180 kJ/m³·K) vs air (~1.2 kJ/m³·K) is ~3,500x higher. Combined with direct metal-to-liquid contact (no air gap thermal resistance), heat transfer improves dramatically."
  },
  {
    scenario: "Immersion cooling submerges entire servers in a dielectric fluid. The fluid boils at ~49°C (two-phase immersion) or stays liquid (single-phase).",
    question: "What is the key advantage of two-phase immersion over single-phase?",
    options: [
      { id: 'a', label: "Phase change (boiling) absorbs latent heat — 10-100x more heat per unit mass than sensible heating", correct: true },
      { id: 'b', label: "Two-phase fluid is cheaper" },
      { id: 'c', label: "Single-phase fluid is toxic" },
      { id: 'd', label: "Two-phase systems don't need pumps or condensers" }
    ],
    explanation: "When fluid boils, it absorbs latent heat of vaporization (~100-200 kJ/kg for engineered fluids). This is far more than sensible heating (specific heat × ΔT). Vapor rises, condenses on coils, returns — passive circulation."
  },
  {
    scenario: "Water Usage Effectiveness (WUE) measures liters of water consumed per kWh of IT energy. A typical evaporative-cooled DC has WUE of 1.8 L/kWh.",
    question: "A 100MW data center with WUE 1.8 consumes how much water daily?",
    options: [
      { id: 'a', label: "About 4.3 million liters per day — equivalent to ~1,700 households", correct: true },
      { id: 'b', label: "About 43,000 liters per day — a few swimming pools" },
      { id: 'c', label: "About 430 liters per day — a few bathtubs" },
      { id: 'd', label: "About 43 million liters per day — a small lake" }
    ],
    explanation: "100MW × 24h = 2,400 MWh/day = 2,400,000 kWh. At 1.8 L/kWh = 4,320,000 liters/day. This massive water consumption drives interest in air-cooled and liquid-cooled (closed loop) alternatives."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F5A5}\uFE0F',
    title: 'NVIDIA GB200 NVL72',
    short: 'Liquid-cooled GPU racks pushing 120kW per rack',
    tagline: 'Where air cooling hits a physical wall',
    description: 'The NVIDIA GB200 NVL72 rack integrates 72 Blackwell GPUs drawing 120kW total — 8-10x a traditional server rack. Air cooling physically cannot remove heat at this density. Direct liquid cooling with rear-door heat exchangers is mandatory, with coolant temperatures carefully managed to prevent condensation.',
    connection: 'Thermal resistance chain analysis shows air cooling fails above ~25kW/rack. At 120kW, only direct liquid cooling provides sufficient heat transfer coefficient.',
    howItWorks: 'Cold plates on each GPU connect to a liquid manifold. Warm coolant flows to facility-level cooling distribution units (CDUs) that reject heat to the building chilled water loop.',
    stats: [
      { value: '120kW', label: 'Per rack power', icon: '\u26A1' },
      { value: '10x', label: 'Density vs air-cooled', icon: '\u{1F4C8}' },
      { value: 'Liquid', label: 'Required cooling', icon: '\u{1F4A7}' }
    ],
    examples: ['GB200 NVL72 racks', 'DGX SuperPOD', 'HGX H100 clusters', 'Grace Hopper Superchip'],
    companies: ['NVIDIA', 'CoolIT Systems', 'Vertiv', 'Schneider Electric'],
    futureImpact: 'Next-gen GPUs will push 200kW+ per rack, making immersion cooling standard for AI training clusters.',
    color: '#76B900'
  },
  {
    icon: '\u{1F30A}',
    title: 'Microsoft Project Natick',
    short: 'Underwater data centers cooled by the ocean',
    tagline: 'The ocean as an infinite heat sink',
    description: 'Microsoft deployed a sealed data center pod on the seafloor off Scotland in 2018. Submerged in 35m of water, the pod used the ocean as a free, virtually unlimited cooling medium. The nitrogen atmosphere eliminated corrosion and humidity. Failure rates were 1/8th of land-based equivalents.',
    connection: 'Ocean water at depth maintains ~12-15°C year-round — far below the 27°C free cooling threshold. The thermal mass of the ocean provides effectively infinite heat absorption with zero water consumption.',
    howItWorks: 'Heat from servers transfers through the pod hull to seawater via heat exchangers. No chillers, no cooling towers, no water consumption.',
    stats: [
      { value: '0L', label: 'Water consumed', icon: '\u{1F4A7}' },
      { value: 'Ocean', label: 'Cooling medium', icon: '\u{1F30A}' },
      { value: 'PUE 1.07', label: 'Efficiency achieved', icon: '\u{1F3AF}' }
    ],
    examples: ['Phase 1 California', 'Phase 2 Scotland', 'Edge computing pods', 'Subsea cable hubs'],
    companies: ['Microsoft', 'Naval Group', 'Subsea 7', 'Green Revolution Cooling'],
    futureImpact: 'Coastal edge computing pods could bring low-latency compute to billions while eliminating cooling infrastructure entirely.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F1F8}\u{1F1EC}',
    title: 'Singapore DC Moratorium',
    short: 'When tropical climate makes data centers unsustainable',
    tagline: 'Zero free cooling hours, maximum challenge',
    description: 'Singapore imposed a moratorium on new data center construction from 2019-2022 because the tropical climate (27-32°C, 80%+ humidity year-round) made cooling incredibly energy-intensive. Data centers consumed ~7% of national electricity. The high wet-bulb temperature eliminates evaporative cooling advantage, creating a PUE floor of ~1.3.',
    connection: 'Free cooling hours collapse to near-zero in tropical climates. The wet-bulb temperature (26-28°C) is so close to dry-bulb that evaporative cooling provides almost no benefit.',
    howItWorks: 'Tropical DCs must rely on mechanical chillers year-round. New approaches include district cooling, tropical-optimized liquid cooling, and raised temperature computing.',
    stats: [
      { value: '0hr', label: 'Free cooling hours', icon: '\u2744\uFE0F' },
      { value: 'PUE 1.3', label: 'Best achievable', icon: '\u{1F4CA}' },
      { value: 'Tropical', label: 'Climate challenge', icon: '\u{1F334}' }
    ],
    examples: ['Equinix SG facilities', 'Digital Realty Singapore', 'AWS ap-southeast-1', 'Google Singapore DC'],
    companies: ['Equinix', 'Digital Realty', 'ST Telemedia', 'Keppel Data Centres'],
    futureImpact: 'Singapore now requires PUE < 1.3 for new DCs and is exploring floating data centers and tropical liquid cooling innovations.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F4E1}',
    title: 'SpaceX Starlink Thermal',
    short: 'Satellite thermal management in extreme environments',
    tagline: 'Cooling without air or water',
    description: 'Starlink ground stations operate in deserts at 45°C+ with phased array antennas generating significant heat from beamforming electronics. In space, Starlink satellites face the opposite problem — no convective cooling at all, only radiation. Passive cooling with heat pipes and radiative panels must handle rapid thermal cycling between sunlight (+150°C) and shadow (-150°C).',
    connection: 'Without air or water, thermal management relies on radiation (Q = εσAT⁴) and conduction through heat pipes. Thermal mass and phase-change materials buffer rapid temperature swings.',
    howItWorks: 'Ground stations use passive heatsinks with optimized fin geometry. Satellites use heat pipes, thermal coatings (high emissivity surfaces), and strategic orientation to radiate waste heat to deep space (3K).',
    stats: [
      { value: '45\u00B0C', label: 'Desert operating temp', icon: '\u{1F3DC}\uFE0F' },
      { value: 'Phased', label: 'Array heat source', icon: '\u{1F4E1}' },
      { value: 'Passive', label: 'Cooling method', icon: '\u2744\uFE0F' }
    ],
    examples: ['Starlink dishes', 'LEO satellites', 'Ground stations', 'Gateway nodes'],
    companies: ['SpaceX', 'Northrop Grumman', 'L3Harris', 'Raytheon'],
    futureImpact: 'Next-gen satellite constellations with onboard AI processing will require advanced radiative cooling and deployable thermal panels.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_CoolingStrategyRenderer: React.FC<ELON_CoolingStrategyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [ambientTemp, setAmbientTemp] = useState(15);
  const [gpuPower, setGpuPower] = useState(500);

  // Twist phase state
  const [twistGpuPower] = useState(1000);
  const [twistAmbientTemp, setTwistAmbientTemp] = useState(25);

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

  // Thermal calculations
  const freeCoolingThreshold = 27; // degrees C
  const calculateFreeCoolingHours = (ambient: number) => {
    // Approximate: hours below threshold based on climate profile
    if (ambient <= -10) return 8760; // 100% of year
    if (ambient >= 45) return 1200;  // ~14%
    const fraction = Math.max(0.14, Math.min(1.0, 1.0 - ((ambient - (-10)) / 55) * 0.86));
    return Math.round(fraction * 8760);
  };

  const calculatePUE = (ambient: number, power: number) => {
    // PUE worsens with higher ambient and higher power density
    const basePUE = 1.08;
    const ambientPenalty = Math.max(0, (ambient - 15) * 0.008);
    const powerPenalty = Math.max(0, (power - 300) * 0.0003);
    return Math.min(2.0, basePUE + ambientPenalty + powerPenalty);
  };

  const calculateThermalResistance = (power: number) => {
    // Total thermal resistance chain chip to atmosphere
    const junctionToSpreader = 0.05;  // °C/W
    const spreaderToHeatsink = 0.10;  // °C/W
    const heatsinkToAir = power > 700 ? 0.02 : 0.20; // liquid vs air
    const airToFacility = power > 700 ? 0.01 : 0.05;
    return { junctionToSpreader, spreaderToHeatsink, heatsinkToAir, airToFacility, total: junctionToSpreader + spreaderToHeatsink + heatsinkToAir + airToFacility };
  };

  const calculateJunctionTemp = (ambient: number, power: number) => {
    const r = calculateThermalResistance(power);
    return ambient + (power * r.total);
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
        gameType: 'cooling-strategy',
        gameTitle: 'Cooling Strategy',
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
  }, [phase, goToPhase]);

  // Computed values
  const freeCoolingHours = calculateFreeCoolingHours(ambientTemp);
  const pue = calculatePUE(ambientTemp, gpuPower);
  const junctionTemp = calculateJunctionTemp(ambientTemp, gpuPower);
  const thermalR = calculateThermalResistance(gpuPower);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.hot})`,
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
          data-navigation-dot="true"
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // ---------------------------------------------------------------------------
  // COOLING CHAIN SVG VISUALIZATION
  // Nested zoom: chip die -> heat spreader -> heatsink -> server airflow ->
  // hot aisle -> CRAH -> chiller -> cooling tower -> atmosphere
  // Temperature gradient red (95°C) to blue (ambient)
  // ---------------------------------------------------------------------------
  const CoolingChainVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 420;
    const tempNorm = (ambientTemp + 10) / 55; // 0 to 1
    const jTemp = junctionTemp;
    const coolingIsLiquid = gpuPower > 700;
    const freePct = freeCoolingHours / 8760;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="thermalGradChip" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="thermalGradSpreader" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="thermalGradHeatsink" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <linearGradient id="thermalGradAir" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="thermalGradAtmo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="pueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="tempScaleGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="30%" stopColor="#22C55E" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="chipGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="heatGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <g className="grid-lines">
        <g className="grid-lines">
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1="30" y1="140" x2={width - 30} y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1="30" y1="220" x2={width - 30} y2="220" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="340" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />

        </g>

        </g>
        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Thermal Chain: GPU Chip → Atmosphere
        </text>

        {/* Y-AXIS: Temperature scale with tick marks and values */}
        <rect x={width - 40} y={35} width="14" height="240" rx="7" fill="url(#tempScaleGrad)" opacity="0.7" />
        {/* Tick marks with temperature values */}
        <line x1={width - 48} y1={35} x2={width - 42} y2={35} stroke="#EF4444" strokeWidth="2" />
        <text x={width - 52} y={39} fill="#EF4444" fontSize="11" textAnchor="end" fontWeight="600">105°C</text>
        <line x1={width - 48} y1={95} x2={width - 42} y2={95} stroke="#F97316" strokeWidth="2" />
        <text x={width - 52} y={99} fill="#F97316" fontSize="11" textAnchor="end" fontWeight="600">75°C</text>
        <line x1={width - 48} y1={155} x2={width - 42} y2={155} stroke="#22C55E" strokeWidth="2" />
        <text x={width - 52} y={159} fill="#22C55E" fontSize="11" textAnchor="end" fontWeight="600">45°C</text>
        <line x1={width - 48} y1={215} x2={width - 42} y2={215} stroke="#3B82F6" strokeWidth="2" />
        <text x={width - 52} y={219} fill="#3B82F6" fontSize="11" textAnchor="end" fontWeight="600">25°C</text>
        <line x1={width - 48} y1={275} x2={width - 42} y2={275} stroke="#6366F1" strokeWidth="2" />
        <text x={width - 52} y={279} fill="#6366F1" fontSize="11" textAnchor="end" fontWeight="600">{ambientTemp}°C</text>

        <g className="thermal-chain">
        <g className="thermal-chain">
        {/* GPU CHIP DIE (innermost, hottest) */}
        <rect x={width / 2 - 45} y={34} width="90" height="30" rx="4" fill="url(#thermalGradChip)" filter="url(#chipGlow)" stroke="#FF6B6B" strokeWidth="1.5" />
        <text x={width / 2} y={47} fill="white" fontSize="11" fontWeight="800" textAnchor="middle">GPU Die ({gpuPower}W)</text>
        <text x={width / 2} y={60} fill="rgba(255,255,255,0.8)" fontSize="11" fontWeight="600" textAnchor="middle">{Math.min(105, jTemp).toFixed(0)}°C</text>
        {/* Fire indicator moved to right of chip to avoid overlap with left annotations */}
        <text x={width / 2 + 50} y={42} fill="#EF4444" fontSize="12" textAnchor="start" fontWeight="700">{'\u{1F525}'}</text>

        {/* HEAT SPREADER */}
        <rect x={width / 2 - 45} y={64} width="90" height="16" rx="3" fill="url(#thermalGradSpreader)" />
        <text x={width / 2} y={76} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">Heat Spreader</text>
        <text x={width / 2 + 55} y={76} fill="#F97316" fontSize="11" textAnchor="start">{Math.max(ambientTemp, jTemp - gpuPower * thermalR.junctionToSpreader).toFixed(0)}°C</text>

        {/* HEATSINK / COLD PLATE */}
        <rect x={width / 2 - 60} y={86} width="120" height="20" rx="4" fill="url(#thermalGradHeatsink)" />
        <text x={width / 2} y={100} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          {coolingIsLiquid ? 'Cold Plate (Liquid)' : 'Heatsink (Air)'}
        </text>

        {/* Connection arrows (thermal flow) - prominent */}
        <line x1={width / 2} y1={112} x2={width / 2} y2={122} stroke="#F59E0B" strokeWidth="3" opacity="0.8" />
        <line x1={width / 2 - 30} y1={112} x2={width / 2 - 50} y2={122} stroke="#F59E0B" strokeWidth="2" opacity="0.5" />
        <line x1={width / 2 + 30} y1={112} x2={width / 2 + 50} y2={122} stroke="#F59E0B" strokeWidth="2" opacity="0.5" />
        <text x={width / 2 + 55} y={119} fill="#F59E0B" fontSize="11" opacity="0.7">↓ heat flows down</text>

        {/* SERVER AIRFLOW / LIQUID LOOP */}
        <rect x={width / 2 - 80} y={122} width="160" height="22" rx="5" fill="url(#thermalGradAir)" opacity="0.8" />
        <text x={width / 2} y={137} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          {coolingIsLiquid ? 'Facility CDU Loop' : 'Server Airflow'}
        </text>

        {/* HOT AISLE */}
        <rect x={width / 2 - 100} y={152} width="200" height="18" rx="4" fill="url(#thermalGradAir)" opacity="0.5" />
        <text x={width / 2} y={165} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">Hot Aisle Containment</text>

        {/* CRAH / AHU */}
        <path d={`M ${width / 2} 172 L ${width / 2} 183`} stroke="#22C55E" strokeWidth="2" opacity="0.5" />
        <rect x={width / 2 - 70} y={183} width="140" height="18" rx="4" fill="url(#thermalGradAtmo)" opacity="0.6" />
        <text x={width / 2} y={196} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">CRAH / Air Handler</text>

        {/* CHILLER */}
        <path d={`M ${width / 2} 203 L ${width / 2} 213`} stroke="#3B82F6" strokeWidth="2" opacity="0.5" />
        <rect x={width / 2 - 55} y={213} width="110" height="18" rx="4" fill="url(#thermalGradAtmo)" opacity="0.5" />
        <text x={width / 2} y={226} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">Chiller Plant</text>

        {/* COOLING TOWER */}
        <path d={`M ${width / 2} 233 L ${width / 2} 243`} stroke="#6366F1" strokeWidth="2" opacity="0.4" />
        <rect x={width / 2 - 45} y={243} width="90" height="18" rx="4" fill="#3B82F6" opacity="0.4" />
        <text x={width / 2} y={256} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">Cooling Tower</text>

        {/* ATMOSPHERE */}
        <path d={`M ${width / 2} 263 L ${width / 2} 273`} stroke="#6366F1" strokeWidth="1.5" opacity="0.3" />
        <rect x={width / 2 - 65} y={273} width="130" height="16" rx="8" fill="#6366F1" opacity="0.2" />
        <text x={width / 2} y={284} fill="#94a3b8" fontSize="11" fontWeight="600" textAnchor="middle">Atmosphere ({ambientTemp}°C)</text>

        </g>

        </g>

        {/* Axis labels */}
        <text x={15} y={160} fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90, 15, 160)">Temperature (°C)</text>

        {/* Thermal resistance annotations - left side (14px gap min to avoid overlap) */}
        <text x={30} y={42} fill="#EF4444" fontSize="11" fontWeight="600">Die→Spreader</text>
        <text x={30} y={56} fill="#EF4444" fontSize="11">R = 0.05 °C/W</text>
        <text x={30} y={82} fill="#F97316" fontSize="11" fontWeight="600">Spreader→Sink</text>
        <text x={30} y={96} fill="#F97316" fontSize="11">R = 0.10 °C/W</text>
        <text x={30} y={120} fill="#F59E0B" fontSize="11" fontWeight="600">{coolingIsLiquid ? 'Plate→Coolant' : 'Sink→Air'}</text>
        <text x={30} y={134} fill="#F59E0B" fontSize="11">R = {thermalR.heatsinkToAir.toFixed(2)} °C/W</text>

        {/* Free cooling hours bar */}
        <text x={40} y={310} fill={colors.textPrimary} fontSize="11" fontWeight="600">Free Cooling</text>
        <rect x={130} y={300} width={width - 180} height={14} rx="7" fill={colors.border} />
        <rect x={130} y={300} width={(width - 180) * freePct} height={14} rx="7" fill="url(#thermalGradAtmo)" />
        <text x={135 + (width - 180) * freePct} y={311} fill="white" fontSize="11" fontWeight="600">
          {freeCoolingHours}h ({(freePct * 100).toFixed(0)}%)
        </text>

        
        {/* Interactive temperature marker */}
        <circle cx={130 + (width - 180) * freePct} cy={307} r="8" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#heatGlow)" />

        {/* PUE indicator */}
        <text x={40} y={335} fill={colors.textPrimary} fontSize="11" fontWeight="600">PUE</text>
        <rect x={130} y={325} width={width - 180} height={14} rx="7" fill={colors.border} />
        <rect x={130} y={325} width={(width - 180) * Math.min(1, (pue - 1.0) / 1.0)} height={14} rx="7" fill="url(#pueGrad)" />
        <text x={135 + (width - 180) * Math.min(1, (pue - 1.0) / 1.0)} y={336} fill="white" fontSize="11" fontWeight="600">
          {pue.toFixed(2)}
        </text>

        {/* Junction temp warning */}
        <circle cx={40} cy={345} r="8" fill={jTemp > 105 ? colors.error : jTemp > 90 ? colors.warning : colors.success} filter="url(#heatGlow)" />
        <text x={55} y={349} fill={jTemp > 105 ? colors.error : jTemp > 90 ? colors.warning : colors.success} fontSize="11" fontWeight="700">
          T_junction: {Math.min(jTemp, 150).toFixed(0)}°C {jTemp > 105 ? '— THERMAL THROTTLE!' : jTemp > 90 ? '— Warning' : '— OK'}
        </text>

        {/* Legend - clear color key */}
        <rect x={30} y={height - 18} width="50" height="10" rx="3" fill="url(#thermalGradChip)" />
        <text x={84} y={height - 9} fill="#EF4444" fontSize="11" fontWeight="600">Hot (95°C+)</text>
        <rect x={170} y={height - 18} width="50" height="10" rx="3" fill="url(#thermalGradAtmo)" />
        <text x={224} y={height - 9} fill="#3B82F6" fontSize="11" fontWeight="600">Cool ({ambientTemp}°C)</text>
        <text x={330} y={height - 9} fill="#22C55E" fontSize="11" fontWeight="600">R = Thermal Resistance</text>
      </svg>
    );
  };

  // TWIST VISUALIZATION - Direct Liquid Cooling required
  const TwistVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const twistJTemp = calculateJunctionTemp(twistAmbientTemp, twistGpuPower);
    const airJTemp = twistAmbientTemp + twistGpuPower * (0.05 + 0.10 + 0.20 + 0.05);
    const liquidJTemp = twistAmbientTemp + twistGpuPower * (0.05 + 0.10 + 0.02 + 0.01);
    const airFails = airJTemp > 105;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="airBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="liquidBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="failGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          1000W GPU: Air vs Liquid Cooling
        </text>

        {/* Air cooling bar */}
        <text x={40} y={55} fill="#94a3b8" fontSize="11" fontWeight="600">Air Cooling (R_total = 0.40°C/W)</text>
        <rect x={40} y={62} width={width - 80} height={28} rx="6" fill={colors.border} />
        <rect x={40} y={62} width={Math.min(width - 80, (width - 80) * (airJTemp / 200))} height={28} rx="6" fill={airFails ? 'url(#failGrad)' : 'url(#airBarGrad)'} filter={airFails ? 'url(#twistGlow)' : undefined} />
        <text x={width / 2} y={81} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">
          T_junction = {airJTemp.toFixed(0)}°C {airFails ? '— FAILS! > 105°C' : ''}
        </text>
        <circle cx={40 + Math.min(width - 80, (width - 80) * (airJTemp / 200))} cy={76} r="7" fill={airFails ? colors.error : colors.warning} stroke="white" strokeWidth="2" filter="url(#twistGlow)" />

        {/* Threshold line at 105°C */}
        <line x1={40 + (width - 80) * (105 / 200)} y1={55} x2={40 + (width - 80) * (105 / 200)} y2={95} stroke="#EF4444" strokeWidth="2" strokeDasharray="4,2" />
        <text x={40 + (width - 80) * (105 / 200)} y={105} fill="#EF4444" fontSize="11" textAnchor="middle">105°C limit</text>

        {/* Liquid cooling bar */}
        <text x={40} y={130} fill="#94a3b8" fontSize="11" fontWeight="600">Direct Liquid (R_total = 0.18°C/W)</text>
        <rect x={40} y={137} width={width - 80} height={28} rx="6" fill={colors.border} />
        <rect x={40} y={137} width={Math.min(width - 80, (width - 80) * (liquidJTemp / 200))} height={28} rx="6" fill="url(#liquidBarGrad)" />
        <text x={width / 2} y={156} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">
          T_junction = {liquidJTemp.toFixed(0)}°C — Safe
        </text>
        <circle cx={40 + Math.min(width - 80, (width - 80) * (liquidJTemp / 200))} cy={151} r="7" fill={colors.success} stroke="white" strokeWidth="2" filter="url(#twistGlow)" />

        {/* Comparison chart */}
        <text x={width / 2} y={195} fill={colors.textPrimary} fontSize="12" fontWeight="700" textAnchor="middle">
          Why Liquid Wins at High Power
        </text>

        {/* Thermal resistance comparison path */}
        <path
          d={`M 50 ${280 - 0} L 100 ${280 - 20} L 150 ${280 - 45} L 200 ${280 - 75} L 250 ${280 - 110} L 300 ${280 - 140} L 350 ${280 - 165} L 400 ${280 - 185} L ${width - 50} ${280 - 200}`}
          stroke="#EF4444"
          fill="none"
          strokeWidth="2"
          opacity="0.7"
        />
        <text x={width - 45} y={280 - 205} fill="#EF4444" fontSize="11">Air</text>

        <path
          d={`M 50 ${280 - 0} L 100 ${280 - 8} L 150 ${280 - 18} L 200 ${280 - 30} L 250 ${280 - 42} L 300 ${280 - 55} L 350 ${280 - 66} L 400 ${280 - 75} L ${width - 50} ${280 - 82}`}
          stroke="#3B82F6"
          fill="none"
          strokeWidth="2"
          opacity="0.7"
        />
        <text x={width - 45} y={280 - 77} fill="#3B82F6" fontSize="11">Liquid</text>

        {/* Current power marker */}
        <circle cx={50 + ((twistGpuPower - 100) / 900) * (width - 100)} cy={280 - ((twistGpuPower - 100) / 900) * 200} r="8" fill="#EF4444" stroke="white" strokeWidth="2" filter="url(#twistGlow)" />
        <circle cx={50 + ((twistGpuPower - 100) / 900) * (width - 100)} cy={280 - ((twistGpuPower - 100) / 900) * 82} r="8" fill="#3B82F6" stroke="white" strokeWidth="2" filter="url(#twistGlow)" />

        <text x={40} y={290} fill="#94a3b8" fontSize="11">100W</text>
        <text x={width - 60} y={290} fill="#94a3b8" fontSize="11">1000W</text>
        <text x={width / 2} y={290} fill="#94a3b8" fontSize="11" textAnchor="middle">GPU Power (W)</text>

        {/* Key insight */}
        <rect x={40} y={height - 24} width={width - 80} height="18" rx="4" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.3)" />
        <text x={width / 2} y={height - 11} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          At 1000W: Air = {airJTemp.toFixed(0)}°C (FAIL) | Liquid = {liquidJTemp.toFixed(0)}°C (OK)
        </text>
      </svg>
    );
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F321}\uFE0F\u2744\uFE0F'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Cooling Strategy
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"Every watt consumed by a data center becomes heat that must be removed. From the "}
            <span style={{ color: colors.hot }}>95°C chip junction</span>
            {" to the "}
            <span style={{ color: colors.cold }}>ambient atmosphere</span>
            {", heat must traverse an intricate chain of thermal resistance."}
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Thermal management is the hidden bottleneck of the AI revolution. You can design the fastest chip in the world, but if you can't remove the heat, it throttles to a fraction of its capability."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Data Center Thermal Engineering
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Works fine with big fans — just need enough airflow' },
      { id: 'b', text: 'Air physically cannot remove heat fast enough — liquid cooling required' },
      { id: 'c', text: 'Just needs more air handlers and a bigger CRAH unit' },
      { id: 'd', text: 'Open a window — ambient air is the simplest solution' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              An NVIDIA GB200 NVL72 rack draws 120kW. If we tried to cool it with air alone, what happens?
            </h2>

            {/* Static SVG */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictHeatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <linearGradient id="rackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#1F2937" />
                  </linearGradient>
                </defs>
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">GB200 NVL72: 120kW in a Single Rack</text>

                {/* Standard rack */}
                <rect x="60" y="40" width="80" height="130" rx="4" fill="url(#rackGrad)" stroke="#6B7280" strokeWidth="1" />
                <text x="100" y="60" textAnchor="middle" fill="#94a3b8" fontSize="11">Standard</text>
                <text x="100" y="75" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="700">10-15kW</text>
                <rect x="70" y="85" width="60" height="4" rx="2" fill="#3B82F6" opacity="0.4" />
                <rect x="70" y="95" width="60" height="4" rx="2" fill="#3B82F6" opacity="0.4" />
                <rect x="70" y="105" width="60" height="4" rx="2" fill="#3B82F6" opacity="0.3" />
                <text x="100" y="155" textAnchor="middle" fill="#94a3b8" fontSize="11">Air OK</text>

                {/* GB200 rack */}
                <rect x="260" y="40" width="80" height="130" rx="4" fill="url(#rackGrad)" stroke="#EF4444" strokeWidth="2" />
                <text x="300" y="60" textAnchor="middle" fill="#94a3b8" fontSize="11">GB200</text>
                <text x="300" y="75" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">120kW!</text>
                <rect x="270" y="85" width="60" height="4" rx="2" fill="#EF4444" opacity="0.8" />
                <rect x="270" y="92" width="60" height="4" rx="2" fill="#EF4444" opacity="0.8" />
                <rect x="270" y="99" width="60" height="4" rx="2" fill="#F97316" opacity="0.7" />
                <rect x="270" y="106" width="60" height="4" rx="2" fill="#F97316" opacity="0.7" />
                <rect x="270" y="113" width="60" height="4" rx="2" fill="#F59E0B" opacity="0.6" />
                <rect x="270" y="120" width="60" height="4" rx="2" fill="#F59E0B" opacity="0.6" />
                <rect x="270" y="127" width="60" height="4" rx="2" fill="#F59E0B" opacity="0.5" />
                <rect x="270" y="134" width="60" height="4" rx="2" fill="#22C55E" opacity="0.4" />
                <rect x="270" y="141" width="60" height="4" rx="2" fill="#22C55E" opacity="0.3" />
                <rect x="270" y="148" width="60" height="4" rx="2" fill="#3B82F6" opacity="0.3" />
                <text x="300" y="165" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">Air = ???</text>

                {/* Arrow comparing */}
                <text x="200" y="115" textAnchor="middle" fill="#F97316" fontSize="24" fontWeight="700">8-10x</text>
                <text x="200" y="135" textAnchor="middle" fill="#94a3b8" fontSize="11">more heat</text>

                <text x="200" y="190" textAnchor="middle" fill="#94a3b8" fontSize="11">Can air cooling handle 120kW?</text>
              </svg>
            </div>

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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Thermal Chain Simulator
  if (phase === 'play') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Thermal Chain Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Data center cooling consumes 30-40% of total facility power. Understanding the thermal resistance chain from chip to atmosphere reveals why cooling strategy is the hidden bottleneck of the AI revolution.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal Resistance (R)</strong> is the opposition to heat flow, measured in °C/W. Like electrical resistance: ΔT = P × R.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>PUE (Power Usage Effectiveness)</strong> is the ratio of total facility power to IT equipment power. PUE 1.0 = perfect. PUE 2.0 = half the power goes to cooling.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.cold }}>Free Cooling</strong> uses outside air directly when ambient temperature is below the setpoint, eliminating the need for energy-hungry chillers.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization displays the complete thermal resistance chain. Watch how junction temperature changes as you adjust the sliders — observe how higher ambient temperature causes PUE to worsen and free cooling hours to decrease.
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <CoolingChainVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Ambient Temperature slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Ambient Temperature</span>
                      <span style={{ ...typo.small, color: ambientTemp > 30 ? colors.hot : ambientTemp < 5 ? colors.cold : colors.accent, fontWeight: 600 }}>
                        {ambientTemp}°C
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="45"
                      value={ambientTemp}
                      onChange={(e) => setAmbientTemp(parseInt(e.target.value))}
                      onInput={(e) => setAmbientTemp(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Ambient Temperature"
                      style={sliderStyle(colors.accent, ambientTemp, -10, 45)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.cold }}>-10°C (Nordic)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>15°C (Temperate)</span>
                      <span style={{ ...typo.small, color: colors.hot }}>45°C (Desert)</span>
                    </div>
                  </div>

                  {/* GPU Power slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>GPU Power per Chip</span>
                      <span style={{ ...typo.small, color: gpuPower > 700 ? colors.hot : colors.accent, fontWeight: 600 }}>
                        {gpuPower}W {gpuPower > 700 ? '(Liquid Required)' : '(Air Feasible)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={gpuPower}
                      onChange={(e) => setGpuPower(parseInt(e.target.value))}
                      onInput={(e) => setGpuPower(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="GPU Power"
                      style={sliderStyle(colors.warning, gpuPower, 100, 1000)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>100W</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500W</span>
                      <span style={{ ...typo.small, color: colors.hot }}>1000W</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.cold }}>{freeCoolingHours}h</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Free Cooling</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: pue < 1.2 ? colors.success : pue < 1.5 ? colors.warning : colors.error }}>{pue.toFixed(2)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>PUE</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: junctionTemp > 105 ? colors.error : junctionTemp > 90 ? colors.warning : colors.success }}>
                        {Math.min(junctionTemp, 150).toFixed(0)}°C
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>T_junction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Data Center Cooling
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Air physically cannot remove 120kW from a single rack. The volumetric heat capacity of air is ~3,500x lower than water, making liquid cooling mandatory at this density.'
                : 'As you observed in the experiment, air cooling hits a physical wall. Your prediction was tested against the thermal resistance chain — at 120kW per rack, the result shows junction temperatures far above safe limits.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>{"T_junction = T_ambient + P \u00D7 R_total"}</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Junction temperature equals <span style={{ color: colors.cold }}>ambient temperature</span> plus <span style={{ color: colors.hot }}>power</span> times <span style={{ color: colors.accent }}>total thermal resistance</span>. This is exactly like Ohm's law: voltage = current x resistance becomes temperature = power x resistance.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {"Air: T = 35 + 500 \u00D7 0.40 = 235\u00B0C \u2014 IMPOSSIBLE"}
                  <br />
                  {"Liquid: T = 35 + 500 \u00D7 0.18 = 125\u00B0C \u2014 Marginal"}
                  <br />
                  {"Advanced Liquid: T = 35 + 500 \u00D7 0.10 = 85\u00B0C \u2014 Safe"}
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Air Fails at High Power
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                {"Air's volumetric heat capacity (~1.2 kJ/m\u00B3\u00B7K) is ~3,500x lower than water's (~4,180 kJ/m\u00B3\u00B7K). At 120kW per rack, you'd need impossibly high airflow — roughly 20,000+ CFM through a single rack — creating hurricane-force winds that would damage components."}
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                The Cooling Hierarchy
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Air Cooling', limit: '15kW/rack', color: '#3B82F6' },
                  { name: 'Rear Door HX', limit: '40kW/rack', color: '#22C55E' },
                  { name: 'Direct Liquid', limit: '100kW+/rack', color: '#F97316' },
                  { name: 'Immersion', limit: '200kW+/rack', color: '#EF4444' },
                  { name: 'Two-Phase', limit: '300kW+/rack', color: '#8B5CF6' },
                  { name: 'Free Cooling', limit: 'Climate dep.', color: '#06B6D4' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: item.color }}>{item.limit}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Just double the fan speed — air cooling scales linearly' },
      { id: 'b', text: 'Switch from air to direct liquid cooling — fundamentally different approach required' },
      { id: 'c', text: 'Use bigger heatsinks — more surface area solves everything' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: GPU Power Doubles to 1000W
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              When GPU power doubles to 1000W per chip, the thermal solution must...
            </h2>

            {/* Static SVG */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistPredictGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">GPU Power Evolution</text>
                <rect x="30" y="35" width="100" height="35" rx="4" fill="#3B82F6" opacity="0.5" />
                <text x="80" y="57" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">300W (2022)</text>
                <rect x="150" y="35" width="100" height="35" rx="4" fill="#F59E0B" opacity="0.6" />
                <text x="200" y="57" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">500W (2024)</text>
                <rect x="270" y="30" width="100" height="45" rx="4" fill="url(#twistPredictGrad)" />
                <text x="320" y="57" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">1000W (2026)</text>
                <text x="200" y="100" textAnchor="middle" fill="#94a3b8" fontSize="11">Air cooling impossible above ~700W</text>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Air vs Liquid at 1000W
  if (phase === 'twist_play') {
    const twistJTemp = calculateJunctionTemp(twistAmbientTemp, twistGpuPower);
    const airJTemp = twistAmbientTemp + twistGpuPower * (0.05 + 0.10 + 0.20 + 0.05);
    const liquidJTemp = twistAmbientTemp + twistGpuPower * (0.05 + 0.10 + 0.02 + 0.01);

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              1000W GPU: The Liquid Cooling Imperative
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              See why doubling GPU power forces a fundamental change in cooling approach
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* SVG Visualization */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <TwistVisualization />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The chart compares air cooling vs direct liquid cooling for a 1000W GPU. Air cooling produces dangerously high junction temperatures that exceed the 105°C thermal limit, while liquid cooling keeps temps safe by slashing thermal resistance.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you raise the ambient temperature slider, both junction temperatures climb, but air cooling crosses the failure threshold much sooner. Lowering ambient temp shows how free cooling and climate selection can buy significant thermal headroom.</p>
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Ambient temp slider for twist */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Ambient Temperature</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistAmbientTemp}°C</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="45"
                      value={twistAmbientTemp}
                      onChange={(e) => setTwistAmbientTemp(parseInt(e.target.value))}
                      onInput={(e) => setTwistAmbientTemp(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Twist Ambient Temperature"
                      style={sliderStyle(colors.accent, twistAmbientTemp, -10, 45)}
                    />
                  </div>

                  {/* Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{airJTemp.toFixed(0)}°C</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Air Junction Temp</div>
                      <div style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>FAILS</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{liquidJTemp.toFixed(0)}°C</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Liquid Junction Temp</div>
                      <div style={{ ...typo.small, color: liquidJTemp > 105 ? colors.error : colors.success, fontWeight: 600 }}>{liquidJTemp > 105 ? 'MARGINAL' : 'SAFE'}</div>
                    </div>
                  </div>

                  {/* Key insight */}
                  <div style={{
                    background: `${colors.error}22`,
                    border: `1px solid ${colors.error}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      <strong style={{ color: colors.error }}>At 1000W per GPU:</strong> Air cooling produces {airJTemp.toFixed(0)}°C junction temperature — {(airJTemp - 105).toFixed(0)}°C above the thermal limit. Direct liquid cooling reduces this to {liquidJTemp.toFixed(0)}°C by cutting thermal resistance from 0.40 to 0.18 °C/W.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Transition
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              The Cooling Paradigm Shift
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Air to Liquid: A Phase Transition</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  {"Just as water undergoes a phase transition at 100\u00B0C, data center cooling undergoes a paradigm shift above ~700W per chip. Air cooling doesn't just become less efficient — it becomes physically impossible. The thermal resistance of air (R \u2248 0.20\u00B0C/W for heatsink-to-air) creates junction temperatures that would destroy the chip. Direct liquid cooling (R \u2248 0.02\u00B0C/W) reduces this resistance by 10x."}
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Infrastructure Challenge</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Switching to liquid cooling requires re-plumbing entire data centers. Cold plates, manifolds, coolant distribution units (CDUs), and leak detection systems must replace traditional CRAH units and raised-floor air delivery. This is a multi-billion dollar infrastructure transition across the industry.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The AI revolution is fundamentally a thermal management challenge. Every doubling of GPU power requires a corresponding leap in cooling technology. The companies that solve cooling at scale will enable — or constrain — the pace of AI advancement.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Cooling Strategy"
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
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app or test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1) {
                        // All apps completed, advance to test
                        setTimeout(() => goToPhase('test'), 400);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '80px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand data center thermal management and cooling strategy!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Cooling Strategy
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of thermal management to real-world data center scenarios. Consider thermal resistance chains, free cooling economics, PUE optimization, and the physical limits of different cooling technologies as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
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
                  padding: '14px 24px',
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
          {renderNavDots()}
        </NavigationBar>
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Cooling Strategy Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the thermal management hierarchy from chip to atmosphere, and why cooling strategy is the hidden bottleneck of modern computing.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Thermal resistance chain: T_junc = T_amb + P x R_total',
                'Air cooling fails above ~700W per chip — liquid required',
                'Free cooling hours depend on climate and wet-bulb temp',
                'PUE measures total facility efficiency',
                'WUE tracks water consumption per kWh',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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
                minHeight: '44px',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_CoolingStrategyRenderer;
