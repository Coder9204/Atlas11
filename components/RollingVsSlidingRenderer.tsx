'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// ROLLING VS SLIDING RENDERER - Complete 10-Phase Learning Game
// Discover why rolling friction is much less than sliding friction
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

interface RollingVsSlidingRendererProps {
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
// TEST QUESTIONS
// ============================================================================
const testQuestions = [
  {
    scenario: "A factory needs to move a 500kg crate across a warehouse floor. They can either drag it on its flat bottom or put wheels under it.",
    question: "Why does using wheels require significantly less force to move the crate?",
    options: [
      { id: 'a', label: "Wheels reduce the weight of the crate" },
      { id: 'b', label: "Rolling friction is much smaller than sliding friction", correct: true },
      { id: 'c', label: "Wheels add mechanical advantage through leverage" },
      { id: 'd', label: "Wheels reduce air resistance" }
    ],
    explanation: "Rolling friction (μ_r ≈ 0.001-0.02) is typically 10-100 times smaller than sliding friction (μ_s ≈ 0.2-0.7). Wheels minimize the contact surface that experiences friction, making movement dramatically easier."
  },
  {
    scenario: "An ancient Egyptian engineer proposes using log rollers instead of dragging stones across sand to build pyramids.",
    question: "What is the primary physics advantage of this approach?",
    options: [
      { id: 'a', label: "Logs are stronger than ropes" },
      { id: 'b', label: "Rolling replaces high sliding friction with much lower rolling friction", correct: true },
      { id: 'c', label: "Logs distribute weight over a larger area" },
      { id: 'd', label: "Logs create a smoother surface" }
    ],
    explanation: "The coefficient of rolling friction for a log on sand (≈0.06-0.1) is much lower than sliding friction of stone on sand (≈0.4-0.6). This means 4-10× less force is needed to move the same weight."
  },
  {
    scenario: "A car's wheels are rotating as it drives at constant speed on a highway. The tire tread is in contact with the road.",
    question: "What type of friction exists at the contact point between a rolling tire and the road?",
    options: [
      { id: 'a', label: "Kinetic (sliding) friction, because the car is moving" },
      { id: 'b', label: "Static friction, because the contact point is momentarily stationary", correct: true },
      { id: 'c', label: "Rolling friction, which is a type of kinetic friction" },
      { id: 'd', label: "No friction, because the wheel is round" }
    ],
    explanation: "In pure rolling motion, the contact point between tire and road is instantaneously stationary. Static friction provides grip without sliding. Sliding only occurs during braking (skidding) or acceleration (wheel spin)."
  },
  {
    scenario: "A sled with smooth metal runners slides down an icy hill. A identical sled is modified with wheels on the same hill.",
    question: "Assuming the same slope angle, which will reach the bottom first?",
    options: [
      { id: 'a', label: "The wheeled sled, because rolling friction is lower", correct: true },
      { id: 'b', label: "The sliding sled, because wheels add rotational inertia" },
      { id: 'c', label: "They'll arrive at the same time" },
      { id: 'd', label: "The sliding sled, because it's more streamlined" }
    ],
    explanation: "Rolling friction (μ_r ≈ 0.002 for bearings on ice) is much lower than sliding friction (μ_s ≈ 0.02-0.05 for metal on ice). Despite rotational inertia, the wheeled sled experiences less friction force and accelerates faster."
  },
  {
    scenario: "Ball bearings are used in electric motors, bicycle wheels, and hard drives to reduce friction between rotating shafts and stationary housings.",
    question: "How do ball bearings reduce friction compared to a shaft rotating in a sleeve?",
    options: [
      { id: 'a', label: "They replace sliding friction with much lower rolling friction", correct: true },
      { id: 'b', label: "They eliminate friction entirely" },
      { id: 'c', label: "They lubricate the shaft automatically" },
      { id: 'd', label: "They reduce the contact surface area" }
    ],
    explanation: "Ball bearings convert sliding friction (shaft rubbing against sleeve) into rolling friction (balls rolling in races). This can reduce friction by 90-99%, crucial for high-speed applications like hard drives spinning at 7200+ RPM."
  },
  {
    scenario: "A physics student pushes a 50kg box across a floor. The coefficient of static friction is 0.6, and kinetic friction is 0.4.",
    question: "What happens to the friction force once the box starts moving?",
    options: [
      { id: 'a', label: "It stays the same" },
      { id: 'b', label: "It drops from 294N to 196N (static to kinetic)", correct: true },
      { id: 'c', label: "It increases due to momentum" },
      { id: 'd', label: "It drops to zero once in motion" }
    ],
    explanation: "Static friction f_s = μ_s × N = 0.6 × (50kg × 9.8m/s²) = 294N. Once moving, kinetic friction f_k = 0.4 × 490N = 196N. This is why it's harder to start pushing than to keep pushing - a 33% reduction in friction."
  },
  {
    scenario: "A car traveling at 60 km/h suddenly brakes hard. The wheels lock up and the car skids to a stop.",
    question: "Why does locking the wheels (skidding) increase the stopping distance compared to rolling wheels with ABS brakes?",
    options: [
      { id: 'a', label: "Skidding creates heat that reduces friction" },
      { id: 'b', label: "Kinetic friction (skidding) is lower than static friction (rolling with grip)", correct: true },
      { id: 'c', label: "Locked wheels reduce contact area" },
      { id: 'd', label: "ABS brakes apply more force" }
    ],
    explanation: "Kinetic friction (μ_k ≈ 0.6) during skidding is lower than static friction (μ_s ≈ 0.8-0.9) when wheels roll with grip. ABS prevents wheel lockup, maintaining static friction for maximum braking force and shorter stopping distances."
  },
  {
    scenario: "A marble and a hockey puck are both given the same initial push across a smooth floor.",
    question: "Why does the marble roll much farther than the puck slides?",
    options: [
      { id: 'a', label: "The marble is heavier" },
      { id: 'b', label: "Rolling friction of the marble is much less than sliding friction of the puck", correct: true },
      { id: 'c', label: "The marble has more initial energy" },
      { id: 'd', label: "The puck has more air resistance" }
    ],
    explanation: "The marble experiences rolling friction (μ_r ≈ 0.002), while the puck experiences sliding friction (μ_s ≈ 0.1-0.2). The rolling friction is 50-100× smaller, so the marble decelerates much more slowly and travels farther."
  },
  {
    scenario: "Luggage manufacturers switched from dragging suitcases to using small wheels in the 1970s, revolutionizing travel.",
    question: "Approximately how much force reduction do wheels provide for a 20kg suitcase on smooth pavement?",
    options: [
      { id: 'a', label: "About 10× reduction (from ~100N dragging to ~10N rolling)" },
      { id: 'b', label: "About 50× reduction (from ~100N dragging to ~2N rolling)", correct: true },
      { id: 'c', label: "About 2× reduction (from ~100N to ~50N)" },
      { id: 'd', label: "No significant difference" }
    ],
    explanation: "Sliding friction: f = 0.5 × 196N = 98N. Rolling friction: f = 0.01 × 196N ≈ 2N. That's a 50× reduction! This is why wheeled luggage became so popular - it's dramatically easier to pull."
  },
  {
    scenario: "Engineers design high-speed trains with steel wheels on steel rails rather than rubber tires on concrete.",
    question: "Why is steel-on-steel preferable for trains despite having lower traction than rubber-on-concrete?",
    options: [
      { id: 'a', label: "Steel is cheaper than rubber" },
      { id: 'b', label: "Steel-on-steel has much lower rolling friction for energy efficiency at high speeds", correct: true },
      { id: 'c', label: "Steel wheels last longer" },
      { id: 'd', label: "Steel is safer in rain" }
    ],
    explanation: "Steel-on-steel rolling friction (μ_r ≈ 0.001-0.002) is 5-10× lower than rubber-on-concrete (μ_r ≈ 0.01-0.02). At high speeds, this translates to massive energy savings. The trade-off is lower acceleration/braking due to reduced traction."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS
// ============================================================================
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Anti-lock Braking Systems (ABS)',
    short: 'Preventing wheel lockup for maximum braking force',
    tagline: 'Static friction stops you faster than skidding',
    description: 'ABS prevents wheels from locking during emergency braking, maintaining static friction between tires and road. This maximizes stopping force and preserves steering control.',
    connection: 'When wheels lock and skid, kinetic friction (μ_k ≈ 0.6) takes over - lower than static friction (μ_s ≈ 0.8-0.9) when wheels roll with grip. ABS rapidly pulses brakes 15-20 times per second to keep wheels at optimal slip.',
    howItWorks: 'Wheel speed sensors detect when a wheel is about to lock. The ABS module rapidly releases and reapplies brake pressure, keeping the wheel rolling while maintaining maximum friction. Steering input remains effective because static friction provides directional control.',
    stats: [
      { value: '15-20', label: 'Pulses/Second', icon: '⚡' },
      { value: '30%', label: 'Shorter Stops', icon: '🛑' },
      { value: '0.8', label: 'Static μ_s', icon: '🔢' }
    ],
    examples: ['Emergency braking in rain', 'Preventing skids on ice', 'Maintaining steering during panic stops', 'Threshold braking for race cars'],
    companies: ['Bosch', 'Continental', 'Brembo', 'ZF'],
    futureImpact: 'Advanced ABS integrates with autonomous driving systems, predicting optimal braking patterns based on road conditions detected by cameras and radar. Brake-by-wire systems will enable even faster response times than hydraulic ABS.',
    color: '#3B82F6'
  },
  {
    icon: '⚙️',
    title: 'Ball Bearings in Machinery',
    short: 'Replacing sliding with rolling for 99% friction reduction',
    tagline: 'The hidden heroes of every spinning machine',
    description: 'Ball bearings convert sliding friction into rolling friction in rotating machinery. Found in everything from hard drives to wind turbines, they enable smooth, efficient rotation at high speeds with minimal energy loss.',
    connection: 'A shaft rotating in a plain sleeve bearing experiences sliding friction (μ_s ≈ 0.15-0.3 even with oil). Ball bearings replace this with rolling friction (μ_r ≈ 0.001-0.002), reducing friction by 99% or more.',
    howItWorks: 'Steel balls roll in precision-ground races between inner and outer rings. As the shaft rotates, balls roll rather than slide, converting sliding contact into rolling contact. Lubrication further reduces the small amount of rolling resistance.',
    stats: [
      { value: '99%', label: 'Friction Reduction', icon: '📉' },
      { value: '0.001', label: 'Rolling μ_r', icon: '🔢' },
      { value: '50,000+', label: 'RPM Capable', icon: '🌀' }
    ],
    examples: ['Computer hard drive spindles (7200 RPM)', 'Electric motor shafts', 'Bicycle wheel hubs', 'Skateboard wheels', 'Wind turbine generators'],
    companies: ['SKF', 'NSK', 'Timken', 'NTN', 'Schaeffler'],
    futureImpact: 'Ceramic bearings offer even lower friction and higher temperature resistance for aerospace applications. Magnetic bearings eliminate contact entirely for ultra-high-speed turbomachinery, though they require active control systems.',
    color: '#8B5CF6'
  },
  {
    icon: '🛞',
    title: 'Tire Design & Traction Control',
    short: 'Balancing grip and efficiency through friction engineering',
    tagline: 'The only contact between your car and the road',
    description: 'Tire engineers optimize the balance between traction (high static friction for acceleration/braking) and fuel efficiency (low rolling friction for cruising). Tread patterns, rubber compounds, and tire pressure all affect this trade-off.',
    connection: 'In pure rolling, the tire contact patch experiences static friction (no sliding). But during acceleration, braking, or cornering, some slip occurs. Traction control systems prevent excessive slip that would transition to lower kinetic friction.',
    howItWorks: 'Soft rubber compounds increase static friction (μ_s ≈ 0.9-1.0) for grip but also increase rolling resistance. Harder compounds reduce rolling friction (μ_r ≈ 0.01-0.015) for efficiency. Tread patterns channel water to maintain contact and prevent hydroplaning.',
    stats: [
      { value: '0.9', label: 'Dry Grip μ_s', icon: '🏎️' },
      { value: '0.012', label: 'Rolling μ_r', icon: '⚡' },
      { value: '20%', label: 'Fuel from Tires', icon: '⛽' }
    ],
    examples: ['Performance tires (high grip, high wear)', 'Eco tires (low rolling resistance)', 'Winter tires (soft in cold)', 'Rain tires (channel water)'],
    companies: ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Pirelli'],
    futureImpact: 'Smart tires with embedded sensors will adjust pressure and tread stiffness in real-time. Non-pneumatic tires eliminate rolling resistance from air compression. Adaptive compounds could change properties based on temperature and road conditions.',
    color: '#10B981'
  },
  {
    icon: '🏭',
    title: 'Conveyor Belt Systems',
    short: 'Moving tons of material efficiently with rolling friction',
    tagline: 'The arteries of modern manufacturing',
    description: 'Conveyor systems use rolling friction (belt rolling over idler rollers) to transport materials with minimal energy. Found in airports, warehouses, mines, and factories, they can move thousands of tons per hour.',
    connection: 'Instead of dragging materials across surfaces (high sliding friction μ_s ≈ 0.3-0.5), conveyors use rotating rollers (rolling friction μ_r ≈ 0.002-0.005). For a 1000kg load, this reduces friction force from ~4000N to ~20N - a 200× reduction.',
    howItWorks: 'A motorized drive roller pulls a continuous belt. Free-spinning idler rollers support the belt from underneath. The belt experiences rolling friction as it moves over the rollers, while materials on top move with static friction (no sliding relative to belt).',
    stats: [
      { value: '200×', label: 'Force Reduction', icon: '💪' },
      { value: '10,000', label: 'Tons/Hour', icon: '📦' },
      { value: '0.003', label: 'Typical μ_r', icon: '🔢' }
    ],
    examples: ['Airport baggage handling', 'Amazon warehouse sorting', 'Coal mine transport', 'Automotive assembly lines', 'Grocery store checkout'],
    companies: ['Siemens', 'Honeywell', 'Daifuku', 'Dematic', 'Vanderlande'],
    futureImpact: 'Magnetic levitation conveyors eliminate contact friction entirely for ultra-clean environments (semiconductor fabs). AI-optimized routing will dynamically adjust conveyor speeds to minimize energy while meeting throughput targets.',
    color: '#F59E0B'
  }
];

const RollingVsSlidingRenderer: React.FC<RollingVsSlidingRendererProps> = ({
  onGameEvent,
  gamePhase
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase());
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Simulation state
  const [mass, setMass] = useState(50); // kg
  const [force, setForce] = useState(100); // N
  const [surfaceType, setSurfaceType] = useState<'concrete' | 'ice'>('concrete');
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Twist simulation state
  const [twistForce, setTwistForce] = useState(0); // N
  const [twistMass, setTwistMass] = useState(30); // kg
  const [hasStartedTwist, setHasStartedTwist] = useState(false);

  // Transfer state
  const [currentApp, setCurrentApp] = useState(0);
  const [viewedApps, setViewedApps] = useState<Set<number>>(new Set());

  // Test state
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showTestResults, setShowTestResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // ============================================================================
  // PHYSICS CALCULATIONS
  // ============================================================================

  const getFrictionCoefficients = (surface: 'concrete' | 'ice') => {
    if (surface === 'concrete') {
      return {
        sliding: 0.4,
        rolling: 0.01,
        static: 0.5,
        kinetic: 0.3
      };
    } else {
      return {
        sliding: 0.05,
        rolling: 0.002,
        static: 0.1,
        kinetic: 0.04
      };
    }
  };

  const calculateFrictionForce = (mass: number, mu: number) => {
    return mass * 9.8 * mu; // F_friction = μ × m × g
  };

  const calculateAcceleration = (appliedForce: number, frictionForce: number, mass: number) => {
    return (appliedForce - frictionForce) / mass; // a = (F_applied - F_friction) / m
  };

  const getSlidingResults = () => {
    const coeffs = getFrictionCoefficients(surfaceType);
    const weight = mass * 9.8;
    const slidingFriction = calculateFrictionForce(mass, coeffs.sliding);
    const rollingFriction = calculateFrictionForce(mass, coeffs.rolling);

    const slidingAccel = force > slidingFriction ? calculateAcceleration(force, slidingFriction, mass) : 0;
    const rollingAccel = force > rollingFriction ? calculateAcceleration(force, rollingFriction, mass) : 0;

    return {
      weight,
      slidingFriction,
      rollingFriction,
      slidingAccel,
      rollingAccel,
      coeffs
    };
  };

  const getStaticKineticResults = () => {
    const coeffs = getFrictionCoefficients(surfaceType);
    const weight = twistMass * 9.8;
    const staticFriction = calculateFrictionForce(twistMass, coeffs.static);
    const kineticFriction = calculateFrictionForce(twistMass, coeffs.kinetic);

    const willMove = twistForce > staticFriction;
    const acceleration = willMove ? calculateAcceleration(twistForce, kineticFriction, twistMass) : 0;

    return {
      weight,
      staticFriction,
      kineticFriction,
      willMove,
      acceleration,
      coeffs
    };
  };

  // ============================================================================
  // EVENT EMISSION
  // ============================================================================

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'RollingVsSliding',
        gameTitle: 'Rolling vs Sliding Friction',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_changed', { from: phase, to: newPhase });
  }, [phase, emitEvent]);

  const handleNext = useCallback(() => {
    const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const handleBack = useCallback(() => {
    const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  const canGoNext = () => {
    if (phase === 'predict') return prediction !== null;
    if (phase === 'twist_predict') return twistPrediction !== null;
    if (phase === 'transfer') return viewedApps.size >= realWorldApps.length;
    if (phase === 'test') return answeredQuestions.size === 10;
    return true;
  };

  // ============================================================================
  // TEST LOGIC
  // ============================================================================

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (answeredQuestions.has(questionIndex)) return;

    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
    setSelectedAnswer(answerIndex);
    setAnsweredQuestions(new Set([...answeredQuestions, questionIndex]));

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    emitEvent(isCorrect ? 'correct_answer' : 'incorrect_answer', { questionIndex, answerIndex });
    playSound(isCorrect ? 'success' : 'failure');
  };

  const handleNextQuestion = () => {
    if (currentQuestion < 9) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(testAnswers[currentQuestion + 1]);
      playSound('click');
    } else {
      const score = testAnswers.reduce((sum, answer, idx) => {
        if (answer === null) return sum;
        return sum + (testQuestions[idx].options[answer].correct ? 1 : 0);
      }, 0);
      setShowTestResults(true);
      emitEvent('game_completed', { score, total: 10 });
      playSound('complete');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(testAnswers[currentQuestion - 1]);
      playSound('click');
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderProgressBar = () => {
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(phase);
    const progress = ((currentIndex + 1) / phases.length) * 100;

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-indigo-300">Rolling vs Sliding Friction</span>
          <span className="text-xs text-slate-400">{currentIndex + 1} of {phases.length}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-1.5 mt-3">
          {phases.map((p, idx) => (
            <button
              key={p}
              onClick={() => idx <= currentIndex && goToPhase(p)}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                idx < currentIndex ? 'bg-emerald-500' :
                idx === currentIndex ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' :
                'bg-slate-600'
              }`}
              style={{ cursor: idx <= currentIndex ? 'pointer' : 'default' }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderNavigationBar = () => {
    const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirstPhase = currentIndex === 0;
    const isLastPhase = currentIndex === phaseOrder.length - 1;

    return (
      <div className="flex gap-3 justify-between items-center pt-4 mt-6 border-t border-slate-700">
        <button
          onClick={handleBack}
          disabled={isFirstPhase}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            isFirstPhase
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'
          }`}
          style={{ cursor: isFirstPhase ? 'not-allowed' : 'pointer' }}
        >
          ← Back
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext() || isLastPhase}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            !canGoNext() || isLastPhase
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 active:scale-95 shadow-lg shadow-indigo-500/30'
          }`}
          style={{ cursor: !canGoNext() || isLastPhase ? 'not-allowed' : 'pointer' }}
        >
          {phase === 'transfer' && viewedApps.size < realWorldApps.length ? 'View All Apps' :
           phase === 'test' && answeredQuestions.size < 10 ? 'Answer All Questions' :
           'Next →'}
        </button>
      </div>
    );
  };

  const renderSlidingVsRollingVisualization = (showSliders: boolean) => {
    const results = getSlidingResults();

    return (
      <div className="space-y-6">
        <svg width="100%" viewBox="0 0 600 400" className="bg-slate-800/50 rounded-xl border border-slate-700">
          {/* Ground */}
          <rect x="50" y="320" width="500" height="10" fill="#64748b" />
          <text x="300" y="360" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="600">
            Surface: {surfaceType === 'concrete' ? 'Concrete' : 'Ice'}
          </text>

          {/* Sliding box (left) */}
          <g>
            <rect x="120" y="270" width="60" height="50" fill="#ef4444" stroke="#dc2626" strokeWidth="2" rx="4" />
            <text x="150" y="300" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">BOX</text>
            <text x="150" y="245" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
              SLIDING FRICTION (μ = {results.coeffs.sliding})
            </text>
            <text x="150" y="230" textAnchor="middle" fill="#fca5a5" fontSize="12">
              f = {results.slidingFriction.toFixed(1)} N
            </text>
            {results.slidingAccel > 0 && (
              <text x="150" y="375" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="600">
                a = {results.slidingAccel.toFixed(2)} m/s²
              </text>
            )}
          </g>

          {/* Rolling object (right) */}
          <g>
            <rect x="380" y="275" width="60" height="40" fill="#3b82f6" stroke="#2563eb" strokeWidth="2" rx="4" />
            <circle cx="395" cy="320" r="10" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <circle cx="425" cy="320" r="10" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <text x="410" y="300" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">CART</text>
            <text x="410" y="200" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="bold">
              ROLLING FRICTION (μ = {results.coeffs.rolling})
            </text>
            <text x="410" y="215" textAnchor="middle" fill="#6ee7b7" fontSize="12">
              f = {results.rollingFriction.toFixed(1)} N
            </text>
            {results.rollingAccel > 0 && (
              <text x="410" y="375" textAnchor="middle" fill="#10b981" fontSize="13" fontWeight="600">
                a = {results.rollingAccel.toFixed(2)} m/s²
              </text>
            )}
          </g>

          {/* Force arrows */}
          {force > 0 && (
            <>
              <defs>
                <marker id="arrowhead-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                </marker>
                <marker id="arrowhead-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                </marker>
              </defs>
              <line x1="70" y1="295" x2="115" y2="295" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowhead-red)" />
              <text x="75" y="285" fill="#ef4444" fontSize="12" fontWeight="600">F = {force} N</text>

              <line x1="330" y1="295" x2="375" y2="295" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowhead-green)" />
              <text x="335" y="285" fill="#10b981" fontSize="12" fontWeight="600">F = {force} N</text>
            </>
          )}

          {/* Comparison text */}
          <text x="300" y="50" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="bold">
            Rolling friction is {(results.slidingFriction / results.rollingFriction).toFixed(0)}× lower!
          </text>
        </svg>

        {showSliders && (
          <div className="space-y-4 bg-slate-800/30 p-6 rounded-xl border border-slate-700">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Mass: {mass} kg
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={mass}
                onChange={(e) => {
                  setMass(Number(e.target.value));
                  emitEvent('slider_changed', { parameter: 'mass', value: Number(e.target.value) });
                }}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                style={{
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Applied Force: {force} N
              </label>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={force}
                onChange={(e) => {
                  setForce(Number(e.target.value));
                  emitEvent('slider_changed', { parameter: 'force', value: Number(e.target.value) });
                }}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                style={{
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Surface Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSurfaceType('concrete');
                    emitEvent('button_clicked', { action: 'select_surface', surface: 'concrete' });
                    playSound('click');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    surfaceType === 'concrete'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  Concrete
                </button>
                <button
                  onClick={() => {
                    setSurfaceType('ice');
                    emitEvent('button_clicked', { action: 'select_surface', surface: 'ice' });
                    playSound('click');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    surfaceType === 'ice'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  Ice
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="text-xs text-red-300 mb-1">Sliding Acceleration</div>
                <div className="text-2xl font-bold text-red-400">{results.slidingAccel.toFixed(2)} m/s²</div>
              </div>
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                <div className="text-xs text-emerald-300 mb-1">Rolling Acceleration</div>
                <div className="text-2xl font-bold text-emerald-400">{results.rollingAccel.toFixed(2)} m/s²</div>
              </div>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4">
              <div className="text-sm font-semibold text-indigo-300 mb-2">What you're seeing:</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                With the same applied force ({force} N), the rolling object accelerates {results.rollingAccel > 0 && results.slidingAccel > 0 ? (results.rollingAccel / results.slidingAccel).toFixed(1) + '× faster' : 'much faster'} than the sliding object because rolling friction is dramatically lower. This is why wheels revolutionized transportation!
              </p>
            </div>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <div className="text-sm font-semibold text-purple-300 mb-2">Cause & Effect:</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Increase the force to see both objects accelerate faster. Change the mass to see how weight affects friction forces. Switch to ice to see how surface properties change both friction types (but rolling stays much lower).
              </p>
            </div>

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="text-sm font-semibold text-amber-300 mb-2">Why this matters:</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Before wheels, ancient civilizations used log rollers to move massive stones. Modern applications include luggage wheels, ball bearings in motors, and low-friction train wheels - all exploiting the dramatic difference between rolling and sliding friction.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStaticKineticVisualization = (showSliders: boolean) => {
    const results = getStaticKineticResults();

    return (
      <div className="space-y-6">
        <svg width="100%" viewBox="0 0 600 350" className="bg-slate-800/50 rounded-xl border border-slate-700">
          {/* Ground */}
          <rect x="50" y="280" width="500" height="10" fill="#64748b" />

          {/* Box */}
          <rect
            x="250"
            y="220"
            width="80"
            height="60"
            fill={results.willMove ? '#10b981' : '#ef4444'}
            stroke={results.willMove ? '#059669' : '#dc2626'}
            strokeWidth="3"
            rx="4"
          />
          <text x="290" y="255" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">BOX</text>

          {/* Force arrow */}
          {twistForce > 0 && (
            <>
              <defs>
                <marker id="arrowhead-force" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
                </marker>
              </defs>
              <line x1="180" y1="250" x2="245" y2="250" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#arrowhead-force)" />
              <text x="185" y="235" fill="#f59e0b" fontSize="14" fontWeight="bold">F = {twistForce} N</text>
            </>
          )}

          {/* Static friction threshold indicator */}
          <text x="300" y="180" textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="bold">
            Static friction threshold: {results.staticFriction.toFixed(1)} N
          </text>
          <text x="300" y="200" textAnchor="middle" fill="#8b5cf6" fontSize="16" fontWeight="bold">
            Kinetic friction (once moving): {results.kineticFriction.toFixed(1)} N
          </text>

          {/* Status */}
          <text x="300" y="60" textAnchor="middle" fill={results.willMove ? '#10b981' : '#ef4444'} fontSize="22" fontWeight="bold">
            {results.willMove ? `MOVING! (a = ${results.acceleration.toFixed(2)} m/s²)` : 'STUCK (not enough force)'}
          </text>

          {/* Friction force arrows */}
          {twistForce > 0 && !results.willMove && (
            <>
              <line x1="330" y1="250" x2="380" y2="250" stroke="#ef4444" strokeWidth="3" />
              <text x="385" y="255" fill="#ef4444" fontSize="12" fontWeight="600">Static f = {Math.min(twistForce, results.staticFriction).toFixed(1)} N</text>
            </>
          )}
          {results.willMove && (
            <>
              <line x1="330" y1="250" x2="370" y2="250" stroke="#8b5cf6" strokeWidth="3" />
              <text x="375" y="255" fill="#8b5cf6" fontSize="12" fontWeight="600">Kinetic f = {results.kineticFriction.toFixed(1)} N</text>
            </>
          )}

          {/* Formula reference */}
          <text x="300" y="330" textAnchor="middle" fill="#94a3b8" fontSize="13">
            Static μ_s = {results.coeffs.static} | Kinetic μ_k = {results.coeffs.kinetic}
          </text>
        </svg>

        {showSliders && (
          <div className="space-y-4 bg-slate-800/30 p-6 rounded-xl border border-slate-700">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Mass: {twistMass} kg
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={twistMass}
                onChange={(e) => {
                  setTwistMass(Number(e.target.value));
                  emitEvent('slider_changed', { parameter: 'twist_mass', value: Number(e.target.value) });
                }}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                style={{
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Applied Force: {twistForce} N
              </label>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={twistForce}
                onChange={(e) => {
                  setTwistForce(Number(e.target.value));
                  setHasStartedTwist(true);
                  emitEvent('slider_changed', { parameter: 'twist_force', value: Number(e.target.value) });
                }}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                style={{
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Surface Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSurfaceType('concrete');
                    emitEvent('button_clicked', { action: 'select_twist_surface', surface: 'concrete' });
                    playSound('click');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    surfaceType === 'concrete'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  Concrete
                </button>
                <button
                  onClick={() => {
                    setSurfaceType('ice');
                    emitEvent('button_clicked', { action: 'select_twist_surface', surface: 'ice' });
                    playSound('click');
                  }}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    surfaceType === 'ice'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  Ice
                </button>
              </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
              <div className="text-sm font-semibold text-amber-300 mb-2">Key Discovery:</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Static friction (μ_s = {results.coeffs.static}) is {((results.coeffs.static / results.coeffs.kinetic) * 100 - 100).toFixed(0)}% higher than kinetic friction (μ_k = {results.coeffs.kinetic}). That's why it's harder to START pushing a heavy object than to KEEP it moving!
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHook = () => (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent leading-tight">
        Rolling vs Sliding Friction
      </h1>

      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-2xl p-8 border border-indigo-500/30 shadow-2xl">
        <div className="text-6xl text-center mb-6">🛞 📦</div>

        <div className="space-y-4 text-lg text-slate-200 leading-relaxed">
          <p>
            Imagine trying to push a heavy refrigerator across your kitchen floor. It's incredibly difficult - you might need 200+ Newtons of force just to budge it.
          </p>
          <p>
            Now imagine placing that same refrigerator on a dolly with wheels. Suddenly, you can move it with just 10-20 Newtons of force!
          </p>
          <p className="text-xl font-semibold text-indigo-300">
            What changed? The type of friction.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-6">
          <div className="text-3xl mb-3">📦</div>
          <h3 className="text-xl font-bold text-red-300 mb-2">Sliding Friction</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            High friction coefficient (μ ≈ 0.3-0.7). Every point on the bottom surface rubs against the ground, creating massive resistance.
          </p>
        </div>

        <div className="bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-6">
          <div className="text-3xl mb-3">🛞</div>
          <h3 className="text-xl font-bold text-emerald-300 mb-2">Rolling Friction</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Low friction coefficient (μ ≈ 0.001-0.02). Only a tiny contact point deforms, creating 10-100× less resistance!
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
        <p className="text-center text-lg text-slate-200 leading-relaxed">
          <span className="font-bold text-purple-300">This discovery changed human civilization.</span> The invention of the wheel around 3500 BCE enabled carts, chariots, mills, and eventually cars, trains, and aircraft. All because rolling friction is so much lower than sliding friction.
        </p>
      </div>

      <div className="text-center text-slate-400 text-sm">
        Press <span className="font-semibold text-indigo-400">Next</span> to explore the physics of friction types
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center text-indigo-300">
        Make Your Prediction
      </h2>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-xl p-6 border border-slate-600">
        <p className="text-lg text-slate-200 mb-6 leading-relaxed">
          You apply the same 100 N horizontal force to two identical 50 kg boxes. One slides across a concrete floor. The other has wheels and rolls.
        </p>
        <p className="text-xl font-semibold text-indigo-300 text-center">
          Which will accelerate faster?
        </p>
      </div>

      {renderSlidingVsRollingVisualization(false)}

      <div className="space-y-3">
        <button
          onClick={() => {
            setPrediction('rolling');
            emitEvent('prediction_made', { prediction: 'rolling' });
            playSound('click');
          }}
          className={`w-full p-5 rounded-xl text-left transition-all duration-200 font-semibold text-lg ${
            prediction === 'rolling'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 border-2 border-indigo-400'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-transparent'
          }`}
          style={{ cursor: 'pointer' }}
        >
          🛞 The rolling box (with wheels) will accelerate faster
        </button>

        <button
          onClick={() => {
            setPrediction('sliding');
            emitEvent('prediction_made', { prediction: 'sliding' });
            playSound('click');
          }}
          className={`w-full p-5 rounded-xl text-left transition-all duration-200 font-semibold text-lg ${
            prediction === 'sliding'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 border-2 border-indigo-400'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-transparent'
          }`}
          style={{ cursor: 'pointer' }}
        >
          📦 The sliding box will accelerate faster
        </button>

        <button
          onClick={() => {
            setPrediction('same');
            emitEvent('prediction_made', { prediction: 'same' });
            playSound('click');
          }}
          className={`w-full p-5 rounded-xl text-left transition-all duration-200 font-semibold text-lg ${
            prediction === 'same'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 border-2 border-indigo-400'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-transparent'
          }`}
          style={{ cursor: 'pointer' }}
        >
          ⚖️ They will accelerate at the same rate
        </button>
      </div>

      {prediction && (
        <div className="bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-4">
          <p className="text-emerald-300 font-semibold">Prediction recorded! Press Next to test it.</p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center text-purple-300">
        Explore the Physics
      </h2>

      {renderSlidingVsRollingVisualization(true)}
    </div>
  );

  const renderReview = () => {
    const results = getSlidingResults();
    const isCorrect = prediction === 'rolling';

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-indigo-300">
          Review & Explanation
        </h2>

        <div className={`rounded-xl p-6 border-2 ${
          isCorrect
            ? 'bg-emerald-900/30 border-emerald-500/50'
            : 'bg-amber-900/30 border-amber-500/50'
        }`}>
          <div className="text-4xl text-center mb-4">
            {isCorrect ? '✅' : '💡'}
          </div>
          <p className="text-xl font-bold text-center mb-4 text-slate-100">
            {isCorrect
              ? 'Correct! The rolling object accelerates much faster.'
              : 'The rolling object accelerates much faster - here\'s why:'}
          </p>
          <div className="text-lg text-slate-200 space-y-3 leading-relaxed">
            <p>
              Your prediction: <span className="font-semibold text-indigo-300">{prediction === 'rolling' ? 'Rolling faster' : prediction === 'sliding' ? 'Sliding faster' : 'Same acceleration'}</span>
            </p>
            <p>
              Actual result: <span className="font-semibold text-emerald-300">Rolling accelerates {(results.rollingAccel / Math.max(results.slidingAccel, 0.01)).toFixed(1)}× faster</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-6 border border-indigo-500/30">
          <h3 className="text-xl font-bold text-indigo-300 mb-4">Why Rolling Friction is So Much Lower:</h3>
          <div className="space-y-4 text-slate-200 leading-relaxed">
            <div className="flex gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-semibold text-red-300 mb-1">Sliding Friction (μ ≈ 0.4):</p>
                <p className="text-sm">The entire bottom surface rubs against the ground. Microscopic peaks and valleys interlock, creating massive resistance. Every molecule at the interface experiences shear forces.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🛞</span>
              <div>
                <p className="font-semibold text-emerald-300 mb-1">Rolling Friction (μ ≈ 0.01):</p>
                <p className="text-sm">Only a tiny contact point deforms as the wheel rolls. The wheel essentially "climbs out" of the slight depression it creates, requiring far less energy. No surfaces slide past each other.</p>
              </div>
            </div>

            <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
              <p className="font-semibold text-purple-300 mb-2">The Math:</p>
              <p className="text-sm font-mono">
                Sliding: F_friction = {results.coeffs.sliding} × {mass} kg × 9.8 m/s² = {results.slidingFriction.toFixed(1)} N<br/>
                Rolling: F_friction = {results.coeffs.rolling} × {mass} kg × 9.8 m/s² = {results.rollingFriction.toFixed(1)} N<br/>
                <span className="text-emerald-400">Difference: {(results.slidingFriction / results.rollingFriction).toFixed(0)}× less friction force!</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-6 border border-amber-500/30">
          <h3 className="text-lg font-bold text-amber-300 mb-3">Historical Impact:</h3>
          <p className="text-slate-200 leading-relaxed">
            The wheel, invented around 3500 BCE, is considered one of humanity's greatest inventions precisely because it exploits this physics principle. Ancient Egyptians used log rollers (a primitive wheel) to move 2-ton stones for pyramids. Modern applications range from luggage wheels to train bearings to ball bearings in hard drives - all leveraging the dramatic difference between rolling and sliding friction.
          </p>
        </div>
      </div>
    );
  };

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center text-purple-300">
        A Surprising Twist
      </h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-6 border border-purple-500/30">
        <div className="text-5xl text-center mb-4">🤔</div>
        <p className="text-lg text-slate-200 leading-relaxed mb-4">
          You've learned that sliding friction is much higher than rolling friction. But there's another important distinction: <span className="font-bold text-purple-300">static vs kinetic friction</span>.
        </p>
        <p className="text-xl font-semibold text-center text-purple-300">
          Is it harder to START moving an object or to KEEP it moving?
        </p>
      </div>

      {renderStaticKineticVisualization(false)}

      <div className="space-y-3">
        <button
          onClick={() => {
            setTwistPrediction('start');
            emitEvent('prediction_made', { prediction: 'start_harder' });
            playSound('click');
          }}
          className={`w-full p-5 rounded-xl text-left transition-all duration-200 font-semibold text-lg ${
            twistPrediction === 'start'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/30 border-2 border-purple-400'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-transparent'
          }`}
          style={{ cursor: 'pointer' }}
        >
          🚀 Harder to START moving (static friction is higher)
        </button>

        <button
          onClick={() => {
            setTwistPrediction('keep');
            emitEvent('prediction_made', { prediction: 'keep_harder' });
            playSound('click');
          }}
          className={`w-full p-5 rounded-xl text-left transition-all duration-200 font-semibold text-lg ${
            twistPrediction === 'keep'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/30 border-2 border-purple-400'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-transparent'
          }`}
          style={{ cursor: 'pointer' }}
        >
          🏃 Harder to KEEP moving (kinetic friction is higher)
        </button>

        <button
          onClick={() => {
            setTwistPrediction('same');
            emitEvent('prediction_made', { prediction: 'same_friction' });
            playSound('click');
          }}
          className={`w-full p-5 rounded-xl text-left transition-all duration-200 font-semibold text-lg ${
            twistPrediction === 'same'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/30 border-2 border-purple-400'
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-2 border-transparent'
          }`}
          style={{ cursor: 'pointer' }}
        >
          ⚖️ Same difficulty (static = kinetic friction)
        </button>
      </div>

      {twistPrediction && (
        <div className="bg-emerald-900/20 border border-emerald-500/40 rounded-xl p-4">
          <p className="text-emerald-300 font-semibold">Prediction recorded! Press Next to experiment.</p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center text-pink-300">
        Static vs Kinetic Friction
      </h2>

      {renderStaticKineticVisualization(true)}
    </div>
  );

  const renderTwistReview = () => {
    const results = getStaticKineticResults();
    const isCorrect = twistPrediction === 'start';

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center text-purple-300">
          The Static/Kinetic Discovery
        </h2>

        <div className={`rounded-xl p-6 border-2 ${
          isCorrect
            ? 'bg-emerald-900/30 border-emerald-500/50'
            : 'bg-amber-900/30 border-amber-500/50'
        }`}>
          <div className="text-4xl text-center mb-4">
            {isCorrect ? '✅' : '💡'}
          </div>
          <p className="text-xl font-bold text-center mb-4 text-slate-100">
            {isCorrect
              ? 'Correct! Static friction is higher than kinetic friction.'
              : 'Static friction is higher - that\'s why starting is harder!'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-xl font-bold text-purple-300 mb-4">The Physics Explanation:</h3>
          <div className="space-y-4 text-slate-200 leading-relaxed">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
              <p className="font-semibold text-amber-300 mb-2">Static Friction (μ_s = {results.coeffs.static}):</p>
              <p className="text-sm">When an object is at rest, microscopic "bonds" form between the surfaces as peaks and valleys settle into each other. Breaking these bonds requires overcoming static friction: <span className="font-mono text-amber-200">F_s = {results.staticFriction.toFixed(1)} N</span></p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
              <p className="font-semibold text-purple-300 mb-2">Kinetic Friction (μ_k = {results.coeffs.kinetic}):</p>
              <p className="text-sm">Once moving, surfaces don't have time to "settle in." They bounce across peaks rather than interlocking. This requires less force to maintain: <span className="font-mono text-purple-200">F_k = {results.kineticFriction.toFixed(1)} N</span></p>
            </div>

            <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30">
              <p className="font-semibold text-emerald-300 mb-2">Key Insight:</p>
              <p className="text-sm">
                Static friction is {((results.coeffs.static / results.coeffs.kinetic - 1) * 100).toFixed(0)}% higher than kinetic friction! Once you overcome the initial "breakaway" force, it's easier to keep moving. This is why pushing a stalled car is hardest at first.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5">
            <h4 className="font-bold text-red-300 mb-2">Everyday Examples:</h4>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
              <li>Pushing a heavy box (hard to start)</li>
              <li>Sliding furniture across a room</li>
              <li>Car tires at rest vs. rolling</li>
              <li>Opening a stuck drawer</li>
            </ul>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
            <h4 className="font-bold text-indigo-300 mb-2">Engineering Applications:</h4>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
              <li>Clutch design (controlled slip)</li>
              <li>Brake pads (static grip)</li>
              <li>Tire traction (static &gt; kinetic)</li>
              <li>Machine startup torque</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderTransfer = () => {
    const app = realWorldApps[currentApp];
    const allViewed = viewedApps.size >= realWorldApps.length;

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Real-World Applications
        </h2>

        <div className="flex items-center justify-center gap-2 mb-4">
          {realWorldApps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentApp(idx);
                setViewedApps(new Set([...viewedApps, idx]));
                emitEvent('button_clicked', { action: 'view_app', appIndex: idx });
                playSound('click');
              }}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                currentApp === idx
                  ? 'bg-indigo-500 w-8'
                  : viewedApps.has(idx)
                    ? 'bg-emerald-500'
                    : 'bg-slate-600'
              }`}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>

        <div
          className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-slate-800"
          style={{ maxHeight: '60vh' }}
        >
          <div
            className="rounded-xl p-6 border-2 transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${app.color}15, ${app.color}05)`,
              borderColor: `${app.color}40`
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <span className="text-5xl">{app.icon}</span>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-100 mb-1">{app.title}</h3>
                <p className="text-sm text-indigo-300 italic">{app.tagline}</p>
              </div>
            </div>

            <p className="text-slate-200 leading-relaxed mb-4">{app.description}</p>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
              <h4 className="font-semibold text-purple-300 mb-2">Connection to Friction:</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{app.connection}</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
              <h4 className="font-semibold text-indigo-300 mb-2">How It Works:</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{app.howItWorks}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {app.stats.map((stat, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-lg font-bold" style={{ color: app.color }}>{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
              <h4 className="font-semibold text-emerald-300 mb-2">Examples:</h4>
              <div className="grid grid-cols-2 gap-2">
                {app.examples.map((ex, idx) => (
                  <div key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {ex}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
              <h4 className="font-semibold text-amber-300 mb-2">Leading Companies:</h4>
              <div className="flex flex-wrap gap-2">
                {app.companies.map((company, idx) => (
                  <span key={idx} className="px-3 py-1 bg-slate-900/50 rounded-full text-sm text-slate-300 border border-slate-700">
                    {company}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-lg p-4 border border-indigo-500/30">
              <h4 className="font-semibold text-indigo-300 mb-2">Future Impact:</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{app.futureImpact}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              const newApp = (currentApp - 1 + realWorldApps.length) % realWorldApps.length;
              setCurrentApp(newApp);
              setViewedApps(new Set([...viewedApps, newApp]));
              emitEvent('button_clicked', { action: 'previous_app' });
              playSound('click');
            }}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-200 active:scale-95"
            style={{ cursor: 'pointer' }}
          >
            ← Previous
          </button>
          <button
            onClick={() => {
              const newApp = (currentApp + 1) % realWorldApps.length;
              setCurrentApp(newApp);
              setViewedApps(new Set([...viewedApps, newApp]));
              emitEvent('button_clicked', { action: 'next_app' });
              playSound('click');
            }}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-200 active:scale-95"
            style={{ cursor: 'pointer' }}
          >
            Next →
          </button>
        </div>

        {allViewed && (
          <button
            onClick={() => {
              handleNext();
              emitEvent('button_clicked', { action: 'proceed_to_test' });
            }}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-lg transition-all duration-200 active:scale-95 shadow-xl shadow-emerald-500/30"
            style={{ cursor: 'pointer' }}
          >
            Take the Test →
          </button>
        )}

        {!allViewed && (
          <div className="bg-amber-900/20 border border-amber-500/40 rounded-xl p-4 text-center">
            <p className="text-amber-300">View all {realWorldApps.length} applications to unlock the test</p>
            <p className="text-sm text-slate-400 mt-1">({viewedApps.size} of {realWorldApps.length} viewed)</p>
          </div>
        )}
      </div>
    );
  };

  const renderTest = () => {
    if (showTestResults) {
      const score = testAnswers.reduce((sum, answer, idx) => {
        if (answer === null) return sum;
        return sum + (testQuestions[idx].options[answer].correct ? 1 : 0);
      }, 0);
      const percentage = (score / 10) * 100;

      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center text-indigo-300">
            Test Results
          </h2>

          <div className={`rounded-2xl p-8 border-2 ${
            percentage >= 80 ? 'bg-emerald-900/30 border-emerald-500/50' :
            percentage >= 60 ? 'bg-amber-900/30 border-amber-500/50' :
            'bg-red-900/30 border-red-500/50'
          }`}>
            <div className="text-6xl text-center mb-4">
              {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚'}
            </div>
            <div className="text-5xl font-bold text-center mb-2 text-slate-100">
              {score} / 10
            </div>
            <div className="text-2xl text-center text-slate-300 mb-6">
              {percentage}% Correct
            </div>
            <p className="text-center text-lg text-slate-200">
              {percentage >= 80 ? 'Outstanding! You have mastered friction physics!' :
               percentage >= 60 ? 'Good job! Review the concepts you missed.' :
               'Keep learning! Review the material and try again.'}
            </p>
          </div>

          <div
            className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-slate-800"
            style={{ maxHeight: '50vh' }}
          >
            {testQuestions.map((q, qIdx) => {
              const userAnswer = testAnswers[qIdx];
              const correctAnswerIdx = q.options.findIndex(opt => opt.correct);
              const isCorrect = userAnswer === correctAnswerIdx;

              return (
                <div
                  key={qIdx}
                  className={`rounded-xl p-5 border-2 ${
                    isCorrect
                      ? 'bg-emerald-900/20 border-emerald-500/40'
                      : 'bg-red-900/20 border-red-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-300 mb-2">Question {qIdx + 1}</div>
                      <p className="text-sm text-slate-200 mb-2">{q.scenario}</p>
                      <p className="font-semibold text-slate-100">{q.question}</p>
                    </div>
                  </div>

                  {userAnswer !== null && (
                    <div className="ml-11 space-y-2">
                      <div className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-800/30' : 'bg-red-800/30'}`}>
                        <div className="text-xs font-semibold mb-1 text-slate-400">Your answer:</div>
                        <div className={isCorrect ? 'text-emerald-300' : 'text-red-300'}>
                          {q.options[userAnswer].label}
                        </div>
                      </div>

                      {!isCorrect && (
                        <div className="p-3 rounded-lg bg-emerald-800/30">
                          <div className="text-xs font-semibold mb-1 text-slate-400">Correct answer:</div>
                          <div className="text-emerald-300">
                            {q.options[correctAnswerIdx].label}
                          </div>
                        </div>
                      )}

                      <div className="p-3 rounded-lg bg-indigo-900/30 border border-indigo-500/30">
                        <div className="text-xs font-semibold mb-1 text-indigo-300">Explanation:</div>
                        <div className="text-sm text-slate-300 leading-relaxed">
                          {q.explanation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-200"
              style={{ cursor: 'pointer' }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setAnsweredQuestions(new Set());
                emitEvent('button_clicked', { action: 'replay_test' });
                playSound('click');
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200"
              style={{ cursor: 'pointer' }}
            >
              Retake Test
            </button>
          </div>
        </div>
      );
    }

    const q = testQuestions[currentQuestion];
    const hasAnswered = answeredQuestions.has(currentQuestion);
    const userAnswer = testAnswers[currentQuestion];
    const correctAnswerIdx = q.options.findIndex(opt => opt.correct);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-indigo-300">
            Knowledge Test
          </h2>
          <span className="text-lg font-semibold text-slate-400">
            Question {currentQuestion + 1} of 10
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-xl p-6 border border-slate-600">
          <div className="text-sm text-slate-400 mb-3">Scenario:</div>
          <p className="text-slate-200 mb-4 leading-relaxed">{q.scenario}</p>
          <div className="text-sm text-indigo-300 mb-2 font-semibold">Question:</div>
          <p className="text-lg font-semibold text-slate-100">{q.question}</p>
        </div>

        <div className="space-y-3">
          {q.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrectAnswer = option.correct;
            const showResult = hasAnswered;

            return (
              <button
                key={option.id}
                onClick={() => {
                  if (!hasAnswered) {
                    handleAnswerSelect(currentQuestion, idx);
                  }
                }}
                disabled={hasAnswered}
                className={`w-full p-5 rounded-xl text-left transition-all duration-200 border-2 ${
                  showResult
                    ? isCorrectAnswer
                      ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200'
                      : isSelected
                        ? 'bg-red-900/30 border-red-500/50 text-red-200'
                        : 'bg-slate-800/50 border-slate-600 text-slate-400'
                    : isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-xl'
                      : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}
                style={{ cursor: hasAnswered ? 'default' : 'pointer' }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xl">{option.id.toUpperCase()}.</span>
                  <span className="flex-1 font-medium">{option.label}</span>
                  {showResult && isCorrectAnswer && <span className="text-2xl">✓</span>}
                  {showResult && isSelected && !isCorrectAnswer && <span className="text-2xl">✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {hasAnswered && (
          <div className={`rounded-xl p-5 border-2 ${
            userAnswer === correctAnswerIdx
              ? 'bg-emerald-900/30 border-emerald-500/50'
              : 'bg-indigo-900/30 border-indigo-500/50'
          }`}>
            <div className="text-sm font-semibold text-indigo-300 mb-2">Explanation:</div>
            <p className="text-slate-200 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              currentQuestion === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'
            }`}
            style={{ cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>

          <button
            onClick={handleNextQuestion}
            disabled={!hasAnswered}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              !hasAnswered
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 active:scale-95 shadow-lg'
            }`}
            style={{ cursor: !hasAnswered ? 'not-allowed' : 'pointer' }}
          >
            {currentQuestion === 9 ? 'View Results' : 'Next Question →'}
          </button>
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const score = testAnswers.reduce((sum, answer, idx) => {
      if (answer === null) return sum;
      return sum + (testQuestions[idx].options[answer].correct ? 1 : 0);
    }, 0);
    const percentage = (score / 10) * 100;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="text-7xl">🎓</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Mastery Achieved!
          </h1>
          <p className="text-xl text-slate-300">
            You've completed the Rolling vs Sliding Friction journey
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-6 border border-indigo-500/30 text-center">
            <div className="text-4xl mb-2">📚</div>
            <div className="text-3xl font-bold text-indigo-300 mb-1">{percentage}%</div>
            <div className="text-sm text-slate-400">Test Score</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-xl p-6 border border-emerald-500/30 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-emerald-300 mb-1">{realWorldApps.length}</div>
            <div className="text-sm text-slate-400">Applications Explored</div>
          </div>

          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-xl p-6 border border-amber-500/30 text-center">
            <div className="text-4xl mb-2">⭐</div>
            <div className="text-3xl font-bold text-amber-300 mb-1">10</div>
            <div className="text-sm text-slate-400">Phases Completed</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-xl p-8 border border-slate-600">
          <h3 className="text-2xl font-bold text-slate-100 mb-4 text-center">
            Key Concepts Mastered
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🛞</span>
                <div>
                  <div className="font-semibold text-emerald-300">Rolling vs Sliding</div>
                  <div className="text-sm text-slate-400">Rolling friction is 10-100× lower</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <div className="font-semibold text-purple-300">Static vs Kinetic</div>
                  <div className="text-sm text-slate-400">Starting requires more force</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚙️</span>
                <div>
                  <div className="font-semibold text-indigo-300">Engineering Applications</div>
                  <div className="text-sm text-slate-400">From bearings to ABS brakes</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📐</span>
                <div>
                  <div className="font-semibold text-amber-300">Physics Calculations</div>
                  <div className="text-sm text-slate-400">F = μ × N quantified friction</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-6 border border-indigo-500/30">
          <h3 className="text-xl font-bold text-indigo-300 mb-3 text-center">
            Continue Your Learning Journey
          </h3>
          <p className="text-slate-300 text-center leading-relaxed mb-4">
            Understanding friction types opens doors to mechanics, materials science, and mechanical engineering. Keep exploring how forces shape our world!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-200 active:scale-95 shadow-xl"
              style={{ cursor: 'pointer' }}
            >
              Explore More Games
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>
      <div className="flex-1 overflow-y-auto p-6" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="max-w-4xl mx-auto">
          {renderProgressBar()}

          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-700/50">
            {phase === 'hook' && renderHook()}
            {phase === 'predict' && renderPredict()}
            {phase === 'play' && renderPlay()}
            {phase === 'review' && renderReview()}
            {phase === 'twist_predict' && renderTwistPredict()}
            {phase === 'twist_play' && renderTwistPlay()}
            {phase === 'twist_review' && renderTwistReview()}
            {phase === 'transfer' && renderTransfer()}
            {phase === 'test' && renderTest()}
            {phase === 'mastery' && renderMastery()}

            {phase !== 'mastery' && renderNavigationBar()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RollingVsSlidingRenderer;
