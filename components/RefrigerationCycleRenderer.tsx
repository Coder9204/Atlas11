import React, { useState, useEffect, useCallback, useRef } from 'react';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'twist_prediction_made'
  | 'twist_correct'
  | 'twist_incorrect'
  | 'test_answer'
  | 'test_complete'
  | 'app_explored'
  | 'mastery_achieved'
  | 'animation_started'
  | 'animation_complete'
  | 'sound_played'
  | 'navigation'
  | 'compressor_adjusted'
  | 'temperature_changed'
  | 'pressure_changed'
  | 'refrigerant_changed'
  | 'cop_calculated'
  | 'cycle_stage_viewed';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

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

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const RefrigerationCycleRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase,
  onPhaseComplete
}) => {
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

  // Refrigeration cycle simulation states
  const [compressorPower, setCompressorPower] = useState(1.0); // kW
  const [evaporatorTemp, setEvaporatorTemp] = useState(-10); // Celsius
  const [condenserTemp, setCondenserTemp] = useState(35); // Celsius
  const [cyclePhase, setCyclePhase] = useState(0); // 0-3 for the four stages
  const [isRunning, setIsRunning] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  const navigationLockRef = useRef(false);
  const lastNavigationRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Calculate COP (Coefficient of Performance)
  const calculateCOP = useCallback(() => {
    const Tc = evaporatorTemp + 273.15; // Convert to Kelvin
    const Th = condenserTemp + 273.15;
    // Carnot COP = Tc / (Th - Tc)
    const carnotCOP = Tc / (Th - Tc);
    // Real systems achieve about 30-50% of Carnot
    const realCOP = carnotCOP * 0.4;
    return Math.max(1, realCOP);
  }, [evaporatorTemp, condenserTemp]);

  // Calculate cooling capacity
  const calculateCoolingCapacity = useCallback(() => {
    const cop = calculateCOP();
    return (compressorPower * cop).toFixed(2);
  }, [compressorPower, calculateCOP]);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playSound = useCallback((soundType: 'success' | 'failure' | 'transition' | 'complete' | 'compressor' | 'cooling') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (soundType) {
      case 'success':
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'failure':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'transition':
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;
      case 'complete':
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;
      case 'compressor':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(80, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'cooling':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
    }

    onGameEvent?.({ type: 'sound_played', data: { soundType } });
  }, [onGameEvent]);

  // Fix: Add the missing method to GainNode
  useEffect(() => {
    if (typeof GainNode !== 'undefined' && !GainNode.prototype.exponentialDecayTo) {
      GainNode.prototype.exponentialDecayTo = function(value: number, endTime: number) {
        this.gain.exponentialRampToValueAtTime(Math.max(0.0001, value), endTime);
      };
    }
  }, []);

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

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [playSound, onGameEvent, onPhaseComplete]);

  // Refrigeration cycle animation
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          setCyclePhase(p => (p + 1) % 4);
          return 0;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);

    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'success' : 'failure');
    onGameEvent?.({
      type: isCorrect ? 'prediction_correct' : 'prediction_incorrect',
      data: { prediction }
    });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);

    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'success' : 'failure');
    onGameEvent?.({
      type: isCorrect ? 'twist_correct' : 'twist_incorrect',
      data: { prediction }
    });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });

    onGameEvent?.({ type: 'test_answer', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const testQuestions: TestQuestion[] = [
    {
      scenario: "A technician is diagnosing a refrigerator that isn't cooling properly. The compressor is running, but the evaporator coils are warm.",
      question: "What is most likely the issue?",
      options: [
        { text: "The refrigerant has completely leaked out", correct: true },
        { text: "The condenser fan is too powerful", correct: false },
        { text: "The evaporator is too clean", correct: false },
        { text: "The thermostat is set too high", correct: false }
      ],
      explanation: "Without refrigerant, there's nothing to absorb heat at the evaporator. The compressor runs but moves no heat-carrying medium."
    },
    {
      scenario: "An engineer is designing a refrigeration system for a meat processing plant that needs to maintain -30°C inside while ambient is 25°C.",
      question: "Compared to a home refrigerator (5°C inside, same ambient), how will the COP compare?",
      options: [
        { text: "Higher COP (more efficient)", correct: false },
        { text: "Same COP (temperature doesn't matter)", correct: false },
        { text: "Lower COP (less efficient)", correct: true },
        { text: "COP depends only on compressor size", correct: false }
      ],
      explanation: "COP decreases as temperature difference increases. COP = Tc/(Th-Tc). A larger temperature lift requires more work per unit of cooling."
    },
    {
      scenario: "During a summer heat wave, an air conditioner's outdoor condenser unit is in direct sunlight and the surrounding temperature reaches 50°C.",
      question: "What happens to the system's cooling capacity?",
      options: [
        { text: "Increases because the compressor works harder", correct: false },
        { text: "Stays the same if the compressor is working", correct: false },
        { text: "Decreases significantly", correct: true },
        { text: "The refrigerant type determines this", correct: false }
      ],
      explanation: "Higher condenser temperature means smaller temperature difference for heat rejection, reducing the pressure difference that drives the cycle. COP and capacity both drop."
    },
    {
      scenario: "A refrigeration technician notices that the suction line (returning to compressor) on a properly working system feels cold and has some frost.",
      question: "What does this indicate about the refrigerant state at that point?",
      options: [
        { text: "It's high-pressure liquid", correct: false },
        { text: "It's low-pressure vapor that has absorbed heat", correct: true },
        { text: "The system is overcharged", correct: false },
        { text: "The expansion valve has failed", correct: false }
      ],
      explanation: "After passing through the evaporator, refrigerant is low-pressure vapor that has absorbed heat. It's cold because it recently evaporated at low temperature."
    },
    {
      scenario: "A car's AC system uses an expansion valve to drop pressure before the evaporator.",
      question: "What happens to the refrigerant temperature as it passes through this valve?",
      options: [
        { text: "Increases due to friction", correct: false },
        { text: "Stays constant (no heat added)", correct: false },
        { text: "Drops dramatically", correct: true },
        { text: "Oscillates rapidly", correct: false }
      ],
      explanation: "The expansion valve causes rapid pressure drop. The refrigerant partially vaporizes, absorbing energy and dropping temperature dramatically (isenthalpic expansion)."
    },
    {
      scenario: "An ice rink uses a refrigeration system with brine (salt water) circulating under the ice surface.",
      question: "Why use brine instead of sending refrigerant directly under the ice?",
      options: [
        { text: "Brine is cheaper than refrigerant", correct: false },
        { text: "Brine doesn't freeze at low temperatures and safely distributes cooling over large area", correct: true },
        { text: "Refrigerant would freeze the ice too fast", correct: false },
        { text: "Brine improves COP significantly", correct: false }
      ],
      explanation: "Brine has lower freezing point and acts as secondary coolant, distributing refrigeration safely over large areas without risk of refrigerant leaks into occupied spaces."
    },
    {
      scenario: "A heat pump installer is explaining to a customer why their system's heating efficiency drops on very cold days.",
      question: "What is the fundamental reason for this efficiency drop?",
      options: [
        { text: "The outdoor unit freezes and blocks airflow", correct: false },
        { text: "There's less heat energy available in cold air", correct: false },
        { text: "The temperature lift increases, reducing COP", correct: true },
        { text: "Electric resistance heating kicks in", correct: false }
      ],
      explanation: "As outdoor temperature drops, the temperature difference between evaporator and condenser increases. COP = Tc/(Th-Tc) decreases as this lift increases."
    },
    {
      scenario: "A supermarket technician observes that the high-pressure gauge on a refrigeration system reads higher than normal.",
      question: "What could cause abnormally high head pressure?",
      options: [
        { text: "Undercharge of refrigerant", correct: false },
        { text: "Dirty condenser coils blocking heat rejection", correct: true },
        { text: "Expansion valve stuck open", correct: false },
        { text: "Evaporator fan running too fast", correct: false }
      ],
      explanation: "If condenser can't reject heat effectively (dirty coils), the refrigerant can't fully condense, causing pressure to build. This is a common maintenance issue."
    },
    {
      scenario: "An ammonia refrigeration plant uses flooded evaporators where liquid refrigerant pools in the evaporator.",
      question: "Why is this more efficient than direct expansion?",
      options: [
        { text: "Ammonia is more efficient when liquid", correct: false },
        { text: "More heat transfer surface stays wetted, maximizing evaporation", correct: true },
        { text: "It requires less refrigerant overall", correct: false },
        { text: "The compressor doesn't need to work as hard", correct: false }
      ],
      explanation: "Flooded evaporators keep more tube surface in contact with liquid refrigerant, maximizing heat transfer coefficient. This is common in large industrial systems."
    },
    {
      scenario: "A new refrigerant is being developed that has zero ozone depletion potential and very low global warming potential.",
      question: "What trade-off might engineers face with 'natural' refrigerants like CO2 or propane?",
      options: [
        { text: "They don't work in refrigeration cycles", correct: false },
        { text: "Higher operating pressures (CO2) or flammability (propane)", correct: true },
        { text: "They're too expensive to manufacture", correct: false },
        { text: "They have poor thermodynamic properties", correct: false }
      ],
      explanation: "CO2 (R-744) requires very high pressures (over 100 bar). Propane (R-290) and ammonia (R-717) are flammable/toxic. These require special system designs for safety."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🏠",
      title: "Residential Air Conditioning",
      short: "Home AC",
      tagline: "Keeping homes comfortable year-round",
      description: "Home air conditioning systems use vapor compression refrigeration to move heat from inside to outside, cooling living spaces even on the hottest days.",
      connection: "The refrigeration cycle in a home AC works exactly like we learned: compressor raises pressure, condenser rejects heat outside, expansion valve drops pressure, evaporator absorbs heat inside.",
      howItWorks: "Refrigerant circulates through copper tubing between indoor and outdoor units. The indoor evaporator coil absorbs room heat as refrigerant evaporates. The outdoor condenser coil dumps that heat as refrigerant condenses.",
      stats: [
        { value: "3-5", label: "Typical COP" },
        { value: "118M", label: "US homes with AC" },
        { value: "6%", label: "World electricity for AC" },
        { value: "2050", label: "AC units projected to triple by" }
      ],
      examples: [
        "Split-system air conditioners",
        "Central HVAC systems",
        "Ductless mini-splits",
        "Window units"
      ],
      companies: ["Carrier", "Trane", "Daikin", "Lennox", "Mitsubishi Electric"],
      futureImpact: "Variable-speed compressors and smart controls are making AC 40% more efficient. New refrigerants with near-zero GWP are replacing R-410A.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "❄️",
      title: "Industrial Cold Storage",
      short: "Cold Storage",
      tagline: "Preserving food for global distribution",
      description: "Cold storage warehouses use large-scale refrigeration to maintain temperatures from -25°C to +5°C, enabling global food supply chains.",
      connection: "Industrial systems use the same four-stage cycle but with larger components, multi-stage compression for low temperatures, and often ammonia refrigerant for efficiency.",
      howItWorks: "Large compressor banks circulate refrigerant through extensive evaporator coils in insulated rooms. Cascade systems achieve very low temperatures by stacking two refrigeration cycles.",
      stats: [
        { value: "-40°C", label: "Deep freeze capability" },
        { value: "180B", label: "Cold chain market (USD)" },
        { value: "40%", label: "Food waste without cold chain" },
        { value: "1.5B", label: "Tons food stored annually" }
      ],
      examples: [
        "Frozen food warehouses",
        "Pharmaceutical cold rooms",
        "Blood bank storage",
        "Ice cream manufacturing"
      ],
      companies: ["Americold", "Lineage Logistics", "Thermo King", "Bitzer", "GEA"],
      futureImpact: "AI-optimized defrost cycles and thermal energy storage are cutting energy use 30%. CO2 transcritical systems are replacing synthetic refrigerants.",
      color: "from-cyan-600 to-blue-700"
    },
    {
      icon: "🚗",
      title: "Automotive Climate Control",
      short: "Car AC",
      tagline: "Comfort on the road",
      description: "Vehicle air conditioning uses engine power or battery energy to run a compact refrigeration cycle, maintaining cabin comfort in any weather.",
      connection: "Car AC uses a belt-driven (or electric) compressor, condenser in front of the radiator, expansion device, and evaporator in the dashboard.",
      howItWorks: "The compressor engages via electromagnetic clutch when cooling is needed. The condenser uses ram air from vehicle motion. Cabin air passes over the cold evaporator coils.",
      stats: [
        { value: "99%", label: "New US cars with AC" },
        { value: "10-15%", label: "Fuel penalty when running" },
        { value: "R-1234yf", label: "New low-GWP refrigerant" },
        { value: "3-5kW", label: "Typical cooling capacity" }
      ],
      examples: [
        "Passenger car AC systems",
        "Electric vehicle heat pumps",
        "Truck sleeper cab units",
        "Bus climate control"
      ],
      companies: ["Denso", "Valeo", "Mahle", "Hanon Systems", "Sanden"],
      futureImpact: "Electric vehicles use heat pumps for both heating and cooling, improving winter range by 30%. Automatic climate zones reduce energy waste.",
      color: "from-green-600 to-teal-600"
    },
    {
      icon: "🔥",
      title: "Heat Pumps for Heating",
      short: "Heat Pumps",
      tagline: "Reversing the cycle to warm buildings",
      description: "Heat pumps run the refrigeration cycle in reverse, extracting heat from cold outdoor air (or ground) to warm buildings with 300-500% efficiency.",
      connection: "A heat pump is a refrigeration cycle with a reversing valve. In heating mode, the outdoor coil becomes the evaporator and indoor coil becomes condenser.",
      howItWorks: "Even at -15°C, outdoor air contains heat energy. The heat pump extracts this using a very cold evaporator, compresses it to high temperature, and releases it indoors.",
      stats: [
        { value: "300-500%", label: "Heating efficiency" },
        { value: "75%", label: "EU heat pump growth 2022" },
        { value: "-25°C", label: "Modern cold-climate operation" },
        { value: "50%", label: "CO2 reduction vs gas furnace" }
      ],
      examples: [
        "Air-source heat pumps",
        "Ground-source (geothermal) systems",
        "Water-source heat pumps",
        "Hybrid heat pump systems"
      ],
      companies: ["Mitsubishi", "Daikin", "Bosch", "Vaillant", "Nibe"],
      futureImpact: "Heat pumps are key to decarbonizing heating. New systems work efficiently at -30°C. Integrated hot water heating adds further efficiency.",
      color: "from-orange-600 to-red-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const getCycleStageInfo = (stage: number) => {
    const stages = [
      { name: "Compression", icon: "⬆️", description: "Low-pressure vapor → High-pressure, hot vapor", color: "#ef4444" },
      { name: "Condensation", icon: "💧", description: "Hot vapor → High-pressure liquid (heat out)", color: "#f97316" },
      { name: "Expansion", icon: "⬇️", description: "High-pressure liquid → Low-pressure, cold mix", color: "#3b82f6" },
      { name: "Evaporation", icon: "❄️", description: "Cold liquid → Low-pressure vapor (heat in)", color: "#06b6d4" }
    ];
    return stages[stage];
  };

  const renderCycleVisualization = (size: number = 300, showLabels: boolean = true) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    const stageInfo = getCycleStageInfo(cyclePhase);

    return (
      <svg width={size} height={size} className="mx-auto">
        <defs>
          <linearGradient id="pipeGradientHot" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="pipeGradientCold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glowHot">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glowCold">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size} fill="#0f172a" rx="15" />

        {/* Cycle path - rectangular with rounded corners */}
        <rect
          x={centerX - radius}
          y={centerY - radius * 0.8}
          width={radius * 2}
          height={radius * 1.6}
          rx="20"
          fill="none"
          stroke="#334155"
          strokeWidth="20"
        />

        {/* Hot side (top) */}
        <line
          x1={centerX - radius + 20}
          y1={centerY - radius * 0.8}
          x2={centerX + radius - 20}
          y2={centerY - radius * 0.8}
          stroke="url(#pipeGradientHot)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Cold side (bottom) */}
        <line
          x1={centerX - radius + 20}
          y1={centerY + radius * 0.8}
          x2={centerX + radius - 20}
          y2={centerY + radius * 0.8}
          stroke="url(#pipeGradientCold)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Components */}
        {/* Compressor (left) */}
        <g transform={`translate(${centerX - radius - 10}, ${centerY})`}
           filter={cyclePhase === 0 ? "url(#glowHot)" : undefined}>
          <rect x="-25" y="-30" width="50" height="60" rx="8"
                fill={cyclePhase === 0 ? "#ef4444" : "#64748b"} />
          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="20">⚡</text>
          {showLabels && (
            <text x="0" y="50" textAnchor="middle" fill="#94a3b8" fontSize="10">Compressor</text>
          )}
        </g>

        {/* Condenser (top) */}
        <g transform={`translate(${centerX}, ${centerY - radius * 0.8 - 20})`}
           filter={cyclePhase === 1 ? "url(#glowHot)" : undefined}>
          <rect x="-40" y="-20" width="80" height="40" rx="5"
                fill={cyclePhase === 1 ? "#f97316" : "#64748b"} />
          <text x="0" y="8" textAnchor="middle" fill="white" fontSize="16">🌡️ OUT</text>
          {showLabels && (
            <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="10">Condenser</text>
          )}
        </g>

        {/* Expansion Valve (right) */}
        <g transform={`translate(${centerX + radius + 10}, ${centerY})`}
           filter={cyclePhase === 2 ? "url(#glowCold)" : undefined}>
          <polygon points="0,-20 20,0 0,20 -20,0"
                   fill={cyclePhase === 2 ? "#3b82f6" : "#64748b"} />
          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="14">📉</text>
          {showLabels && (
            <text x="0" y="40" textAnchor="middle" fill="#94a3b8" fontSize="10">Expansion</text>
          )}
        </g>

        {/* Evaporator (bottom) */}
        <g transform={`translate(${centerX}, ${centerY + radius * 0.8 + 20})`}
           filter={cyclePhase === 3 ? "url(#glowCold)" : undefined}>
          <rect x="-40" y="-20" width="80" height="40" rx="5"
                fill={cyclePhase === 3 ? "#06b6d4" : "#64748b"} />
          <text x="0" y="8" textAnchor="middle" fill="white" fontSize="16">❄️ IN</text>
          {showLabels && (
            <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="10">Evaporator</text>
          )}
        </g>

        {/* Flow indicator (animated refrigerant) */}
        {isRunning && (
          <>
            <circle r="6" fill="#22c55e">
              <animateMotion dur="4s" repeatCount="indefinite">
                <mpath href="#cyclePath" />
              </animateMotion>
            </circle>
            <path id="cyclePath"
                  d={`M${centerX - radius},${centerY}
                      L${centerX - radius},${centerY - radius * 0.8}
                      L${centerX + radius},${centerY - radius * 0.8}
                      L${centerX + radius},${centerY}
                      L${centerX + radius},${centerY + radius * 0.8}
                      L${centerX - radius},${centerY + radius * 0.8}
                      L${centerX - radius},${centerY}`}
                  fill="none" stroke="none" />
          </>
        )}

        {/* Current stage indicator */}
        <rect x="10" y={size - 50} width={size - 20} height="40" rx="8" fill="#1e293b" />
        <text x={size / 2} y={size - 25} textAnchor="middle" fill={stageInfo.color} fontSize="14" fontWeight="bold">
          {stageInfo.icon} {stageInfo.name}: {stageInfo.description}
        </text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Refrigeration Cycle
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how heat flows against nature
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          {renderCycleVisualization(isMobile ? 280 : 320, true)}
          <p className="text-xl text-white/90 font-medium leading-relaxed mt-6 mb-4">
            How does a refrigerator move heat from cold inside to warm outside?
          </p>
          <p className="text-lg text-cyan-400 font-semibold">
            Heat naturally flows from hot to cold. How do we reverse this?
          </p>
          <div className="flex gap-4 mt-6 justify-center">
            <button
              onMouseDown={(e) => { e.preventDefault(); setIsRunning(!isRunning); playSound('compressor'); }}
              className={`px-6 py-3 ${isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'} text-white font-semibold rounded-xl transition-colors`}
            >
              {isRunning ? 'Stop Cycle' : 'Run Cycle'}
            </button>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400">✦</span>
          10 Phases
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A refrigerator maintains 4°C inside while the room is 25°C. What makes heat flow "uphill" against nature?
        </p>
        <div className="flex justify-center gap-8 my-4">
          <div className="text-center">
            <div className="text-4xl mb-2">❄️</div>
            <div className="text-cyan-400 font-bold">4°C</div>
            <div className="text-slate-400 text-sm">Inside</div>
          </div>
          <div className="text-3xl text-slate-500">→ ? →</div>
          <div className="text-center">
            <div className="text-4xl mb-2">🌡️</div>
            <div className="text-orange-400 font-bold">25°C</div>
            <div className="text-slate-400 text-sm">Room</div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'A fan blows cold air from one place to another' },
          { id: 'B', text: 'Ice cubes are constantly being made and moved' },
          { id: 'C', text: 'A fluid changes phase (evaporates/condenses) to absorb and release heat' },
          { id: 'D', text: 'Electricity directly converts to coldness' }
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
            Correct! Refrigerants <span className="text-cyan-400">evaporate at low temperature</span> (absorbing heat) and <span className="text-orange-400">condense at high temperature</span> (releasing heat)!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
          >
            Explore the Cycle →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Refrigeration Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderCycleVisualization(isMobile ? 280 : 350, true)}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">{calculateCOP().toFixed(2)}</div>
            <div className="text-sm text-slate-400">COP</div>
          </div>
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-400">{evaporatorTemp}°C</div>
            <div className="text-sm text-slate-400">Evaporator</div>
          </div>
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-400">{condenserTemp}°C</div>
            <div className="text-sm text-slate-400">Condenser</div>
          </div>
          <div className="text-center bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-400">{calculateCoolingCapacity()} kW</div>
            <div className="text-sm text-slate-400">Cooling</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Evaporator Temp: {evaporatorTemp}°C</label>
          <input
            type="range"
            min="-30"
            max="10"
            value={evaporatorTemp}
            onChange={(e) => {
              setEvaporatorTemp(parseInt(e.target.value));
              onGameEvent?.({ type: 'temperature_changed', data: { evaporatorTemp: parseInt(e.target.value) } });
            }}
            className="w-full accent-cyan-500"
          />
        </div>
        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Condenser Temp: {condenserTemp}°C</label>
          <input
            type="range"
            min="20"
            max="60"
            value={condenserTemp}
            onChange={(e) => {
              setCondenserTemp(parseInt(e.target.value));
              onGameEvent?.({ type: 'temperature_changed', data: { condenserTemp: parseInt(e.target.value) } });
            }}
            className="w-full accent-orange-500"
          />
        </div>
        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Compressor Power: {compressorPower.toFixed(1)} kW</label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={compressorPower}
            onChange={(e) => {
              setCompressorPower(parseFloat(e.target.value));
              onGameEvent?.({ type: 'compressor_adjusted', data: { power: parseFloat(e.target.value) } });
            }}
            className="w-full accent-emerald-500"
          />
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsRunning(!isRunning); playSound('compressor'); }}
          className={`p-4 rounded-xl font-semibold transition-colors ${
            isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'
          } text-white`}
        >
          {isRunning ? '⏹️ Stop Animation' : '▶️ Animate Cycle'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Key Formula: Coefficient of Performance</h3>
        <div className="text-center text-xl text-white font-mono mb-2">
          COP = Q_cold / W = T_cold / (T_hot - T_cold)
        </div>
        <p className="text-sm text-slate-400">
          COP tells us how much cooling we get per unit of work. Higher is better!
          Notice: smaller temperature difference → higher COP.
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding the Vapor Compression Cycle</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">⬆️ Compression</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Low-pressure vapor enters compressor</li>
            <li>• Work input raises pressure AND temperature</li>
            <li>• Exits as hot, high-pressure vapor</li>
            <li>• This is where energy is consumed</li>
            <li>• Temperature rises to ~60-80°C</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-orange-900/50 to-yellow-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">💧 Condensation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Hot vapor enters condenser coils</li>
            <li>• Heat flows OUT to surroundings</li>
            <li>• Refrigerant condenses to liquid</li>
            <li>• Still high pressure, but now liquid</li>
            <li>• This is where heat is rejected</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">⬇️ Expansion</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• High-pressure liquid hits expansion valve</li>
            <li>• Rapid pressure drop occurs</li>
            <li>• Some liquid flash-evaporates</li>
            <li>• Temperature drops dramatically</li>
            <li>• Exit: cold, low-pressure liquid/vapor mix</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">❄️ Evaporation</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Cold refrigerant enters evaporator coils</li>
            <li>• Heat flows IN from warm space</li>
            <li>• Refrigerant evaporates completely</li>
            <li>• THIS is where cooling happens</li>
            <li>• Exits as low-pressure vapor → back to compressor</li>
          </ul>
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
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          It's winter and -10°C outside. Your heat pump is supposed to heat your home to 20°C.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Can a refrigeration cycle actually EXTRACT heat from freezing outdoor air?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'No - there\'s no heat in freezing air to extract' },
          { id: 'B', text: 'Yes - any temperature above absolute zero contains extractable heat energy' },
          { id: 'C', text: 'Only if supplemented with electric resistance heating' },
          { id: 'D', text: 'Only if the outdoor temperature is above 0°C' }
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
            Correct! Even at -10°C, air molecules have thermal energy. The evaporator just needs to be COLDER than the air!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            At -10°C outdoor air, the evaporator might run at -20°C. Heat still flows from -10°C to -20°C!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore Heat Pumps →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Heat Pump: Refrigeration in Reverse</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3">❄️ Cooling Mode (AC)</h3>
            <svg width="200" height="150" className="mx-auto">
              <rect width="200" height="150" fill="#0f172a" rx="10" />
              {/* Indoor */}
              <rect x="10" y="20" width="80" height="110" fill="#1e3a5f" rx="5" />
              <text x="50" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">INDOOR</text>
              <text x="50" y="75" textAnchor="middle" fill="#06b6d4" fontSize="24">❄️</text>
              <text x="50" y="95" textAnchor="middle" fill="#06b6d4" fontSize="12">Evaporator</text>
              <text x="50" y="115" textAnchor="middle" fill="#22c55e" fontSize="10">Heat IN</text>
              {/* Outdoor */}
              <rect x="110" y="20" width="80" height="110" fill="#5f1e1e" rx="5" />
              <text x="150" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">OUTDOOR</text>
              <text x="150" y="75" textAnchor="middle" fill="#f97316" fontSize="24">🔥</text>
              <text x="150" y="95" textAnchor="middle" fill="#f97316" fontSize="12">Condenser</text>
              <text x="150" y="115" textAnchor="middle" fill="#ef4444" fontSize="10">Heat OUT</text>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-orange-400 mb-3">🔥 Heating Mode (Heat Pump)</h3>
            <svg width="200" height="150" className="mx-auto">
              <rect width="200" height="150" fill="#0f172a" rx="10" />
              {/* Indoor */}
              <rect x="10" y="20" width="80" height="110" fill="#5f3a1e" rx="5" />
              <text x="50" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">INDOOR</text>
              <text x="50" y="75" textAnchor="middle" fill="#f97316" fontSize="24">🔥</text>
              <text x="50" y="95" textAnchor="middle" fill="#f97316" fontSize="12">Condenser</text>
              <text x="50" y="115" textAnchor="middle" fill="#ef4444" fontSize="10">Heat OUT</text>
              {/* Outdoor */}
              <rect x="110" y="20" width="80" height="110" fill="#1e3a5f" rx="5" />
              <text x="150" y="45" textAnchor="middle" fill="#94a3b8" fontSize="10">OUTDOOR</text>
              <text x="150" y="75" textAnchor="middle" fill="#06b6d4" fontSize="24">❄️</text>
              <text x="150" y="95" textAnchor="middle" fill="#06b6d4" fontSize="12">Evaporator</text>
              <text x="150" y="115" textAnchor="middle" fill="#22c55e" fontSize="10">Heat IN</text>
            </svg>
          </div>
        </div>

        <div className="mt-6 bg-slate-900/50 rounded-xl p-4">
          <h4 className="text-emerald-400 font-semibold mb-2">The Magic of Heat Pumps:</h4>
          <p className="text-slate-300 text-sm">
            A heat pump uses <span className="text-cyan-400">1 kW of electricity</span> to move <span className="text-orange-400">3-5 kW of heat</span> from outside to inside.
            That's 300-500% efficient! No furnace can match this because it's not CREATING heat—it's MOVING heat.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Reversing Valve - The Key Component</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• A 4-way valve switches refrigerant flow direction</li>
          <li>• In cooling: outdoor coil = condenser, indoor coil = evaporator</li>
          <li>• In heating: indoor coil = condenser, outdoor coil = evaporator</li>
          <li>• Same compressor, same refrigerant, opposite heat flow!</li>
        </ul>
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
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Same Cycle Does Both Cooling AND Heating!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The vapor compression cycle is incredibly versatile:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">❄️</span>
              <span><strong>Refrigerator:</strong> Moves heat from cold food to warm kitchen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">🌀</span>
              <span><strong>Air Conditioner:</strong> Moves heat from cool room to hot outside</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">🔥</span>
              <span><strong>Heat Pump:</strong> Moves heat from cold outside to warm inside</span>
            </li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            Understanding one means understanding all three! The physics is identical—only the direction and temperatures change.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl">
        <h4 className="text-cyan-400 font-semibold mb-2">COP Comparison:</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl">❄️</div>
            <div className="text-lg font-bold text-cyan-400">COP 2-4</div>
            <div className="text-xs text-slate-400">Refrigerator</div>
          </div>
          <div>
            <div className="text-2xl">🌀</div>
            <div className="text-lg font-bold text-blue-400">COP 3-5</div>
            <div className="text-xs text-slate-400">Air Conditioner</div>
          </div>
          <div>
            <div className="text-2xl">🔥</div>
            <div className="text-lg font-bold text-orange-400">COP 3-5</div>
            <div className="text-xs text-slate-400">Heat Pump</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppTab].title}</h3>
            <p className="text-cyan-400 text-sm">{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-cyan-400 font-semibold mb-2">Connection to Refrigeration Cycle:</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-orange-400 font-semibold mb-2">How It Works:</h4>
          <p className="text-slate-400 text-sm">{transferApps[activeAppTab].howItWorks}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/70 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-4">
            <h4 className="text-emerald-400 font-semibold mb-2">Examples:</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              {transferApps[activeAppTab].examples.map((ex, i) => (
                <li key={i}>• {ex}</li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <h4 className="text-purple-400 font-semibold mb-2">Key Companies:</h4>
            <div className="flex flex-wrap gap-2">
              {transferApps[activeAppTab].companies.map((company, i) => (
                <span key={i} className="px-2 py-1 bg-slate-800 rounded text-slate-300 text-xs">{company}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4">
          <h4 className="text-cyan-400 font-semibold mb-2">Future Impact:</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            ✓ Mark as Explored
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
          className="mt-6 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

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
                        ? 'bg-cyan-600 text-white'
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
              playSound('complete');
              onGameEvent?.({ type: 'test_complete', data: { score: calculateScore() } });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-4">
              {calculateScore() >= 7
                ? 'Excellent! You understand refrigeration cycles!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div key={qIndex} className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <p className="text-white font-medium mb-2">{qIndex + 1}. {q.question}</p>
                  <p className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    Your answer: {q.options[testAnswers[qIndex]]?.text}
                  </p>
                  {!isCorrect && (
                    <p className="text-emerald-400 text-sm mt-1">
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-slate-400 text-sm mt-2 italic">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                goToPhase(9);
                onGameEvent?.({ type: 'mastery_achieved' });
              }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
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
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">❄️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Refrigeration Cycle Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the vapor compression refrigeration cycle!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Compression</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💧</div>
            <p className="text-sm text-slate-300">Condensation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📉</div>
            <p className="text-sm text-slate-300">Expansion</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">❄️</div>
            <p className="text-sm text-slate-300">Evaporation</p>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <p className="text-cyan-400 font-mono text-lg">COP = Q_cold / W = T_cold / (T_hot - T_cold)</p>
          <p className="text-slate-400 text-sm mt-2">You understand efficiency!</p>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Refrigeration Cycle</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        {renderPhase()}
      </div>
    </div>
  );
};

export default RefrigerationCycleRenderer;
