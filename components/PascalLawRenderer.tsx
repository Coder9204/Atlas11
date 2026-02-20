'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Pascal's Law - Complete 10-Phase Game
// Force multiplication through pressure transmission in hydraulic systems
// F1/A1 = F2/A2 = P (Pressure is constant in confined fluid)
// -----------------------------------------------------------------------------

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

interface PascalLawRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'hydraulic') => {
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
      hydraulic: { freq: 150, duration: 0.3, type: 'sawtooth' }
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
    scenario: "A mechanic uses a hydraulic car lift with a small piston (5 cm^2) and a large piston (500 cm^2). They need to lift a 2,000 kg car.",
    question: "How much force must the mechanic apply to the small piston to lift the car?",
    options: [
      { id: 'a', label: "19,600 N - the full weight of the car" },
      { id: 'b', label: "196 N - the weight divided by 100", correct: true },
      { id: 'c', label: "1,960 N - the weight divided by 10" },
      { id: 'd', label: "9,800 N - half the weight of the car" }
    ],
    explanation: "The mechanical advantage is A2/A1 = 500/5 = 100. The car's weight is ~19,600 N (2000 kg x 9.8 m/s^2). Required force = 19,600 / 100 = 196 N. This is Pascal's Law in action!"
  },
  {
    scenario: "A car's brake system has a master cylinder with a 2 cm^2 piston connected to four brake calipers, each with a 20 cm^2 piston.",
    question: "If the driver applies 100 N of force to the brake pedal, what is the total braking force at all four wheels?",
    options: [
      { id: 'a', label: "100 N - force is conserved" },
      { id: 'b', label: "1,000 N - 10x multiplication total" },
      { id: 'c', label: "4,000 N - each wheel gets 1,000 N independently", correct: true },
      { id: 'd', label: "250 N - force is split between four wheels" }
    ],
    explanation: "Each caliper receives the full pressure from the master cylinder. Force multiplication = 20/2 = 10x at EACH wheel. Four wheels x 1,000 N = 4,000 N total. Pressure transmits equally to all connected cylinders!"
  },
  {
    scenario: "An aircraft hydraulic system operates at 3,000 PSI to control the ailerons. The actuator piston has an area of 10 square inches.",
    question: "What force can this actuator produce?",
    options: [
      { id: 'a', label: "300 pounds" },
      { id: 'b', label: "3,000 pounds" },
      { id: 'c', label: "30,000 pounds", correct: true },
      { id: 'd', label: "300,000 pounds" }
    ],
    explanation: "Force = Pressure x Area. F = 3,000 PSI x 10 sq.in = 30,000 pounds. This is why aircraft can use small actuators powered by pilot inputs to move huge control surfaces against massive aerodynamic forces."
  },
  {
    scenario: "An engineer is designing a hydraulic press that needs to exert 1,000,000 N of force. The pump can only provide 5,000 N of input force.",
    question: "What area ratio is needed between the output and input pistons?",
    options: [
      { id: 'a', label: "50:1" },
      { id: 'b', label: "100:1" },
      { id: 'c', label: "200:1", correct: true },
      { id: 'd', label: "500:1" }
    ],
    explanation: "Required multiplication = Output Force / Input Force = 1,000,000 / 5,000 = 200. Since F2/F1 = A2/A1, you need the output piston to have 200x the area of the input piston."
  },
  {
    scenario: "A hydraulic jack multiplies force by 25x. A mechanic uses it to lift a 5,000 lb car by 18 inches.",
    question: "How far must the mechanic push the jack handle (total distance over multiple strokes)?",
    options: [
      { id: 'a', label: "0.72 inches (18/25)" },
      { id: 'b', label: "18 inches (same as lift height)" },
      { id: 'c', label: "37.5 feet (18 x 25)", correct: true },
      { id: 'd', label: "4.5 feet (18 x 3)" }
    ],
    explanation: "Conservation of energy: Work In = Work Out. If force is multiplied 25x, distance must be divided by 25... wait, that's backwards! Distance IN must be 25x the distance OUT. So 18 inches x 25 = 450 inches = 37.5 feet (over many strokes)."
  },
  {
    scenario: "An excavator hydraulic cylinder is used to lift heavy loads. The cylinder has a bore of 6 inches and the system operates at 2,500 PSI.",
    question: "What is the lifting force of this cylinder?",
    options: [
      { id: 'a', label: "About 15,000 pounds" },
      { id: 'b', label: "About 70,000 pounds", correct: true },
      { id: 'c', label: "About 150,000 pounds" },
      { id: 'd', label: "About 350,000 pounds" }
    ],
    explanation: "Piston area = pi x r^2 = 3.14 x 3^2 = 28.27 sq.in. Force = Pressure x Area = 2,500 x 28.27 = 70,686 pounds. This is why construction equipment can lift massive loads with relatively compact cylinders."
  },
  {
    scenario: "A technician notices air bubbles in the brake fluid after servicing the brakes. The driver reports the brake pedal feels 'spongy'.",
    question: "Why do air bubbles cause problems in hydraulic brake systems?",
    options: [
      { id: 'a', label: "Air increases the viscosity of brake fluid" },
      { id: 'b', label: "Air is compressible, absorbing pedal force instead of transmitting pressure", correct: true },
      { id: 'c', label: "Air chemically reacts with brake fluid" },
      { id: 'd', label: "Air blocks the brake lines" }
    ],
    explanation: "Pascal's Law requires an incompressible fluid. Air compresses when pressure is applied, absorbing energy instead of transmitting it. This creates a 'spongy' pedal feel and reduces braking effectiveness. Always bleed brakes to remove air!"
  },
  {
    scenario: "Two hydraulic systems have the same input force and output piston area. System A uses a 2 cm^2 input piston, System B uses a 4 cm^2 input piston.",
    question: "How do the output forces compare?",
    options: [
      { id: 'a', label: "System A produces 2x the output force", correct: true },
      { id: 'b', label: "System B produces 2x the output force" },
      { id: 'c', label: "Both systems produce the same output force" },
      { id: 'd', label: "System A produces 4x the output force" }
    ],
    explanation: "Mechanical advantage = Output Area / Input Area. With the same output area, a smaller input area creates higher pressure (P = F/A) and thus more output force. System A's 2 cm^2 input creates 2x the pressure of System B's 4 cm^2 input."
  },
  {
    scenario: "A submarine's hydraulic hatch system must operate at 1000 meters depth where external water pressure is about 100 atmospheres (1500 PSI).",
    question: "Why don't submarines use the surrounding seawater directly as hydraulic fluid?",
    options: [
      { id: 'a', label: "Seawater doesn't follow Pascal's Law" },
      { id: 'b', label: "Seawater is too dense for hydraulic systems" },
      { id: 'c', label: "Specialized hydraulic oil provides lubrication, corrosion protection, and consistent properties", correct: true },
      { id: 'd', label: "Seawater would freeze in the hydraulic lines" }
    ],
    explanation: "While seawater would transmit pressure per Pascal's Law, hydraulic oil provides lubrication for moving parts, prevents corrosion, maintains consistent viscosity across temperatures, and doesn't contain particulates that could damage precision seals."
  },
  {
    scenario: "Pascal demonstrated his principle with a famous barrel experiment: a 10-meter tall narrow tube attached to a sealed barrel filled with water.",
    question: "What happened when the tube was filled with just 1 liter of water?",
    options: [
      { id: 'a', label: "Nothing - 1 liter is too small to affect the barrel" },
      { id: 'b', label: "The barrel burst due to the enormous pressure at the bottom", correct: true },
      { id: 'c', label: "Water flowed back up the tube" },
      { id: 'd', label: "The barrel floated due to buoyancy" }
    ],
    explanation: "Pascal showed that pressure depends on height, not volume. A 10m water column creates ~1 atmosphere (14.7 PSI) of pressure. Acting on the large barrel area, this created thousands of pounds of force - enough to burst the barrel from just 1 kg of water!"
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Automotive Brakes',
    short: 'How you stop a 2-ton car with your foot',
    tagline: 'Multiplying human force for vehicle safety',
    description: 'Modern car brakes use Pascal\'s Law to multiply pedal force 10-20x at each wheel. A 50 lb push becomes over 1,000 lbs of clamping force per wheel, enabling safe stops from highway speeds.',
    connection: 'The master cylinder (small piston) creates pressure that transmits equally to all brake calipers (large pistons). Each wheel gets the full multiplied force independently - not split between them!',
    howItWorks: 'When you press the brake pedal, it pushes on the master cylinder piston. The resulting pressure travels through brake lines to wheel cylinders or calipers. ABS systems modulate this pressure rapidly to prevent wheel lockup.',
    stats: [
      { value: '10-20x', label: 'Force multiplication', icon: '💪' },
      { value: '1000+ PSI', label: 'Line pressure', icon: '⚡' },
      { value: '$45B', label: 'Global market', icon: '💰' }
    ],
    examples: ['Disc brakes with calipers', 'Drum brakes with wheel cylinders', 'ABS systems', 'Power brake boosters'],
    companies: ['Brembo', 'Bosch', 'Continental', 'Akebono'],
    futureImpact: 'Electric vehicles use regenerative braking but maintain hydraulic systems as backup. Brake-by-wire technology provides electronic control with hydraulic actuation for fail-safe operation.',
    color: '#EF4444'
  },
  {
    icon: '🏗️',
    title: 'Construction Equipment',
    short: 'Moving mountains with fluid power',
    tagline: 'Turning diesel power into massive forces',
    description: 'Excavators, backhoes, and bulldozers use hydraulic systems operating at 3,000-5,000 PSI to generate enormous forces. A single excavator can lift 50+ tons with precise control.',
    connection: 'Hydraulic pumps create high pressure that acts on large cylinder pistons. The combination of high pressure and large piston area generates forces measured in tens of thousands of pounds.',
    howItWorks: 'Engine-driven pumps pressurize hydraulic oil. Control valves direct flow to cylinders and motors. Proportional valves provide smooth, precise control. Return oil flows back to the tank through filters.',
    stats: [
      { value: '50+ tons', label: 'Lift capacity', icon: '🏋️' },
      { value: '5000 PSI', label: 'System pressure', icon: '⚡' },
      { value: '$180B', label: 'Equipment market', icon: '💰' }
    ],
    examples: ['Excavator arms and buckets', 'Crane booms and hoists', 'Bulldozer blades', 'Concrete pump booms'],
    companies: ['Caterpillar', 'Komatsu', 'John Deere', 'Liebherr'],
    futureImpact: 'Hybrid hydraulic systems capture energy during lowering operations, improving fuel efficiency by 25-40%. Fully electric excavators maintain hydraulic actuation for high-force requirements.',
    color: '#F59E0B'
  },
  {
    icon: '✈️',
    title: 'Aircraft Flight Controls',
    short: 'Controlling tons of metal at 600 mph',
    tagline: 'Making massive control surfaces feel light',
    description: 'Aircraft hydraulic systems operate at 3,000 PSI to move flight control surfaces against enormous aerodynamic loads. A 747\'s hydraulic system contains 2,400+ gallons of fluid.',
    connection: 'Pilot inputs to the control column are translated to small valve movements. These direct high-pressure fluid to actuators that move ailerons, elevators, and rudders with precise, instantaneous response.',
    howItWorks: 'Multiple independent hydraulic systems provide redundancy for safety. Engine-driven and electric pumps maintain pressure. Fly-by-wire computers translate pilot inputs into actuator commands.',
    stats: [
      { value: '3000 PSI', label: 'System pressure', icon: '⚡' },
      { value: '3x', label: 'Redundant systems', icon: '🛡️' },
      { value: '$7B', label: 'Market size', icon: '💰' }
    ],
    examples: ['Aileron and elevator control', 'Landing gear operation', 'Thrust reverser actuation', 'Cargo door systems'],
    companies: ['Parker Aerospace', 'Moog', 'Eaton', 'Collins Aerospace'],
    futureImpact: 'More Electric Aircraft designs replace some hydraulics with electro-hydrostatic actuators, combining electric power with hydraulic actuation for weight savings while maintaining force capability.',
    color: '#3B82F6'
  },
  {
    icon: '🔧',
    title: 'Hydraulic Press & Manufacturing',
    short: 'Shaping metal with millions of pounds',
    tagline: 'Industrial force multiplication at scale',
    description: 'Hydraulic presses generate forces up to 75,000 tons for forging, stamping, and forming operations. They shape everything from car body panels to aircraft landing gear.',
    connection: 'Large diameter cylinders operating at high pressure create enormous forces. The ability to precisely control force, speed, and position makes hydraulic presses essential for modern manufacturing.',
    howItWorks: 'High-pressure pumps (up to 10,000 PSI) feed large-bore cylinders. Servo valves provide precise control. Modern systems use closed-loop feedback to maintain exact force profiles throughout each operation.',
    stats: [
      { value: '75,000 tons', label: 'Max press force', icon: '🏋️' },
      { value: '10,000 PSI', label: 'Operating pressure', icon: '⚡' },
      { value: '$12B', label: 'Press market', icon: '💰' }
    ],
    examples: ['Automotive stamping', 'Aircraft forging', 'Composite layup', 'Metal extrusion'],
    companies: ['Schuler', 'Komatsu', 'AIDA', 'Enerpac'],
    futureImpact: 'Servo-hydraulic systems combine the force of hydraulics with the precision of servo control. Industry 4.0 integration enables predictive maintenance through real-time monitoring of hydraulic parameters.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PascalLawRenderer: React.FC<PascalLawRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Hydraulic system
  const [inputForce, setInputForce] = useState(100); // Newtons
  const [smallPistonArea, setSmallPistonArea] = useState(2); // cm^2
  const [largePistonArea, setLargePistonArea] = useState(20); // cm^2
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Twist phase - Brake system simulation
  const [brakePedalForce, setBrakePedalForce] = useState(0);

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

  // Physics calculations
  const pressure = inputForce / smallPistonArea; // N/cm^2
  const outputForce = pressure * largePistonArea; // N
  const mechanicalAdvantage = largePistonArea / smallPistonArea;
  const inputDistance = 10; // cm reference
  const outputDistance = inputDistance * (smallPistonArea / largePistonArea);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAnimating) {
      timer = setInterval(() => {
        setAnimationProgress(prev => {
          if (prev >= 100) {
            setIsAnimating(false);
            return 100;
          }
          return prev + 2;
        });
      }, 30);
    }
    return () => clearInterval(timer);
  }, [isAnimating]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981', // Emerald for hydraulics
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    border: '#2a2a3a',
    fluid: '#EF4444',
    piston: '#64748B',
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
    hook: 'explore',
    predict: 'predict',
    play: 'experiment',
    review: 'review',
    twist_predict: 'twist predict',
    twist_play: 'twist experiment',
    twist_review: 'twist review',
    transfer: 'real world transfer',
    test: 'test knowledge mastery',
    mastery: 'mastery complete'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'pascal-law',
        gameTitle: "Pascal's Law",
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

  // Start animation
  const startAnimation = useCallback(() => {
    setAnimationProgress(0);
    setIsAnimating(true);
    playSound('hydraulic');
  }, []);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderNavigationBar = (nextDisabled: boolean = false) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: canGoBack ? colors.bgSecondary : 'transparent',
            color: canGoBack ? colors.textPrimary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.5,
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => { if (!nextDisabled && canGoNext) goToPhase(phaseOrder[currentIndex + 1]); }}
          disabled={!canGoNext || nextDisabled}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoNext && !nextDisabled ? `linear-gradient(135deg, ${colors.accent}, #059669)` : colors.border,
            color: 'white',
            cursor: canGoNext && !nextDisabled ? 'pointer' : 'not-allowed',
            opacity: canGoNext && !nextDisabled ? 1 : 0.5,
            fontWeight: 600,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Hydraulic System Visualization
  const HydraulicVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;
    const progress = animationProgress / 100;
    const ratio = Math.min(largePistonArea / smallPistonArea, 20);

    // Piston movements
    const smallPistonY = 80 - progress * 40;
    const largePistonY = 80 - progress * (40 / ratio);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="fluidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="pistonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="cylinderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines for reference */}
        <g opacity="0.15">
          {[...Array(5)].map((_, i) => (
            <line key={`h${i}`} x1="40" y1={50 + i * 50} x2={width - 40} y2={50 + i * 50} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4 4" />
          ))}
          {[...Array(6)].map((_, i) => (
            <line key={`v${i}`} x1={40 + i * ((width - 80) / 5)} y1="50" x2={40 + i * ((width - 80) / 5)} y2={height - 30} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4 4" />
          ))}
        </g>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="600">
          Hydraulic Force Multiplication
        </text>

        {/* Container/Reservoir */}
        <rect x="40" y="140" width={width - 80} height="80" fill="url(#fluidGrad)" rx="8" />

        {/* Container border */}
        <rect x="35" y="135" width={width - 70} height="90" fill="none" stroke={colors.border} strokeWidth="4" rx="10" />

        {/* Small Piston Cylinder */}
        <rect x="60" y="60" width="60" height="85" fill="url(#cylinderGrad)" stroke={colors.border} strokeWidth="2" rx="4" />

        {/* Small Piston */}
        <rect x="65" y={smallPistonY} width="50" height="50" fill="url(#pistonGrad)" stroke="#475569" strokeWidth="2" rx="4" />

        {/* Input Force Arrow */}
        <g filter="url(#glowFilter)">
          <line x1="90" y1={smallPistonY - 30} x2="90" y2={smallPistonY - 5} stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
          <polygon points={`85,${smallPistonY - 5} 95,${smallPistonY - 5} 90,${smallPistonY}`} fill="#22c55e" />
        </g>

        {/* Large Piston Cylinder */}
        <rect x={width - 140} y="60" width="80" height="85" fill="url(#cylinderGrad)" stroke={colors.border} strokeWidth="2" rx="4" />

        {/* Large Piston */}
        <rect x={width - 135} y={largePistonY} width="70" height="50" fill="url(#pistonGrad)" stroke="#475569" strokeWidth="2" rx="4" />

        {/* Weight on Large Piston */}
        <rect x={width - 130} y={largePistonY - 30} width="60" height="25" fill="#f59e0b" stroke="#d97706" strokeWidth="2" rx="4" />
        <text x={width - 100} y={largePistonY - 12} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">LOAD</text>

        {/* Output Force Arrow */}
        <g filter="url(#glowFilter)">
          <line x1={width - 100} y1={largePistonY + 60} x2={width - 100} y2={largePistonY + 55} stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
          <polygon points={`${width - 105},${largePistonY + 55} ${width - 95},${largePistonY + 55} ${width - 100},${largePistonY + 50}`} fill="#ef4444" />
        </g>

        {/* Pressure arrows in fluid */}
        {isAnimating && (
          <g opacity={0.8}>
            <line x1="130" y1="180" x2="170" y2="180" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
            </line>
            <polygon points="170,176 180,180 170,184" fill="#fcd34d">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
            </polygon>
            <line x1="200" y1="180" x2="240" y2="180" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.15s" />
            </line>
            <polygon points="240,176 250,180 240,184" fill="#fcd34d">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.15s" />
            </polygon>
            <line x1="270" y1="180" x2="310" y2="180" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.3s" />
            </line>
            <polygon points="310,176 320,180 310,184" fill="#fcd34d">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" begin="0.3s" />
            </polygon>
          </g>
        )}

        {/* Pressure display */}
        <rect x={width/2 - 50} y="155" width="100" height="30" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" rx="6" />
        <text x={width/2} y="175" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="600">
          P = {pressure.toFixed(0)} N/cm^2
        </text>

        {/* Pressure distribution curve - spans full height */}
        <path
          d={`M 90 20 C 90 ${height * 0.35} ${width/2} ${height * 0.45} ${width/2} ${height * 0.55} S ${width - 100} ${height * 0.65} ${width - 100} ${height - 20}`}
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeDasharray="6 3"
          opacity="0.4"
        />

        {/* Force bar chart paths */}
        <rect
          x="40" y={height * 0.75} width="50" height={height * 0.25 - 10}
          fill="#22c55e"
          opacity="0.3"
        />
        <path
          d={`M ${width - 140} ${height - 10} L ${width - 40} ${height - 10} L ${width - 40} ${height * 0.35} L ${width - 140} ${height * 0.35} Z`}
          fill="#ef4444"
          opacity="0.3"
        />
        <rect
          x="40" y={height * 0.05} width={width - 80} height={height * 0.03}
          fill={colors.border}
          opacity="0.5"
        />
        <path
          d={`M ${width/2 - 5} ${height * 0.12} L ${width/2 + 5} ${height * 0.12} L ${width/2} ${height * 0.45} Z`}
          fill={colors.accent}
          opacity="0.7"
        />
        <path
          d={`M 90 ${height * 0.42} C 120 ${height * 0.38} ${width - 120} ${height * 0.38} ${width - 100} ${height * 0.42} S ${width - 80} ${height * 0.68} ${width - 100} ${height * 0.72}`}
          fill="none"
          stroke={colors.textMuted}
          strokeWidth="1"
          opacity="0.4"
        />

        {/* Labels */}
        <text x="90" y={height - 15} textAnchor="middle" fill="#e2e8f0" fontSize="11">
          A1 = {smallPistonArea} cm^2
        </text>
        <text x={width - 100} y={height - 15} textAnchor="middle" fill="#e2e8f0" fontSize="11">
          A2 = {largePistonArea} cm^2
        </text>
        <text x={width/2} y={height - 55} textAnchor="middle" fill="#e2e8f0" fontSize="11">
          F × {mechanicalAdvantage.toFixed(1)} = {outputForce.toFixed(0)} N
        </text>
      </svg>
    );
  };

  // Brake System Visualization
  const BrakeSystemVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 260 : 300;
    const pedalProgress = brakePedalForce / 200;
    const caliperClamp = pedalProgress * 15;
    const masterArea = 2;
    const caliperArea = 20;
    const brakeForce = brakePedalForce > 0 ? (brakePedalForce * caliperArea / masterArea) : 0;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="brakeFluidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <radialGradient id="rotorGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>
          <linearGradient id="caliperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Brake System Force Multiplication
        </text>

        {/* Brake Pedal */}
        <g transform={`translate(30, ${60 + pedalProgress * 30})`}>
          <rect x="0" y="0" width="50" height="15" fill="#64748b" rx="3" stroke="#475569" strokeWidth="1" />
          <rect x="45" y="-40" width="8" height="50" fill="#64748b" stroke="#475569" strokeWidth="1" rx="1" />
          <text x="25" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11">Pedal</text>
        </g>

        {/* Master Cylinder */}
        <rect x="95" y="75" width="50" height="35" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
        <rect x="100" y={82 + pedalProgress * 8} width="18" height="18" fill="#94a3b8" stroke="#64748b" strokeWidth="1" rx="2" />
        <text x="120" y="130" textAnchor="middle" fill="#e2e8f0" fontSize="11">Master</text>
        <text x="120" y="142" textAnchor="middle" fill="#e2e8f0" fontSize="11">2 cm^2</text>

        {/* Brake Lines - spanning full height for good vertical utilization */}
        <path d="M145,92 L180,92 L180,15 L260,15 L260,60" fill="none" stroke="url(#brakeFluidGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M145,92 L180,92 L180,285 L260,285 L260,140" fill="none" stroke="url(#brakeFluidGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Pressure indicator */}
        {brakePedalForce > 0 && (
          <g>
            <rect x="170" y="85" width="60" height="24" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" rx="6" />
            <text x="200" y="101" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600">
              {(brakePedalForce / masterArea).toFixed(0)} N/cm^2
            </text>
          </g>
        )}

        {/* Front Brake/Rotor */}
        <g transform="translate(290, 60)">
          <circle cx="35" cy="0" r="35" fill="url(#rotorGrad)" stroke="#1e293b" strokeWidth="2" />
          <circle cx="35" cy="0" r="25" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6 3" />
          <circle cx="35" cy="0" r="12" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          {/* Calipers */}
          <rect x={5 - caliperClamp} y="-12" width="15" height="24" fill="url(#caliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
          <rect x={50 + caliperClamp} y="-12" width="15" height="24" fill="url(#caliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
        </g>
        <text x="325" y="110" textAnchor="middle" fill="#e2e8f0" fontSize="11">20 cm^2</text>

        {/* Rear Brake/Rotor */}
        <g transform="translate(290, 140)">
          <circle cx="35" cy="0" r="35" fill="url(#rotorGrad)" stroke="#1e293b" strokeWidth="2" />
          <circle cx="35" cy="0" r="25" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6 3" />
          <circle cx="35" cy="0" r="12" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          {/* Calipers */}
          <rect x={5 - caliperClamp} y="-12" width="15" height="24" fill="url(#caliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
          <rect x={50 + caliperClamp} y="-12" width="15" height="24" fill="url(#caliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
        </g>
        <text x="325" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="11">20 cm^2</text>

        {/* Force readouts */}
        <g transform={`translate(20, ${height - 50})`}>
          <rect x="0" y="0" width="100" height="40" fill={colors.bgSecondary} stroke="#86efac" strokeWidth="1" rx="6" />
          <text x="50" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="11">Input Force</text>
          <text x="50" y="32" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="600">{brakePedalForce} N</text>
        </g>
        <g transform={`translate(130, ${height - 50})`}>
          <rect x="0" y="0" width="100" height="40" fill={colors.bgSecondary} stroke="#fca5a5" strokeWidth="1" rx="6" />
          <text x="50" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="11">Per Wheel</text>
          <text x="50" y="32" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="600">{brakeForce.toFixed(0)} N</text>
        </g>
        <g transform={`translate(240, ${height - 50})`}>
          <rect x="0" y="0" width="100" height="40" fill={colors.bgSecondary} stroke="#d8b4fe" strokeWidth="1" rx="6" />
          <text x="50" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="11">Total (4 wheels)</text>
          <text x="50" y="32" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="600">{(brakeForce * 4).toFixed(0)} N</text>
        </g>
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
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '48px', paddingBottom: '100px', textAlign: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔴💪
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Pascal's Law
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "How can a mechanic push with 50 pounds of force and lift a <span style={{ color: colors.accent }}>2-ton car</span>? The answer lies in <span style={{ color: colors.fluid }}>hydraulic fluid</span> and one brilliant principle."
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
            "Pressure applied to a confined fluid is transmitted undiminished to every portion of the fluid and the walls of the container."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Blaise Pascal, 1653
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Secret
        </button>

        {renderNavDots()}
        </div>
        {renderNavigationBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Pressure is highest near the small piston and decreases with distance' },
      { id: 'b', text: 'Pressure transmits equally throughout the entire fluid', correct: true },
      { id: 'c', text: 'Pressure only travels in a straight line between the pistons' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
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
            When you push on a small piston in a hydraulic system, what happens to the pressure in the fluid?
          </h2>

          {/* SVG diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto', maxHeight: '200px' }}>
              <defs>
                <linearGradient id="predictFluid" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <filter id="predictGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              {/* Background */}
              <rect width="400" height="200" fill={colors.bgSecondary} rx="8" />
              {/* Grid lines */}
              <line x1="50" y1="50" x2="350" y2="50" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="50" y1="100" x2="350" y2="100" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="50" y1="150" x2="350" y2="150" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              {/* Small piston cylinder */}
              <rect x="50" y="60" width="60" height="80" fill={colors.bgCard} stroke={colors.border} strokeWidth="2" rx="4" />
              <rect x="60" y="80" width="40" height="40" fill="#94a3b8" stroke="#475569" strokeWidth="2" rx="2" />
              {/* Force arrow */}
              <path d="M 80 40 L 80 75" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
              <path d="M 75 75 L 85 75 L 80 85" fill="#22c55e" />
              {/* Fluid reservoir */}
              <rect x="110" y="100" width="180" height="60" fill="url(#predictFluid)" rx="4" />
              <text x="200" y="135" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">Hydraulic Fluid</text>
              {/* Pressure arrows */}
              <path d="M 130 118 L 160 118" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
              <path d="M 175 118 L 225 118" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
              <path d="M 240 118 L 270 118" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
              {/* Large piston cylinder */}
              <rect x="290" y="60" width="70" height="80" fill={colors.bgCard} stroke={colors.border} strokeWidth="2" rx="4" />
              <rect x="298" y="80" width="54" height="40" fill="#94a3b8" stroke="#475569" strokeWidth="2" rx="2" />
              {/* Question mark */}
              <text x="325" y="45" textAnchor="middle" fill={colors.warning} fontSize="24" fontWeight="700" filter="url(#predictGlow)">?</text>
              {/* Labels */}
              <text x="80" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="11">Small A1</text>
              <text x="200" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="11">Pressure</text>
              <text x="325" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="11">Large A2</text>
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
        </div>

        {renderNavDots()}
        {renderNavigationBar(!prediction)}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Hydraulic Force Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              This visualization demonstrates how hydraulic force multiplication works. Adjust the piston areas and observe how force gets multiplied!
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
                When you increase the large piston area, the output force increases because pressure is constant throughout the fluid. This is Pascal's Law!
              </p>
            </div>

            {/* Educational explanation */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Cause &amp; Effect:</strong> When you push on the small piston, it creates pressure in the fluid. Because the fluid is incompressible, this pressure transmits equally to all surfaces — including the large piston. As you increase the area ratio, the force multiplication increases proportionally.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Real-World Application:</strong> Engineers use this principle to design hydraulic systems for car brakes, aircraft controls, and construction equipment. Industry relies on hydraulics because they can multiply forces by 10-200x with simple mechanical designs. This is why everyday machines like excavators and car lifts can lift massive loads.
              </p>
            </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Main visualization */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <HydraulicVisualization />
                </div>
              </div>

              {/* Stats display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: '#fcd34d' }}>{pressure.toFixed(0)} N/cm^2</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Pressure (constant)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{mechanicalAdvantage.toFixed(1)}x</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Force Multiplication</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: '#ef4444' }}>{outputForce.toFixed(0)} N</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Output Force</div>
                </div>
              </div>

              {/* Formula explanation */}
              <div style={{
                background: `${colors.accent}11`,
                border: `1px solid ${colors.accent}33`,
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.textPrimary, fontFamily: 'monospace', marginBottom: '8px' }}>
                  F1 / A1 = F2 / A2 = P (Pressure is constant)
                </p>
                <p style={{ ...typo.small, color: colors.accent }}>
                  F2 = F1 x (A2 / A1) = {inputForce} x ({largePistonArea} / {smallPistonArea}) = {outputForce.toFixed(0)} N
                </p>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Input Force slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Input Force (F1)</span>
                    <span style={{ ...typo.small, color: '#22c55e', fontWeight: 600 }}>{inputForce} N</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={inputForce}
                    onChange={(e) => setInputForce(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      accentColor: '#3b82f6',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Small Piston Area slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Small Piston Area (A1)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{smallPistonArea} cm^2</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={smallPistonArea}
                    onChange={(e) => setSmallPistonArea(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      accentColor: '#3b82f6',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Large Piston Area slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Large Piston Area (A2)</span>
                    <span style={{ ...typo.small, color: '#ef4444', fontWeight: 600 }}>{largePistonArea} cm^2</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={largePistonArea}
                    onChange={(e) => setLargePistonArea(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      accentColor: '#3b82f6',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Activate button */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <button
                    onClick={() => startAnimation()}
                    disabled={isAnimating}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isAnimating ? colors.border : colors.accent,
                      color: 'white',
                      fontWeight: 600,
                      cursor: isAnimating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isAnimating ? 'Pumping...' : 'Activate Hydraulics'}
                  </button>
                  <button
                    onClick={() => {
                      setAnimationProgress(0);
                      setIsAnimating(false);
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
          </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            The Physics of Pascal's Law
          </h2>

          <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.success, margin: 0, fontWeight: 600 }}>
                {prediction === 'b'
                  ? '✓ Your prediction was correct! Pressure transmits equally throughout the fluid.'
                  : prediction
                    ? `Your prediction suggested: "${options?.find?.((o: {id: string, text: string}) => o.id === prediction)?.text || prediction}". Let\'s see what actually happened in the experiment.`
                    : 'In this experiment, you observed that pressure transmits equally throughout the fluid. Your prediction will be compared here after you make one.'}
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
                <strong style={{ color: colors.textPrimary }}>Pascal's Law: P1 = P2</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Pressure applied to a <span style={{ color: colors.accent }}>confined, incompressible fluid</span> transmits equally in all directions throughout the fluid. The pressure at any point is the same regardless of the container's shape.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Force Multiplication: F2 = F1 x (A2/A1)</strong>
              </p>
              <p>
                Since pressure is constant, a <span style={{ color: colors.accent }}>larger piston area</span> experiences a larger force. This is the key to hydraulic force multiplication!
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              But There's No Free Lunch!
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Conservation of energy still applies: <strong>Work In = Work Out</strong>
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>If force is multiplied {mechanicalAdvantage.toFixed(0)}x...</li>
              <li>Distance is divided by {mechanicalAdvantage.toFixed(0)}x</li>
              <li>Push 10 cm to move the load only {(10/mechanicalAdvantage).toFixed(1)} cm</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Why It Works
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Liquids are essentially incompressible. When you push on one part of a confined liquid, the molecules transmit that push instantaneously and equally in all directions. This is fundamentally different from gases, which compress and absorb force.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See a Real Application
          </button>
          </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: '100 N total - force is conserved and just redistributed' },
      { id: 'b', text: '1,000 N total - force is multiplied 10x and split between 4 wheels' },
      { id: 'c', text: '4,000 N total - each wheel gets the full 1,000 N independently', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              Brake System Challenge
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A car brake system has a master cylinder (2 cm^2) connected to 4 brake calipers (20 cm^2 each). You press with 100 N. What's the TOTAL braking force?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox="0 0 420 220" style={{ width: '100%', height: 'auto', maxHeight: '220px' }}>
              <defs>
                <linearGradient id="twistFluid" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <filter id="twistGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              {/* Background */}
              <rect width="420" height="220" fill={colors.bgSecondary} rx="8" />
              {/* Grid */}
              <line x1="40" y1="40" x2="380" y2="40" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="40" y1="110" x2="380" y2="110" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="40" y1="180" x2="380" y2="180" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              {/* Pressure distribution curve - spans full height */}
              <path d="M 95 15 C 95 60 170 80 170 110 C 170 140 200 160 270 155 L 310 30 L 310 200 L 95 200" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.4)" strokeWidth="2" />
              {/* Force multiplication bars - spanning full height */}
              <path d="M 50 210 L 50 10 L 52 10 L 52 210 Z" fill="#22c55e" opacity="0.3" />
              <path d="M 380 210 L 380 10 L 382 10 L 382 210 Z" fill="#ef4444" opacity="0.3" />
              {/* Pedal */}
              <rect x="20" y="95" width="40" height="20" fill="#64748b" rx="3" />
              <text x="40" y="132" textAnchor="middle" fill="#e2e8f0" fontSize="11">Pedal</text>
              {/* Master cylinder */}
              <rect x="70" y="88" width="50" height="30" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
              <text x="95" y="133" textAnchor="middle" fill="#e2e8f0" fontSize="11">Master 2cm²</text>
              {/* Fluid lines to 4 wheels - each spans significant vertical space */}
              <path d="M 120 98 L 175 98 L 175 30 L 265 30 L 265 15 L 310 30" fill="none" stroke="url(#twistFluid)" strokeWidth="5" strokeLinecap="round" />
              <path d="M 120 98 L 175 98 L 175 195 L 265 195 L 265 210 L 310 190" fill="none" stroke="url(#twistFluid)" strokeWidth="5" strokeLinecap="round" />
              <path d="M 120 103 L 175 103 L 175 75 L 265 75 L 265 20 L 310 80" fill="none" stroke="url(#twistFluid)" strokeWidth="5" strokeLinecap="round" />
              <path d="M 120 103 L 175 103 L 175 145 L 265 145 L 265 200 L 310 130" fill="none" stroke="url(#twistFluid)" strokeWidth="5" strokeLinecap="round" />
              {/* 4 calipers */}
              {[30, 80, 130, 190].map((y, i) => (
                <g key={i}>
                  <rect x="310" y={y - 14} width="35" height="28" fill="#dc2626" rx="4" />
                  <text x="328" y={y + 5} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">20</text>
                </g>
              ))}
              {/* Labels */}
              <text x="328" y="212" textAnchor="middle" fill="#e2e8f0" fontSize="11">Calipers</text>
              {/* Question mark */}
              <text x="390" y="115" textAnchor="middle" fill={colors.warning} fontSize="22" fontWeight="700" filter="url(#twistGlow)">?</text>
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
              See How Brakes Really Work
            </button>
          )}
          </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Interactive Brake System
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Press the brake pedal and watch force multiply at EACH wheel!
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>
                Watch for: How pressure transmits to both wheels simultaneously. Notice the calipers clamp as you increase pedal force. Each wheel gets the full multiplied force!
              </p>
            </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <BrakeSystemVisualization />
                </div>
              </div>

              {/* Key insight */}
              {brakePedalForce > 50 && (
                <div style={{
                  background: `${colors.success}22`,
                  border: `1px solid ${colors.success}`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                    Each caliper receives the FULL {(brakePedalForce * 10).toFixed(0)} N - not split between them!
                    Total braking force: {(brakePedalForce * 10 * 4).toFixed(0)} N = {((brakePedalForce * 10 * 4) / 9.8).toFixed(0)} kg equivalent!
                  </p>
                </div>
              )}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Brake pedal force slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Brake Pedal Force</span>
                    <span style={{ ...typo.small, color: '#22c55e', fontWeight: 600 }}>{brakePedalForce} N</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brakePedalForce}
                    onChange={(e) => setBrakePedalForce(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      accentColor: '#3b82f6',
                    } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Light press</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Emergency brake</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Magic
          </button>
          </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Hydraulic Multiplication Secret
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>P</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Pressure Transmits Equally</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The pressure created in the master cylinder transmits equally to ALL connected cylinders simultaneously. It doesn't get "split up" or "diluted" - every outlet sees the same pressure.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>F</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Each Output Gets Full Force</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Each brake caliper independently converts the pressure (P = F/A) into its own force (F = P x A). Four calipers don't share one force - they each generate their own full multiplied force!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>W</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Work Is Still Conserved</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The master cylinder must push more fluid to fill all four caliper pistons. More output cylinders = more pedal travel required. Energy conservation is maintained through volume balance.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>!</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Real-World Impact</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This is why car brakes work so well! Your ~50 lb foot force becomes 500+ lbs at EACH wheel. Combined with brake booster leverage, you can stop a 4,000 lb car from highway speeds.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See More Real Applications
          </button>
          </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: 0 }}>
                Real-World Applications
              </h2>
              <span style={{ ...typo.small, color: colors.textMuted }}>
                App {selectedApp + 1} of {realWorldApps.length}
              </span>
            </div>
            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '24px' }}>
              Explore how Pascal's Law powers modern hydraulic systems across industries, from automotive brakes to aircraft flight controls.
            </p>

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
                Pascal's Law Connection:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>

            <button
              onClick={() => {
                playSound('success');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
              }}
            >
              {selectedApp < realWorldApps.length - 1 ? 'Got It - Next Application →' : 'Got It!'}
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
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '!' : '?'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? "You've mastered Pascal's Law and hydraulic systems!"
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
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
          </div>
          {renderNavDots()}
          {renderNavigationBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Knowledge Test
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Apply what you learned about Pascal's Law and hydraulic systems.
          </p>
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
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar(testAnswers.some(a => a === null) && !testSubmitted)}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          !
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Pascal's Law Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how hydraulic systems multiply force using Pascal's principle of pressure transmission.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Pressure transmits equally in confined fluids',
              'Force multiplication: F2 = F1 x (A2/A1)',
              'Work is conserved: distance trades for force',
              'Multiple outputs each get full multiplied force',
              'Hydraulics power brakes, lifts, aircraft, presses',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>ok</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: colors.bgSecondary,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>Key Formula</h4>
          <p style={{ ...typo.h2, color: colors.textPrimary, fontFamily: 'monospace', margin: 0 }}>
            F1/A1 = F2/A2 = P
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            Pressure is constant throughout confined fluid
          </p>
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
        {renderNavigationBar()}
      </div>
    );
  }

  return null;
};

export default PascalLawRenderer;
