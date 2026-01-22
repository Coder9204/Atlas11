import React, { useState, useEffect, useCallback, useRef } from 'react';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'simulation_started'
  | 'simulation_paused'
  | 'simulation_reset'
  | 'parameter_changed'
  | 'twist_predicted'
  | 'twist_revealed'
  | 'app_explored'
  | 'app_completed'
  | 'test_started'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved'
  | 'sound_played'
  | 'navigation_clicked'
  | 'temperature_changed'
  | 'cycle_step_changed'
  | 'efficiency_calculated';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Play', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Play', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
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

const CarnotCycleRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Carnot cycle simulation states
  const [hotTemp, setHotTemp] = useState(600); // Kelvin
  const [coldTemp, setColdTemp] = useState(300); // Kelvin
  const [cycleStep, setCycleStep] = useState(0); // 0-3 for four stages
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showHeatFlow, setShowHeatFlow] = useState(true);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const playSound = useCallback((soundType: 'correct' | 'incorrect' | 'complete' | 'transition' | 'engine') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const frequencies: Record<string, number[]> = {
        correct: [523, 659, 784],
        incorrect: [200, 150],
        complete: [523, 659, 784, 1047],
        transition: [440, 550],
        engine: [150, 200, 250, 200, 150]
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      });

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      if (onGameEvent) {
        onGameEvent({ type: 'sound_played', data: { soundType } });
      }
    } catch {
      // Audio not supported
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] } });
    }
    if (onPhaseComplete) {
      onPhaseComplete(phase);
    }
    setPhase(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, phase, onGameEvent, onPhaseComplete]);

  // Carnot efficiency: η = 1 - T_cold/T_hot
  const efficiency = ((1 - coldTemp / hotTemp) * 100).toFixed(1);
  const wasteHeat = (100 - parseFloat(efficiency)).toFixed(1);

  // Cycle animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          setCycleStep(s => {
            const newStep = (s + 1) % 4;
            if (onGameEvent) {
              onGameEvent({ type: 'cycle_step_changed', data: { step: newStep } });
            }
            return newStep;
          });
          return 0;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({
        type: isCorrect ? 'prediction_correct' : 'prediction_incorrect',
        data: { prediction, correct: 'B' }
      });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'twist_predicted', data: { prediction, correct: 'C' } });
    }
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
    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_completed', data: { appIndex } });
    }
  }, [playSound, onGameEvent]);

  const toggleAnimation = useCallback(() => {
    setIsAnimating(prev => {
      const newState = !prev;
      if (onGameEvent) {
        onGameEvent({ type: newState ? 'simulation_started' : 'simulation_paused' });
      }
      if (newState) playSound('engine');
      return newState;
    });
  }, [playSound, onGameEvent]);

  const cycleStages = [
    { name: 'Isothermal Expansion', color: '#ef4444', desc: 'Gas expands at high temperature, absorbing heat Q_H' },
    { name: 'Adiabatic Expansion', color: '#f59e0b', desc: 'Gas expands without heat transfer, temperature drops' },
    { name: 'Isothermal Compression', color: '#3b82f6', desc: 'Gas compressed at low temperature, releasing heat Q_C' },
    { name: 'Adiabatic Compression', color: '#8b5cf6', desc: 'Gas compressed without heat transfer, temperature rises' }
  ];

  const testQuestions: TestQuestion[] = [
    {
      scenario: "A coal power plant operates with steam at 550°C (823 K) and cooling water at 30°C (303 K). Engineers want to improve efficiency.",
      question: "What is the maximum theoretical efficiency of this power plant?",
      options: [
        { text: "About 37%", correct: false },
        { text: "About 63%", correct: true },
        { text: "About 85%", correct: false },
        { text: "About 45%", correct: false }
      ],
      explanation: "Carnot efficiency η = 1 - T_C/T_H = 1 - 303/823 = 1 - 0.368 = 63.2%. This is the theoretical maximum; real plants achieve 35-45% due to irreversibilities."
    },
    {
      scenario: "A car engine burns fuel at 2000 K, but the effective hot reservoir temperature is only about 600 K due to rapid cycling. Exhaust gases are at 350 K.",
      question: "Why is the actual engine efficiency (25-30%) so much lower than what 2000 K would suggest?",
      options: [
        { text: "The fuel doesn't burn completely", correct: false },
        { text: "The working fluid can't absorb heat at combustion temperature due to time constraints", correct: true },
        { text: "Friction uses up most of the energy", correct: false },
        { text: "The exhaust temperature is too high", correct: false }
      ],
      explanation: "In a real engine, the working fluid (air-fuel mixture) doesn't have time to reach combustion temperature. The effective T_H is much lower, limiting theoretical efficiency to η = 1 - 350/600 ≈ 42%. Additional losses bring real efficiency to 25-30%."
    },
    {
      scenario: "During the isothermal expansion phase of the Carnot cycle, the gas is doing work on the piston while absorbing heat from the hot reservoir.",
      question: "Why does the temperature remain constant during this phase?",
      options: [
        { text: "The gas is perfectly insulated", correct: false },
        { text: "The heat absorbed equals the work done, so internal energy stays constant", correct: true },
        { text: "The pressure remains constant", correct: false },
        { text: "The volume doesn't change", correct: false }
      ],
      explanation: "For an ideal gas, internal energy depends only on temperature. During isothermal expansion, Q_in = W_out, so ΔU = Q - W = 0, meaning temperature stays constant. Heat is converted directly to work."
    },
    {
      scenario: "A geothermal power plant uses hot water at 180°C (453 K) from underground and cools with air at 25°C (298 K).",
      question: "What is the maximum possible efficiency of this geothermal plant?",
      options: [
        { text: "About 34%", correct: true },
        { text: "About 50%", correct: false },
        { text: "About 65%", correct: false },
        { text: "About 25%", correct: false }
      ],
      explanation: "Carnot efficiency η = 1 - T_C/T_H = 1 - 298/453 = 34.2%. Geothermal plants have lower efficiency than coal plants because the hot reservoir temperature is lower. Real geothermal plants achieve 10-20%."
    },
    {
      scenario: "A scientist proposes an engine that takes in 1000 J of heat from a hot reservoir at 500 K, does 600 J of work, and rejects 400 J to a cold reservoir at 300 K.",
      question: "Is this engine possible according to thermodynamics?",
      options: [
        { text: "Yes, it's within the Carnot limit", correct: false },
        { text: "No, it exceeds the Carnot efficiency limit", correct: true },
        { text: "Yes, because energy is conserved (1000 = 600 + 400)", correct: false },
        { text: "No, because perpetual motion is impossible", correct: false }
      ],
      explanation: "The proposed efficiency is 600/1000 = 60%. But Carnot limit is η = 1 - 300/500 = 40%. Since 60% > 40%, this engine is impossible. Energy conservation (First Law) is satisfied, but the Second Law (Carnot limit) is violated."
    },
    {
      scenario: "During adiabatic expansion in the Carnot cycle, the gas does work on the surroundings but no heat enters or leaves the system.",
      question: "Where does the energy for this work come from?",
      options: [
        { text: "From the hot reservoir through delayed heat transfer", correct: false },
        { text: "From the internal energy of the gas (temperature drops)", correct: true },
        { text: "From the kinetic energy of the piston", correct: false },
        { text: "From nuclear reactions in the gas", correct: false }
      ],
      explanation: "In adiabatic expansion, Q = 0, so ΔU = -W. The gas does positive work (W > 0), so internal energy decreases (ΔU < 0). Since U ∝ T for an ideal gas, the temperature drops. The gas 'uses up' its thermal energy to do work."
    },
    {
      scenario: "An engineer wants to improve a power plant's efficiency. She can either increase T_H by 50 K or decrease T_C by 50 K. Current temperatures: T_H = 600 K, T_C = 300 K.",
      question: "Which modification gives a larger efficiency improvement?",
      options: [
        { text: "Increasing T_H by 50 K (new η = 50.8%)", correct: false },
        { text: "Decreasing T_C by 50 K (new η = 58.3%)", correct: true },
        { text: "Both give the same improvement", correct: false },
        { text: "Neither significantly changes efficiency", correct: false }
      ],
      explanation: "Original: η = 1 - 300/600 = 50%. With T_H = 650 K: η = 1 - 300/650 = 53.8%. With T_C = 250 K: η = 1 - 250/600 = 58.3%. Lowering T_C has more impact because it appears in the numerator of T_C/T_H."
    },
    {
      scenario: "A heat pump heating a house operates between outside air at 0°C (273 K) and indoor air at 20°C (293 K).",
      question: "What is the maximum COP (Coefficient of Performance) for this heat pump?",
      options: [
        { text: "About 1.0 (same as electric heater)", correct: false },
        { text: "About 5.0", correct: false },
        { text: "About 14.6", correct: true },
        { text: "About 0.93 (Carnot engine efficiency)", correct: false }
      ],
      explanation: "For a heat pump, COP = T_H/(T_H - T_C) = 293/(293 - 273) = 293/20 = 14.65. This means ideally, for every 1 kW of electricity, you could deliver 14.65 kW of heat! Real heat pumps achieve COP of 3-5."
    },
    {
      scenario: "A refrigerator operates with interior at 5°C (278 K) and kitchen at 25°C (298 K). It removes 100 W of heat from the food.",
      question: "What is the minimum power required to run this refrigerator at Carnot efficiency?",
      options: [
        { text: "About 7.2 W", correct: true },
        { text: "About 100 W", correct: false },
        { text: "About 50 W", correct: false },
        { text: "About 20 W", correct: false }
      ],
      explanation: "Refrigerator COP = T_C/(T_H - T_C) = 278/(298 - 278) = 278/20 = 13.9. COP = Q_C/W, so W = Q_C/COP = 100/13.9 = 7.2 W. Real refrigerators need more power (COP ≈ 2-4), so actual power is higher."
    },
    {
      scenario: "Two identical Carnot engines A and B are connected in series. Engine A operates between 800 K and 500 K; its waste heat powers Engine B operating between 500 K and 300 K.",
      question: "What is the combined efficiency of this two-stage system?",
      options: [
        { text: "Same as single engine between 800 K and 300 K (62.5%)", correct: true },
        { text: "Higher than single engine (engines help each other)", correct: false },
        { text: "Lower than single engine (losses at the interface)", correct: false },
        { text: "The sum of individual efficiencies (37.5% + 40%)", correct: false }
      ],
      explanation: "Engine A: η_A = 1 - 500/800 = 37.5%. Engine B: η_B = 1 - 300/500 = 40%. Combined: η = 1 - (1-η_A)(1-η_B) = 1 - (0.625)(0.6) = 62.5%. This equals 1 - 300/800, same as a single engine across the full range!"
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🏭",
      title: "Power Plants",
      short: "Power",
      tagline: "Maximizing energy conversion efficiency",
      description: "Thermal power plants use the Carnot limit to understand maximum efficiency. Modern combined-cycle plants approach theoretical limits by using waste heat from one cycle to power another.",
      connection: "The Carnot efficiency η = 1 - T_C/T_H sets the absolute maximum. Real plants achieve 60-70% of this due to irreversibilities, heat losses, and friction.",
      howItWorks: "Steam is heated in a boiler (high T_H), expands through turbines doing work, then condenses in a condenser (low T_C). Combined-cycle plants use exhaust heat from gas turbines to power steam turbines.",
      stats: [
        { value: "63%", label: "Carnot limit (typical)" },
        { value: "40%", label: "Coal plant actual" },
        { value: "60%", label: "Combined cycle" },
        { value: "550°C", label: "Steam temperature" }
      ],
      examples: [
        "Coal-fired steam power plants",
        "Nuclear power stations",
        "Natural gas combined-cycle plants",
        "Concentrated solar thermal plants"
      ],
      companies: ["Siemens", "GE Power", "Mitsubishi", "Westinghouse"],
      futureImpact: "Supercritical CO₂ cycles and advanced materials for higher temperatures will push efficiencies beyond 65%, reducing fuel consumption and emissions per kWh.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: "🚗",
      title: "Internal Combustion Engines",
      short: "Engines",
      tagline: "Why cars waste so much fuel",
      description: "Car engines burn fuel at high temperatures but achieve only 25-30% efficiency. The Carnot cycle explains why most energy becomes waste heat rather than motion.",
      connection: "Effective T_H is limited by how fast heat can transfer to the working fluid. With T_H ≈ 600 K and T_C ≈ 350 K, Carnot limit is about 42%. Real engines achieve 60-70% of this.",
      howItWorks: "Fuel combustion creates high-pressure hot gas that pushes pistons. The Otto cycle (gasoline) and Diesel cycle approximate Carnot behavior but have additional irreversibilities from rapid combustion and exhaust.",
      stats: [
        { value: "25-30%", label: "Gasoline efficiency" },
        { value: "35-40%", label: "Diesel efficiency" },
        { value: "~2000°C", label: "Combustion temp" },
        { value: "70%", label: "Energy wasted" }
      ],
      examples: [
        "Gasoline car engines",
        "Diesel truck engines",
        "Motorcycle engines",
        "Hybrid vehicle powertrains"
      ],
      companies: ["Toyota", "BMW", "Ford", "Honda"],
      futureImpact: "Electric vehicles bypass heat engine limitations entirely (90%+ drivetrain efficiency). For remaining combustion engines, turbocharging and variable compression raise effective efficiency.",
      color: "from-slate-600 to-zinc-600"
    },
    {
      icon: "❄️",
      title: "Refrigeration & Air Conditioning",
      short: "Cooling",
      tagline: "Moving heat the 'wrong' way",
      description: "Refrigerators and air conditioners are reversed Carnot cycles. They use work to pump heat from cold to hot, achieving coefficients of performance greater than 1.",
      connection: "Refrigerator COP = T_C/(T_H - T_C) can be very high when temperature difference is small. Moving heat is more efficient than creating it!",
      howItWorks: "A refrigerant is compressed (heats up), cooled by ambient air, expanded (cools dramatically), then absorbs heat from the cold space. The cycle repeats continuously.",
      stats: [
        { value: "2-4", label: "Typical COP" },
        { value: "10+", label: "Carnot COP" },
        { value: "-40°C", label: "Freezer temp" },
        { value: "15%", label: "Of home electricity" }
      ],
      examples: [
        "Home refrigerators and freezers",
        "Air conditioning systems",
        "Commercial cold storage",
        "Cryogenic cooling systems"
      ],
      companies: ["Carrier", "Daikin", "LG", "Whirlpool"],
      futureImpact: "Magnetic refrigeration and elastocaloric cooling may replace vapor-compression cycles, eliminating greenhouse gas refrigerants while improving efficiency.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🏠",
      title: "Heat Pumps",
      short: "Heat Pumps",
      tagline: "3-5× more efficient than electric heaters",
      description: "Heat pumps extract heat from cold outdoor air and deliver it inside, achieving COP of 3-5. They're the most efficient form of electric heating available.",
      connection: "Heat pump COP = T_H/(T_H - T_C). When indoor-outdoor temperature difference is small, COP can be very high. Even extracting heat from 0°C air works!",
      howItWorks: "Outdoor coils absorb heat from cold air (refrigerant evaporates). Compressor raises temperature. Indoor coils release heat to house (refrigerant condenses). Reversible for cooling in summer.",
      stats: [
        { value: "3-5", label: "Heating COP" },
        { value: "300%+", label: "Effective efficiency" },
        { value: "-25°C", label: "Operating limit" },
        { value: "50%", label: "Energy savings" }
      ],
      examples: [
        "Air-source heat pumps",
        "Ground-source (geothermal) heat pumps",
        "Heat pump water heaters",
        "Mini-split systems"
      ],
      companies: ["Mitsubishi", "Daikin", "Bosch", "Carrier"],
      futureImpact: "Cold-climate heat pumps now work efficiently at -25°C. Widespread adoption could eliminate natural gas for heating, reducing residential emissions by 40%.",
      color: "from-green-600 to-emerald-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderPVDiagram = (size: number = 280, animated: boolean = true) => {
    const padding = 40;
    const w = size - 2 * padding;
    const h = size - 2 * padding;

    // Approximate Carnot cycle path points
    const points = [
      { x: padding + w * 0.2, y: padding + h * 0.15 }, // 1: High P, Low V
      { x: padding + w * 0.5, y: padding + h * 0.25 }, // 2: End isothermal expansion
      { x: padding + w * 0.85, y: padding + h * 0.6 }, // 3: End adiabatic expansion
      { x: padding + w * 0.55, y: padding + h * 0.75 }, // 4: End isothermal compression
    ];

    const currentPoint = animated ? cycleStep : 0;
    const progress = animated ? animationProgress / 100 : 0;

    // Interpolate current position
    const nextPoint = (currentPoint + 1) % 4;
    const dotX = points[currentPoint].x + (points[nextPoint].x - points[currentPoint].x) * progress;
    const dotY = points[currentPoint].y + (points[nextPoint].y - points[currentPoint].y) * progress;

    return (
      <svg width={size} height={size} className="mx-auto">
        <defs>
          <linearGradient id="pvBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size} fill="url(#pvBgGrad)" rx="12" />

        {/* Grid */}
        {[1, 2, 3, 4].map(i => (
          <React.Fragment key={i}>
            <line x1={padding + w * i / 5} y1={padding} x2={padding + w * i / 5} y2={size - padding} stroke="#334155" strokeWidth="0.5" />
            <line x1={padding} y1={padding + h * i / 5} x2={size - padding} y2={padding + h * i / 5} stroke="#334155" strokeWidth="0.5" />
          </React.Fragment>
        ))}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={size - padding + 10} stroke="#64748b" strokeWidth="2" />
        <line x1={padding - 10} y1={size - padding} x2={size - padding} y2={size - padding} stroke="#64748b" strokeWidth="2" />

        {/* Axis labels */}
        <text x={padding - 25} y={size / 2} fill="#94a3b8" fontSize="12" transform={`rotate(-90, ${padding - 25}, ${size / 2})`} textAnchor="middle">Pressure (P)</text>
        <text x={size / 2} y={size - 8} fill="#94a3b8" fontSize="12" textAnchor="middle">Volume (V)</text>

        {/* Isotherms (dashed curves) */}
        <path d={`M${padding + w * 0.15},${padding + h * 0.1} Q${padding + w * 0.4},${padding + h * 0.18} ${padding + w * 0.7},${padding + h * 0.22}`}
              fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
        <text x={padding + w * 0.72} y={padding + h * 0.2} fill="#ef4444" fontSize="9" opacity="0.6">T_H = {hotTemp}K</text>

        <path d={`M${padding + w * 0.45},${padding + h * 0.65} Q${padding + w * 0.65},${padding + h * 0.72} ${padding + w * 0.9},${padding + h * 0.75}`}
              fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
        <text x={padding + w * 0.92} y={padding + h * 0.73} fill="#3b82f6" fontSize="9" opacity="0.6">T_C = {coldTemp}K</text>

        {/* Carnot cycle path with glow */}
        {/* 1→2: Isothermal expansion (red) */}
        <path d={`M${points[0].x},${points[0].y} Q${(points[0].x + points[1].x) / 2},${points[0].y + 15} ${points[1].x},${points[1].y}`}
              fill="none" stroke="#ef4444" strokeWidth="3" filter="url(#glow)" />

        {/* 2→3: Adiabatic expansion (orange) */}
        <path d={`M${points[1].x},${points[1].y} Q${points[1].x + 30},${(points[1].y + points[2].y) / 2} ${points[2].x},${points[2].y}`}
              fill="none" stroke="#f59e0b" strokeWidth="3" filter="url(#glow)" />

        {/* 3→4: Isothermal compression (blue) */}
        <path d={`M${points[2].x},${points[2].y} Q${(points[2].x + points[3].x) / 2},${points[2].y + 10} ${points[3].x},${points[3].y}`}
              fill="none" stroke="#3b82f6" strokeWidth="3" filter="url(#glow)" />

        {/* 4→1: Adiabatic compression (purple) */}
        <path d={`M${points[3].x},${points[3].y} Q${points[3].x - 20},${(points[3].y + points[0].y) / 2} ${points[0].x},${points[0].y}`}
              fill="none" stroke="#8b5cf6" strokeWidth="3" filter="url(#glow)" />

        {/* State points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="8" fill={cycleStages[i].color} stroke="white" strokeWidth="2" />
            <text x={p.x + 12} y={p.y - 10} fill="white" fontSize="11" fontWeight="bold">{i + 1}</text>
          </g>
        ))}

        {/* Animated position dot */}
        {animated && isAnimating && (
          <circle cx={dotX} cy={dotY} r="10" fill={cycleStages[currentPoint].color} stroke="white" strokeWidth="2" filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Heat flow arrows */}
        {showHeatFlow && (
          <>
            {/* Q_H in (top) */}
            <path d="M130,15 L130,35" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRed)" />
            <text x="130" y="10" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">Q_H</text>

            {/* Q_C out (bottom) */}
            <path d="M180,245 L180,265" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowBlue)" />
            <text x="180" y="278" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">Q_C</text>

            {/* Work out arrow */}
            <path d="M250,120 L270,120" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowGreen)" />
            <text x="260" y="110" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">W</text>
          </>
        )}

        <defs>
          <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
          </marker>
          <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">THERMODYNAMICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
        The Perfect Engine
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        Why can no engine ever be 100% efficient?
      </p>

      {/* Premium card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-red-500/5 mb-8">
        <svg width="280" height="180" className="mx-auto mb-4">
          <defs>
            <linearGradient id="carBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id="engineHeat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Car body */}
          <rect x="60" y="80" width="160" height="60" fill="url(#carBody)" rx="10" />
          <rect x="80" y="60" width="100" height="30" fill="#475569" rx="8" />

          {/* Windows */}
          <rect x="85" y="65" width="40" height="20" fill="#60a5fa" opacity="0.3" rx="3" />
          <rect x="130" y="65" width="45" height="20" fill="#60a5fa" opacity="0.3" rx="3" />

          {/* Wheels */}
          <circle cx="100" cy="140" r="20" fill="#1e293b" />
          <circle cx="100" cy="140" r="10" fill="#374151" />
          <circle cx="180" cy="140" r="20" fill="#1e293b" />
          <circle cx="180" cy="140" r="10" fill="#374151" />

          {/* Engine area with heat glow */}
          <circle cx="95" cy="110" r="30" fill="url(#engineHeat)" />
          <rect x="70" y="90" width="50" height="40" fill="#ef4444" opacity="0.4" rx="5" />

          {/* Heat waves from exhaust */}
          <path d="M220,105 Q230,100 240,105 Q250,110 260,105" stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.8">
            <animate attributeName="d" values="M220,105 Q230,100 240,105 Q250,110 260,105;M220,105 Q230,110 240,105 Q250,100 260,105;M220,105 Q230,100 240,105 Q250,110 260,105" dur="1s" repeatCount="indefinite" />
          </path>
          <path d="M220,115 Q230,110 240,115 Q250,120 260,115" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.6">
            <animate attributeName="d" values="M220,115 Q230,110 240,115 Q250,120 260,115;M220,115 Q230,120 240,115 Q250,110 260,115;M220,115 Q230,110 240,115 Q250,120 260,115" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M220,125 Q230,120 240,125 Q250,130 260,125" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.4">
            <animate attributeName="d" values="M220,125 Q230,120 240,125 Q250,130 260,125;M220,125 Q230,130 240,125 Q250,120 260,125;M220,125 Q230,120 240,125 Q250,130 260,125" dur="1.4s" repeatCount="indefinite" />
          </path>

          {/* Fuel input arrow */}
          <path d="M40,100 L60,100" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowFuel)" />
          <text x="35" y="90" fill="#22c55e" fontSize="10">Fuel</text>

          <defs>
            <marker id="arrowFuel" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p className="text-xl text-slate-300 mt-4 mb-4">
          A car engine burns fuel at high temperatures, but only about <span className="text-amber-400 font-bold">25-30%</span> of that energy moves the car!
        </p>
        <p className="text-lg text-red-400 font-medium">
          The rest becomes <span className="text-red-500">WASTE HEAT</span> — hot exhaust, radiator heat, friction...
        </p>
        <p className="text-slate-400 mt-4">
          Is this just bad engineering? Or is there a <span className="text-cyan-400 font-bold">fundamental limit</span> to how efficient any engine can be?
        </p>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Limit
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <p className="mt-6 text-sm text-slate-500">Explore Carnot efficiency and thermodynamic limits</p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          In 1824, Sadi Carnot asked: <span className="text-cyan-400 font-medium">"What determines the maximum possible efficiency of a heat engine?"</span>
        </p>
        <p className="text-slate-400 mb-4">
          A heat engine takes in heat Q_H from a hot source (T_H), converts some to work W, and dumps waste heat Q_C to a cold sink (T_C).
        </p>
        <svg width="200" height="120" className="mx-auto">
          <rect x="70" y="10" width="60" height="30" fill="#ef4444" rx="5" />
          <text x="100" y="30" textAnchor="middle" fill="white" fontSize="10">HOT (T_H)</text>

          <rect x="80" y="55" width="40" height="25" fill="#64748b" rx="3" />
          <text x="100" y="72" textAnchor="middle" fill="white" fontSize="10">Engine</text>

          <rect x="70" y="95" width="60" height="25" fill="#3b82f6" rx="5" />
          <text x="100" y="112" textAnchor="middle" fill="white" fontSize="10">COLD (T_C)</text>

          <path d="M100,40 L100,55" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrHHook)" />
          <path d="M100,80 L100,95" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrCHook)" />
          <path d="M120,67 L150,67" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrWHook)" />
          <text x="160" y="72" fill="#22c55e" fontSize="10">W</text>

          <defs>
            <marker id="arrHHook" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#ef4444" />
            </marker>
            <marker id="arrCHook" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
            </marker>
            <marker id="arrWHook" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
      </div>

      <p className="text-lg text-white font-medium mb-4">What determines maximum efficiency?</p>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The type of gas used in the engine' },
          { id: 'B', text: 'The temperature difference between hot and cold reservoirs' },
          { id: 'C', text: 'How fast the engine runs' },
          { id: 'D', text: 'The size of the engine cylinders' }
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
            ✓ Correct! Only the <span className="text-cyan-400">temperatures</span> determine maximum efficiency!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is Carnot's revolutionary insight — no matter how well you engineer it, the temperatures alone set the limit.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Carnot Cycle →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Carnot Cycle Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderPVDiagram(isMobile ? 260 : 280, true)}

        <div className="mt-4 text-center">
          <div className="text-lg font-semibold text-slate-300">Current Stage:</div>
          <div className="text-xl font-bold mt-1" style={{ color: cycleStages[cycleStep].color }}>
            {cycleStages[cycleStep].name}
          </div>
          <div className="text-sm text-slate-400 mt-1">{cycleStages[cycleStep].desc}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-400">{efficiency}%</div>
            <div className="text-xs text-slate-400">Max Efficiency</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">{wasteHeat}%</div>
            <div className="text-xs text-slate-400">Minimum Waste</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">{hotTemp - coldTemp}K</div>
            <div className="text-xs text-slate-400">Temp Difference</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        {/* Hot Temperature Slider */}
        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Hot Reservoir (T_H)</span>
            <span className="text-red-400 font-bold">{hotTemp} K ({(hotTemp - 273).toFixed(0)}°C)</span>
          </div>
          <input
            type="range"
            min="400"
            max="1000"
            value={hotTemp}
            onChange={(e) => {
              const newTemp = Math.max(Number(e.target.value), coldTemp + 50);
              setHotTemp(newTemp);
              if (onGameEvent) {
                onGameEvent({ type: 'temperature_changed', data: { reservoir: 'hot', temperature: newTemp } });
              }
            }}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        {/* Cold Temperature Slider */}
        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Cold Reservoir (T_C)</span>
            <span className="text-blue-400 font-bold">{coldTemp} K ({(coldTemp - 273).toFixed(0)}°C)</span>
          </div>
          <input
            type="range"
            min="200"
            max="500"
            value={coldTemp}
            onChange={(e) => {
              const newTemp = Math.min(Number(e.target.value), hotTemp - 50);
              setColdTemp(newTemp);
              if (onGameEvent) {
                onGameEvent({ type: 'temperature_changed', data: { reservoir: 'cold', temperature: newTemp } });
              }
            }}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap justify-center">
        <button
          onMouseDown={(e) => { e.preventDefault(); toggleAnimation(); }}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isAnimating ? '⏹ Stop Cycle' : '▶ Run Cycle'}
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowHeatFlow(!showHeatFlow); }}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            showHeatFlow ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-600 hover:bg-slate-500'
          } text-white`}
        >
          {showHeatFlow ? '🔥 Heat Flow: ON' : '🔥 Heat Flow: OFF'}
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Carnot Efficiency Formula:</h3>
        <div className="text-center text-2xl text-white mb-3 font-mono">
          η = 1 - T_C / T_H
        </div>
        <div className="text-sm text-slate-300 space-y-1">
          <p>• <strong>η</strong> = Efficiency (0 to 1, or 0% to 100%)</p>
          <p>• <strong>T_H</strong> = Hot reservoir temperature (in Kelvin)</p>
          <p>• <strong>T_C</strong> = Cold reservoir temperature (in Kelvin)</p>
          <p className="text-amber-400 mt-2">Note: For 100% efficiency, T_C would need to be 0 K (absolute zero) — impossible!</p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding the Carnot Cycle</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">🔥 The Four Steps</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li><span className="text-red-400">1. Isothermal Expansion:</span> Absorb Q_H at T_H, gas expands</li>
            <li><span className="text-amber-400">2. Adiabatic Expansion:</span> No heat transfer, temperature drops to T_C</li>
            <li><span className="text-blue-400">3. Isothermal Compression:</span> Reject Q_C at T_C, gas compresses</li>
            <li><span className="text-purple-400">4. Adiabatic Compression:</span> No heat transfer, temperature rises to T_H</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">📊 Carnot's Theorem</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• No engine can exceed Carnot efficiency</li>
            <li>• Efficiency depends ONLY on temperatures</li>
            <li>• Real engines are always less efficient</li>
            <li>• The limit is fundamental physics, not engineering</li>
            <li>• This led to the 2nd Law of Thermodynamics</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🧮 Example Calculations</h3>
          <div className="text-slate-300 text-sm space-y-3">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p><strong>Power plant:</strong> T_H = 800K (steam), T_C = 300K (cooling water)</p>
              <p className="font-mono text-lg text-white mt-1">η = 1 - 300/800 = 1 - 0.375 = <span className="text-emerald-400">62.5%</span></p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p><strong>Car engine:</strong> T_H = 600K (effective), T_C = 350K (ambient + exhaust)</p>
              <p className="font-mono text-lg text-white mt-1">η = 1 - 350/600 = 1 - 0.583 = <span className="text-amber-400">41.7%</span></p>
            </div>
            <p className="text-cyan-400">
              Real engines achieve 60-70% of Carnot efficiency due to friction, incomplete combustion, heat losses, etc.
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
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Running Backwards</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          What if we ran the Carnot cycle <span className="text-purple-400 font-bold">in reverse</span>? Instead of extracting work from heat flow, we <span className="text-cyan-400">put work IN</span> to move heat...
        </p>
        <svg width="200" height="140" className="mx-auto">
          <rect x="70" y="10" width="60" height="30" fill="#ef4444" rx="5" />
          <text x="100" y="30" textAnchor="middle" fill="white" fontSize="10">HOT (T_H)</text>

          <rect x="80" y="55" width="40" height="25" fill="#a855f7" rx="3" />
          <text x="100" y="72" textAnchor="middle" fill="white" fontSize="9">Reversed</text>

          <rect x="70" y="95" width="60" height="30" fill="#3b82f6" rx="5" />
          <text x="100" y="115" textAnchor="middle" fill="white" fontSize="10">COLD (T_C)</text>

          {/* Reversed arrows */}
          <path d="M100,55 L100,40" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrHTwist)" />
          <path d="M100,95 L100,80" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrCTwist)" />
          <path d="M150,67 L120,67" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrWTwist)" />
          <text x="160" y="72" fill="#22c55e" fontSize="10">W in</text>

          <defs>
            <marker id="arrHTwist" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#ef4444" />
            </marker>
            <marker id="arrCTwist" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
            </marker>
            <marker id="arrWTwist" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <path d="M0,0 L0,4 L6,2 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
        <p className="text-lg text-cyan-400 font-medium mt-4">
          What does a reversed Carnot cycle do?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It\'s impossible — heat can\'t flow from cold to hot' },
          { id: 'B', text: 'It creates more energy than you put in (perpetual motion!)' },
          { id: 'C', text: 'It becomes a refrigerator or heat pump!' },
          { id: 'D', text: 'It destroys the engine' }
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
            ✓ Exactly! A reversed Carnot cycle is a <span className="text-cyan-400">heat pump</span> or <span className="text-blue-400">refrigerator</span>!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            By doing work, we can move heat from cold to hot — that's how your fridge works!
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
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Heat Pumps & Refrigerators</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2 text-center">Refrigerator</h3>
          <svg width="180" height="160" className="mx-auto">
            {/* Fridge box */}
            <rect x="50" y="20" width="80" height="100" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" rx="5" />
            <rect x="55" y="25" width="70" height="40" fill="#0f172a" rx="3" />
            <circle cx="90" cy="45" r="15" fill="#60a5fa" opacity="0.3" />
            <text x="90" y="50" textAnchor="middle" fill="#93c5fd" fontSize="10">COLD</text>

            {/* Room (hot) */}
            <rect x="140" y="40" width="30" height="40" fill="#ef4444" opacity="0.3" rx="3" />
            <text x="155" y="65" textAnchor="middle" fill="#fca5a5" fontSize="8">ROOM</text>

            {/* Arrows showing heat flow */}
            <path d="M90,85 L90,130" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrGPump)" />
            <text x="90" y="145" textAnchor="middle" fill="#22c55e" fontSize="9">Work in</text>

            <path d="M125,45 L145,55" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 2" markerEnd="url(#arrBPump)" />

            <defs>
              <marker id="arrGPump" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L0,4 L6,2 z" fill="#22c55e" />
              </marker>
              <marker id="arrBPump" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L0,4 L6,2 z" fill="#60a5fa" />
              </marker>
            </defs>
          </svg>
          <p className="text-slate-400 text-xs text-center mt-2">Removes heat from inside, dumps to room</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2 text-center">Heat Pump</h3>
          <svg width="180" height="160" className="mx-auto">
            {/* House */}
            <polygon points="90,20 140,50 140,110 40,110 40,50" fill="none" stroke="#ef4444" strokeWidth="2" />
            <rect x="50" y="55" width="80" height="55" fill="#fef3c7" opacity="0.2" />
            <text x="90" y="85" textAnchor="middle" fill="#f59e0b" fontSize="10">WARM</text>

            {/* Outside cold */}
            <rect x="5" y="60" width="30" height="40" fill="#3b82f6" opacity="0.3" rx="3" />
            <text x="20" y="85" textAnchor="middle" fill="#60a5fa" fontSize="8">COLD</text>

            {/* Work input */}
            <path d="M90,130 L90,115" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrGPump2)" />
            <text x="90" y="145" textAnchor="middle" fill="#22c55e" fontSize="9">Work in</text>

            {/* Heat from outside */}
            <path d="M35,80 L45,80" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 2" markerEnd="url(#arrBPump2)" />

            <defs>
              <marker id="arrGPump2" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L0,4 L6,2 z" fill="#22c55e" />
              </marker>
              <marker id="arrBPump2" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
              </marker>
            </defs>
          </svg>
          <p className="text-slate-400 text-xs text-center mt-2">Extracts heat from outside, pumps into house</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Coefficient of Performance (COP):</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Refrigerator COP:</strong> COP = Q_C / W = T_C / (T_H - T_C)</li>
          <li>• <strong>Heat Pump COP:</strong> COP = Q_H / W = T_H / (T_H - T_C)</li>
          <li>• COP can be greater than 1! (Not a violation of conservation)</li>
          <li>• A heat pump with COP = 4 delivers 4 kW of heat for 1 kW of electricity</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          This is why heat pumps are so efficient for heating — they "move" heat rather than "create" it!
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
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Carnot Cycle Works Both Ways!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The same thermodynamic cycle can be:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Forward (Engine):</strong> Heat flows hot→cold, work comes OUT</li>
            <li><strong>Backward (Heat Pump):</strong> Work goes IN, heat flows cold→hot</li>
          </ol>
          <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-red-400 font-semibold">Engine</p>
                <p className="text-sm font-mono">η = 1 - T_C/T_H</p>
                <p className="text-xs text-slate-400">Always &lt; 100%</p>
              </div>
              <div>
                <p className="text-blue-400 font-semibold">Heat Pump</p>
                <p className="text-sm font-mono">COP = T_H/(T_H - T_C)</p>
                <p className="text-xs text-slate-400">Can be &gt; 100%!</p>
              </div>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            This duality explains why heat pumps are 3-5× more efficient than electric heaters!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
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
            onMouseDown={(e) => {
              e.preventDefault();
              setActiveAppTab(index);
              if (onGameEvent) {
                onGameEvent({ type: 'app_explored', data: { appIndex: index, title: app.title } });
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {isMobile ? '' : app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppTab].title}</h3>
            <p className="text-sm text-slate-400">{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 my-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-orange-400 mb-2">Physics Connection</h4>
          <p className="text-sm text-slate-300">{transferApps[activeAppTab].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">How It Works</h4>
          <p className="text-sm text-slate-300">{transferApps[activeAppTab].howItWorks}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Examples</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            {transferApps[activeAppTab].examples.map((ex, i) => (
              <li key={i}>• {ex}</li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-2">Key Players</h4>
          <div className="flex flex-wrap gap-2">
            {transferApps[activeAppTab].companies.map((company, i) => (
              <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{company}</span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-amber-400 mb-1">Future Impact</h4>
          <p className="text-sm text-slate-300">{transferApps[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
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
                <p className="text-slate-400 text-sm italic">{q.scenario}</p>
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
                        ? 'bg-red-600 text-white'
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
              if (onGameEvent) {
                onGameEvent({ type: 'test_completed', data: { score: calculateScore(), total: testQuestions.length } });
              }
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500'
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
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered the Carnot cycle!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>

            {calculateScore() >= 7 ? (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToPhase(9);
                  if (onGameEvent) {
                    onGameEvent({ type: 'mastery_achieved', data: { score: calculateScore() } });
                  }
                }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                Claim Your Mastery Badge →
              </button>
            ) : (
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
              >
                Review & Try Again
              </button>
            )}
          </div>

          {/* Show explanations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Review Answers:</h4>
            {testQuestions.map((q, i) => {
              const isCorrect = q.options[testAnswers[i]]?.correct;
              return (
                <div key={i} className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-red-900/30 border border-red-700'}`}>
                  <p className="text-sm text-slate-300 mb-2">{i + 1}. {q.question}</p>
                  <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCorrect ? '✓ Correct!' : `✗ Your answer: ${q.options[testAnswers[i]]?.text}`}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-emerald-400 mt-1">
                      Correct answer: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-sm text-slate-400 mt-2">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🔥</div>
        <h1 className="text-3xl font-bold text-white mb-4">Carnot Cycle Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of heat engines and thermodynamic efficiency!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-slate-300">Carnot Efficiency</p>
            <p className="text-xs text-orange-400">η = 1 - T_C/T_H</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Four-Step Cycle</p>
            <p className="text-xs text-cyan-400">2 isothermal + 2 adiabatic</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">❄️</div>
            <p className="text-sm text-slate-300">Heat Pumps</p>
            <p className="text-xs text-blue-400">COP &gt; 1</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Maximum Efficiency</p>
            <p className="text-xs text-emerald-400">Fundamental limit</p>
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
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-red-400">Carnot Cycle</span>
          <div className="flex gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-red-400 to-orange-400 w-6 shadow-lg shadow-red-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default CarnotCycleRenderer;
