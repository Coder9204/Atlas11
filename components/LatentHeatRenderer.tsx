'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Latent Heat - Complete 10-Phase Game
// Q = mL - Heat absorbed/released during phase changes at constant temperature
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

interface LatentHeatRendererProps {
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
    scenario: "You're making ice cubes for a party. You put water in the freezer and check on it periodically with a thermometer.",
    question: "Why does the temperature stay at 0C even though the freezer keeps removing heat?",
    options: [
      { id: 'a', label: "The thermometer is broken and needs recalibration" },
      { id: 'b', label: "Energy is being used to change molecular bonds, not temperature", correct: true },
      { id: 'c', label: "The freezer isn't cold enough to lower the temperature further" },
      { id: 'd', label: "Water molecules can never get colder than 0C" }
    ],
    explanation: "During a phase change, all removed energy goes into breaking or forming molecular bonds rather than changing temperature. This is latent heat - the 'hidden' heat that changes state, not temperature. Water releases 334 J/g as latent heat of fusion while freezing at constant 0C."
  },
  {
    scenario: "A chef notices that a pot of boiling water stays at exactly 100C no matter how high they turn up the burner.",
    question: "What happens to all that extra heat energy being added?",
    options: [
      { id: 'a', label: "It escapes through the pot walls into the kitchen" },
      { id: 'b', label: "It converts water molecules from liquid to gas", correct: true },
      { id: 'c', label: "It heats the air above the pot instead of the water" },
      { id: 'd', label: "It's wasted as sound energy from the bubbling" }
    ],
    explanation: "The extra heat energy is absorbed as latent heat of vaporization (2,260 J/g for water), converting liquid water molecules into steam. This is why boiling water remains at 100C regardless of heat input - the energy changes state, not temperature."
  },
  {
    scenario: "An engineer is designing a thermal storage system and needs to store maximum heat in minimum space.",
    question: "Why would using phase-change materials be more efficient than just heating water?",
    options: [
      { id: 'a', label: "Phase-change materials are cheaper than water" },
      { id: 'b', label: "Water takes too long to heat up for practical use" },
      { id: 'c', label: "Latent heat stores much more energy per gram than temperature change", correct: true },
      { id: 'd', label: "Phase-change materials never actually melt" }
    ],
    explanation: "Latent heat of fusion for water (334 J/g) is equivalent to heating water by 80C! Phase-change materials store enormous amounts of energy during melting/solidifying at constant temperature, making them incredibly efficient for thermal storage."
  },
  {
    scenario: "You spill some rubbing alcohol on your skin and it feels cold even though the bottle was at room temperature.",
    question: "What causes the cooling sensation on your skin?",
    options: [
      { id: 'a', label: "Alcohol is naturally colder than water at room temperature" },
      { id: 'b', label: "The alcohol absorbs heat from your skin to evaporate", correct: true },
      { id: 'c', label: "Chemical reaction between alcohol and skin produces cold" },
      { id: 'd', label: "The alcohol creates tiny ice crystals on your skin" }
    ],
    explanation: "Evaporation requires latent heat of vaporization. The alcohol absorbs this heat energy from your skin to change from liquid to gas, cooling your skin in the process. This is the same principle behind sweating - evaporative cooling."
  },
  {
    scenario: "A paramedic warns that steam burns at 100C are far more dangerous than boiling water burns at the same temperature.",
    question: "Why does steam cause more severe burns than boiling water?",
    options: [
      { id: 'a', label: "Steam is actually much hotter than 100C" },
      { id: 'b', label: "Steam releases latent heat when it condenses on skin", correct: true },
      { id: 'c', label: "Steam contains more oxygen than water" },
      { id: 'd', label: "Steam penetrates deeper into skin layers" }
    ],
    explanation: "When steam condenses on your skin, it releases 2,260 J/g of latent heat of vaporization IN ADDITION to the heat from cooling. This is over 5 times more energy than just the heat content of 100C water, making steam burns much more severe."
  },
  {
    scenario: "During a spring thaw, a lake's ice slowly melts over several days even though air temperatures are consistently above freezing.",
    question: "Why does it take so long for the ice to melt?",
    options: [
      { id: 'a', label: "The air isn't warm enough to provide heat quickly" },
      { id: 'b', label: "The lake water insulates the ice from warm air" },
      { id: 'c', label: "Melting requires absorbing large amounts of latent heat", correct: true },
      { id: 'd', label: "The lake water underneath is too cold" }
    ],
    explanation: "Melting ice requires 334 J/g of latent heat - the same energy needed to heat water from 0C to 80C! This enormous energy requirement means lakes take days to melt even in warm weather, which helps moderate spring temperatures and protect ecosystems."
  },
  {
    scenario: "A food scientist is developing instant cold packs for athletic injuries that work without refrigeration.",
    question: "Which principle should they use for the cold pack design?",
    options: [
      { id: 'a', label: "Compress air inside the pack to make it cold" },
      { id: 'b', label: "Use chemicals that absorb heat when dissolving (endothermic)", correct: true },
      { id: 'c', label: "Use metal plates that conduct heat away from injury" },
      { id: 'd', label: "Create a vacuum inside to remove heat" }
    ],
    explanation: "Cold packs use endothermic dissolution - similar to latent heat absorption. When ammonium nitrate dissolves in water, it absorbs energy from surroundings (like latent heat during melting), creating instant cold without refrigeration."
  },
  {
    scenario: "An HVAC engineer is explaining why air conditioners can cool rooms even when it's hotter outside than inside.",
    question: "What role does the refrigerant's phase change play in cooling?",
    options: [
      { id: 'a', label: "It creates cold air directly from the refrigerant" },
      { id: 'b', label: "It absorbs indoor heat by evaporating, releases it outside by condensing", correct: true },
      { id: 'c', label: "It filters out hot air molecules from the room" },
      { id: 'd', label: "It generates electricity that powers cooling fans" }
    ],
    explanation: "Refrigerants exploit latent heat: they evaporate (absorbing latent heat) inside where you want cooling, then condense (releasing latent heat) outside. This 'heat pump' moves thermal energy against the temperature gradient using phase changes."
  },
  {
    scenario: "Mountain climbers notice that water boils at 70C at high altitude instead of 100C.",
    question: "What happens to the latent heat of vaporization at lower pressure?",
    options: [
      { id: 'a', label: "It stays exactly the same regardless of pressure" },
      { id: 'b', label: "It increases dramatically at lower pressure" },
      { id: 'c', label: "It decreases slightly, but still dominates the energy transfer", correct: true },
      { id: 'd', label: "It becomes zero at high altitude" }
    ],
    explanation: "At lower pressure, boiling point decreases and latent heat of vaporization decreases slightly. However, phase change still requires substantial energy - food cooks slower at altitude because water boils at lower temperature, not because less energy transfers."
  },
  {
    scenario: "A materials scientist is comparing ice at 0C with water at 0C for a cooling application.",
    question: "Which provides more cooling capacity and why?",
    options: [
      { id: 'a', label: "They're equivalent since both are at 0C" },
      { id: 'b', label: "Water, because liquid flows better for heat transfer" },
      { id: 'c', label: "Ice, because melting absorbs latent heat while staying at 0C", correct: true },
      { id: 'd', label: "Ice, because it's denser than water" }
    ],
    explanation: "Ice at 0C has far more cooling capacity because as it melts, it absorbs 334 J/g of latent heat while remaining at 0C. Water at 0C can only absorb heat by warming up. This is why ice packs work so well - they absorb heat without temperature rise!"
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '❄',
    title: 'Ice-Based Thermal Storage',
    short: 'Shifting cooling loads to off-peak hours',
    tagline: 'Freezing savings into every building',
    description: 'Large buildings make ice at night when electricity is cheap, then melt it during the day for air conditioning. The latent heat of fusion stores far more energy per kilogram than simply cooling water, making ice storage incredibly space-efficient.',
    connection: 'Just as we observed temperature staying constant during phase changes while heat is absorbed, ice storage exploits this phenomenon. Melting ice absorbs 334 kJ/kg without temperature change - 10x more than cooling water by 8C.',
    howItWorks: 'Chillers run overnight to freeze water in storage tanks. During peak hours, warm return air passes through coils surrounded by ice. The ice melts, absorbing heat and cooling the air. Phase change stores far more energy than sensible heat.',
    stats: [
      { value: '334 kJ/kg', label: 'Latent heat capacity', icon: '⚡' },
      { value: '30%', label: 'Peak demand reduction', icon: '📉' },
      { value: '$2.5B', label: 'Global market size', icon: '💰' }
    ],
    examples: ['Empire State Building ice system', 'Data center cooling', 'Hospital HVAC systems', 'University campus cooling'],
    companies: ['CALMAC', 'Ice Energy', 'DN Tanks', 'Baltimore Aircoil'],
    futureImpact: 'Phase change materials beyond ice will enable thermal storage at various temperatures, shifting heating and cooling loads to optimize renewable energy usage.',
    color: '#3B82F6'
  },
  {
    icon: '🔥',
    title: 'Steam Power Generation',
    short: 'Converting heat to electricity worldwide',
    tagline: 'The phase change that powers civilization',
    description: 'Power plants boil water to create steam that drives turbines. The massive latent heat of vaporization (2,260 kJ/kg) allows steam to carry enormous energy. Condensing the steam releases this energy to reheat feedwater, improving efficiency.',
    connection: 'Our simulation showed temperature staying constant during boiling as energy converts water to steam. Power plants exploit this: high-pressure steam carries latent heat energy that converts to mechanical work in turbines.',
    howItWorks: 'Burning fuel or nuclear reactions boil water at high pressure. Steam expands through turbine stages, converting thermal energy to rotation. Condensers use cooling water to remove latent heat, returning steam to liquid for reheating.',
    stats: [
      { value: '2,260 kJ/kg', label: 'Latent heat of steam', icon: '⚡' },
      { value: '45%', label: 'Best plant efficiency', icon: '📈' },
      { value: '60%', label: 'World electricity share', icon: '🌍' }
    ],
    examples: ['Nuclear power plants', 'Coal-fired generators', 'Combined-cycle gas plants', 'Geothermal power stations'],
    companies: ['GE Vernova', 'Siemens Energy', 'Mitsubishi Power', 'Westinghouse'],
    futureImpact: 'Supercritical CO2 cycles operating above the critical point will eliminate phase change inefficiencies while maintaining the energy density benefits of high-pressure working fluids.',
    color: '#EF4444'
  },
  {
    icon: '🏠',
    title: 'Phase Change Building Materials',
    short: 'Walls that store and release heat',
    tagline: 'Passive temperature regulation built in',
    description: 'Building materials embedded with phase change materials (PCMs) absorb excess heat during the day by melting and release it at night by freezing. This passive thermal mass smooths temperature swings without active cooling.',
    connection: 'Like our melting ice experiment, PCMs absorb heat at constant temperature during melting. Walls with microencapsulated PCMs act as thermal batteries, storing daytime heat for nighttime release.',
    howItWorks: 'Microencapsulated paraffin wax (melting point 21-25C) is embedded in drywall, ceiling tiles, or concrete. During hot periods, the wax melts and absorbs heat. At night, it solidifies and releases heat, maintaining comfortable temperatures.',
    stats: [
      { value: '200 kJ/kg', label: 'PCM energy density', icon: '⚡' },
      { value: '25%', label: 'HVAC energy savings', icon: '📉' },
      { value: '$1.8B', label: 'PCM market size', icon: '💰' }
    ],
    examples: ['PCM-enhanced drywall', 'Thermal mass concrete', 'Cool roof coatings', 'Window shading systems'],
    companies: ['Phase Change Energy', 'Microtek', 'Rubitherm', 'Entropy Solutions'],
    futureImpact: 'Bio-based PCMs from coconut oil and other renewables will replace petroleum-based materials, creating truly sustainable thermal storage for net-zero buildings.',
    color: '#10B981'
  },
  {
    icon: '🍦',
    title: 'Food Preservation & Cold Chain',
    short: 'Keeping food fresh and safe globally',
    tagline: 'Cold chain science in every bite',
    description: 'Freezing food removes latent heat of fusion, dramatically slowing spoilage by immobilizing water molecules. Understanding phase change is crucial for flash-freezing that preserves texture and for maintaining the cold chain during transport.',
    connection: 'Removing 334 kJ/kg to freeze water is far more demanding than just cooling to 0C. This is why freezing food requires powerful refrigeration, but once frozen, the food stays cold much longer - the latent heat must be re-added to thaw it.',
    howItWorks: 'Flash freezing passes food through -40C environments in minutes, creating small ice crystals that don\'t damage cell walls. During transport, eutectic plates provide phase-change thermal mass that maintains temperature even if refrigeration fails.',
    stats: [
      { value: '-18C', label: 'Standard storage temp', icon: '❄' },
      { value: '$300B', label: 'Cold chain market', icon: '💰' },
      { value: '1 year+', label: 'Extended shelf life', icon: '📅' }
    ],
    examples: ['IQF frozen vegetables', 'Ice cream production', 'Vaccine cold chain', 'Frozen seafood shipping'],
    companies: ['Carrier', 'Thermo King', 'Lineage Logistics', 'Americold'],
    futureImpact: 'Smart packaging with PCM indicators will show if temperature excursions occurred during shipping, ensuring food safety and reducing waste from precautionary disposal.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const LatentHeatRenderer: React.FC<LatentHeatRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Heating ice through phases
  const [temperature, setTemperature] = useState(-20); // Starting temp in C
  const [heatAdded, setHeatAdded] = useState(0); // Total heat added in kJ
  const [heatingPower, setHeatingPower] = useState(50); // Watts
  const [isSimulating, setIsSimulating] = useState(false);
  const [meltProgress, setMeltProgress] = useState(0); // 0-1 during melting
  const [boilProgress, setBoilProgress] = useState(0); // 0-1 during boiling
  const [materialPhase, setMaterialPhase] = useState<'solid' | 'melting' | 'liquid' | 'boiling' | 'gas'>('solid');

  // Twist phase - Steam vs Water burn comparison
  const [twistSimulating, setTwistSimulating] = useState(false);
  const [steamEnergy, setSteamEnergy] = useState(0);
  const [waterEnergy, setWaterEnergy] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Animation refs
  const animationRef = useRef<number | null>(null);
  const isNavigating = useRef(false);

  // Constants for water
  const SPECIFIC_HEAT_ICE = 2.09; // kJ/(kg*C)
  const SPECIFIC_HEAT_WATER = 4.18; // kJ/(kg*C)
  const SPECIFIC_HEAT_STEAM = 2.01; // kJ/(kg*C)
  const LATENT_HEAT_FUSION = 334; // kJ/kg
  const LATENT_HEAT_VAPORIZATION = 2260; // kJ/kg
  const MASS = 0.1; // kg (100g of water)

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simulation animation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let lastTime = performance.now();

    const simulate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Heat added this frame (kJ)
      const heatRate = heatingPower / 1000; // kW
      const heatThisFrame = heatRate * dt;

      setHeatAdded(prev => prev + heatThisFrame);

      setTemperature(prevTemp => {
        // Heating ice (below 0C)
        if (prevTemp < 0) {
          setMaterialPhase('solid');
          const dT = heatThisFrame / (MASS * SPECIFIC_HEAT_ICE);
          const newTemp = prevTemp + dT;
          return Math.min(newTemp, 0);
        }

        // Melting (at 0C)
        if (prevTemp >= 0 && meltProgress < 1) {
          setMaterialPhase('melting');
          const energyToMelt = MASS * LATENT_HEAT_FUSION;
          const newProgress = meltProgress + heatThisFrame / energyToMelt;
          setMeltProgress(Math.min(newProgress, 1));

          if (newProgress >= 1) {
            return 0.1;
          }
          return 0;
        }

        // Heating water (0C to 100C)
        if (prevTemp >= 0 && prevTemp < 100 && meltProgress >= 1) {
          setMaterialPhase('liquid');
          const dT = heatThisFrame / (MASS * SPECIFIC_HEAT_WATER);
          const newTemp = prevTemp + dT;
          return Math.min(newTemp, 100);
        }

        // Boiling (at 100C)
        if (prevTemp >= 100 && boilProgress < 1) {
          setMaterialPhase('boiling');
          const energyToBoil = MASS * LATENT_HEAT_VAPORIZATION;
          const newProgress = boilProgress + heatThisFrame / energyToBoil;
          setBoilProgress(Math.min(newProgress, 1));

          if (newProgress >= 1) {
            setIsSimulating(false);
            return 100.1;
          }
          return 100;
        }

        // Steam (above 100C)
        if (prevTemp >= 100 && boilProgress >= 1) {
          setMaterialPhase('gas');
          const dT = heatThisFrame / (MASS * SPECIFIC_HEAT_STEAM);
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
  }, [isSimulating, heatingPower, meltProgress, boilProgress]);

  // Twist simulation (steam vs water burn comparison)
  useEffect(() => {
    if (!twistSimulating) return;

    const interval = setInterval(() => {
      setSteamEnergy(prev => {
        const newEnergy = prev + 2.5;
        if (newEnergy >= 100) {
          setTwistSimulating(false);
          playSound('success');
        }
        return Math.min(newEnergy, 100);
      });
      setWaterEnergy(prev => Math.min(prev + 0.4, 100));
    }, 50);

    return () => clearInterval(interval);
  }, [twistSimulating]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTemperature(-20);
    setHeatAdded(0);
    setMaterialPhase('solid');
    setMeltProgress(0);
    setBoilProgress(0);
    setIsSimulating(false);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    ice: '#60A5FA',
    water: '#22D3EE',
    steam: '#F87171',
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
    twist_play: 'Twist Experiment',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery Complete'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'latent-heat',
        gameTitle: 'Latent Heat',
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

  // Heating Curve Visualization
  const HeatingCurveVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;

    // Calculate current position on heating curve
    const getCurrentX = () => {
      if (temperature < 0) return 40 + ((temperature + 20) / 20) * 40;
      if (materialPhase === 'melting') return 80 + meltProgress * 60;
      if (temperature <= 100 && materialPhase === 'liquid') return 140 + (temperature / 100) * 80;
      if (materialPhase === 'boiling') return 220 + boilProgress * 100;
      return 320;
    };

    const getCurrentY = () => {
      if (temperature < 0) return 250 - ((temperature + 20) / 20) * 30;
      if (materialPhase === 'melting') return 220;
      if (temperature <= 100 && materialPhase === 'liquid') return 220 - (temperature / 100) * 120;
      if (materialPhase === 'boiling') return 100;
      return 80;
    };

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}>
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.ice} />
            <stop offset="30%" stopColor={colors.water} />
            <stop offset="100%" stopColor={colors.steam} />
          </linearGradient>
          <radialGradient id="markerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.3" />
          </radialGradient>
          <linearGradient id="iceZone" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.ice} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.ice} stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dropShadow">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background zones */}
        <g opacity="0.3">
          <rect x="40" y="50" width="100" height="230" fill={colors.ice} opacity="0.1" />
          <rect x="140" y="50" width="80" height="230" fill={colors.water} opacity="0.1" />
          <rect x="220" y="50" width="140" height="230" fill={colors.steam} opacity="0.1" />
        </g>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Heating Curve: Temperature vs Heat Added
        </text>

        {/* Grid lines */}
        <g opacity="0.2" stroke={colors.border}>
          <line x1="40" y1="220" x2={width - 20} y2="220" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="40" y1="100" x2={width - 20} y2="100" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="140" y1="50" x2="140" y2="280" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="220" y1="50" x2="220" y2="280" strokeWidth="1" strokeDasharray="4,4" />
        </g>

        {/* Axes */}
        <line x1="40" y1="280" x2={width - 20} y2="280" stroke={colors.textMuted} strokeWidth="2" />
        <line x1="40" y1="50" x2="40" y2="280" stroke={colors.textMuted} strokeWidth="2" />

        {/* Axis arrow heads */}
        <polygon points={`${width - 20},275 ${width - 10},280 ${width - 20},285`} fill={colors.textMuted} />
        <polygon points="35,50 40,40 45,50" fill={colors.textMuted} />

        {/* Axis labels */}
        <text x={width/2} y="300" textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Heat Added (Q)
        </text>
        <text x="15" y="165" textAnchor="middle" fill={colors.textMuted} fontSize="11" transform="rotate(-90, 15, 165)">
          Temperature (C)
        </text>

        {/* Temperature scale */}
        <text x="35" y="255" textAnchor="end" fill={colors.textMuted} fontSize="9">-20</text>
        <text x="35" y="225" textAnchor="end" fill={colors.textMuted} fontSize="9">0</text>
        <text x="35" y="105" textAnchor="end" fill={colors.textMuted} fontSize="9">100</text>

        {/* The heating curve */}
        <path
          d="M 40 250 L 80 220 L 140 220 L 220 100 L 320 100 L 360 80"
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Phase labels */}
        <text x="60" y="270" textAnchor="middle" fill={colors.ice} fontSize="10">Ice</text>
        <text x="110" y="210" textAnchor="middle" fill={colors.ice} fontSize="10">Melting</text>
        <text x="180" y="160" textAnchor="middle" fill={colors.water} fontSize="10">Water</text>
        <text x="270" y="90" textAnchor="middle" fill={colors.steam} fontSize="10">Boiling</text>
        <text x="340" y="70" textAnchor="middle" fill={colors.steam} fontSize="10">Steam</text>

        {/* Plateau annotations */}
        <g>
          <rect x="90" y="230" width="60" height="20" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
          <text x="120" y="244" textAnchor="middle" fill={colors.accent} fontSize="9">334 kJ/kg</text>
        </g>
        <g>
          <rect x="240" y="110" width="70" height="20" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
          <text x="275" y="124" textAnchor="middle" fill={colors.accent} fontSize="9">2,260 kJ/kg</text>
        </g>

        {/* Current position marker */}
        <g>
          {/* Marker glow effect */}
          <ellipse
            cx={getCurrentX()}
            cy={getCurrentY()}
            rx="16"
            ry="16"
            fill="url(#markerGlow)"
            opacity={isSimulating ? 0.6 : 0}
          />
          {/* Main marker */}
          <circle
            cx={getCurrentX()}
            cy={getCurrentY()}
            r="8"
            fill={colors.success}
            stroke="white"
            strokeWidth="2"
            filter="url(#glow)"
          >
            {isSimulating && (
              <animate attributeName="r" values="8;10;8" dur="0.5s" repeatCount="indefinite" />
            )}
          </circle>
          {/* Cross hairs */}
          <line
            x1={getCurrentX() - 14}
            y1={getCurrentY()}
            x2={getCurrentX() - 8}
            y2={getCurrentY()}
            stroke={colors.success}
            strokeWidth="1"
            opacity="0.6"
          />
          <line
            x1={getCurrentX() + 8}
            y1={getCurrentY()}
            x2={getCurrentX() + 14}
            y2={getCurrentY()}
            stroke={colors.success}
            strokeWidth="1"
            opacity="0.6"
          />
        </g>

        {/* Stats box */}
        <g transform={`translate(${width - 130}, 45)`}>
          <rect x="0" y="0" width="115" height="95" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x="57" y="16" textAnchor="middle" fill={colors.textMuted} fontSize="10">Current State</text>
          <text x="57" y="34" textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700">
            {temperature.toFixed(1)}C
          </text>
          <text x="57" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="9">
            Phase: {materialPhase}
          </text>
          <text x="57" y="65" textAnchor="middle" fill={colors.success} fontSize="10">
            Q: {heatAdded.toFixed(1)} kJ
          </text>
          <text x="57" y="85" textAnchor="middle" fill={colors.warning} fontSize="9">
            Power: {heatingPower}W
          </text>
        </g>
      </svg>
    );
  };

  // Substance Visualization (beaker with ice/water/steam)
  const SubstanceVisualization = () => {
    const width = isMobile ? 200 : 240;
    const height = isMobile ? 200 : 240;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}>
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
          <radialGradient id="iceGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#60A5FA" />
          </radialGradient>
        </defs>

        {/* Burner flame - size based on heating power */}
        <g>
          {[0, 1, 2].map(i => (
            <ellipse
              key={i}
              cx={width/2 - 30 + i * 30}
              cy={height - 20}
              rx={8 + heatingPower * 0.08}
              ry={15 + heatingPower * 0.25}
              fill="url(#flameGrad)"
              opacity={0.7 + heatingPower * 0.003}
            >
              {isSimulating && (
                <animate
                  attributeName="ry"
                  values={`${15 + heatingPower * 0.25};${20 + heatingPower * 0.35};${15 + heatingPower * 0.25}`}
                  dur={`${0.3 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              )}
            </ellipse>
          ))}
        </g>

        {/* Power indicator */}
        <text x={width/2} y={height - 2} textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="600">
          {heatingPower}W
        </text>

        {/* Beaker */}
        <rect
          x={width/2 - 60}
          y="40"
          width="120"
          height="130"
          rx="5"
          fill={colors.bgSecondary}
          stroke={colors.textMuted}
          strokeWidth="3"
        />

        {/* Contents based on phase */}
        {materialPhase === 'solid' && (
          <g>
            {[0, 1, 2].map(row => (
              [0, 1, 2].map(col => (
                <rect
                  key={`${row}-${col}`}
                  x={width/2 - 50 + col * 35}
                  y={60 + row * 35}
                  width={30}
                  height={25}
                  rx={3}
                  fill="url(#iceGrad)"
                  stroke="#93C5FD"
                  strokeWidth="1"
                />
              ))
            ))}
          </g>
        )}

        {materialPhase === 'melting' && (
          <g>
            {/* Water below */}
            <rect
              x={width/2 - 55}
              y={120 - meltProgress * 40}
              width="110"
              height={50 + meltProgress * 40}
              fill={colors.water}
              opacity={0.7}
            />
            {/* Remaining ice */}
            {[0, 1].map(col => (
              <rect
                key={col}
                x={width/2 - 40 + col * 45}
                y={60}
                width={30}
                height={25}
                rx={3}
                fill="url(#iceGrad)"
                stroke="#93C5FD"
                strokeWidth="1"
                opacity={1 - meltProgress * 0.8}
              >
                <animate attributeName="y" values="60;70;60" dur="2s" repeatCount="indefinite" />
              </rect>
            ))}
          </g>
        )}

        {(materialPhase === 'liquid' || materialPhase === 'boiling') && (
          <g>
            {/* Water */}
            <rect
              x={width/2 - 55}
              y="60"
              width="110"
              height="105"
              fill={colors.water}
              opacity={materialPhase === 'boiling' ? 0.8 : 0.9}
            >
              {materialPhase === 'boiling' && (
                <animate attributeName="opacity" values="0.8;0.6;0.8" dur="0.3s" repeatCount="indefinite" />
              )}
            </rect>

            {/* Bubbles for boiling */}
            {materialPhase === 'boiling' && (
              <>
                {[...Array(6)].map((_, i) => (
                  <circle
                    key={i}
                    cx={width/2 - 40 + (i * 16)}
                    cy={150}
                    r={4 + (i % 3) * 2}
                    fill="white"
                    opacity={0.6}
                  >
                    <animate
                      attributeName="cy"
                      values="150;70"
                      dur={`${0.6 + (i % 3) * 0.2}s`}
                      repeatCount="indefinite"
                      begin={`${(i % 4) * 0.15}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0"
                      dur={`${0.6 + (i % 3) * 0.2}s`}
                      repeatCount="indefinite"
                      begin={`${(i % 4) * 0.15}s`}
                    />
                  </circle>
                ))}
              </>
            )}
          </g>
        )}

        {materialPhase === 'gas' && (
          <g>
            {/* Steam clouds */}
            {[...Array(5)].map((_, i) => (
              <ellipse
                key={i}
                cx={width/2 - 30 + (i % 3) * 30}
                cy={80 + Math.floor(i / 3) * 40}
                rx={20}
                ry={12}
                fill="white"
                opacity={0.5}
              >
                <animate
                  attributeName="cy"
                  values={`${80 + Math.floor(i / 3) * 40};${50 + Math.floor(i / 3) * 40}`}
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

        {/* Phase label */}
        <text x={width/2} y={height - 45} textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">
          {materialPhase.charAt(0).toUpperCase() + materialPhase.slice(1)}
        </text>
      </svg>
    );
  };

  // Steam vs Water Burn Visualization
  const SteamBurnVisualization = () => {
    const width = isMobile ? 340 : 450;
    const height = isMobile ? 220 : 260;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}>
        <defs>
          <linearGradient id="steamBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FEE2E2" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="waterBarGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Energy Released to Skin (both at 100C)
        </text>

        {/* Steam side */}
        <g transform="translate(30, 45)">
          <text x="60" y="15" textAnchor="middle" fill={colors.steam} fontSize="13" fontWeight="600">
            Steam
          </text>

          <rect x="10" y="25" width="100" height="120" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />

          <rect
            x="15"
            y={145 - steamEnergy * 1.15}
            width="90"
            height={steamEnergy * 1.15}
            fill="url(#steamBarGrad)"
            rx="4"
          />

          {steamEnergy > 20 && (
            <>
              {[...Array(3)].map((_, i) => (
                <ellipse
                  key={i}
                  cx={40 + i * 20}
                  cy={60}
                  rx={10}
                  ry={6}
                  fill="white"
                  opacity={0.6}
                >
                  <animate attributeName="cy" values="60;40;60" dur="1s" repeatCount="indefinite" />
                </ellipse>
              ))}
            </>
          )}

          <text x="60" y="165" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            Latent + Sensible
          </text>
          <text x="60" y="180" textAnchor="middle" fill={colors.steam} fontSize="14" fontWeight="700">
            {(steamEnergy * 26.78).toFixed(0)} J/g
          </text>
        </g>

        {/* Water side */}
        <g transform={`translate(${width - 140}, 45)`}>
          <text x="60" y="15" textAnchor="middle" fill={colors.water} fontSize="13" fontWeight="600">
            Water
          </text>

          <rect x="10" y="25" width="100" height="120" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />

          <rect
            x="15"
            y={145 - waterEnergy * 1.15}
            width="90"
            height={waterEnergy * 1.15}
            fill="url(#waterBarGrad)"
            rx="4"
          />

          <rect x="15" y="80" width="90" height="60" fill={colors.water} opacity="0.4" rx="4" />

          <text x="60" y="165" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            Sensible Only
          </text>
          <text x="60" y="180" textAnchor="middle" fill={colors.water} fontSize="14" fontWeight="700">
            {(waterEnergy * 4.18).toFixed(0)} J/g
          </text>
        </g>

        {/* Comparison arrow */}
        {steamEnergy > 50 && (
          <g transform={`translate(${width/2 - 40}, 100)`}>
            <line x1="0" y1="0" x2="60" y2="0" stroke={colors.success} strokeWidth="3" />
            <polygon points="60,-5 75,0 60,5" fill={colors.success} />
            <text x="37" y="-10" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="700">
              {waterEnergy > 0 ? ((steamEnergy * 26.78) / (waterEnergy * 4.18)).toFixed(1) : '0'}x more!
            </text>
          </g>
        )}
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
        alignItems: 'center',
        padding: '24px',
        textAlign: 'center',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        {/* Top navigation bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '700px',
          marginTop: '60px',
          marginBottom: '24px',
        }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
              visibility: 'hidden', // Hidden on first phase but keeps layout
            }}
          >
            ← Back
          </button>
          <span style={{ ...typo.small, color: '#6B7280' }}>Step 1 of 10</span>
          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Next →
          </button>
        </div>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🍳 ❄ 💨
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Latent Heat
        </h1>

        <p style={{
          ...typo.body,
          color: 'rgba(156, 163, 175, 0.8)',
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "No matter how high you turn the flame, the water <span style={{ color: colors.accent }}>refuses to get hotter than 100C</span>. The burner is pumping in massive amounts of heat energy... but the temperature stays perfectly flat."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: '#9CA3AF', fontStyle: 'italic' }}>
            "Where does all that energy go? The answer reveals one of nature's most useful tricks - heat that transforms matter itself without changing its temperature."
          </p>
          <p style={{ ...typo.small, color: '#6B7280', marginTop: '8px' }}>
            - The Mystery of Phase Change
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Hidden Heat
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Temperature rises steadily in a straight line from start to finish' },
      { id: 'b', text: 'Temperature rises, then has flat plateaus at certain points', correct: true },
      { id: 'c', text: 'Temperature rises faster and faster (exponential curve)' },
    ];

    const predWidth = isMobile ? 320 : 440;
    const predHeight = isMobile ? 200 : 240;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        {/* Navigation bar with Back and Next buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '700px',
          margin: '60px auto 0',
          width: '100%',
        }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Back
          </button>
          <span style={{ ...typo.small, color: '#6B7280' }}>Step 2 of 10</span>
          <button
            onClick={() => { if (prediction) { playSound('success'); nextPhase(); } }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: prediction ? '#9CA3AF' : '#6B7280',
              cursor: prediction ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              opacity: prediction ? 1 : 0.5,
            }}
          >
            Next →
          </button>
        </div>

        <div style={{ maxWidth: '700px', margin: '24px auto 0', flex: 1, overflowY: 'auto' }}>
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
            We're going to heat ice from -20C continuously. What will the temperature graph look like?
          </h2>

          {/* SVG diagram showing the heating scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox={`0 0 ${predWidth} ${predHeight}`} width="100%" style={{ display: 'block', margin: '0 auto', maxWidth: predWidth }}>
              <defs>
                <linearGradient id="iceGradPred" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#DBEAFE" />
                  <stop offset="100%" stopColor="#60A5FA" />
                </linearGradient>
                <linearGradient id="flameGradPred" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#FCD34D" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill={colors.bgCard} rx="8" />
              {/* Title */}
              <text x={predWidth / 2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
                Heating Ice from -20C
              </text>
              {/* Beaker */}
              <rect x={predWidth / 2 - 50} y="50" width="100" height="100" rx="4" fill={colors.bgSecondary} stroke={colors.textMuted} strokeWidth="2" />
              {/* Ice cubes */}
              <rect x={predWidth / 2 - 40} y="65" width="30" height="25" rx="3" fill="url(#iceGradPred)" stroke="#93C5FD" strokeWidth="1" />
              <rect x={predWidth / 2 + 5} y="70" width="28" height="22" rx="3" fill="url(#iceGradPred)" stroke="#93C5FD" strokeWidth="1" />
              <rect x={predWidth / 2 - 25} y="95" width="26" height="20" rx="3" fill="url(#iceGradPred)" stroke="#93C5FD" strokeWidth="1" />
              {/* Flames under beaker */}
              <ellipse cx={predWidth / 2 - 25} cy="165" rx="10" ry="18" fill="url(#flameGradPred)" opacity="0.9" />
              <ellipse cx={predWidth / 2} cy="168" rx="12" ry="20" fill="url(#flameGradPred)" opacity="0.9" />
              <ellipse cx={predWidth / 2 + 25} cy="165" rx="10" ry="18" fill="url(#flameGradPred)" opacity="0.9" />
              {/* Temperature label */}
              <text x={predWidth / 2 - 70} y="100" fill={colors.ice} fontSize="12" fontWeight="600">-20C</text>
              {/* Arrow to question mark */}
              <line x1={predWidth / 2 + 60} y1="100" x2={predWidth / 2 + 100} y2="100" stroke={colors.textMuted} strokeWidth="2" markerEnd="url(#arrowhead)" />
              <polygon points={`${predWidth / 2 + 100},95 ${predWidth / 2 + 115},100 ${predWidth / 2 + 100},105`} fill={colors.textMuted} />
              {/* Question mark box */}
              <rect x={predWidth / 2 + 120} y="60" width="80" height="80" rx="8" fill={colors.bgSecondary} stroke={colors.warning} strokeWidth="2" strokeDasharray="5,3" />
              <text x={predWidth / 2 + 160} y="110" textAnchor="middle" fill={colors.warning} fontSize="32" fontWeight="bold">?</text>
              <text x={predWidth / 2 + 160} y="130" textAnchor="middle" fill={colors.textMuted} fontSize="10">T vs Time</text>
              {/* Heat label */}
              <text x={predWidth / 2} y={predHeight - 10} textAnchor="middle" fill={colors.accent} fontSize="12">+ Continuous Heat</text>
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

  // PLAY PHASE - Interactive Heating Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        {/* Navigation bar with Back and Next buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '800px',
          margin: '60px auto 0',
          width: '100%',
        }}>
          <button
            onClick={() => goToPhase('predict')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Back
          </button>
          <span style={{ ...typo.small, color: '#6B7280' }}>Step 3 of 10</span>
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Next →
          </button>
        </div>

        <div style={{ maxWidth: '800px', margin: '24px auto 0', flex: 1, overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Heat the Ice
          </h2>
          <p style={{ ...typo.body, color: '#D1D5DB', textAlign: 'center', marginBottom: '24px' }}>
            Watch the temperature as heat is continuously added
          </p>

          {/* Main visualizations */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}>
              <HeatingCurveVisualization />
              <SubstanceVisualization />
            </div>

            {/* Heating power slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Heating Power</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{heatingPower} W</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={heatingPower}
                onChange={(e) => setHeatingPower(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${((heatingPower - 20) / 80) * 100}%, ${colors.border} ${((heatingPower - 20) / 80) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Simulate button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  if (!isSimulating) {
                    setIsSimulating(true);
                    playSound('click');
                  } else {
                    setIsSimulating(false);
                  }
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulating ? colors.warning : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSimulating ? 'Pause Heating' : 'Start Heating'}
              </button>
              <button
                onClick={() => {
                  resetSimulation();
                  playSound('click');
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

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{temperature.toFixed(1)}C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Temperature</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{heatAdded.toFixed(1)} kJ</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Heat Added</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.water }}>{materialPhase}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Phase</div>
              </div>
            </div>
          </div>

          {/* Educational Explanation Panel */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${colors.accent}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              What the Visualization Shows
            </h3>
            <p style={{ ...typo.body, color: '#D1D5DB', marginBottom: '12px' }}>
              The <strong style={{ color: colors.textPrimary }}>heating curve</strong> displays how temperature changes as heat is continuously added to ice.
              Notice the <strong style={{ color: colors.accent }}>flat plateaus</strong> where temperature stays constant - this is where
              <strong style={{ color: colors.textPrimary }}> latent heat</strong> is being absorbed to change the phase.
            </p>
            <p style={{ ...typo.body, color: '#D1D5DB', marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Cause and Effect:</strong> When you increase the heating power, the simulation runs faster,
              but the plateaus remain at the same temperatures (0C for melting, 100C for boiling). Higher power causes faster phase transitions, but the total energy required stays constant.
            </p>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginTop: '12px',
            }}>
              <p style={{ ...typo.small, color: '#D1D5DB', marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Key Formula:</strong> Latent heat is defined as Q = m * L, where Q is the heat energy, m is the mass, and L is the latent heat constant.
              </p>
              <p style={{ ...typo.small, color: '#D1D5DB', margin: 0 }}>
                <strong style={{ color: colors.success }}>Real-World Relevance:</strong> This is why refrigeration technology is so important for everyday applications.
                Understanding latent heat is crucial for engineering HVAC systems, power plants, and weather pattern analysis.
              </p>
            </div>
          </div>

          {/* Discovery prompts */}
          {(materialPhase === 'melting' || materialPhase === 'boiling') && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice the temperature staying constant during {materialPhase}! All the heat energy goes into changing the phase.
              </p>
            </div>
          )}

          {/* Continue button (always visible in play phase) */}
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            {materialPhase === 'gas' ? 'Understand the Physics' : 'Continue to Review'}
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
            The Physics of Latent Heat
          </h2>

          <div style={{
            background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
              {prediction === 'b'
                ? "Your prediction was correct! As you observed in the experiment, temperature plateaus during phase changes."
                : "The correct answer was B - as you saw, the temperature pauses at phase changes!"}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Q = m * L (Latent Heat Equation)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                "Latent" means "hidden" in Latin. During phase changes, heat energy is absorbed but doesn't raise temperature - it's "hidden" in the molecular bonds.
              </p>
              <p>
                Breaking molecular bonds requires energy but doesn't change temperature. Ice molecules are locked in a crystal lattice; melting breaks these bonds. Water molecules attract each other; boiling separates them completely.
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
              background: `${colors.ice}22`,
              border: `1px solid ${colors.ice}`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.ice, marginBottom: '8px' }}>
                Latent Heat of Fusion
              </h3>
              <p style={{ ...typo.h2, color: colors.textPrimary, margin: '8px 0' }}>334 kJ/kg</p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Energy to melt ice at 0C. Equal to heating water by 80C!
              </p>
            </div>

            <div style={{
              background: `${colors.steam}22`,
              border: `1px solid ${colors.steam}`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.steam, marginBottom: '8px' }}>
                Latent Heat of Vaporization
              </h3>
              <p style={{ ...typo.h2, color: colors.textPrimary, margin: '8px 0' }}>2,260 kJ/kg</p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Energy to boil water at 100C. 6.8x more than fusion!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Ready for a Twist?
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Steam is actually hotter than 100C' },
      { id: 'b', text: 'Steam releases latent heat when it condenses on skin', correct: true },
      { id: 'c', text: 'Steam covers more skin area than water droplets' },
    ];

    const twistWidth = isMobile ? 320 : 400;
    const twistHeight = isMobile ? 180 : 220;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        {/* Navigation bar with Back button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '700px',
          margin: '60px auto 0',
          width: '100%',
        }}>
          <button
            onClick={() => goToPhase('review')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Back
          </button>
          <span style={{ ...typo.small, color: colors.textMuted }}>Step 5 of 10</span>
        </div>

        <div style={{ maxWidth: '700px', margin: '24px auto 0', flex: 1, overflowY: 'auto' }}>
          <div style={{
            background: `${colors.steam}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.steam}44`,
          }}>
            <p style={{ ...typo.small, color: colors.steam, margin: 0 }}>
              Make Your Prediction - The Burn Paradox
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A paramedic warns: "Steam burns at 100C are far more dangerous than boiling water burns at 100C."
          </h2>

          {/* SVG diagram showing steam vs water burn comparison */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox={`0 0 ${twistWidth} ${twistHeight}`} width="100%" style={{ display: 'block', margin: '0 auto', maxWidth: twistWidth }}>
              <rect width="100%" height="100%" fill={colors.bgCard} rx="8" />
              <text x={twistWidth / 2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
                Steam vs Water at 100C
              </text>
              {/* Steam side */}
              <g transform="translate(40, 35)">
                <text x="50" y="10" textAnchor="middle" fill={colors.steam} fontSize="12" fontWeight="600">Steam</text>
                <rect x="10" y="20" width="80" height="80" rx="6" fill={colors.bgSecondary} stroke={colors.steam} strokeWidth="2" />
                {/* Steam clouds */}
                <ellipse cx="30" cy="55" rx="15" ry="10" fill="white" opacity="0.6" />
                <ellipse cx="55" cy="50" rx="18" ry="12" fill="white" opacity="0.5" />
                <ellipse cx="70" cy="65" rx="12" ry="8" fill="white" opacity="0.5" />
                <text x="50" y="115" textAnchor="middle" fill={colors.steam} fontSize="11">100C</text>
              </g>
              {/* Water side */}
              <g transform={`translate(${twistWidth - 140}, 35)`}>
                <text x="50" y="10" textAnchor="middle" fill={colors.water} fontSize="12" fontWeight="600">Water</text>
                <rect x="10" y="20" width="80" height="80" rx="6" fill={colors.bgSecondary} stroke={colors.water} strokeWidth="2" />
                {/* Water */}
                <rect x="15" y="50" width="70" height="45" fill={colors.water} opacity="0.7" rx="3" />
                {/* Bubbles */}
                <circle cx="35" cy="70" r="4" fill="white" opacity="0.5" />
                <circle cx="55" cy="65" r="3" fill="white" opacity="0.4" />
                <circle cx="70" cy="75" r="5" fill="white" opacity="0.5" />
                <text x="50" y="115" textAnchor="middle" fill={colors.water} fontSize="11">100C</text>
              </g>
              {/* Question mark */}
              <text x={twistWidth / 2} y="95" textAnchor="middle" fill={colors.warning} fontSize="28" fontWeight="bold">?</text>
              <text x={twistWidth / 2} y="115" textAnchor="middle" fill="#9CA3AF" fontSize="10">Which causes worse burns?</text>
              {/* Bottom label */}
              <text x={twistWidth / 2} y={twistHeight - 10} textAnchor="middle" fill="#6B7280" fontSize="10">Both at exactly the same temperature</text>
            </svg>
            <p style={{ ...typo.body, color: '#9CA3AF', marginTop: '16px' }}>
              Both steam and water are at exactly 100C.
              <br />
              <span style={{ color: colors.steam, fontWeight: 600 }}>Why would steam cause worse burns?</span>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.steam}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.steam : colors.border}`,
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
                  background: twistPrediction === opt.id ? colors.steam : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : '#9CA3AF',
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
              See the Energy Comparison
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Energy Released to Skin
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare the heat transfer from steam vs boiling water
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <SteamBurnVisualization />
            </div>

            <div style={{
              background: `${colors.steam}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h4 style={{ ...typo.h3, color: colors.steam, marginBottom: '8px' }}>Why Steam Burns Worse</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                When 1 gram of steam at 100C contacts your skin:
              </p>
              <ol style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px', paddingLeft: '20px' }}>
                <li>Steam <strong>condenses</strong> to water, releasing <span style={{ color: colors.steam }}>2,260 J</span> of latent heat</li>
                <li>Then the 100C water cools, releasing <span style={{ color: colors.water }}>~418 J</span> more</li>
                <li>Total: <span style={{ color: colors.accent, fontWeight: 700 }}>~2,678 J per gram!</span></li>
              </ol>
            </div>

            <button
              onClick={() => {
                if (!twistSimulating) {
                  setTwistSimulating(true);
                  setSteamEnergy(0);
                  setWaterEnergy(0);
                  playSound('click');
                }
              }}
              disabled={twistSimulating}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: twistSimulating ? colors.border : colors.steam,
                color: 'white',
                fontWeight: 600,
                cursor: twistSimulating ? 'not-allowed' : 'pointer',
              }}
            >
              {twistSimulating ? 'Simulating Energy Release...' : 'Compare Energy Transfer'}
            </button>
          </div>

          {steamEnergy >= 100 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Danger
            </button>
          )}
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
            The Latent Heat Danger
          </h2>

          <div style={{
            background: twistPrediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${twistPrediction === 'b' ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: twistPrediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
              {twistPrediction === 'b'
                ? "You got it! Steam releases its latent heat when condensing."
                : "The answer was B - condensation releases latent heat!"}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.steam}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.steam, marginBottom: '12px' }}>The Math of Burns</h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.textPrimary }}>Steam at 100C to skin:</strong>
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.steam, marginBottom: '16px' }}>
                  2,260 J/g (latent) + 418 J/g (sensible) = <strong>2,678 J/g</strong>
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.textPrimary }}>Water at 100C to skin:</strong>
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.water }}>
                  418 J/g (sensible only) = <strong>418 J/g</strong>
                </p>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                marginTop: '16px',
                textAlign: 'center',
              }}>
                <span style={{ ...typo.h2, color: colors.accent }}>6.4x</span>
                <span style={{ ...typo.body, color: colors.textMuted, marginLeft: '8px' }}>more energy from steam!</span>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Real-World Applications</h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li><strong>Autoclaves</strong> use steam's latent heat for sterilization</li>
                <li><strong>Steam engines</strong> extract massive energy from condensing steam</li>
                <li><strong>Industrial burns</strong> are most severe from steam leaks</li>
                <li><strong>Steam cooking</strong> is faster than dry heat at same temperature</li>
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

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0', flex: 1, overflowY: 'auto' }}>
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
                    v
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
                How This Connects to Your Experiment:
              </h4>
              <p style={{ ...typo.small, color: '#9CA3AF', margin: 0 }}>
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
              <p style={{ ...typo.small, color: '#9CA3AF', margin: 0 }}>
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
                  <div style={{ ...typo.small, color: '#6B7280' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '16px',
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>
                Industry Leaders:
              </h4>
              <p style={{ ...typo.small, color: '#9CA3AF', margin: 0 }}>
                {app.companies.join(', ')}
              </p>
            </div>
          </div>

          {/* Next Application / Continue to Test button */}
          <div style={{ marginBottom: '12px' }}>
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const nextIdx = selectedApp + 1;
                  setSelectedApp(nextIdx);
                  const newCompleted = [...completedApps];
                  newCompleted[nextIdx] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Got It - Next Application
              </button>
            ) : (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Continue to Test
              </button>
            )}
          </div>

          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>
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
                ? 'You understand latent heat and phase changes!'
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
          Latent Heat Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the hidden energy that transforms matter during phase changes.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Concepts Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Latent heat changes phase without changing temperature',
              'Heat of fusion (334 kJ/kg) for melting/freezing water',
              'Heat of vaporization (2,260 kJ/kg) for boiling/condensing',
              'Why steam burns are more dangerous than water burns',
              'Real applications: thermal storage, power plants, food preservation',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '32px',
          maxWidth: '300px',
        }}>
          <p style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Q = m * L</p>
          <p style={{ ...typo.small, color: colors.textMuted, margin: '8px 0 0 0' }}>
            Heat = mass × latent heat
          </p>
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

export default LatentHeatRenderer;
