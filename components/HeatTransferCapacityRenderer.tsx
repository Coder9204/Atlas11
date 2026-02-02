'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// HEAT TRANSFER CAPACITY RENDERER - THERMAL PHYSICS
// Complete 10-phase learning structure
// ============================================================================

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

interface HeatTransferCapacityRendererProps {
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

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "You're designing a thermal storage system for a solar power plant that needs to store energy during the day and release it at night.",
    question: "What property determines how much thermal energy a material can store per unit mass for a given temperature change?",
    options: [
      { id: 'a', label: 'Thermal conductivity - how fast heat spreads through the material' },
      { id: 'b', label: 'Specific heat capacity - the energy required to raise 1 kg by 1 degree', correct: true },
      { id: 'c', label: 'Density - how much mass fits in a given volume' },
      { id: 'd', label: 'Melting point - the temperature at which the material changes phase' }
    ],
    explanation: "Specific heat capacity (c) directly determines thermal energy storage. The equation Q = mcDeltaT shows that for a given mass and temperature change, materials with higher specific heat capacity store more energy."
  },
  {
    scenario: "A swimmer exits a pool on a hot summer day. The air temperature is 35C and the water was 28C.",
    question: "Why does the swimmer feel cold despite the air being warmer than the pool water?",
    options: [
      { id: 'a', label: 'The pool water lowered their core body temperature significantly' },
      { id: 'b', label: 'Evaporating water absorbs heat from their skin, and water has high heat capacity', correct: true },
      { id: 'c', label: 'Air has higher thermal conductivity than water' },
      { id: 'd', label: 'The swimmer is experiencing psychological discomfort' }
    ],
    explanation: "Water's exceptionally high specific heat capacity (4.18 J/gC) means evaporation requires substantial energy. As water evaporates from the swimmer's skin, it absorbs this energy as latent heat, rapidly cooling the skin."
  },
  {
    scenario: "A professional chef is preparing a steak and has two pans available: a thin aluminum pan and a heavy cast iron skillet, both preheated to 230C.",
    question: "Why do professional chefs prefer cast iron for searing steaks despite aluminum heating up faster?",
    options: [
      { id: 'a', label: 'Cast iron has higher thermal conductivity for even heat distribution' },
      { id: 'b', label: 'Cast iron is cheaper and more durable than aluminum' },
      { id: 'c', label: 'Cast iron has greater thermal mass, maintaining temperature when cold food is added', correct: true },
      { id: 'd', label: 'Aluminum reacts chemically with meat proteins' }
    ],
    explanation: "Thermal mass (mass x specific heat capacity) determines how much energy a pan stores. Cast iron's high mass means it stores substantial thermal energy. When a cold steak hits the pan, aluminum's temperature drops dramatically, but cast iron maintains its heat."
  },
  {
    scenario: "An architect is designing a passive solar home in a desert climate with hot days and cold nights.",
    question: "What thermal strategy would best regulate indoor temperatures throughout the day-night cycle?",
    options: [
      { id: 'a', label: 'Use highly insulating materials to prevent all heat transfer' },
      { id: 'b', label: 'Install large south-facing windows with high thermal conductivity frames' },
      { id: 'c', label: 'Incorporate high thermal mass materials like concrete or water walls to absorb and release heat', correct: true },
      { id: 'd', label: 'Use reflective roofing to maximize heat rejection' }
    ],
    explanation: "High thermal mass materials (like concrete, adobe, or water containers) have large heat capacity, allowing them to absorb excess heat during hot days and release it during cold nights. This thermal flywheel effect buffers temperature swings."
  },
  {
    scenario: "A computer engineer is designing a cooling system for a high-performance CPU that generates 150W of heat in an area smaller than a postage stamp.",
    question: "What is the primary thermal challenge that heat sinks with copper bases and aluminum fins address?",
    options: [
      { id: 'a', label: 'Increasing the heat generated by the CPU' },
      { id: 'b', label: 'Converting electrical energy to thermal energy more efficiently' },
      { id: 'c', label: 'Spreading concentrated heat over a larger surface area for convective dissipation', correct: true },
      { id: 'd', label: 'Storing heat until the computer is turned off' }
    ],
    explanation: "Copper's exceptionally high thermal conductivity (401 W/m-K) rapidly spreads heat from the tiny CPU die across the heat sink base. Aluminum fins then provide large surface area for convection. Fourier's Law shows that high k enables rapid heat flow."
  },
  {
    scenario: "A cold storage facility uses containers filled with a special salt solution that freezes at 5C to maintain consistent temperatures during power outages.",
    question: "Why are phase change materials (PCMs) more effective for thermal storage than simply using more of a conventional material?",
    options: [
      { id: 'a', label: 'PCMs are cheaper and more readily available than conventional materials' },
      { id: 'b', label: 'Latent heat of fusion stores far more energy at constant temperature than sensible heat', correct: true },
      { id: 'c', label: 'PCMs have higher thermal conductivity than all other materials' },
      { id: 'd', label: 'PCMs are lighter and take up less space than water' }
    ],
    explanation: "Phase change materials exploit latent heat - the energy absorbed or released during phase transitions without temperature change. Water's latent heat of fusion (334 J/g) is 80 times greater than the energy needed to change its temperature by 1C."
  },
  {
    scenario: "A chemistry student mixes 100g of water at 80C with 100g of water at 20C in an insulated container.",
    question: "What is the final equilibrium temperature of the mixture?",
    options: [
      { id: 'a', label: '40C - because equal masses with equal specific heat meet at the average' },
      { id: 'b', label: '50C - the exact midpoint of the two temperatures', correct: true },
      { id: 'c', label: '60C - weighted toward the hotter water' },
      { id: 'd', label: '45C - accounting for heat loss to the container' }
    ],
    explanation: "In calorimetry, heat lost equals heat gained. With equal masses and specific heats: (Tf - 20) = (80 - Tf), solving to Tf = 50C. The final temperature is the arithmetic mean because both samples have identical thermal properties."
  },
  {
    scenario: "San Francisco and Sacramento are at similar latitudes, yet San Francisco has mild temperatures year-round (10-20C range) while Sacramento experiences extremes (0-40C range).",
    question: "What thermal property of the nearby Pacific Ocean primarily explains San Francisco's moderate climate?",
    options: [
      { id: 'a', label: 'The ocean reflects more sunlight than land, reducing heating' },
      { id: 'b', label: 'Ocean currents bring cold water from the Arctic' },
      { id: 'c', label: 'Water has high specific heat capacity, buffering temperature changes in coastal air', correct: true },
      { id: 'd', label: 'Fog blocks all solar radiation from reaching the city' }
    ],
    explanation: "Water's specific heat capacity (4.18 J/gC) is about 4 times higher than land (~1 J/gC). The massive Pacific Ocean absorbs enormous amounts of solar energy with minimal temperature change (Q = mcDeltaT with huge m and c means tiny DeltaT)."
  },
  {
    scenario: "A lithium-ion battery pack in an electric vehicle begins experiencing thermal runaway, where one cell overheats and triggers adjacent cells to fail.",
    question: "What thermal property relationship makes thermal runaway particularly dangerous in densely packed battery cells?",
    options: [
      { id: 'a', label: 'High specific heat causes heat to build up slowly then release suddenly' },
      { id: 'b', label: 'Low thermal conductivity between cells prevents heat from escaping' },
      { id: 'c', label: 'Exothermic reactions increase temperature, which accelerates reaction rates, creating positive feedback', correct: true },
      { id: 'd', label: 'Battery electrolyte has unusually low boiling point' }
    ],
    explanation: "Thermal runaway involves positive feedback: cell temperature rises - chemical reaction rates increase exponentially - more heat generated - temperature rises further. High temperature gradients drive rapid heat flow to adjacent cells, propagating the runaway."
  },
  {
    scenario: "A chemical plant needs to heat 10,000 liters of oil from 25C to 150C for a manufacturing process. The oil has a specific heat of 2.0 J/gC and density of 0.9 kg/L.",
    question: "Approximately how much thermal energy is required for this heating process?",
    options: [
      { id: 'a', label: '250 MJ - using Q = mcDeltaT with careful unit conversion' },
      { id: 'b', label: '1,125 MJ - accounting for mass and specific heat' },
      { id: 'c', label: '2,250 MJ - the full calculation with all parameters', correct: true },
      { id: 'd', label: '4,500 MJ - doubling for industrial safety margins' }
    ],
    explanation: "Using Q = mcDeltaT: mass = 10,000 L x 0.9 kg/L = 9,000 kg = 9,000,000 g. Temperature change = 150C - 25C = 125C. Therefore Q = 9,000,000 g x 2.0 J/gC x 125C = 2,250,000,000 J = 2,250 MJ."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications
// ============================================================================
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'CPU & GPU Cooling',
    short: 'Conducting heat from chips to air through metal highways',
    tagline: 'Thermal conductivity determines if your PC throttles',
    description: 'Modern processors generate 100-300+ watts in a tiny area. Heat spreaders, heat pipes, and heatsinks use high-conductivity materials (copper, aluminum) to spread and dissipate this heat before the chip overheats and throttles.',
    connection: 'The thermal conductivity (k) you explored explains heatsink design: copper (k=401) bases spread heat quickly, aluminum (k=237) fins dissipate it to air, and thermal paste (k=5-15) bridges the microscopic gaps.',
    howItWorks: 'Heat flows from the die through thermal interface material to a copper base (spreading), up heat pipes (phase-change transport), through aluminum fins, and finally convects to air. Each stage is optimized for its thermal role.',
    stats: [
      { value: '300W', label: 'High-end GPU thermal load', icon: '🔥' },
      { value: '100C', label: 'Typical throttle temperature', icon: '🌡️' },
      { value: '400+ W/mK', label: 'Copper thermal conductivity', icon: '⚡' }
    ],
    examples: ['Noctua air coolers', 'Corsair AIO liquid coolers', 'NVIDIA Founders Edition', 'Data center cold plates'],
    companies: ['Noctua', 'Corsair', 'NZXT', 'Thermal Grizzly'],
    futureImpact: 'Graphene and diamond-like carbon thermal interfaces will enable fanless cooling of high-power chips.',
    color: '#EF4444'
  },
  {
    icon: '🏠',
    title: 'Building Insulation',
    short: 'Keeping heat in (or out) with low-conductivity materials',
    tagline: 'R-value is inverted thermal conductivity',
    description: 'Building insulation uses materials with extremely low thermal conductivity - fiberglass, foam, aerogel - to minimize heat transfer through walls and roofs. The lower the k-value, the higher the R-value and energy savings.',
    connection: 'While high-k materials conduct heat quickly (bad for insulation), low-k materials like fiberglass (k=0.04) and aerogel (k=0.015) trap air and resist heat flow - the opposite of what you want in a cooking pan.',
    howItWorks: 'Insulation materials trap still air in tiny pockets. Air has very low thermal conductivity (k=0.025). The solid structure prevents convection while the trapped air resists conduction. R = thickness/k.',
    stats: [
      { value: '50%', label: 'Home energy for heating/cooling', icon: '💰' },
      { value: 'R-60', label: 'Best attic insulation', icon: '🏠' },
      { value: '0.015 W/mK', label: 'Aerogel conductivity', icon: '📉' }
    ],
    examples: ['Fiberglass batts', 'Spray foam insulation', 'Rigid foam boards', 'NASA aerogel blankets'],
    companies: ['Owens Corning', 'Johns Manville', 'Dow Chemical', 'Aspen Aerogels'],
    futureImpact: 'Vacuum insulated panels with k=0.004 will enable super-insulated buildings requiring minimal heating/cooling.',
    color: '#3B82F6'
  },
  {
    icon: '🍳',
    title: 'Cookware Engineering',
    short: 'Designing pans for even heat distribution',
    tagline: 'Why copper-clad pans cost $400',
    description: 'Premium cookware uses multi-layer construction to optimize heat distribution. Copper or aluminum cores provide high lateral conductivity (no hot spots), while stainless steel surfaces provide durability and non-reactivity.',
    connection: 'You learned that copper (k=401) conducts heat far faster than stainless steel (k=16). Copper-clad pans spread heat evenly because lateral conduction outpaces the heat input from the burner.',
    howItWorks: 'Heat from the burner must spread laterally faster than it accumulates. With low-k steel alone, hot spots form. A copper or aluminum core layer conducts heat sideways rapidly, then transfers it evenly through the cooking surface.',
    stats: [
      { value: '25x', label: 'Copper vs steel conductivity', icon: '⚡' },
      { value: '$400+', label: 'Premium copper cookware', icon: '💰' },
      { value: '3-5 layers', label: 'Typical clad construction', icon: '📊' }
    ],
    examples: ['All-Clad tri-ply', 'Mauviel copper', 'Demeyere 7-ply', 'Cast iron seasoned pans'],
    companies: ['All-Clad', 'Mauviel', 'Demeyere', 'Le Creuset'],
    futureImpact: 'Graphene-enhanced cookware will achieve copper performance at aluminum weight and cost.',
    color: '#F59E0B'
  },
  {
    icon: '🔋',
    title: 'EV Battery Thermal Management',
    short: 'Keeping battery cells in the perfect temperature window',
    tagline: 'Too hot degrades, too cold loses range',
    description: 'EV batteries must operate between 20-40C for optimal performance and longevity. Thermal management systems use liquid cooling plates with high conductivity to rapidly equalize temperatures across thousands of cells.',
    connection: 'Both thermal conductivity (moving heat to coolant) and specific heat capacity (thermal mass to buffer temperature swings) matter - you explored both concepts in the simulation.',
    howItWorks: 'Cooling plates with internal channels contact cell surfaces. High-conductivity aluminum spreads heat to the coolant. Glycol-water mixture absorbs heat and carries it to radiators. Active heating works similarly in reverse.',
    stats: [
      { value: '20-40C', label: 'Optimal battery temperature', icon: '🌡️' },
      { value: '10+ years', label: 'Target battery life', icon: '⏰' },
      { value: '15 kW', label: 'Cooling system capacity', icon: '❄️' }
    ],
    examples: ['Tesla battery cooling', 'Rivian thermal system', 'BMW i4 cooling', 'Lucid Air thermal management'],
    companies: ['Tesla', 'CATL', 'Dana Incorporated', 'Valeo'],
    futureImpact: 'Immersion cooling in dielectric fluid will enable 4C+ charging rates without overheating.',
    color: '#8B5CF6'
  }
];

// ============================================================================
// MATERIAL DATA
// ============================================================================
const materials: Record<string, { k: number; name: string; color: string; description: string }> = {
  copper: { k: 401, name: 'Copper', color: '#f97316', description: 'Excellent conductor - used in cookware, electronics' },
  aluminum: { k: 237, name: 'Aluminum', color: '#94a3b8', description: 'Good conductor - lightweight, used in heat sinks' },
  steel: { k: 50, name: 'Steel', color: '#64748b', description: 'Moderate conductor - durable, used in construction' },
  glass: { k: 1.05, name: 'Glass', color: '#22d3ee', description: 'Poor conductor - used for insulation, windows' },
  wood: { k: 0.12, name: 'Wood', color: '#a3e635', description: 'Excellent insulator - why wooden spoons stay cool' }
};

const specificHeats: Record<string, { c: number; name: string; color: string }> = {
  water: { c: 4.18, name: 'Water', color: '#3b82f6' },
  oil: { c: 2.0, name: 'Cooking Oil', color: '#eab308' },
  aluminum: { c: 0.90, name: 'Aluminum', color: '#94a3b8' },
  iron: { c: 0.45, name: 'Iron', color: '#64748b' }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const HeatTransferCapacityRenderer: React.FC<HeatTransferCapacityRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - heat conduction
  const [selectedMaterial, setSelectedMaterial] = useState<keyof typeof materials>('copper');
  const [heatSourceTemp, setHeatSourceTemp] = useState(100);
  const [barTemperatures, setBarTemperatures] = useState<number[]>(Array(20).fill(25));
  const [isHeating, setIsHeating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Twist phase - heat capacity race
  const [substanceTemps, setSubstanceTemps] = useState<Record<string, number>>({ water: 25, oil: 25, aluminum: 25, iron: 25 });
  const [heatingStarted, setHeatingStarted] = useState(false);

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange for heat theme
    accentGlow: 'rgba(249, 115, 22, 0.3)',
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
    twist_play: 'Heat Capacity',
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
        gameType: 'heat-transfer-capacity',
        gameTitle: 'Heat Transfer & Capacity',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    // Reset simulation state when entering play phases
    if (p === 'play') {
      setBarTemperatures(Array(20).fill(25));
      setIsHeating(false);
      setElapsedTime(0);
    } else if (p === 'twist_play') {
      setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 });
      setHeatingStarted(false);
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Heat conduction simulation
  useEffect(() => {
    if (phase === 'play' && isHeating) {
      const interval = setInterval(() => {
        setElapsedTime(t => t + 0.1);
        setBarTemperatures(prev => {
          const newTemps = [...prev];
          const k = materials[selectedMaterial].k;
          const alpha = k * 0.0001; // Diffusivity coefficient
          newTemps[0] = heatSourceTemp;
          for (let i = 1; i < newTemps.length - 1; i++) {
            const heatFlow = alpha * (newTemps[i - 1] - 2 * newTemps[i] + newTemps[i + 1]);
            newTemps[i] = Math.min(heatSourceTemp, Math.max(25, newTemps[i] + heatFlow));
          }
          newTemps[newTemps.length - 1] = Math.max(25, newTemps[newTemps.length - 1] + alpha * (newTemps[newTemps.length - 2] - newTemps[newTemps.length - 1]) - 0.1);
          return newTemps;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, isHeating, selectedMaterial, heatSourceTemp]);

  // Heat capacity race simulation
  useEffect(() => {
    if (phase === 'twist_play' && heatingStarted) {
      const interval = setInterval(() => {
        setSubstanceTemps(prev => {
          const newTemps = { ...prev };
          const heatInput = 50; // Joules per tick
          const mass = 100; // grams
          Object.keys(specificHeats).forEach(sub => {
            if (newTemps[sub] < 100) {
              const deltaT = heatInput / (mass * specificHeats[sub].c);
              newTemps[sub] = Math.min(100, newTemps[sub] + deltaT * 0.1);
            }
          });
          return newTemps;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, heatingStarted]);

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
  };

  // Heat Conduction Visualization
  const HeatConductionViz = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 220 : 280;
    const barWidth = width - 120;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <filter id="flameGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Heat source */}
        <g transform={`translate(30, ${height / 2 - 40})`}>
          {/* Burner base */}
          <rect x={0} y={60} width={40} height={12} rx={3} fill="#475569" />
          {/* Flame */}
          {isHeating && (
            <g filter="url(#flameGlow)">
              <ellipse cx={20} cy={40} rx={14} ry={25} fill="url(#flameGrad)" opacity={0.95}>
                <animate attributeName="ry" values="22;28;22" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={20} cy={45} rx={7} ry={15} fill="#fef9c3" opacity={0.9}>
                <animate attributeName="ry" values="12;18;12" dur="0.2s" repeatCount="indefinite" />
              </ellipse>
            </g>
          )}
        </g>

        {/* Metal bar with temperature segments */}
        <g transform={`translate(70, ${height / 2 - 20})`}>
          {barTemperatures.map((temp, i) => {
            const segWidth = barWidth / barTemperatures.length;
            const t = Math.min(1, Math.max(0, (temp - 25) / 75));
            const r = Math.round(59 + t * 196);
            const g = Math.round(130 - t * 50);
            const b = Math.round(246 - t * 200);
            return (
              <rect
                key={i}
                x={i * segWidth}
                y={0}
                width={segWidth + 1}
                height={40}
                rx={i === 0 ? 6 : i === barTemperatures.length - 1 ? 6 : 0}
                fill={`rgb(${r},${g},${b})`}
              />
            );
          })}
          <rect x={0} y={0} width={barWidth} height={40} rx={6} fill="none" stroke="#475569" strokeWidth={2} />
        </g>

        {/* Heat flow arrows */}
        {isHeating && (
          <g opacity={0.7}>
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${100 + i * 100}, ${height / 2})`}>
                <path d="M0,0 L15,0 L12,-4 M15,0 L12,4" stroke={colors.accent} strokeWidth={2} fill="none">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </path>
              </g>
            ))}
          </g>
        )}

        {/* Labels */}
        <text x={50} y={height - 30} textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">
          {heatSourceTemp}C
        </text>
        <text x={width / 2} y={height - 10} textAnchor="middle" fill={materials[selectedMaterial].color} fontSize="14" fontWeight="700">
          {materials[selectedMaterial].name} (k={materials[selectedMaterial].k})
        </text>
        <text x={width - 50} y={height - 30} textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="600">
          {Math.round(barTemperatures[barTemperatures.length - 1])}C
        </text>

        {/* Equation */}
        <rect x={width / 2 - 80} y={height - 55} width={160} height={30} rx={8} fill={colors.bgSecondary} stroke={colors.border} />
        <text x={width / 2} y={height - 35} textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="600">
          Q/t = -kA(dT/dx)
        </text>
      </svg>
    );
  };

  // Heat Capacity Race Visualization
  const HeatCapacityViz = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 260 : 320;
    const beakerWidth = 70;
    const spacing = (width - 4 * beakerWidth) / 5;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="beakerFlame" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fef9c3" />
          </linearGradient>
          <filter id="beakerGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Object.entries(specificHeats).map(([key, data], idx) => {
          const x = spacing + idx * (beakerWidth + spacing);
          const temp = substanceTemps[key];
          const fillHeight = Math.max(10, ((temp - 25) / 75) * 80);
          const isWinner = temp >= 100;

          // Color based on material
          const liquidColors: Record<string, string> = {
            water: '#3b82f6',
            oil: '#eab308',
            aluminum: '#94a3b8',
            iron: '#64748b'
          };

          return (
            <g key={key} transform={`translate(${x}, 30)`}>
              {/* Winner glow */}
              {isWinner && (
                <ellipse cx={35} cy={60} rx={40} ry={50} fill={colors.success} opacity={0.2}>
                  <animate attributeName="opacity" values="0.2;0.4;0.2" dur="1s" repeatCount="indefinite" />
                </ellipse>
              )}

              {/* Beaker */}
              <path d="M 0 0 L 0 100 Q 0 115 15 115 L 55 115 Q 70 115 70 100 L 70 0 Z" fill="#0f172a" stroke="#475569" strokeWidth={2} />

              {/* Liquid */}
              <clipPath id={`liquidClip${idx}`}>
                <path d="M 3 5 L 3 97 Q 3 112 15 112 L 55 112 Q 67 112 67 97 L 67 5 Z" />
              </clipPath>
              <g clipPath={`url(#liquidClip${idx})`}>
                <rect x={3} y={112 - fillHeight} width={64} height={fillHeight + 10} fill={liquidColors[key]} opacity={0.8} />
              </g>

              {/* Temperature display */}
              <rect x={10} y={40} width={50} height={24} rx={6} fill={colors.bgSecondary} stroke={isWinner ? colors.success : colors.border} strokeWidth={isWinner ? 2 : 1} />
              <text x={35} y={57} textAnchor="middle" fill={isWinner ? colors.success : colors.textPrimary} fontSize="12" fontWeight="700">
                {Math.round(temp)}C
              </text>

              {/* Burner */}
              <rect x={15} y={122} width={40} height={8} rx={2} fill="#475569" />
              {heatingStarted && (
                <g filter="url(#beakerGlow)">
                  <ellipse cx={35} cy={138} rx={12} ry={16} fill="url(#beakerFlame)" opacity={0.9}>
                    <animate attributeName="ry" values="14;18;14" dur="0.25s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              )}

              {/* Label */}
              <text x={35} y={175} textAnchor="middle" fill={data.color} fontSize="11" fontWeight="600">
                {data.name}
              </text>
              <text x={35} y={190} textAnchor="middle" fill={colors.textMuted} fontSize="10">
                c={data.c}
              </text>
              {isWinner && (
                <text x={35} y={210} textAnchor="middle" fill={colors.success} fontSize="18">
                  🏆
                </text>
              )}
            </g>
          );
        })}

        {/* Equation */}
        <rect x={width / 2 - 60} y={height - 40} width={120} height={28} rx={8} fill={colors.bgSecondary} stroke={colors.border} />
        <text x={width / 2} y={height - 21} textAnchor="middle" fill="#3b82f6" fontSize="13" fontWeight="600">
          Q = mcDeltaT
        </text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

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
          🔥🌡️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Heat Transfer & Capacity
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why does a <span style={{ color: colors.accent }}>metal spoon</span> feel cold and a <span style={{ color: colors.success }}>wooden spoon</span> feel warm at the same temperature? The answer reveals how heat really works."
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
            "Your nerves don't sense temperature - they sense heat FLOW. Understanding this distinction unlocks the physics of thermal engineering."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Thermal Physics
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Exploring Heat →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Metal feels colder - it conducts heat away from your hand faster', correct: true },
      { id: 'b', text: 'Wood feels colder - it absorbs more heat from the room' },
      { id: 'c', text: 'Both feel the same - they are at the same temperature' },
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
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A metal spoon and a wooden spoon have been sitting at room temperature (20C) all day. When you touch them, which will feel colder?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🥄</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Metal Spoon</p>
                <p style={{ ...typo.small, color: colors.accent }}>20C</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🪵</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Wooden Spoon</p>
                <p style={{ ...typo.small, color: colors.accent }}>20C</p>
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
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Heat Conduction Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Heat Conduction Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch how different materials conduct heat at different rates.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <HeatConductionViz />
            </div>

            {/* Material selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Select Material:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {Object.entries(materials).map(([key, mat]) => (
                  <button
                    key={key}
                    onClick={() => {
                      playSound('click');
                      setSelectedMaterial(key as keyof typeof materials);
                      setBarTemperatures(Array(20).fill(25));
                      setIsHeating(false);
                      setElapsedTime(0);
                    }}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedMaterial === key ? mat.color : colors.border}`,
                      background: selectedMaterial === key ? `${mat.color}22` : colors.bgSecondary,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ ...typo.small, color: mat.color, fontWeight: 600 }}>{mat.name}</div>
                    <div style={{ fontSize: '10px', color: colors.textMuted }}>k={mat.k}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Heat source slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>🔥 Heat Source Temperature</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{heatSourceTemp}C</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={heatSourceTemp}
                onChange={(e) => setHeatSourceTemp(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Time display */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '20px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.textPrimary }}>{elapsedTime.toFixed(1)}s</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Time Elapsed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{Math.round(barTemperatures[barTemperatures.length - 1])}C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cold End Temp</div>
              </div>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setIsHeating(!isHeating);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isHeating ? colors.error : colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                }}
              >
                {isHeating ? '⏸ Pause' : '🔥 Start Heating'}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setBarTemperatures(Array(20).fill(25));
                  setIsHeating(false);
                  setElapsedTime(0);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Discovery prompt */}
          {barTemperatures[barTemperatures.length - 1] > 40 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🎯 Heat is spreading! Notice how {materials[selectedMaterial].name} (k={materials[selectedMaterial].k}) conducts heat at its rate.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics →
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
            Thermal Conductivity Explained
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.accent }}>Fourier's Law: Q/t = -kA(dT/dx)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.textPrimary }}>k (thermal conductivity)</span> measures how fast heat flows through a material. Higher k = faster heat transfer.
              </p>
              <p style={{ marginBottom: '16px' }}>
                When you touch <span style={{ color: colors.accent }}>metal (k=401)</span>, heat rapidly flows from your warm 37C hand into the cooler metal. Your nerves sense this rapid heat LOSS and interpret it as "cold."
              </p>
              <p>
                When you touch <span style={{ color: colors.success }}>wood (k=0.12)</span>, heat flows slowly. Your hand stays warm, so wood feels "warmer" - even at the same temperature!
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                High k Materials
              </h3>
              <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px', margin: 0 }}>
                <li>Copper (k=401)</li>
                <li>Aluminum (k=237)</li>
                <li>Steel (k=50)</li>
              </ul>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Used for heat sinks, cookware
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Low k Materials
              </h3>
              <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px', margin: 0 }}>
                <li>Wood (k=0.12)</li>
                <li>Fiberglass (k=0.04)</li>
                <li>Air (k=0.025)</li>
              </ul>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Used for insulation
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Heat Capacity →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Water heats fastest - it absorbs heat well' },
      { id: 'b', text: 'Oil heats fastest - used for deep frying at high temps' },
      { id: 'c', text: 'Metals heat fastest - they have low specific heat capacity', correct: true },
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
              🧪 New Variable: Specific Heat Capacity
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You put equal masses of water, oil, aluminum, and iron on identical burners providing equal heat. Which reaches 100C first?
          </h2>

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
              See the Race →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE - Heat Capacity Race
  if (phase === 'twist_play') {
    const winner = Object.entries(substanceTemps).find(([, temp]) => temp >= 100);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Heat Capacity Race
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Same heat input, same mass - which heats up fastest?
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <HeatCapacityViz />
            </div>

            {/* Temperature readouts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {Object.entries(specificHeats).map(([key, data]) => {
                const temp = substanceTemps[key];
                const isWinner = temp >= 100;
                return (
                  <div key={key} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `2px solid ${isWinner ? colors.success : colors.border}`,
                  }}>
                    <div style={{ ...typo.h3, color: isWinner ? colors.success : colors.textPrimary }}>
                      {Math.round(temp)}C
                    </div>
                    <div style={{ ...typo.small, color: data.color, fontWeight: 600 }}>{data.name}</div>
                    <div style={{ fontSize: '10px', color: colors.textMuted }}>c={data.c}</div>
                  </div>
                );
              })}
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setHeatingStarted(!heatingStarted);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: heatingStarted ? colors.error : colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                }}
              >
                {heatingStarted ? '⏸ Pause' : '🔥 Start All Burners'}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 });
                  setHeatingStarted(false);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Winner announcement */}
          {winner && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🏆 {specificHeats[winner[0]].name} wins! Low specific heat (c={specificHeats[winner[0]].c}) means less energy needed per degree.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Heat Capacity →
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
            Two Properties, Two Roles
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}`,
              borderLeft: `4px solid ${colors.accent}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Thermal Conductivity (k)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>How fast</strong> heat spreads through a material. High k = rapid heat flow. Metal feels cold because heat leaves your hand quickly.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Formula: Q/t = -kA(dT/dx)
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid #3b82f6`,
              borderLeft: `4px solid #3b82f6`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💧</span>
                <h3 style={{ ...typo.h3, color: '#3b82f6', margin: 0 }}>Specific Heat Capacity (c)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>How much energy</strong> needed to raise temperature. High c = temperature-resistant. Water (c=4.18) buffers climate, heats slowly.
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Formula: Q = mcDeltaT
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                💡 Key Insight
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                These are <strong>independent properties</strong>. Metals have high k (good conductors) AND low c (heat up fast). Water has low k (poor conductor) AND high c (resists temperature change). Engineers choose materials by considering both!
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
                How It Connects:
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
              Take the Knowledge Test →
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
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand heat transfer and thermal capacity!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                ← Previous
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
                Next →
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
          Thermal Physics Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how heat transfers through materials and why different substances resist temperature change differently.
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
              "Thermal conductivity (k) controls heat flow rate",
              "Specific heat capacity (c) controls temperature change",
              "Why metal feels cold and wood feels warm",
              "How cookware, insulation, and CPUs use these properties",
              "The formulas Q = mcDeltaT and Q/t = -kA(dT/dx)",
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

export default HeatTransferCapacityRenderer;
