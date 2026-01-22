'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// ELASTIC COLLISIONS RENDERER - GOLD STANDARD IMPLEMENTATION
// Game 31: Newton's Cradle - Conservation of Momentum and Kinetic Energy
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
  | 'collision_triggered'
  | 'balls_released_changed'
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

  return (type: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'collision' | 'whoosh') => {
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
          gainNode.gain.exponentialDecayToValueAtTime?.(0.01, now + 0.08) || gainNode.gain.setValueAtTime(0.01, now + 0.08);
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
        case 'collision':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(1200, now);
          oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.1);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
        case 'whoosh':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(200, now);
          oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          gainNode.gain.setValueAtTime(0.05, now);
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
    scenario: "A pool player hits the cue ball into the 8-ball. The cue ball stops dead, and the 8-ball moves away at the same speed.",
    question: "What quantities are conserved in this elastic collision?",
    options: [
      { text: "Only momentum is conserved", correct: false },
      { text: "Only kinetic energy is conserved", correct: false },
      { text: "Both momentum and kinetic energy are conserved", correct: true },
      { text: "Neither momentum nor kinetic energy is conserved", correct: false }
    ],
    explanation: "Elastic collisions conserve BOTH momentum (p = mv) AND kinetic energy (KE = ½mv²). The cue ball transfers all its momentum and energy to the 8-ball."
  },
  {
    scenario: "You're playing with a Newton's cradle on your desk. Steel balls click back and forth for several minutes before stopping.",
    question: "Why does Newton's cradle demonstrate nearly elastic collisions?",
    options: [
      { text: "The balls are magnetic and attract each other", correct: false },
      { text: "Steel balls barely deform, losing very little energy to heat", correct: true },
      { text: "The strings store and release energy", correct: false },
      { text: "Air resistance is zero inside the cradle", correct: false }
    ],
    explanation: "Steel is very hard and barely deforms on impact. The tiny deformation stores energy briefly as elastic potential, then returns almost all of it. Real steel balls lose only 1-5% energy per collision."
  },
  {
    scenario: "You pull back 2 balls on the left side of a Newton's cradle and release them.",
    question: "What happens on the other side?",
    options: [
      { text: "1 ball flies out at double the speed", correct: false },
      { text: "2 balls fly out at the same speed the incoming balls had", correct: true },
      { text: "All 5 balls move together slowly", correct: false },
      { text: "The middle ball absorbs the energy and heats up", correct: false }
    ],
    explanation: "Exactly 2 balls swing out at the same velocity. This is the ONLY outcome that conserves both momentum AND kinetic energy simultaneously."
  },
  {
    scenario: "A physics textbook describes a collision as having a coefficient of restitution (e) equal to 1.",
    question: "What does this tell you about the collision?",
    options: [
      { text: "The objects stick together (perfectly inelastic)", correct: false },
      { text: "Half the kinetic energy is lost", correct: false },
      { text: "It's a perfectly elastic collision with no energy loss", correct: true },
      { text: "The collision takes exactly 1 second", correct: false }
    ],
    explanation: "The coefficient of restitution e = 1 means perfectly elastic (no energy loss). e = 0 means perfectly inelastic (objects stick together). Real collisions have 0 < e < 1."
  },
  {
    scenario: "A student asks: 'When 2 balls are released on Newton's cradle, why can't 1 ball fly out at twice the speed? Both conserve momentum!'",
    question: "What's the correct response?",
    options: [
      { text: "Friction prevents the ball from reaching 2x speed", correct: false },
      { text: "1 ball at 2x speed would have 4x the kinetic energy, violating energy conservation", correct: true },
      { text: "The string length limits maximum velocity", correct: false },
      { text: "Gravity pulls equally on all balls, so they must move equally", correct: false }
    ],
    explanation: "KE = ½mv², so doubling velocity quadruples energy! 2 balls at v have KE = mv², but 1 ball at 2v would have KE = ½m(2v)² = 2mv². Energy conservation forbids this."
  },
  {
    scenario: "Two identical hockey pucks slide toward each other on frictionless ice and collide head-on elastically.",
    question: "What happens after the collision?",
    options: [
      { text: "Both pucks stop at the collision point", correct: false },
      { text: "They exchange velocities - each moves the opposite direction at the other's original speed", correct: true },
      { text: "They stick together and move at half speed", correct: false },
      { text: "Both pucks continue in their original directions at half speed", correct: false }
    ],
    explanation: "In an elastic head-on collision between equal masses, they exchange velocities completely. This satisfies both conservation of momentum and conservation of kinetic energy."
  },
  {
    scenario: "Engineers test two different materials for collision efficiency. Material A loses 2% energy per collision, Material B loses 15%.",
    question: "Which material is closer to perfectly elastic behavior?",
    options: [
      { text: "Material B, because higher percentages mean more elasticity", correct: false },
      { text: "Material A, because less energy loss means more elastic behavior", correct: true },
      { text: "Both are equally elastic since they both lose some energy", correct: false },
      { text: "Neither is elastic because elastic collisions lose 0% energy", correct: false }
    ],
    explanation: "Material A (2% loss) is more elastic because it returns more kinetic energy. Steel balls (1-5% loss) and billiard balls (5-10% loss) are considered 'nearly elastic' in practice."
  },
  {
    scenario: "During an elastic collision, you observe the objects briefly compress against each other before separating.",
    question: "Where does the kinetic energy go during that brief compression?",
    options: [
      { text: "It's converted to heat and lost permanently", correct: false },
      { text: "It's stored temporarily as elastic potential energy in the deformation", correct: true },
      { text: "It's destroyed and then recreated", correct: false },
      { text: "It transfers to the surrounding air as sound waves", correct: false }
    ],
    explanation: "During compression, kinetic energy converts to elastic potential energy stored in the materials' deformation. In a perfectly elastic collision, 100% of this energy returns as kinetic energy."
  },
  {
    scenario: "Professional billiard players know that hitting a stationary ball dead-center produces different results than hitting it at an angle.",
    question: "Why do billiard balls approximate elastic collisions?",
    options: [
      { text: "The colorful coating reduces friction", correct: false },
      { text: "They're made of hard phenolic resin that barely deforms", correct: true },
      { text: "The green felt table absorbs excess energy", correct: false },
      { text: "Their spherical shape eliminates energy loss", correct: false }
    ],
    explanation: "Billiard balls are made of hard phenolic resin that deforms very little on impact. This minimal deformation means most kinetic energy is returned rather than lost to heat."
  },
  {
    scenario: "A moving ball strikes an identical stationary ball in a perfectly elastic collision on a frictionless surface.",
    question: "What is the final state after collision?",
    options: [
      { text: "Both balls move together at half the original velocity", correct: false },
      { text: "The first ball stops completely; the second moves at the original velocity", correct: true },
      { text: "The first ball bounces back; the second ball doesn't move", correct: false },
      { text: "Both balls stop at the point of collision", correct: false }
    ],
    explanation: "This is the classic elastic collision result for equal masses: complete momentum and energy transfer. The moving ball stops, and the stationary ball takes on all the momentum and kinetic energy."
  }
];

// -----------------------------------------------------------------------------
// Transfer Applications Data
// -----------------------------------------------------------------------------

const transferApps: TransferApp[] = [
  {
    icon: "🎱",
    title: "Pool & Billiards",
    short: "Billiards",
    tagline: "Where geometry meets elastic physics",
    description: "Professional pool players rely on elastic collision physics to predict and control shot outcomes with millimeter precision.",
    connection: "Billiard balls made of hard phenolic resin demonstrate nearly elastic collisions, allowing players to transfer momentum predictably between balls.",
    howItWorks: "When the cue ball strikes an object ball head-on, nearly all momentum transfers to the target ball. Angled shots split the momentum according to elastic collision equations, enabling precise position play.",
    stats: [
      { value: "~95%", label: "Energy retained per collision" },
      { value: "6-8 m/s", label: "Professional break shot speed" },
      { value: "0.2ms", label: "Ball contact duration" }
    ],
    examples: [
      "Stop shot - cue ball stops dead after center-hit",
      "Follow through - topspin continues cue ball forward",
      "Draw shot - backspin pulls cue ball back after collision"
    ],
    companies: ["Aramith", "Brunswick", "Simonis", "Diamond Billiards"],
    futureImpact: "AI-assisted training systems now use elastic collision physics to analyze and improve player technique in real-time.",
    color: "from-green-900/40 to-emerald-900/40"
  },
  {
    icon: "⚛️",
    title: "Particle Physics",
    short: "Particles",
    tagline: "Probing the universe's smallest building blocks",
    description: "Particle accelerators use elastic collision physics to study fundamental particles and discover new physics at the smallest scales.",
    connection: "When particles collide at nearly light speed, elastic scattering reveals their internal structure and the forces between them.",
    howItWorks: "The Large Hadron Collider accelerates protons to 99.9999991% of light speed. When they collide, scientists analyze the elastic scattering patterns to study quark and gluon interactions.",
    stats: [
      { value: "13 TeV", label: "LHC collision energy" },
      { value: "99.9999991%", label: "Proton speed (of light)" },
      { value: "1 billion", label: "Collisions per second" }
    ],
    examples: [
      "Rutherford scattering - alpha particles off gold nuclei",
      "Deep inelastic scattering - probing proton structure",
      "Elastic p-p scattering - measuring strong force"
    ],
    companies: ["CERN", "Fermilab", "SLAC", "Brookhaven"],
    futureImpact: "Future particle colliders will use refined elastic collision analysis to search for dark matter particles and physics beyond the Standard Model.",
    color: "from-blue-900/40 to-indigo-900/40"
  },
  {
    icon: "🚀",
    title: "Gravity Assist Maneuvers",
    short: "Slingshot",
    tagline: "Free speed from planetary encounters",
    description: "Spacecraft use gravitational 'elastic collisions' with planets to gain speed and redirect their trajectories without using fuel.",
    connection: "A gravity assist is equivalent to an elastic collision in the planet's reference frame - the spacecraft bounces off the planet's gravitational field while conserving energy.",
    howItWorks: "As a spacecraft approaches a planet, it falls into the gravity well, gaining speed. By timing the approach correctly, it swings around and exits in a new direction, keeping the extra velocity relative to the Sun.",
    stats: [
      { value: "35,700 km/h", label: "Voyager 1 speed gained at Jupiter" },
      { value: "9+ years", label: "Time saved on New Horizons' Pluto mission" },
      { value: "0 fuel", label: "Required for velocity change" }
    ],
    examples: [
      "Voyager missions - multiple planet slingshots to escape solar system",
      "Cassini - Venus-Venus-Earth-Jupiter to reach Saturn",
      "Parker Solar Probe - Venus assists to approach the Sun"
    ],
    companies: ["NASA JPL", "ESA", "SpaceX", "Blue Origin"],
    futureImpact: "Interstellar missions will chain multiple gravity assists to achieve the extreme speeds needed to reach nearby stars within human lifetimes.",
    color: "from-purple-900/40 to-violet-900/40"
  },
  {
    icon: "⚾",
    title: "Sports Equipment Engineering",
    short: "Sports",
    tagline: "Maximum energy return for peak performance",
    description: "Sports equipment engineers design bats, rackets, and clubs to maximize elastic energy return at the 'sweet spot' for optimal performance.",
    connection: "The coefficient of restitution determines how much kinetic energy returns after impact - higher means more power transfer to the ball.",
    howItWorks: "Engineers optimize material stiffness, weight distribution, and contact geometry to create equipment where the impact point stores and returns maximum elastic energy. The 'sweet spot' is where vibration is minimized and energy transfer maximized.",
    stats: [
      { value: "0.546", label: "Baseball coefficient of restitution" },
      { value: "~20%", label: "Ball energy lost on bat impact" },
      { value: "100+ mph", label: "Exit velocity with sweet spot hit" }
    ],
    examples: [
      "Baseball bats - composite materials for larger sweet spot",
      "Tennis rackets - string tension optimization",
      "Golf clubs - titanium faces for maximum COR"
    ],
    companies: ["Wilson", "Callaway", "Louisville Slugger", "Head"],
    futureImpact: "Smart equipment with embedded sensors now provides real-time feedback on collision efficiency, helping athletes find and consistently hit the sweet spot.",
    color: "from-amber-900/40 to-orange-900/40"
  }
];

// -----------------------------------------------------------------------------
// Teaching Milestones
// -----------------------------------------------------------------------------

const teachingMilestones = [
  { phase: 'hook', concept: 'Newton\'s cradle exhibits surprising behavior' },
  { phase: 'predict', concept: 'Elastic collisions conserve both momentum and KE' },
  { phase: 'play', concept: 'Momentum p=mv, kinetic energy KE=½mv²' },
  { phase: 'review', concept: 'Equal masses exchange velocities completely' },
  { phase: 'twist_predict', concept: 'KE scales with v², constraining outcomes' },
  { phase: 'twist_play', concept: 'Both conservation laws must be satisfied simultaneously' },
  { phase: 'twist_review', concept: 'Mathematics determines unique physical outcome' },
  { phase: 'transfer', concept: 'Elastic collisions enable real-world applications' },
  { phase: 'test', concept: 'Apply elastic collision principles' },
  { phase: 'mastery', concept: 'Complete understanding of elastic collisions' }
];

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

const ElasticCollisionsRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Newton's cradle animation state
  const [leftBallAngle, setLeftBallAngle] = useState(-30);
  const [rightBallAngle, setRightBallAngle] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<'left_swing' | 'impact' | 'right_swing' | 'right_return'>('left_swing');
  const [isAnimating, setIsAnimating] = useState(true);
  const [numBallsReleased, setNumBallsReleased] = useState(1);
  const [showMomentum, setShowMomentum] = useState(true);
  const [showEnergy, setShowEnergy] = useState(true);
  const [collisionCount, setCollisionCount] = useState(0);

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

  // Phase change events
  useEffect(() => {
    emitEvent('phase_change', { phase, milestone: teachingMilestones.find(m => m.phase === phase)?.concept });
  }, [phase, emitEvent]);

  // Newton's cradle animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      switch (animationPhase) {
        case 'left_swing':
          setLeftBallAngle(prev => {
            const newAngle = prev + 3;
            if (newAngle >= 0) {
              setAnimationPhase('impact');
              playSound('collision');
              setCollisionCount(c => c + 1);
              emitEvent('collision_triggered', { collisionNumber: collisionCount + 1 });
              return 0;
            }
            return newAngle;
          });
          break;
        case 'impact':
          setAnimationPhase('right_swing');
          setRightBallAngle(0);
          break;
        case 'right_swing':
          setRightBallAngle(prev => {
            const newAngle = prev + 3;
            if (newAngle >= 30 * numBallsReleased) {
              setAnimationPhase('right_return');
              return 30 * numBallsReleased;
            }
            return newAngle;
          });
          break;
        case 'right_return':
          setRightBallAngle(prev => {
            const newAngle = prev - 3;
            if (newAngle <= 0) {
              setAnimationPhase('left_swing');
              setLeftBallAngle(-30 * numBallsReleased);
              return 0;
            }
            return newAngle;
          });
          break;
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating, animationPhase, numBallsReleased, playSound, emitEvent, collisionCount]);

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

    const isCorrect = prediction === 'C';
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

    const isCorrect = prediction === 'B';
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

  // Reset animation
  const resetAnimation = useCallback(() => {
    setLeftBallAngle(-30 * numBallsReleased);
    setRightBallAngle(0);
    setAnimationPhase('left_swing');
    setIsAnimating(true);
    playSound('whoosh');
    emitEvent('experiment_started', { numBalls: numBallsReleased });
  }, [numBallsReleased, playSound, emitEvent]);

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

  // ---------------------------------------------------------------------------
  // Render Helper Functions (not components to avoid React reconciliation issues)
  // ---------------------------------------------------------------------------

  const renderNewtonsCradle = (size: number = 300, showLabels: boolean = true): JSX.Element => {
    const centerX = size / 2;
    const topY = 40;
    const stringLength = size * 0.35;
    const ballRadius = size * 0.05;
    const spacing = ballRadius * 2.15;

    const balls: { x: number; y: number; angle: number; index: number; isMoving: boolean }[] = [];

    for (let i = 0; i < 5; i++) {
      let angle = 0;
      let isMoving = false;

      // Handle multi-ball release
      if (i < numBallsReleased && animationPhase === 'left_swing') {
        angle = leftBallAngle;
        isMoving = angle !== 0;
      } else if (i >= 5 - numBallsReleased && (animationPhase === 'right_swing' || animationPhase === 'right_return')) {
        angle = rightBallAngle;
        isMoving = angle !== 0;
      }

      const angleRad = angle * Math.PI / 180;
      const ballX = centerX + (i - 2) * spacing + Math.sin(angleRad) * stringLength;
      const ballY = topY + Math.cos(angleRad) * stringLength;

      balls.push({ x: ballX, y: ballY, angle, index: i, isMoving });
    }

    const movingBall = balls.find(b => b.isMoving);
    const velocity = movingBall ? Math.abs(Math.sin(movingBall.angle * Math.PI / 180)) * 2 : 0;
    const momentum = velocity * numBallsReleased;
    const kineticEnergy = 0.5 * numBallsReleased * velocity * velocity;
    const potentialEnergy = movingBall ? (1 - Math.cos(movingBall.angle * Math.PI / 180)) * 0.5 * numBallsReleased : 0;
    const totalEnergy = kineticEnergy + potentialEnergy;

    return (
      <svg width={size} height={size * 0.7} className="mx-auto">
        <defs>
          <linearGradient id="cradleFrame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="steelBall" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="movingBall" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size * 0.7} fill="#1e293b" rx="12" />

        {/* Frame */}
        <rect x={centerX - spacing * 3} y={topY - 25} width={spacing * 6} height="15" fill="url(#cradleFrame)" rx="4" />
        <rect x={centerX - spacing * 3 - 8} y={topY - 30} width="12" height="25" fill="#64748b" rx="2" />
        <rect x={centerX + spacing * 3 - 4} y={topY - 30} width="12" height="25" fill="#64748b" rx="2" />

        {/* Strings and balls */}
        {balls.map((ball, i) => (
          <g key={i}>
            <line
              x1={centerX + (i - 2) * spacing}
              y1={topY - 10}
              x2={ball.x}
              y2={ball.y - ballRadius}
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <circle
              cx={ball.x}
              cy={ball.y}
              r={ballRadius}
              fill={ball.isMoving ? "url(#movingBall)" : "url(#steelBall)"}
              filter={ball.isMoving ? "url(#glow)" : "url(#ballShadow)"}
            />
            {/* Highlight */}
            <circle
              cx={ball.x - ballRadius * 0.3}
              cy={ball.y - ballRadius * 0.3}
              r={ballRadius * 0.2}
              fill="rgba(255,255,255,0.4)"
            />
          </g>
        ))}

        {/* Velocity vector */}
        {movingBall && showLabels && (
          <g filter="url(#glow)">
            <line
              x1={movingBall.x}
              y1={movingBall.y}
              x2={movingBall.x + (movingBall.angle > 0 ? 35 : -35)}
              y2={movingBall.y}
              stroke="#22c55e"
              strokeWidth="3"
              markerEnd="url(#velocityArrow)"
            />
            <text
              x={movingBall.x + (movingBall.angle > 0 ? 45 : -45)}
              y={movingBall.y + 5}
              fill="#22c55e"
              fontSize="12"
              fontWeight="bold"
              textAnchor={movingBall.angle > 0 ? "start" : "end"}
            >
              v
            </text>
          </g>
        )}

        {/* Conservation displays */}
        {showLabels && (
          <>
            {showMomentum && (
              <g>
                <rect x="10" y={size * 0.7 - 65} width="100" height="55" fill="#1e40af" opacity="0.4" rx="8" />
                <text x="60" y={size * 0.7 - 45} textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">
                  Momentum
                </text>
                <text x="60" y={size * 0.7 - 25} textAnchor="middle" fill="#93c5fd" fontSize="16" fontWeight="bold">
                  p = {momentum.toFixed(2)}
                </text>
              </g>
            )}
            {showEnergy && (
              <g>
                <rect x={size - 110} y={size * 0.7 - 65} width="100" height="55" fill="#166534" opacity="0.4" rx="8" />
                <text x={size - 60} y={size * 0.7 - 45} textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">
                  Total Energy
                </text>
                <text x={size - 60} y={size * 0.7 - 25} textAnchor="middle" fill="#86efac" fontSize="16" fontWeight="bold">
                  E = {totalEnergy.toFixed(2)}
                </text>
              </g>
            )}
          </>
        )}

        {/* Marker definitions */}
        <defs>
          <marker id="velocityArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderCollisionDiagram = (): JSX.Element => {
    const width = isMobile ? 280 : 340;
    const height = isMobile ? 140 : 160;

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="movingBallDiag" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="stationaryBallDiag" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="12" />

        {/* Before section */}
        <text x={width * 0.22} y="22" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">Before</text>

        {/* Moving ball (before) */}
        <circle cx={width * 0.12} cy={height * 0.45} r="18" fill="url(#movingBallDiag)" />
        <text x={width * 0.12} y={height * 0.45 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">m</text>

        {/* Velocity arrow (before) */}
        <line x1={width * 0.18} y1={height * 0.45} x2={width * 0.28} y2={height * 0.45} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowGreenDiag)" />
        <text x={width * 0.23} y={height * 0.35} fill="#22c55e" fontSize="11" fontWeight="bold">v</text>

        {/* Stationary ball (before) */}
        <circle cx={width * 0.33} cy={height * 0.45} r="18" fill="url(#stationaryBallDiag)" />
        <text x={width * 0.33} y={height * 0.45 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">m</text>

        {/* Arrow between sections */}
        <line x1={width * 0.43} y1={height * 0.5} x2={width * 0.55} y2={height * 0.5} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowGrayDiag)" />

        {/* After section */}
        <text x={width * 0.78} y="22" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">After</text>

        {/* First ball stopped (after) */}
        <circle cx={width * 0.62} cy={height * 0.45} r="18" fill="url(#stationaryBallDiag)" />
        <text x={width * 0.62} y={height * 0.45 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">m</text>

        {/* Moving ball (after) */}
        <circle cx={width * 0.88} cy={height * 0.45} r="18" fill="url(#movingBallDiag)" />
        <text x={width * 0.88} y={height * 0.45 + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">m</text>

        {/* Velocity arrow (after) */}
        <line x1={width * 0.72} y1={height * 0.45} x2={width * 0.82} y2={height * 0.45} stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowGreenDiag)" />
        <text x={width * 0.77} y={height * 0.35} fill="#22c55e" fontSize="11" fontWeight="bold">v</text>

        {/* Labels */}
        <text x={width * 0.5} y={height - 25} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">
          Velocities exchange!
        </text>
        <text x={width * 0.5} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="11">
          p₁ + p₂ = p₁&apos; + p₂&apos;
        </text>

        <defs>
          <marker id="arrowGreenDiag" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#22c55e" />
          </marker>
          <marker id="arrowGrayDiag" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderEnergyComparison = (): JSX.Element => {
    const width = isMobile ? 300 : 380;
    const height = 200;

    return (
      <svg width={width} height={height} className="mx-auto">
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="12" />

        {/* Title */}
        <text x={width / 2} y="25" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="bold">
          Why 2 balls, not 1 at 2× speed?
        </text>

        {/* Left side - 2 balls at v */}
        <g>
          <rect x="15" y="45" width={width / 2 - 25} height="140" fill="#166534" fillOpacity="0.3" rx="8" stroke="#22c55e" strokeWidth="1" />
          <text x={width / 4} y="70" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="bold">✓ 2 balls at v</text>

          {/* Two balls */}
          <circle cx={width / 4 - 15} cy="100" r="12" fill="#f59e0b" />
          <circle cx={width / 4 + 15} cy="100" r="12" fill="#f59e0b" />
          <line x1={width / 4 + 30} y1="100" x2={width / 4 + 50} y2="100" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowSmall)" />
          <text x={width / 4 + 60} y="104" fill="#22c55e" fontSize="10">v</text>

          <text x={width / 4} y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">p = 2mv</text>
          <text x={width / 4} y="148" textAnchor="middle" fill="#94a3b8" fontSize="11">KE = ½(2m)v² = mv²</text>
          <text x={width / 4} y="172" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">Both conserved!</text>
        </g>

        {/* Right side - 1 ball at 2v */}
        <g>
          <rect x={width / 2 + 10} y="45" width={width / 2 - 25} height="140" fill="#991b1b" fillOpacity="0.3" rx="8" stroke="#ef4444" strokeWidth="1" />
          <text x={width * 3 / 4} y="70" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold">✗ 1 ball at 2v</text>

          {/* One ball */}
          <circle cx={width * 3 / 4 - 10} cy="100" r="12" fill="#f59e0b" />
          <line x1={width * 3 / 4 + 5} y1="100" x2={width * 3 / 4 + 45} y2="100" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRed)" />
          <text x={width * 3 / 4 + 55} y="104" fill="#ef4444" fontSize="10">2v</text>

          <text x={width * 3 / 4} y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">p = m(2v) = 2mv ✓</text>
          <text x={width * 3 / 4} y="148" textAnchor="middle" fill="#94a3b8" fontSize="11">KE = ½m(2v)² = 2mv²</text>
          <text x={width * 3 / 4} y="172" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">Energy doubled! ✗</text>
        </g>

        <defs>
          <marker id="arrowSmall" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
          </marker>
          <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderAppAnimation = (appIndex: number): JSX.Element => {
    const width = isMobile ? 240 : 280;
    const height = 140;

    switch (appIndex) {
      case 0: // Pool & Billiards
        return (
          <svg width={width} height={height} className="mx-auto">
            <defs>
              <linearGradient id="feltGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#166534" />
                <stop offset="100%" stopColor="#14532d" />
              </linearGradient>
              <radialGradient id="cueBall" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </radialGradient>
              <radialGradient id="eightBall" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="100%" stopColor="#111827" />
              </radialGradient>
            </defs>
            <rect x="5" y="5" width={width - 10} height={height - 10} fill="url(#feltGreen)" rx="8" stroke="#854d0e" strokeWidth="8" />
            <rect x="10" y="10" width={width - 20} height={height - 20} fill="url(#feltGreen)" rx="5" />

            <circle cx={width * 0.3} cy={height / 2} r="14" fill="url(#cueBall)" />
            <circle cx={width * 0.55} cy={height / 2} r="14" fill="url(#eightBall)" />
            <circle cx={width * 0.55} cy={height / 2 - 2} r="6" fill="white" />
            <text x={width * 0.55} y={height / 2 + 2} textAnchor="middle" fill="black" fontSize="8" fontWeight="bold">8</text>

            <line x1={width * 0.35} y1={height / 2} x2={width * 0.48} y2={height / 2} stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" />
            <line x1={width * 0.62} y1={height / 2} x2={width * 0.85} y2={height / 2} stroke="#22c55e" strokeWidth="2" markerEnd="url(#poolArrow)" />

            <text x={width / 2} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="10">Complete momentum transfer</text>

            <defs>
              <marker id="poolArrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#22c55e" />
              </marker>
            </defs>
          </svg>
        );

      case 1: // Particle Physics
        return (
          <svg width={width} height={height} className="mx-auto">
            <defs>
              <radialGradient id="particleGlow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="10" />

            {/* Accelerator ring */}
            <circle cx={width / 2} cy={height / 2} r="45" fill="none" stroke="#1e40af" strokeWidth="12" opacity="0.3" />
            <circle cx={width / 2} cy={height / 2} r="45" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="15 8">
              <animateTransform attributeName="transform" type="rotate" from="0 {width/2} {height/2}" to="360 {width/2} {height/2}" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Collision point */}
            <circle cx={width / 2} cy={height / 2 - 45} r="15" fill="url(#particleGlow)" />
            <circle cx={width / 2} cy={height / 2 - 45} r="6" fill="#f59e0b" />

            {/* Scattered particles */}
            <line x1={width / 2} y1={height / 2 - 45} x2={width / 2 - 30} y2="5" stroke="#22c55e" strokeWidth="2" />
            <line x1={width / 2} y1={height / 2 - 45} x2={width / 2 + 30} y2="5" stroke="#22c55e" strokeWidth="2" />
            <circle cx={width / 2 - 30} cy="8" r="3" fill="#22c55e" />
            <circle cx={width / 2 + 30} cy="8" r="3" fill="#22c55e" />

            {/* Detector segments */}
            <circle cx={width * 0.2} cy={height / 2} r="4" fill="#ef4444" />
            <circle cx={width * 0.8} cy={height / 2} r="4" fill="#ef4444" />

            <text x={width / 2} y={height - 10} textAnchor="middle" fill="#94a3b8" fontSize="10">LHC collision analysis</text>
          </svg>
        );

      case 2: // Gravity Assists
        return (
          <svg width={width} height={height} className="mx-auto">
            <defs>
              <radialGradient id="jupiterGrad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="10" />

            {/* Stars */}
            {[...Array(15)].map((_, i) => (
              <circle key={i} cx={20 + (i * 17) % width} cy={10 + (i * 13) % (height - 20)} r="1" fill="#e2e8f0" opacity="0.5" />
            ))}

            {/* Jupiter */}
            <circle cx={width / 2} cy={height / 2 + 10} r="30" fill="url(#jupiterGrad)" />
            <ellipse cx={width / 2} cy={height / 2 + 5} rx="28" ry="4" fill="#d97706" opacity="0.6" />
            <ellipse cx={width / 2} cy={height / 2 + 15} rx="26" ry="3" fill="#92400e" opacity="0.5" />

            {/* Spacecraft trajectory */}
            <path d="M20,25 Q{width*0.35},{height*0.6} {width/2},{height/2-25} Q{width*0.65},{height*0.3} {width-25},15" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />

            {/* Spacecraft */}
            <polygon points="{width-25},15 {width-35},20 {width-25},25 {width-15},20" fill="#f8fafc" />

            {/* Velocity vectors */}
            <line x1="25" y1="30" x2="50" y2="45" stroke="#fbbf24" strokeWidth="2" />
            <text x="55" y="50" fill="#fbbf24" fontSize="9">v_in</text>
            <line x1={width - 20} y1="20" x2={width - 5} y2="10" stroke="#22c55e" strokeWidth="3" />
            <text x={width - 25} y="40" fill="#22c55e" fontSize="9">v_out</text>

            <text x={width / 2} y={height - 8} textAnchor="middle" fill="#94a3b8" fontSize="10">Gravity slingshot boost</text>
          </svg>
        );

      case 3: // Sports Equipment
        return (
          <svg width={width} height={height} className="mx-auto">
            <defs>
              <linearGradient id="batWood" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="10" />

            {/* Baseball bat */}
            <rect x={width * 0.35} y="20" width="18" height="70" rx="4" fill="url(#batWood)" transform="rotate(-15, {width*0.44}, 55)" />
            <rect x={width * 0.37} y="80" width="14" height="30" rx="2" fill="#78350f" transform="rotate(-15, {width*0.44}, 95)" />

            {/* Sweet spot indicator */}
            <ellipse cx={width * 0.42} cy="45" rx="12" ry="8" fill="#22c55e" fillOpacity="0.3" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 2" transform="rotate(-15, {width*0.42}, 45)" />
            <text x={width * 0.55} y="35" fill="#22c55e" fontSize="9">Sweet spot</text>

            {/* Incoming ball */}
            <circle cx={width * 0.15} cy="50" r="10" fill="white" stroke="#dc2626" strokeWidth="2" />
            <line x1={width * 0.2} y1="50" x2={width * 0.3} y2="52" stroke="#fbbf24" strokeWidth="2" />

            {/* Outgoing ball */}
            <circle cx={width * 0.8} cy="25" r="10" fill="white" stroke="#dc2626" strokeWidth="2" />
            <line x1={width * 0.55} y1="45" x2={width * 0.75} y2="28" stroke="#22c55e" strokeWidth="3" markerEnd="url(#batArrow)" />

            <text x={width / 2} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="10">Maximum energy return</text>

            <defs>
              <marker id="batArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
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
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">MECHANICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-amber-200 via-white to-orange-200 bg-clip-text text-transparent">
        Newton&apos;s Cradle: The Perfect Bounce
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        Why does the same number always come out?
      </p>

      {/* Premium card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-amber-500/5 mb-8">
        {renderNewtonsCradle(isMobile ? 280 : 360, true)}

        <p className="text-lg text-slate-300 mt-6 mb-4">
          Pull back one ball, and exactly one ball swings out. Pull back two, and two swing out!
        </p>

        <p className="text-base text-amber-400 font-medium mb-6">
          Why doesn&apos;t one ball fly out at double speed?
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onMouseDown={(e) => { e.preventDefault(); setIsAnimating(!isAnimating); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
          >
            {isAnimating ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); resetAnimation(); }}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all duration-200"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Physics
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <p className="mt-6 text-sm text-slate-500">Explore momentum and energy conservation</p>
    </div>
  );

  const renderPredict = (): JSX.Element => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Make Your Prediction
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6 backdrop-blur-sm border border-slate-700/50">
        <p className="text-lg text-slate-300 mb-4">
          A moving ball collides with an identical stationary ball. What makes this collision &quot;elastic&quot;?
        </p>
        {renderCollisionDiagram()}
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The balls are made of rubber and bounce' },
          { id: 'B', text: 'Only momentum is conserved' },
          { id: 'C', text: 'Both momentum AND kinetic energy are conserved' },
          { id: 'D', text: 'The balls stick together after impact' }
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
            ✓ Correct! <span className="text-cyan-400">Elastic collisions</span> conserve both momentum AND kinetic energy!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is what makes Newton&apos;s cradle possible—no energy is lost to heat or deformation.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all"
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
        Elastic Collision Lab
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4 backdrop-blur-sm border border-slate-700/50">
        {renderNewtonsCradle(isMobile ? 300 : 380, true)}
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 w-full max-w-2xl mb-6`}>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">
            Balls Released: <span className="text-amber-400 font-bold">{numBallsReleased}</span>
          </label>
          <input
            type="range"
            min="1"
            max="4"
            value={numBallsReleased}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setNumBallsReleased(val);
              emitEvent('balls_released_changed', { numBalls: val });
            }}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span><span>2</span><span>3</span><span>4</span>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Display Options</label>
          <div className="flex gap-2">
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowMomentum(!showMomentum); emitEvent('display_toggled', { display: 'momentum', value: !showMomentum }); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showMomentum ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}
            >
              Momentum (p)
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowEnergy(!showEnergy); emitEvent('display_toggled', { display: 'energy', value: !showEnergy }); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showEnergy ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-300'}`}
            >
              Energy (E)
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsAnimating(!isAnimating); }}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all ${isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
        >
          {isAnimating ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); resetAnimation(); }}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-all"
        >
          🔄 Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl w-full mb-6 border border-amber-700/30">
        <h3 className="text-lg font-semibold text-amber-400 mb-3">Conservation Laws in Elastic Collisions</h3>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 text-center`}>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">Momentum Conservation</div>
            <div className="text-lg font-bold text-blue-400">Σp_before = Σp_after</div>
            <div className="text-xs text-slate-500 mt-1">p = mv (mass × velocity)</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">Kinetic Energy Conservation</div>
            <div className="text-lg font-bold text-emerald-400">ΣKE_before = ΣKE_after</div>
            <div className="text-xs text-slate-500 mt-1">KE = ½mv² (scales with v²!)</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Why Steel Balls?</h3>
        <p className="text-slate-300 text-sm">
          Steel is very hard and barely deforms on impact. The tiny deformation stores energy briefly as elastic potential energy, then returns almost all of it (95-99%) as kinetic energy.
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Understanding Elastic Collisions
      </h2>

      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6 max-w-4xl`}>
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6 border border-amber-700/30">
          <h3 className="text-xl font-bold text-amber-400 mb-3">🔄 What&apos;s Conserved</h3>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span><strong className="text-white">Momentum:</strong> p = mv (always conserved in all collisions)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span><strong className="text-white">Kinetic Energy:</strong> KE = ½mv² (only in elastic collisions!)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span>No energy lost to heat, sound, or permanent deformation</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 border border-blue-700/30">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">⚡ Equal Mass Special Case</h3>
          <ul className="space-y-3 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>When m₁ = m₂ and one ball is stationary:</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Velocities <strong className="text-white">completely exchange</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Moving ball stops, stationary ball moves at original velocity</span>
            </li>
          </ul>
        </div>

        <div className={`bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 border border-purple-700/30 ${isMobile ? '' : 'md:col-span-2'}`}>
          <h3 className="text-xl font-bold text-purple-400 mb-3">📊 Coefficient of Restitution (e)</h3>
          <p className="text-slate-300 text-sm mb-4">
            The coefficient of restitution measures how &quot;bouncy&quot; a collision is:
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xl font-bold text-emerald-400">e = 1</div>
              <div className="text-xs text-slate-400 mt-1">Perfectly elastic</div>
              <div className="text-xs text-slate-500">No energy loss</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xl font-bold text-amber-400">0 &lt; e &lt; 1</div>
              <div className="text-xs text-slate-400 mt-1">Real collisions</div>
              <div className="text-xs text-slate-500">Some energy lost</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-xl font-bold text-red-400">e = 0</div>
              <div className="text-xs text-slate-400 mt-1">Perfectly inelastic</div>
              <div className="text-xs text-slate-500">Objects stick together</div>
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
        The Energy Puzzle
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6 backdrop-blur-sm border border-purple-700/30">
        <p className="text-lg text-slate-300 mb-4">
          On Newton&apos;s cradle, you release 2 balls. Why do exactly 2 balls swing out, not 1 ball at double speed?
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          Both options would conserve momentum: p = 2mv = m(2v)
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The strings prevent 1 ball from moving at 2× speed' },
          { id: 'B', text: '1 ball at 2× speed would violate energy conservation' },
          { id: 'C', text: 'The balls are magnetically coupled together' },
          { id: 'D', text: 'Air resistance limits maximum velocity' }
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
          <p className="text-emerald-400 font-semibold">✓ Exactly! Energy conservation is the key!</p>
          <p className="text-slate-400 text-sm mt-2">
            KE scales with v², so doubling velocity quadruples the energy. Mathematics rules out the 1-ball option!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            See the Math →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = (): JSX.Element => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>
        The Energy Constraint
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-6 max-w-2xl backdrop-blur-sm border border-purple-700/30">
        <h3 className="text-lg font-semibold text-amber-400 mb-4 text-center">
          Why 2 balls in = 2 balls out?
        </h3>
        {renderEnergyComparison()}
      </div>

      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl p-4 max-w-2xl w-full mb-6 border border-cyan-700/30">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">🔑 The Key Insight</h3>
        <p className="text-slate-300 text-sm mb-3">
          Kinetic energy depends on velocity <strong>squared</strong>:
        </p>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center mb-3">
          <span className="text-lg font-mono text-cyan-400">KE = ½mv²</span>
        </div>
        <p className="text-slate-300 text-sm">
          This means <strong>doubling velocity quadruples energy</strong>. Since energy must be conserved, the only valid outcome is the one where both momentum AND energy equations are satisfied simultaneously.
        </p>
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
          Energy Conservation Constrains Physical Outcomes!
        </h3>

        <div className="space-y-4 text-slate-300">
          <p>
            Conserving <strong className="text-white">both</strong> momentum and energy gives a unique mathematical solution:
          </p>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Pull 1 ball → 1 ball swings out at same velocity</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Pull 2 balls → 2 balls swing out at same velocity</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Pull 3 balls → 3 balls swing out at same velocity</span>
              </li>
            </ul>
          </div>

          <p className="text-emerald-400 font-medium mt-4 text-center">
            Newton&apos;s cradle behavior is the only mathematically possible outcome for elastic collisions!
          </p>

          <p className="text-slate-400 text-sm text-center">
            Physics isn&apos;t just describing what happens—it&apos;s mathematically predicting the only possible result.
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all"
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
                  ? 'bg-amber-600 text-white scale-105'
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
            <h4 className="text-sm font-semibold text-amber-400 mb-2">Physics Connection</h4>
            <p className="text-sm text-slate-300">{app.connection}</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">How It Works</h4>
            <p className="text-sm text-slate-300">{app.howItWorks}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {app.stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-amber-400">{stat.value}</div>
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
            className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all"
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
                <span className="text-amber-400 text-sm font-medium">Scenario:</span>
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
                        ? 'bg-amber-600 text-white'
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
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500'
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
                ? 'Excellent! You\'ve mastered elastic collisions!'
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
              className="w-full px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all"
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
      <div className="bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-6 md:p-8 max-w-2xl backdrop-blur-sm border border-amber-700/30">
        <div className="text-8xl mb-6">🎱</div>

        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Elastic Collision Master!
        </h1>

        <p className="text-xl text-slate-300 mb-6">
          You&apos;ve mastered the physics of elastic collisions!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-sm text-slate-300 font-medium">Energy Conservation</p>
            <p className="text-xs text-slate-500">KE₁ + KE₂ = KE₁&apos; + KE₂&apos;</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">➡️</div>
            <p className="text-sm text-slate-300 font-medium">Momentum Transfer</p>
            <p className="text-xs text-slate-500">p₁ + p₂ = p₁&apos; + p₂&apos;</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🔄</div>
            <p className="text-sm text-slate-300 font-medium">Velocity Exchange</p>
            <p className="text-xs text-slate-500">Equal masses swap velocities</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-3xl mb-2">🚀</div>
            <p className="text-sm text-slate-300 font-medium">Real Applications</p>
            <p className="text-xs text-slate-500">Billiards to space travel</p>
          </div>
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 font-medium text-sm">Key Mastered Concepts:</p>
          <ul className="text-slate-400 text-xs mt-2 space-y-1 text-left">
            <li>• Elastic collisions conserve both momentum and kinetic energy</li>
            <li>• KE scales with v², constraining collision outcomes</li>
            <li>• Newton&apos;s cradle behavior is mathematically unique</li>
            <li>• Coefficient of restitution measures collision elasticity</li>
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
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-amber-400">Elastic Collisions</span>
          <div className="flex gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 w-6 shadow-lg shadow-amber-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabelsMap[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabelsMap[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default ElasticCollisionsRenderer;
