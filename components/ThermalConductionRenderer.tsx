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
  | 'material_changed'
  | 'temperature_changed'
  | 'heat_flow_measured';

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

const ThermalConductionRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<'copper' | 'steel' | 'glass' | 'wood'>('copper');
  const [hotSideTemp, setHotSideTemp] = useState(100); // °C
  const [coldSideTemp, setColdSideTemp] = useState(20); // °C
  const [barTemperatures, setBarTemperatures] = useState<number[]>(Array(10).fill(20));

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Material thermal conductivities (W/m·K)
  const materials = {
    copper: { k: 385, name: 'Copper', color: '#f97316', emoji: '🟧' },
    steel: { k: 50, name: 'Steel', color: '#64748b', emoji: '⬜' },
    glass: { k: 1.0, name: 'Glass', color: '#06b6d4', emoji: '🔷' },
    wood: { k: 0.15, name: 'Wood', color: '#a16207', emoji: '🟫' }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const playSound = useCallback((soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'heat') => {
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
        case 'click':
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.08);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.08);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, ctx.currentTime + 0.3) || gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
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
          oscillator.frequency.setValueAtTime(80, ctx.currentTime);
          oscillator.frequency.setValueAtTime(120, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
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

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Heat conduction simulation
  useEffect(() => {
    if (!isSimulating) return;

    const k = materials[selectedMaterial].k;
    const alpha = k / 1000; // Thermal diffusivity (simplified)

    const interval = setInterval(() => {
      setSimulationTime(prev => prev + 0.1);

      setBarTemperatures(prev => {
        const newTemps = [...prev];
        // Apply heat equation: dT/dt = α * d²T/dx²
        for (let i = 0; i < 10; i++) {
          const leftTemp = i === 0 ? hotSideTemp : prev[i - 1];
          const rightTemp = i === 9 ? coldSideTemp : prev[i + 1];
          const d2T = leftTemp - 2 * prev[i] + rightTemp;
          newTemps[i] = prev[i] + alpha * d2T * 0.5;
        }
        return newTemps;
      });

      onGameEvent?.({ type: 'heat_flow_measured', data: { time: simulationTime, temperatures: barTemperatures } });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, selectedMaterial, hotSideTemp, coldSideTemp, simulationTime, barTemperatures, onGameEvent]);

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
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'success' : 'failure');
    onGameEvent?.({ type: isCorrect ? 'prediction_correct' : 'prediction_incorrect', data: { prediction } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'success' : 'failure');
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
    setIsSimulating(false);
    setSimulationTime(0);
    setBarTemperatures(Array(10).fill(coldSideTemp));
    onGameEvent?.({ type: 'simulation_paused' });
  }, [coldSideTemp, onGameEvent]);

  const startSimulation = useCallback(() => {
    resetSimulation();
    setTimeout(() => {
      setIsSimulating(true);
      playSound('heat');
      onGameEvent?.({ type: 'simulation_started', data: { material: selectedMaterial, hotTemp: hotSideTemp, coldTemp: coldSideTemp } });
    }, 100);
  }, [resetSimulation, playSound, selectedMaterial, hotSideTemp, coldSideTemp, onGameEvent]);

  // Calculate heat flow rate
  const heatFlowRate = materials[selectedMaterial].k * (hotSideTemp - coldSideTemp) / 100;

  const testQuestions: TestQuestion[] = [
    {
      scenario: "You're camping and need to choose a pot to boil water quickly.",
      question: "Which pot material will heat the water fastest?",
      options: [
        { text: "Ceramic pot", correct: false },
        { text: "Copper pot", correct: true },
        { text: "Wooden bowl (if it could hold water)", correct: false },
        { text: "Glass pot", correct: false }
      ],
      explanation: "Copper has the highest thermal conductivity (~385 W/m·K) of common materials, allowing heat to transfer from the fire to the water much faster than ceramic, glass, or wood."
    },
    {
      scenario: "You grab a metal spoon and a wooden spoon that have both been sitting in the same hot soup.",
      question: "Why does the metal spoon feel hotter even though both are the same temperature?",
      options: [
        { text: "Metal actually IS hotter", correct: false },
        { text: "Metal conducts heat INTO your hand faster", correct: true },
        { text: "Wood reflects heat", correct: false },
        { text: "Your hand is confused", correct: false }
      ],
      explanation: "Both spoons are the same temperature, but metal's high thermal conductivity transfers heat to your skin much faster than wood, making it feel hotter. This is why we feel temperature transfer, not actual temperature!"
    },
    {
      scenario: "An engineer is designing a heat sink for a computer processor.",
      question: "What property should the heat sink material have?",
      options: [
        { text: "Low thermal conductivity to trap heat", correct: false },
        { text: "High thermal conductivity to spread heat quickly", correct: true },
        { text: "Zero thermal conductivity for insulation", correct: false },
        { text: "Variable conductivity based on color", correct: false }
      ],
      explanation: "Heat sinks need HIGH thermal conductivity (like copper or aluminum) to quickly draw heat away from the processor and spread it across a larger surface area where it can dissipate into the air."
    },
    {
      scenario: "You're building an igloo in the Arctic for shelter.",
      question: "Why does compacted snow make a good insulator despite being frozen water?",
      options: [
        { text: "Snow is actually warm", correct: false },
        { text: "Trapped air pockets have very low thermal conductivity", correct: true },
        { text: "Ice reflects body heat back inside", correct: false },
        { text: "The cold outside can't penetrate ice", correct: false }
      ],
      explanation: "Snow contains up to 95% trapped air, and air has very low thermal conductivity (~0.025 W/m·K). This makes snow an excellent insulator, keeping the body-warmed air inside the igloo from escaping."
    },
    {
      scenario: "A thermos bottle has a vacuum layer between its inner and outer walls.",
      question: "Why is vacuum the ultimate thermal insulator?",
      options: [
        { text: "Vacuum is extremely cold", correct: false },
        { text: "With no molecules, there's nothing to conduct heat", correct: true },
        { text: "Vacuum absorbs heat energy", correct: false },
        { text: "Light can't pass through vacuum", correct: false }
      ],
      explanation: "Thermal conduction requires molecules to transfer kinetic energy. A vacuum contains no molecules, making conduction impossible. This is why vacuum-insulated containers keep drinks hot or cold for hours."
    },
    {
      scenario: "You're choosing insulation for your home's walls.",
      question: "Fiberglass insulation works well because:",
      options: [
        { text: "Glass is a poor conductor and traps air", correct: true },
        { text: "Fiberglass generates its own heat", correct: false },
        { text: "The glass fibers absorb cold", correct: false },
        { text: "Pink color reflects heat waves", correct: false }
      ],
      explanation: "Fiberglass combines two insulating effects: glass itself has low thermal conductivity (~1 W/m·K), and the loose fiber structure traps many small air pockets, which are even better insulators."
    },
    {
      scenario: "A chef touches two surfaces in the kitchen - a wooden cutting board and a granite countertop.",
      question: "On a cold morning, why does the granite feel colder?",
      options: [
        { text: "Granite is actually at a lower temperature", correct: false },
        { text: "Granite conducts heat away from your hand faster", correct: true },
        { text: "Wood generates a small amount of heat", correct: false },
        { text: "Granite absorbs body heat permanently", correct: false }
      ],
      explanation: "Both surfaces are at room temperature, but granite's higher thermal conductivity (~2.5 W/m·K) pulls heat from your hand much faster than wood (~0.15 W/m·K), making it feel colder."
    },
    {
      scenario: "You notice ice forms on a car's metal body but not on its rubber tires during a cold night.",
      question: "Why does ice form preferentially on metal?",
      options: [
        { text: "Rubber repels water", correct: false },
        { text: "Metal loses heat faster, reaching frost point first", correct: true },
        { text: "Metal attracts moisture from the air", correct: false },
        { text: "Rubber stays warm from road friction memory", correct: false }
      ],
      explanation: "Metal's high thermal conductivity allows it to radiate heat to the cold sky much faster than rubber. The metal surface reaches the dew point first, causing moisture to condense and freeze."
    },
    {
      scenario: "Engineers are designing a spacecraft that must survive extreme temperatures in space.",
      question: "Why is multi-layer insulation (MLI) used instead of thick solid insulation?",
      options: [
        { text: "Solid insulation is too heavy", correct: false },
        { text: "Multiple thin layers with gaps block all three heat transfer modes", correct: true },
        { text: "Space requires reflective surfaces only", correct: false },
        { text: "Solid materials crack in vacuum", correct: false }
      ],
      explanation: "MLI uses multiple reflective layers separated by low-conductivity spacers. This blocks radiation (reflection), conduction (low-k spacers), and would block convection if any gas were present. It's incredibly effective for weight."
    },
    {
      scenario: "You're designing a frying pan and choosing between solid aluminum and aluminum with a copper core bottom.",
      question: "Why add a copper core to an aluminum pan?",
      options: [
        { text: "Copper is cheaper than aluminum", correct: false },
        { text: "Copper spreads heat more evenly across the bottom", correct: true },
        { text: "Copper prevents food from sticking", correct: false },
        { text: "Copper looks more professional", correct: false }
      ],
      explanation: "Copper's thermal conductivity (385 W/m·K) is much higher than aluminum's (205 W/m·K). A copper core spreads heat laterally faster, eliminating hot spots directly over the burner and cooking food more evenly."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🖥️",
      title: "CPU Cooling Systems",
      short: "Heat Sinks",
      tagline: "Keeping computers cool through smart thermal engineering",
      description: "Computer processors generate intense heat that must be removed to prevent damage. Heat sinks use thermal conduction to draw heat away from the CPU.",
      connection: "Just like heat flows through a metal bar, heat sinks use high-conductivity materials (copper/aluminum) to spread processor heat over a larger surface area.",
      howItWorks: "Thermal paste fills microscopic gaps between CPU and heat sink. Heat conducts through the paste into copper heat pipes, then spreads to aluminum fins where fans blow it away.",
      stats: [
        { value: "100W+", label: "CPU heat output" },
        { value: "385", label: "Copper k (W/m·K)" },
        { value: "50°C", label: "Target temp drop" }
      ],
      examples: [
        "Tower CPU coolers with copper heat pipes",
        "Laptop vapor chamber cooling",
        "Server liquid cooling loops",
        "GPU thermal pad solutions"
      ],
      companies: ["Noctua", "Corsair", "NZXT", "Cooler Master"],
      futureImpact: "As chips get more powerful, advanced materials like graphene (k=5000) and vapor chambers will become essential for thermal management.",
      color: "from-cyan-600 to-blue-600"
    },
    {
      icon: "🏠",
      title: "Building Insulation",
      short: "Home Efficiency",
      tagline: "Trapping heat where you want it",
      description: "Proper insulation dramatically reduces heating and cooling costs by slowing thermal conduction through walls, ceilings, and floors.",
      connection: "Low thermal conductivity materials (like fiberglass, foam, cellulose) slow heat flow, keeping indoor temperatures stable regardless of outdoor conditions.",
      howItWorks: "Insulation works by trapping air in small pockets. Air has very low thermal conductivity (0.025 W/m·K), so more trapped air = better insulation. R-value measures thermal resistance.",
      stats: [
        { value: "40%", label: "Energy loss without insulation" },
        { value: "R-60", label: "Recommended attic R-value" },
        { value: "$1000+", label: "Annual savings possible" }
      ],
      examples: [
        "Fiberglass batt insulation (R-3.7/inch)",
        "Spray foam insulation (R-6.5/inch)",
        "Blown cellulose insulation",
        "Vacuum insulated panels (R-25+/inch)"
      ],
      companies: ["Owens Corning", "Johns Manville", "BASF", "Dow"],
      futureImpact: "Aerogel-based insulation and phase-change materials promise ultra-thin, high-performance thermal barriers for net-zero buildings.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: "🍳",
      title: "Cookware Engineering",
      short: "Kitchen Science",
      tagline: "The science of even heating",
      description: "Professional cookware is engineered for optimal heat distribution, using layers of different metals to combine the best thermal properties.",
      connection: "Different metals conduct heat at different rates. Combining copper (fast spreading) with stainless steel (durable surface) creates superior cooking performance.",
      howItWorks: "Multi-clad pans sandwich copper or aluminum cores between stainless steel. The core spreads heat laterally while stainless provides a non-reactive cooking surface.",
      stats: [
        { value: "5-7", label: "Layers in pro cookware" },
        { value: "2-3mm", label: "Copper core thickness" },
        { value: "±5°C", label: "Temperature evenness" }
      ],
      examples: [
        "All-Clad 5-ply stainless cookware",
        "Copper-core frying pans",
        "Cast iron for heat retention",
        "Carbon steel for quick response"
      ],
      companies: ["All-Clad", "Mauviel", "Le Creuset", "Demeyere"],
      futureImpact: "Graphene-enhanced cookware could provide instant, perfectly even heating with minimal energy, revolutionizing home cooking.",
      color: "from-amber-600 to-yellow-600"
    },
    {
      icon: "🚀",
      title: "Spacecraft Thermal Control",
      short: "Space Insulation",
      tagline: "Surviving temperature extremes in the void",
      description: "Spacecraft face extreme temperature swings (+250°F in sun to -250°F in shadow) and must carefully manage heat through conduction, radiation, and insulation.",
      connection: "Multi-layer insulation (MLI) uses the principle that conduction requires contact - separating thin reflective layers with low-conductivity spacers minimizes heat transfer.",
      howItWorks: "MLI blankets have 10-30 layers of aluminized Mylar separated by netting. Each layer blocks radiation while the gaps minimize conduction. Heat pipes move heat to radiators.",
      stats: [
        { value: "500°C", label: "Temperature swing in space" },
        { value: "10-30", label: "MLI layers typical" },
        { value: "0.001", label: "Effective k (W/m·K)" }
      ],
      examples: [
        "James Webb Space Telescope sunshield",
        "ISS thermal blankets",
        "Mars rover heat rejection system",
        "Satellite thermal louvers"
      ],
      companies: ["NASA", "SpaceX", "Northrop Grumman", "Lockheed Martin"],
      futureImpact: "Advanced thermal protection systems using aerogels and variable-conductivity materials will enable missions to extreme environments like Venus surface or solar proximity.",
      color: "from-purple-600 to-indigo-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const getTemperatureColor = (temp: number) => {
    const ratio = (temp - coldSideTemp) / (hotSideTemp - coldSideTemp);
    const r = Math.round(255 * ratio);
    const b = Math.round(255 * (1 - ratio));
    return `rgb(${r}, ${Math.round(100 * (1 - Math.abs(ratio - 0.5) * 2))}, ${b})`;
  };

  // Render helper functions (not components)
  const renderHeatBar = () => (
    <svg width={isMobile ? 320 : 500} height={isMobile ? 180 : 200} className="mx-auto">
      <defs>
        <linearGradient id="hotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="100%" stopColor="#cc0000" />
        </linearGradient>
        <linearGradient id="coldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#74b9ff" />
          <stop offset="100%" stopColor="#0066cc" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Hot side */}
      <rect x={isMobile ? 10 : 20} y="40" width={isMobile ? 40 : 60} height="100" rx="8" fill="url(#hotGrad)" filter="url(#glow)" />
      <text x={isMobile ? 30 : 50} y="30" textAnchor="middle" fill="#ff6b6b" fontSize="14" fontWeight="bold">{hotSideTemp}°C</text>
      <text x={isMobile ? 30 : 50} y="160" textAnchor="middle" fill="#ff6b6b" fontSize="10">HOT</text>

      {/* Heat source flames */}
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${(isMobile ? 20 : 35) + i * 15}, 145)`}>
          <path d="M0,0 Q-5,-10 0,-20 Q5,-10 0,0" fill="#ff9500" opacity={0.8}>
            <animate attributeName="d" values="M0,0 Q-5,-10 0,-20 Q5,-10 0,0;M0,0 Q-3,-15 0,-25 Q3,-15 0,0;M0,0 Q-5,-10 0,-20 Q5,-10 0,0" dur="0.5s" repeatCount="indefinite" />
          </path>
        </g>
      ))}

      {/* Conducting bar with temperature gradient */}
      {barTemperatures.map((temp, i) => (
        <rect
          key={i}
          x={(isMobile ? 55 : 90) + i * (isMobile ? 22 : 32)}
          y="50"
          width={isMobile ? 20 : 30}
          height="80"
          fill={getTemperatureColor(temp)}
          stroke={materials[selectedMaterial].color}
          strokeWidth="2"
        />
      ))}

      {/* Temperature labels on bar */}
      {[0, 4, 9].map(i => (
        <text
          key={i}
          x={(isMobile ? 65 : 105) + i * (isMobile ? 22 : 32)}
          y="145"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
        >
          {Math.round(barTemperatures[i])}°
        </text>
      ))}

      {/* Cold side */}
      <rect x={isMobile ? 275 : 420} y="40" width={isMobile ? 40 : 60} height="100" rx="8" fill="url(#coldGrad)" />
      <text x={isMobile ? 295 : 450} y="30" textAnchor="middle" fill="#74b9ff" fontSize="14" fontWeight="bold">{coldSideTemp}°C</text>
      <text x={isMobile ? 295 : 450} y="160" textAnchor="middle" fill="#74b9ff" fontSize="10">COLD</text>

      {/* Ice cubes */}
      {[0, 1].map(i => (
        <rect key={i} x={(isMobile ? 280 : 430) + i * 15} y={145 + i * 10} width="12" height="12" rx="2" fill="#e0f7ff" stroke="#74b9ff" strokeWidth="1" />
      ))}

      {/* Heat flow arrows */}
      {isSimulating && (
        <g>
          {[0, 1, 2, 3].map(i => (
            <g key={i}>
              <circle cx={(isMobile ? 80 : 120) + i * 50 + ((simulationTime * 30) % 50)} cy="90" r="4" fill="#ff6b6b" opacity={0.7}>
                <animate attributeName="r" values="3;5;3" dur="0.5s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}
          <text x={isMobile ? 160 : 255} y="180" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">
            Q = {heatFlowRate.toFixed(1)} W/m² →
          </text>
        </g>
      )}

      {/* Material label */}
      <text x={isMobile ? 160 : 255} y="25" textAnchor="middle" fill={materials[selectedMaterial].color} fontSize="14" fontWeight="bold">
        {materials[selectedMaterial].emoji} {materials[selectedMaterial].name} Bar (k = {materials[selectedMaterial].k} W/m·K)
      </text>
    </svg>
  );

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>Why Does Metal Feel Colder?</h1>
      <div className="bg-slate-800/50 rounded-2xl p-6 md:p-8 max-w-2xl">
        <svg width={isMobile ? 280 : 350} height={isMobile ? 180 : 200} className="mx-auto mb-6">
          <defs>
            <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a16207" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
          </defs>

          {/* Hand */}
          <ellipse cx={isMobile ? 140 : 175} cy="40" rx="35" ry="25" fill="#fcd9b6" />
          <text x={isMobile ? 140 : 175} y="45" textAnchor="middle" fill="#1e293b" fontSize="12">37°C</text>

          {/* Metal railing */}
          <rect x={isMobile ? 30 : 40} y="90" width={isMobile ? 100 : 120} height="25" rx="5" fill="url(#metalGrad)" />
          <text x={isMobile ? 80 : 100} y="135" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Metal Railing</text>
          <text x={isMobile ? 80 : 100} y="150" textAnchor="middle" fill="#64748b" fontSize="10">22°C</text>

          {/* Wood railing */}
          <rect x={isMobile ? 150 : 190} y="90" width={isMobile ? 100 : 120} height="25" rx="5" fill="url(#woodGrad)" />
          {/* Wood grain lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1={(isMobile ? 155 : 195) + i * 22} y1="92" x2={(isMobile ? 155 : 195) + i * 22} y2="113" stroke="#92400e" strokeWidth="1" opacity="0.5" />
          ))}
          <text x={isMobile ? 200 : 250} y="135" textAnchor="middle" fill="#ca8a04" fontSize="12" fontWeight="bold">Wood Railing</text>
          <text x={isMobile ? 200 : 250} y="150" textAnchor="middle" fill="#a16207" fontSize="10">22°C</text>

          {/* Heat flow arrows */}
          <g>
            <path d="M80,75 L80,85" stroke="#ff6b6b" strokeWidth="3" markerEnd="url(#arrowRed)" />
            <path d="M85,75 L85,85" stroke="#ff6b6b" strokeWidth="3" markerEnd="url(#arrowRed)" />
            <path d="M90,75 L90,85" stroke="#ff6b6b" strokeWidth="3" markerEnd="url(#arrowRed)" />
            <text x={isMobile ? 80 : 100} y="70" textAnchor="middle" fill="#ff6b6b" fontSize="9">Fast heat loss!</text>
          </g>
          <g>
            <path d="M235,75 L235,85" stroke="#ff6b6b" strokeWidth="1" markerEnd="url(#arrowRedSmall)" />
            <text x={isMobile ? 200 : 250} y="70" textAnchor="middle" fill="#22c55e" fontSize="9">Slow heat loss</text>
          </g>

          <defs>
            <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#ff6b6b" />
            </marker>
            <marker id="arrowRedSmall" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill="#ff6b6b" />
            </marker>
          </defs>

          {/* Perception bubbles */}
          <ellipse cx={isMobile ? 80 : 100} cy="175" rx="35" ry="15" fill="#3b82f6" opacity="0.3" />
          <text x={isMobile ? 80 : 100} y="179" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">"COLD!"</text>

          <ellipse cx={isMobile ? 200 : 250} cy="175" rx="30" ry="15" fill="#22c55e" opacity="0.3" />
          <text x={isMobile ? 200 : 250} y="179" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">"Neutral"</text>
        </svg>

        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-slate-300 mb-4`}>
          On a cold morning, a metal railing feels freezing while a wooden one feels fine - yet both are the same temperature!
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          The secret lies in thermal conduction - how fast heat flows through materials.
        </p>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white text-lg font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300 shadow-lg hover:shadow-orange-500/30"
      >
        Explore Thermal Conduction →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You have four identical bars made of different materials (copper, steel, glass, wood). One end of each bar is placed in boiling water (100°C).
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Which bar's opposite end will get hot fastest?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Wood - organic materials conduct heat well' },
          { id: 'B', text: 'Glass - transparent materials let heat through' },
          { id: 'C', text: 'Copper - metals are excellent heat conductors' },
          { id: 'D', text: 'Steel - it\'s the strongest, so it conducts best' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
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
            ✓ Correct! Copper has a thermal conductivity of <span className="text-cyan-400">385 W/m·K</span> - over 2,500 times better than wood!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
          >
            Explore the Lab →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Thermal Conduction Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4 w-full max-w-2xl">
        {renderHeatBar()}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(materials) as Array<keyof typeof materials>).map(mat => (
            <button
              key={mat}
              onMouseDown={(e) => {
                e.preventDefault();
                setSelectedMaterial(mat);
                resetSimulation();
                onGameEvent?.({ type: 'material_changed', data: { material: mat } });
              }}
              className={`p-2 md:p-3 rounded-lg text-sm font-medium transition-all ${
                selectedMaterial === mat
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {materials[mat].emoji} {materials[mat].name}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{heatFlowRate.toFixed(1)}</div>
            <div className="text-sm text-slate-400">Heat Flow (W/m²)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{materials[selectedMaterial].k}</div>
            <div className="text-sm text-slate-400">k (W/m·K)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{simulationTime.toFixed(1)}s</div>
            <div className="text-sm text-slate-400">Time</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); startSimulation(); }}
          className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
        >
          🔥 Start Heat Flow
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); resetSimulation(); }}
          className="px-6 py-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Fourier's Law of Heat Conduction:</h3>
        <div className="text-center mb-3">
          <span className="text-2xl font-mono text-white bg-slate-900 px-4 py-2 rounded-lg">
            Q = -kA(dT/dx)
          </span>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li><strong className="text-orange-400">Q</strong> = Heat flow rate (Watts)</li>
          <li><strong className="text-cyan-400">k</strong> = Thermal conductivity (higher = faster heat transfer)</li>
          <li><strong className="text-purple-400">A</strong> = Cross-sectional area</li>
          <li><strong className="text-emerald-400">dT/dx</strong> = Temperature gradient (temperature difference over distance)</li>
        </ul>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Thermal Conduction</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">🔥 What Is Thermal Conduction?</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Heat energy transfers through direct molecular contact</li>
            <li>• Vibrating hot molecules bump into cooler neighbors</li>
            <li>• Energy flows from hot to cold (always!)</li>
            <li>• In metals, free electrons also carry heat</li>
            <li>• This is why metals conduct heat so well!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">📊 Thermal Conductivity (k)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <span className="text-orange-400">Copper: 385</span> W/m·K - excellent conductor</li>
            <li>• <span className="text-slate-400">Steel: 50</span> W/m·K - good conductor</li>
            <li>• <span className="text-cyan-400">Glass: 1.0</span> W/m·K - poor conductor</li>
            <li>• <span className="text-amber-600">Wood: 0.15</span> W/m·K - insulator</li>
            <li>• <span className="text-slate-500">Air: 0.025</span> W/m·K - great insulator!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🤚 Why Metal Feels Cold</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p>When you touch metal and wood at room temperature (22°C), both are cooler than your hand (37°C).</p>
            <p><strong className="text-orange-400">Metal</strong>: High k = heat leaves your hand FAST → nerve sensors detect rapid cooling → brain says "COLD!"</p>
            <p><strong className="text-amber-600">Wood</strong>: Low k = heat leaves slowly → hand stays warm → feels "neutral"</p>
            <p className="text-cyan-400 mt-3 font-medium">
              You don't feel temperature - you feel the RATE of heat transfer! This is why the same metal feels "cold" at 22°C but "hot" when it's 50°C.
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
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Igloo Paradox</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg width={isMobile ? 280 : 350} height={isMobile ? 140 : 160} className="mx-auto mb-4">
          {/* Night sky */}
          <rect x="0" y="0" width={isMobile ? 280 : 350} height={isMobile ? 100 : 120} fill="#0f172a" rx="10" />
          {/* Stars */}
          {[...Array(15)].map((_, i) => (
            <circle key={i} cx={20 + (i * 23) % 300} cy={10 + (i * 17) % 80} r="1.5" fill="white" opacity={0.6 + (i % 3) * 0.2} />
          ))}
          {/* Snow ground */}
          <rect x="0" y={isMobile ? 100 : 120} width={isMobile ? 280 : 350} height={isMobile ? 40 : 40} fill="#e2e8f0" rx="0" />
          {/* Igloo */}
          <ellipse cx={isMobile ? 140 : 175} cy={isMobile ? 100 : 120} rx={isMobile ? 60 : 80} ry={isMobile ? 45 : 55} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          {/* Entrance */}
          <ellipse cx={isMobile ? 200 : 255} cy={isMobile ? 105 : 125} rx={isMobile ? 15 : 20} ry={isMobile ? 12 : 15} fill="#1e293b" />
          {/* Person inside */}
          <circle cx={isMobile ? 130 : 160} cy={isMobile ? 90 : 105} r="10" fill="#fcd9b6" />
          <ellipse cx={isMobile ? 130 : 160} cy={isMobile ? 100 : 118} rx="8" ry="12" fill="#dc2626" />
          {/* Temperature labels */}
          <text x={isMobile ? 30 : 40} y="50" fill="#60a5fa" fontSize="14" fontWeight="bold">-40°C</text>
          <text x={isMobile ? 130 : 160} y={isMobile ? 75 : 85} textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">~15°C</text>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          Arctic peoples build shelters from snow and ice - materials that are literally frozen water at -40°C outside.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          How can an igloo made of ice keep people WARM inside?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Ice reflects body heat back like a mirror' },
          { id: 'B', text: 'Snow/ice traps air pockets which are excellent insulators' },
          { id: 'C', text: 'The ice generates heat through a chemical reaction' },
          { id: 'D', text: 'Body heat melts the inside, creating a water barrier' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
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
            ✓ Snow contains up to 95% trapped air - and air is one of the best insulators!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            The thermal conductivity of snow (~0.05-0.25 W/m·K) is much lower than solid ice (2.2 W/m·K) because of all those tiny air pockets.
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
      <h2 className="text-2xl font-bold text-purple-400 mb-4">The Power of Trapped Air</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Solid Ice vs Snow</h3>
          <svg width="100%" height="150" viewBox="0 0 280 150" className="mx-auto">
            {/* Solid ice block */}
            <rect x="20" y="30" width="100" height="80" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="2" rx="4" />
            <text x="70" y="75" textAnchor="middle" fill="#1e40af" fontSize="10" fontWeight="bold">SOLID ICE</text>
            <text x="70" y="90" textAnchor="middle" fill="#3b82f6" fontSize="9">k = 2.2 W/m·K</text>
            <text x="70" y="125" textAnchor="middle" fill="#ef4444" fontSize="10">❄️ Poor insulator</text>

            {/* Snow block with air pockets */}
            <rect x="160" y="30" width="100" height="80" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" rx="4" />
            {/* Air pockets */}
            {[...Array(12)].map((_, i) => (
              <circle key={i} cx={175 + (i % 4) * 25} cy={45 + Math.floor(i / 4) * 22} r="6" fill="#dbeafe" opacity="0.7" />
            ))}
            <text x="210" y="75" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold">SNOW</text>
            <text x="210" y="90" textAnchor="middle" fill="#64748b" fontSize="9">k = 0.05-0.25</text>
            <text x="210" y="125" textAnchor="middle" fill="#22c55e" fontSize="10">✓ Great insulator!</text>
          </svg>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Why Air Insulates</h3>
          <svg width="100%" height="150" viewBox="0 0 280 150" className="mx-auto">
            {/* Air molecules spread out */}
            {[...Array(8)].map((_, i) => (
              <g key={i}>
                <circle cx={40 + (i % 4) * 60} cy={40 + Math.floor(i / 4) * 50} r="8" fill="#93c5fd" opacity="0.5" />
                <circle cx={40 + (i % 4) * 60} cy={40 + Math.floor(i / 4) * 50} r="4" fill="#3b82f6" />
              </g>
            ))}
            {/* Vibration arrows */}
            <path d="M50,40 Q55,35 60,40 Q65,45 70,40" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2" />
            <text x="140" y="130" textAnchor="middle" fill="#94a3b8" fontSize="10">Air molecules far apart = slow energy transfer</text>
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">More Trapped Air Examples:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong className="text-orange-400">Down jackets:</strong> Goose feathers trap air (k ≈ 0.03)</li>
          <li>• <strong className="text-cyan-400">Double-pane windows:</strong> Air gap between glass sheets</li>
          <li>• <strong className="text-emerald-400">Styrofoam:</strong> 95%+ trapped air bubbles (k ≈ 0.03)</li>
          <li>• <strong className="text-pink-400">Fiberglass insulation:</strong> Air trapped between glass fibers</li>
          <li>• <strong className="text-amber-400">Aerogel:</strong> 99.8% air - the ultimate insulator! (k ≈ 0.015)</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          The best insulators aren't special materials - they're ways to trap still air!
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
        <h3 className="text-xl font-bold text-purple-400 mb-4">Insulation = Trapped Still Air</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The best thermal insulators work by trapping tiny pockets of air:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🏔️</div>
              <div className="font-bold text-white">Snow & Ice</div>
              <div className="text-slate-400">95% trapped air</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🧥</div>
              <div className="font-bold text-white">Down Feathers</div>
              <div className="text-slate-400">Lofted air pockets</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🏠</div>
              <div className="font-bold text-white">Fiberglass</div>
              <div className="text-slate-400">Air between fibers</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl mb-2">🔬</div>
              <div className="font-bold text-white">Aerogel</div>
              <div className="text-slate-400">99.8% air!</div>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            Air's thermal conductivity (0.025 W/m·K) is lower than almost any solid material. The trick is keeping the air STILL so it can't transfer heat by convection!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
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
            className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
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
                : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500'
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
                ? 'Excellent! You\'ve mastered thermal conduction!'
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
              className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🔥</div>
        <h1 className="text-3xl font-bold text-white mb-4">Thermal Conduction Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of heat transfer through materials!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌡️</div>
            <p className="text-sm text-slate-300">Fourier's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Thermal Conductivity</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🏔️</div>
            <p className="text-sm text-slate-300">Insulation Science</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🖥️</div>
            <p className="text-sm text-slate-300">Heat Management</p>
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
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Thermal Conduction</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
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
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
};

export default ThermalConductionRenderer;
