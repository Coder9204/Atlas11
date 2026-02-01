'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// LATENT HEAT RENDERER - GOLD STANDARD IMPLEMENTATION
// Physics: Q = mL (Heat = mass × latent heat)
// Phase changes occur at constant temperature while absorbing/releasing heat
// ============================================================================

// Game event types for analytics and state management
type GameEventType =
  | 'phase_started'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_completed'
  | 'parameter_changed'
  | 'heat_added'
  | 'phase_change_occurred'
  | 'temperature_changed'
  | 'material_selected'
  | 'twist_revealed'
  | 'insight_gained'
  | 'transfer_app_viewed'
  | 'test_answer_submitted'
  | 'test_completed'
  | 'mastery_achieved'
  | 'hint_requested'
  | 'reset_triggered'
  | 'sound_played'
  | 'animation_completed'
  | 'user_interaction';

// Test question interface with scenarios and explanations
interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

// Transfer application interface for real-world connections
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

// Game phase type
type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// Props interface
interface LatentHeatRendererProps {
  currentPhase: GamePhase;
  onPhaseComplete: (nextPhase: GamePhase) => void;
  onEvent?: (eventType: GameEventType, data?: Record<string, unknown>) => void;
}

// Phase change states
type PhaseState = 'solid' | 'melting' | 'liquid' | 'boiling' | 'gas';

// ============================================================================
// REAL-WORLD APPLICATIONS
// ============================================================================
const realWorldApps = [
  {
    icon: '🧊',
    title: 'Ice-Based Thermal Storage',
    short: 'Shifting cooling loads to off-peak',
    tagline: 'Freezing savings into every building',
    description: 'Large buildings make ice at night when electricity is cheap, then melt it during the day for air conditioning. The latent heat of fusion stores far more energy per kilogram than simply cooling water, making ice storage incredibly space-efficient.',
    connection: 'Just as we observed temperature staying constant during phase changes while heat is absorbed, ice storage exploits this phenomenon. Melting ice absorbs 334 kJ/kg without temperature change—10x more than cooling water by 8°C.',
    howItWorks: 'Chillers run overnight to freeze water in storage tanks. During peak hours, warm return air passes through coils surrounded by ice. The ice melts, absorbing heat and cooling the air. Phase change stores far more energy than sensible heat.',
    stats: [
      { value: '334 kJ/kg', label: 'Latent heat', icon: '⚡' },
      { value: '30%', label: 'Cost savings', icon: '📈' },
      { value: '$2.5B', label: 'Market size', icon: '🚀' }
    ],
    examples: ['Empire State Building ice system', 'Data center cooling', 'Hospital HVAC systems', 'University campus cooling'],
    companies: ['CALMAC', 'Ice Energy', 'DN Tanks', 'Baltimore Aircoil'],
    futureImpact: 'Phase change materials beyond ice will enable thermal storage at various temperatures, shifting heating and cooling loads to optimize renewable energy usage.',
    color: '#3B82F6'
  },
  {
    icon: '🔥',
    title: 'Steam Power Generation',
    short: 'Converting heat to electricity',
    tagline: 'The phase change that powers civilization',
    description: 'Power plants boil water to create steam that drives turbines. The massive latent heat of vaporization (2,260 kJ/kg) allows steam to carry enormous energy. Condensing the steam releases this energy to reheat feedwater, improving efficiency.',
    connection: 'Our simulation showed temperature staying constant during boiling as energy converts water to steam. Power plants exploit this: high-pressure steam carries latent heat energy that converts to mechanical work in turbines.',
    howItWorks: 'Burning fuel or nuclear reactions boil water at high pressure. Steam expands through turbine stages, converting thermal energy to rotation. Condensers use cooling water to remove latent heat, returning steam to liquid for reheating.',
    stats: [
      { value: '2,260 kJ/kg', label: 'Latent heat', icon: '⚡' },
      { value: '45%', label: 'Plant efficiency', icon: '📈' },
      { value: '60%', label: 'World electricity', icon: '🚀' }
    ],
    examples: ['Nuclear power plants', 'Coal-fired generators', 'Combined-cycle gas plants', 'Geothermal power stations'],
    companies: ['GE Vernova', 'Siemens Energy', 'Mitsubishi Power', 'Westinghouse'],
    futureImpact: 'Supercritical CO₂ cycles operating above the critical point will eliminate phase change inefficiencies while maintaining the energy density benefits of high-pressure working fluids.',
    color: '#EF4444'
  },
  {
    icon: '🏠',
    title: 'Phase Change Building Materials',
    short: 'Walls that store heat',
    tagline: 'Passive temperature regulation',
    description: 'Building materials embedded with phase change materials (PCMs) absorb excess heat during the day by melting and release it at night by freezing. This passive thermal mass smooths temperature swings without active cooling.',
    connection: 'Like our melting ice experiment, PCMs absorb heat at constant temperature during melting. Walls with microencapsulated PCMs act as thermal batteries, storing daytime heat for nighttime release.',
    howItWorks: 'Microencapsulated paraffin wax (melting point 21-25°C) is embedded in drywall, ceiling tiles, or concrete. During hot periods, the wax melts and absorbs heat. At night, it solidifies and releases heat, maintaining comfortable temperatures.',
    stats: [
      { value: '200 kJ/kg', label: 'PCM capacity', icon: '⚡' },
      { value: '25%', label: 'Energy reduction', icon: '📈' },
      { value: '$1.8B', label: 'PCM market', icon: '🚀' }
    ],
    examples: ['PCM-enhanced drywall', 'Thermal mass concrete', 'Cool roof coatings', 'Window shading systems'],
    companies: ['Phase Change Energy', 'Microtek', 'Rubitherm', 'Entropy Solutions'],
    futureImpact: 'Bio-based PCMs from coconut oil and other renewables will replace petroleum-based materials, creating truly sustainable thermal storage for net-zero buildings.',
    color: '#10B981'
  },
  {
    icon: '🍦',
    title: 'Food Preservation',
    short: 'Keeping food fresh and safe',
    tagline: 'Cold chain science in every bite',
    description: 'Freezing food removes latent heat of fusion, dramatically slowing spoilage by immobilizing water molecules. Understanding phase change is crucial for flash-freezing that preserves texture and for maintaining the cold chain during transport.',
    connection: 'Removing 334 kJ/kg to freeze water is far more demanding than just cooling to 0°C. This is why freezing food requires powerful refrigeration, but once frozen, the food stays cold much longer—the latent heat must be re-added to thaw it.',
    howItWorks: 'Flash freezing passes food through -40°C environments in minutes, creating small ice crystals that don\'t damage cell walls. During transport, eutectic plates provide phase-change thermal mass that maintains temperature even if refrigeration fails.',
    stats: [
      { value: '-18°C', label: 'Storage temp', icon: '⚡' },
      { value: '$300B', label: 'Cold chain market', icon: '📈' },
      { value: '1 year+', label: 'Shelf life', icon: '🚀' }
    ],
    examples: ['IQF frozen vegetables', 'Ice cream production', 'Vaccine cold chain', 'Frozen seafood shipping'],
    companies: ['Carrier', 'Thermo King', 'Lineage Logistics', 'Americold'],
    futureImpact: 'Smart packaging with PCM indicators will show if temperature excursions occurred during shipping, ensuring food safety and reducing waste from precautionary disposal.',
    color: '#F59E0B'
  }
];

// ============================================================================
// COMPREHENSIVE TEST QUESTIONS (10 questions with scenarios)
// ============================================================================
const testQuestions: TestQuestion[] = [
  {
    scenario: "You're making ice cubes for a party. You put water in the freezer and check on it periodically.",
    question: "Why does the temperature stay at 0°C even though the freezer keeps removing heat?",
    options: [
      { text: "The thermometer is broken", correct: false },
      { text: "Energy is being used to change molecular bonds, not temperature", correct: true },
      { text: "The freezer isn't cold enough", correct: false },
      { text: "Water can't get colder than 0°C", correct: false }
    ],
    explanation: "During a phase change, all added or removed energy goes into breaking or forming molecular bonds rather than changing temperature. This is latent heat - the 'hidden' heat that changes state, not temperature. Water releases 334 J/g as latent heat of fusion while freezing at constant 0°C."
  },
  {
    scenario: "A chef notices that a pot of boiling water stays at exactly 100°C no matter how high they turn up the burner.",
    question: "What happens to all that extra heat energy?",
    options: [
      { text: "It escapes through the pot walls", correct: false },
      { text: "It converts water molecules from liquid to gas", correct: true },
      { text: "It heats the air above the pot", correct: false },
      { text: "It's wasted as sound energy", correct: false }
    ],
    explanation: "The extra heat energy is absorbed as latent heat of vaporization (2,260 J/g for water), converting liquid water molecules into steam. This is why boiling water remains at 100°C regardless of heat input - the energy changes state, not temperature."
  },
  {
    scenario: "An engineer is designing a thermal storage system and needs to store maximum heat in minimum space.",
    question: "Why would using phase-change materials be more efficient than just heating water?",
    options: [
      { text: "Phase-change materials are cheaper", correct: false },
      { text: "Water takes too long to heat up", correct: false },
      { text: "Latent heat stores much more energy per gram than temperature change", correct: true },
      { text: "Phase-change materials never melt", correct: false }
    ],
    explanation: "Latent heat of fusion for water (334 J/g) is equivalent to heating water by 80°C! Phase-change materials store enormous amounts of energy during melting/solidifying at constant temperature, making them incredibly efficient for thermal storage."
  },
  {
    scenario: "You spill some rubbing alcohol on your skin and it feels cold even though the bottle was at room temperature.",
    question: "What causes the cooling sensation?",
    options: [
      { text: "Alcohol is naturally colder than water", correct: false },
      { text: "The alcohol absorbs heat from your skin to evaporate", correct: true },
      { text: "Chemical reaction with your skin", correct: false },
      { text: "The alcohol creates tiny ice crystals", correct: false }
    ],
    explanation: "Evaporation requires latent heat of vaporization. The alcohol absorbs this heat energy from your skin to change from liquid to gas, cooling your skin in the process. This is the same principle behind sweating - evaporative cooling."
  },
  {
    scenario: "A paramedic warns that steam burns at 100°C are far more dangerous than boiling water burns at the same temperature.",
    question: "Why does steam cause more severe burns?",
    options: [
      { text: "Steam is actually hotter than 100°C", correct: false },
      { text: "Steam releases latent heat when it condenses on skin", correct: true },
      { text: "Steam contains more oxygen", correct: false },
      { text: "Steam penetrates deeper into skin", correct: false }
    ],
    explanation: "When steam condenses on your skin, it releases 2,260 J/g of latent heat of vaporization IN ADDITION to the heat from cooling. This is over 5 times more energy than just the heat content of 100°C water, making steam burns much more severe."
  },
  {
    scenario: "During a spring thaw, a lake's ice slowly melts over several days even though air temperatures are consistently above freezing.",
    question: "Why does it take so long for the ice to melt?",
    options: [
      { text: "The air isn't warm enough", correct: false },
      { text: "Water insulates the ice from warm air", correct: false },
      { text: "Melting requires absorbing large amounts of latent heat", correct: true },
      { text: "The lake water is too cold", correct: false }
    ],
    explanation: "Melting ice requires 334 J/g of latent heat - the same energy needed to heat water from 0°C to 80°C! This enormous energy requirement means lakes take days to melt even in warm weather, which helps moderate spring temperatures and protect ecosystems."
  },
  {
    scenario: "A food scientist is developing instant cold packs for athletic injuries without refrigeration.",
    question: "Which principle should they use?",
    options: [
      { text: "Compress air to make it cold", correct: false },
      { text: "Use chemicals that absorb heat when dissolving (endothermic)", correct: true },
      { text: "Use metal plates that conduct heat away", correct: false },
      { text: "Create a vacuum to remove heat", correct: false }
    ],
    explanation: "Cold packs use endothermic dissolution - similar to latent heat absorption. When ammonium nitrate dissolves in water, it absorbs energy from surroundings (like latent heat during melting), creating instant cold without refrigeration."
  },
  {
    scenario: "An HVAC engineer is explaining why air conditioners can cool rooms even when it's hotter outside than inside.",
    question: "What role does the refrigerant's phase change play?",
    options: [
      { text: "It creates cold air directly", correct: false },
      { text: "It absorbs indoor heat by evaporating, releases it outside by condensing", correct: true },
      { text: "It filters out hot air molecules", correct: false },
      { text: "It generates electricity that powers cooling fans", correct: false }
    ],
    explanation: "Refrigerants exploit latent heat: they evaporate (absorbing latent heat) inside where you want cooling, then condense (releasing latent heat) outside. This 'heat pump' moves thermal energy against the temperature gradient using phase changes."
  },
  {
    scenario: "Mountain climbers notice that water boils at 70°C at high altitude instead of 100°C.",
    question: "What happens to the latent heat of vaporization at lower pressure?",
    options: [
      { text: "It stays exactly the same", correct: false },
      { text: "It increases dramatically", correct: false },
      { text: "It decreases slightly, but still dominates the energy transfer", correct: true },
      { text: "It becomes zero", correct: false }
    ],
    explanation: "At lower pressure, boiling point decreases and latent heat of vaporization decreases slightly. However, phase change still requires substantial energy - food cooks slower at altitude because water boils at lower temperature, not because less energy transfers."
  },
  {
    scenario: "A materials scientist is comparing ice at 0°C with water at 0°C for a cooling application.",
    question: "Which provides more cooling capacity and why?",
    options: [
      { text: "They're equivalent since both are at 0°C", correct: false },
      { text: "Water, because liquid flows better", correct: false },
      { text: "Ice, because melting absorbs latent heat while staying at 0°C", correct: true },
      { text: "Ice, because it's denser than water", correct: false }
    ],
    explanation: "Ice at 0°C has far more cooling capacity because as it melts, it absorbs 334 J/g of latent heat while remaining at 0°C. Water at 0°C can only absorb heat by warming up. This is why ice packs work so well - they absorb heat without temperature rise!"
  }
];

// ============================================================================
// TRANSFER APPLICATIONS (4 real-world applications)
// ============================================================================
const transferApps: TransferApp[] = [
  {
    icon: "❄️",
    title: "Air Conditioning & Refrigeration",
    short: "HVAC Systems",
    tagline: "Cooling through phase change cycles",
    description: "Modern cooling systems exploit latent heat by cycling refrigerants through evaporation and condensation. The refrigerant absorbs room heat when evaporating (inside unit) and releases it when condensing (outside unit).",
    connection: "Latent heat of vaporization allows refrigerants to absorb massive amounts of heat at constant temperature, then release it elsewhere - essentially 'pumping' heat against natural flow.",
    howItWorks: "Refrigerant evaporates at low pressure (absorbing ~200 kJ/kg), is compressed to high pressure, then condenses outside (releasing that heat). The cycle repeats, continuously moving heat from cold to hot.",
    stats: [
      { value: "1.5B", label: "AC units globally" },
      { value: "2,000%", label: "Efficiency via latent heat" },
      { value: "10%", label: "Of global electricity" },
      { value: "~200 kJ/kg", label: "Heat moved per cycle" }
    ],
    examples: [
      "Home air conditioners using R-410A refrigerant",
      "Commercial freezers maintaining -20°C",
      "Car AC systems cooling cabins quickly",
      "Industrial chillers for manufacturing"
    ],
    companies: ["Carrier", "Daikin", "Trane", "Honeywell"],
    futureImpact: "Next-generation systems use natural refrigerants like CO2 and ammonia with optimized latent heat properties, reducing environmental impact while maintaining efficiency.",
    color: "#3b82f6"
  },
  {
    icon: "🏠",
    title: "Thermal Energy Storage",
    short: "PCM Buildings",
    tagline: "Storing heat in phase changes",
    description: "Phase Change Materials (PCMs) embedded in building materials absorb excess heat by melting during the day and release it by solidifying at night, naturally regulating indoor temperature.",
    connection: "Latent heat stores 5-14x more energy per mass than sensible heating. A thin layer of PCM can store as much heat as a thick concrete wall.",
    howItWorks: "Microencapsulated paraffin wax (melting at 23°C) is mixed into drywall. When rooms heat up, the wax melts absorbing ~200 kJ/kg. At night, it solidifies, releasing that heat.",
    stats: [
      { value: "200 kJ/kg", label: "Energy density" },
      { value: "30%", label: "HVAC energy savings" },
      { value: "5-14x", label: "More storage than concrete" },
      { value: "20-30°C", label: "Optimal melt range" }
    ],
    examples: [
      "BioPCM panels in office ceiling tiles",
      "Ice storage systems for peak shaving",
      "Solar thermal storage tanks",
      "Shipping containers for pharmaceuticals"
    ],
    companies: ["Phase Change Energy", "Entropy Solutions", "PCM Products", "Sunamp"],
    futureImpact: "Smart PCM systems with tunable melting points will enable zero-energy buildings that passively maintain comfort without mechanical heating or cooling.",
    color: "#10b981"
  },
  {
    icon: "💧",
    title: "Sweating & Evaporative Cooling",
    short: "Biological Cooling",
    tagline: "Nature's air conditioning",
    description: "Sweating is evolution's elegant use of latent heat. When sweat evaporates from skin, it absorbs 2,400 kJ/kg of latent heat, providing powerful cooling without any mechanical system.",
    connection: "The enormous latent heat of vaporization of water (2,260 J/g) makes sweating incredibly efficient - a few hundred grams of sweat can dissipate thousands of kilojoules.",
    howItWorks: "Sweat glands release water onto skin. Ambient heat provides the latent heat of vaporization, converting liquid sweat to vapor. This heat comes from your body, cooling you down.",
    stats: [
      { value: "2,260 J/g", label: "Latent heat of sweat" },
      { value: "600 W", label: "Max cooling power" },
      { value: "2-4 L/hr", label: "Peak sweat rate" },
      { value: "98.6°F", label: "Body temp maintained" }
    ],
    examples: [
      "Athletes cooling during intense exercise",
      "Desert animals with specialized sweat glands",
      "Evaporative coolers (swamp coolers) for homes",
      "Wet bulb temperature in meteorology"
    ],
    companies: ["Nike (cooling fabrics)", "Under Armour", "Columbia", "Patagonia"],
    futureImpact: "Biomimetic cooling fabrics enhance natural evaporation, while personal cooling devices mimic sweating for workers in extreme heat environments.",
    color: "#f59e0b"
  },
  {
    icon: "🌡️",
    title: "Steam Power Generation",
    short: "Power Plants",
    tagline: "Harnessing vaporization energy",
    description: "Most electricity worldwide comes from boiling water into steam to spin turbines. The massive latent heat of vaporization means steam carries enormous energy for power generation.",
    connection: "Converting water to steam at 100°C absorbs 2,260 J/g - enough energy to heat the same water from 0°C to 540°C if it were possible! This concentrated energy drives turbines efficiently.",
    howItWorks: "Fuel (coal, nuclear, natural gas) heats water. At 100°C, water absorbs latent heat becoming high-pressure steam. Steam expands through turbine blades, converting thermal energy to mechanical rotation.",
    stats: [
      { value: "80%", label: "Global electricity from steam" },
      { value: "2,260 J/g", label: "Energy in steam" },
      { value: "600°C", label: "Superheated steam temp" },
      { value: "45%", label: "Best plant efficiency" }
    ],
    examples: [
      "Nuclear plants producing 24/7 baseload power",
      "Combined-cycle natural gas plants",
      "Concentrated solar thermal (CSP) plants",
      "Geothermal steam from underground"
    ],
    companies: ["GE Power", "Siemens Energy", "Mitsubishi Power", "Westinghouse"],
    futureImpact: "Supercritical and ultra-supercritical steam cycles achieve higher efficiency by operating above water's critical point, extracting more work from the same fuel.",
    color: "#8b5cf6"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const LatentHeatRenderer: React.FC<LatentHeatRendererProps> = ({
  currentPhase,
  onPhaseComplete,
  onEvent
}) => {
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationRef = useRef<number>(0);

  // Audio context for sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<number>(0);
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [temperature, setTemperature] = useState(-20);
  const [heatAdded, setHeatAdded] = useState(0);
  const [phaseState, setPhaseState] = useState<PhaseState>('solid');
  const [heatingPower, setHeatingPower] = useState(50);
  const [meltProgress, setMeltProgress] = useState(0);
  const [boilProgress, setBoilProgress] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Twist simulation state
  const [twistSimulating, setTwistSimulating] = useState(false);
  const [steamEnergy, setSteamEnergy] = useState(0);
  const [waterEnergy, setWaterEnergy] = useState(0);

  // Initialize responsive detection
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

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sound effect helper
  const playSound = useCallback((type: 'bubble' | 'phase' | 'success' | 'click') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'bubble':
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;
      case 'phase':
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
        break;
    }

    onEvent?.('sound_played', { type });
  }, [onEvent]);

  // Debounced navigation helper
  const handleNavigation = useCallback((nextPhase: GamePhase) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    lastNavigationRef.current = now;
    navigationTimeoutRef.current = setTimeout(() => {
      playSound('click');
      onPhaseComplete(nextPhase);
    }, 50);
  }, [onPhaseComplete, playSound]);

  // Cleanup navigation timeout
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Phase change simulation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    // Constants for water
    const specificHeatIce = 2.09; // J/g·°C
    const specificHeatWater = 4.18; // J/g·°C
    const specificHeatSteam = 2.01; // J/g·°C
    const latentHeatFusion = 334; // J/g
    const latentHeatVaporization = 2260; // J/g
    const mass = 100; // grams

    let lastTime = performance.now();
    let localMeltProgress = meltProgress;
    let localBoilProgress = boilProgress;

    const simulate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Heat added per second (Joules)
      const heatRate = heatingPower * 10; // Scale for visibility
      const heatThisFrame = heatRate * dt;

      setHeatAdded(prev => prev + heatThisFrame);

      setTemperature(prevTemp => {
        // Heating ice (below 0°C)
        if (prevTemp < 0) {
          setPhaseState('solid');
          const dT = heatThisFrame / (mass * specificHeatIce);
          const newTemp = prevTemp + dT;
          return Math.min(newTemp, 0);
        }

        // Melting (at 0°C)
        if (prevTemp >= 0 && localMeltProgress < 1) {
          setPhaseState('melting');
          const energyToMelt = mass * latentHeatFusion;
          localMeltProgress += heatThisFrame / energyToMelt;
          setMeltProgress(localMeltProgress);

          if (localMeltProgress >= 1) {
            playSound('phase');
            onEvent?.('phase_change_occurred', { from: 'solid', to: 'liquid' });
            return 0.1; // Just above 0
          }
          return 0;
        }

        // Heating water (0°C to 100°C)
        if (prevTemp >= 0 && prevTemp < 100 && localMeltProgress >= 1) {
          setPhaseState('liquid');
          const dT = heatThisFrame / (mass * specificHeatWater);
          const newTemp = prevTemp + dT;
          return Math.min(newTemp, 100);
        }

        // Boiling (at 100°C)
        if (prevTemp >= 100 && localBoilProgress < 1) {
          setPhaseState('boiling');
          const energyToBoil = mass * latentHeatVaporization;
          localBoilProgress += heatThisFrame / energyToBoil;
          setBoilProgress(localBoilProgress);

          if (Math.random() < 0.1) playSound('bubble');

          if (localBoilProgress >= 1) {
            playSound('phase');
            onEvent?.('phase_change_occurred', { from: 'liquid', to: 'gas' });
            setIsSimulating(false);
            onEvent?.('simulation_completed', { finalState: 'gas' });
            return 100.1;
          }
          return 100;
        }

        // Steam (above 100°C)
        if (prevTemp >= 100 && localBoilProgress >= 1) {
          setPhaseState('gas');
          const dT = heatThisFrame / (mass * specificHeatSteam);
          return prevTemp + dT;
        }

        return prevTemp;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSimulating, heatingPower, meltProgress, boilProgress, onEvent, playSound]);

  // Twist simulation (steam vs water burn comparison)
  useEffect(() => {
    if (!twistSimulating) return;

    const interval = setInterval(() => {
      // Steam releases latent heat + sensible heat
      setSteamEnergy(prev => {
        const newEnergy = prev + 2.678; // 2260 + 418 J/g scaled
        if (newEnergy >= 100) {
          setTwistSimulating(false);
          playSound('phase');
        }
        return Math.min(newEnergy, 100);
      });

      // Water only releases sensible heat
      setWaterEnergy(prev => Math.min(prev + 0.418, 100));
    }, 50);

    return () => clearInterval(interval);
  }, [twistSimulating, playSound]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTemperature(-20);
    setHeatAdded(0);
    setPhaseState('solid');
    setMeltProgress(0);
    setBoilProgress(0);
    setIsSimulating(false);
    onEvent?.('reset_triggered', { phase: currentPhase });
  }, [currentPhase, onEvent]);

  // Handle test answer
  const handleTestAnswer = useCallback((optionIndex: number) => {
    if (testAnswers[testIndex] !== null) return;

    const newAnswers = [...testAnswers];
    newAnswers[testIndex] = optionIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[testIndex].options[optionIndex].correct;
    if (isCorrect) {
      setTestScore(prev => prev + 1);
      playSound('success');
    } else {
      playSound('click');
    }

    setShowExplanation(true);
    onEvent?.('test_answer_submitted', {
      questionIndex: testIndex,
      correct: isCorrect,
      score: isCorrect ? testScore + 1 : testScore
    });
  }, [testIndex, testAnswers, testScore, onEvent, playSound]);

  // ============================================================================
  // RENDER HELPER FUNCTIONS (not React components)
  // ============================================================================

  // Render ice/water/steam visualization
  const renderSubstanceVisualization = (): React.ReactNode => {
    return (
      <svg viewBox="0 0 300 200" className="w-full h-48">
        <defs>
          <linearGradient id="containerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
          <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <radialGradient id="iceGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Burner flame */}
        {isSimulating && (
          <g>
            {[0, 1, 2].map(i => (
              <ellipse
                key={i}
                cx={100 + i * 50}
                cy={180}
                rx={15}
                ry={25}
                fill="url(#flameGradient)"
                opacity={0.8}
                filter="url(#glow)"
              >
                <animate
                  attributeName="ry"
                  values="25;35;25"
                  dur={`${0.3 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              </ellipse>
            ))}
          </g>
        )}

        {/* Container/beaker */}
        <rect
          x="50"
          y="60"
          width="200"
          height="110"
          rx="5"
          fill="url(#containerGradient)"
          stroke="#718096"
          strokeWidth="3"
        />

        {/* Substance visualization based on phase */}
        {phaseState === 'solid' && (
          <g>
            {/* Ice cubes */}
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={65 + col * 45}
                  y={80 + row * 30}
                  width={35}
                  height={25}
                  rx={3}
                  fill="url(#iceGradient)"
                  stroke="#bae6fd"
                  strokeWidth="1"
                  opacity={0.9}
                />
              ))
            )}
          </g>
        )}

        {phaseState === 'melting' && (
          <g>
            {/* Melting ice with water below */}
            <rect
              x="55"
              y={100 + meltProgress * 30}
              width="190"
              height={65 - meltProgress * 30}
              fill="#67e8f9"
              opacity={0.8}
            />
            {/* Remaining ice */}
            {[0, 1].map((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`melt-${row}-${col}`}
                  x={75 + col * 50}
                  y={75 + row * 25}
                  width={35}
                  height={20}
                  rx={3}
                  fill="url(#iceGradient)"
                  stroke="#bae6fd"
                  strokeWidth="1"
                  opacity={0.7 - meltProgress * 0.5}
                >
                  <animate
                    attributeName="y"
                    values={`${75 + row * 25};${80 + row * 25};${75 + row * 25}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </rect>
              ))
            )}
          </g>
        )}

        {(phaseState === 'liquid' || phaseState === 'boiling') && (
          <g>
            {/* Water */}
            <rect
              x="55"
              y="75"
              width="190"
              height="90"
              fill="#22d3ee"
              opacity={0.85}
            >
              {phaseState === 'boiling' && (
                <animate
                  attributeName="opacity"
                  values="0.85;0.75;0.85"
                  dur="0.3s"
                  repeatCount="indefinite"
                />
              )}
            </rect>

            {/* Bubbles for boiling */}
            {phaseState === 'boiling' && (
              <g>
                {[...Array(8)].map((_, i) => (
                  <circle
                    key={i}
                    cx={80 + (i * 17) % 140}
                    cy={150}
                    r={3 + (i % 3) * 2}
                    fill="white"
                    opacity={0.6}
                  >
                    <animate
                      attributeName="cy"
                      values="150;80"
                      dur={`${0.8 + (i % 3) * 0.2}s`}
                      repeatCount="indefinite"
                      begin={`${(i % 5) * 0.1}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0"
                      dur={`${0.8 + (i % 3) * 0.2}s`}
                      repeatCount="indefinite"
                      begin={`${(i % 5) * 0.1}s`}
                    />
                  </circle>
                ))}
              </g>
            )}
          </g>
        )}

        {phaseState === 'gas' && (
          <g>
            {/* Steam clouds */}
            {[...Array(6)].map((_, i) => (
              <ellipse
                key={i}
                cx={100 + (i % 3) * 50}
                cy={80 + Math.floor(i / 3) * 40}
                rx={25}
                ry={15}
                fill="white"
                opacity={0.5}
              >
                <animate
                  attributeName="cy"
                  values={`${80 + Math.floor(i / 3) * 40};${40 + Math.floor(i / 3) * 40}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </ellipse>
            ))}
          </g>
        )}

        {/* Thermometer */}
        <rect x="260" y="40" width="20" height="130" rx="10" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" />
        <rect
          x="265"
          y={165 - Math.max(0, (temperature + 20) / 140) * 120}
          width="10"
          height={Math.max(5, (temperature + 20) / 140 * 120)}
          rx="5"
          fill={temperature > 80 ? '#ef4444' : temperature > 0 ? '#f59e0b' : '#3b82f6'}
        />

        {/* Temperature label */}
        <text x="270" y="35" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="bold">
          {temperature.toFixed(0)}°C
        </text>
      </svg>
    );
  };

  // Render temperature vs heat graph
  const renderHeatingCurve = (): React.ReactNode => {
    // Simplified heating curve points
    const curvePoints = [
      { x: 0, y: 180 },    // Start: ice at -20°C
      { x: 30, y: 140 },   // Ice heats to 0°C
      { x: 80, y: 140 },   // Melting plateau (latent heat)
      { x: 110, y: 40 },   // Water heats to 100°C
      { x: 200, y: 40 },   // Boiling plateau (latent heat)
      { x: 230, y: 20 },   // Steam heats up
    ];

    const pathD = curvePoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x + 40} ${p.y}`
    ).join(' ');

    // Current position based on temperature and phase
    const getCurrentX = () => {
      if (temperature < 0) return 40 + (temperature + 20) / 20 * 30;
      if (phaseState === 'melting') return 70 + meltProgress * 50;
      if (temperature <= 100 && phaseState === 'liquid') return 120 + (temperature / 100) * 30;
      if (phaseState === 'boiling') return 150 + boilProgress * 50;
      return 240;
    };

    const getCurrentY = () => {
      if (temperature < 0) return 180 - (temperature + 20) / 20 * 40;
      if (phaseState === 'melting') return 140;
      if (temperature <= 100 && phaseState === 'liquid') return 140 - (temperature / 100) * 100;
      if (phaseState === 'boiling') return 40;
      return 20;
    };

    return (
      <svg viewBox="0 0 300 200" className="w-full h-32">
        <defs>
          <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="35%" stopColor="#22d3ee" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Axes */}
        <line x1="40" y1="180" x2="280" y2="180" stroke="#9ca3af" strokeWidth="2" />
        <line x1="40" y1="20" x2="40" y2="180" stroke="#9ca3af" strokeWidth="2" />

        {/* Labels */}
        <text x="160" y="198" textAnchor="middle" fill="#6b7280" fontSize="10">Heat Added (Q)</text>
        <text x="15" y="100" textAnchor="middle" fill="#6b7280" fontSize="10" transform="rotate(-90, 15, 100)">Temperature</text>

        {/* Phase labels */}
        <text x="55" y="170" fill="#3b82f6" fontSize="8">Ice</text>
        <text x="90" y="155" fill="#22d3ee" fontSize="8">Melting</text>
        <text x="125" y="90" fill="#06b6d4" fontSize="8">Water</text>
        <text x="165" y="55" fill="#f59e0b" fontSize="8">Boiling</text>
        <text x="235" y="35" fill="#ef4444" fontSize="8">Steam</text>

        {/* Heating curve */}
        <path d={pathD} fill="none" stroke="url(#curveGrad)" strokeWidth="3" />

        {/* Current position indicator */}
        <circle
          cx={getCurrentX()}
          cy={getCurrentY()}
          r="6"
          fill="#10b981"
          stroke="white"
          strokeWidth="2"
        >
          {isSimulating && (
            <animate attributeName="r" values="6;8;6" dur="0.5s" repeatCount="indefinite" />
          )}
        </circle>
      </svg>
    );
  };

  // Render twist visualization (steam vs water burn)
  const renderTwistVisualization = (): React.ReactNode => {
    return (
      <svg viewBox="0 0 300 180" className="w-full h-44">
        <defs>
          <linearGradient id="steamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#fee2e2" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Steam side */}
        <g>
          <text x="75" y="20" textAnchor="middle" fill="#374151" fontSize="14" fontWeight="bold">
            Steam (100°C)
          </text>

          {/* Steam container */}
          <rect x="25" y="30" width="100" height="100" rx="5" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2" />

          {/* Energy bar */}
          <rect
            x="30"
            y={130 - steamEnergy}
            width="90"
            height={steamEnergy}
            fill="url(#steamGrad)"
            rx="3"
          />

          {/* Steam clouds */}
          {steamEnergy > 10 && [...Array(3)].map((_, i) => (
            <ellipse
              key={i}
              cx={55 + i * 20}
              cy={50}
              rx={12}
              ry={8}
              fill="white"
              opacity={0.7}
            >
              <animate attributeName="cy" values="50;35;50" dur="1s" repeatCount="indefinite" />
            </ellipse>
          ))}

          <text x="75" y="145" textAnchor="middle" fill="#374151" fontSize="10">
            Latent + Sensible
          </text>
          <text x="75" y="158" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
            {(steamEnergy * 26.78).toFixed(0)} J/g
          </text>
        </g>

        {/* Water side */}
        <g>
          <text x="225" y="20" textAnchor="middle" fill="#374151" fontSize="14" fontWeight="bold">
            Water (100°C)
          </text>

          {/* Water container */}
          <rect x="175" y="30" width="100" height="100" rx="5" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="2" />

          {/* Energy bar */}
          <rect
            x="180"
            y={130 - waterEnergy}
            width="90"
            height={waterEnergy}
            fill="url(#waterGrad)"
            rx="3"
          />

          {/* Water surface */}
          <rect x="180" y="80" width="90" height="45" fill="#60a5fa" opacity="0.5" rx="3" />

          <text x="225" y="145" textAnchor="middle" fill="#374151" fontSize="10">
            Sensible Only
          </text>
          <text x="225" y="158" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">
            {(waterEnergy * 4.18).toFixed(0)} J/g
          </text>
        </g>

        {/* Comparison arrow */}
        {steamEnergy > 50 && (
          <g>
            <line x1="135" y1="80" x2="165" y2="80" stroke="#10b981" strokeWidth="2" />
            <polygon points="165,75 175,80 165,85" fill="#10b981" />
            <text x="150" y="70" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
              {((steamEnergy * 26.78) / (waterEnergy * 4.18 || 1)).toFixed(1)}x more!
            </text>
          </g>
        )}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Hook phase - engaging opening
  const renderHook = (): React.ReactNode => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-amber-400/80 text-sm font-medium tracking-wide uppercase">Thermal Physics</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
        The Mystery of the Watched Pot
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        Where does all that energy go?
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="text-center mb-4">
          <span className="text-6xl">🍳</span>
        </div>
        <p className="text-gray-300 text-center leading-relaxed mb-4">
          No matter how high you turn the flame, the water
          <span className="text-orange-400 font-bold"> refuses to get hotter than 100°C</span>.
        </p>
        <p className="text-gray-400 text-sm text-center">
          The burner is pumping in massive amounts of heat energy...
          but the temperature stays perfectly flat.
        </p>
      </div>

      {/* CTA Button */}
      <button
        onPointerDown={() => handleNavigation('predict')}
        className="group px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center gap-2 text-white"
      >
        Discover the Hidden Heat
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn how latent heat transforms matter itself
      </p>
    </div>
  );

  // Predict phase
  const renderPredict = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">Make Your Prediction</h2>
        <p className="text-gray-600">
          We're going to heat ice from -20°C continuously.
          What will the temperature graph look like?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { id: 'A', text: 'Temperature rises steadily in a straight line', desc: 'Constant rate from start to finish' },
          { id: 'B', text: 'Temperature rises, then has flat plateaus', desc: 'Pauses at certain temperatures' },
          { id: 'C', text: 'Temperature rises faster and faster', desc: 'Exponential curve upward' },
          { id: 'D', text: 'Temperature oscillates up and down', desc: 'Wavy pattern throughout' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={() => {
              setPrediction(option.id);
              playSound('click');
              onEvent?.('prediction_made', { prediction: option.id });
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                prediction === option.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {option.id}
              </span>
              <div>
                <p className="font-medium text-gray-800">{option.text}</p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onPointerDown={() => handleNavigation('play')}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  // Play phase - interactive simulation
  const renderPlay = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Heat the Ice</h2>
        <p className="text-gray-600">Watch what happens to temperature as heat is added</p>
      </div>

      <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-4 border">
        {renderSubstanceVisualization()}
      </div>

      <div className="bg-white rounded-xl p-4 border">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">Heating Curve (Temp vs Heat)</h3>
        {renderHeatingCurve()}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Phase</p>
          <p className="font-bold text-blue-600 capitalize">{phaseState}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Temperature</p>
          <p className="font-bold text-orange-600">{temperature.toFixed(1)}°C</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Heat Added</p>
          <p className="font-bold text-purple-600">{(heatAdded / 1000).toFixed(1)} kJ</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Heating Power:</span>
          <span className="font-medium">{heatingPower} W</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={heatingPower}
          onChange={(e) => setHeatingPower(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex gap-3">
        <button
          onPointerDown={() => {
            if (!isSimulating) {
              setIsSimulating(true);
              playSound('click');
              onEvent?.('simulation_started', { heatingPower });
            } else {
              setIsSimulating(false);
            }
          }}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
            isSimulating
              ? 'bg-orange-500 text-white'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
          }`}
        >
          {isSimulating ? 'Pause' : 'Start Heating'}
        </button>

        <button
          onPointerDown={() => {
            resetSimulation();
            playSound('click');
          }}
          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
        >
          Reset
        </button>
      </div>

      {phaseState === 'gas' && (
        <button
          onPointerDown={() => handleNavigation('review')}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          See What Happened
        </button>
      )}
    </div>
  );

  // Review phase
  const renderReview = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">The Heating Curve Explained</h2>
        <p className="text-gray-600">
          {prediction === 'B'
            ? "Your prediction was correct! Temperature plateaus during phase changes."
            : "The answer was B — temperature pauses at phase changes!"}
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
        <h3 className="font-semibold text-purple-800 mb-4">Latent Heat: The "Hidden" Heat</h3>
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Latent</strong> means "hidden" in Latin. During phase changes, heat energy
            is absorbed but doesn't raise temperature — it's "hidden" in the molecular bonds.
          </p>
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-center font-mono text-lg text-purple-700">
              Q = m × L
            </p>
            <p className="text-center text-sm text-gray-500 mt-1">
              Heat = mass × latent heat
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 flex items-center gap-2">
            Latent Heat of Fusion
          </h4>
          <p className="text-3xl font-bold text-blue-600 my-2">334 J/g</p>
          <p className="text-sm text-gray-600">
            Energy to melt ice at 0°C. Same as heating water by 80°C!
          </p>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <h4 className="font-semibold text-orange-800 flex items-center gap-2">
            Latent Heat of Vaporization
          </h4>
          <p className="text-3xl font-bold text-orange-600 my-2">2,260 J/g</p>
          <p className="text-sm text-gray-600">
            Energy to boil water at 100°C. 6.8x more than fusion!
          </p>
        </div>
      </div>

      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">Key Insight</h4>
        <p className="text-gray-700">
          Breaking molecular bonds requires energy but doesn't change temperature.
          Ice molecules are locked in a crystal lattice; melting breaks these bonds.
          Water molecules are attracted to each other; boiling separates them completely.
        </p>
      </div>

      <button
        onPointerDown={() => handleNavigation('twist_predict')}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Twist predict phase
  const renderTwistPredict = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">The Burn Paradox</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          A paramedic tells you: "Steam burns at 100°C are far more dangerous
          than boiling water burns at 100°C."
        </p>
      </div>

      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
        <p className="text-lg text-center font-medium text-gray-800">
          Both steam and water are at exactly 100°C.
          <br />
          <span className="text-red-600">Why would steam cause worse burns?</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { id: 'A', text: 'Steam is actually hotter than 100°C', desc: 'Temperature difference' },
          { id: 'B', text: 'Steam releases latent heat when it condenses on skin', desc: 'Phase change releases hidden energy' },
          { id: 'C', text: 'Steam covers more skin area', desc: 'Larger contact surface' },
          { id: 'D', text: 'Steam moves faster than water', desc: 'Kinetic energy transfer' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={() => {
              setTwistPrediction(option.id);
              playSound('click');
              onEvent?.('prediction_made', { twist: true, prediction: option.id });
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                twistPrediction === option.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {option.id}
              </span>
              <div>
                <p className="font-medium text-gray-800">{option.text}</p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onPointerDown={() => handleNavigation('twist_play')}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          See the Energy Comparison
        </button>
      )}
    </div>
  );

  // Twist play phase
  const renderTwistPlay = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Energy Released to Skin</h2>
        <p className="text-gray-600">Watch the heat energy transfer from each source</p>
      </div>

      <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-4 border">
        {renderTwistVisualization()}
      </div>

      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
        <h4 className="font-semibold text-red-800 mb-2">Why Steam Burns Worse</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>When 1 gram of steam at 100°C contacts your skin:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Steam <strong>condenses</strong> to water, releasing <span className="text-red-600 font-bold">2,260 J</span> of latent heat</li>
            <li>Then the 100°C water cools, releasing <span className="text-blue-600 font-bold">~418 J</span> more</li>
            <li>Total: <span className="text-purple-600 font-bold">~2,678 J per gram!</span></li>
          </ol>
        </div>
      </div>

      <button
        onPointerDown={() => {
          if (!twistSimulating) {
            setTwistSimulating(true);
            setSteamEnergy(0);
            setWaterEnergy(0);
            playSound('click');
          }
        }}
        disabled={twistSimulating}
        className={`w-full py-3 rounded-xl font-semibold transition-all ${
          twistSimulating
            ? 'bg-gray-300 text-gray-500'
            : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
        }`}
      >
        {twistSimulating ? 'Simulating Energy Release...' : 'Compare Energy Transfer'}
      </button>

      {steamEnergy >= 100 && (
        <button
          onPointerDown={() => handleNavigation('twist_review')}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          Understand the Danger
        </button>
      )}
    </div>
  );

  // Twist review phase
  const renderTwistReview = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">The Latent Heat Danger</h2>
        <p className="text-gray-600">
          {twistPrediction === 'B'
            ? "You got it! Steam releases its latent heat when condensing."
            : "The answer was B — condensation releases latent heat!"}
        </p>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
        <h3 className="font-semibold text-red-800 mb-4">The Math of Burns</h3>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="font-medium text-gray-800 mb-2">Steam at 100°C to Skin:</p>
            <p className="font-mono text-red-600">2,260 J/g (latent) + 418 J/g (sensible) = <strong>2,678 J/g</strong></p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <p className="font-medium text-gray-800 mb-2">Water at 100°C to Skin:</p>
            <p className="font-mono text-blue-600">418 J/g (sensible only) = <strong>418 J/g</strong></p>
          </div>

          <div className="bg-purple-100 rounded-lg p-4 border border-purple-300">
            <p className="text-center">
              <span className="text-2xl font-bold text-purple-700">6.4x</span>
              <span className="text-gray-600 ml-2">more energy from steam!</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">Real-World Applications</h4>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>• <strong>Autoclaves</strong> use steam's latent heat for sterilization</li>
          <li>• <strong>Steam engines</strong> extract massive energy from condensing steam</li>
          <li>• <strong>Industrial burns</strong> are most severe from steam leaks</li>
          <li>• <strong>Cooking</strong>: Steam ovens cook faster than dry heat</li>
        </ul>
      </div>

      <button
        onPointerDown={() => handleNavigation('transfer')}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Transfer phase
  const renderTransfer = (): React.ReactNode => {
    const app = transferApps[selectedApp];

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Latent Heat in Action</h2>
          <p className="text-gray-600">Phase changes power technology worldwide</p>
        </div>

        {/* App selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {transferApps.map((a, i) => (
            <button
              key={i}
              onPointerDown={() => {
                setSelectedApp(i);
                playSound('click');
                onEvent?.('transfer_app_viewed', { app: a.title });
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all ${
                selectedApp === i
                  ? 'text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedApp === i ? { backgroundColor: a.color } : {}}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 text-white" style={{ backgroundColor: app.color }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{app.icon}</span>
              <div>
                <h3 className="text-xl font-bold">{app.title}</h3>
                <p className="text-white/80">{app.tagline}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-gray-700">{app.description}</p>

            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 mb-1">Latent Heat Connection</h4>
              <p className="text-sm text-gray-600">{app.connection}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-1">How It Works</h4>
              <p className="text-sm text-gray-600">{app.howItWorks}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {app.stats.map((stat, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-2 text-center">
                  <p className="font-bold text-lg" style={{ color: app.color }}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Examples:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {app.examples.map((ex, i) => (
                  <li key={i}>• {ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button
          onPointerDown={() => handleNavigation('test')}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          Test Your Knowledge
        </button>
      </div>
    );
  };

  // Test phase
  const renderTest = (): React.ReactNode => {
    const question = testQuestions[testIndex];
    const answered = testAnswers[testIndex] !== null;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Knowledge Check</h2>
          <span className="text-sm text-gray-500">
            Question {testIndex + 1} of {testQuestions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((testIndex + (answered ? 1 : 0)) / testQuestions.length) * 100}%` }}
          />
        </div>

        {/* Scenario */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium mb-1">Scenario:</p>
          <p className="text-gray-700">{question.scenario}</p>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="font-semibold text-gray-800 mb-4">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((option, i) => {
              const isSelected = testAnswers[testIndex] === i;
              const isCorrect = option.correct;
              const showResult = answered;

              let bgColor = 'bg-gray-50 hover:bg-gray-100';
              let borderColor = 'border-gray-200';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-500';
                } else if (isSelected) {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-500';
                }
              } else if (isSelected) {
                bgColor = 'bg-blue-50';
                borderColor = 'border-blue-500';
              }

              return (
                <button
                  key={i}
                  onPointerDown={() => !answered && handleTestAnswer(i)}
                  disabled={answered}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${bgColor} ${borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                      showResult && isCorrect ? 'bg-green-500 text-white' :
                      showResult && isSelected ? 'bg-red-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    <p className="text-gray-700">{option.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">Explanation</h4>
            <p className="text-sm text-gray-700">{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        {answered && (
          <button
            onPointerDown={() => {
              if (testIndex < testQuestions.length - 1) {
                setTestIndex(prev => prev + 1);
                setShowExplanation(false);
                playSound('click');
              } else {
                onEvent?.('test_completed', { score: testScore, total: testQuestions.length });
                handleNavigation('mastery');
              }
            }}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg"
          >
            {testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}

        {/* Score indicator */}
        <div className="text-center text-sm text-gray-500">
          Current Score: {testScore} / {testIndex + (answered ? 1 : 0)}
        </div>
      </div>
    );
  };

  // Mastery phase
  const renderMastery = (): React.ReactNode => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">
            {passed ? '🏆' : '📚'}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {passed ? 'Latent Heat Mastered!' : 'Keep Learning!'}
          </h2>
          <div className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white text-3xl font-bold px-6 py-3 rounded-xl">
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
          <h3 className="font-semibold text-purple-800 mb-4">Key Concepts Mastered</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Latent heat changes phase without changing temperature</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Heat of fusion (334 J/g) for melting/freezing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Heat of vaporization (2,260 J/g) for boiling/condensing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Why steam burns are more dangerous than water burns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Real applications in AC, thermal storage, and power generation</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">The Physics Formula</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-mono text-purple-700 mb-2">Q = m × L</p>
            <p className="text-sm text-gray-500">
              Heat (J) = mass (g) × latent heat (J/g)
            </p>
          </div>
          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p>• L_fusion (ice to water) = 334 J/g</p>
            <p>• L_vaporization (water to steam) = 2,260 J/g</p>
          </div>
        </div>

        {!passed && (
          <button
            onPointerDown={() => {
              setTestIndex(0);
              setTestScore(0);
              setTestAnswers(new Array(10).fill(null));
              setShowExplanation(false);
              handleNavigation('test');
            }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-lg shadow-lg"
          >
            Try Again
          </button>
        )}

        {passed && (
          <div className="text-center text-green-600 font-semibold">
            Congratulations! You've mastered latent heat!
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const renderPhase = (): React.ReactNode => {
    switch (currentPhase) {
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

  // Phase names for progress indicator
  const phaseNames = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = phaseNames.indexOf(currentPhase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Latent Heat</span>
            <span className="text-sm text-slate-500 capitalize">{currentPhase.replace('_', ' ')}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {phaseNames.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= currentPhaseIndex
                    ? 'bg-amber-500'
                    : 'bg-slate-700'
                } ${i === currentPhaseIndex ? 'w-6' : 'w-2'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`max-w-2xl mx-auto relative z-10 pt-20 ${isMobile ? 'px-4 py-4' : 'px-6 py-8'}`}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default LatentHeatRenderer;
