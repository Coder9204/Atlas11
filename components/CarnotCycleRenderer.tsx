'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CARNOT CYCLE RENDERER - THERMODYNAMIC EFFICIENCY & HEAT ENGINES
// Premium 10-phase educational game with premium design
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Lab',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Deep Dive',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Mastery'
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
  onPhaseComplete?: (phase: Phase) => void;
  onBack?: () => void;
}

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

const predictions = {
  initial: {
    question: "In 1824, Sadi Carnot asked: What determines the MAXIMUM possible efficiency of ANY heat engine?",
    context: "A heat engine takes in heat Q_H from a hot source, converts some to useful work W, and dumps waste heat Q_C to a cold sink.",
    options: [
      { id: 'A', text: 'The type of working fluid (gas, steam, etc.)' },
      { id: 'B', text: 'The temperature difference between hot and cold reservoirs' },
      { id: 'C', text: 'How fast the engine operates' },
      { id: 'D', text: 'The size and design of the engine cylinders' }
    ],
    correct: 'B',
    explanation: "Carnot's revolutionary discovery: ONLY the temperatures matter! No matter how perfectly you engineer an engine, its maximum efficiency is determined solely by the hot and cold reservoir temperatures. This is the Carnot efficiency: η = 1 - T_C/T_H"
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
    description: 'Every thermal power plant - coal, nuclear, gas - is limited by Carnot efficiency. With steam at 550°C (823K) and cooling water at 30°C (303K), the theoretical maximum is only 63%. Real plants achieve 35-45%.',
    connection: 'Carnot efficiency η = 1 - T_C/T_H sets the absolute ceiling. Engineers spend billions trying to raise T_H (supercritical steam) or lower T_C (better cooling) to squeeze out a few more percent.',
    howItWorks: 'Fuel heats water to superheated steam (high T_H). Steam expands through turbines, doing work. Spent steam condenses in cooling towers (low T_C). The temperature difference drives everything.',
    stats: [
      { value: '63%', label: 'Carnot limit' },
      { value: '45%', label: 'Best coal plants' },
      { value: '62%', label: 'Combined cycle gas' },
      { value: '$2T', label: 'Annual fuel cost' }
    ],
    examples: [
      'Nuclear reactors (33% efficient due to safety-limited temperatures)',
      'Supercritical coal plants (45% with 600°C steam)',
      'Combined cycle gas turbines (62% using exhaust heat twice)',
      'Geothermal plants (10-20% due to low source temperature)'
    ],
    companies: ['GE Vernova', 'Siemens Energy', 'Mitsubishi Power', 'Westinghouse'],
    futureImpact: 'Supercritical CO₂ cycles operating at 700°C could push thermal efficiency beyond 50%, saving billions in fuel costs and reducing emissions by 20%.',
    color: 'from-orange-600 to-red-600'
  },
  {
    id: 'heat_pumps',
    title: 'Heat Pump Revolution',
    icon: '🏠',
    short: 'Heat Pumps',
    tagline: '300-500% heating efficiency',
    description: 'Heat pumps are reversed Carnot cycles. Instead of converting heat to work, they use work to MOVE heat from cold outside to warm inside. COP of 3-5 means 3-5 kW of heat for every 1 kW of electricity!',
    connection: 'Heat pump COP = T_H/(T_H - T_C). With indoor 20°C (293K) and outdoor 5°C (278K), ideal COP = 293/15 = 19.5! Real systems achieve 3-5 due to irreversibilities.',
    howItWorks: 'Refrigerant absorbs heat from cold outdoor air (yes, even at -15°C!), compressor raises its temperature, then it releases heat inside. The cycle reverses for cooling in summer.',
    stats: [
      { value: '3-5x', label: 'COP vs electric heat' },
      { value: '50%', label: 'Energy savings' },
      { value: '-25°C', label: 'Modern cold limit' },
      { value: '$150B', label: 'Market by 2030' }
    ],
    examples: [
      'Air-source heat pumps (most common, COP 3-4)',
      'Ground-source/geothermal (COP 4-5, stable temps)',
      'Heat pump water heaters (COP 3-4)',
      'Industrial heat pumps (up to 150°C output)'
    ],
    companies: ['Daikin', 'Mitsubishi Electric', 'Carrier', 'Bosch'],
    futureImpact: 'Heat pumps could eliminate 40% of building emissions globally. New refrigerants and compressors are pushing cold-climate performance to -30°C with COP above 2.',
    color: 'from-emerald-600 to-teal-600'
  },
  {
    id: 'car_engines',
    title: 'Internal Combustion Engines',
    icon: '🚗',
    short: 'Cars',
    tagline: 'Why 70% of your gas becomes heat',
    description: 'Your car engine burns fuel at 2000°C but only converts 25-30% to motion. The rest is waste heat - radiator, exhaust, friction. Carnot explains why: the effective temperature ratio limits efficiency.',
    connection: 'Although combustion reaches 2000°C, the working gas averages only ~600K effective T_H. With exhaust at ~350K, Carnot limit is 42%. Real engines achieve 60-70% of this.',
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
    futureImpact: 'EVs bypass heat engine limits entirely with 85-90% drivetrain efficiency. For remaining combustion engines, variable compression and waste heat recovery push toward 50%.',
    color: 'from-slate-600 to-zinc-600'
  },
  {
    id: 'refrigeration',
    title: 'Refrigeration & Cryogenics',
    icon: '❄️',
    short: 'Cooling',
    tagline: 'Moving heat the "wrong" way',
    description: 'Refrigerators, air conditioners, and cryogenic systems all use reversed heat engine cycles. They pump heat from cold to hot using work input - seemingly violating thermodynamics but actually obeying Carnot.',
    connection: 'Refrigerator COP = T_C/(T_H - T_C). For a fridge at 5°C (278K) and kitchen at 25°C (298K), ideal COP = 278/20 = 13.9. Real fridges achieve 2-4.',
    howItWorks: 'Liquid refrigerant evaporates inside (absorbs heat, gets cold), compressor raises pressure and temperature, condenser releases heat outside, expansion valve drops pressure for next cycle.',
    stats: [
      { value: '2-4', label: 'Fridge COP' },
      { value: '15%', label: 'Home electricity use' },
      { value: '-269°C', label: 'LNG temperature' },
      { value: '4K', label: 'Liquid helium' }
    ],
    examples: [
      'Home refrigerators and freezers',
      'Air conditioning (same principle, larger scale)',
      'Cryogenic cooling for MRI and quantum computers',
      'LNG ships (cool natural gas to -162°C)'
    ],
    companies: ['Carrier', 'Daikin', 'Linde', 'Air Liquide'],
    futureImpact: 'Magnetic and elastocaloric cooling may replace vapor compression, eliminating HFC refrigerants while improving efficiency by 30%. Critical for sustainable cooling as global temps rise.',
    color: 'from-blue-600 to-cyan-600'
  }
];

const testQuestions = [
  {
    scenario: "A coal power plant operates with steam at 550°C (823K) and cooling water at 30°C (303K). The plant manager wants to know the theoretical efficiency limit.",
    question: "What is the maximum possible (Carnot) efficiency?",
    options: [
      { text: "About 37% - limited by turbine design", correct: false },
      { text: "About 63% - set by temperature ratio", correct: true },
      { text: "About 85% - modern plants are very efficient", correct: false },
      { text: "100% is possible with perfect insulation", correct: false }
    ],
    explanation: "Carnot efficiency η = 1 - T_C/T_H = 1 - 303/823 = 63.2%. This is the absolute maximum regardless of engineering. Real plants achieve 35-45% due to friction, heat losses, and other irreversibilities."
  },
  {
    scenario: "An inventor claims to have built a heat engine that operates between 600K and 300K reservoirs with 60% efficiency.",
    question: "Is this claim possible according to physics?",
    options: [
      { text: "Yes - 60% is achievable with good engineering", correct: false },
      { text: "No - it exceeds the Carnot limit of 50%", correct: true },
      { text: "Yes - newer materials allow higher efficiency", correct: false },
      { text: "Need more information about the engine type", correct: false }
    ],
    explanation: "Carnot limit = 1 - 300/600 = 50%. Since 60% > 50%, this engine violates the Second Law of Thermodynamics. No amount of clever engineering can exceed the Carnot limit - it's a fundamental law of nature."
  },
  {
    scenario: "During isothermal expansion in the Carnot cycle, gas absorbs heat Q_H from the hot reservoir while expanding and doing work.",
    question: "Why does the temperature stay constant during this process?",
    options: [
      { text: "The gas is perfectly insulated", correct: false },
      { text: "Heat absorbed equals work done, so internal energy is unchanged", correct: true },
      { text: "The volume doesn't actually change", correct: false },
      { text: "Temperature can't change during expansion", correct: false }
    ],
    explanation: "For an ideal gas, internal energy U depends only on temperature. During isothermal expansion: Q_in = W_out, so ΔU = Q - W = 0. Temperature stays constant because all incoming heat is immediately converted to work output."
  },
  {
    scenario: "A heat pump heats a house (20°C inside, 0°C outside). An electric heater is 100% efficient at converting electricity to heat.",
    question: "How can a heat pump have 'efficiency' greater than 100%?",
    options: [
      { text: "It violates energy conservation temporarily", correct: false },
      { text: "It MOVES heat rather than creating it - COP measures heat delivered per work input", correct: true },
      { text: "The 100% heater measurement is wrong", correct: false },
      { text: "Heat pumps create energy from temperature differences", correct: false }
    ],
    explanation: "Heat pumps don't create heat - they move it. COP = Q_H/W can exceed 1 because you're measuring heat delivered vs work input. With COP = 4, you get 4 kW of heating for 1 kW of electricity. Energy is conserved: Q_H = W + Q_C."
  },
  {
    scenario: "An engineer wants to improve a power plant's efficiency. She can either increase T_H by 100K or decrease T_C by 100K. Current: T_H = 800K, T_C = 300K (η = 62.5%).",
    question: "Which change gives a LARGER efficiency improvement?",
    options: [
      { text: "Increasing T_H to 900K (new η = 66.7%)", correct: false },
      { text: "Decreasing T_C to 200K (new η = 75.0%)", correct: true },
      { text: "Both give exactly the same improvement", correct: false },
      { text: "Neither significantly affects efficiency", correct: false }
    ],
    explanation: "Lowering T_C has more impact! With T_H = 900K: η = 1 - 300/900 = 66.7% (+4.2%). With T_C = 200K: η = 1 - 200/800 = 75.0% (+12.5%). T_C appears in the ratio, so reducing it has outsized effect. This is why cold sinks (deep ocean, cold climates) are valuable for power plants."
  },
  {
    scenario: "A refrigerator maintains 5°C (278K) inside while the kitchen is 30°C (303K). It removes 100W of heat from the food compartment.",
    question: "What is the minimum power required to run this refrigerator?",
    options: [
      { text: "About 9W (Carnot COP = 11.1)", correct: true },
      { text: "At least 100W (you can't move heat for free)", correct: false },
      { text: "About 50W (half the cooling load)", correct: false },
      { text: "Zero - once cold, it stays cold", correct: false }
    ],
    explanation: "Refrigerator COP = T_C/(T_H - T_C) = 278/(303-278) = 278/25 = 11.1. This means ideally, moving 100W of heat requires only W = Q_C/COP = 100/11.1 = 9W. Real fridges need more (COP ~3), so actual power is ~30-40W for this cooling load."
  },
  {
    scenario: "During adiabatic expansion in the Carnot cycle, the gas does work but no heat enters or leaves the system.",
    question: "Where does the energy for this work come from?",
    options: [
      { text: "From the hot reservoir through delayed heat transfer", correct: false },
      { text: "From the internal energy of the gas - temperature drops", correct: true },
      { text: "From potential energy stored in the piston", correct: false },
      { text: "From the cold reservoir in advance", correct: false }
    ],
    explanation: "In adiabatic processes, Q = 0, so the First Law gives ΔU = -W. The gas does positive work (expands), so internal energy decreases. For an ideal gas, U ∝ T, so temperature drops. The gas literally cools itself by doing work - trading thermal energy for mechanical work."
  },
  {
    scenario: "A geothermal plant uses hot water at 150°C (423K) from underground. Cooling is to 25°C (298K) ambient air.",
    question: "Why is geothermal efficiency (10-15%) so much lower than coal plants (40%)?",
    options: [
      { text: "Geothermal heat is lower quality than combustion heat", correct: false },
      { text: "The source temperature T_H is much lower, reducing Carnot limit", correct: true },
      { text: "Water is a worse working fluid than steam", correct: false },
      { text: "Geothermal plants use older technology", correct: false }
    ],
    explanation: "Carnot limit = 1 - 298/423 = 29.5%, compared to coal's 63% (with 823K steam). Lower T_H means lower maximum efficiency. Geothermal compensates with free fuel (Earth's heat), but physics limits conversion efficiency. Binary cycle plants improve this slightly."
  },
  {
    scenario: "Your car's engine radiator and exhaust together reject about 70% of the fuel's energy as waste heat.",
    question: "Why can't engineers design an engine that wastes less heat?",
    options: [
      { text: "They could with better materials, but it's too expensive", correct: false },
      { text: "The Carnot limit fundamentally requires waste heat for any heat engine", correct: true },
      { text: "Regulations require waste heat for emissions control", correct: false },
      { text: "The heat is needed to keep the engine warm", correct: false }
    ],
    explanation: "Carnot's theorem proves that ALL heat engines must reject some heat to the cold reservoir. With effective T_H ≈ 600K and T_C ≈ 350K, the maximum efficiency is only ~42%. The remaining 58%+ MUST be rejected as heat - it's physics, not engineering. This is why EVs are fundamentally more efficient."
  },
  {
    scenario: "Two Carnot engines operate in series: Engine A between 1000K and 500K, Engine B uses A's waste heat between 500K and 300K.",
    question: "What is the combined efficiency of this two-stage system?",
    options: [
      { text: "The sum of individual efficiencies: 50% + 40% = 90%", correct: false },
      { text: "Same as a single engine from 1000K to 300K: 70%", correct: true },
      { text: "Lower due to losses at the interface between stages", correct: false },
      { text: "Higher because two engines work together", correct: false }
    ],
    explanation: "Engine A: η_A = 1 - 500/1000 = 50%. Engine B: η_B = 1 - 300/500 = 40%. Combined: η = 1 - (1-0.5)(1-0.4) = 1 - 0.3 = 70%. This equals 1 - 300/1000, the same as one engine across the full range! Carnot efficiency depends only on the extreme temperatures, not intermediate stages."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CarnotCycleRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete, onBack }) => {
  // Phase and navigation state
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
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
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);

  // Refs for debouncing
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ============================================================================
  // DESIGN SYSTEM
  // ============================================================================

  const colors = {
    primary: '#ef4444',
    primaryDark: '#dc2626',
    accent: '#3b82f6',
    secondary: '#f97316',
    success: '#10b981',
    warning: '#f59e0b',
    bgDark: '#020617',
    bgCard: '#0f172a',
    bgCardLight: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: '#334155',
    hot: '#ef4444',
    cold: '#3b82f6',
    work: '#22c55e',
  };

  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentPhase && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  const goToNextPhase = useCallback(() => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[idx + 1]);
    }
  }, [phase, goToPhase]);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const efficiency = ((1 - coldTemp / hotTemp) * 100).toFixed(1);
  const wasteHeat = (100 - parseFloat(efficiency)).toFixed(1);

  const cycleStages = [
    { name: 'Isothermal Expansion', color: '#ef4444', symbol: '1→2', desc: 'Absorb Q_H at T_H, gas expands' },
    { name: 'Adiabatic Expansion', color: '#f59e0b', symbol: '2→3', desc: 'No heat transfer, T drops to T_C' },
    { name: 'Isothermal Compression', color: '#3b82f6', symbol: '3→4', desc: 'Reject Q_C at T_C, gas compresses' },
    { name: 'Adiabatic Compression', color: '#8b5cf6', symbol: '4→1', desc: 'No heat transfer, T rises to T_H' }
  ];

  const calculateScore = () => testAnswers.reduce((s, a, i) => s + (testQuestions[i].options[a]?.correct ? 1 : 0), 0);

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

  const handleTestAnswer = (qIdx: number, aIdx: number) => {
    setTestAnswers(prev => {
      const next = [...prev];
      next[qIdx] = aIdx;
      return next;
    });
    emitEvent('test_answered', { question: qIdx, answer: aIdx });
  };

  const handleAppComplete = (idx: number) => {
    setCompletedApps(prev => new Set([...prev, idx]));
    playSound('complete');
    emitEvent('app_completed', { app: realWorldApplications[idx].title });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderProgressBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
      <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-sm font-semibold text-red-400">Carnot Cycle</span>
        </div>
        <div className="flex gap-1.5">
          {PHASE_ORDER.map((p, i) => {
            const currentIdx = PHASE_ORDER.indexOf(phase);
            const isActive = p === phase;
            const isComplete = i < currentIdx;
            return (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive ? 'w-6 bg-gradient-to-r from-red-400 to-orange-400 shadow-lg shadow-red-500/50' :
                  isComplete ? 'w-2 bg-emerald-500' : 'w-2 bg-slate-600 hover:bg-slate-500'
                }`}
                title={phaseLabels[p]}
              />
            );
          })}
        </div>
        <span className="text-sm text-slate-400 font-medium min-w-[70px] text-right">{phaseLabels[phase]}</span>
      </div>
    </div>
  );

  const renderPVDiagram = () => {
    const size = isMobile ? 260 : 300;
    const pad = 45;
    const w = size - 2 * pad;
    const h = size - 2 * pad;

    const pts = [
      { x: pad + w * 0.2, y: pad + h * 0.15 },
      { x: pad + w * 0.5, y: pad + h * 0.25 },
      { x: pad + w * 0.85, y: pad + h * 0.6 },
      { x: pad + w * 0.55, y: pad + h * 0.75 },
    ];

    const next = (cycleStep + 1) % 4;
    const prog = animationProgress / 100;
    const dotX = pts[cycleStep].x + (pts[next].x - pts[cycleStep].x) * prog;
    const dotY = pts[cycleStep].y + (pts[next].y - pts[cycleStep].y) * prog;

    return (
      <div className="relative inline-block">
        <svg width={size} height={size}>
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="hotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="coldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="workGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          <rect width={size} height={size} fill="url(#bgGrad)" rx="16" />

          {/* Grid */}
          {[1,2,3,4].map(i => (
            <React.Fragment key={i}>
              <line x1={pad + w*i/5} y1={pad} x2={pad + w*i/5} y2={size-pad} stroke="#334155" strokeWidth="0.5" opacity="0.4" />
              <line x1={pad} y1={pad + h*i/5} x2={size-pad} y2={pad + h*i/5} stroke="#334155" strokeWidth="0.5" opacity="0.4" />
            </React.Fragment>
          ))}

          {/* Work area */}
          <path
            d={`M${pts[0].x},${pts[0].y} Q${(pts[0].x+pts[1].x)/2},${pts[0].y+15} ${pts[1].x},${pts[1].y} Q${pts[1].x+30},${(pts[1].y+pts[2].y)/2} ${pts[2].x},${pts[2].y} Q${(pts[2].x+pts[3].x)/2},${pts[2].y+10} ${pts[3].x},${pts[3].y} Q${pts[3].x-20},${(pts[3].y+pts[0].y)/2} ${pts[0].x},${pts[0].y} Z`}
            fill="url(#workGrad)"
          />

          {/* Axes */}
          <line x1={pad} y1={pad-5} x2={pad} y2={size-pad+5} stroke="#64748b" strokeWidth="2" />
          <line x1={pad-5} y1={size-pad} x2={size-pad+5} y2={size-pad} stroke="#64748b" strokeWidth="2" />

          {/* Cycle paths */}
          <path d={`M${pts[0].x},${pts[0].y} Q${(pts[0].x+pts[1].x)/2},${pts[0].y+15} ${pts[1].x},${pts[1].y}`} fill="none" stroke="#ef4444" strokeWidth="3" />
          <path d={`M${pts[1].x},${pts[1].y} Q${pts[1].x+30},${(pts[1].y+pts[2].y)/2} ${pts[2].x},${pts[2].y}`} fill="none" stroke="#f59e0b" strokeWidth="3" />
          <path d={`M${pts[2].x},${pts[2].y} Q${(pts[2].x+pts[3].x)/2},${pts[2].y+10} ${pts[3].x},${pts[3].y}`} fill="none" stroke="#3b82f6" strokeWidth="3" />
          <path d={`M${pts[3].x},${pts[3].y} Q${pts[3].x-20},${(pts[3].y+pts[0].y)/2} ${pts[0].x},${pts[0].y}`} fill="none" stroke="#8b5cf6" strokeWidth="3" />

          {/* State points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="8" fill={cycleStages[i].color} stroke="white" strokeWidth="2" />
              <text x={p.x + 12} y={p.y - 8} fill="white" fontSize="12" fontWeight="bold">{i + 1}</text>
            </g>
          ))}

          {/* Animated dot */}
          {isAnimating && (
            <circle cx={dotX} cy={dotY} r="10" fill={cycleStages[cycleStep].color} stroke="white" strokeWidth="2">
              <animate attributeName="r" values="8;12;8" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Labels */}
          <text x={pad - 8} y={size/2} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, ${pad-8}, ${size/2})`}>Pressure</text>
          <text x={size/2} y={size - pad + 20} fill="#94a3b8" fontSize="11" textAnchor="middle">Volume</text>
        </svg>

        {/* Temperature labels */}
        <div className="absolute top-2 right-2 text-xs font-semibold text-red-400">T_H = {hotTemp}K</div>
        <div className="absolute bottom-8 right-2 text-xs font-semibold text-blue-400">T_C = {coldTemp}K</div>
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">THERMODYNAMICS</span>
      </div>

      <h1 style={{ fontSize: typo.title }} className="font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
        The Perfect Engine
      </h1>
      <p className="text-lg text-slate-400 max-w-xl mb-8">
        Why can't any engine convert 100% of heat into useful work?
      </p>

      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl mb-8">
        <svg width="300" height="180" className="mx-auto mb-6">
          {/* Car body */}
          <rect x="60" y="80" width="180" height="60" fill="#475569" rx="12" />
          <rect x="85" y="55" width="110" height="35" fill="#334155" rx="10" />
          <rect x="92" y="62" width="45" height="22" fill="#60a5fa" opacity="0.3" rx="4" />
          <rect x="142" y="62" width="48" height="22" fill="#60a5fa" opacity="0.3" rx="4" />

          {/* Wheels */}
          <circle cx="105" cy="140" r="22" fill="#1e293b" />
          <circle cx="105" cy="140" r="10" fill="#374151" />
          <circle cx="195" cy="140" r="22" fill="#1e293b" />
          <circle cx="195" cy="140" r="10" fill="#374151" />

          {/* Engine heat glow */}
          <circle cx="95" cy="110" r="35" fill="#ef4444" opacity="0.2" />
          <rect x="70" y="90" width="50" height="35" fill="#ef4444" opacity="0.4" rx="5" />

          {/* Heat waves */}
          <path d="M240,100 Q250,95 260,100 Q270,105 280,100" stroke="#ef4444" strokeWidth="2" fill="none" opacity="0.8">
            <animate attributeName="d" values="M240,100 Q250,95 260,100 Q270,105 280,100;M240,100 Q250,105 260,100 Q270,95 280,100;M240,100 Q250,95 260,100 Q270,105 280,100" dur="1s" repeatCount="indefinite" />
          </path>
          <path d="M240,110 Q250,105 260,110 Q270,115 280,110" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6">
            <animate attributeName="d" values="M240,110 Q250,105 260,110 Q270,115 280,110;M240,110 Q250,115 260,110 Q270,105 280,110;M240,110 Q250,105 260,110 Q270,115 280,110" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M240,120 Q250,115 260,120 Q270,125 280,120" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.4">
            <animate attributeName="d" values="M240,120 Q250,115 260,120 Q270,125 280,120;M240,120 Q250,125 260,120 Q270,115 280,120;M240,120 Q250,115 260,120 Q270,125 280,120" dur="1.4s" repeatCount="indefinite" />
          </path>

          {/* Fuel arrow */}
          <path d="M25,105 L55,105" stroke="#22c55e" strokeWidth="3" markerEnd="url(#fuelArrow)" />
          <text x="10" y="95" fill="#22c55e" fontSize="11" fontWeight="600">Fuel</text>
          <defs>
            <marker id="fuelArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p className="text-xl text-slate-300 mb-4">
          Your car burns gasoline at <span className="text-red-400 font-bold">2000°C</span>, but only <span className="text-amber-400 font-bold">25-30%</span> becomes motion.
        </p>
        <p className="text-lg text-slate-400 mb-4">
          The rest? <span className="text-red-400 font-semibold">Waste heat</span> - radiator, exhaust, friction...
        </p>
        <p className="text-slate-500">
          Is this just bad engineering? Or is there a <span className="text-cyan-400 font-semibold">fundamental limit</span> nature imposes?
        </p>
      </div>

      <button
        onClick={goToNextPhase}
        className="group px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="flex items-center gap-2">
          Discover the Limit
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[550px] p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6">Make Your Prediction</h2>

      <div className="bg-slate-800/60 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">{predictions.initial.question}</p>
        <p className="text-sm text-slate-400 mb-4">{predictions.initial.context}</p>

        <svg width="220" height="130" className="mx-auto">
          <rect x="80" y="10" width="60" height="28" fill="#ef4444" rx="6" />
          <text x="110" y="29" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">HOT (T_H)</text>

          <rect x="85" y="52" width="50" height="28" fill="#64748b" rx="4" />
          <text x="110" y="70" textAnchor="middle" fill="white" fontSize="10">Engine</text>

          <rect x="80" y="95" width="60" height="28" fill="#3b82f6" rx="6" />
          <text x="110" y="114" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">COLD (T_C)</text>

          <path d="M110,38 L110,52" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrH)" />
          <path d="M110,80 L110,95" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrC)" />
          <path d="M135,66 L165,66" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrW)" />
          <text x="175" y="70" fill="#22c55e" fontSize="11" fontWeight="600">W</text>

          <defs>
            <marker id="arrH" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#ef4444" /></marker>
            <marker id="arrC" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" /></marker>
            <marker id="arrW" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#22c55e" /></marker>
          </defs>
        </svg>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {predictions.initial.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handlePrediction(opt.id)}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === opt.id
                ? opt.id === predictions.initial.correct
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && opt.id === predictions.initial.correct
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{opt.id}.</span>
            <span className="text-slate-200 ml-2">{opt.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-5 bg-slate-800/80 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold mb-2">
            {selectedPrediction === predictions.initial.correct ? 'Correct!' : 'Not quite!'} The answer is {predictions.initial.correct}.
          </p>
          <p className="text-slate-300 text-sm">{predictions.initial.explanation}</p>
          <button
            onClick={goToNextPhase}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Explore the Carnot Cycle
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-4">Carnot Cycle Laboratory</h2>

      <div className="bg-slate-800/60 rounded-2xl p-5 mb-5">
        {renderPVDiagram()}

        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-slate-400">Current Stage</div>
          <div className="text-lg font-bold mt-1" style={{ color: cycleStages[cycleStep].color }}>
            {cycleStages[cycleStep].name}
          </div>
          <div className="text-sm text-slate-500 mt-1">{cycleStages[cycleStep].desc}</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-400">{efficiency}%</div>
            <div className="text-xs text-slate-400">Max Efficiency</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">{wasteHeat}%</div>
            <div className="text-xs text-slate-400">Min Waste Heat</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">{hotTemp - coldTemp}K</div>
            <div className="text-xs text-slate-400">Temp Diff</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 w-full max-w-xl mb-5">
        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Hot Reservoir (T_H)</span>
            <span className="text-red-400 font-bold">{hotTemp}K ({(hotTemp - 273).toFixed(0)}°C)</span>
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
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-slate-300">Cold Reservoir (T_C)</span>
            <span className="text-blue-400 font-bold">{coldTemp}K ({(coldTemp - 273).toFixed(0)}°C)</span>
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
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            setIsAnimating(!isAnimating);
            emitEvent(isAnimating ? 'simulation_paused' : 'simulation_started');
          }}
          className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
          } text-white`}
        >
          {isAnimating ? 'Stop' : 'Run'} Cycle
        </button>
        <button
          onClick={() => { setCycleStep(0); setAnimationProgress(0); emitEvent('simulation_reset'); }}
          className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-semibold transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-xl mb-6">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Carnot Efficiency Formula</h3>
        <div className="text-center text-2xl text-white mb-3 font-mono bg-slate-900/50 rounded-lg py-3">
          η = 1 - T<sub>C</sub> / T<sub>H</sub>
        </div>
        <ul className="text-sm text-slate-300 space-y-1">
          <li><strong>η</strong> = Efficiency (0 to 1)</li>
          <li><strong>T_H</strong> = Hot reservoir temperature (Kelvin)</li>
          <li><strong>T_C</strong> = Cold reservoir temperature (Kelvin)</li>
        </ul>
        <p className="text-amber-400 text-sm mt-3">For 100% efficiency, T_C would need to be 0K (absolute zero) - impossible!</p>
      </div>

      <button
        onClick={goToNextPhase}
        className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-6">Understanding the Carnot Cycle</h2>

      <div className="grid md:grid-cols-2 gap-5 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-red-400 mb-3">The Four Stages</h3>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><span className="text-red-400 font-bold">1.</span> Isothermal Expansion: Absorb Q_H at T_H</li>
            <li className="flex gap-2"><span className="text-amber-400 font-bold">2.</span> Adiabatic Expansion: T drops, no heat transfer</li>
            <li className="flex gap-2"><span className="text-blue-400 font-bold">3.</span> Isothermal Compression: Reject Q_C at T_C</li>
            <li className="flex gap-2"><span className="text-purple-400 font-bold">4.</span> Adiabatic Compression: T rises, no heat transfer</li>
          </ol>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-2xl p-5">
          <h3 className="text-lg font-bold text-cyan-400 mb-3">Carnot's Theorem</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>No engine can exceed Carnot efficiency</li>
            <li>Efficiency depends ONLY on temperatures</li>
            <li>All reversible engines have same efficiency</li>
            <li>Real engines are always less efficient</li>
            <li>This led to the 2nd Law of Thermodynamics</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-5 md:col-span-2">
          <h3 className="text-lg font-bold text-emerald-400 mb-3">Example Calculations</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-slate-300"><strong>Power Plant:</strong> T_H = 823K, T_C = 303K</p>
              <p className="font-mono text-white mt-1">η = 1 - 303/823 = <span className="text-emerald-400">63.2%</span></p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-slate-300"><strong>Car Engine:</strong> T_H = 600K, T_C = 350K</p>
              <p className="font-mono text-white mt-1">η = 1 - 350/600 = <span className="text-amber-400">41.7%</span></p>
            </div>
          </div>
          <p className="text-cyan-400 mt-3 text-sm">Real engines achieve 60-80% of Carnot efficiency due to friction, heat losses, and irreversibilities.</p>
        </div>
      </div>

      <button
        onClick={goToNextPhase}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[550px] p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-purple-400 mb-6">Running Backwards</h2>

      <div className="bg-slate-800/60 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">{predictions.twist.question}</p>
        <p className="text-sm text-slate-400 mb-4">{predictions.twist.context}</p>

        <svg width="220" height="150" className="mx-auto">
          <rect x="80" y="10" width="60" height="28" fill="#ef4444" rx="6" />
          <text x="110" y="29" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">HOT</text>

          <rect x="85" y="60" width="50" height="28" fill="#a855f7" rx="4" />
          <text x="110" y="78" textAnchor="middle" fill="white" fontSize="9">Reversed</text>

          <rect x="80" y="105" width="60" height="28" fill="#3b82f6" rx="6" />
          <text x="110" y="124" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">COLD</text>

          <path d="M110,60 L110,38" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrHT)" />
          <path d="M110,105 L110,88" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrCT)" />
          <path d="M165,74 L135,74" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrWT)" />
          <text x="175" y="78" fill="#22c55e" fontSize="11" fontWeight="600">W in</text>

          <defs>
            <marker id="arrHT" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#ef4444" /></marker>
            <marker id="arrCT" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" /></marker>
            <marker id="arrWT" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#22c55e" /></marker>
          </defs>
        </svg>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {predictions.twist.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleTwistPrediction(opt.id)}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === opt.id
                ? opt.id === predictions.twist.correct
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && opt.id === predictions.twist.correct
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{opt.id}.</span>
            <span className="text-slate-200 ml-2">{opt.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-5 bg-slate-800/80 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold mb-2">
            {twistPrediction === predictions.twist.correct ? 'Exactly right!' : 'Not quite!'} The answer is {predictions.twist.correct}.
          </p>
          <p className="text-slate-300 text-sm">{predictions.twist.explanation}</p>
          <button
            onClick={goToNextPhase}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Explore Heat Pumps
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-purple-400 mb-5">Heat Pumps & Refrigerators</h2>

      <div className="grid md:grid-cols-2 gap-5 mb-6 max-w-3xl">
        <div className="bg-slate-800/60 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-blue-400 mb-3 text-center">Refrigerator</h3>
          <svg width="180" height="140" className="mx-auto">
            <rect x="50" y="15" width="80" height="90" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" rx="6" />
            <rect x="57" y="22" width="66" height="35" fill="#0f172a" rx="4" />
            <text x="90" y="44" textAnchor="middle" fill="#93c5fd" fontSize="10">COLD</text>
            <rect x="140" y="35" width="30" height="35" fill="#ef4444" opacity="0.3" rx="4" />
            <text x="155" y="57" textAnchor="middle" fill="#fca5a5" fontSize="9">ROOM</text>
            <path d="M90,75 L90,115" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrGR)" />
            <text x="90" y="130" textAnchor="middle" fill="#22c55e" fontSize="9">Work in</text>
            <path d="M125,42 L145,48" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 2" />
            <defs><marker id="arrGR" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#22c55e" /></marker></defs>
          </svg>
          <p className="text-slate-400 text-xs text-center mt-2">Removes heat from inside, dumps to room</p>
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-red-400 mb-3 text-center">Heat Pump</h3>
          <svg width="180" height="140" className="mx-auto">
            <polygon points="90,15 145,45 145,100 35,100 35,45" fill="none" stroke="#ef4444" strokeWidth="2" />
            <rect x="45" y="50" width="90" height="50" fill="#fef3c7" opacity="0.15" />
            <text x="90" y="80" textAnchor="middle" fill="#f59e0b" fontSize="10">WARM</text>
            <rect x="0" y="55" width="30" height="35" fill="#3b82f6" opacity="0.3" rx="4" />
            <text x="15" y="77" textAnchor="middle" fill="#60a5fa" fontSize="9">COLD</text>
            <path d="M90,115 L90,100" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrGH)" />
            <text x="90" y="130" textAnchor="middle" fill="#22c55e" fontSize="9">Work in</text>
            <path d="M30,72 L40,72" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 2" />
            <defs><marker id="arrGH" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><path d="M0,0 L0,4 L6,2 z" fill="#22c55e" /></marker></defs>
          </svg>
          <p className="text-slate-400 text-xs text-center mt-2">Extracts heat from cold outside, pumps inside</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-5 max-w-2xl mb-6">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Coefficient of Performance (COP)</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-blue-400 font-semibold">Refrigerator COP</p>
            <p className="font-mono text-white">COP = T_C / (T_H - T_C)</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-red-400 font-semibold">Heat Pump COP</p>
            <p className="font-mono text-white">COP = T_H / (T_H - T_C)</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm">COP can exceed 1 because we're MOVING heat, not creating it. A heat pump with COP = 4 delivers 4 kW of heat for every 1 kW of electricity!</p>
      </div>

      <button
        onClick={goToNextPhase}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        Deep Dive
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-purple-400 mb-6">Key Discovery: Carnot's Dual Nature</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-white mb-4">The Same Cycle, Two Purposes!</h3>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🔥</div>
            <h4 className="text-red-400 font-bold mb-2">Forward = Engine</h4>
            <p className="text-sm text-slate-300">Heat flows hot to cold</p>
            <p className="text-sm text-slate-400">Work comes OUT</p>
            <p className="font-mono text-white mt-2">η = 1 - T_C/T_H</p>
            <p className="text-xs text-slate-500">Always less than 100%</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">❄️</div>
            <h4 className="text-blue-400 font-bold mb-2">Backward = Heat Pump</h4>
            <p className="text-sm text-slate-300">Heat flows cold to hot</p>
            <p className="text-sm text-slate-400">Work goes IN</p>
            <p className="font-mono text-white mt-2">COP = T_H/(T_H - T_C)</p>
            <p className="text-xs text-slate-500">Can exceed 100%!</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4">
          <p className="text-emerald-400 font-semibold mb-2">Why This Matters</p>
          <p className="text-slate-300 text-sm">
            Heat pumps are 3-5x more efficient than electric heaters because they move existing heat rather than creating it.
            This is why governments worldwide are pushing heat pump adoption - same comfort, fraction of the energy!
          </p>
        </div>
      </div>

      <button
        onClick={goToNextPhase}
        className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-5">Real-World Applications</h2>

      <div className="flex gap-2 mb-5 flex-wrap justify-center">
        {realWorldApplications.map((app, i) => (
          <button
            key={app.id}
            onClick={() => { setActiveApp(i); emitEvent('app_explored', { app: app.title }); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeApp === i
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(i)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {isMobile ? '' : app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/60 rounded-2xl p-5 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{realWorldApplications[activeApp].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{realWorldApplications[activeApp].title}</h3>
            <p className="text-sm text-slate-400">{realWorldApplications[activeApp].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{realWorldApplications[activeApp].description}</p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-orange-400 mb-2">Physics Connection</h4>
          <p className="text-sm text-slate-300">{realWorldApplications[activeApp].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">How It Works</h4>
          <p className="text-sm text-slate-300">{realWorldApplications[activeApp].howItWorks}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {realWorldApplications[activeApp].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Examples</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            {realWorldApplications[activeApp].examples.map((ex, i) => (
              <li key={i}>• {ex}</li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-2">Key Players</h4>
          <div className="flex flex-wrap gap-2">
            {realWorldApplications[activeApp].companies.map((company, i) => (
              <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{company}</span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-amber-400 mb-1">Future Impact</h4>
          <p className="text-sm text-slate-300">{realWorldApplications[activeApp].futureImpact}</p>
        </div>

        {!completedApps.has(activeApp) && (
          <button
            onClick={() => handleAppComplete(activeApp)}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {realWorldApplications.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/{realWorldApplications.length}</span>
      </div>

      {completedApps.size >= realWorldApplications.length && (
        <button
          onClick={goToNextPhase}
          className="mt-5 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 style={{ fontSize: typo.heading }} className="font-bold text-white mb-5">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-5 max-w-2xl w-full">
          {testQuestions.map((q, qIdx) => (
            <div key={qIdx} className="bg-slate-800/60 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-slate-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">{qIdx + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleTestAnswer(qIdx, oIdx)}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIdx] === oIdx
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              setShowTestResults(true);
              playSound('complete');
              emitEvent('test_completed', { score: calculateScore(), total: testQuestions.length });
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:opacity-90'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/60 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? "Excellent! You've mastered the Carnot cycle!"
                : 'Keep studying! Review the concepts and try again.'}
            </p>

            {calculateScore() >= 7 ? (
              <button
                onClick={() => { goToNextPhase(); emitEvent('mastery_achieved', { score: calculateScore() }); }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Claim Your Mastery Badge
              </button>
            ) : (
              <button
                onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Review & Try Again
              </button>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Review Answers:</h4>
            {testQuestions.map((q, i) => {
              const correct = q.options[testAnswers[i]]?.correct;
              return (
                <div key={i} className={`p-4 rounded-xl ${correct ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-red-900/30 border border-red-700'}`}>
                  <p className="text-sm text-slate-300 mb-2">{i + 1}. {q.question}</p>
                  <p className={`text-sm font-medium ${correct ? 'text-emerald-400' : 'text-red-400'}`}>
                    {correct ? 'Correct!' : `Your answer: ${q.options[testAnswers[i]]?.text}`}
                  </p>
                  {!correct && (
                    <p className="text-sm text-emerald-400 mt-1">
                      Correct: {q.options.find(o => o.correct)?.text}
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
    <div className="flex flex-col items-center justify-center min-h-[550px] p-6 text-center">
      <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-8 max-w-2xl border border-red-500/20">
        <div className="text-8xl mb-6">🔥</div>
        <h1 className="text-3xl font-bold text-white mb-4">Carnot Cycle Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of heat engines and thermodynamic efficiency!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-slate-300">Carnot Efficiency</p>
            <p className="text-xs text-orange-400 font-mono">η = 1 - T_C/T_H</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Four-Step Cycle</p>
            <p className="text-xs text-cyan-400">2 isothermal + 2 adiabatic</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">❄️</div>
            <p className="text-sm text-slate-300">Heat Pumps</p>
            <p className="text-xs text-blue-400">COP &gt; 1 (move heat!)</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Fundamental Limit</p>
            <p className="text-xs text-emerald-400">Nature's efficiency cap</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
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
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

      {renderProgressBar()}

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default CarnotCycleRenderer;
