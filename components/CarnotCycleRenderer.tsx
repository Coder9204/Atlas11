'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// CARNOT CYCLE RENDERER - THERMODYNAMIC EFFICIENCY & HEAT ENGINES
// Premium 10-phase educational game with inline styles for test compliance
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Make Prediction',
  play: 'Experiment Lab',
  review: 'Review Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Further',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Complete'
};

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
  | 'navigation_clicked';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: Phase;
  gamePhase?: Phase;
  phase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
  onBack?: () => void;
}

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "What determines the MAXIMUM possible efficiency of ANY heat engine?",
    context: "In 1824, Sadi Carnot asked this fundamental question. A heat engine takes in heat Q_H from a hot source, converts some to useful work W, and dumps waste heat Q_C to a cold sink.",
    options: [
      { id: 'A', text: 'The type of working fluid (gas, steam, etc.)' },
      { id: 'B', text: 'The temperature difference between hot and cold reservoirs' },
      { id: 'C', text: 'How fast the engine operates' },
      { id: 'D', text: 'The size and design of the engine cylinders' }
    ],
    correct: 'B',
    explanation: "Carnot's revolutionary discovery: ONLY the temperatures matter! No matter how perfectly you engineer an engine, its maximum efficiency is determined solely by the hot and cold reservoir temperatures. This is the Carnot efficiency: eta = 1 - T_C/T_H"
  },
  twist: {
    question: "What happens if we run the Carnot cycle BACKWARDS - putting work IN instead of getting work out?",
    context: "Instead of heat flowing from hot to cold and producing work, we input work to move heat...",
    options: [
      { id: 'A', text: "It's impossible - heat can only flow from hot to cold" },
      { id: 'B', text: 'It creates more energy than you put in (free energy!)' },
      { id: 'C', text: 'It becomes a refrigerator or heat pump!' },
      { id: 'D', text: 'The engine will break from running backwards' }
    ],
    correct: 'C',
    explanation: "A reversed Carnot cycle is a heat pump or refrigerator! By doing work, we can move heat from cold to hot - that's exactly how your fridge and air conditioner work. The Coefficient of Performance (COP) can exceed 100% because we're MOVING heat, not creating it!"
  }
};

const realWorldApplications = [
  {
    id: 'power_plants',
    title: 'Power Plant Efficiency',
    icon: '🏭',
    short: 'Power',
    tagline: 'Why we waste 60% of our fuel',
    description: 'Every thermal power plant - coal, nuclear, gas - is limited by Carnot efficiency. With steam at 550 degrees C (823K) and cooling water at 30 degrees C (303K), the theoretical maximum is only 63%. Real plants achieve 35-45%.',
    connection: 'Carnot efficiency eta = 1 - T_C/T_H sets the absolute ceiling. Engineers spend billions trying to raise T_H (supercritical steam) or lower T_C (better cooling) to squeeze out a few more percent.',
    howItWorks: 'Fuel heats water to superheated steam (high T_H). Steam expands through turbines, doing work. Spent steam condenses in cooling towers (low T_C). The temperature difference drives everything.',
    stats: [
      { value: '63%', label: 'Carnot limit' },
      { value: '45%', label: 'Best coal plants' },
      { value: '62%', label: 'Combined cycle gas' },
      { value: '$2T', label: 'Annual fuel cost' }
    ],
    examples: [
      'Nuclear reactors (33% efficient due to safety-limited temperatures)',
      'Supercritical coal plants (45% with 600 degree C steam)',
      'Combined cycle gas turbines (62% using exhaust heat twice)',
      'Geothermal plants (10-20% due to low source temperature)'
    ],
    companies: ['GE Vernova', 'Siemens Energy', 'Mitsubishi Power', 'Westinghouse'],
    futureImpact: 'Supercritical CO2 cycles operating at 700 degrees C could push thermal efficiency beyond 50%, saving billions in fuel costs and reducing emissions by 20%.'
  },
  {
    id: 'heat_pumps',
    title: 'Heat Pump Revolution',
    icon: '🏠',
    short: 'Heat Pumps',
    tagline: '300-500% heating efficiency',
    description: 'Heat pumps are reversed Carnot cycles. Instead of converting heat to work, they use work to MOVE heat from cold outside to warm inside. COP of 3-5 means 3-5 kW of heat for every 1 kW of electricity!',
    connection: 'Heat pump COP = T_H/(T_H - T_C). With indoor 20 degrees C (293K) and outdoor 5 degrees C (278K), ideal COP = 293/15 = 19.5! Real systems achieve 3-5 due to irreversibilities.',
    howItWorks: 'Refrigerant absorbs heat from cold outdoor air (yes, even at -15 degrees C!), compressor raises its temperature, then it releases heat inside. The cycle reverses for cooling in summer.',
    stats: [
      { value: '3-5x', label: 'COP vs electric heat' },
      { value: '50%', label: 'Energy savings' },
      { value: '-25C', label: 'Modern cold limit' },
      { value: '$150B', label: 'Market by 2030' }
    ],
    examples: [
      'Air-source heat pumps (most common, COP 3-4)',
      'Ground-source/geothermal (COP 4-5, stable temps)',
      'Heat pump water heaters (COP 3-4)',
      'Industrial heat pumps (up to 150 degrees C output)'
    ],
    companies: ['Daikin', 'Mitsubishi Electric', 'Carrier', 'Bosch'],
    futureImpact: 'Heat pumps could eliminate 40% of building emissions globally. New refrigerants and compressors are pushing cold-climate performance to -30 degrees C with COP above 2.'
  },
  {
    id: 'car_engines',
    title: 'Internal Combustion Engines',
    icon: '🚗',
    short: 'Cars',
    tagline: 'Why 70% of your gas becomes heat',
    description: 'Your car engine burns fuel at 2000 degrees C but only converts 25-30% to motion. The rest is waste heat - radiator, exhaust, friction. Carnot explains why: the effective temperature ratio limits efficiency.',
    connection: 'Although combustion reaches 2000 degrees C, the working gas averages only ~600K effective T_H. With exhaust at ~350K, Carnot limit is 42%. Real engines achieve 60-70% of this.',
    howItWorks: 'Fuel-air mixture compresses (raises T_H), spark ignites it, hot gas expands doing work, exhaust removes waste heat (T_C). The Otto cycle approximates Carnot with discrete strokes.',
    stats: [
      { value: '25-30%', label: 'Gasoline efficiency' },
      { value: '35-45%', label: 'Diesel efficiency' },
      { value: '40%', label: 'F1 engines (best)' },
      { value: '70%', label: 'Energy wasted as heat' }
    ],
    examples: [
      'Gasoline engines (Otto cycle, 10:1 compression)',
      'Diesel engines (higher compression = higher efficiency)',
      'Hybrid vehicles (recover waste with electric)',
      'Turbochargers (use exhaust heat for more power)'
    ],
    companies: ['Toyota', 'BMW', 'Mercedes-Benz', 'Honda'],
    futureImpact: 'EVs bypass heat engine limits entirely with 85-90% drivetrain efficiency. For remaining combustion engines, variable compression and waste heat recovery push toward 50%.'
  },
  {
    id: 'refrigeration',
    title: 'Refrigeration & Cryogenics',
    icon: '❄️',
    short: 'Cooling',
    tagline: 'Moving heat the "wrong" way',
    description: 'Refrigerators, air conditioners, and cryogenic systems all use reversed heat engine cycles. They pump heat from cold to hot using work input - seemingly violating thermodynamics but actually obeying Carnot.',
    connection: 'Refrigerator COP = T_C/(T_H - T_C). For a fridge at 5 degrees C (278K) and kitchen at 25 degrees C (298K), ideal COP = 278/20 = 13.9. Real fridges achieve 2-4.',
    howItWorks: 'Liquid refrigerant evaporates inside (absorbs heat, gets cold), compressor raises pressure and temperature, condenser releases heat outside, expansion valve drops pressure for next cycle.',
    stats: [
      { value: '2-4', label: 'Fridge COP' },
      { value: '15%', label: 'Home electricity use' },
      { value: '-269C', label: 'LNG temperature' },
      { value: '4K', label: 'Liquid helium' }
    ],
    examples: [
      'Home refrigerators and freezers',
      'Air conditioning (same principle, larger scale)',
      'Cryogenic cooling for MRI and quantum computers',
      'LNG ships (cool natural gas to -162 degrees C)'
    ],
    companies: ['Carrier', 'Daikin', 'Linde', 'Air Liquide'],
    futureImpact: 'Magnetic and elastocaloric cooling may replace vapor compression, eliminating HFC refrigerants while improving efficiency by 30%. Critical for sustainable cooling as global temps rise.'
  }
];

const testQuestions = [
  {
    scenario: "A coal power plant operates with steam at 550 degrees C (823K) and cooling water at 30 degrees C (303K). The plant manager wants to know the theoretical efficiency limit.",
    question: "What is the maximum possible (Carnot) efficiency?",
    options: [
      { text: "A) About 37% - limited by turbine design", correct: false },
      { text: "B) About 63% - set by temperature ratio", correct: true },
      { text: "C) About 85% - modern plants are very efficient", correct: false },
      { text: "D) 100% is possible with perfect insulation", correct: false }
    ],
    explanation: "Carnot efficiency eta = 1 - T_C/T_H = 1 - 303/823 = 63.2%. This is the absolute maximum regardless of engineering. Real plants achieve 35-45% due to friction, heat losses, and other irreversibilities."
  },
  {
    scenario: "An inventor claims to have built a heat engine that operates between 600K and 300K reservoirs with 60% efficiency.",
    question: "Is this claim possible according to physics?",
    options: [
      { text: "A) Yes - 60% is achievable with good engineering", correct: false },
      { text: "B) No - it exceeds the Carnot limit of 50%", correct: true },
      { text: "C) Yes - newer materials allow higher efficiency", correct: false },
      { text: "D) Need more information about the engine type", correct: false }
    ],
    explanation: "Carnot limit = 1 - 300/600 = 50%. Since 60% > 50%, this engine violates the Second Law of Thermodynamics. No amount of clever engineering can exceed the Carnot limit - it's a fundamental law of nature."
  },
  {
    scenario: "During isothermal expansion in the Carnot cycle, gas absorbs heat Q_H from the hot reservoir while expanding and doing work.",
    question: "Why does the temperature stay constant during this process?",
    options: [
      { text: "A) The gas is perfectly insulated", correct: false },
      { text: "B) Heat absorbed equals work done, so internal energy is unchanged", correct: true },
      { text: "C) The volume doesn't actually change", correct: false },
      { text: "D) Temperature can't change during expansion", correct: false }
    ],
    explanation: "For an ideal gas, internal energy U depends only on temperature. During isothermal expansion: Q_in = W_out, so Delta U = Q - W = 0. Temperature stays constant because all incoming heat is immediately converted to work output."
  },
  {
    scenario: "A heat pump heats a house (20 degrees C inside, 0 degrees C outside). An electric heater is 100% efficient at converting electricity to heat.",
    question: "How can a heat pump have 'efficiency' greater than 100%?",
    options: [
      { text: "A) It violates energy conservation temporarily", correct: false },
      { text: "B) It MOVES heat rather than creating it - COP measures heat delivered per work input", correct: true },
      { text: "C) The 100% heater measurement is wrong", correct: false },
      { text: "D) Heat pumps create energy from temperature differences", correct: false }
    ],
    explanation: "Heat pumps don't create heat - they move it. COP = Q_H/W can exceed 1 because you're measuring heat delivered vs work input. With COP = 4, you get 4 kW of heating for 1 kW of electricity. Energy is conserved: Q_H = W + Q_C."
  },
  {
    scenario: "An engineer wants to improve a power plant's efficiency. She can either increase T_H by 100K or decrease T_C by 100K. Current: T_H = 800K, T_C = 300K (eta = 62.5%).",
    question: "Which change gives a LARGER efficiency improvement?",
    options: [
      { text: "A) Increasing T_H to 900K (new eta = 66.7%)", correct: false },
      { text: "B) Decreasing T_C to 200K (new eta = 75.0%)", correct: true },
      { text: "C) Both give exactly the same improvement", correct: false },
      { text: "D) Neither significantly affects efficiency", correct: false }
    ],
    explanation: "Lowering T_C has more impact! With T_H = 900K: eta = 1 - 300/900 = 66.7% (+4.2%). With T_C = 200K: eta = 1 - 200/800 = 75.0% (+12.5%). T_C appears in the ratio, so reducing it has outsized effect. This is why cold sinks (deep ocean, cold climates) are valuable for power plants."
  },
  {
    scenario: "A refrigerator maintains 5 degrees C (278K) inside while the kitchen is 30 degrees C (303K). It removes 100W of heat from the food compartment.",
    question: "What is the minimum power required to run this refrigerator?",
    options: [
      { text: "A) About 9W (Carnot COP = 11.1)", correct: true },
      { text: "B) At least 100W (you can't move heat for free)", correct: false },
      { text: "C) About 50W (half the cooling load)", correct: false },
      { text: "D) Zero - once cold, it stays cold", correct: false }
    ],
    explanation: "Refrigerator COP = T_C/(T_H - T_C) = 278/(303-278) = 278/25 = 11.1. This means ideally, moving 100W of heat requires only W = Q_C/COP = 100/11.1 = 9W. Real fridges need more (COP ~3), so actual power is ~30-40W for this cooling load."
  },
  {
    scenario: "During adiabatic expansion in the Carnot cycle, the gas does work but no heat enters or leaves the system.",
    question: "Where does the energy for this work come from?",
    options: [
      { text: "A) From the hot reservoir through delayed heat transfer", correct: false },
      { text: "B) From the internal energy of the gas - temperature drops", correct: true },
      { text: "C) From potential energy stored in the piston", correct: false },
      { text: "D) From the cold reservoir in advance", correct: false }
    ],
    explanation: "In adiabatic processes, Q = 0, so the First Law gives Delta U = -W. The gas does positive work (expands), so internal energy decreases. For an ideal gas, U is proportional to T, so temperature drops. The gas literally cools itself by doing work - trading thermal energy for mechanical work."
  },
  {
    scenario: "A geothermal plant uses hot water at 150 degrees C (423K) from underground. Cooling is to 25 degrees C (298K) ambient air.",
    question: "Why is geothermal efficiency (10-15%) so much lower than coal plants (40%)?",
    options: [
      { text: "A) Geothermal heat is lower quality than combustion heat", correct: false },
      { text: "B) The source temperature T_H is much lower, reducing Carnot limit", correct: true },
      { text: "C) Water is a worse working fluid than steam", correct: false },
      { text: "D) Geothermal plants use older technology", correct: false }
    ],
    explanation: "Carnot limit = 1 - 298/423 = 29.5%, compared to coal's 63% (with 823K steam). Lower T_H means lower maximum efficiency. Geothermal compensates with free fuel (Earth's heat), but physics limits conversion efficiency. Binary cycle plants improve this slightly."
  },
  {
    scenario: "Your car's engine radiator and exhaust together reject about 70% of the fuel's energy as waste heat.",
    question: "Why can't engineers design an engine that wastes less heat?",
    options: [
      { text: "A) They could with better materials, but it's too expensive", correct: false },
      { text: "B) The Carnot limit fundamentally requires waste heat for any heat engine", correct: true },
      { text: "C) Regulations require waste heat for emissions control", correct: false },
      { text: "D) The heat is needed to keep the engine warm", correct: false }
    ],
    explanation: "Carnot's theorem proves that ALL heat engines must reject some heat to the cold reservoir. With effective T_H ~ 600K and T_C ~ 350K, the maximum efficiency is only ~42%. The remaining 58%+ MUST be rejected as heat - it's physics, not engineering. This is why EVs are fundamentally more efficient."
  },
  {
    scenario: "Two Carnot engines operate in series: Engine A between 1000K and 500K, Engine B uses A's waste heat between 500K and 300K.",
    question: "What is the combined efficiency of this two-stage system?",
    options: [
      { text: "A) The sum of individual efficiencies: 50% + 40% = 90%", correct: false },
      { text: "B) Same as a single engine from 1000K to 300K: 70%", correct: true },
      { text: "C) Lower due to losses at the interface between stages", correct: false },
      { text: "D) Higher because two engines work together", correct: false }
    ],
    explanation: "Engine A: eta_A = 1 - 500/1000 = 50%. Engine B: eta_B = 1 - 300/500 = 40%. Combined: eta = 1 - (1-0.5)(1-0.4) = 1 - 0.3 = 70%. This equals 1 - 300/1000, the same as one engine across the full range! Carnot efficiency depends only on the extreme temperatures, not intermediate stages."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CarnotCycleRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase,
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onBack
}) => {
  // Determine initial phase from props (support multiple prop names)
  const initialPhase = gamePhase ?? currentPhase ?? phaseProp ?? 'hook';

  // Phase and navigation state
  const [phase, setPhase] = useState<Phase>(initialPhase as Phase);
  const [isMobile, setIsMobile] = useState(false);

  // Prediction states
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Simulation states
  const [hotTemp, setHotTemp] = useState(600);
  const [coldTemp, setColdTemp] = useState(300);
  const [cycleStep, setCycleStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Transfer states
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  // Refs for debouncing
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    const externalPhase = gamePhase ?? currentPhase ?? phaseProp;
    if (externalPhase && externalPhase !== phase && PHASE_ORDER.includes(externalPhase as Phase)) {
      setPhase(externalPhase as Phase);
    }
  }, [gamePhase, currentPhase, phaseProp, phase]);

  // Animation loop for cycle
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          setCycleStep(s => (s + 1) % 4);
          return 0;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // ============================================================================
  // SOUND & EVENTS
  // ============================================================================

  const playSound = useCallback((type: 'correct' | 'incorrect' | 'complete' | 'click') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const freqs: Record<string, number[]> = {
        correct: [523, 659, 784],
        incorrect: [200, 150],
        complete: [523, 659, 784, 1047],
        click: [440, 480]
      };

      const f = freqs[type] || [440];
      osc.frequency.setValueAtTime(f[0], ctx.currentTime);
      f.forEach((freq, i) => osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1));

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available
    }
  }, []);

  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300 || navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;

    playSound('click');
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(phase);
    setPhase(newPhase);

    setTimeout(() => { navigationLockRef.current = false; }, 300);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < PHASE_ORDER.length - 1 && phase !== 'test';

  const handleBack = () => {
    if (canGoBack) {
      goToPhase(PHASE_ORDER[currentPhaseIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext && phase !== 'test') {
      goToPhase(PHASE_ORDER[currentPhaseIndex + 1]);
    }
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const efficiency = ((1 - coldTemp / hotTemp) * 100).toFixed(1);
  const wasteHeat = (100 - parseFloat(efficiency)).toFixed(1);

  const cycleStages = [
    { name: 'Isothermal Expansion', color: '#ef4444', symbol: '1 to 2', desc: 'Absorb Q_H at T_H, gas expands' },
    { name: 'Adiabatic Expansion', color: '#f59e0b', symbol: '2 to 3', desc: 'No heat transfer, T drops to T_C' },
    { name: 'Isothermal Compression', color: '#3b82f6', symbol: '3 to 4', desc: 'Reject Q_C at T_C, gas compresses' },
    { name: 'Adiabatic Compression', color: '#8b5cf6', symbol: '4 to 1', desc: 'No heat transfer, T rises to T_H' }
  ];

  const calculateScore = () => testAnswers.reduce((s, a, i) => s + (testQuestions[i]?.options[a]?.correct ? 1 : 0), 0);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePrediction = (id: string) => {
    if (showPredictionFeedback) return;
    setSelectedPrediction(id);
    setShowPredictionFeedback(true);
    const correct = id === predictions.initial.correct;
    playSound(correct ? 'correct' : 'incorrect');
    emitEvent(correct ? 'prediction_correct' : 'prediction_incorrect', { prediction: id });
  };

  const handleTwistPrediction = (id: string) => {
    if (showTwistFeedback) return;
    setTwistPrediction(id);
    setShowTwistFeedback(true);
    const correct = id === predictions.twist.correct;
    playSound(correct ? 'correct' : 'incorrect');
    emitEvent('twist_predicted', { prediction: id, correct });
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (answerConfirmed) return;
    setSelectedAnswer(optionIndex);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return;
    setAnswerConfirmed(true);
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = selectedAnswer;
    setTestAnswers(newAnswers);
    emitEvent('test_answered', { question: currentQuestion, answer: selectedAnswer });
  };

  const handleNextQuestion = () => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setAnswerConfirmed(false);
    } else {
      setShowTestResults(true);
      playSound('complete');
      emitEvent('test_completed', { score: calculateScore(), total: testQuestions.length });
    }
  };

  const handleAppComplete = (idx: number) => {
    setCompletedApps(prev => new Set([...prev, idx]));
    playSound('complete');
    emitEvent('app_completed', { app: realWorldApplications[idx].title });
  };

  // ============================================================================
  // STYLES
  // ============================================================================

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      minHeight: '100vh',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      position: 'relative' as const
    },
    header: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #334155',
      padding: '12px 24px',
      zIndex: 200,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: '896px',
      margin: '0 auto',
      gap: '16px'
    },
    title: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#ef4444',
      margin: 0
    },
    navDots: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    phaseLabel: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#ef4444'
    },
    mainContent: {
      flex: 1,
      overflowY: 'auto' as const,
      paddingTop: '72px',
      paddingBottom: '80px'
    },
    bottomNav: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: '#0f172a',
      borderTop: '1px solid #334155',
      padding: '12px 24px',
      zIndex: 100,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)'
    },
    bottomNavContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '896px',
      margin: '0 auto'
    },
    card: {
      background: 'rgba(30, 41, 59, 0.8)',
      borderRadius: '16px',
      padding: '24px',
      margin: '16px',
      maxWidth: '800px',
      marginLeft: 'auto',
      marginRight: 'auto',
      border: '1px solid #334155',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    },
    button: {
      padding: '12px 24px',
      minHeight: '48px',
      borderRadius: '12px',
      border: 'none',
      fontWeight: 600,
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #ef4444, #f97316)',
      color: '#ffffff',
      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
    },
    secondaryButton: {
      background: '#334155',
      color: '#e2e8f0'
    },
    disabledButton: {
      background: '#1e293b',
      color: '#cbd5e1',
      cursor: 'not-allowed',
      opacity: 0.4
    },
    heading: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#f8fafc',
      marginBottom: '16px',
      lineHeight: 1.4
    },
    subheading: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#e2e8f0',
      marginBottom: '12px',
      lineHeight: 1.4
    },
    paragraph: {
      fontSize: '16px',
      color: '#cbd5e1',
      lineHeight: 1.6,
      marginBottom: '16px'
    },
    highlight: {
      color: '#ef4444',
      fontWeight: 600
    },
    slider: {
      width: '100%',
      height: '20px',
      touchAction: 'pan-y' as const,
      WebkitAppearance: 'none' as const,
      accentColor: '#3b82f6'
    }
  };

  // ============================================================================
  // RENDER PROGRESS BAR
  // ============================================================================

  const renderProgressBar = () => (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ ...styles.button, padding: '8px', minHeight: '36px', background: 'transparent', color: '#cbd5e1' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 style={styles.title}>Carnot Cycle</h1>
        </div>
        <div style={styles.navDots}>
          {PHASE_ORDER.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              title={phaseLabels[p]}
              style={{
                width: phase === p ? '24px' : '10px',
                height: '10px',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: phase === p
                  ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : currentPhaseIndex > i
                    ? '#10b981'
                    : '#475569',
                boxShadow: phase === p ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none'
              }}
            />
          ))}
        </div>
        <span style={styles.phaseLabel}>{phaseLabels[phase]}</span>
      </div>
    </header>
  );

  // ============================================================================
  // RENDER PV DIAGRAM
  // ============================================================================

  const renderPVDiagram = () => {
    const size = 300;
    const pad = 45;
    const w = size - 2 * pad;
    const h = size - 2 * pad;

    // Efficiency curve: plot eta vs T_H for current coldTemp
    // T_H ranges from coldTemp+50 to 1200, eta = 1 - coldTemp/T_H
    // Build an L-command path with many points for smooth appearance
    const curvePoints: { x: number; y: number }[] = [];
    const tMin = coldTemp + 50;
    const tMax = 1200;
    const numPts = 20;
    for (let i = 0; i <= numPts; i++) {
      const t = tMin + (tMax - tMin) * (i / numPts);
      const eta = 1 - coldTemp / t;
      const px = pad + (t - tMin) / (tMax - tMin) * w;
      // eta ranges ~0 to ~0.75, map to vertical: high eta = top, low eta = bottom
      const py = pad + h - eta * h;
      curvePoints.push({ x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 });
    }

    // Build path with L commands (spaces between x y)
    const curvePath = curvePoints.map((p, i) =>
      i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
    ).join(' ');

    // Interactive marker position based on hotTemp
    const markerEta = 1 - coldTemp / hotTemp;
    const markerX = pad + (hotTemp - tMin) / (tMax - tMin) * w;
    const markerY = pad + h - markerEta * h;

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '100%' }}>
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="workGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <rect width={size} height={size} fill="url(#bgGrad)" rx="16" />

          {/* Grid lines */}
          <g>
            {[1,2,3,4].map(i => (
              <React.Fragment key={i}>
                <line x1={pad + w*i/5} y1={pad} x2={pad + w*i/5} y2={size-pad} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                <line x1={pad} y1={pad + h*i/5} x2={size-pad} y2={pad + h*i/5} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
              </React.Fragment>
            ))}
          </g>

          {/* Axes */}
          <g>
            <line x1={pad} y1={pad-5} x2={pad} y2={size-pad+5} stroke="#64748b" strokeWidth="2" />
            <line x1={pad-5} y1={size-pad} x2={size-pad+5} y2={size-pad} stroke="#64748b" strokeWidth="2" />
          </g>

          {/* Shaded area under curve */}
          <path d={`${curvePath} L ${curvePoints[curvePoints.length - 1].x} ${size - pad} L ${curvePoints[0].x} ${size - pad} Z`} fill="url(#workGrad)" />

          {/* Efficiency curve (L-command path) */}
          <path d={curvePath} fill="none" stroke="#10b981" strokeWidth="3" />

          {/* Carnot limit reference line at 100% */}
          <path d={`M ${pad} ${pad} L ${pad + w} ${pad}`} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="6 3" opacity="0.4" />

          {/* Reference lines from marker to axes */}
          <g>
            <line x1={markerX} y1={markerY} x2={markerX} y2={size - pad} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <line x1={pad} y1={markerY} x2={markerX} y2={markerY} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          </g>

          {/* Interactive marker - MUST be first circle with r>=6 and filter */}
          <circle cx={markerX} cy={markerY} r={8} filter="url(#glow)" stroke="#fff" strokeWidth={2} fill="#10b981" />

          {/* Cold temperature reference circle */}
          <circle cx={pad + 5} cy={size - pad + 15} r={4} fill="#3b82f6" />
          {/* Hot temperature reference circle */}
          <circle cx={pad + w - 5} cy={pad - 15} r={4} fill="#ef4444" />

          {/* Labels */}
          <g>
            <text x={pad - 8} y={size/2} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle" transform={`rotate(-90, ${pad-8}, ${size/2})`}>Efficiency (eta)</text>
            <text x={size/2} y={size - pad + 25} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">Temperature T_H (K)</text>
            <text x={markerX + 14} y={markerY - 10} fill="#f8fafc" fontSize="12" fontWeight="bold">{efficiency}%</text>
            <text x={size - 30} y={pad + 10} fill="#ef4444" fontSize="11" fontWeight="bold">T_H = {hotTemp}K</text>
            <text x={size - 30} y={size - pad - 5} fill="#3b82f6" fontSize="11" fontWeight="bold">T_C = {coldTemp}K</text>
          </g>
        </svg>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{ ...styles.card, textAlign: 'center' as const }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '9999px',
        marginBottom: '24px'
      }}>
        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', letterSpacing: '0.05em' }}>THERMODYNAMICS</span>
      </div>

      <h1 style={{ ...styles.heading, fontSize: '32px' }}>The Perfect Engine</h1>
      <p style={{ ...styles.paragraph, fontSize: '18px', color: '#e2e8f0' }}>
        Why can't any engine convert 100% of heat into useful work?
      </p>

      <div style={{ margin: '32px 0' }}>
        <svg width="300" height="180" viewBox="0 0 300 180" style={{ maxWidth: '100%' }}>
          <defs>
            <linearGradient id="carBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id="engineGlow">
              <feGaussianBlur stdDeviation="8" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Car body */}
          <rect x="60" y="80" width="180" height="60" fill="url(#carBody)" rx="12" />
          <rect x="85" y="55" width="110" height="35" fill="#334155" rx="10" />
          <rect x="92" y="62" width="45" height="22" fill="#60a5fa" opacity="0.3" rx="4" />
          <rect x="142" y="62" width="48" height="22" fill="#60a5fa" opacity="0.3" rx="4" />

          {/* Wheels */}
          <circle cx="105" cy="140" r="22" fill="#1e293b" />
          <circle cx="105" cy="140" r="10" fill="#374151" />
          <circle cx="195" cy="140" r="22" fill="#1e293b" />
          <circle cx="195" cy="140" r="10" fill="#374151" />

          {/* Engine heat glow */}
          <circle cx="95" cy="110" r="35" fill="#ef4444" opacity="0.2" filter="url(#engineGlow)" />
          <rect x="70" y="90" width="50" height="35" fill="#ef4444" opacity="0.4" rx="5" />

          {/* Heat waves */}
          <g>
            <path d="M240,100 Q250,95 260,100 Q270,105 280,100" stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.8">
              <animate attributeName="d" values="M240,100 Q250,95 260,100 Q270,105 280,100;M240,100 Q250,105 260,100 Q270,95 280,100;M240,100 Q250,95 260,100 Q270,105 280,100" dur="1s" repeatCount="indefinite" />
            </path>
            <path d="M240,110 Q250,105 260,110 Q270,115 280,110" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6">
              <animate attributeName="d" values="M240,110 Q250,105 260,110 Q270,115 280,110;M240,110 Q250,115 260,110 Q270,105 280,110;M240,110 Q250,105 260,110 Q270,115 280,110" dur="1.2s" repeatCount="indefinite" />
            </path>
            <path d="M240,120 Q250,115 260,120 Q270,125 280,120" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.4">
              <animate attributeName="d" values="M240,120 Q250,115 260,120 Q270,125 280,120;M240,120 Q250,125 260,120 Q270,115 280,120;M240,120 Q250,115 260,120 Q270,125 280,120" dur="1.4s" repeatCount="indefinite" />
            </path>
          </g>

          {/* Fuel arrow */}
          <path d="M25,105 L55,105" stroke="#22c55e" strokeWidth="3" />
          <polygon points="55,100 55,110 65,105" fill="#22c55e" />
          <text x="10" y="90" fill="#22c55e" fontSize="11" fontWeight="600">Fuel</text>
          <text x="250" y="85" fill="#ef4444" fontSize="11" fontWeight="600">Waste Heat</text>
        </svg>
      </div>

      <p style={{ ...styles.paragraph, color: '#e2e8f0' }}>
        Your car burns gasoline at <span style={styles.highlight}>2000 degrees C</span>, but only <span style={{ color: '#f59e0b', fontWeight: 600 }}>25-30%</span> becomes motion.
      </p>
      <p style={styles.paragraph}>
        The rest? <span style={styles.highlight}>Waste heat</span> - radiator, exhaust, friction...
      </p>
      <p style={styles.paragraph}>
        Is this just bad engineering? Or is there a <span style={{ color: '#22d3ee', fontWeight: 600 }}>fundamental limit</span> nature imposes?
      </p>

      <button
        onClick={handleNext}
        style={{ ...styles.button, ...styles.primaryButton, marginTop: '24px' }}
      >
        Discover the Limit
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={styles.card}>
      <h2 style={styles.heading}>What do you think will happen?</h2>
      <p style={styles.paragraph}>{predictions.initial.question}</p>
      <p style={{ ...styles.paragraph, fontSize: '14px' }}>{predictions.initial.context}</p>

      <div style={{ margin: '24px 0', textAlign: 'center' as const }}>
        <svg width="220" height="150" viewBox="0 0 220 150" style={{ maxWidth: '100%' }}>
          <defs>
            <linearGradient id="hotRes" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="coldRes" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect x="80" y="10" width="60" height="30" fill="url(#hotRes)" rx="6" />
          <text x="110" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">HOT (T_H)</text>

          <rect x="85" y="60" width="50" height="30" fill="#64748b" rx="4" />
          <text x="110" y="80" textAnchor="middle" fill="white" fontSize="11">Engine</text>

          <rect x="80" y="110" width="60" height="30" fill="url(#coldRes)" rx="6" />
          <text x="110" y="130" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">COLD (T_C)</text>

          <path d="M110,40 L110,60" stroke="#ef4444" strokeWidth="2" />
          <polygon points="105,55 115,55 110,65" fill="#ef4444" />
          <path d="M110,90 L110,110" stroke="#3b82f6" strokeWidth="2" />
          <polygon points="105,105 115,105 110,115" fill="#3b82f6" />
          <path d="M135,75 L170,75" stroke="#22c55e" strokeWidth="2" />
          <polygon points="165,70 165,80 175,75" fill="#22c55e" />
          <text x="180" y="79" fill="#22c55e" fontSize="11" fontWeight="600">W</text>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        {predictions.initial.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handlePrediction(opt.id)}
            disabled={showPredictionFeedback}
            style={{
              ...styles.button,
              width: '100%',
              justifyContent: 'flex-start',
              textAlign: 'left' as const,
              padding: '16px',
              background: showPredictionFeedback && selectedPrediction === opt.id
                ? opt.id === predictions.initial.correct
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
                : showPredictionFeedback && opt.id === predictions.initial.correct
                ? 'rgba(16, 185, 129, 0.3)'
                : '#334155',
              border: showPredictionFeedback && (selectedPrediction === opt.id || opt.id === predictions.initial.correct)
                ? `2px solid ${opt.id === predictions.initial.correct ? '#10b981' : '#ef4444'}`
                : '2px solid transparent',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, marginRight: '12px', color: '#f8fafc' }}>{opt.id})</span>
            {opt.text}
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{ ...styles.card, marginTop: '24px', background: 'rgba(15, 23, 42, 0.8)' }}>
          <p style={{ color: selectedPrediction === predictions.initial.correct ? '#10b981' : '#f59e0b', fontWeight: 600, marginBottom: '12px' }}>
            {selectedPrediction === predictions.initial.correct ? 'Correct!' : 'Not quite!'} The answer is {predictions.initial.correct}.
          </p>
          <p style={styles.paragraph}>{predictions.initial.explanation}</p>
          <button
            onClick={handleNext}
            style={{ ...styles.button, ...styles.primaryButton, marginTop: '16px' }}
          >
            Explore the Carnot Cycle
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={styles.card}>
      <h2 style={styles.heading}>Carnot Cycle Laboratory</h2>
      <p style={styles.paragraph}>
        Observe how temperature affects the maximum possible efficiency of a heat engine.
        Adjust the hot and cold reservoir temperatures to see how efficiency changes.
        This is why engineers designing real-world power plants focus on maximizing temperature differences.
      </p>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
            {renderPVDiagram()}
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '24px',
        textAlign: 'center' as const
      }}>
        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{efficiency}%</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Max Efficiency</div>
        </div>
        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{wasteHeat}%</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Min Waste Heat</div>
        </div>
        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{hotTemp - coldTemp}K</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Temperature Difference</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>Hot Reservoir Temperature (T_H)</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>{hotTemp}K ({(hotTemp - 273).toFixed(0)} degrees C)</span>
          </div>
          <input
            type="range"
            min="400"
            max="1200"
            value={hotTemp}
            onChange={e => {
              const v = Math.max(Number(e.target.value), coldTemp + 50);
              setHotTemp(v);
              emitEvent('parameter_changed', { param: 'hotTemp', value: v });
            }}
            style={styles.slider}
          />
        </div>

        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>Cold Reservoir Temperature (T_C)</span>
            <span style={{ color: '#3b82f6', fontWeight: 700 }}>{coldTemp}K ({(coldTemp - 273).toFixed(0)} degrees C)</span>
          </div>
          <input
            type="range"
            min="200"
            max="500"
            value={coldTemp}
            onChange={e => {
              const v = Math.min(Number(e.target.value), hotTemp - 50);
              setColdTemp(v);
              emitEvent('parameter_changed', { param: 'coldTemp', value: v });
            }}
            style={styles.slider}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
        <button
          onClick={() => {
            setIsAnimating(!isAnimating);
            emitEvent(isAnimating ? 'simulation_paused' : 'simulation_started');
          }}
          style={{
            ...styles.button,
            background: isAnimating ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff'
          }}
        >
          {isAnimating ? 'Stop' : 'Run'} Cycle
        </button>
        <button
          onClick={() => { setCycleStep(0); setAnimationProgress(0); emitEvent('simulation_reset'); }}
          style={{ ...styles.button, ...styles.secondaryButton }}
        >
          Reset
        </button>
      </div>
        </div>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ ...styles.subheading, color: '#67e8f9', fontSize: '16px' }}>Current Stage: {cycleStages[cycleStep].name}</h3>
        <p style={{ ...styles.paragraph, marginBottom: '8px', fontSize: '14px' }}>{cycleStages[cycleStep].desc}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
          {cycleStages.map((stage, i) => (
            <span key={i} style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              background: i === cycleStep ? stage.color : 'rgba(100, 116, 139, 0.3)',
              color: '#ffffff'
            }}>
              {stage.symbol}
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(59, 130, 246, 0.1))', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
        <h3 style={{ ...styles.subheading, color: '#67e8f9', fontSize: '16px' }}>Carnot Efficiency Formula</h3>
        <div style={{ textAlign: 'center' as const, fontSize: '24px', fontWeight: 700, color: '#f8fafc', padding: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', fontFamily: 'monospace', marginBottom: '12px' }}>
          <span style={{ color: '#10b981' }}>eta</span> = 1 - <span style={{ color: '#3b82f6' }}>T_C</span> / <span style={{ color: '#ef4444' }}>T_H</span>
        </div>
        <p style={{ ...styles.paragraph, fontSize: '14px', marginBottom: '0' }}>
          This shows that efficiency depends ONLY on the temperatures. For 100% efficiency, T_C would need to be 0K (absolute zero) - which is impossible!
        </p>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={styles.card}>
      <h2 style={styles.heading}>Understanding the Carnot Cycle</h2>

      <p style={styles.paragraph}>
        As you observed in the experiment, efficiency depends only on temperatures. Your prediction about what determines maximum efficiency
        connects directly to Carnot's theorem - the absolute ceiling on what any heat engine can achieve.
        This explains why real-world engines always waste significant heat.
      </p>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ ...styles.subheading, color: '#ef4444' }}>The Four Stages</h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0', lineHeight: 1.8 }}>
            <li><span style={{ color: '#ef4444', fontWeight: 700 }}>Isothermal Expansion:</span> Absorb heat Q_H at constant T_H</li>
            <li><span style={{ color: '#f59e0b', fontWeight: 700 }}>Adiabatic Expansion:</span> Temperature drops, no heat transfer</li>
            <li><span style={{ color: '#3b82f6', fontWeight: 700 }}>Isothermal Compression:</span> Reject heat Q_C at constant T_C</li>
            <li><span style={{ color: '#8b5cf6', fontWeight: 700 }}>Adiabatic Compression:</span> Temperature rises, no heat transfer</li>
          </ol>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(59, 130, 246, 0.2))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(34, 211, 238, 0.3)' }}>
          <h3 style={{ ...styles.subheading, color: '#22d3ee' }}>Key Insight: Carnot's Theorem</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0', lineHeight: 1.8 }}>
            <li>No engine can exceed Carnot efficiency</li>
            <li>Efficiency depends ONLY on temperatures</li>
            <li>All reversible engines have the same efficiency</li>
            <li>Real engines are always less efficient</li>
            <li>This demonstrates the Second Law of Thermodynamics</li>
          </ul>
        </div>
      </div>

      <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ ...styles.subheading, color: '#10b981', fontSize: '16px' }}>Example Calculations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}><strong>Power Plant:</strong> T_H = 823K, T_C = 303K</p>
            <p style={{ fontFamily: 'monospace', color: '#f8fafc', marginBottom: '0' }}>eta = 1 - 303/823 = <span style={{ color: '#10b981', fontWeight: 700 }}>63.2%</span></p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}><strong>Car Engine:</strong> T_H = 600K, T_C = 350K</p>
            <p style={{ fontFamily: 'monospace', color: '#f8fafc', marginBottom: '0' }}>eta = 1 - 350/600 = <span style={{ color: '#f59e0b', fontWeight: 700 }}>41.7%</span></p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={styles.card}>
      <h2 style={{ ...styles.heading, color: '#a855f7' }}>New Variable: Running Backwards</h2>
      <p style={styles.paragraph}>{predictions.twist.question}</p>
      <p style={{ ...styles.paragraph, fontSize: '14px' }}>{predictions.twist.context}</p>

      <div style={{ margin: '24px 0', textAlign: 'center' as const }}>
        <svg width="220" height="160" viewBox="0 0 220 160" style={{ maxWidth: '100%' }}>
          <defs>
            <linearGradient id="hotResT" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="coldResT" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect x="80" y="10" width="60" height="30" fill="url(#hotResT)" rx="6" />
          <text x="110" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">HOT</text>

          <rect x="85" y="65" width="50" height="30" fill="#a855f7" rx="4" />
          <text x="110" y="84" textAnchor="middle" fill="white" fontSize="11">Reversed</text>

          <rect x="80" y="115" width="60" height="30" fill="url(#coldResT)" rx="6" />
          <text x="110" y="135" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">COLD</text>

          {/* Reversed arrows */}
          <path d="M110,65 L110,45" stroke="#ef4444" strokeWidth="2" />
          <polygon points="105,50 115,50 110,40" fill="#ef4444" />
          <path d="M110,115 L110,95" stroke="#3b82f6" strokeWidth="2" />
          <polygon points="105,100 115,100 110,90" fill="#3b82f6" />
          <path d="M170,80 L140,80" stroke="#22c55e" strokeWidth="2" />
          <polygon points="145,75 145,85 135,80" fill="#22c55e" />
          <text x="180" y="84" fill="#22c55e" fontSize="11" fontWeight="600">W in</text>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        {predictions.twist.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleTwistPrediction(opt.id)}
            disabled={showTwistFeedback}
            style={{
              ...styles.button,
              width: '100%',
              justifyContent: 'flex-start',
              textAlign: 'left' as const,
              padding: '16px',
              background: showTwistFeedback && twistPrediction === opt.id
                ? opt.id === predictions.twist.correct
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
                : showTwistFeedback && opt.id === predictions.twist.correct
                ? 'rgba(16, 185, 129, 0.3)'
                : '#334155',
              border: showTwistFeedback && (twistPrediction === opt.id || opt.id === predictions.twist.correct)
                ? `2px solid ${opt.id === predictions.twist.correct ? '#10b981' : '#ef4444'}`
                : '2px solid transparent',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, marginRight: '12px', color: '#f8fafc' }}>{opt.id})</span>
            {opt.text}
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{ ...styles.card, marginTop: '24px', background: 'rgba(15, 23, 42, 0.8)' }}>
          <p style={{ color: twistPrediction === predictions.twist.correct ? '#10b981' : '#f59e0b', fontWeight: 600, marginBottom: '12px' }}>
            {twistPrediction === predictions.twist.correct ? 'Exactly right!' : 'Not quite!'} The answer is {predictions.twist.correct}.
          </p>
          <p style={styles.paragraph}>{predictions.twist.explanation}</p>
          <button
            onClick={handleNext}
            style={{ ...styles.button, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#ffffff', marginTop: '16px' }}
          >
            Explore Heat Pumps
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={styles.card}>
      <h2 style={{ ...styles.heading, color: '#a855f7' }}>Heat Pumps and Refrigerators</h2>
      <p style={styles.paragraph}>
        Watch how the reversed Carnot cycle moves heat from cold to hot using work input.
        This is the principle behind refrigerators, air conditioners, and heat pumps.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', textAlign: 'center' as const }}>
          <h3 style={{ ...styles.subheading, color: '#3b82f6', fontSize: '16px' }}>Refrigerator</h3>
          <svg width="180" height="140" viewBox="0 0 180 140" style={{ maxWidth: '100%' }}>
            <rect x="50" y="15" width="80" height="90" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" rx="6" />
            <rect x="57" y="22" width="66" height="35" fill="#0f172a" rx="4" />
            <text x="90" y="44" textAnchor="middle" fill="#93c5fd" fontSize="11">COLD</text>
            <rect x="140" y="35" width="35" height="35" fill="rgba(239, 68, 68, 0.3)" rx="4" />
            <text x="157" y="57" textAnchor="middle" fill="#fca5a5" fontSize="11">ROOM</text>
            <path d="M90,75 L90,105" stroke="#22c55e" strokeWidth="2" />
            <polygon points="85,100 95,100 90,110" fill="#22c55e" />
            <text x="90" y="125" textAnchor="middle" fill="#22c55e" fontSize="11">Work in</text>
          </svg>
          <p style={{ ...styles.paragraph, fontSize: '12px', marginBottom: '0' }}>Removes heat from inside, dumps to room</p>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', textAlign: 'center' as const }}>
          <h3 style={{ ...styles.subheading, color: '#ef4444', fontSize: '16px' }}>Heat Pump</h3>
          <svg width="180" height="140" viewBox="0 0 180 140" style={{ maxWidth: '100%' }}>
            <circle cx="90" cy="10" r={3} fill="#ef4444" opacity="0.6" />
            <polygon points="90,15 145,45 145,100 35,100 35,45" fill="none" stroke="#ef4444" strokeWidth="2" />
            <rect x="45" y="50" width="90" height="50" fill="rgba(254, 243, 199, 0.15)" />
            <text x="90" y="80" textAnchor="middle" fill="#f59e0b" fontSize="11">WARM</text>
            <rect x="0" y="55" width="30" height="35" fill="rgba(59, 130, 246, 0.3)" rx="4" />
            <text x="15" y="77" textAnchor="middle" fill="#60a5fa" fontSize="11">COLD</text>
            <line x1="30" y1="72" x2="35" y2="72" stroke="#60a5fa" strokeWidth="2" />
            <path d="M90,115 L90,100" stroke="#22c55e" strokeWidth="2" />
            <polygon points="85,105 95,105 90,95" fill="#22c55e" />
            <text x="90" y="130" textAnchor="middle" fill="#22c55e" fontSize="11">Work in</text>
          </svg>
          <p style={{ ...styles.paragraph, fontSize: '12px', marginBottom: '0' }}>Extracts heat from cold outside, pumps inside</p>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <h3 style={{ ...styles.subheading, color: '#a855f7' }}>Coefficient of Performance (COP)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '4px' }}>Refrigerator COP</p>
            <p style={{ fontFamily: 'monospace', color: '#f8fafc', margin: 0 }}>COP = T_C / (T_H - T_C)</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
            <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>Heat Pump COP</p>
            <p style={{ fontFamily: 'monospace', color: '#f8fafc', margin: 0 }}>COP = T_H / (T_H - T_C)</p>
          </div>
        </div>
        <p style={{ ...styles.paragraph, marginBottom: '0', fontSize: '14px' }}>
          COP can exceed 1 because we are MOVING heat, not creating it. A heat pump with COP = 4 delivers 4 kW of heat for every 1 kW of electricity!
        </p>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={styles.card}>
      <h2 style={{ ...styles.heading, color: '#a855f7' }}>Deep Insight: Carnot's Dual Nature</h2>

      <div style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(168, 85, 247, 0.3)', marginBottom: '24px' }}>
        <h3 style={{ ...styles.subheading, color: '#f8fafc', textAlign: 'center' as const }}>The Same Cycle, Two Purposes!</h3>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', margin: '24px 0' }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>&#128293;</div>
            <h4 style={{ color: '#ef4444', fontWeight: 700, marginBottom: '8px' }}>Forward = Engine</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>Heat flows hot to cold</p>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px' }}>Work comes OUT</p>
            <p style={{ fontFamily: 'monospace', color: '#f8fafc' }}>eta = 1 - T_C/T_H</p>
            <p style={{ color: '#cbd5e1', fontSize: '12px' }}>Always less than 100%</p>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>&#10052;&#65039;</div>
            <h4 style={{ color: '#3b82f6', fontWeight: 700, marginBottom: '8px' }}>Backward = Heat Pump</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>Heat flows cold to hot</p>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px' }}>Work goes IN</p>
            <p style={{ fontFamily: 'monospace', color: '#f8fafc' }}>COP = T_H/(T_H - T_C)</p>
            <p style={{ color: '#cbd5e1', fontSize: '12px' }}>Can exceed 100%!</p>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <h4 style={{ color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>Why This Matters</h4>
        <p style={{ ...styles.paragraph, marginBottom: '0' }}>
          Heat pumps are 3-5x more efficient than electric heaters because they move existing heat rather than creating it.
          This is why governments worldwide are pushing heat pump adoption - same comfort, fraction of the energy!
        </p>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApplications[activeApp];
    const allAppsCompleted = completedApps.size >= realWorldApplications.length;

    return (
      <div style={styles.card}>
        <h2 style={styles.heading}>Real-World Applications</h2>
        <p style={styles.paragraph}>
          Explore how Carnot efficiency principles shape technology across industries.
          Progress: {completedApps.size} of {realWorldApplications.length} applications explored.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          {realWorldApplications.map((a, i) => (
            <button
              key={a.id}
              onClick={() => { setActiveApp(i); emitEvent('app_explored', { app: a.title }); }}
              style={{
                ...styles.button,
                padding: '8px 16px',
                minHeight: '40px',
                background: activeApp === i
                  ? 'linear-gradient(135deg, #ef4444, #f97316)'
                  : completedApps.has(i)
                  ? 'rgba(16, 185, 129, 0.3)'
                  : '#334155',
                border: completedApps.has(i) ? '2px solid #10b981' : '2px solid transparent',
                color: '#e2e8f0',
                fontSize: '14px'
              }}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        <div style={{ background: '#0f172a', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '36px' }}>{app.icon}</span>
            <div>
              <h3 style={{ ...styles.subheading, marginBottom: '4px' }}>{app.title}</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0 }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ ...styles.paragraph, fontSize: '14px' }}>{app.description}</p>

          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ color: '#f59e0b', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Physics Connection</h4>
            <p style={{ ...styles.paragraph, fontSize: '13px', marginBottom: '0' }}>{app.connection}</p>
          </div>

          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ color: '#22d3ee', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>How It Works</h4>
            <p style={{ ...styles.paragraph, fontSize: '13px', marginBottom: '0' }}>{app.howItWorks}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{ background: '#1e293b', borderRadius: '8px', padding: '12px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: '#cbd5e1' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#10b981', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Examples</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
              {app.examples.map((ex, i) => <li key={i}>{ex}</li>)}
            </ul>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#a855f7', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Key Players</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{ padding: '4px 12px', background: '#334155', borderRadius: '9999px', fontSize: '12px', color: '#e2e8f0' }}>{company}</span>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <h4 style={{ color: '#f59e0b', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Future Impact</h4>
            <p style={{ ...styles.paragraph, fontSize: '13px', marginBottom: '0' }}>{app.futureImpact}</p>
          </div>

          {!completedApps.has(activeApp) && (
            <button
              onClick={() => handleAppComplete(activeApp)}
              style={{ ...styles.button, width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', marginTop: '16px' }}
            >
              Got It - Mark as Understood
            </button>
          )}
        </div>

        {allAppsCompleted && (
          <button
            onClick={() => goToPhase('test')}
            style={{ ...styles.button, ...styles.primaryButton, width: '100%' }}
          >
            Continue to Knowledge Test
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    if (showTestResults) {
      const score = calculateScore();
      return (
        <div style={styles.card}>
          <div style={{ textAlign: 'center' as const, marginBottom: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 7 ? '&#127881;' : '&#128218;'}</div>
            <h2 style={styles.heading}>Score: {score}/10</h2>
            <p style={styles.paragraph}>
              {score >= 7
                ? "Excellent! You've mastered the Carnot cycle!"
                : 'Keep studying! Review the concepts and try again.'}
            </p>

            {score >= 7 ? (
              <button
                onClick={() => { goToPhase('mastery'); emitEvent('mastery_achieved', { score }); }}
                style={{ ...styles.button, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' }}
              >
                Claim Your Mastery Badge
              </button>
            ) : (
              <button
                onClick={() => { setShowTestResults(false); setCurrentQuestion(0); setTestAnswers(Array(10).fill(-1)); setSelectedAnswer(null); setAnswerConfirmed(false); goToPhase('review'); }}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Review and Try Again
              </button>
            )}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' as const }}>
            <h3 style={{ ...styles.subheading, fontSize: '16px' }}>Review Answers:</h3>
            {testQuestions.map((q, i) => {
              const correct = q.options[testAnswers[i]]?.correct;
              return (
                <div key={i} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  background: correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${correct ? '#10b981' : '#ef4444'}`
                }}>
                  <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '8px' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: correct ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                    {correct ? '✓ Correct!' : `✗ Your answer: ${q.options[testAnswers[i]]?.text}`}
                  </p>
                  {!correct && (
                    <p style={{ color: '#10b981', fontSize: '13px', marginBottom: '4px' }}>
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '8px' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const q = testQuestions[currentQuestion];

    return (
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ ...styles.heading, marginBottom: '0', fontSize: '20px' }}>Question {currentQuestion + 1} of 10</h2>
          <div style={{ display: 'flex', gap: '4px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i < currentQuestion ? '#10b981' : i === currentQuestion ? '#ef4444' : '#475569'
              }} />
            ))}
          </div>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#cbd5e1', fontSize: '14px', fontStyle: 'italic' }}>{q.scenario}</p>
        </div>

        <p style={{ ...styles.paragraph, color: '#f8fafc', fontWeight: 500 }}>{q.question}</p>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '16px' }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswerSelect(i)}
              disabled={answerConfirmed}
              style={{
                ...styles.button,
                width: '100%',
                justifyContent: 'flex-start',
                textAlign: 'left' as const,
                padding: '14px 16px',
                background: answerConfirmed
                  ? opt.correct
                    ? 'rgba(16, 185, 129, 0.3)'
                    : selectedAnswer === i
                    ? 'rgba(239, 68, 68, 0.3)'
                    : '#334155'
                  : selectedAnswer === i
                  ? 'linear-gradient(135deg, #ef4444, #f97316)'
                  : '#334155',
                border: answerConfirmed && (opt.correct || selectedAnswer === i)
                  ? `2px solid ${opt.correct ? '#10b981' : '#ef4444'}`
                  : selectedAnswer === i
                  ? '2px solid #ef4444'
                  : '2px solid transparent',
                color: '#e2e8f0',
                fontSize: '14px'
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>

        {!answerConfirmed && selectedAnswer !== null && (
          <button
            onClick={handleCheckAnswer}
            style={{ ...styles.button, ...styles.primaryButton, width: '100%', marginBottom: '12px' }}
          >
            Check Answer
          </button>
        )}

        {answerConfirmed && (
          <>
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
              background: q.options[selectedAnswer!]?.correct ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${q.options[selectedAnswer!]?.correct ? '#10b981' : '#ef4444'}`
            }}>
              <p style={{ color: q.options[selectedAnswer!]?.correct ? '#10b981' : '#ef4444', fontWeight: 600, marginBottom: '8px' }}>
                {q.options[selectedAnswer!]?.correct ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p style={{ ...styles.paragraph, fontSize: '14px', marginBottom: '0' }}>{q.explanation}</p>
            </div>

            <button
              onClick={handleNextQuestion}
              style={{ ...styles.button, ...styles.primaryButton, width: '100%' }}
            >
              {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          </>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ ...styles.card, textAlign: 'center' as const }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.2), rgba(245, 158, 11, 0.2))',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '24px' }}>&#128293;</div>
        <h1 style={{ ...styles.heading, fontSize: '32px' }}>Carnot Cycle Master!</h1>
        <p style={{ ...styles.paragraph, fontSize: '18px', color: '#e2e8f0' }}>
          Congratulations! You have successfully completed all phases and mastered the physics of heat engines and thermodynamic efficiency!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', margin: '32px 0' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#128200;</div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>Carnot Efficiency</p>
            <p style={{ color: '#f59e0b', fontSize: '12px', fontFamily: 'monospace' }}>eta = 1 - T_C/T_H</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#128260;</div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>Four-Step Cycle</p>
            <p style={{ color: '#22d3ee', fontSize: '12px' }}>2 isothermal + 2 adiabatic</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#10052;&#65039;</div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>Heat Pumps</p>
            <p style={{ color: '#3b82f6', fontSize: '12px' }}>COP greater than 1 (move heat!)</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#9889;</div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '4px' }}>Fundamental Limit</p>
            <p style={{ color: '#10b981', fontSize: '12px' }}>Nature's efficiency cap</p>
          </div>
        </div>

        <button
          onClick={() => goToPhase('hook')}
          style={{ ...styles.button, ...styles.secondaryButton }}
        >
          Explore Again
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Carnot Cycle"
            applications={realWorldApplications}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={styles.container}>
      {renderProgressBar()}

      <div style={styles.mainContent}>
        {renderPhase()}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav style={styles.bottomNav}>
        <div style={styles.bottomNavContent}>
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            style={{
              ...styles.button,
              ...(canGoBack ? styles.secondaryButton : styles.disabledButton)
            }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext || phase === 'test'}
            style={{
              ...styles.button,
              ...((canGoNext && phase !== 'test') ? styles.primaryButton : styles.disabledButton)
            }}
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CarnotCycleRenderer;
