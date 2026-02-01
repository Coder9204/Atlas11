'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// HEAT TRANSFER CAPACITY RENDERER - THERMAL PHYSICS
// Premium 10-screen educational game with premium design
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook', 'predict': 'Predict', 'play': 'Lab', 'review': 'Review', 'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab', 'twist_review': 'Twist Review', 'transfer': 'Transfer', 'test': 'Test', 'mastery': 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ============================================================================
// REAL WORLD APPLICATIONS
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
      { value: '100°C', label: 'Typical throttle temperature', icon: '🌡️' },
      { value: '400+ W/(m·K)', label: 'Copper thermal conductivity', icon: '⚡' }
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
      { value: '0.015 W/(m·K)', label: 'Aerogel conductivity', icon: '📉' }
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
    description: 'EV batteries must operate between 20-40°C for optimal performance and longevity. Thermal management systems use liquid cooling plates with high conductivity to rapidly equalize temperatures across thousands of cells.',
    connection: 'Both thermal conductivity (moving heat to coolant) and specific heat capacity (thermal mass to buffer temperature swings) matter - you explored both concepts in the simulation.',
    howItWorks: 'Cooling plates with internal channels contact cell surfaces. High-conductivity aluminum spreads heat to the coolant. Glycol-water mixture absorbs heat and carries it to radiators. Active heating works similarly in reverse.',
    stats: [
      { value: '20-40°C', label: 'Optimal battery temperature', icon: '🌡️' },
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
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "A metal spoon and a wooden spoon have been sitting at room temperature (20C) all day. When you touch them, which will feel colder?",
    options: [
      { id: 'A', text: 'Metal feels colder - it conducts heat from your hand faster' },
      { id: 'B', text: 'Wood feels colder - it absorbs heat from the room' },
      { id: 'C', text: 'Both feel the same - they are the same temperature' },
      { id: 'D', text: "Metal feels warmer - it's denser" },
    ],
    correct: 'A',
    explanation: "Metal feels colder even though both are at 20C! Metal has high thermal conductivity (k), so it rapidly draws heat away from your 37C hand. Wood is an insulator with low k, so heat transfers slowly and it feels warmer. Your nerves sense heat FLOW, not temperature!"
  },
  twist: {
    question: "You put equal masses of water, oil, aluminum, and iron on identical burners providing equal heat. Which reaches 100C first?",
    options: [
      { id: 'A', text: 'Water heats fastest - it absorbs heat well' },
      { id: 'B', text: 'Oil heats fastest - used for frying' },
      { id: 'C', text: 'Metals heat fastest - they have low specific heat capacity' },
      { id: 'D', text: 'All heat at the same rate - same heat input' },
    ],
    correct: 'C',
    explanation: "Metals win the race! Specific heat capacity (c) is the energy needed to raise 1g by 1C. Metals have low c (iron: 0.45 J/gC), so they need less energy per degree. Water has high c (4.18 J/gC), making it a thermal buffer that resists temperature change."
  }
};

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

const realWorldApplications = [
  {
    id: 'cooking',
    title: 'Cooking & Cookware',
    icon: '🍳',
    subtitle: 'Heat distribution in the kitchen',
    description: 'High-quality cookware uses copper or aluminum bottoms for even heat distribution. Cast iron maintains temperature when food is added. Wooden handles stay cool due to low thermal conductivity.',
    formula: "Fourier's Law: Q/t = -kA(dT/dx)",
    realExample: 'Copper-clad pans cook more evenly: higher k means heat spreads faster laterally, eliminating hot spots.',
  },
  {
    id: 'building',
    title: 'Building Insulation',
    icon: '🏠',
    subtitle: 'Energy efficiency',
    description: 'Buildings use low-conductivity materials (fiberglass, foam, aerogel) to minimize heat transfer. Double-pane windows trap air - an excellent insulator with k = 0.025 W/mK.',
    formula: 'R-value = thickness / k',
    realExample: 'Doubling wall thickness halves heat loss. Air gaps work because still air is 1,600x less conductive than concrete.',
  },
  {
    id: 'electronics',
    title: 'Electronics Cooling',
    icon: '💻',
    subtitle: 'Heat sink design',
    description: 'Computer processors generate intense heat in tiny areas. Heat sinks use high-k metals (copper, aluminum) to spread heat, while thermal paste fills microscopic air gaps.',
    formula: 'Heat flows: CPU -> thermal paste -> heat sink -> fins -> air',
    realExample: 'A high-end CPU generates 150W of heat. Copper heat sinks spread this across large surface areas for dissipation.',
  },
  {
    id: 'climate',
    title: 'Climate & Weather',
    icon: '🌊',
    subtitle: 'Ocean heat capacity',
    description: "Oceans absorb 90% of global warming's excess heat. Water's high specific heat capacity (4.18 J/gC) moderates temperature swings, making coastal cities milder.",
    formula: 'Q = mcDeltaT - large m and c mean small DeltaT',
    realExample: 'San Francisco has mild weather year-round while inland Sacramento has extreme temps - same latitude, different heat capacity effects.',
  }
];

const quizQuestions = [
  {
    question: "Why does metal feel colder than wood at the same temperature?",
    options: [
      { text: "Metal is actually colder", correct: false },
      { text: "Metal conducts heat away from your hand faster", correct: true },
      { text: "Wood absorbs more heat", correct: false },
      { text: "Metal reflects body heat", correct: false },
    ],
  },
  {
    question: "What does thermal conductivity (k) measure?",
    options: [
      { text: "How hot something can get", correct: false },
      { text: "How fast heat flows through a material", correct: true },
      { text: "How much heat something stores", correct: false },
      { text: "How well something insulates", correct: false },
    ],
  },
  {
    question: "Which has the highest specific heat capacity?",
    options: [
      { text: "Iron (0.45 J/gC)", correct: false },
      { text: "Aluminum (0.90 J/gC)", correct: false },
      { text: "Water (4.18 J/gC)", correct: true },
      { text: "Copper (0.39 J/gC)", correct: false },
    ],
  },
  {
    question: "Why do coastal cities have milder climates?",
    options: [
      { text: "Ocean breezes", correct: false },
      { text: "Less pollution", correct: false },
      { text: "Water's high heat capacity buffers temperature changes", correct: true },
      { text: "Lower elevation", correct: false },
    ],
  },
  {
    question: "What is Fourier's Law of heat conduction?",
    options: [
      { text: "E = mc^2", correct: false },
      { text: "Q/t = -kA(dT/dx)", correct: true },
      { text: "PV = nRT", correct: false },
      { text: "F = ma", correct: false },
    ],
  },
  {
    question: "Why does doubling wall thickness halve heat loss?",
    options: [
      { text: "More material blocks heat", correct: false },
      { text: "Temperature gradient (dT/dx) is halved", correct: true },
      { text: "Air gets trapped", correct: false },
      { text: "Insulation absorbs heat", correct: false },
    ],
  },
  {
    question: "What makes copper better than aluminum for cookware bottoms?",
    options: [
      { text: "Copper is cheaper", correct: false },
      { text: "Copper has higher thermal conductivity (401 vs 237 W/mK)", correct: true },
      { text: "Copper is lighter", correct: false },
      { text: "Copper stores more heat", correct: false },
    ],
  },
  {
    question: "Why does water take so long to boil compared to metals?",
    options: [
      { text: "Water is a liquid", correct: false },
      { text: "Water has high specific heat - needs more energy per degree", correct: true },
      { text: "Water evaporates", correct: false },
      { text: "Water conducts heat poorly", correct: false },
    ],
  },
  {
    question: "What fills the gap between CPU and heat sink?",
    options: [
      { text: "Air", correct: false },
      { text: "Thermal paste - fills air gaps that would insulate", correct: true },
      { text: "Water", correct: false },
      { text: "Vacuum", correct: false },
    ],
  },
  {
    question: "Q = mcDeltaT: if c doubles, what happens to DeltaT for same Q?",
    options: [
      { text: "Doubles", correct: false },
      { text: "Halves", correct: true },
      { text: "Stays same", correct: false },
      { text: "Quadruples", correct: false },
    ],
  },
];

// ============================================================================
// TEST QUESTIONS - SCENARIO-BASED MULTIPLE CHOICE
// ============================================================================

const testQuestions = [
  {
    scenario: "You're designing a thermal storage system for a solar power plant that needs to store energy during the day and release it at night.",
    question: "What property determines how much thermal energy a material can store per unit mass for a given temperature change?",
    options: [
      { id: 'a', label: 'Thermal conductivity - how fast heat spreads through the material', correct: false },
      { id: 'b', label: 'Specific heat capacity - the energy required to raise 1 kg by 1 degree', correct: true },
      { id: 'c', label: 'Density - how much mass fits in a given volume', correct: false },
      { id: 'd', label: 'Melting point - the temperature at which the material changes phase', correct: false },
    ],
    explanation: "Specific heat capacity (c) directly determines thermal energy storage. The equation Q = mcΔT shows that for a given mass and temperature change, materials with higher specific heat capacity store more energy. This is why water (c = 4.18 J/g°C) is often used in thermal storage systems."
  },
  {
    scenario: "A swimmer exits a pool on a hot summer day. The air temperature is 35°C and the water was 28°C.",
    question: "Why does the swimmer feel cold despite the air being warmer than the pool water?",
    options: [
      { id: 'a', label: 'The pool water lowered their core body temperature significantly', correct: false },
      { id: 'b', label: 'Evaporating water absorbs heat from their skin, and water has high heat capacity', correct: true },
      { id: 'c', label: 'Air has higher thermal conductivity than water', correct: false },
      { id: 'd', label: 'The swimmer is experiencing psychological discomfort', correct: false },
    ],
    explanation: "Water's exceptionally high specific heat capacity (4.18 J/g°C) means evaporation requires substantial energy. As water evaporates from the swimmer's skin, it absorbs this energy as latent heat, rapidly cooling the skin. This is why evaporative cooling is so effective - water can carry away large amounts of thermal energy."
  },
  {
    scenario: "A professional chef is preparing a steak and has two pans available: a thin aluminum pan and a heavy cast iron skillet, both preheated to 230°C.",
    question: "Why do professional chefs prefer cast iron for searing steaks despite aluminum heating up faster?",
    options: [
      { id: 'a', label: 'Cast iron has higher thermal conductivity for even heat distribution', correct: false },
      { id: 'b', label: 'Cast iron is cheaper and more durable than aluminum', correct: false },
      { id: 'c', label: 'Cast iron has greater thermal mass, maintaining temperature when cold food is added', correct: true },
      { id: 'd', label: 'Aluminum reacts chemically with meat proteins', correct: false },
    ],
    explanation: "Thermal mass (mass × specific heat capacity) determines how much energy a pan stores. Cast iron's high mass means it stores substantial thermal energy. When a cold steak hits the pan, aluminum's temperature drops dramatically, but cast iron maintains its heat, enabling the Maillard reaction for proper searing. The equation Q = mcΔT shows that larger m means smaller ΔT for the same heat transfer."
  },
  {
    scenario: "An architect is designing a passive solar home in a desert climate with hot days and cold nights.",
    question: "What thermal strategy would best regulate indoor temperatures throughout the day-night cycle?",
    options: [
      { id: 'a', label: 'Use highly insulating materials to prevent all heat transfer', correct: false },
      { id: 'b', label: 'Install large south-facing windows with high thermal conductivity frames', correct: false },
      { id: 'c', label: 'Incorporate high thermal mass materials like concrete or water walls to absorb and release heat', correct: true },
      { id: 'd', label: 'Use reflective roofing to maximize heat rejection', correct: false },
    ],
    explanation: "High thermal mass materials (like concrete, adobe, or water containers) have large heat capacity, allowing them to absorb excess heat during hot days and release it during cold nights. This thermal flywheel effect buffers temperature swings. The key equation Q = mcΔT shows that high mass and specific heat mean large energy storage with small temperature fluctuations."
  },
  {
    scenario: "A computer engineer is designing a cooling system for a high-performance CPU that generates 150W of heat in an area smaller than a postage stamp.",
    question: "What is the primary thermal challenge that heat sinks with copper bases and aluminum fins address?",
    options: [
      { id: 'a', label: 'Increasing the heat generated by the CPU', correct: false },
      { id: 'b', label: 'Converting electrical energy to thermal energy more efficiently', correct: false },
      { id: 'c', label: 'Spreading concentrated heat over a larger surface area for convective dissipation', correct: true },
      { id: 'd', label: 'Storing heat until the computer is turned off', correct: false },
    ],
    explanation: "Copper's exceptionally high thermal conductivity (401 W/m·K) rapidly spreads heat from the tiny CPU die across the heat sink base. Aluminum fins (k = 237 W/m·K) then provide large surface area for convection. Fourier's Law Q/t = -kA(dT/dx) shows that high k enables rapid heat flow from the concentrated source to the extended surface area."
  },
  {
    scenario: "A cold storage facility uses containers filled with a special salt solution that freezes at 5°C to maintain consistent temperatures during power outages.",
    question: "Why are phase change materials (PCMs) more effective for thermal storage than simply using more of a conventional material?",
    options: [
      { id: 'a', label: 'PCMs are cheaper and more readily available than conventional materials', correct: false },
      { id: 'b', label: 'Latent heat of fusion stores far more energy at constant temperature than sensible heat', correct: true },
      { id: 'c', label: 'PCMs have higher thermal conductivity than all other materials', correct: false },
      { id: 'd', label: 'PCMs are lighter and take up less space than water', correct: false },
    ],
    explanation: "Phase change materials exploit latent heat - the energy absorbed or released during phase transitions without temperature change. Water's latent heat of fusion (334 J/g) is 80 times greater than the energy needed to change its temperature by 1°C. This means a PCM can absorb massive amounts of energy while maintaining a stable temperature, far exceeding sensible heat storage (Q = mcΔT)."
  },
  {
    scenario: "A chemistry student mixes 100g of water at 80°C with 100g of water at 20°C in an insulated container. The specific heat of water is 4.18 J/g°C.",
    question: "What is the final equilibrium temperature of the mixture?",
    options: [
      { id: 'a', label: '40°C - because equal masses with equal specific heat meet at the average', correct: false },
      { id: 'b', label: '50°C - the exact midpoint of the two temperatures', correct: true },
      { id: 'c', label: '60°C - weighted toward the hotter water', correct: false },
      { id: 'd', label: '45°C - accounting for heat loss to the container', correct: false },
    ],
    explanation: "In calorimetry, heat lost equals heat gained: m₁c(T_f - T₁) = m₂c(T₂ - T_f). With equal masses and specific heats: (T_f - 20) = (80 - T_f), solving to T_f = 50°C. The final temperature is the arithmetic mean because both samples have identical thermal properties (mass × specific heat), so they contribute equally to the equilibrium."
  },
  {
    scenario: "San Francisco and Sacramento are at similar latitudes, yet San Francisco has mild temperatures year-round (10-20°C range) while Sacramento experiences extremes (0-40°C range).",
    question: "What thermal property of the nearby Pacific Ocean primarily explains San Francisco's moderate climate?",
    options: [
      { id: 'a', label: 'The ocean reflects more sunlight than land, reducing heating', correct: false },
      { id: 'b', label: 'Ocean currents bring cold water from the Arctic', correct: false },
      { id: 'c', label: 'Water has high specific heat capacity, buffering temperature changes in coastal air', correct: true },
      { id: 'd', label: 'Fog blocks all solar radiation from reaching the city', correct: false },
    ],
    explanation: "Water's specific heat capacity (4.18 J/g°C) is about 4 times higher than land (~1 J/g°C). The massive Pacific Ocean absorbs enormous amounts of solar energy with minimal temperature change (Q = mcΔT with huge m and c means tiny ΔT). This thermal buffer moderates coastal air temperatures. Sacramento, far from water, lacks this thermal mass and experiences extreme temperature swings."
  },
  {
    scenario: "A lithium-ion battery pack in an electric vehicle begins experiencing thermal runaway, where one cell overheats and triggers adjacent cells to fail.",
    question: "What thermal property relationship makes thermal runaway particularly dangerous in densely packed battery cells?",
    options: [
      { id: 'a', label: 'High specific heat causes heat to build up slowly then release suddenly', correct: false },
      { id: 'b', label: 'Low thermal conductivity between cells prevents heat from escaping, while high conductivity within cells spreads damage', correct: false },
      { id: 'c', label: 'Exothermic reactions increase temperature, which accelerates reaction rates, creating positive feedback', correct: true },
      { id: 'd', label: 'Battery electrolyte has unusually low boiling point', correct: false },
    ],
    explanation: "Thermal runaway involves positive feedback: cell temperature rises → chemical reaction rates increase exponentially (Arrhenius equation) → more heat generated → temperature rises further. The heat transfer equation Q/t = -kA(dT/dx) shows that high dT/dx (steep temperature gradients) drives rapid heat flow to adjacent cells, propagating the runaway. Battery management systems must detect and prevent this cascade."
  },
  {
    scenario: "A chemical plant needs to heat 10,000 liters of oil from 25°C to 150°C for a manufacturing process. The oil has a specific heat of 2.0 J/g°C and density of 0.9 kg/L.",
    question: "Approximately how much thermal energy is required for this heating process?",
    options: [
      { id: 'a', label: '250 MJ - using Q = mcΔT with careful unit conversion', correct: false },
      { id: 'b', label: '1,125 MJ - accounting for mass and specific heat', correct: false },
      { id: 'c', label: '2,250 MJ - the full calculation with all parameters', correct: true },
      { id: 'd', label: '4,500 MJ - doubling for industrial safety margins', correct: false },
    ],
    explanation: "Using Q = mcΔT: mass = 10,000 L × 0.9 kg/L = 9,000 kg = 9,000,000 g. Temperature change ΔT = 150°C - 25°C = 125°C. Therefore Q = 9,000,000 g × 2.0 J/g°C × 125°C = 2,250,000,000 J = 2,250 MJ. Industrial heating processes require careful energy calculations to size equipment and estimate operating costs."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HeatTransferCapacityRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>((gamePhase as Phase) ?? 'hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive state for simulation
  const [selectedMaterial, setSelectedMaterial] = useState<'copper' | 'aluminum' | 'steel' | 'glass' | 'wood'>('copper');
  const [heatSource, setHeatSource] = useState(100);
  const [barTemperatures, setBarTemperatures] = useState<number[]>(Array(20).fill(25));
  const [isHeating, setIsHeating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Twist phase - heat capacity
  const [substanceTemps, setSubstanceTemps] = useState<Record<string, number>>({ water: 25, oil: 25, aluminum: 25, iron: 25 });
  const [heatingStarted, setHeatingStarted] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Phase sync
  useEffect(() => {
    if (gamePhase !== undefined && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Heat conduction simulation
  useEffect(() => {
    if (phase === 'play' && isHeating) {
      const interval = setInterval(() => {
        setElapsedTime(t => t + 0.1);
        setBarTemperatures(prev => {
          const newTemps = [...prev];
          const k = materials[selectedMaterial].k;
          const alpha = k * 0.0001;
          newTemps[0] = heatSource;
          for (let i = 1; i < newTemps.length - 1; i++) {
            const heatFlow = alpha * (newTemps[i - 1] - 2 * newTemps[i] + newTemps[i + 1]);
            newTemps[i] = Math.min(heatSource, Math.max(25, newTemps[i] + heatFlow));
          }
          newTemps[newTemps.length - 1] = Math.max(25, newTemps[newTemps.length - 1] + alpha * (newTemps[newTemps.length - 2] - newTemps[newTemps.length - 1]) - 0.1);
          return newTemps;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, isHeating, selectedMaterial, heatSource]);

  // Heat capacity simulation
  useEffect(() => {
    if (phase === 'twist_play' && heatingStarted) {
      const interval = setInterval(() => {
        setSubstanceTemps(prev => {
          const newTemps = { ...prev };
          const heatInput = 50;
          const mass = 100;
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

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });

    if (newPhase === 'play') {
      setBarTemperatures(Array(20).fill(25));
      setIsHeating(false);
      setElapsedTime(0);
    } else if (newPhase === 'twist_play') {
      setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 });
      setHeatingStarted(false);
    }
  }, [playSound, onPhaseComplete, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'A' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer >= 0 && quizQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  // ============================================================================
  // HEAT CONDUCTION VISUALIZATION
  // ============================================================================

  const renderHeatConductionViz = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 280;
    const barWidth = simWidth - 100;
    const material = materials[selectedMaterial];

    return (
      <>
        <svg width={simWidth} height={simHeight} className="mx-auto">
          <defs>
            {/* Premium flame gradient with 5 color stops */}
            <linearGradient id="htcFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#fef9c3" />
            </linearGradient>

            {/* Heat source glow gradient */}
            <radialGradient id="htcHeatSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="40%" stopColor="#ea580c" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#c2410c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
            </radialGradient>

            {/* Temperature bar gradient - hot to cold */}
            <linearGradient id="htcTempBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Metal bar surface gradient */}
            <linearGradient id="htcMetalSurface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Lab background gradient */}
            <linearGradient id="htcLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Equation box gradient */}
            <linearGradient id="htcEquationBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Flame glow filter */}
            <filter id="htcFlameGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat source outer glow */}
            <filter id="htcSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner glow for bar */}
            <filter id="htcBarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium lab background */}
          <rect width={simWidth} height={simHeight} fill="url(#htcLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="htcLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width={simWidth} height={simHeight} fill="url(#htcLabGrid)" />

          {/* Heat source base with glow */}
          <g transform={`translate(25, ${simHeight / 2 - 50})`}>
            {/* Outer glow when heating */}
            {isHeating && (
              <ellipse cx={20} cy={50} rx={25} ry={25} fill="url(#htcHeatSourceGlow)" filter="url(#htcSourceGlow)" opacity={0.6} />
            )}

            {/* Burner base */}
            <rect x={5} y={70} width={30} height={15} rx={3} fill="url(#htcMetalSurface)" stroke="#475569" strokeWidth={1} />
            <ellipse cx={20} cy={70} rx={15} ry={5} fill="#475569" />

            {/* Flame with glow filter */}
            {isHeating && (
              <g filter="url(#htcFlameGlow)">
                <ellipse cx={20} cy={45} rx={12} ry={25} fill="url(#htcFlameGrad)" opacity={0.95}>
                  <animate attributeName="ry" values="22;28;22" dur="0.3s" repeatCount="indefinite" />
                  <animate attributeName="rx" values="10;14;10" dur="0.25s" repeatCount="indefinite" />
                </ellipse>
                {/* Inner flame core */}
                <ellipse cx={20} cy={50} rx={6} ry={15} fill="#fef9c3" opacity={0.9}>
                  <animate attributeName="ry" values="12;18;12" dur="0.2s" repeatCount="indefinite" />
                </ellipse>
              </g>
            )}
          </g>

          {/* Metal bar with temperature gradient segments */}
          <g transform={`translate(60, ${simHeight / 2 - 20})`}>
            {/* Bar shadow */}
            <rect x={2} y={4} width={barWidth} height={40} rx={6} fill="#000" opacity={0.3} />

            {/* Temperature segments */}
            {barTemperatures.map((temp, i) => {
              const segWidth = barWidth / barTemperatures.length;
              const t = Math.min(1, Math.max(0, (temp - 25) / 75));
              // Enhanced color interpolation for premium look
              const r = Math.round(59 + t * 196);
              const g = Math.round(130 - t * 80 + (1 - t) * 50);
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
                  filter={t > 0.5 ? "url(#htcBarGlow)" : undefined}
                />
              );
            })}

            {/* Bar border with metallic look */}
            <rect x={0} y={0} width={barWidth} height={40} rx={6} fill="none" stroke="url(#htcMetalSurface)" strokeWidth={2} />

            {/* Highlight on top edge */}
            <rect x={4} y={2} width={barWidth - 8} height={2} rx={1} fill="#94a3b8" opacity={0.3} />
          </g>

          {/* Heat flow arrows */}
          {isHeating && (
            <g opacity={0.7}>
              {[0, 1, 2].map((i) => (
                <g key={i} transform={`translate(${100 + i * 100}, ${simHeight / 2})`}>
                  <path d="M0,0 L15,0 L12,-4 M15,0 L12,4" stroke="#f97316" strokeWidth={2} fill="none" opacity={0.6}>
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                  </path>
                </g>
              ))}
            </g>
          )}

          {/* Equation box with gradient */}
          <g transform={`translate(${simWidth / 2 - 90}, ${simHeight - 50})`}>
            <rect width={180} height={36} rx={10} fill="url(#htcEquationBg)" stroke="#475569" strokeWidth={1} />
            <rect x={2} y={2} width={176} height={2} rx={1} fill="#64748b" opacity={0.2} />
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div className="flex justify-between items-center mt-2 px-4" style={{ maxWidth: simWidth, margin: '0 auto' }}>
          <div className="text-center">
            <span style={{ fontSize: typo.small, color: '#f97316', fontWeight: 600 }}>{heatSource}°C</span>
            <div style={{ fontSize: typo.label, color: '#64748b' }}>Heat Source</div>
          </div>
          <div className="text-center">
            <span style={{ fontSize: typo.body, color: materials[selectedMaterial].color, fontWeight: 700 }}>
              {material.name}
            </span>
            <div style={{ fontSize: typo.small, color: '#94a3b8' }}>k = {material.k} W/mK</div>
          </div>
          <div className="text-center">
            <span style={{ fontSize: typo.small, color: '#3b82f6', fontWeight: 600 }}>
              {Math.round(barTemperatures[barTemperatures.length - 1])}°C
            </span>
            <div style={{ fontSize: typo.label, color: '#64748b' }}>Cold End</div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2 px-4" style={{ maxWidth: simWidth, margin: '8px auto 0' }}>
          <div style={{ fontSize: typo.small, color: '#94a3b8' }}>
            Time: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{elapsedTime.toFixed(1)}s</span>
          </div>
          <div style={{
            fontSize: typo.body,
            color: '#f97316',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '6px 16px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            Q/t = -kA(dT/dx)
          </div>
        </div>
      </>
    );
  };

  // ============================================================================
  // HEAT CAPACITY VISUALIZATION
  // ============================================================================

  const renderHeatCapacityViz = () => {
    const simWidth = isMobile ? 320 : 500;
    const simHeight = 280;

    return (
      <>
        <svg width={simWidth} height={simHeight} className="mx-auto">
          <defs>
            {/* Premium flame gradient for beaker burners */}
            <linearGradient id="htcBeakerFlame" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="20%" stopColor="#f97316" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#fde047" />
              <stop offset="90%" stopColor="#fef9c3" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            {/* Water gradient - blue tones */}
            <linearGradient id="htcWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Oil gradient - yellow/amber tones */}
            <linearGradient id="htcOilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="30%" stopColor="#eab308" />
              <stop offset="60%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>

            {/* Aluminum gradient - silver tones */}
            <linearGradient id="htcAluminumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="30%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Iron gradient - dark gray tones */}
            <linearGradient id="htcIronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="30%" stopColor="#6b7280" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Beaker glass gradient */}
            <linearGradient id="htcBeakerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="15%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="85%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Lab background gradient */}
            <linearGradient id="htcCapLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Winner glow gradient */}
            <radialGradient id="htcWinnerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Flame glow filter */}
            <filter id="htcBeakerFlameGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bubble glow */}
            <filter id="htcBubbleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Winner pulse glow */}
            <filter id="htcWinnerPulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glass reflection */}
            <linearGradient id="htcGlassReflection" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="25%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Premium lab background */}
          <rect width={simWidth} height={simHeight} fill="url(#htcCapLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="htcCapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width={simWidth} height={simHeight} fill="url(#htcCapGrid)" />

          {/* Four beakers with premium styling */}
          {Object.entries(specificHeats).map(([key, data], idx) => {
            const x = 40 + idx * (simWidth - 80) / 4;
            const temp = substanceTemps[key];
            const fillHeight = ((temp - 25) / 75) * 75;
            const isWinner = temp >= 100;
            const gradientId = key === 'water' ? 'htcWaterGrad' : key === 'oil' ? 'htcOilGrad' : key === 'aluminum' ? 'htcAluminumGrad' : 'htcIronGrad';

            return (
              <g key={key} transform={`translate(${x}, 25)`}>
                {/* Winner glow effect */}
                {isWinner && (
                  <ellipse cx={35} cy={60} rx={40} ry={50} fill="url(#htcWinnerGlow)" filter="url(#htcWinnerPulse)">
                    <animate attributeName="opacity" values="0.5;0.8;0.5" dur="1s" repeatCount="indefinite" />
                  </ellipse>
                )}

                {/* Beaker shadow */}
                <path d="M 3 5 L 3 100 Q 3 115 18 115 L 55 115 Q 70 115 70 100 L 70 5 Z" fill="#000" opacity={0.3} />

                {/* Beaker body with glass gradient */}
                <path d="M 0 0 L 0 100 Q 0 115 15 115 L 55 115 Q 70 115 70 100 L 70 0 Z" fill="#0f172a" stroke="url(#htcBeakerGlass)" strokeWidth={2} />

                {/* Liquid with gradient fill */}
                <clipPath id={`htcLiquidClip${idx}`}>
                  <path d="M 3 0 L 3 97 Q 3 112 15 112 L 55 112 Q 67 112 67 97 L 67 0 Z" />
                </clipPath>
                <g clipPath={`url(#htcLiquidClip${idx})`}>
                  <rect x={3} y={112 - fillHeight - 12} width={64} height={fillHeight + 15} fill={`url(#${gradientId})`} opacity={0.85} />

                  {/* Liquid surface highlight */}
                  <rect x={5} y={112 - fillHeight - 12} width={60} height={3} fill="#ffffff" opacity={0.2} rx={1} />
                </g>

                {/* Glass reflection */}
                <rect x={5} y={5} width={8} height={100} fill="url(#htcGlassReflection)" rx={2} />

                {/* Bubbles when heating */}
                {heatingStarted && temp > 50 && (
                  <g filter="url(#htcBubbleGlow)">
                    {[0, 1, 2, 3].map(i => (
                      <circle key={i} cx={15 + i * 12} r={2 + Math.random()} fill={data.color} opacity={0.6}>
                        <animate attributeName="cy" values={`${95 - (temp - 50) * 0.4};55;${95 - (temp - 50) * 0.4}`} dur={`${0.8 + i * 0.25}s`} repeatCount="indefinite" />
                        <animate attributeName="r" values="2;3;2" dur={`${0.6 + i * 0.2}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>
                )}

                {/* Temperature display with gradient background */}
                <rect x={10} y={38} width={50} height={24} rx={6} fill="#020617" opacity={0.9} stroke={isWinner ? '#10b981' : '#334155'} strokeWidth={isWinner ? 2 : 1} />

                {/* Burner base */}
                <rect x={15} y={122} width={40} height={8} rx={2} fill="url(#htcBeakerGlass)" />
                <ellipse cx={35} cy={122} rx={20} ry={4} fill="#475569" />

                {/* Flame with glow */}
                {heatingStarted && (
                  <g filter="url(#htcBeakerFlameGlow)">
                    <ellipse cx={35} cy={135} rx={10} ry={14} fill="url(#htcBeakerFlame)" opacity={0.9}>
                      <animate attributeName="ry" values="11;16;11" dur="0.25s" repeatCount="indefinite" />
                      <animate attributeName="rx" values="8;12;8" dur="0.3s" repeatCount="indefinite" />
                    </ellipse>
                    {/* Inner flame core */}
                    <ellipse cx={35} cy={138} rx={4} ry={8} fill="#fef9c3" opacity={0.9}>
                      <animate attributeName="ry" values="6;10;6" dur="0.2s" repeatCount="indefinite" />
                    </ellipse>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="grid grid-cols-4 gap-2 mt-3 px-4" style={{ maxWidth: simWidth, margin: '12px auto 0' }}>
          {Object.entries(specificHeats).map(([key, data]) => {
            const temp = substanceTemps[key];
            const isWinner = temp >= 100;
            return (
              <div key={key} className="text-center">
                <div style={{
                  fontSize: typo.bodyLarge,
                  fontWeight: 700,
                  color: isWinner ? '#10b981' : '#f8fafc'
                }}>
                  {Math.round(temp)}°C {isWinner && '🏆'}
                </div>
                <div style={{ fontSize: typo.small, color: data.color, fontWeight: 600 }}>
                  {data.name}
                </div>
                <div style={{ fontSize: typo.label, color: '#64748b' }}>
                  c = {data.c}
                </div>
              </div>
            );
          })}
        </div>

        {/* Equation display */}
        <div className="flex justify-center mt-3">
          <div style={{
            fontSize: typo.body,
            color: '#3b82f6',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '8px 24px',
            borderRadius: '10px',
            border: '1px solid #334155'
          }}>
            Q = mc&Delta;T
          </div>
        </div>
      </>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">THERMAL PHYSICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        Heat Transfer & Capacity
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why does metal feel cold and wood feel warm at the same temperature?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />
        <div className="relative">
          <div className="text-7xl mb-6">🔥</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🌡️</div>
              <div className="text-xs text-slate-400">Temperature</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs text-slate-400">Conduction</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">💧</div>
              <div className="text-xs text-slate-400">Capacity</div>
            </div>
          </div>
          <p className="text-lg text-white/90 font-medium leading-relaxed">
            Discover the two key properties that govern thermal physics.
          </p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Exploring
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2"><span className="text-orange-400">*</span>Fourier's Law</div>
        <div className="flex items-center gap-2"><span className="text-orange-400">*</span>Specific Heat</div>
        <div className="flex items-center gap-2"><span className="text-orange-400">*</span>Real Applications</div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">{predictions.initial.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.initial.options.map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold mb-2">{selectedPrediction === 'A' ? 'Correct!' : 'Not quite!'}</p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button onClick={() => goToPhase('play')} style={{ zIndex: 10 }} className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Heat Conduction Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-lg">Watch how different materials conduct heat at different rates.</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
        {renderHeatConductionViz()}
      </div>

      {/* Material selector */}
      <div className="grid grid-cols-5 gap-2 mb-4 w-full max-w-lg">
        {Object.entries(materials).map(([key, mat]) => (
          <button
            key={key}
            onClick={() => {
              setSelectedMaterial(key as typeof selectedMaterial);
              setBarTemperatures(Array(20).fill(25));
              setIsHeating(false);
              setElapsedTime(0);
            }}
            style={{ zIndex: 10 }}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              selectedMaterial === key
                ? 'bg-orange-600/30 border-2 border-orange-500 text-orange-400'
                : 'bg-slate-700/50 border-2 border-transparent text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            {mat.name}
          </button>
        ))}
      </div>

      {/* Heat source slider */}
      <div className="bg-slate-800/50 rounded-xl p-4 w-full max-w-lg mb-4 border border-slate-700/50">
        <label className="text-orange-400 text-sm block mb-2">Heat Source: {heatSource}C</label>
        <input type="range" min={50} max={200} value={heatSource} onChange={(e) => setHeatSource(Number(e.target.value))} className="w-full accent-orange-500" />
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setIsHeating(!isHeating)}
          style={{ zIndex: 10 }}
          className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
            isHeating ? 'bg-red-600' : 'bg-gradient-to-r from-orange-500 to-red-500'
          }`}
        >
          {isHeating ? '⏸ Pause' : '🔥 Start Heating'}
        </button>
        <button
          onClick={() => { setBarTemperatures(Array(20).fill(25)); setIsHeating(false); setElapsedTime(0); }}
          style={{ zIndex: 10 }}
          className="px-4 py-3 rounded-xl bg-slate-700 text-white font-medium"
        >
          🔄 Reset
        </button>
      </div>

      <button onClick={() => goToPhase('review')} style={{ zIndex: 10 }} className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Conductivity</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6 border border-orange-700/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Fourier's Law</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 text-center">
            <span className="text-xl font-mono text-orange-300">Q/t = -kA(dT/dx)</span>
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>k = thermal conductivity</li>
            <li>A = cross-sectional area</li>
            <li>dT/dx = temperature gradient</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Why Metal Feels Cold</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">🥄</div>
              <div className="text-xs text-slate-400">High k = Cold</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-2xl">🪵</div>
              <div className="text-xs text-slate-400">Low k = Warm</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm">Your nerves sense heat FLOW, not temperature. Metal draws heat away faster!</p>
        </div>
      </div>
      <button onClick={() => goToPhase('twist_predict')} style={{ zIndex: 10 }} className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Discover Heat Capacity
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-6">Heat Capacity Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6 border border-blue-700/30">
        <p className="text-lg text-slate-300 mb-4">{predictions.twist.question}</p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {predictions.twist.options.map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl border border-slate-700/50">
          <p className="text-emerald-400 font-semibold mb-2">{twistPrediction === 'C' ? 'Excellent!' : 'Interesting guess!'}</p>
          <p className="text-slate-300 text-sm">{predictions.twist.explanation}</p>
          <button onClick={() => goToPhase('twist_play')} style={{ zIndex: 10 }} className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
            See the Heating Race
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">Heat Capacity Race</h2>
      <p className="text-slate-400 mb-6 text-center">Watch different substances race to 100C with the same heat input!</p>

      <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-2xl p-4 border border-slate-700/50 mb-6">
        {renderHeatCapacityViz()}
      </div>

      {/* Temperature readouts */}
      <div className="grid grid-cols-4 gap-2 mb-4 w-full max-w-lg">
        {Object.entries(specificHeats).map(([key, data]) => (
          <div key={key} className={`bg-slate-800/50 rounded-lg p-3 text-center border-2 ${substanceTemps[key] >= 100 ? 'border-emerald-500' : 'border-transparent'}`}>
            <div className="text-xs font-medium" style={{ color: data.color }}>{data.name}</div>
            <div className={`text-lg font-bold ${substanceTemps[key] >= 100 ? 'text-emerald-400' : 'text-white'}`}>{Math.round(substanceTemps[key])}C</div>
            {substanceTemps[key] >= 100 && <span className="text-sm">🏆</span>}
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setHeatingStarted(!heatingStarted)}
          style={{ zIndex: 10 }}
          className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
            heatingStarted ? 'bg-red-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
          }`}
        >
          {heatingStarted ? '⏸ Pause' : '🔥 Start All Burners'}
        </button>
        <button
          onClick={() => { setSubstanceTemps({ water: 25, oil: 25, aluminum: 25, iron: 25 }); setHeatingStarted(false); }}
          style={{ zIndex: 10 }}
          className="px-4 py-3 rounded-xl bg-slate-700 text-white font-medium"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-blue-900/30 rounded-xl p-4 max-w-lg border border-blue-700/30 mb-6">
        <h3 className="text-blue-400 font-semibold mb-2">Q = mcDeltaT</h3>
        <p className="text-slate-300 text-sm">Same Q, same m - higher c means smaller DeltaT. That's why water resists temperature change!</p>
      </div>

      <button onClick={() => goToPhase('twist_review')} style={{ zIndex: 10 }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-6">Specific Heat Capacity</h2>
      <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-blue-700/30">
        <h3 className="text-xl font-bold text-blue-400 mb-4">Two Properties, Two Roles</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-orange-400 font-semibold mb-2">Thermal Conductivity (k)</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>How fast heat spreads</li>
              <li>Metal feels cold (high k)</li>
              <li>Wood feels warm (low k)</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <h4 className="text-blue-400 font-semibold mb-2">Specific Heat (c)</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>Energy needed per degree</li>
              <li>Water buffers temperature</li>
              <li>Metals heat up fast</li>
            </ul>
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 mt-4 text-center">
          <span className="text-blue-400 font-mono">Q = mcDeltaT</span>
          <span className="text-slate-400 mx-2">|</span>
          <span className="text-orange-400 font-mono">Q/t = -kA(dT/dx)</span>
        </div>
      </div>
      <button onClick={() => goToPhase('transfer')} style={{ zIndex: 10 }} className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Physics Everywhere</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {realWorldApplications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-orange-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{realWorldApplications[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{realWorldApplications[activeAppTab].title}</h3>
            <p className="text-slate-400 text-sm">{realWorldApplications[activeAppTab].subtitle}</p>
          </div>
        </div>
        <p className="text-slate-300 mb-4">{realWorldApplications[activeAppTab].description}</p>
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <span className="text-orange-400 text-sm font-mono">{realWorldApplications[activeAppTab].formula}</span>
        </div>
        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-700/30">
          <p className="text-emerald-400 text-sm">{realWorldApplications[activeAppTab].realExample}</p>
        </div>
        <div className="flex gap-3 mt-4">
          {!completedApps.has(activeAppTab) && (
            <button onClick={() => handleAppComplete(activeAppTab)} style={{ zIndex: 10 }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
              Mark as Understood
            </button>
          )}
          {activeAppTab < realWorldApplications.length - 1 && (
            <button
              onClick={() => {
                if (!completedApps.has(activeAppTab)) {
                  handleAppComplete(activeAppTab);
                }
                setActiveAppTab(activeAppTab + 1);
              }}
              style={{ zIndex: 10 }}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium"
            >
              Next Application →
            </button>
          )}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{realWorldApplications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button onClick={() => goToPhase('test')} style={{ zIndex: 10 }} className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full max-h-[60vh] overflow-y-auto">
          {quizQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-orange-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => { setShowTestResults(true); playSound('complete'); }}
            disabled={testAnswers.includes(-1)}
            style={{ zIndex: 10 }}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center border border-slate-700/50">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? "Excellent! You've mastered thermal physics!" : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button onClick={() => goToPhase('mastery')} style={{ zIndex: 10 }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
              Claim Your Mastery Badge
            </button>
          ) : (
            <button onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }} style={{ zIndex: 10 }} className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl border border-orange-700/30">
        <div className="text-8xl mb-6">🔥</div>
        <h1 className="text-3xl font-bold text-white mb-4">Thermal Physics Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered heat transfer and thermal capacity!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Fourier's Law</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💧</div><p className="text-sm text-slate-300">Heat Capacity</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🍳</div><p className="text-sm text-slate-300">Cookware</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌊</div><p className="text-sm text-slate-300">Climate</p></div>
        </div>
        <button onClick={() => goToPhase('hook')} style={{ zIndex: 10 }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">Explore Again</button>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const getPhaseIndex = (p: Phase) => phaseOrder.indexOf(p);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Heat Transfer</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : getPhaseIndex(phase) > getPhaseIndex(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default HeatTransferCapacityRenderer;
