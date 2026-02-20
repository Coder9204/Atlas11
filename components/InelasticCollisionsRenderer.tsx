'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// =============================================================================
// INELASTIC COLLISIONS RENDERER - Complete 10-Phase Learning Structure
// Game 32: Car Crashes & Safety Physics - Why Cars Are Designed to Crumple
// =============================================================================

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

interface InelasticCollisionsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'crash') => {
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
      complete: { freq: 900, duration: 0.4, type: 'sine' },
      crash: { freq: 150, duration: 0.3, type: 'sawtooth' }
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
    scenario: "A car traveling at 60 mph crashes into a concrete barrier. After the crash, the car comes to a complete stop, with significant damage to the front end.",
    question: "In this inelastic collision, what happens to the kinetic energy?",
    options: [
      { id: 'a', label: "It's conserved and transfers to the barrier" },
      { id: 'b', label: "It's converted to heat, sound, and deformation energy", correct: true },
      { id: 'c', label: "It's destroyed according to the collision laws" },
      { id: 'd', label: "It doubles due to the impact force" }
    ],
    explanation: "In inelastic collisions, kinetic energy is NOT conserved—it converts to other forms like heat (metal heating), sound (crash noise), and deformation energy (crumpling). Total energy is still conserved, just not as kinetic energy."
  },
  {
    scenario: "Two identical trucks collide head-on. Despite the kinetic energy loss, investigators use momentum calculations to reconstruct the crash.",
    question: "Why can they rely on momentum even though energy isn't conserved?",
    options: [
      { id: 'a', label: "Momentum is only conserved in elastic collisions" },
      { id: 'b', label: "Momentum is ALWAYS conserved in collisions, regardless of type", correct: true },
      { id: 'c', label: "Momentum conservation only applies to slow-moving objects" },
      { id: 'd', label: "Investigators use a different formula for inelastic collisions" }
    ],
    explanation: "Momentum (p = mv) is ALWAYS conserved in collisions because there's no external force. This is true for elastic, inelastic, and perfectly inelastic collisions. Energy conservation only means KE = KE' in elastic collisions."
  },
  {
    scenario: "A moving train car couples with a stationary train car. After coupling, they move together as one unit.",
    question: "This is an example of what type of collision?",
    options: [
      { id: 'a', label: "Elastic collision - objects bounce apart" },
      { id: 'b', label: "Perfectly inelastic collision - objects stick together", correct: true },
      { id: 'c', label: "Super-elastic collision - energy is gained" },
      { id: 'd', label: "Non-physical collision - violates physics laws" }
    ],
    explanation: "A perfectly inelastic collision is when objects stick together after impact, losing the maximum possible kinetic energy while still conserving momentum. Train coupling is a textbook example of this."
  },
  {
    scenario: "An automotive engineer is designing a new car's front end. She makes the crumple zone 50cm longer than the previous model.",
    question: "How does this change affect crash safety?",
    options: [
      { id: 'a', label: "No effect - the car will still stop in the same time" },
      { id: 'b', label: "Extends collision time, reducing peak force on passengers", correct: true },
      { id: 'c', label: "Makes the car heavier, increasing momentum" },
      { id: 'd', label: "Reduces the car's momentum during normal driving" }
    ],
    explanation: "From F = delta-p/delta-t, if delta-p is fixed (car must stop), increasing delta-t (collision time) decreases F (force). A longer crumple zone means more distance to stop, more time to stop, and lower peak force on passengers."
  },
  {
    scenario: "A crash test shows Car A stops in 0.1 seconds while Car B stops in 0.2 seconds from the same speed. Both cars have equal mass.",
    question: "How do the average forces on passengers compare?",
    options: [
      { id: 'a', label: "Car A passengers experience twice the force", correct: true },
      { id: 'b', label: "Car B passengers experience twice the force" },
      { id: 'c', label: "Both experience the same force" },
      { id: 'd', label: "Cannot determine without knowing the speed" }
    ],
    explanation: "Using F = delta-p/delta-t: if delta-p is the same (both stop from the same momentum), and delta-t for Car A is half of Car B, then F for Car A is 2x that of Car B. Doubling stopping time halves the force."
  },
  {
    scenario: "A physics student writes the equation J = F*delta-t = delta-p on her exam, noting that J stands for impulse.",
    question: "What does the impulse-momentum theorem tell us about safety design?",
    options: [
      { id: 'a', label: "Impulse should be maximized in crashes" },
      { id: 'b', label: "For a given momentum change, extending time reduces force", correct: true },
      { id: 'c', label: "Force and time are independent variables" },
      { id: 'd', label: "Impulse only applies to elastic collisions" }
    ],
    explanation: "The impulse-momentum theorem (J = F*delta-t = delta-p) shows that for a fixed momentum change delta-p, increasing delta-t (time) must decrease F (force). This is the physics behind crumple zones, airbags, and helmets."
  },
  {
    scenario: "An airbag inflates in 30 milliseconds when triggered, then slowly deflates as the passenger's head pushes into it.",
    question: "How does the airbag protect the passenger?",
    options: [
      { id: 'a', label: "By pushing the passenger back into the seat" },
      { id: 'b', label: "By increasing the stopping distance and time for the head", correct: true },
      { id: 'c', label: "By making the passenger lighter during impact" },
      { id: 'd', label: "By absorbing all the kinetic energy instantly" }
    ],
    explanation: "Airbags increase stopping distance from ~5cm (hitting dashboard) to ~30cm (compressing into airbag). This 6x increase in distance means ~6x more stopping time, reducing head deceleration force by ~6x."
  },
  {
    scenario: "Two cars of equal mass collide: Car A travels at 40 mph, Car B is stationary. They stick together after impact.",
    question: "What is the speed of the combined wreckage?",
    options: [
      { id: 'a', label: "40 mph - Car A's momentum is conserved" },
      { id: 'b', label: "20 mph - momentum shared between double the mass", correct: true },
      { id: 'c', label: "0 mph - they cancel each other out" },
      { id: 'd', label: "80 mph - kinetic energy doubles" }
    ],
    explanation: "Using momentum conservation: m(40) + m(0) = (2m)v'. Solving: 40m = 2mv', so v' = 20 mph. The combined mass is double, so velocity is half to conserve momentum."
  },
  {
    scenario: "A ball of clay is thrown at a wall and sticks to it. A rubber ball of equal mass thrown at the same speed bounces back.",
    question: "Which ball experiences greater average force from the wall?",
    options: [
      { id: 'a', label: "The clay ball - inelastic collisions have more force" },
      { id: 'b', label: "The rubber ball - it has greater momentum change", correct: true },
      { id: 'c', label: "Equal force - they have the same initial momentum" },
      { id: 'd', label: "The clay ball - it sticks to the wall" }
    ],
    explanation: "The rubber ball's momentum changes from +mv to -mv (bouncing back), so delta-p = 2mv. The clay's momentum changes from +mv to 0, so delta-p = mv. Greater delta-p means greater force (assuming similar contact time)."
  },
  {
    scenario: "A helmet manual states that the helmet must be replaced after any significant impact, even if no visible damage exists.",
    question: "Why must helmets be replaced after an impact?",
    options: [
      { id: 'a', label: "The outer shell becomes weaker from UV exposure" },
      { id: 'b', label: "The foam crushes permanently, unable to absorb another impact", correct: true },
      { id: 'c', label: "The chin strap stretches and won't fit properly" },
      { id: 'd', label: "Legal liability requires new helmets after crashes" }
    ],
    explanation: "Helmets use EPS (expanded polystyrene) foam that works by crushing permanently to absorb energy. Once crushed, the foam cannot absorb another impact effectively—the 'inelastic' deformation is a one-time safety feature."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Automotive Crumple Zones',
    short: 'Sacrificing the car to save the people',
    tagline: 'Engineering survival through controlled deformation',
    description: 'Modern vehicles are designed with crumple zones that intentionally deform during collisions. These zones convert kinetic energy into deformation work, extending the collision time and reducing peak forces on occupants.',
    connection: 'Inelastic collisions convert kinetic energy into other forms like heat and deformation. Crumple zones exploit this by maximizing energy absorption through plastic deformation, reducing the energy transferred to passengers.',
    howItWorks: 'During impact, the crumple zone undergoes plastic deformation, converting kinetic energy into deformation energy. The impulse J = F*delta-t remains constant, so by increasing delta-t through progressive crushing, the peak force F is dramatically reduced.',
    stats: [
      { value: '5x', label: 'Force reduction', icon: '⚡' },
      { value: '$45B', label: 'Safety market', icon: '💰' },
      { value: '40ms', label: 'Crash duration', icon: '⏱️' }
    ],
    examples: ['Front crumple zones in passenger vehicles', 'Rear impact absorption structures', 'Side impact door beams', 'Pedestrian-friendly hood designs'],
    companies: ['Volvo', 'Mercedes-Benz', 'Toyota', 'Tesla'],
    futureImpact: 'Future vehicles will use adaptive crumple zones with smart materials that can adjust stiffness based on crash severity, occupant position, and collision angle for optimized protection.',
    color: '#EF4444'
  },
  {
    icon: '🎈',
    title: 'Airbag Systems',
    short: 'Inflating in 30ms to cushion for 300ms',
    tagline: 'Milliseconds matter in brain protection',
    description: 'Airbags deploy faster than the blink of an eye, then slowly deflate to cushion occupants over an extended period. They increase stopping distance dramatically.',
    connection: 'By increasing the stopping distance of your head from ~5cm to ~30cm, airbags extend the deceleration time by 6x, reducing force on the brain by the same factor.',
    howItWorks: 'Accelerometers detect crash deceleration and trigger sodium azide ignition, producing nitrogen gas that inflates the bag in 20-30ms. Vents allow controlled deflation as the occupant compresses the bag.',
    stats: [
      { value: '30ms', label: 'Inflation time', icon: '⚡' },
      { value: '6x', label: 'Distance increase', icon: '📏' },
      { value: '30%', label: 'Fatality reduction', icon: '❤️' }
    ],
    examples: ['Frontal airbags for steering wheel and dashboard', 'Side curtain airbags for head protection', 'Knee airbags to prevent sliding under dashboard'],
    companies: ['Autoliv', 'ZF TRW', 'Continental', 'Takata'],
    futureImpact: 'External airbags on car exteriors will deploy milliseconds before collision to protect pedestrians and reduce vehicle damage.',
    color: '#3B82F6'
  },
  {
    icon: '⛑️',
    title: 'Helmet Engineering',
    short: 'One-time protection through permanent deformation',
    tagline: 'Sacrificial foam saves brains',
    description: 'Helmets use crushable EPS foam that permanently deforms to absorb impact energy, which is why they must be replaced after any significant impact.',
    connection: 'The foam crushing is a perfectly inelastic process—kinetic energy converts to deformation energy, and the foam cannot return to its original shape.',
    howItWorks: 'EPS (expanded polystyrene) foam contains millions of tiny air pockets. During impact, these pockets crush permanently, extending the deceleration time and distributing force across a larger area.',
    stats: [
      { value: '85%', label: 'Energy absorbed', icon: '⚡' },
      { value: '$4.2B', label: 'Market size', icon: '💰' },
      { value: '37%', label: 'Injury reduction', icon: '❤️' }
    ],
    examples: ['Motorcycle helmets with thick EPS layers', 'Bicycle helmets with MIPS rotation systems', 'Football helmets with multi-impact foam'],
    companies: ['Shoei', 'Bell', 'Arai', 'Riddell'],
    futureImpact: 'Self-healing helmet materials and real-time impact sensors will revolutionize head protection, potentially allowing multi-use energy absorption.',
    color: '#10B981'
  },
  {
    icon: '📦',
    title: 'Package Drop Protection',
    short: 'Cushioning your products with physics',
    tagline: 'From warehouse to doorstep intact',
    description: 'Shipping packaging uses the same inelastic collision principles to protect fragile items during transport drops and impacts.',
    connection: 'Foam inserts and air cushions extend the deceleration time of dropped packages, reducing peak forces on contents below their damage threshold.',
    howItWorks: 'When a package drops, the outer box decelerates rapidly upon hitting the ground. Internal cushioning materials deform, allowing the product inside to decelerate more slowly, experiencing lower peak forces.',
    stats: [
      { value: '95%', label: 'Force reduction', icon: '⚡' },
      { value: '$32B', label: 'Market size', icon: '💰' },
      { value: '1-2m', label: 'Drop protection', icon: '📏' }
    ],
    examples: ['Styrofoam corners for electronics', 'Air pillows in Amazon boxes', 'Molded pulp for delicate items'],
    companies: ['Sealed Air', 'Sonoco', 'Pregis', 'DS Smith'],
    futureImpact: 'Biodegradable and reusable impact-absorbing materials will replace single-use plastics while maintaining the same protective physics.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const InelasticCollisionsRenderer: React.FC<InelasticCollisionsRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Play phase
  const [impactSpeed, setImpactSpeed] = useState(30); // mph
  const [hasCrumpleZone, setHasCrumpleZone] = useState(true);
  const [carPosition, setCarPosition] = useState(0);
  const [crashProgress, setCrashProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [crashCount, setCrashCount] = useState(0);

  // Twist phase - Perfectly inelastic collision
  const [mass1, setMass1] = useState(1000); // kg
  const [velocity1, setVelocity1] = useState(20); // m/s
  const [mass2, setMass2] = useState(1000); // kg (stationary)
  const [twistAnimating, setTwistAnimating] = useState(false);
  const [twistProgress, setTwistProgress] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Crash animation for play phase
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

  // Twist animation
  useEffect(() => {
    if (!twistAnimating) return;
    const interval = setInterval(() => {
      setTwistProgress(prev => {
        if (prev >= 100) {
          setTwistAnimating(false);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [twistAnimating]);

  // Physics calculations
  const stoppingTime = hasCrumpleZone ? 0.15 : 0.03; // seconds
  const forceMultiplier = hasCrumpleZone ? 1 : 5;

  // Perfectly inelastic collision calculations
  const finalVelocity = (mass1 * velocity1) / (mass1 + mass2);
  const initialKE = 0.5 * mass1 * velocity1 * velocity1;
  const finalKE = 0.5 * (mass1 + mass2) * finalVelocity * finalVelocity;
  const energyLost = initialKE - finalKE;
  const energyLostPercent = (energyLost / initialKE) * 100;

  // Premium design colors - using brightness >= 180 for text contrast
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for crashes/safety
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // Changed from #9CA3AF for better contrast (brightness 230)
    textMuted: '#cbd5e1', // Changed from #6B7280 for better contrast (brightness 203)
    border: '#2a2a3a',
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
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'inelastic-collisions',
        gameTitle: 'Inelastic Collisions',
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

  // Start crash simulation
  const startCrash = useCallback(() => {
    setCarPosition(0);
    setCrashProgress(0);
    setIsAnimating(true);
    playSound('crash');
    setCrashCount(c => c + 1);
  }, []);

  // Start twist simulation
  const startTwistSimulation = useCallback(() => {
    setTwistProgress(0);
    setTwistAnimating(true);
    playSound('crash');
  }, []);

  // Navigation bar component - fixed position with z-index
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      zIndex: 1000,
      padding: '8px 16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>
          {phaseLabels[phase]}
        </span>
        <span style={{ ...typo.small, color: colors.textMuted }}>
          Phase {phaseOrder.indexOf(phase) + 1} of {phaseOrder.length}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: colors.border,
      }}>
        <div style={{
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </nav>
  );

  // Progress bar component (legacy)
  const renderProgressBar = () => renderNavBar();

  // Navigation dots (fixed bottom bar with Back/Next)
  const renderNavDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const isTestActive = phase === 'test' && !testSubmitted;
    const canGoNext = currentIndex < phaseOrder.length - 1 && !isTestActive;
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: `1px solid ${canGoBack ? colors.border : 'transparent'}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : 'transparent',
            cursor: canGoBack ? 'pointer' : 'default',
            fontSize: '14px',
            fontWeight: 600,
            minWidth: '70px',
            minHeight: '44px',
          }}
          aria-label="Back"
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: phase === p ? '20px' : '7px',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.6)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: '3px 0',
              }}
              aria-label={phaseLabels[p]}
            />
          ))}
        </div>
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: `1px solid ${canGoNext ? colors.accent : 'transparent'}`,
            background: canGoNext ? `${colors.accent}22` : 'transparent',
            color: canGoNext ? colors.accent : 'transparent',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
            minWidth: '70px',
            minHeight: '44px',
            opacity: isTestActive ? 0.4 : 1,
          }}
          aria-label="Next"
        >
          Next →
        </button>
      </div>
    );
  };

  // Previous phase
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Bottom navigation bar
  const renderBottomBar = () => {
    const isFirst = phaseOrder.indexOf(phase) === 0;
    const isLast = phaseOrder.indexOf(phase) === phaseOrder.length - 1;
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
        zIndex: 1000,
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={prevPhase}
          disabled={isFirst}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: isFirst ? colors.border : colors.textSecondary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            minHeight: '44px',
            opacity: isFirst ? 0.4 : 1,
          }}
        >
          ← Back
        </button>
        <button
          onClick={isTestActive ? undefined : nextPhase}
          disabled={isTestActive}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            background: isTestActive ? colors.border : colors.accent,
            color: 'white',
            cursor: isTestActive ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            minHeight: '44px',
            opacity: isTestActive ? 0.4 : 1,
          }}
        >
          {isLast ? 'Finish' : 'Next →'}
        </button>
      </nav>
    );
  };

  // Primary button style - with minHeight 44px for touch targets
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Crash Visualization SVG
  const CrashVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 220 : 280;
    const wallX = width - 60;
    const carStartX = 50;
    const carX = carStartX + (wallX - carStartX - 80) * (carPosition / 100);
    const crumpleAmount = hasCrumpleZone ? crashProgress * 0.4 : crashProgress * 0.1;
    const carWidth = 80 - crumpleAmount;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="carBodySafe" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="carBodyDanger" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <filter id="carShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.4" />
          </filter>
          <filter id="wallGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines for reference */}
        <g id="gridLines" opacity="0.15">
          <line x1="30" y1={height * 0.25} x2={width - 30} y2={height * 0.25} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,6" />
          <line x1="30" y1={height * 0.5} x2={width - 30} y2={height * 0.5} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,6" />
          <line x1="30" y1={height * 0.75} x2={width - 30} y2={height * 0.75} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,6" />
        </g>

        {/* Title */}
        <text x={width/2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Crash Test Simulation
        </text>
        {/* Formula */}
        <text x={width/2} y="38" textAnchor="middle" fill={colors.textMuted} fontSize="11">
          F = Δp / Δt  |  p = mv
        </text>

        {/* Road */}
        <g id="roadGroup">
          <rect x="30" y={height - 50} width={width - 60} height="30" fill="url(#roadGrad)" rx="4" />
          <line x1="30" y1={height - 35} x2={width - 30} y2={height - 35} stroke="#fbbf24" strokeWidth="3" strokeDasharray="20 15" />
        </g>

        {/* Wall */}
        <g id="wallGroup" filter="url(#wallGlow)">
          <rect x={wallX} y={height - 130} width="30" height="100" fill="#6b7280" rx="2" />
          <text x={wallX + 15} y={height - 140} textAnchor="middle" fill={colors.textMuted} fontSize="11">WALL</text>
        </g>

        {/* Car */}
        <g id="carGroup" transform={`translate(${carX}, ${height - 120})`} filter="url(#carShadow)">
          {/* Car body */}
          <rect
            x={hasCrumpleZone ? crumpleAmount * 0.5 : 0}
            y="20"
            width={carWidth}
            height="35"
            rx="5"
            fill={hasCrumpleZone ? 'url(#carBodySafe)' : 'url(#carBodyDanger)'}
          />
          {/* Cabin */}
          <rect
            x={hasCrumpleZone ? 15 + crumpleAmount * 0.3 : 15}
            y="5"
            width="35"
            height="28"
            rx="3"
            fill="#1e293b"
          />
          {/* Window */}
          <rect
            x={hasCrumpleZone ? 18 + crumpleAmount * 0.3 : 18}
            y="8"
            width="29"
            height="20"
            rx="2"
            fill="#93c5fd"
            opacity="0.7"
          />
          {/* Passenger */}
          <circle cx={hasCrumpleZone ? 32 + crumpleAmount * 0.2 : 32} cy="15" r="5" fill="#fcd34d" />
          {/* Wheels */}
          <circle cx="15" cy="55" r="12" fill="#1f2937" />
          <circle cx="15" cy="55" r="6" fill="#6b7280" />
          <circle cx={carWidth - 15} cy="55" r="12" fill="#1f2937" />
          <circle cx={carWidth - 15} cy="55" r="6" fill="#6b7280" />
        </g>

        {/* Crumple effect sparks */}
        {hasCrumpleZone && crashProgress > 20 && (
          <g>
            <text x={carX + 70} y={height - 135} fill="#22c55e" fontSize="11" fontWeight="bold">
              Energy absorbed!
            </text>
            {[0, 1, 2].map(i => (
              <circle
                key={`spark-${i}`}
                cx={carX + 75 - i * 6}
                cy={height - 115}
                r={4 - i}
                fill="#fbbf24"
                opacity={0.9 - i * 0.25}
              />
            ))}
          </g>
        )}

        {/* Force indicator */}
        {crashProgress > 0 && carPosition >= 100 && (
          <g>
            <rect
              x={width / 2 - 80}
              y={height - 45}
              width="160"
              height="35"
              rx="8"
              fill={hasCrumpleZone ? '#166534' : '#991b1b'}
              opacity="0.9"
            />
            <text
              x={width / 2}
              y={height - 22}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
            >
              Force: {forceMultiplier}x {hasCrumpleZone ? '(Safe)' : '(DANGER!)'}
            </text>
          </g>
        )}

        {/* Speed indicator */}
        <text x="40" y="60" fill="#e2e8f0" fontSize="12">
          Speed: <tspan fill="#f59e0b" fontWeight="bold">{impactSpeed} mph</tspan>
        </text>
        <text x="40" y="76" fill="#e2e8f0" fontSize="11">
          Crumple Zone: <tspan fill={hasCrumpleZone ? '#22c55e' : '#ef4444'} fontWeight="bold">{hasCrumpleZone ? 'ON' : 'OFF'}</tspan>
        </text>

        {/* Background force curve spanning full height */}
        <path
          d={`M 30 ${height - 20} Q ${width * 0.25} ${height * 0.08} ${width * 0.5} ${height * 0.45} C ${width * 0.65} ${height * 0.65} ${width * 0.8} ${height * 0.05} ${width - 30} ${height * 0.3}`}
          fill="none"
          stroke={hasCrumpleZone ? '#22c55e' : '#ef4444'}
          strokeWidth="1"
          opacity="0.12"
          strokeDasharray="8,5"
        />
      </svg>
    );
  };

  // Perfectly Inelastic Collision Visualization
  const InelasticCollisionVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;

    const car1StartX = 50;
    const car2X = width - 120;
    const car1X = car1StartX + (car2X - car1StartX - 60) * (twistProgress / 100);
    const combined = twistProgress >= 100;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Perfectly Inelastic Collision
        </text>

        {/* Track */}
        <rect x="30" y={height - 60} width={width - 60} height="20" fill="#374151" rx="4" />

        {/* Car 1 (moving) */}
        {!combined && (
          <g transform={`translate(${car1X}, ${height - 100})`}>
            <rect x="0" y="10" width="50" height="30" rx="4" fill="#3b82f6" />
            <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {mass1}kg
            </text>
            <circle cx="10" cy="40" r="8" fill="#1f2937" />
            <circle cx="40" cy="40" r="8" fill="#1f2937" />
            {/* Velocity arrow */}
            <line x1="55" y1="25" x2="75" y2="25" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <text x="85" y="29" fill="#22c55e" fontSize="11">{velocity1}m/s</text>
          </g>
        )}

        {/* Car 2 (stationary) */}
        {!combined && (
          <g transform={`translate(${car2X}, ${height - 100})`}>
            <rect x="0" y="10" width="50" height="30" rx="4" fill="#f59e0b" />
            <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {mass2}kg
            </text>
            <circle cx="10" cy="40" r="8" fill="#1f2937" />
            <circle cx="40" cy="40" r="8" fill="#1f2937" />
            <text x="25" y="5" textAnchor="middle" fill="#e2e8f0" fontSize="11">At rest</text>
          </g>
        )}

        {/* Combined mass after collision */}
        {combined && (
          <g transform={`translate(${car2X - 20}, ${height - 100})`}>
            <rect x="0" y="5" width="90" height="38" rx="4" fill="#a855f7" />
            <text x="45" y="28" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
              {mass1 + mass2}kg
            </text>
            <circle cx="15" cy="43" r="8" fill="#1f2937" />
            <circle cx="75" cy="43" r="8" fill="#1f2937" />
            {/* Final velocity arrow */}
            <line x1="95" y1="25" x2="115" y2="25" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="125" y="29" fill="#22c55e" fontSize="11">{finalVelocity.toFixed(1)}m/s</text>
          </g>
        )}

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Energy display */}
        {combined && (
          <g>
            <rect x={width/2 - 100} y="55" width="200" height="55" rx="8" fill="#991b1b" opacity="0.8" />
            <text x={width/2} y="75" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
              Kinetic Energy Lost: {energyLostPercent.toFixed(1)}%
            </text>
            <text x={width/2} y="95" textAnchor="middle" fill="#fca5a5" fontSize="11">
              {(energyLost / 1000).toFixed(1)} kJ converted to heat/deformation
            </text>
          </g>
        )}

        {/* Bottom label to ensure vertical space coverage */}
        <text x={width/2} y={height - 8} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          p = {(mass1 * velocity1).toLocaleString()} kg·m/s → preserved
        </text>
        {/* Top reference line */}
        <line x1="30" y1="35" x2={width - 30} y2="35" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
        {/* Bottom reference line */}
        <line x1="30" y1={height - 20} x2={width - 30} y2={height - 20} stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🚗💥
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Inelastic Collisions
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why are modern cars designed to <span style={{ color: colors.accent }}>crumple</span> in crashes? It seems counterintuitive, but this 'weakness' actually <span style={{ color: colors.success }}>saves lives</span>."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "In a perfectly rigid car, all the crash energy would transfer directly to the passengers in milliseconds. Crumple zones extend this time, dramatically reducing the force. It's physics saving lives."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Automotive Safety Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Crash Physics
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The rigid car is safer - it won\'t be damaged as much' },
      { id: 'b', text: 'The crumpling car is safer - it extends the collision time, reducing force', correct: true },
      { id: 'c', text: 'Both are equally safe - the total momentum change is the same' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            Two identical cars crash at 30 mph. One crumples on impact, the other stays rigid. Which passengers are safer?
          </h2>

          {/* Static SVG diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 400} height={isMobile ? 160 : 180} viewBox={`0 0 ${isMobile ? 320 : 400} ${isMobile ? 160 : 180}`} style={{ background: colors.bgSecondary, borderRadius: '8px' }}>
              {/* Crumpling car */}
              <rect x="30" y="60" width="70" height="40" rx="5" fill="#3b82f6" />
              <rect x="45" y="45" width="35" height="25" rx="3" fill="#1e293b" />
              <circle cx="45" cy="100" r="10" fill="#374151" />
              <circle cx="85" cy="100" r="10" fill="#374151" />
              <text x="65" y="130" textAnchor="middle" fill="#e2e8f0" fontSize="11">Crumples</text>
              <text x="65" y="145" textAnchor="middle" fill="#22c55e" fontSize="11">150ms stop</text>

              {/* VS */}
              <text x={isMobile ? 160 : 200} y="85" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="bold">vs</text>

              {/* Rigid car */}
              <rect x={isMobile ? 220 : 280} y="60" width="70" height="40" rx="5" fill="#ef4444" />
              <rect x={isMobile ? 235 : 295} y="45" width="35" height="25" rx="3" fill="#1e293b" />
              <circle cx={isMobile ? 235 : 295} cy="100" r="10" fill="#374151" />
              <circle cx={isMobile ? 275 : 335} cy="100" r="10" fill="#374151" />
              <text x={isMobile ? 255 : 315} y="130" textAnchor="middle" fill="#e2e8f0" fontSize="11">Stays rigid</text>
              <text x={isMobile ? 255 : 315} y="145" textAnchor="middle" fill="#ef4444" fontSize="11">30ms stop</text>

              {/* Title */}
              <text x={isMobile ? 160 : 200} y="25" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600">Crash Comparison</text>
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

  // PLAY PHASE - Interactive Crash Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        paddingTop: '56px',
        paddingBottom: '16px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Crash Test Laboratory
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust the settings and run crash tests to see how crumple zones affect force.
          </p>

          {/* What the visualization shows */}
          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>What this visualization displays:</strong> The simulation shows a car (blue = crumple zone ON, red = OFF) colliding with a wall. The deformation of the front end and the force indicator show how crumple zones extend stopping time to reduce peak force on passengers.
            </p>
          </div>

          {/* Key physics terms */}
          <div style={{
            background: `${colors.success}11`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.success }}>Key terms:</strong> <strong>Momentum</strong> (p = mv) is always conserved. <strong>Kinetic energy</strong> (KE = ½mv²) converts to heat, sound, and deformation. <strong>Impulse</strong> (F·Δt) equals the change in momentum — longer Δt means less force F.
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.warning}11`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.warning }}>Real-world relevance:</strong> This simulation models how automotive engineers test crumple zone designs. These principles are used in crash test facilities by companies like Volvo and Mercedes-Benz to save thousands of lives annually.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <CrashVisualization />
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
                    <div style={{ ...typo.h3, color: colors.warning }}>{stoppingTime * 1000}ms</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Stop Time</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: hasCrumpleZone ? colors.success : colors.error }}>{forceMultiplier}x</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Force Level</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{crashCount}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Tests Run</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Speed slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Impact Speed</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{impactSpeed} mph</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={impactSpeed}
                  onChange={(e) => setImpactSpeed(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    accentColor: colors.accent,
                    cursor: 'pointer',
                    touchAction: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>10 mph</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>60 mph</span>
                </div>
              </div>

              {/* Crumple zone toggle */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Crumple Zone</span>
                  <button
                    onClick={() => setHasCrumpleZone(!hasCrumpleZone)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '20px',
                      border: 'none',
                      background: hasCrumpleZone ? colors.success : colors.error,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    {hasCrumpleZone ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Crash button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <button
                  onClick={startCrash}
                  disabled={isAnimating}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isAnimating ? colors.border : colors.accent,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    minHeight: '44px',
                  }}
                >
                  {isAnimating ? 'Crashing...' : 'Run Crash Test'}
                </button>
                <button
                  onClick={() => {
                    setCarPosition(0);
                    setCrashProgress(0);
                    setIsAnimating(false);
                  }}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {crashCount >= 2 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice: Crumple zones reduce force by 5x by extending stop time from 30ms to 150ms!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
      </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionOptions: Record<string, string> = {
      'a': 'the rigid car is safer',
      'b': 'the crumpling car is safer',
      'c': 'both are equally safe'
    };
    const userPredictionText = prediction ? predictionOptions[prediction] : 'a prediction';
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Crash Safety
          </h2>

          {/* Reference user's prediction */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              You predicted that <strong style={{ color: wasCorrect ? colors.success : colors.warning }}>{userPredictionText}</strong>.
              {wasCorrect
                ? " That's correct! The crumpling car is indeed safer because it extends the collision time, reducing force on passengers."
                : " As it turns out, the crumpling car is actually safer. Let's understand why extending collision time reduces force."}
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
                <strong style={{ color: colors.textPrimary }}>The Impulse-Momentum Theorem:</strong>
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '18px',
                color: colors.accent,
              }}>
                F * delta-t = delta-p = m * delta-v
              </div>
              <p style={{ marginBottom: '16px' }}>
                The impulse (force times time) equals the change in momentum. For a fixed momentum change (car must stop), if you <span style={{ color: colors.success }}>increase time</span>, you must <span style={{ color: colors.success }}>decrease force</span>.
              </p>
              <p>
                Crumple zones extend the collision time from ~30ms to ~150ms. This 5x increase in time means 5x less force on passengers!
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: Energy vs Momentum
            </h3>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li><strong>Momentum is ALWAYS conserved</strong> in collisions (no external forces)</li>
              <li><strong>Kinetic energy is NOT conserved</strong> in inelastic collisions</li>
              <li>Lost KE converts to heat, sound, and <span style={{ color: colors.success }}>deformation</span></li>
              <li>This deformation is what absorbs energy and saves lives!</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              The Safety Trade-off
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A rigid car would transfer 100% of crash energy to passengers instantly. A crumpling car "wastes" energy by destroying the car's structure - but this destruction saves lives by extending the deceleration time.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore a New Scenario
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: '0% - energy is always conserved in collisions' },
      { id: 'b', text: '25% - some energy is lost to heat and sound' },
      { id: 'c', text: '50% - half the kinetic energy is lost when equal masses stick together', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Perfectly Inelastic Collisions
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Two cars of equal mass collide and stick together. The first is moving, the second is stationary. What percentage of kinetic energy is lost?
          </h2>

          {/* Static SVG diagram of perfectly inelastic collision */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={isMobile ? 320 : 460} height="180" viewBox={`0 0 ${isMobile ? 320 : 460} 180`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <text x={isMobile ? 160 : 230} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">Perfectly Inelastic Collision</text>

              {/* Before collision */}
              <text x="20" y="45" fill={colors.textMuted} fontSize="11">BEFORE:</text>
              {/* Car A moving */}
              <rect x="20" y="55" width="60" height="30" rx="4" fill="#3b82f6" />
              <text x="50" y="74" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">A (mv)</text>
              {/* Arrow */}
              <line x1="82" y1="70" x2="110" y2="70" stroke="#22c55e" strokeWidth="2.5" />
              <polygon points="110,65 120,70 110,75" fill="#22c55e" />
              <text x="100" y="60" textAnchor="middle" fill="#22c55e" fontSize="11">v →</text>
              {/* Car B stationary */}
              <rect x={isMobile ? 200 : 280} y="55" width="60" height="30" rx="4" fill="#f59e0b" />
              <text x={isMobile ? 230 : 310} y="74" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">B (0)</text>
              <text x={isMobile ? 230 : 310} y="48" textAnchor="middle" fill={colors.textMuted} fontSize="11">at rest</text>

              {/* After collision */}
              <text x="20" y="120" fill={colors.textMuted} fontSize="11">AFTER:</text>
              {/* Combined cars */}
              <rect x="20" y="130" width="120" height="30" rx="4" fill="#8b5cf6" />
              <text x="80" y="149" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">A+B (2m·v/2)</text>
              {/* Slower arrow */}
              <line x1="142" y1="145" x2="160" y2="145" stroke="#22c55e" strokeWidth="2" />
              <polygon points="160,141 168,145 160,149" fill="#22c55e" />
              <text x="155" y="135" textAnchor="middle" fill="#22c55e" fontSize="11">½v →</text>

              <text x={isMobile ? 160 : 230} y="172" textAnchor="middle" fill={colors.accent} fontSize="11">What % of KE is lost?</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
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
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
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
              See the Collision
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Perfectly Inelastic Collision
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust masses and velocity to see how energy is lost when objects stick together
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
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <InelasticCollisionVisualization />
                </div>

                {/* Stats display */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.success }}>{finalVelocity.toFixed(1)} m/s</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Final Velocity</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.error }}>{energyLostPercent.toFixed(1)}%</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>KE Lost</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>{(energyLost / 1000).toFixed(1)} kJ</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Energy to Heat</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Mass 1 slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Car 1 Mass</span>
                  <span style={{ ...typo.small, color: '#3b82f6', fontWeight: 600 }}>{mass1} kg</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="2000"
                  step="100"
                  value={mass1}
                  onChange={(e) => { setMass1(parseInt(e.target.value)); setTwistProgress(0); }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                    touchAction: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                />
              </div>

              {/* Velocity slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Car 1 Velocity</span>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{velocity1} m/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={velocity1}
                  onChange={(e) => { setVelocity1(parseInt(e.target.value)); setTwistProgress(0); }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    accentColor: colors.success,
                    cursor: 'pointer',
                    touchAction: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                />
              </div>

              {/* Mass 2 slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Car 2 Mass</span>
                  <span style={{ ...typo.small, color: '#f59e0b', fontWeight: 600 }}>{mass2} kg</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="2000"
                  step="100"
                  value={mass2}
                  onChange={(e) => { setMass2(parseInt(e.target.value)); setTwistProgress(0); }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    accentColor: '#f59e0b',
                    cursor: 'pointer',
                    touchAction: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                />
              </div>

              {/* Simulate button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <button
                  onClick={startTwistSimulation}
                  disabled={twistAnimating}
                  style={{
                    padding: '14px 32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: twistAnimating ? colors.border : colors.accent,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: twistAnimating ? 'not-allowed' : 'pointer',
                    minHeight: '44px',
                  }}
                >
                  {twistAnimating ? 'Colliding...' : 'Run Collision'}
                </button>
                <button
                  onClick={() => setTwistProgress(0)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {twistProgress >= 100 && mass1 === mass2 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Equal masses: Exactly 50% of kinetic energy is lost when they stick together!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Results
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Energy Loss Protects Us
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔢</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Math</h3>
              </div>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p>For equal masses (m) sticking together:</p>
                <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li>Momentum conserved: mv = (2m)v_final, so v_final = v/2</li>
                  <li>Initial KE: (1/2)mv^2</li>
                  <li>Final KE: (1/2)(2m)(v/2)^2 = (1/4)mv^2</li>
                  <li><strong style={{ color: colors.error }}>Lost: 50% of kinetic energy!</strong></li>
                </ul>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Insight</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This "lost" energy doesn't disappear - it converts to heat, sound, and deformation. In a car crash, this is exactly what we want! The more energy absorbed by crumpling metal, the less energy transferred to passengers.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Safety Design Principle</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Modern safety engineering deliberately makes collisions MORE inelastic. Crumple zones, airbags, and helmets all work by maximizing energy absorption through controlled deformation.
              </p>
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
    return (
      <TransferPhaseView
        conceptName="Inelastic Collisions"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                    ✓
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
                Physics Connection:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {app.howItWorks && (
              <div style={{ marginTop: '16px', background: colors.bgSecondary, borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '6px', fontWeight: 600 }}>How It Works:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
              </div>
            )}

            {app.examples && app.examples.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Examples:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {app.examples.map((ex: string, i: number) => (
                    <li key={i} style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Companies:</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    background: colors.bgSecondary,
                    padding: '4px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {app.futureImpact && (
              <div style={{ marginTop: '16px', background: `${colors.success}11`, borderRadius: '8px', padding: '12px 16px', borderLeft: `3px solid ${colors.success}` }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '4px', fontWeight: 600 }}>Future Impact:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
              </div>
            )}

            {/* Got It button for current app */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.success : app.color,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {completedApps[selectedApp] ? 'Completed' : 'Got It'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '56px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '12px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              {passed
                ? 'You understand inelastic collisions and crash safety physics!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review - question by question */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Review</h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const isCorrect = testAnswers[i] === correctId;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                    border: `1px solid ${isCorrect ? colors.success : colors.error}44`,
                  }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{isCorrect ? '✓' : '✗'}</span>
                    <div>
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        Q{i + 1}: {q.question.slice(0, 70)}...
                      </p>
                      {!isCorrect && (
                        <p style={{ ...typo.small, color: colors.success, margin: '4px 0 0' }}>
                          Correct: {correctId?.toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {passed ? (
                <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
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
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        overflowY: 'auto',
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
          Crash Safety Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how inelastic collisions and the impulse-momentum theorem save lives every day.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Impulse = Force x Time = Momentum change',
              'Extending collision time reduces peak force',
              'Inelastic collisions convert KE to heat/deformation',
              'Crumple zones sacrifice the car to save passengers',
              'Momentum is ALWAYS conserved; KE is not',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
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

export default InelasticCollisionsRenderer;
