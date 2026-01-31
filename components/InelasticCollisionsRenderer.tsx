'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// INELASTIC COLLISIONS RENDERER - GOLD STANDARD IMPLEMENTATION
// Game 32: Car Crashes & Safety Physics - Why Cars Are Designed to Crumple
// =============================================================================

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

// Phase is now numeric 0-9 for consistency with gold standard
// 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'experiment_started'
  | 'experiment_completed'
  | 'parameter_changed'
  | 'milestone_reached'
  | 'twist_prediction_made'
  | 'twist_correct'
  | 'twist_incorrect'
  | 'app_explored'
  | 'app_completed'
  | 'test_started'
  | 'test_answer_selected'
  | 'test_completed'
  | 'test_passed'
  | 'test_failed'
  | 'mastery_achieved'
  | 'crash_triggered'
  | 'car_type_changed'
  | 'speed_changed'
  | 'display_toggled'
  | 'sound_played'
  | 'navigation_clicked';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
  timestamp?: number;
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

// -----------------------------------------------------------------------------
// Sound Utility with Web Audio API
// -----------------------------------------------------------------------------

const createSoundPlayer = () => {
  let audioContext: AudioContext | null = null;

  const getContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return audioContext;
  };

  return (type: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'crash' | 'impact') => {
    const ctx = getContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case 'click':
          oscillator.frequency.setValueAtTime(600, now);
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.setValueAtTime(0.01, now + 0.08);
          oscillator.start(now);
          oscillator.stop(now + 0.08);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523, now);
          oscillator.frequency.setValueAtTime(659, now + 0.1);
          oscillator.frequency.setValueAtTime(784, now + 0.2);
          gainNode.gain.setValueAtTime(0.12, now);
          gainNode.gain.setValueAtTime(0.01, now + 0.35);
          oscillator.start(now);
          oscillator.stop(now + 0.35);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, now);
          oscillator.frequency.setValueAtTime(180, now + 0.15);
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.setValueAtTime(0.01, now + 0.25);
          oscillator.start(now);
          oscillator.stop(now + 0.25);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(392, now);
          oscillator.frequency.setValueAtTime(523, now + 0.12);
          oscillator.frequency.setValueAtTime(659, now + 0.24);
          oscillator.frequency.setValueAtTime(784, now + 0.36);
          gainNode.gain.setValueAtTime(0.12, now);
          gainNode.gain.setValueAtTime(0.01, now + 0.5);
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, now);
          oscillator.frequency.exponentialRampToValueAtTime(550, now + 0.12);
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.setValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
        case 'crash':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(150, now);
          oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gainNode.gain.setValueAtTime(0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          oscillator.start(now);
          oscillator.stop(now + 0.4);
          break;
        case 'impact':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(100, now);
          oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          oscillator.start(now);
          oscillator.stop(now + 0.2);
          break;
      }
    } catch {
      // Silent fail for audio
    }
  };
};

// -----------------------------------------------------------------------------
// Test Questions Data
// -----------------------------------------------------------------------------

const testQuestions: TestQuestion[] = [
  {
    scenario: "A car traveling at 60 mph crashes into a concrete barrier. After the crash, the car comes to a complete stop, with significant damage to the front end.",
    question: "In this inelastic collision, what happens to the kinetic energy?",
    options: [
      { text: "It's conserved and transfers to the barrier", correct: false },
      { text: "It's converted to heat, sound, and deformation energy", correct: true },
      { text: "It's destroyed according to the collision laws", correct: false },
      { text: "It doubles due to the impact force", correct: false }
    ],
    explanation: "In inelastic collisions, kinetic energy is NOT conserved—it converts to other forms like heat (metal heating), sound (crash noise), and deformation energy (crumpling). Total energy is still conserved, just not as kinetic energy."
  },
  {
    scenario: "Two identical trucks collide head-on. Despite the kinetic energy loss, investigators use momentum calculations to reconstruct the crash.",
    question: "Why can they rely on momentum even though energy isn't conserved?",
    options: [
      { text: "Momentum is only conserved in elastic collisions", correct: false },
      { text: "Momentum is ALWAYS conserved in collisions, regardless of type", correct: true },
      { text: "Momentum conservation only applies to slow-moving objects", correct: false },
      { text: "Investigators use a different formula for inelastic collisions", correct: false }
    ],
    explanation: "Momentum (p = mv) is ALWAYS conserved in collisions because there's no external force. This is true for elastic, inelastic, and perfectly inelastic collisions. Energy conservation only means KE = KE' in elastic collisions."
  },
  {
    scenario: "A moving train car couples with a stationary train car. After coupling, they move together as one unit.",
    question: "This is an example of what type of collision?",
    options: [
      { text: "Elastic collision - objects bounce apart", correct: false },
      { text: "Perfectly inelastic collision - objects stick together", correct: true },
      { text: "Super-elastic collision - energy is gained", correct: false },
      { text: "Non-physical collision - violates physics laws", correct: false }
    ],
    explanation: "A perfectly inelastic collision is when objects stick together after impact, losing the maximum possible kinetic energy while still conserving momentum. Train coupling is a textbook example of this."
  },
  {
    scenario: "An automotive engineer is designing a new car's front end. She makes the crumple zone 50cm longer than the previous model.",
    question: "How does this change affect crash safety?",
    options: [
      { text: "No effect - the car will still stop in the same time", correct: false },
      { text: "Extends collision time, reducing peak force on passengers", correct: true },
      { text: "Makes the car heavier, increasing momentum", correct: false },
      { text: "Reduces the car's momentum during normal driving", correct: false }
    ],
    explanation: "From F = Δp/Δt, if Δp is fixed (car must stop), increasing Δt (collision time) decreases F (force). A longer crumple zone means more distance to stop, more time to stop, and lower peak force on passengers."
  },
  {
    scenario: "A crash test shows Car A stops in 0.1 seconds while Car B stops in 0.2 seconds from the same speed. Both cars have equal mass.",
    question: "How do the average forces on passengers compare?",
    options: [
      { text: "Car A passengers experience twice the force", correct: true },
      { text: "Car B passengers experience twice the force", correct: false },
      { text: "Both experience the same force", correct: false },
      { text: "Cannot determine without knowing the speed", correct: false }
    ],
    explanation: "Using F = Δp/Δt: if Δp is the same (both stop from the same momentum), and Δt for Car A is half of Car B, then F for Car A is 2× that of Car B. Doubling stopping time halves the force."
  },
  {
    scenario: "A physics student writes the equation J = FΔt = Δp on her exam, noting that J stands for impulse.",
    question: "What does the impulse-momentum theorem tell us about safety design?",
    options: [
      { text: "Impulse should be maximized in crashes", correct: false },
      { text: "For a given momentum change, extending time reduces force", correct: true },
      { text: "Force and time are independent variables", correct: false },
      { text: "Impulse only applies to elastic collisions", correct: false }
    ],
    explanation: "The impulse-momentum theorem (J = FΔt = Δp) shows that for a fixed momentum change Δp, increasing Δt (time) must decrease F (force). This is the physics behind crumple zones, airbags, and helmets."
  },
  {
    scenario: "An airbag inflates in 30 milliseconds when triggered, then slowly deflates as the passenger's head pushes into it.",
    question: "How does the airbag protect the passenger?",
    options: [
      { text: "By pushing the passenger back into the seat", correct: false },
      { text: "By increasing the stopping distance and time for the head", correct: true },
      { text: "By making the passenger lighter during impact", correct: false },
      { text: "By absorbing all the kinetic energy instantly", correct: false }
    ],
    explanation: "Airbags increase stopping distance from ~5cm (hitting dashboard) to ~30cm (compressing into airbag). This 6× increase in distance means ~6× more stopping time, reducing head deceleration force by ~6×."
  },
  {
    scenario: "Two cars of equal mass collide: Car A travels at 40 mph, Car B is stationary. They stick together after impact.",
    question: "What is the speed of the combined wreckage?",
    options: [
      { text: "40 mph - Car A's momentum is conserved", correct: false },
      { text: "20 mph - momentum shared between double the mass", correct: true },
      { text: "0 mph - they cancel each other out", correct: false },
      { text: "80 mph - kinetic energy doubles", correct: false }
    ],
    explanation: "Using momentum conservation: m(40) + m(0) = (2m)v'. Solving: 40m = 2mv', so v' = 20 mph. The combined mass is double, so velocity is half to conserve momentum."
  },
  {
    scenario: "A ball of clay is thrown at a wall and sticks to it. A rubber ball of equal mass thrown at the same speed bounces back.",
    question: "Which ball experiences greater average force from the wall?",
    options: [
      { text: "The clay ball - inelastic collisions have more force", correct: false },
      { text: "The rubber ball - it has greater momentum change", correct: true },
      { text: "Equal force - they have the same initial momentum", correct: false },
      { text: "The clay ball - it sticks to the wall", correct: false }
    ],
    explanation: "The rubber ball's momentum changes from +mv to -mv (bouncing back), so Δp = 2mv. The clay's momentum changes from +mv to 0, so Δp = mv. Greater Δp means greater force (assuming similar contact time)."
  },
  {
    scenario: "A helmet manual states that the helmet must be replaced after any significant impact, even if no visible damage exists.",
    question: "Why must helmets be replaced after an impact?",
    options: [
      { text: "The outer shell becomes weaker from UV exposure", correct: false },
      { text: "The foam crushes permanently, unable to absorb another impact", correct: true },
      { text: "The chin strap stretches and won't fit properly", correct: false },
      { text: "Legal liability requires new helmets after crashes", correct: false }
    ],
    explanation: "Helmets use EPS (expanded polystyrene) foam that works by crushing permanently to absorb energy. Once crushed, the foam cannot absorb another impact effectively—the \"inelastic\" deformation is a one-time safety feature."
  }
];

// -----------------------------------------------------------------------------
// Transfer Applications Data
// -----------------------------------------------------------------------------

const transferApps: TransferApp[] = [
  {
    icon: "🚗",
    title: "Automotive Crumple Zones",
    short: "Crumple",
    tagline: "Sacrificing the car to save the people",
    description: "Modern vehicles are engineered with precisely designed crumple zones that absorb collision energy through controlled deformation.",
    connection: "Crumple zones extend the collision time from ~30ms (rigid) to ~150ms, reducing peak force on occupants by a factor of 5× through the impulse-momentum relationship.",
    howItWorks: "The front and rear of cars contain carefully engineered structures that fold like an accordion during impact. Energy converts from kinetic to deformation energy, while the rigid passenger cell remains intact.",
    stats: [
      { value: "5×", label: "Force reduction vs rigid car" },
      { value: "~150ms", label: "Collision time with crumple" },
      { value: "40%", label: "Reduction in fatalities since 1980" }
    ],
    examples: [
      "Frontal crumple zones absorb head-on collisions",
      "Side impact beams protect against T-bone crashes",
      "Rear crumple zones for rear-end collisions"
    ],
    companies: ["Volvo", "Mercedes-Benz", "Tesla", "NHTSA"],
    futureImpact: "Active crumple zones using smart materials will adjust deformation based on crash severity detected by sensors milliseconds before impact.",
    color: "from-red-900/40 to-orange-900/40"
  },
  {
    icon: "🎈",
    title: "Airbag Systems",
    short: "Airbags",
    tagline: "Inflating in 30ms to cushion for 300ms",
    description: "Airbags deploy faster than the blink of an eye, then slowly deflate to cushion occupants over an extended period.",
    connection: "By increasing the stopping distance of your head from ~5cm to ~30cm, airbags extend the deceleration time by 6×, reducing force on the brain by the same factor.",
    howItWorks: "Accelerometers detect crash deceleration and trigger sodium azide ignition, producing nitrogen gas that inflates the bag in 20-30ms. Vents allow controlled deflation as the occupant compresses the bag.",
    stats: [
      { value: "30ms", label: "Time to fully inflate" },
      { value: "6×", label: "Increase in stopping distance" },
      { value: "30%", label: "Reduction in driver fatalities" }
    ],
    examples: [
      "Frontal airbags for steering wheel and dashboard",
      "Side curtain airbags for head protection",
      "Knee airbags to prevent sliding under dashboard"
    ],
    companies: ["Autoliv", "Takata/Joyson", "ZF TRW", "Continental"],
    futureImpact: "External airbags on car exteriors will deploy milliseconds before collision to protect pedestrians and reduce vehicle damage.",
    color: "from-blue-900/40 to-cyan-900/40"
  },
  {
    icon: "⛑️",
    title: "Helmet Engineering",
    short: "Helmets",
    tagline: "One-time protection through permanent deformation",
    description: "Helmets use crushable EPS foam that permanently deforms to absorb impact energy, which is why they must be replaced after any significant impact.",
    connection: "The foam crushing is a perfectly inelastic process—kinetic energy converts to deformation energy, and the foam cannot return to its original shape.",
    howItWorks: "EPS (expanded polystyrene) foam contains millions of tiny air pockets. During impact, these pockets crush permanently, extending the deceleration time and distributing force across a larger area.",
    stats: [
      { value: "~85%", label: "Energy absorbed by foam" },
      { value: "~10ms", label: "Impact duration increase" },
      { value: "37%", label: "Reduction in fatal head injuries" }
    ],
    examples: [
      "Motorcycle helmets with thick EPS layers",
      "Bicycle helmets with MIPS rotation systems",
      "Football helmets with multi-impact foam"
    ],
    companies: ["Shoei", "Bell", "Arai", "Giro"],
    futureImpact: "Self-healing helmet materials and real-time impact sensors will revolutionize head protection, potentially allowing multi-use energy absorption.",
    color: "from-amber-900/40 to-yellow-900/40"
  },
  {
    icon: "📦",
    title: "Packaging & Shipping",
    short: "Packaging",
    tagline: "Cushioning your products with physics",
    description: "Shipping packaging uses the same inelastic collision principles to protect fragile items during transport drops and impacts.",
    connection: "Foam inserts and air cushions extend the deceleration time of dropped packages, reducing peak forces on contents below their damage threshold.",
    howItWorks: "When a package drops, the outer box decelerates rapidly upon hitting the ground. Internal cushioning materials deform, allowing the product inside to decelerate more slowly, experiencing lower peak forces.",
    stats: [
      { value: "~95%", label: "Force reduction with proper cushioning" },
      { value: "1-2m", label: "Typical drop height protection" },
      { value: "$3B+", label: "Annual shipping damage costs avoided" }
    ],
    examples: [
      "Styrofoam corners for electronics",
      "Air pillows in Amazon boxes",
      "Molded pulp for delicate items"
    ],
    companies: ["Sealed Air", "Sonoco", "Pregis", "Smurfit Kappa"],
    futureImpact: "Biodegradable and reusable impact-absorbing materials will replace single-use plastics while maintaining the same protective physics.",
    color: "from-emerald-900/40 to-teal-900/40"
  }
];

// -----------------------------------------------------------------------------
// Teaching Milestones
// -----------------------------------------------------------------------------

const teachingMilestones = [
  { phase: 'hook', concept: 'Cars are designed to crumple for safety' },
  { phase: 'predict', concept: 'Longer collision time means less force' },
  { phase: 'play', concept: 'F = Δp/Δt - impulse-momentum theorem' },
  { phase: 'review', concept: 'KE not conserved, but momentum is' },
  { phase: 'twist_predict', concept: 'Perfectly inelastic: objects stick together' },
  { phase: 'twist_play', concept: '50% KE lost when equal masses collide and stick' },
  { phase: 'twist_review', concept: 'Lost KE protects passengers' },
  { phase: 'transfer', concept: 'Inelastic physics saves lives' },
  { phase: 'test', concept: 'Apply safety physics principles' },
  { phase: 'mastery', concept: 'Complete understanding of inelastic collisions' }
];

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

const InelasticCollisionsRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // Phase constants
  const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const phaseLabelsMap: Record<number, string> = {
    0: 'Hook',
    1: 'Predict',
    2: 'Lab',
    3: 'Review',
    4: 'Twist',
    5: 'Demo',
    6: 'Discovery',
    7: 'Apply',
    8: 'Test',
    9: 'Mastery'
  };

  // Phase and UI state
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [isMobile, setIsMobile] = useState(false);

  // Prediction state
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Car crash animation state
  const [carPosition, setCarPosition] = useState(0);
  const [crashProgress, setCrashProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasCrumpleZone, setHasCrumpleZone] = useState(true);
  const [showForces, setShowForces] = useState(true);
  const [impactSpeed, setImpactSpeed] = useState(30);
  const [crashCount, setCrashCount] = useState(0);

  // Transfer and test state
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);

  // Navigation debouncing
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationRef = useRef(0);

  // Sound player
  const playSound = useRef(createSoundPlayer()).current;

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data, timestamp: Date.now() });
    }
  }, [onGameEvent]);

  // Responsive design
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

  // Phase change events
  useEffect(() => {
    emitEvent('phase_change', { phase, milestone: teachingMilestones.find(m => m.phase === phase)?.concept });
  }, [phase, emitEvent]);

  // Crash animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCarPosition(prev => {
        if (prev >= 100) {
          setCrashProgress(p => {
            if (p >= 100) {
              setIsAnimating(false);
              return 100;
            }
            return p + (hasCrumpleZone ? 5 : 20);
          });
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, hasCrumpleZone]);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Navigation with debouncing
  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    lastNavigationRef.current = now;
    playSound('transition');
    emitEvent('navigation_clicked', { from: phase, to: newPhase, phaseName: phaseLabelsMap[newPhase] });

    navigationTimeoutRef.current = setTimeout(() => {
      setPhase(newPhase);
      onPhaseComplete?.(newPhase);
      navigationTimeoutRef.current = null;
    }, 50);
  }, [playSound, emitEvent, phase, phaseLabelsMap, onPhaseComplete]);

  // Handle initial prediction
  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);

    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    emitEvent('prediction_made', { prediction, isCorrect });
    emitEvent(isCorrect ? 'prediction_correct' : 'prediction_incorrect', { prediction });
  }, [playSound, emitEvent]);

  // Handle twist prediction
  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);

    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    emitEvent('twist_prediction_made', { prediction, isCorrect });
    emitEvent(isCorrect ? 'twist_correct' : 'twist_incorrect', { prediction });
  }, [playSound, emitEvent]);

  // Handle test answer
  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 200) return;
    lastNavigationRef.current = now;

    playSound('click');
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    emitEvent('test_answer_selected', { questionIndex, answerIndex });
  }, [playSound, emitEvent]);

  // Handle app completion
  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    playSound('complete');
    setCompletedApps(prev => new Set([...prev, appIndex]));
    emitEvent('app_completed', { appIndex, appTitle: transferApps[appIndex].title });
  }, [playSound, emitEvent]);

  // Start crash simulation
  const startCrash = useCallback(() => {
    setCarPosition(0);
    setCrashProgress(0);
    setIsAnimating(true);
    playSound('crash');
    setCrashCount(c => c + 1);
    emitEvent('crash_triggered', { speed: impactSpeed, hasCrumpleZone, crashNumber: crashCount + 1 });
  }, [impactSpeed, hasCrumpleZone, crashCount, playSound, emitEvent]);

  // Calculate test score
  const calculateScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      const correctIndex = testQuestions[index].options.findIndex(opt => opt.correct);
      return score + (answer === correctIndex ? 1 : 0);
    }, 0);
  }, [testAnswers]);

  // Submit test
  const handleTestSubmit = useCallback(() => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;

    const score = calculateScore();
    setShowTestResults(true);
    playSound(score >= 7 ? 'complete' : 'incorrect');
    emitEvent('test_completed', { score, total: 10, passed: score >= 7 });
    emitEvent(score >= 7 ? 'test_passed' : 'test_failed', { score });
  }, [calculateScore, playSound, emitEvent]);

  // Physics calculations
  const stoppingTime = hasCrumpleZone ? 0.15 : 0.03;
  const forceMultiplier = hasCrumpleZone ? 1 : 5;

  // ---------------------------------------------------------------------------
  // Render Helper Functions
  // ---------------------------------------------------------------------------

  const renderCrashSimulation = (size: number = 320): JSX.Element => {
    const wallX = size - 50;
    const carStartX = 50;
    const carX = carStartX + (wallX - carStartX - 80) * (carPosition / 100);
    const crumpleAmount = hasCrumpleZone ? crashProgress * 0.4 : crashProgress * 0.1;
    const carWidth = 80 - crumpleAmount;

    return (
      <svg width={size} height={size * 0.6} className="mx-auto">
        <defs>
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="carBodySafe" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="carBodyDanger" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="wallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <filter id="crashGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size * 0.6} fill="#1e293b" rx="12" />

        {/* Road */}
        <rect x="20" y={size * 0.6 - 50} width={size - 40} height="40" fill="url(#roadGrad)" rx="4" />
        <line x1="20" y1={size * 0.6 - 30} x2={size - 20} y2={size * 0.6 - 30} stroke="#fbbf24" strokeWidth="3" strokeDasharray="20 15" />

        {/* Wall */}
        <rect x={wallX} y={size * 0.6 - 120} width="30" height="110" fill="url(#wallGrad)" rx="2" />
        {[0, 1, 2, 3].map(row => (
          [0, 1].map(col => (
            <rect
              key={`brick-${row}-${col}`}
              x={wallX + 3 + col * 13}
              y={size * 0.6 - 115 + row * 27}
              width="11"
              height="24"
              fill="#9ca3af"
              rx="1"
            />
          ))
        ))}

        {/* Car */}
        <g transform={`translate(${carX}, ${size * 0.6 - 95})`}>
          {/* Car body */}
          <rect
            x={hasCrumpleZone ? crumpleAmount * 0.5 : 0}
            y="10"
            width={carWidth}
            height="30"
            rx="5"
            fill={hasCrumpleZone ? 'url(#carBodySafe)' : 'url(#carBodyDanger)'}
          />
          {/* Hood */}
          <path
            d={`M${carWidth - 5 + (hasCrumpleZone ? crumpleAmount * 0.5 : 0)},15
                Q${carWidth + 10 - crumpleAmount * 0.3},5 ${carWidth - 15},10
                L${carWidth - 15},35
                Q${carWidth + 10 - crumpleAmount * 0.3},40 ${carWidth - 5 + (hasCrumpleZone ? crumpleAmount * 0.5 : 0)},35 Z`}
            fill={hasCrumpleZone ? '#93c5fd' : '#fca5a5'}
          />
          {/* Cabin */}
          <rect
            x={hasCrumpleZone ? 15 + crumpleAmount * 0.3 : 15}
            y="0"
            width="35"
            height="25"
            rx="3"
            fill="#1e293b"
          />
          {/* Window */}
          <rect
            x={hasCrumpleZone ? 18 + crumpleAmount * 0.3 : 18}
            y="3"
            width="29"
            height="18"
            rx="2"
            fill="#93c5fd"
            opacity="0.7"
          />
          {/* Passenger (stick figure) */}
          <circle cx={hasCrumpleZone ? 32 + crumpleAmount * 0.2 : 32} cy="8" r="4" fill="#fcd34d" />
          <line
            x1={hasCrumpleZone ? 32 + crumpleAmount * 0.2 : 32}
            y1="12"
            x2={hasCrumpleZone ? 32 + crumpleAmount * 0.2 : 32}
            y2="20"
            stroke="#fcd34d"
            strokeWidth="2"
          />
          {/* Wheels */}
          <circle cx="15" cy="40" r="10" fill="#1f2937" />
          <circle cx="15" cy="40" r="5" fill="#6b7280" />
          <circle cx={carWidth - 15} cy="40" r="10" fill="#1f2937" />
          <circle cx={carWidth - 15} cy="40" r="5" fill="#6b7280" />
        </g>

        {/* Crumple effect */}
        {hasCrumpleZone && crashProgress > 20 && (
          <g filter="url(#crashGlow)">
            <text x={carX + 75} y={size * 0.6 - 110} fill="#22c55e" fontSize="10" fontWeight="bold">
              Energy absorbed!
            </text>
            {[0, 1, 2].map(i => (
              <circle
                key={`spark-${i}`}
                cx={carX + 78 - i * 6}
                cy={size * 0.6 - 95}
                r={4 - i}
                fill="#fbbf24"
                opacity={0.9 - i * 0.25}
              />
            ))}
          </g>
        )}

        {/* Force indicator */}
        {showForces && crashProgress > 0 && carPosition >= 100 && (
          <g>
            <rect
              x={size / 2 - 70}
              y={size * 0.6 - 45}
              width="140"
              height="35"
              rx="8"
              fill={hasCrumpleZone ? '#166534' : '#991b1b'}
              opacity="0.9"
            />
            <text
              x={size / 2}
              y={size * 0.6 - 22}
              textAnchor="middle"
              fill="white"
              fontSize="13"
              fontWeight="bold"
            >
              Force: {forceMultiplier}× {hasCrumpleZone ? '(Safe)' : '(DANGER!)'}
            </text>
          </g>
        )}

        {/* Speed indicator */}
        <text x="30" y="25" fill="#94a3b8" fontSize="11">
          Speed: <tspan fill="#f59e0b" fontWeight="bold">{impactSpeed} mph</tspan>
        </text>
      </svg>
    );
  };

  const renderEnergyDiagram = (): JSX.Element => {
    const width = isMobile ? 280 : 340;
    const height = isMobile ? 140 : 160;

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="keGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="12" />

        {/* Before */}
        <text x={width * 0.22} y="22" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Before Impact</text>
        <rect x="20" y="35" width={width * 0.28} height="40" fill="url(#keGrad)" rx="5" />
        <text x={20 + width * 0.14} y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">KE = ½mv²</text>

        {/* Arrow */}
        <line x1={width * 0.35} y1="55" x2={width * 0.42} y2="55" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#energyArrow)" />

        {/* After */}
        <text x={width * 0.72} y="22" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">After Impact</text>
        <rect x={width * 0.48} y="32" width={width * 0.18} height="22" fill="#22c55e" rx="3" />
        <text x={width * 0.57} y="47" textAnchor="middle" fill="white" fontSize="9">KE&apos;</text>
        <rect x={width * 0.48} y="58" width={width * 0.18} height="18" fill="#ef4444" rx="3" />
        <text x={width * 0.57} y="70" textAnchor="middle" fill="white" fontSize="8">Heat</text>
        <rect x={width * 0.68} y="32" width={width * 0.18} height="18" fill="#f59e0b" rx="3" />
        <text x={width * 0.77} y="44" textAnchor="middle" fill="white" fontSize="8">Sound</text>
        <rect x={width * 0.68} y="54" width={width * 0.18} height="22" fill="#a855f7" rx="3" />
        <text x={width * 0.77} y="69" textAnchor="middle" fill="white" fontSize="8">Deform</text>

        {/* Equation */}
        <text x={width / 2} y={height - 35} textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">
          KE_before = KE&apos; + Heat + Sound + Deformation
        </text>
        <text x={width / 2} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="10">
          Energy conserved, but KE is NOT!
        </text>

        <defs>
          <marker id="energyArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderMathComparison = (): JSX.Element => {
    const width = isMobile ? 300 : 380;
    const height = 200;

    return (
      <svg width={width} height={height} className="mx-auto">
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="12" />

        <text x={width / 2} y="25" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">
          Perfectly Inelastic Collision
        </text>

        {/* Before */}
        <g>
          <rect x="15" y="40" width={width / 2 - 25} height="65" fill="#3b82f6" fillOpacity="0.3" rx="8" stroke="#3b82f6" strokeWidth="1" />
          <text x={width / 4} y="58" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">Before</text>
          <circle cx={width / 4 - 20} cy="85" r="12" fill="#f59e0b" />
          <text x={width / 4 - 20} y="89" textAnchor="middle" fill="white" fontSize="10">m</text>
          <line x1={width / 4 - 5} y1="85" x2={width / 4 + 20} y2="85" stroke="#22c55e" strokeWidth="2" markerEnd="url(#velArrow)" />
          <text x={width / 4 + 30} y="89" fill="#22c55e" fontSize="10">v</text>
          <circle cx={width / 4 + 50} cy="85" r="12" fill="#94a3b8" />
          <text x={width / 4 + 50} y="89" textAnchor="middle" fill="white" fontSize="10">m</text>
        </g>

        {/* After */}
        <g>
          <rect x={width / 2 + 10} y="40" width={width / 2 - 25} height="65" fill="#22c55e" fillOpacity="0.3" rx="8" stroke="#22c55e" strokeWidth="1" />
          <text x={width * 3 / 4} y="58" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="bold">After (stuck)</text>
          <ellipse cx={width * 3 / 4} cy="85" rx="28" ry="14" fill="#f59e0b" />
          <text x={width * 3 / 4} y="89" textAnchor="middle" fill="white" fontSize="10">2m</text>
          <line x1={width * 3 / 4 + 32} y1="85" x2={width * 3 / 4 + 50} y2="85" stroke="#22c55e" strokeWidth="2" markerEnd="url(#velArrow)" />
          <text x={width * 3 / 4 + 60} y="89" fill="#22c55e" fontSize="10">v/2</text>
        </g>

        {/* Math */}
        <text x={width / 2} y="130" textAnchor="middle" fill="#60a5fa" fontSize="11">
          Momentum: mv + 0 = (2m)(v/2) = mv ✓
        </text>
        <text x={width / 2} y="150" textAnchor="middle" fill="#ef4444" fontSize="11">
          KE: ½mv² → ½(2m)(v/2)² = ¼mv²
        </text>
        <rect x={width / 2 - 70} y="160" width="140" height="30" fill="#991b1b" fillOpacity="0.5" rx="6" />
        <text x={width / 2} y="180" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="bold">
          50% kinetic energy LOST!
        </text>

        <defs>
          <marker id="velArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderAppAnimation = (appIndex: number): JSX.Element => {
    const width = isMobile ? 240 : 280;
    const height = 130;

    switch (appIndex) {
      case 0: // Crumple Zones
        return (
          <svg width={width} height={height} className="mx-auto">
            <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="10" />
            <rect x="20" y={height - 30} width={width - 40} height="20" fill="#374151" rx="4" />

            {/* Crumpled car */}
            <rect x="60" y="50" width="55" height="35" rx="5" fill="#3b82f6" />
            <path d="M115,55 Q130,45 108,50 L108,80 Q130,85 115,80 Z" fill="#60a5fa" />
            <rect x="75" y="42" width="28" height="22" fill="#1e293b" rx="2" />
            <circle cx="75" cy={height - 22} r="10" fill="#1f2937" />
            <circle cx="105" cy={height - 22} r="10" fill="#1f2937" />

            {/* Crumple waves */}
            <path d="M117,55 L124,62 L117,69 L124,76" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <path d="M127,58 L132,63 L127,68 L132,73" fill="none" stroke="#f59e0b" strokeWidth="1.5" />

            {/* Wall */}
            <rect x={width - 50} y="40" width="25" height="60" fill="#64748b" rx="2" />

            <text x={width / 2} y={height - 5} textAnchor="middle" fill="#94a3b8" fontSize="10">
              Controlled deformation saves lives
            </text>
          </svg>
        );

      case 1: // Airbags
        return (
          <svg width={width} height={height} className="mx-auto">
            <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="10" />

            {/* Steering wheel */}
            <circle cx="60" cy={height / 2} r="30" fill="#475569" />
            <circle cx="60" cy={height / 2} r="20" fill="#1e293b" />

            {/* Airbag */}
            <ellipse cx="115" cy={height / 2} rx="45" ry="38" fill="#f8fafc" opacity="0.9" />
            <ellipse cx="120" cy={height / 2 - 5} rx="35" ry="28" fill="#e2e8f0" />

            {/* Head */}
            <circle cx="155" cy={height / 2 - 5} r="16" fill="#fcd34d" />
            <circle cx="150" cy={height / 2 - 8} r="2" fill="#1f2937" />
            <circle cx="160" cy={height / 2 - 8} r="2" fill="#1f2937" />

            {/* Force arrows */}
            <line x1="180" y1={height / 2 - 5} x2="145" y2={height / 2 - 5} stroke="#ef4444" strokeWidth="2" markerEnd="url(#forceArrow)" />

            {/* Labels */}
            <text x="115" y="25" textAnchor="middle" fill="#22c55e" fontSize="9">30ms inflate</text>
            <text x={width / 2} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="10">
              Spreads force over longer time
            </text>

            <defs>
              <marker id="forceArrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
                <path d="M6,0 L6,6 L0,3 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        );

      case 2: // Helmets
        return (
          <svg width={width} height={height} className="mx-auto">
            <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="10" />

            {/* Helmet cross-section */}
            <path d={`M${width / 2 - 45},${height - 35} Q${width / 2 - 45},30 ${width / 2},30 Q${width / 2 + 45},30 ${width / 2 + 45},${height - 35} L${width / 2 + 35},${height - 30} Q${width / 2},${height - 25} ${width / 2 - 35},${height - 30} Z`} fill="#3b82f6" />
            <path d={`M${width / 2 - 35},${height - 40} Q${width / 2 - 35},42 ${width / 2},42 Q${width / 2 + 35},42 ${width / 2 + 35},${height - 40} L${width / 2 + 28},${height - 35} Q${width / 2},${height - 30} ${width / 2 - 28},${height - 35} Z`} fill="#94a3b8" />
            <text x={width / 2} y={height / 2 + 5} textAnchor="middle" fill="#1e293b" fontSize="9" fontWeight="bold">EPS Foam</text>

            {/* Impact */}
            <line x1={width / 2} y1="10" x2={width / 2} y2="28" stroke="#ef4444" strokeWidth="3" markerEnd="url(#impactArrow)" />
            <text x={width / 2 + 20} y="20" fill="#ef4444" fontSize="9">Impact</text>

            {/* Crushed area */}
            <ellipse cx={width / 2} cy="40" rx="18" ry="6" fill="#fbbf24" opacity="0.6" />

            <text x={width / 2} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="10">
              Foam crushes once to absorb energy
            </text>

            <defs>
              <marker id="impactArrow" markerWidth="8" markerHeight="8" refX="3" refY="7" orient="auto">
                <path d="M0,0 L6,0 L3,8 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        );

      case 3: // Packaging
        return (
          <svg width={width} height={height} className="mx-auto">
            <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="10" />

            {/* Outer box */}
            <rect x={width / 2 - 50} y="30" width="100" height="70" fill="#854d0e" rx="4" />
            <rect x={width / 2 - 45} y="35" width="90" height="60" fill="#a16207" rx="2" />

            {/* Foam cushioning */}
            <rect x={width / 2 - 40} y="40" width="80" height="50" fill="#d1d5db" rx="4" />

            {/* Product */}
            <rect x={width / 2 - 25} y="50" width="50" height="30" fill="#3b82f6" rx="2" />
            <text x={width / 2} y="70" textAnchor="middle" fill="white" fontSize="9">Product</text>

            {/* Drop arrow */}
            <line x1={width / 2} y1="5" x2={width / 2} y2="25" stroke="#ef4444" strokeWidth="2" markerEnd="url(#dropArrow)" />
            <text x={width / 2 + 25} y="15" fill="#ef4444" fontSize="9">Drop</text>

            {/* Force distribution */}
            <line x1={width / 2 - 30} y1={height - 25} x2={width / 2 - 50} y2={height - 15} stroke="#22c55e" strokeWidth="1.5" />
            <line x1={width / 2} y1={height - 25} x2={width / 2} y2={height - 10} stroke="#22c55e" strokeWidth="1.5" />
            <line x1={width / 2 + 30} y1={height - 25} x2={width / 2 + 50} y2={height - 15} stroke="#22c55e" strokeWidth="1.5" />

            <text x={width / 2} y={height - 3} textAnchor="middle" fill="#94a3b8" fontSize="10">
              Foam extends deceleration time
            </text>

            <defs>
              <marker id="dropArrow" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
                <path d="M0,0 L6,0 L3,6 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        );

      default:
        return <div />;
    }
  };

  // ---------------------------------------------------------------------------
  // Phase Renderers
  // ---------------------------------------------------------------------------

  const renderHook = (): JSX.Element => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 text-sm font-medium">Mechanics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent mb-3`}>
        Why Cars Are Designed to Crumple
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover how crumple zones save lives through physics
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-4 md:p-8 max-w-2xl shadow-2xl">
        {renderCrashSimulation(isMobile ? 300 : 360)}

        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-slate-300 mt-6 mb-4`}>
          Modern cars are engineered to crumple in a crash. Isn&apos;t a stronger, more rigid car safer?
        </p>

        <p className="text-lg text-red-400 font-medium mb-6">
          Actually, crumpling SAVES lives. But how?
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onMouseDown={(e) => { e.preventDefault(); startCrash(); }}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all"
          >
            Crash Test!
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setHasCrumpleZone(!hasCrumpleZone);
              emitEvent('car_type_changed', { hasCrumpleZone: !hasCrumpleZone });
            }}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${hasCrumpleZone ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'} text-white`}
          >
            {hasCrumpleZone ? 'With Crumple Zone' : 'Rigid Car'}
          </button>
        </div>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white text-lg font-semibold rounded-2xl hover:from-red-500 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Discover the Physics
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Subtle Hint */}
      <p className="mt-4 text-slate-500 text-sm">
        Tap to begin your exploration
      </p>
    </div>
  );

  const renderPredict = (): JSX.Element => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Make Your Prediction
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6 backdrop-blur-sm border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">
          Two identical cars crash at the same speed: one with crumple zones, one rigid. Both stop completely. Which experiences LESS force on passengers?
        </p>
        {renderEnergyDiagram()}
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The rigid car—it\'s stronger and more protective' },
          { id: 'B', text: 'The car with crumple zones—longer stopping time means less force' },
          { id: 'C', text: 'Both experience the same force—same momentum change' },
          { id: 'D', text: 'Neither—momentum is always conserved equally' }
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
                  : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent hover:border-slate-500'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl backdrop-blur-sm">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! <span className="text-cyan-400">F = Δp/Δt</span> — increasing Δt decreases force!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            The impulse-momentum theorem explains why extending collision time saves lives.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
        Inelastic Collision Lab
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4 backdrop-blur-sm border border-slate-700/50">
        {renderCrashSimulation(isMobile ? 300 : 380)}
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 w-full max-w-2xl mb-6`}>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">
            Impact Speed: <span className="text-red-400 font-bold">{impactSpeed} mph</span>
          </label>
          <input
            type="range"
            min="10"
            max="60"
            value={impactSpeed}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setImpactSpeed(val);
              emitEvent('speed_changed', { speed: val });
            }}
            className="w-full accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10</span><span>35</span><span>60</span>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Car Type</label>
          <div className="flex gap-2">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setHasCrumpleZone(true);
                emitEvent('car_type_changed', { hasCrumpleZone: true });
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${hasCrumpleZone ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}
            >
              🛡️ Crumple
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setHasCrumpleZone(false);
                emitEvent('car_type_changed', { hasCrumpleZone: false });
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!hasCrumpleZone ? 'bg-red-600 text-white' : 'bg-slate-600 text-slate-300'}`}
            >
              ⚠️ Rigid
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); startCrash(); }}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all"
        >
          💥 Crash Test!
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setShowForces(!showForces);
            emitEvent('display_toggled', { display: 'forces', value: !showForces });
          }}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all ${showForces ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'}`}
        >
          {showForces ? '⚡ Forces ON' : '⚡ Forces OFF'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl w-full mb-6 border border-red-700/30">
        <h3 className="text-lg font-semibold text-red-400 mb-3">Impulse-Momentum Theorem</h3>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center mb-3">
          <span className="text-xl font-mono text-cyan-400">F = Δp / Δt</span>
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 text-center`}>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">With Crumple Zone</div>
            <div className="text-lg font-bold text-blue-400">Δt ≈ 150ms</div>
            <div className="text-xs text-slate-500">Longer time, lower force</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">Rigid Car</div>
            <div className="text-lg font-bold text-red-400">Δt ≈ 30ms</div>
            <div className="text-xs text-slate-500">Short time, HIGH force</div>
          </div>
        </div>
        <p className="text-center text-emerald-400 mt-3 text-sm font-medium">
          5× longer time = 5× less force on passengers!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Understanding Inelastic Collisions
      </h2>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6 max-w-4xl`}>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6 border border-red-700/30">
          <h3 className="text-xl font-bold text-red-400 mb-3">💔 Kinetic Energy NOT Conserved</h3>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-red-500">•</span>
              <span>KE converts to <strong className="text-white">heat, sound, deformation</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">•</span>
              <span>Total energy IS conserved—just not as kinetic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">•</span>
              <span>This energy &quot;loss&quot; is actually <strong className="text-emerald-400">safety!</strong></span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 border border-blue-700/30">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">✓ Momentum IS Conserved</h3>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span><strong className="text-white">p_before = p_after</strong> (always true!)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Impulse: <strong className="text-white">J = Δp = F × Δt</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Same Δp, different F (depending on Δt)</span>
            </li>
          </ul>
        </div>

        <div className={`bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-emerald-700/30 ${isMobile ? '' : 'md:col-span-2'}`}>
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🛡️ The Safety Principle</h3>
          <div className="text-slate-300 text-sm space-y-3">
            <p>
              <strong className="text-white">The physics problem:</strong> Car must stop (Δp is fixed by initial momentum)
            </p>
            <p>
              <strong className="text-white">The design choice:</strong> Short time + huge force OR long time + small force
            </p>
            <div className="bg-slate-800/50 rounded-lg p-3 mt-4">
              <p className="text-cyan-400 font-medium text-center">
                Crumple zones, airbags, and helmets all extend collision time to reduce force!
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = (): JSX.Element => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full px-4 py-1 mb-4">
        <span className="text-purple-400 text-sm font-medium">🌟 Twist Challenge</span>
      </div>

      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        The Collision Puzzle
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6 backdrop-blur-sm border border-purple-700/30">
        <p className="text-lg text-slate-300 mb-4">
          A 2000 lb car traveling at 30 mph hits a stationary 2000 lb car. They stick together (perfectly inelastic). What&apos;s the combined speed?
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Hint: Momentum is conserved! (p = mv)
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: '30 mph—the moving car\'s momentum is conserved' },
          { id: 'B', text: '0 mph—they cancel each other out' },
          { id: 'C', text: '15 mph—momentum shared between double the mass' },
          { id: 'D', text: '60 mph—kinetic energy doubles on impact' }
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
                  : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent hover:border-purple-500'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl backdrop-blur-sm">
          <p className="text-emerald-400 font-semibold">✓ Correct! mv = (2m)v&apos; → v&apos; = v/2 = 15 mph</p>
          <p className="text-slate-400 text-sm mt-2">
            Double the mass means half the velocity to conserve momentum—but what about the kinetic energy?
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            See the Energy Loss →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>
        Where Does the Energy Go?
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-6 max-w-2xl backdrop-blur-sm border border-purple-700/30">
        <h3 className="text-lg font-semibold text-amber-400 mb-4 text-center">
          Perfectly Inelastic Collision Math
        </h3>
        {renderMathComparison()}
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl border border-purple-700/30">
        <h3 className="text-lg font-bold text-purple-400 mb-3">The Silver Lining:</h3>
        <p className="text-slate-300 text-sm mb-4">
          That &quot;lost&quot; 50% of kinetic energy went into crumpling the car instead of crumpling YOU. The deformation absorbs energy that would otherwise accelerate your organs to dangerous levels.
        </p>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-cyan-400 text-sm font-medium text-center">
            Inelastic collisions save lives by converting deadly kinetic energy into harmless deformation!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        🌟 Key Discovery
      </h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6 border border-purple-700/30">
        <h3 className="text-xl font-bold text-purple-400 mb-4">
          Inelastic Collisions Are Safety Features!
        </h3>

        <div className="space-y-4 text-slate-300">
          <p>
            The physics that makes inelastic collisions &quot;lose&quot; energy is exactly what makes them safe:
          </p>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">🚗</span>
                <span><strong className="text-white">Crumple zones:</strong> Convert KE to deformation energy</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">🎈</span>
                <span><strong className="text-white">Airbags:</strong> Extend time, reduce peak force</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">⛑️</span>
                <span><strong className="text-white">Helmets:</strong> Foam crushes to absorb energy</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">📦</span>
                <span><strong className="text-white">Packaging:</strong> Cushioning extends deceleration</span>
              </li>
            </ul>
          </div>

          <p className="text-emerald-400 font-medium mt-4 text-center">
            The energy &quot;lost&quot; in an inelastic collision is energy that didn&apos;t go into hurting people!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = (): JSX.Element => {
    const app = transferApps[activeAppIndex];

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
          Real-World Applications
        </h2>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {transferApps.map((a, index) => (
            <button
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppIndex(index);
                emitEvent('app_explored', { appIndex: index, appTitle: a.title });
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeAppIndex === index
                  ? 'bg-red-600 text-white scale-105'
                  : completedApps.has(index)
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="mr-1">{a.icon}</span>
              <span className={isMobile ? 'hidden' : ''}>{a.short}</span>
            </button>
          ))}
        </div>

        <div className={`bg-gradient-to-br ${app.color} rounded-2xl p-4 md:p-6 max-w-2xl w-full backdrop-blur-sm border border-slate-700/50`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{app.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-sm text-slate-400">{app.tagline}</p>
            </div>
          </div>

          <div className="my-4">
            {renderAppAnimation(activeAppIndex)}
          </div>

          <p className="text-slate-300 mb-4">{app.description}</p>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-red-400 mb-2">Physics Connection</h4>
            <p className="text-sm text-slate-300">{app.connection}</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">How It Works</h4>
            <p className="text-sm text-slate-300">{app.howItWorks}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {app.stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-red-400">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Real Examples</h4>
            <div className="flex flex-wrap gap-2">
              {app.examples.map((example, i) => (
                <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                  {example}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-400 mb-2">Industry Leaders</h4>
            <div className="flex flex-wrap gap-2">
              {app.companies.map((company, i) => (
                <span key={i} className="text-xs bg-slate-700/50 text-cyan-400 px-2 py-1 rounded">
                  {company}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-semibold text-purple-400 mb-1">Future Impact</h4>
            <p className="text-xs text-slate-300">{app.futureImpact}</p>
          </div>

          {!completedApps.has(activeAppIndex) && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppIndex); }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all"
            >
              ✓ Mark as Understood
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-slate-400 text-sm">Progress:</span>
          <div className="flex gap-1">
            {transferApps.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400 text-sm">{completedApps.size}/4</span>
        </div>

        {completedApps.size >= 4 && (
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all"
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderTest = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Knowledge Assessment
      </h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="mb-3">
                <span className="text-red-400 text-sm font-medium">Scenario:</span>
                <p className="text-slate-400 text-sm mt-1">{q.scenario}</p>
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
            onMouseDown={(e) => { e.preventDefault(); handleTestSubmit(); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500'
            }`}
          >
            {testAnswers.includes(-1)
              ? `Answer all questions (${testAnswers.filter(a => a !== -1).length}/10)`
              : 'Submit Answers'
            }
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered inelastic collision safety physics!'
                : 'Keep studying! Review the concepts and try again.'
              }
            </p>
          </div>

          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
            {testQuestions.map((q, qIndex) => {
              const correctIndex = q.options.findIndex(opt => opt.correct);
              const isCorrect = testAnswers[qIndex] === correctIndex;

              return (
                <div
                  key={qIndex}
                  className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-red-900/30 border border-red-700'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{qIndex + 1}. {q.question}</p>
                      {!isCorrect && (
                        <p className="text-xs text-slate-400 mt-1">
                          Correct: {q.options[correctIndex].text}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); emitEvent('mastery_achieved', { score: calculateScore() }); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all"
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
              className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = (): JSX.Element => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-6 md:p-8 max-w-2xl backdrop-blur-sm border border-red-700/30">
        <div className="text-8xl mb-6">🛡️</div>

        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Inelastic Collision Master!
        </h1>

        <p className="text-xl text-slate-300 mb-6">
          You&apos;ve mastered the physics that keeps people safe!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">💥</div>
            <p className="text-sm text-slate-300 font-medium">Crumple Zones</p>
            <p className="text-xs text-slate-500">Extend collision time</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🎈</div>
            <p className="text-sm text-slate-300 font-medium">Airbags</p>
            <p className="text-xs text-slate-500">Increase stopping distance</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">⛑️</div>
            <p className="text-sm text-slate-300 font-medium">Helmets</p>
            <p className="text-xs text-slate-500">Absorb through deformation</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-sm text-slate-300 font-medium">Impulse-Momentum</p>
            <p className="text-xs text-slate-500">F = Δp/Δt</p>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 font-medium text-sm">Key Mastered Concepts:</p>
          <ul className="text-slate-400 text-xs mt-2 space-y-1 text-left">
            <li>• KE is NOT conserved, but momentum IS</li>
            <li>• F = Δp/Δt explains safety engineering</li>
            <li>• Energy &quot;lost&quot; to deformation protects people</li>
            <li>• Extending collision time reduces peak force</li>
          </ul>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
        >
          ↺ Explore Again
        </button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  const renderPhase = (): JSX.Element => {
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
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/50 via-transparent to-orange-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Navigation header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>Inelastic Collisions</span>
          <div className="flex gap-1.5 items-center">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-red-500 w-6' : phase > i ? 'bg-red-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabelsMap[p]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseLabelsMap[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default InelasticCollisionsRenderer;
