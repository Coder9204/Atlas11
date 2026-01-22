import React, { useState, useEffect, useCallback, useRef } from 'react';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'simulation_started'
  | 'simulation_paused'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'twist_correct'
  | 'twist_incorrect'
  | 'application_viewed'
  | 'application_completed'
  | 'test_started'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved'
  | 'sound_played'
  | 'navigation'
  | 'material_selected'
  | 'heating_started'
  | 'temperature_changed';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

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

const SpecificHeatRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation states
  const [isHeating, setIsHeating] = useState(false);
  const [heatingTime, setHeatingTime] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<'water' | 'iron' | 'aluminum' | 'sand'>('water');
  const [temperatures, setTemperatures] = useState<Record<string, number>>({
    water: 20,
    iron: 20,
    aluminum: 20,
    sand: 20
  });
  const [heatInput, setHeatInput] = useState(100); // Watts

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Material specific heat capacities (J/g·°C) and thermal properties
  const materials = {
    water: { c: 4.18, name: 'Water', color: '#3b82f6', emoji: '💧', density: 1.0 },
    iron: { c: 0.45, name: 'Iron', color: '#64748b', emoji: '🔩', density: 7.87 },
    aluminum: { c: 0.90, name: 'Aluminum', color: '#a8a29e', emoji: '🥄', density: 2.70 },
    sand: { c: 0.84, name: 'Sand', color: '#d4a574', emoji: '🏖️', density: 1.5 }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const playSound = useCallback((soundType: 'success' | 'failure' | 'transition' | 'complete' | 'heat') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'success':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'failure':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'heat':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(100, ctx.currentTime);
          oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.5);
          break;
      }

      onGameEvent?.({ type: 'sound_played', data: { soundType } });
    } catch {
      // Audio not available
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Heating simulation: Q = mcΔT, so ΔT = Q/(mc)
  useEffect(() => {
    if (!isHeating) return;

    const interval = setInterval(() => {
      setHeatingTime(prev => prev + 0.1);

      setTemperatures(prev => {
        const newTemps = { ...prev };
        const mass = 100; // 100 grams for all materials
        const energyPerTick = heatInput * 0.1; // Joules per 0.1s

        Object.keys(materials).forEach((mat) => {
          const m = mat as keyof typeof materials;
          const c = materials[m].c;
          // ΔT = Q / (m × c)
          const deltaT = energyPerTick / (mass * c);
          newTemps[m] = Math.min(prev[m] + deltaT, 100); // Cap at 100°C
        });

        return newTemps;
      });

      onGameEvent?.({ type: 'temperature_changed', data: { temperatures, time: heatingTime } });
    }, 100);

    return () => clearInterval(interval);
  }, [isHeating, heatInput, heatingTime, temperatures, onGameEvent]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: isCorrect ? 'prediction_correct' : 'prediction_incorrect', data: { prediction } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: isCorrect ? 'twist_correct' : 'twist_incorrect', data: { prediction } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'application_completed', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const resetSimulation = useCallback(() => {
    setIsHeating(false);
    setHeatingTime(0);
    setTemperatures({
      water: 20,
      iron: 20,
      aluminum: 20,
      sand: 20
    });
    onGameEvent?.({ type: 'simulation_paused' });
  }, [onGameEvent]);

  const startHeating = useCallback(() => {
    resetSimulation();
    setTimeout(() => {
      setIsHeating(true);
      playSound('heat');
      onGameEvent?.({ type: 'heating_started', data: { heatInput } });
    }, 100);
  }, [resetSimulation, playSound, heatInput, onGameEvent]);

  const testQuestions: TestQuestion[] = [
    {
      scenario: "You're at the beach on a hot summer day.",
      question: "Why does the sand burn your feet but the water feels cool?",
      options: [
        { text: "The sand is actually hotter than the water", correct: false },
        { text: "Sand has lower specific heat so it heats up faster in sunlight", correct: true },
        { text: "Water reflects all the sun's heat away", correct: false },
        { text: "Your feet are more sensitive to sand", correct: false }
      ],
      explanation: "Both sand and water receive the same solar energy, but sand's low specific heat (0.84 J/g·°C) causes it to heat up much faster than water (4.18 J/g·°C). The same energy causes a much bigger temperature change in sand!"
    },
    {
      scenario: "A chef is preparing a meal and needs to boil water and heat oil in separate pans.",
      question: "Why does the oil get dangerously hot faster than the water?",
      options: [
        { text: "Oil absorbs more heat from the stove", correct: false },
        { text: "Oil has a lower specific heat than water", correct: true },
        { text: "Oil is darker so it absorbs more light", correct: false },
        { text: "Water is heavier than oil", correct: false }
      ],
      explanation: "Oil has a specific heat around 1.7 J/g·°C, less than half that of water (4.18 J/g·°C). For the same heat input, oil's temperature rises about 2.5x faster than water, making it much more dangerous!"
    },
    {
      scenario: "An engineer is designing a solar water heater for a home.",
      question: "Why is water a good choice for storing thermal energy?",
      options: [
        { text: "Water is cheap and available", correct: false },
        { text: "Water's high specific heat stores lots of energy per degree", correct: true },
        { text: "Water is transparent to solar radiation", correct: false },
        { text: "Water naturally circulates when heated", correct: false }
      ],
      explanation: "Water's exceptionally high specific heat (4.18 J/g·°C) means it can absorb and store a large amount of thermal energy with only a small temperature rise. This makes it ideal for thermal storage applications."
    },
    {
      scenario: "You notice that coastal cities have milder temperatures than inland cities at the same latitude.",
      question: "What property of water is primarily responsible for this?",
      options: [
        { text: "Water evaporates and cools the air", correct: false },
        { text: "Water reflects sunlight back to space", correct: false },
        { text: "Water's high specific heat moderates temperature swings", correct: true },
        { text: "Ocean currents bring warm water from the equator", correct: false }
      ],
      explanation: "The ocean's high specific heat means it absorbs enormous amounts of solar energy with minimal temperature increase. In summer, it stays cooler than land; in winter, it releases stored heat, keeping coastal areas warmer."
    },
    {
      scenario: "A car engine uses a liquid coolant mixture instead of pure water.",
      question: "Besides preventing freezing, why add antifreeze to water?",
      options: [
        { text: "Antifreeze is a better lubricant", correct: false },
        { text: "Antifreeze raises the boiling point to prevent overheating", correct: true },
        { text: "Antifreeze makes the engine more efficient", correct: false },
        { text: "Pure water would rust the engine", correct: false }
      ],
      explanation: "While water has excellent specific heat for absorbing engine heat, it boils at 100°C. Adding antifreeze (ethylene glycol) raises the boiling point to ~130°C, allowing the coolant to absorb more heat without boiling."
    },
    {
      scenario: "You're comparing a cast iron pan and an aluminum pan of the same weight.",
      question: "Which pan will reach cooking temperature faster on the same burner?",
      options: [
        { text: "Cast iron, because it's denser", correct: false },
        { text: "Aluminum, because it has higher specific heat", correct: false },
        { text: "Aluminum, because it has lower specific heat", correct: true },
        { text: "They heat at exactly the same rate", correct: false }
      ],
      explanation: "Aluminum's specific heat (0.90 J/g·°C) is higher than iron's (0.45 J/g·°C), but aluminum is much lighter. For the same weight, aluminum has more mass to heat, but its excellent thermal conductivity wins overall."
    },
    {
      scenario: "NASA is designing a spacecraft that must survive extreme temperature swings in space.",
      question: "Why might they use phase-change materials (PCMs) in addition to high specific heat materials?",
      options: [
        { text: "PCMs are lighter than water", correct: false },
        { text: "PCMs absorb/release extra energy during melting/freezing without temperature change", correct: true },
        { text: "PCMs conduct heat faster", correct: false },
        { text: "PCMs are cheaper than water", correct: false }
      ],
      explanation: "When PCMs melt or freeze, they absorb or release latent heat without changing temperature. This creates a temperature 'buffer zone' that provides even more thermal stability than high specific heat alone."
    },
    {
      scenario: "You're filling a hot water bottle to warm your bed on a cold night.",
      question: "Why does a water-filled bottle stay warm much longer than a metal one at the same starting temperature?",
      options: [
        { text: "Water is a better insulator", correct: false },
        { text: "Water stores more heat energy per degree of temperature", correct: true },
        { text: "Metal radiates heat faster", correct: false },
        { text: "Water bottles have thicker walls", correct: false }
      ],
      explanation: "Water's high specific heat means a hot water bottle stores far more thermal energy than metal at the same temperature. As heat escapes, water's temperature drops slowly because it has so much stored energy to lose."
    },
    {
      scenario: "A materials scientist is selecting a heat sink material for electronics.",
      question: "Which combination of properties is most desirable?",
      options: [
        { text: "High specific heat only", correct: false },
        { text: "High thermal conductivity only", correct: false },
        { text: "Low specific heat and high thermal conductivity", correct: true },
        { text: "Low thermal conductivity and high specific heat", correct: false }
      ],
      explanation: "Heat sinks need to quickly move heat away from components. Low specific heat means the material heats up quickly (faster response), while high conductivity spreads and dissipates that heat efficiently."
    },
    {
      scenario: "You're comparing temperature data for Phoenix, Arizona (desert) and San Diego, California (coastal).",
      question: "Phoenix has 40°C summer days and 5°C winter nights. San Diego stays between 15-25°C. Why?",
      options: [
        { text: "Phoenix is at a higher elevation", correct: false },
        { text: "San Diego gets more rain", correct: false },
        { text: "The Pacific Ocean's massive heat capacity moderates San Diego's temperature", correct: true },
        { text: "Desert sand reflects more heat", correct: false }
      ],
      explanation: "The Pacific Ocean acts as a massive thermal buffer. Its high specific heat absorbs summer heat and releases it in winter. Phoenix, far from water, experiences the full swing of desert thermal extremes."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🌊",
      title: "Climate Regulation",
      short: "Ocean Climate",
      tagline: "How oceans keep our planet livable",
      description: "Earth's oceans act as a massive thermal buffer, absorbing and releasing heat to moderate global temperatures and create distinct climate zones.",
      connection: "Water's extraordinary specific heat (4.18 J/g·°C) allows oceans to absorb 1000x more heat than the atmosphere without dramatic temperature changes.",
      howItWorks: "In summer, oceans absorb excess solar heat, staying cooler than land. In winter, they slowly release stored heat, warming coastal regions. This creates milder coastal climates and drives weather patterns.",
      stats: [
        { value: "90%", label: "Of global warming heat absorbed by oceans" },
        { value: "4.18", label: "Water's specific heat (J/g·°C)" },
        { value: "1000x", label: "Ocean heat capacity vs atmosphere" }
      ],
      examples: [
        "San Francisco's fog from cold ocean currents",
        "UK's mild winters despite high latitude",
        "Mediterranean climate in coastal California",
        "Monsoon patterns driven by land-sea temperature differences"
      ],
      companies: ["NOAA", "Scripps Institution", "Woods Hole Oceanographic", "NCAR"],
      futureImpact: "Understanding ocean heat capacity is critical for predicting climate change impacts and designing adaptation strategies for coastal communities.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🚗",
      title: "Engine Cooling Systems",
      short: "Car Coolant",
      tagline: "Keeping engines at optimal temperature",
      description: "Modern vehicles use water-based coolant systems that leverage water's high specific heat to absorb and dissipate engine heat efficiently.",
      connection: "Water absorbs huge amounts of heat per degree, making it perfect for capturing engine heat and carrying it to the radiator for dissipation.",
      howItWorks: "Coolant circulates through engine passages, absorbing combustion heat. The water/antifreeze mixture's high specific heat allows it to carry this heat to the radiator where fans and airflow dissipate it.",
      stats: [
        { value: "30-35%", label: "Engine energy lost as heat" },
        { value: "~90°C", label: "Normal operating temp" },
        { value: "50/50", label: "Typical water/antifreeze ratio" }
      ],
      examples: [
        "Automotive radiator systems",
        "Heavy machinery cooling",
        "Marine engine cooling (seawater)",
        "Electric vehicle battery thermal management"
      ],
      companies: ["Prestone", "Zerex", "Delphi", "Denso"],
      futureImpact: "EV battery thermal management uses advanced coolants and phase-change materials to maintain optimal battery temperature for performance and longevity.",
      color: "from-red-600 to-orange-600"
    },
    {
      icon: "🏠",
      title: "Thermal Mass in Buildings",
      short: "Building Design",
      tagline: "Storing heat in building materials",
      description: "Architects use high specific heat materials like concrete and water walls to absorb heat during the day and release it at night, reducing energy costs.",
      connection: "Materials with high specific heat act as thermal batteries, absorbing excess heat when it's warm and releasing it when it's cool.",
      howItWorks: "Thick concrete walls or water-filled containers absorb solar heat during sunny periods. At night, they slowly release this stored heat, maintaining comfortable indoor temperatures with less HVAC usage.",
      stats: [
        { value: "25-40%", label: "Potential HVAC energy savings" },
        { value: "8-12hr", label: "Thermal lag in massive walls" },
        { value: "4.18", label: "Water specific heat (ideal)" }
      ],
      examples: [
        "Trombe walls (glass-covered concrete)",
        "Water wall passive heating",
        "Underground earth-sheltered homes",
        "Adobe and rammed earth construction"
      ],
      companies: ["Passive House Institute", "Rocky Mountain Institute", "LEED", "BREEAM"],
      futureImpact: "Phase-change materials integrated into building materials will provide even better thermal storage, enabling near-zero energy buildings in extreme climates.",
      color: "from-amber-600 to-yellow-600"
    },
    {
      icon: "🔬",
      title: "Industrial Heat Transfer",
      short: "Process Cooling",
      tagline: "Managing heat in manufacturing",
      description: "Industrial processes rely on understanding specific heat to design efficient cooling systems, heat exchangers, and thermal management solutions.",
      connection: "Choosing the right working fluid based on specific heat determines how efficiently heat can be moved from one place to another.",
      howItWorks: "Heat exchangers transfer thermal energy between fluids. High specific heat fluids like water can carry more energy per unit mass, making systems more compact and efficient.",
      stats: [
        { value: "70%", label: "Industrial energy used for heating/cooling" },
        { value: "85-95%", label: "Heat exchanger efficiency" },
        { value: "4-10x", label: "Water vs oil heat capacity" }
      ],
      examples: [
        "Chemical reactor cooling",
        "Steel mill quenching systems",
        "Food processing pasteurization",
        "Data center liquid cooling"
      ],
      companies: ["Alfa Laval", "SWEP", "Kelvion", "GEA"],
      futureImpact: "Advanced nanofluids with enhanced thermal properties could revolutionize heat transfer efficiency, enabling smaller, more powerful cooling systems.",
      color: "from-purple-600 to-indigo-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const getTemperatureColor = (temp: number) => {
    const ratio = (temp - 20) / 80; // 20°C to 100°C range
    const r = Math.round(255 * ratio);
    const b = Math.round(255 * (1 - ratio));
    return `rgb(${r}, ${Math.round(100 - 50 * ratio)}, ${b})`;
  };

  // Render helper functions
  const renderHeatingSimulation = () => (
    <svg width={isMobile ? 320 : 500} height={isMobile ? 280 : 300} className="mx-auto">
      <defs>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Burner/heat source */}
      <rect x={isMobile ? 60 : 100} y={isMobile ? 230 : 250} width={isMobile ? 200 : 300} height="20" rx="4" fill="#1e293b" />

      {/* Flames when heating */}
      {isHeating && (
        <g>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <path
              key={i}
              d={`M${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250} Q${(isMobile ? 75 : 115) + i * (isMobile ? 35 : 50)},${isMobile ? 210 : 230} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 195 : 215} Q${(isMobile ? 85 : 125) + i * (isMobile ? 35 : 50)},${isMobile ? 210 : 230} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250}`}
              fill="url(#flameGrad)"
              filter="url(#glow)"
            >
              <animate attributeName="d"
                values={`M${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250} Q${(isMobile ? 73 : 113) + i * (isMobile ? 35 : 50)},${isMobile ? 215 : 235} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 200 : 220} Q${(isMobile ? 87 : 127) + i * (isMobile ? 35 : 50)},${isMobile ? 215 : 235} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250};M${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250} Q${(isMobile ? 77 : 117) + i * (isMobile ? 35 : 50)},${isMobile ? 205 : 225} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 185 : 205} Q${(isMobile ? 83 : 123) + i * (isMobile ? 35 : 50)},${isMobile ? 205 : 225} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250};M${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250} Q${(isMobile ? 73 : 113) + i * (isMobile ? 35 : 50)},${isMobile ? 215 : 235} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 200 : 220} Q${(isMobile ? 87 : 127) + i * (isMobile ? 35 : 50)},${isMobile ? 215 : 235} ${(isMobile ? 80 : 120) + i * (isMobile ? 35 : 50)},${isMobile ? 230 : 250}`}
                dur="0.4s" repeatCount="indefinite" />
            </path>
          ))}
        </g>
      )}

      {/* Containers with materials */}
      {Object.entries(materials).map(([key, mat], index) => {
        const xPos = (isMobile ? 30 : 50) + index * (isMobile ? 75 : 110);
        const temp = temperatures[key];
        const fillHeight = 100;

        return (
          <g key={key}>
            {/* Container */}
            <rect
              x={xPos}
              y={isMobile ? 110 : 130}
              width={isMobile ? 60 : 90}
              height={fillHeight}
              rx="4"
              fill="#374151"
              stroke={selectedMaterial === key ? '#f59e0b' : '#64748b'}
              strokeWidth={selectedMaterial === key ? 3 : 1}
            />

            {/* Material fill with temperature color */}
            <rect
              x={xPos + 4}
              y={isMobile ? 114 : 134}
              width={isMobile ? 52 : 82}
              height={fillHeight - 8}
              rx="2"
              fill={getTemperatureColor(temp)}
              opacity="0.8"
            />

            {/* Temperature display */}
            <text
              x={xPos + (isMobile ? 30 : 45)}
              y={isMobile ? 155 : 175}
              textAnchor="middle"
              fill="white"
              fontSize={isMobile ? "16" : "18"}
              fontWeight="bold"
            >
              {temp.toFixed(1)}°C
            </text>

            {/* Material label */}
            <text
              x={xPos + (isMobile ? 30 : 45)}
              y={isMobile ? 95 : 115}
              textAnchor="middle"
              fill={mat.color}
              fontSize={isMobile ? "11" : "12"}
              fontWeight="bold"
            >
              {mat.emoji} {mat.name}
            </text>

            {/* Specific heat value */}
            <text
              x={xPos + (isMobile ? 30 : 45)}
              y={isMobile ? 265 : 285}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
            >
              c = {mat.c} J/g·°C
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <text x={isMobile ? 160 : 250} y="25" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">
        Same Heat Applied to Each Material (100g each)
      </text>
      <text x={isMobile ? 160 : 250} y="45" textAnchor="middle" fill="#94a3b8" fontSize="12">
        Q = mcΔT → Lower c means higher ΔT!
      </text>
    </svg>
  );

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-amber-200 bg-clip-text text-transparent">
        Why Does Sand Burn Your Feet?
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why different materials heat up at different rates
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 rounded-3xl" />
        <svg width={isMobile ? 300 : 400} height={isMobile ? 180 : 200} className="mx-auto mb-6">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="sandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Sky */}
          <rect x="0" y="0" width={isMobile ? 300 : 400} height="80" fill="url(#skyGrad)" />

          {/* Sun */}
          <circle cx={isMobile ? 250 : 340} cy="40" r="25" fill="#fbbf24" filter="url(#glow)">
            <animate attributeName="r" values="25;27;25" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Water */}
          <rect x="0" y="80" width={isMobile ? 150 : 200} height="120" fill="url(#waterGrad)" />
          <text x={isMobile ? 75 : 100} y="140" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">~25°C</text>
          <text x={isMobile ? 75 : 100} y="160" textAnchor="middle" fill="#bfdbfe" fontSize="12">Cool & refreshing!</text>

          {/* Sand */}
          <rect x={isMobile ? 150 : 200} y="80" width={isMobile ? 150 : 200} height="120" fill="url(#sandGrad)" />
          <text x={isMobile ? 225 : 300} y="140" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">~55°C!</text>
          <text x={isMobile ? 225 : 300} y="160" textAnchor="middle" fill="#92400e" fontSize="12">Ouch! Burns!</text>

          {/* Sun rays pointing down */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1={80 + i * (isMobile ? 40 : 60)}
              y1="60"
              x2={80 + i * (isMobile ? 40 : 60)}
              y2="80"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="4 4"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.5s" repeatCount="indefinite" />
            </line>
          ))}

          {/* Equal energy labels */}
          <text x={isMobile ? 150 : 200} y="70" textAnchor="middle" fill="#fbbf24" fontSize="10">
            Same sunlight energy!
          </text>
        </svg>

        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-slate-300 mb-4`}>
          Both the sand and ocean receive the same amount of sunlight, but the sand gets burning hot while the water stays cool!
        </p>
        <p className="text-lg text-orange-400 font-medium">
          The secret is called <strong>specific heat capacity</strong>
        </p>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Specific Heat
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Q = mcΔT
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Thermal Energy
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Climate Science
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You apply the same amount of heat energy to equal masses (100g) of water, iron, aluminum, and sand.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Which one will reach the highest temperature first?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Water - it conducts heat well' },
          { id: 'B', text: 'Iron - metals have LOW specific heat' },
          { id: 'C', text: 'They all heat up equally' },
          { id: 'D', text: 'Water - it has the highest specific heat' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! Iron has a specific heat of only <span className="text-cyan-400">0.45 J/g·°C</span> - about 9x lower than water!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            From Q = mcΔT, lower c means higher ΔT for the same Q and m!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
          >
            Explore the Lab →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Specific Heat Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4 w-full max-w-2xl">
        {renderHeatingSimulation()}

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{heatInput}W</div>
            <div className="text-sm text-slate-400">Heat Input</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{heatingTime.toFixed(1)}s</div>
            <div className="text-sm text-slate-400">Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {(temperatures.iron - temperatures.water).toFixed(1)}°C
            </div>
            <div className="text-sm text-slate-400">Iron-Water Diff</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); startHeating(); }}
          className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
        >
          🔥 Start Heating
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); resetSimulation(); }}
          className="px-6 py-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">The Specific Heat Equation:</h3>
        <div className="text-center mb-3">
          <span className="text-2xl font-mono text-white bg-slate-900 px-4 py-2 rounded-lg">
            Q = m × c × ΔT
          </span>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li><strong className="text-orange-400">Q</strong> = Heat energy (Joules)</li>
          <li><strong className="text-cyan-400">m</strong> = Mass (grams)</li>
          <li><strong className="text-purple-400">c</strong> = Specific heat capacity (J/g·°C)</li>
          <li><strong className="text-emerald-400">ΔT</strong> = Temperature change (°C)</li>
        </ul>
        <p className="text-slate-400 text-sm mt-3">
          Rearranging: ΔT = Q/(m×c) → <span className="text-cyan-400">Lower c = Higher ΔT!</span>
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Specific Heat</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">💧 Water is Special!</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Water's specific heat: <span className="text-cyan-400 font-bold">4.18 J/g·°C</span></li>
            <li>• One of the highest of any common substance</li>
            <li>• Takes ~9x more energy to heat than iron</li>
            <li>• Why? Hydrogen bonds require extra energy to break</li>
            <li>• Critical for life and climate regulation!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">🔩 Metals Heat Fast</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Iron: <span className="text-orange-400">0.45 J/g·°C</span></li>
            <li>• Aluminum: <span className="text-slate-400">0.90 J/g·°C</span></li>
            <li>• Copper: <span className="text-amber-600">0.39 J/g·°C</span></li>
            <li>• Metallic bonds transfer energy efficiently</li>
            <li>• Why pans heat up fast but burn easily!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🌍 Real-World Impact</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Beach paradox:</strong> Sand (c = 0.84) heats up 5x faster than water in the same sunlight!</p>
            <p><strong>Cooking:</strong> Oil (c = 1.7) heats twice as fast as water - dangerous if you're not careful!</p>
            <p><strong>Climate:</strong> Oceans absorb massive heat with small temperature changes, stabilizing global climate.</p>
            <p className="text-cyan-400 mt-3 font-medium">
              Specific heat isn't just physics trivia - it shapes our weather, cooking, and survival!
            </p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Climate Puzzle</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg width={isMobile ? 300 : 400} height={isMobile ? 140 : 160} className="mx-auto mb-4">
          {/* Map outline */}
          <rect x="10" y="10" width={isMobile ? 280 : 380} height={isMobile ? 120 : 140} rx="8" fill="#1e3a5f" />

          {/* Ocean */}
          <rect x="10" y="10" width={isMobile ? 100 : 140} height={isMobile ? 120 : 140} rx="8" fill="#0369a1" />

          {/* Land */}
          <rect x={isMobile ? 110 : 150} y="10" width={isMobile ? 180 : 240} height={isMobile ? 120 : 140} fill="#166534" />

          {/* San Diego */}
          <circle cx={isMobile ? 60 : 80} cy={isMobile ? 70 : 80} r="8" fill="#3b82f6" />
          <text x={isMobile ? 60 : 80} y={isMobile ? 95 : 105} textAnchor="middle" fill="white" fontSize="10">San Diego</text>
          <text x={isMobile ? 60 : 80} y={isMobile ? 107 : 117} textAnchor="middle" fill="#93c5fd" fontSize="9">15-25°C</text>

          {/* Phoenix */}
          <circle cx={isMobile ? 200 : 280} cy={isMobile ? 70 : 80} r="8" fill="#f97316" />
          <text x={isMobile ? 200 : 280} y={isMobile ? 95 : 105} textAnchor="middle" fill="white" fontSize="10">Phoenix</text>
          <text x={isMobile ? 200 : 280} y={isMobile ? 107 : 117} textAnchor="middle" fill="#fbbf24" fontSize="9">5-40°C!</text>

          {/* Same latitude line */}
          <line x1="50" y1={isMobile ? 70 : 80} x2={isMobile ? 250 : 340} y2={isMobile ? 70 : 80} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
          <text x={isMobile ? 150 : 195} y={isMobile ? 55 : 65} textAnchor="middle" fill="#fbbf24" fontSize="9">Same latitude!</text>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          San Diego and Phoenix are at similar latitudes, but San Diego has mild temperatures year-round while Phoenix swings from freezing winters to scorching summers!
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What's the main reason for this dramatic difference?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Phoenix is at a higher elevation' },
          { id: 'B', text: 'San Diego gets more rainfall' },
          { id: 'C', text: 'The Pacific Ocean\'s high specific heat moderates San Diego\'s temperature' },
          { id: 'D', text: 'Phoenix has darker soil that absorbs more heat' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ The Pacific Ocean acts as a massive thermal buffer!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Water's high specific heat means the ocean absorbs enormous amounts of solar energy with minimal temperature change. It stays cooler than land in summer and warmer in winter!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore the Science →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Ocean as Climate Regulator</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Summer Effect</h3>
          <svg width="100%" height="120" viewBox="0 0 200 120" className="mx-auto">
            {/* Sun */}
            <circle cx="100" cy="20" r="15" fill="#fbbf24" />
            {/* Rays */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1={40 + i * 30} y1="35" x2={40 + i * 30} y2="50" stroke="#fbbf24" strokeWidth="2" />
            ))}
            {/* Ocean */}
            <rect x="10" y="55" width="80" height="55" fill="#0369a1" rx="4" />
            <text x="50" y="85" textAnchor="middle" fill="white" fontSize="10">Ocean</text>
            <text x="50" y="100" textAnchor="middle" fill="#93c5fd" fontSize="9">Absorbs heat</text>
            {/* Land */}
            <rect x="110" y="55" width="80" height="55" fill="#166534" rx="4" />
            <text x="150" y="85" textAnchor="middle" fill="white" fontSize="10">Land</text>
            <text x="150" y="100" textAnchor="middle" fill="#fbbf24" fontSize="9">Heats fast!</text>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Winter Effect</h3>
          <svg width="100%" height="120" viewBox="0 0 200 120" className="mx-auto">
            {/* Moon/night */}
            <circle cx="100" cy="20" r="12" fill="#64748b" />
            {/* Stars */}
            {[30, 70, 130, 170].map((x, i) => (
              <circle key={i} cx={x} cy={15 + (i * 5) % 15} r="1" fill="white" />
            ))}
            {/* Ocean */}
            <rect x="10" y="55" width="80" height="55" fill="#0369a1" rx="4" />
            <text x="50" y="85" textAnchor="middle" fill="white" fontSize="10">Ocean</text>
            <text x="50" y="100" textAnchor="middle" fill="#fbbf24" fontSize="9">Releases heat</text>
            {/* Wavy heat lines */}
            <path d="M30,50 Q35,45 40,50 Q45,55 50,50" fill="none" stroke="#f97316" strokeWidth="1" />
            {/* Land */}
            <rect x="110" y="55" width="80" height="55" fill="#166534" rx="4" />
            <text x="150" y="85" textAnchor="middle" fill="white" fontSize="10">Land</text>
            <text x="150" y="100" textAnchor="middle" fill="#60a5fa" fontSize="9">Cools fast!</text>
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">The Numbers Tell the Story:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• Ocean heat capacity: <strong className="text-cyan-400">~1000x greater than atmosphere</strong></li>
          <li>• Ocean absorbs <strong className="text-orange-400">90%</strong> of global warming heat</li>
          <li>• Coastal cities experience <strong className="text-emerald-400">10-15°C smaller</strong> seasonal swings</li>
          <li>• Ocean currents distribute heat globally, moderating climate everywhere</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          Without the ocean's massive heat capacity, Earth would have extreme temperature swings like the Moon (+127°C to -173°C)!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Specific Heat Shapes Our World!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Water's unusually high specific heat has profound effects:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🌊</div>
              <div className="font-bold text-white">Climate Stability</div>
              <div className="text-slate-400">Oceans moderate temperature</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🦠</div>
              <div className="font-bold text-white">Life on Earth</div>
              <div className="text-slate-400">Stable body temperatures</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🌧️</div>
              <div className="font-bold text-white">Weather Patterns</div>
              <div className="text-slate-400">Land-sea temperature drives wind</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🏖️</div>
              <div className="font-bold text-white">Coastal Living</div>
              <div className="text-slate-400">Milder, more livable climates</div>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            From cooking to climate change, specific heat is one of the most important properties in physics!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = transferApps[activeAppTab];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {transferApps.map((a, index) => (
            <button
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppTab(index);
                onGameEvent?.({ type: 'application_viewed', data: { appIndex: index } });
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeAppTab === index
                  ? `bg-gradient-to-r ${a.color} text-white`
                  : completedApps.has(index)
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{app.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-sm text-slate-400">{app.tagline}</p>
            </div>
          </div>

          <p className="text-slate-300 mt-4 mb-4">{app.description}</p>

          <div className={`bg-gradient-to-r ${app.color} bg-opacity-20 rounded-xl p-4 mb-4`}>
            <h4 className="font-semibold text-white mb-2">🔗 Physics Connection</h4>
            <p className="text-slate-200 text-sm">{app.connection}</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            <h4 className="font-semibold text-cyan-400 mb-2">⚙️ How It Works</h4>
            <p className="text-slate-300 text-sm">{app.howItWorks}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {app.stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-orange-400">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-emerald-400 mb-2">📋 Examples</h4>
            <ul className="text-sm text-slate-300 space-y-1">
              {app.examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {app.companies.map((company, i) => (
              <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{company}</span>
            ))}
          </div>

          <div className="bg-purple-900/30 rounded-xl p-4">
            <h4 className="font-semibold text-purple-400 mb-2">🚀 Future Impact</h4>
            <p className="text-slate-300 text-sm">{app.futureImpact}</p>
          </div>

          {!completedApps.has(activeAppTab) && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
              className="mt-4 w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
            >
              ✓ Mark as Understood
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {transferApps.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
              />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/{transferApps.length}</span>
        </div>

        {completedApps.size >= transferApps.length && (
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              onGameEvent?.({ type: 'test_completed', data: { score: calculateScore() } });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🔥' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-4">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered specific heat capacity!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div key={qIndex} className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-white font-medium">{q.question}</span>
                  </div>
                  <p className="text-slate-400 text-sm ml-7">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
                goToPhase(3);
              }}
              className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-amber-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🌡️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Specific Heat Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of specific heat capacity!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💧</div>
            <p className="text-sm text-slate-300">Water's High c</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔩</div>
            <p className="text-sm text-slate-300">Metal's Low c</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌊</div>
            <p className="text-sm text-slate-300">Climate Regulation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">Q = mcΔT</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Specific Heat Capacity</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
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

      <div className="relative pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default SpecificHeatRenderer;
