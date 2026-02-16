'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// INCLINED PLANE RENDERER - Complete 10-Phase Learning Game
// Discover how ramps multiply force using gravity components
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

interface InclinedPlaneRendererProps {
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
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "Ancient Egyptians are building a pyramid. They need to lift 2-ton stone blocks to a height of 50 meters. One engineer proposes a vertical lift using ropes and pulleys. Another suggests building a long ramp at a gentle 10-degree angle.",
    question: "Why would the ramp approach require less force per pull, even though the total distance traveled is much longer?",
    options: [
      { id: 'a', label: "Ramps reduce the gravitational force acting on the stone" },
      { id: 'b', label: "The ramp spreads the work over a longer distance, reducing the force needed at each moment", correct: true },
      { id: 'c', label: "Friction on the ramp helps push the stone upward" },
      { id: 'd', label: "Ramps are made of a special low-gravity material" }
    ],
    explanation: "An inclined plane trades distance for force. The work done (force x distance) remains the same, but by increasing the distance traveled, the required force at each moment decreases proportionally. A 10-degree ramp provides about a 5.7x mechanical advantage."
  },
  {
    scenario: "A wheelchair user needs to access a building entrance that is 1 meter above ground level. Building codes require a maximum ramp slope of 1:12, meaning for every 1 meter of rise, the ramp must extend at least 12 meters horizontally.",
    question: "What is the maximum angle this ADA-compliant ramp can have?",
    options: [
      { id: 'a', label: "About 4.8 degrees", correct: true },
      { id: 'b', label: "About 12 degrees" },
      { id: 'c', label: "About 8.3 degrees" },
      { id: 'd', label: "About 15 degrees" }
    ],
    explanation: "The angle can be calculated using tan^(-1)(1/12) = 4.76 degrees. This gentle slope ensures wheelchair users can ascend independently without excessive force. The mechanical advantage is 12, meaning they only need 1/12 the force of lifting straight up."
  },
  {
    scenario: "A physics student places a 5 kg box on a frictionless ramp tilted at 30 degrees. She calculates the force component pulling the box down the ramp using F = mg sin(theta).",
    question: "What is the component of gravity pulling the box down the ramp?",
    options: [
      { id: 'a', label: "49 N (the full weight)" },
      { id: 'b', label: "24.5 N (half the weight)", correct: true },
      { id: 'c', label: "42.4 N" },
      { id: 'd', label: "9.8 N" }
    ],
    explanation: "The parallel component of gravity is F = mg sin(30) = 5 kg x 9.8 m/s^2 x 0.5 = 24.5 N. Only half the gravitational force acts along the ramp because sin(30) = 0.5. The other component (mg cos 30) pushes perpendicular into the ramp surface."
  },
  {
    scenario: "A loading dock worker needs to push a 200 kg refrigerator into a delivery truck. The truck bed is 1.2 meters off the ground. He has a 3-meter long ramp available.",
    question: "What is the mechanical advantage of using this ramp, and approximately what force is needed to push the refrigerator up (ignoring friction)?",
    options: [
      { id: 'a', label: "MA = 2.5, Force needed = 784 N", correct: true },
      { id: 'b', label: "MA = 3, Force needed = 653 N" },
      { id: 'c', label: "MA = 1.2, Force needed = 1633 N" },
      { id: 'd', label: "MA = 4, Force needed = 490 N" }
    ],
    explanation: "Mechanical advantage = Length / Height = 3m / 1.2m = 2.5. The force needed = Weight / MA = (200 kg x 9.8 m/s^2) / 2.5 = 784 N. Without the ramp, lifting straight up would require 1960 N - the ramp reduces the required force by 60%."
  },
  {
    scenario: "On a rough wooden ramp (coefficient of friction = 0.3), a student tries to push a box uphill. She notices that friction seems to make the task harder when pushing up, but would help prevent sliding when stationary.",
    question: "When pushing a box UP a ramp, how does friction affect the required force compared to a frictionless ramp?",
    options: [
      { id: 'a', label: "Friction has no effect on upward motion" },
      { id: 'b', label: "Friction decreases the force needed by providing grip" },
      { id: 'c', label: "Friction increases the force needed because it opposes the motion direction", correct: true },
      { id: 'd', label: "Friction only matters when moving downward" }
    ],
    explanation: "Friction always opposes the direction of motion. When pushing upward, friction acts downward along the ramp, adding to the gravitational component you must overcome. Total force needed = mg sin(theta) + friction force, where friction = mu x mg cos(theta)."
  },
  {
    scenario: "A mountain road switchbacks up a 300-meter elevation gain. Engineers could build a direct steep road (2 km long at 15% grade) or a longer switchback route (5 km long at 6% grade).",
    question: "Why do mountain roads use switchbacks instead of going straight up the slope?",
    options: [
      { id: 'a', label: "Switchbacks provide better views for tourists" },
      { id: 'b', label: "Steeper grades exceed vehicle engine capabilities and create safety hazards", correct: true },
      { id: 'c', label: "Switchbacks are cheaper to construct than straight roads" },
      { id: 'd', label: "Snow removal is easier on winding roads" }
    ],
    explanation: "A 15% grade requires vehicles to climb 15 meters for every 100 meters traveled. This steep angle demands high engine force, causes brake overheating on descent, and increases rollover risk. The 6% switchback reduces required engine force by 60%, making travel safer and more fuel-efficient."
  },
  {
    scenario: "A screw has threads that spiral around the shaft at a very small angle (typically 2-5 degrees). When you turn the screwdriver, you apply force around a circular path while the screw advances a small linear distance into the wood.",
    question: "Why do screws provide such enormous mechanical advantage (often 50:1 or more)?",
    options: [
      { id: 'a', label: "The threads are made of hardened steel" },
      { id: 'b', label: "The screw is an inclined plane wrapped in a helix - gentle angle over long distance creates high MA", correct: true },
      { id: 'c', label: "Friction between threads and wood multiplies the force" },
      { id: 'd', label: "Screws work by compressing air inside the hole" }
    ],
    explanation: "A screw is a helical inclined plane. Each full turn moves the screw forward by only the thread pitch (a few mm), while your hand travels the full circumference of the screwdriver handle (often 100+ mm). This distance ratio creates mechanical advantages of 50:1 or higher."
  },
  {
    scenario: "A wedge (like an axe blade) is placed against a log. When you strike the top with a hammer, the wedge is driven into the wood, splitting it apart. The wedge angle is 15 degrees from the centerline (30 degree total).",
    question: "How does the wedge convert the downward hammer force into a splitting force?",
    options: [
      { id: 'a', label: "The wedge simply pushes the wood aside with brute force" },
      { id: 'b', label: "The inclined surfaces redirect and multiply the downward force into perpendicular splitting forces", correct: true },
      { id: 'c', label: "The sharp edge cuts through the wood fibers" },
      { id: 'd', label: "Heat from friction weakens the wood structure" }
    ],
    explanation: "A wedge is a double inclined plane. The downward force on the wedge back is redirected by the angled surfaces into forces perpendicular to each face. With a 30-degree total angle, the splitting force on each side is about 2x the applied force (MA = 1/sin(15))."
  },
  {
    scenario: "A conveyor belt at a warehouse moves packages up a 5-degree incline from ground level to a 2-meter high sorting platform. Engineers must calculate the motor power needed, accounting for the belt supporting multiple packages simultaneously.",
    question: "If the conveyor must lift packages at a rate of 1000 kg per minute, what power output is required from the motor (ignoring friction)?",
    options: [
      { id: 'a', label: "About 327 watts", correct: true },
      { id: 'b', label: "About 1960 watts" },
      { id: 'c', label: "About 163 watts" },
      { id: 'd', label: "About 2000 watts" }
    ],
    explanation: "Power = Work / Time = (mgh) / t = (1000 kg x 9.8 m/s^2 x 2 m) / 60 sec = 327 W. Interestingly, the 5-degree angle only affects the ramp length needed, not the power requirement - the work to lift against gravity is the same regardless of path."
  },
  {
    scenario: "A ski slope is rated as a black diamond with a 45% grade (about 24 degrees). A 70 kg skier points their skis straight downhill and begins accelerating. Assuming minimal friction and air resistance.",
    question: "What is the skier's acceleration down the slope?",
    options: [
      { id: 'a', label: "9.8 m/s^2 (full gravity)" },
      { id: 'b', label: "About 4.0 m/s^2", correct: true },
      { id: 'c', label: "About 6.9 m/s^2" },
      { id: 'd', label: "About 2.5 m/s^2" }
    ],
    explanation: "Acceleration = g x sin(24) = 9.8 x 0.407 = 4.0 m/s^2. Only the component of gravity parallel to the slope accelerates the skier. After 5 seconds, they would be traveling at 20 m/s (45 mph) - which is why ski slope grooming and technique are so important for control."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications
// ============================================================================
const realWorldApps = [
  {
    icon: '♿',
    title: 'Wheelchair Ramps & Accessibility',
    short: 'Engineering independence through gentle slopes',
    tagline: 'The ADA mandates physics for inclusion',
    description: 'Wheelchair ramps are perhaps the most visible application of inclined plane physics in daily life. The Americans with Disabilities Act (ADA) mandates a maximum slope of 1:12, ensuring wheelchair users can ascend independently without excessive effort.',
    connection: 'The mechanical advantage you explored directly applies here. A 1:12 slope (4.76 degrees) means users only need to exert 1/12 the force of lifting straight up - about 8% of their body weight as additional pushing force.',
    howItWorks: 'The ramp angle is carefully chosen to balance accessibility with practicality. Steeper ramps require less space but more effort; gentler ramps are easier to climb but need more room. Handrails provide stability, and non-slip surfaces ensure adequate friction for safety.',
    stats: [
      { value: '1:12', label: 'Max ADA Slope', icon: '📐' },
      { value: '4.76', label: 'Degrees Maximum', icon: '📏' },
      { value: '12x', label: 'Force Reduction', icon: '💪' }
    ],
    examples: ['Building entrances with gradual ramps', 'Curb cuts at street intersections', 'Vehicle ramps for wheelchair vans', 'Stadium accessible seating routes'],
    companies: ['EZ-ACCESS', 'Prairie View Industries', 'Roll-A-Ramp', 'National Ramp'],
    futureImpact: 'Smart ramps with powered assist will detect approaching wheelchairs and provide motorized boost. Modular quick-deploy ramps will enable temporary accessibility at any venue. AR navigation will guide users to optimal accessible routes.',
    color: '#3B82F6'
  },
  {
    icon: '🚚',
    title: 'Loading Docks & Logistics',
    short: 'Moving tons of cargo with minimal effort',
    tagline: 'The backbone of global supply chains',
    description: 'Loading dock ramps enable efficient transfer of heavy cargo between warehouse floors and truck beds. Operating at 5-10 degree angles, these industrial inclined planes allow forklifts to safely transport pallets weighing thousands of pounds.',
    connection: 'The force calculations from the simulation directly apply. A 10-degree dock ramp with 2000 kg of cargo requires only about 340 kg of pushing force instead of the full weight - critical for manual pallet jacks and forklift battery life.',
    howItWorks: 'Hydraulic dock levelers automatically adjust to different truck bed heights, maintaining optimal ramp angles. The inclined plane converts horizontal pushing force into vertical lifting, while textured steel surfaces provide traction for rubber tires.',
    stats: [
      { value: '5-10', label: 'Typical Angle', icon: '📐' },
      { value: '50K lbs', label: 'Max Capacity', icon: '📦' },
      { value: '15%', label: 'Energy Saved', icon: '⚡' }
    ],
    examples: ['Distribution center dock levelers', 'Portable yard ramps for ground loading', 'Container ship loading ramps', 'Aircraft cargo loading systems'],
    companies: ['Rite-Hite', 'Pentalift', 'Blue Giant', 'McGuire Loading Dock'],
    futureImpact: 'AI-powered docks will auto-adjust angles based on cargo weight and forklift specs. Predictive maintenance will detect wear before failures. Integration with autonomous vehicles will enable fully automated 24/7 loading operations.',
    color: '#F97316'
  },
  {
    icon: '🔩',
    title: 'Screws, Wedges & Fasteners',
    short: 'Inclined planes wrapped and doubled for power',
    tagline: 'Simple machines hiding in plain sight',
    description: 'Screws and wedges are inclined planes in disguise. A screw is a helical inclined plane wrapped around a cylinder, while a wedge is two inclined planes joined at the base. Both provide enormous mechanical advantage in compact form.',
    connection: 'The gentle angle of screw threads (typically 2-5 degrees) creates mechanical advantages of 50:1 or more. When you turn a screwdriver, the circular path your hand travels is much longer than the linear advance of the screw - classic distance-for-force tradeoff.',
    howItWorks: 'For screws, MA = circumference / thread pitch. A screwdriver handle with 80mm circumference and 1.5mm pitch threads provides MA of 53. Wedges multiply force perpendicular to their faces; a 10-degree wedge multiplies input force by about 6x.',
    stats: [
      { value: '50:1', label: 'Screw MA', icon: '🔩' },
      { value: '2-5', label: 'Thread Angle', icon: '📐' },
      { value: '6x', label: 'Wedge Force', icon: '⚡' }
    ],
    examples: ['Wood screws and bolts', 'Axe and knife blades', 'Zipper teeth mechanism', 'Ship bow design for water splitting'],
    companies: ['Stanley', 'DeWalt', 'Fastenal', 'Illinois Tool Works'],
    futureImpact: 'Self-tightening fasteners with optimal thread geometry will eliminate loosening failures. 3D-printed custom screws will match specific material properties. Nano-structured wedge surfaces will reduce friction while maintaining grip.',
    color: '#8B5CF6'
  },
  {
    icon: '⛰️',
    title: 'Mountain Roads & Switchbacks',
    short: 'Conquering elevation through clever geometry',
    tagline: 'Trading distance for manageable grades',
    description: 'Mountain roads use switchback patterns to maintain drivable grades on steep terrain. Instead of climbing directly (which might require 20%+ grades), roads zigzag at gentler 6-8% grades, dramatically reducing required engine force.',
    connection: 'This is mechanical advantage on a massive scale. A mountain rising 1000m might have a direct climbing distance of 2km (50% grade), but a switchback road stretching 15km reduces the effective grade to 6.7% - requiring 7.5x less force from vehicle engines.',
    howItWorks: 'Each switchback turn reverses direction while maintaining a consistent uphill grade. Modern road design optimizes curve radii for safe speeds, adds runaway truck ramps for brake failures, and uses gear-reduction lanes for safe descent.',
    stats: [
      { value: '6-8%', label: 'Safe Road Grade', icon: '🚗' },
      { value: '15%', label: 'Max US Grade', icon: '⚠️' },
      { value: '7x', label: 'Force Reduction', icon: '💪' }
    ],
    examples: ['Trollstigen road in Norway', 'Going-to-the-Sun Road, Montana', 'Stelvio Pass, Italian Alps', 'Beartooth Highway, Wyoming'],
    companies: ['Federal Highway Administration', 'State DOTs', 'Bechtel', 'AECOM'],
    futureImpact: 'Electric vehicles with regenerative braking will transform mountain driving economics. Smart road surfaces will adjust friction for weather conditions. Autonomous trucks will optimize gear selection and braking for maximum efficiency.',
    color: '#10B981'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const InclinedPlaneRenderer: React.FC<InclinedPlaneRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state
  const [angle, setAngle] = useState(30);
  const [hasFriction, setHasFriction] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [ballPosition, setBallPosition] = useState(0);
  const [ballVelocity, setBallVelocity] = useState(0);
  const [showVectors, setShowVectors] = useState(true);
  const [experimentCount, setExperimentCount] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([true, false, false, false]);

  // Animation ref
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const isNavigating = useRef(false);

  // Physics constants
  const g = 9.8;
  const mass = 1;
  const frictionCoef = hasFriction ? 0.3 : 0;
  const angleRad = (angle * Math.PI) / 180;
  const gravityParallel = mass * g * Math.sin(angleRad);
  const normalForce = mass * g * Math.cos(angleRad);
  const frictionForce = frictionCoef * normalForce;
  const netAcceleration = Math.max(0, (gravityParallel - frictionForce) / mass);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    gravity: '#A855F7',
    normal: '#22C55E',
    parallel: '#F59E0B',
    friction: '#EF4444',
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
    twist_play: 'Twist: Friction Lab',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'inclined-plane',
        gameTitle: 'Inclined Plane Physics',
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

  // Start rolling animation
  const startRolling = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    setBallPosition(0);
    setBallVelocity(0);
    startTimeRef.current = Date.now();

    let pos = 0;
    let vel = 0;
    const accel = netAcceleration;

    const animate = () => {
      const dt = 0.016;
      vel += accel * dt * 3;
      pos += vel * dt * 10;

      setBallPosition(Math.min(pos, 100));
      setBallVelocity(vel);

      if (pos < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRolling(false);
        setExperimentCount(prev => prev + 1);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isRolling, netAcceleration]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsRolling(false);
    setBallPosition(0);
    setBallVelocity(0);
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
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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

  // Inclined Plane SVG Visualization
  const InclinedPlaneVisualization = () => {
    const vbWidth = isMobile ? 400 : 640;
    const vbHeight = isMobile ? 200 : 280;

    const rampLength = vbWidth - 80;
    const rampHeight = rampLength * Math.tan(angleRad) * 0.6;
    const rampStartX = 40;
    const rampStartY = 40;
    const rampEndX = rampStartX + rampLength;
    const rampEndY = Math.min(rampStartY + rampHeight, vbHeight - 30);

    const ballProgress = ballPosition / 100;
    const ballX = rampStartX + ballProgress * (rampEndX - rampStartX);
    const ballY = rampStartY + ballProgress * (rampEndY - rampStartY);
    const ballRadius = isMobile ? 14 : 18;

    const vectorScale = isMobile ? 4.5 : 6;

    return (
      <svg viewBox={`0 0 ${vbWidth} ${vbHeight}`} width="100%" style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="rampGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="ballGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {hasFriction && (
            <pattern id="roughTexture" patternUnits="userSpaceOnUse" width="8" height="8">
              <circle cx="2" cy="2" r="1" fill="#78716c" opacity="0.4" />
              <circle cx="6" cy="6" r="1" fill="#78716c" opacity="0.4" />
            </pattern>
          )}
        </defs>

        {/* Ground */}
        <rect x={0} y={rampEndY + 5} width={vbWidth} height={vbHeight - rampEndY - 5} fill="#1F2937" />
        <line x1={0} y1={rampEndY + 5} x2={vbWidth} y2={rampEndY + 5} stroke="#374151" strokeWidth={2} />

        {/* Ramp */}
        <polygon
          points={`${rampStartX},${rampStartY} ${rampEndX},${rampEndY} ${rampEndX},${rampEndY + 15} ${rampStartX},${rampStartY + 15}`}
          fill="url(#rampGrad)"
          stroke="#64748B"
          strokeWidth={1}
        />
        {hasFriction && (
          <polygon
            points={`${rampStartX},${rampStartY} ${rampEndX},${rampEndY} ${rampEndX},${rampEndY + 15} ${rampStartX},${rampStartY + 15}`}
            fill="url(#roughTexture)"
          />
        )}

        {/* Angle arc */}
        <path
          d={`M${rampEndX - 40} ${rampEndY} A 40 40 0 0 0 ${rampEndX - 40 * Math.cos(angleRad)} ${rampEndY - 40 * Math.sin(angleRad)}`}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
          filter="url(#glow)"
        />
        <text x={rampEndX - 65} y={rampEndY - 18} fill={colors.accent} fontSize="14" fontWeight="bold">
          {angle}°
        </text>
        <text x={rampEndX - 35} y={rampEndY - 2} fill={colors.accent} fontSize="12" fontStyle="italic">θ</text>

        {/* Ball */}
        <circle
          cx={ballX}
          cy={ballY - ballRadius - 5}
          r={ballRadius}
          fill="url(#ballGrad)"
          filter="url(#glow)"
        />

        {/* Force vectors */}
        {showVectors && (
          <g transform={`translate(${ballX}, ${ballY - ballRadius - 5})`}>
            {/* Gravity (straight down) */}
            <line
              x1={0} y1={0}
              x2={0} y2={mass * g * vectorScale}
              stroke={colors.gravity}
              strokeWidth={3}
              filter="url(#glow)"
            />
            <polygon
              points={`0,${mass * g * vectorScale + 8} -5,${mass * g * vectorScale} 5,${mass * g * vectorScale}`}
              fill={colors.gravity}
            />
            <text x={8} y={mass * g * vectorScale / 2} fill={colors.gravity} fontSize="11" fontWeight="600">mg</text>

            {/* Normal force */}
            <g transform={`rotate(${-angle})`}>
              <line
                x1={0} y1={0}
                x2={0} y2={-normalForce * vectorScale}
                stroke={colors.normal}
                strokeWidth={3}
                filter="url(#glow)"
              />
              <polygon
                points={`0,${-normalForce * vectorScale - 8} -5,${-normalForce * vectorScale} 5,${-normalForce * vectorScale}`}
                fill={colors.normal}
              />
              <text x={-16} y={-normalForce * vectorScale / 2} fill={colors.normal} fontSize="10" fontWeight="600">N</text>
            </g>

            {/* Parallel component */}
            <g transform={`rotate(${angle})`}>
              <line
                x1={0} y1={0}
                x2={gravityParallel * vectorScale} y2={0}
                stroke={colors.parallel}
                strokeWidth={3}
                filter="url(#glow)"
              />
              <polygon
                points={`${gravityParallel * vectorScale + 8},0 ${gravityParallel * vectorScale},-5 ${gravityParallel * vectorScale},5`}
                fill={colors.parallel}
              />
              <text x={gravityParallel * vectorScale / 2} y={-14} fill={colors.parallel} fontSize="10" fontWeight="600">mg sin θ</text>

              {/* Friction */}
              {hasFriction && frictionForce > 0 && (
                <>
                  <line
                    x1={0} y1={0}
                    x2={-frictionForce * vectorScale} y2={0}
                    stroke={colors.friction}
                    strokeWidth={3}
                    filter="url(#glow)"
                  />
                  <polygon
                    points={`${-frictionForce * vectorScale - 8},0 ${-frictionForce * vectorScale},-5 ${-frictionForce * vectorScale},5`}
                    fill={colors.friction}
                  />
                  <text x={-frictionForce * vectorScale / 2} y={-14} fill={colors.friction} fontSize="10" fontWeight="600">f</text>
                </>
              )}
            </g>
          </g>
        )}

        {/* Info panel */}
        <rect x={vbWidth - 100} y={10} width={90} height={60} rx={8} fill={colors.bgSecondary} stroke={colors.border} />
        <text x={vbWidth - 55} y={30} textAnchor="middle" fill={colors.textSecondary} fontSize="10">Acceleration</text>
        <text x={vbWidth - 55} y={50} textAnchor="middle" fill={colors.success} fontSize="18" fontWeight="bold">
          {netAcceleration.toFixed(2)}
        </text>
        <text x={vbWidth - 55} y={62} textAnchor="middle" fill={colors.textMuted} fontSize="9">m/s^2</text>

        {/* Legend */}
        <g transform={`translate(10, ${vbHeight - 90})`}>
          <rect x={0} y={0} width={isMobile ? 260 : 340} height={85} rx={6} fill={colors.bgSecondary} stroke={colors.border} />
          <circle cx={12} cy={14} r={5} fill={colors.gravity} />
          <text x={24} y={17} fill={colors.textSecondary} fontSize="11">Weight (mg) — Gravity pulling straight down</text>
          <circle cx={12} cy={32} r={5} fill={colors.normal} />
          <text x={24} y={35} fill={colors.textSecondary} fontSize="11">Normal (N) — Surface pushes perpendicular to ramp</text>
          <circle cx={12} cy={50} r={5} fill={colors.parallel} />
          <text x={24} y={53} fill={colors.textSecondary} fontSize="11">Parallel (mg sin θ) — Drives acceleration down ramp</text>
          {hasFriction && (
            <>
              <circle cx={12} cy={68} r={5} fill={colors.friction} />
              <text x={24} y={71} fill={colors.textSecondary} fontSize="11">Friction (f) — Opposes motion, reduces acceleration</text>
            </>
          )}
        </g>
      </svg>
    );
  };

  // Acceleration vs Angle Graph
  const AccelerationGraph = () => {
    const gVal = 9.8;
    const graphW = 440;
    const graphH = 220;
    const padL = 55;
    const padR = 20;
    const padT = 30;
    const padB = 40;
    const plotW = graphW - padL - padR;
    const plotH = graphH - padT - padB;

    // Generate curve points: a = g * sin(theta) for theta 0..90
    const curvePoints: string[] = [];
    for (let deg = 0; deg <= 90; deg += 2) {
      const rad = (deg * Math.PI) / 180;
      const a = gVal * Math.sin(rad);
      const x = padL + (deg / 90) * plotW;
      const y = padT + plotH - (a / gVal) * plotH;
      curvePoints.push(`${x},${y}`);
    }

    // Current angle marker
    const curX = padL + (angle / 90) * plotW;
    const curA = gVal * Math.sin((angle * Math.PI) / 180);
    const curY = padT + plotH - (curA / gVal) * plotH;

    return (
      <svg viewBox={`0 0 ${graphW} ${graphH}`} width="100%" style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Title */}
        <text x={graphW / 2} y={18} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">
          Acceleration vs Angle
        </text>

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={colors.border} strokeWidth={1.5} />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={colors.border} strokeWidth={1.5} />

        {/* Y-axis labels */}
        {[0, 2.45, 4.9, 7.35, 9.8].map((val, i) => {
          const y = padT + plotH - (val / gVal) * plotH;
          return (
            <g key={i}>
              <line x1={padL - 4} y1={y} x2={padL} y2={y} stroke={colors.textMuted} strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fill={colors.textMuted} fontSize="9">{val.toFixed(1)}</text>
              <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke={colors.border} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.4} />
            </g>
          );
        })}
        <text x={12} y={padT + plotH / 2} textAnchor="end" fill={colors.textSecondary} fontSize="10" transform={`rotate(-90, 12, ${padT + plotH / 2})`}>
          Acceleration (m/s²)
        </text>

        {/* X-axis labels */}
        {[0, 15, 30, 45, 60, 75, 90].map((deg, i) => {
          const x = padL + (deg / 90) * plotW;
          return (
            <g key={i}>
              <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 4} stroke={colors.textMuted} strokeWidth={1} />
              <text x={x} y={padT + plotH + 16} textAnchor="middle" fill={colors.textMuted} fontSize="9">{deg}°</text>
            </g>
          );
        })}
        <text x={padL + plotW / 2} y={graphH - 4} textAnchor="middle" fill={colors.textSecondary} fontSize="10">
          Angle θ (degrees)
        </text>

        {/* Curve */}
        <polyline
          points={curvePoints.join(' ')}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
        />

        {/* Dashed vertical line at current angle */}
        <line x1={curX} y1={padT} x2={curX} y2={padT + plotH} stroke={colors.warning} strokeWidth={1.5} strokeDasharray="6,4" />

        {/* Current angle marker */}
        <circle cx={curX} cy={curY} r={6} fill={colors.warning} stroke="white" strokeWidth={2} />
        <text x={curX + 10} y={curY - 8} fill={colors.warning} fontSize="11" fontWeight="700">
          {curA.toFixed(2)} m/s²
        </text>
        <text x={curX + 10} y={curY + 6} fill={colors.textMuted} fontSize="9">
          at {angle}°
        </text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div
        data-theme-colors="#9CA3AF #6B7280"
        style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '72px',
          marginBottom: '24px',
          animation: 'float 3s ease-in-out infinite',
        }}>
          🎢
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Inclined Plane
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "How did ancient Egyptians lift 2-ton stones to build pyramids? The secret lies in one of humanity's <span style={{ color: colors.accent }}>oldest simple machines</span> - the humble ramp."
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
            "Give me a place to stand and a ramp long enough, and I shall move the world with minimal effort."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Modern interpretation of Archimedes
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Begin Exploring
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The same force (980 N) - gravity is gravity!' },
      { id: 'b', text: 'About half the force (~500 N) - ramps reduce effort', correct: true },
      { id: 'c', text: 'More force - ramps add extra distance to push' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        {/* Navigation bar with Back button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '700px',
          margin: '60px auto 0',
          width: '100%',
        }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Back
          </button>
          <span style={{ ...typo.small, color: colors.textMuted }}>Step 2 of 10</span>
        </div>

        <div style={{ maxWidth: '700px', margin: '24px auto 0' }}>
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
            To push a 100 kg box up a 30-degree ramp, how much force do you need compared to lifting it straight up (980 N)?
          </h2>

          {/* SVG diagram showing the ramp scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 440} height={isMobile ? 180 : 220} style={{ display: 'block', margin: '0 auto' }}>
              <defs>
                <linearGradient id="predRamp" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748B" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill={colors.bgCard} rx="8" />
              {/* Ground */}
              <rect x="0" y="170" width="440" height="50" fill="#1F2937" />
              <line x1="0" y1="170" x2="440" y2="170" stroke="#374151" strokeWidth="2" />
              {/* Ramp */}
              <polygon points="60,50 380,170 380,185 60,65" fill="url(#predRamp)" stroke="#64748B" strokeWidth="1" />
              {/* Box on ramp */}
              <rect x="160" y="82" width="40" height="40" fill="#DC2626" rx="4" transform="rotate(17, 180, 102)" />
              {/* Angle arc */}
              <path d="M340 170 A 40 40 0 0 0 327 142" fill="none" stroke={colors.accent} strokeWidth="2" />
              <text x="310" y="155" fill={colors.accent} fontSize="14" fontWeight="bold">30</text>
              {/* Question mark */}
              <text x="120" y="75" fill={colors.warning} fontSize="28" fontWeight="bold">?</text>
              <text x="90" y="95" fill={colors.textSecondary} fontSize="11">Force needed</text>
              {/* Weight arrow */}
              <line x1="180" y1="120" x2="180" y2="165" stroke={colors.gravity} strokeWidth="2" />
              <polygon points="180,170 175,160 185,160" fill={colors.gravity} />
              <text x="188" y="150" fill={colors.gravity} fontSize="10">mg</text>
              {/* Labels */}
              <text x="220" y="30" fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="600">100 kg Box on a 30 Ramp</text>
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

  // PLAY PHASE - Interactive Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0', flex: 1, overflowY: 'auto', paddingTop: '48px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Inclined Plane Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust the angle and observe how forces change on the block. Watch how acceleration increases with steeper angles.
            This is important because the formula F = mg sin(theta) shows how inclined planes provide practical mechanical advantage used in real-world engineering applications.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}>
            {/* Acceleration vs Angle Graph */}
            <div style={{ marginBottom: '24px' }}>
              <AccelerationGraph />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <InclinedPlaneVisualization />
            </div>

            {/* Angle slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Ramp Angle - When you increase the angle, the acceleration increases because more of gravity acts along the ramp.</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{angle}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={angle}
                onChange={(e) => { setAngle(parseInt(e.target.value)); resetExperiment(); }}
                disabled={isRolling}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: isRolling ? 'not-allowed' : 'pointer',
                  accentColor: colors.accent,
                  touchAction: 'pan-y' as const,
                  background: `linear-gradient(to right, ${colors.accent}, ${colors.success})`,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>10° (gentle)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>60° (steep)</span>
              </div>
            </div>

            {/* Vector toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Show Vectors</span>
              <button
                onClick={() => setShowVectors(!showVectors)}
                style={{
                  width: '50px',
                  height: '26px',
                  borderRadius: '13px',
                  border: 'none',
                  background: showVectors ? colors.accent : colors.border,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s',
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: showVectors ? '27px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              {!isRolling && ballPosition === 0 && (
                <button
                  onClick={() => { playSound('click'); startRolling(); }}
                  style={{
                    ...primaryButtonStyle,
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  }}
                >
                  Roll Ball
                </button>
              )}
              {(isRolling || ballPosition > 0) && (
                <button
                  onClick={() => { playSound('click'); resetExperiment(); }}
                  style={{
                    ...primaryButtonStyle,
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  Reset
                </button>
              )}
            </div>

          </div>

          {/* Discovery prompt */}
          {experimentCount >= 1 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how steeper angles mean faster acceleration!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
            }}
          >
            Understand the Physics →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Mechanical Advantage of Ramps
          </h2>

          {/* Force Decomposition SVG Diagram */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <svg width={440} height={220} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block', margin: '0 auto' }}>
              {/* Title */}
              <text x={220} y={20} textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="700">Force Decomposition on a Ramp</text>
              {/* Ground */}
              <rect x={0} y={180} width={440} height={40} fill="#1F2937" />
              <line x1={0} y1={180} x2={440} y2={180} stroke="#374151" strokeWidth={2} />
              {/* Ramp */}
              <polygon points="60,60 380,180 380,195 60,75" fill="#64748B" stroke="#475569" strokeWidth={1} />
              {/* Box on ramp */}
              <rect x={180} y={92} width={36} height={36} fill="#DC2626" rx={4} transform="rotate(17, 198, 110)" />
              {/* Angle arc */}
              <path d="M340 180 A 40 40 0 0 0 327 152" fill="none" stroke={colors.accent} strokeWidth={2} />
              <text x={305} y={168} fill={colors.accent} fontSize="13" fontWeight="bold">30°</text>
              <text x={318} y={148} fill={colors.accent} fontSize="11" fontStyle="italic">θ</text>
              {/* mg vector (straight down) */}
              <line x1={198} y1={128} x2={198} y2={190} stroke={colors.gravity} strokeWidth={3} />
              <polygon points="198,195 193,185 203,185" fill={colors.gravity} />
              <text x={206} y={165} fill={colors.gravity} fontSize="12" fontWeight="700">mg</text>
              {/* mg sin θ (along ramp, downhill) */}
              <line x1={198} y1={110} x2={240} y2={122} stroke={colors.parallel} strokeWidth={3} />
              <polygon points="245,124 236,118 238,128" fill={colors.parallel} />
              <text x={218} y={106} fill={colors.parallel} fontSize="11" fontWeight="700">mg sin θ</text>
              {/* mg cos θ (perpendicular to ramp, into surface) */}
              <line x1={198} y1={110} x2={188} y2={144} stroke={colors.normal} strokeWidth={3} />
              <polygon points="187,149 182,139 192,141" fill={colors.normal} />
              <text x={160} y={140} fill={colors.normal} fontSize="11" fontWeight="700">mg cos θ</text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Key Formula: F = mg sin(theta)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The force needed to push an object up a ramp is only the <span style={{ color: colors.parallel }}>parallel component</span> of gravity, not the full weight!
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.accent, fontWeight: 600 }}>30 degrees</span>: sin(30) = 0.5, so you only need <span style={{ color: colors.success }}>half the force</span>.
              </p>
              <p>
                The <span style={{ color: colors.accent, fontWeight: 600 }}>Mechanical Advantage</span> = 1 / sin(theta). Lower angles = higher MA = less force needed!
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
              Your Prediction: {prediction === 'b' ? 'Correct!' : 'Learning Moment!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              {prediction === 'b'
                ? 'You correctly identified that ramps reduce the force needed by spreading work over distance.'
                : 'Ramps actually reduce force! A 30-degree ramp requires only half the force (490 N) compared to lifting straight up (980 N).'}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            What About Friction?
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'No effect - friction only matters when stationary' },
      { id: 'b', text: 'Need MORE force - friction opposes your pushing direction', correct: true },
      { id: 'c', text: 'Need LESS force - friction helps grip the ramp' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
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
              New Variable: Friction!
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Real ramps have friction. When pushing a box UP a rough ramp, how does friction affect the force you need?
          </h2>

          {/* SVG showing friction concept */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <svg width={isMobile ? 300 : 400} height={isMobile ? 140 : 160} style={{ display: 'block', margin: '0 auto' }}>
              <rect width="100%" height="100%" fill={colors.bgCard} rx="8" />
              {/* Rough ramp surface */}
              <polygon points="40,30 340,130 340,145 40,45" fill="#64748B" stroke="#475569" strokeWidth="1" />
              {/* Rough texture dots */}
              {[60,90,120,150,180,210,240,270,300].map((cx, i) => (
                <circle key={i} cx={cx} cy={30 + (cx-40)*0.333 + 8} r="2" fill="#78716c" opacity="0.6" />
              ))}
              {/* Box */}
              <rect x="140" y="52" width="35" height="35" fill="#DC2626" rx="3" transform="rotate(18, 157, 70)" />
              {/* Friction arrow (opposing motion) */}
              <line x1="170" y1="78" x2="130" y2="90" stroke={colors.friction} strokeWidth="3" />
              <polygon points="127,91 137,88 133,95" fill={colors.friction} />
              <text x="110" y="105" fill={colors.friction} fontSize="10" fontWeight="600">Friction</text>
              {/* Push arrow */}
              <line x1="155" y1="72" x2="195" y2="60" stroke={colors.success} strokeWidth="3" />
              <polygon points="198,59 189,56 191,66" fill={colors.success} />
              <text x="200" y="55" fill={colors.success} fontSize="10" fontWeight="600">Push</text>
              {/* Label */}
              <text x={isMobile ? 150 : 200} y="20" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Rough Surface (mu = 0.3)</text>
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
              onClick={() => { playSound('success'); setHasFriction(true); resetExperiment(); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Add Friction to the Ramp
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Friction on Inclined Planes
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare smooth vs rough surfaces and see how friction affects motion
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ marginBottom: '24px' }}>
              <InclinedPlaneVisualization />
            </div>

            {/* Acceleration vs Angle Graph */}
            <div style={{ marginBottom: '24px' }}>
              <AccelerationGraph />
            </div>

            {/* Surface toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => { setHasFriction(false); resetExperiment(); }}
                disabled={isRolling}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: !hasFriction ? colors.success : colors.bgSecondary,
                  color: !hasFriction ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: isRolling ? 'not-allowed' : 'pointer',
                }}
              >
                Smooth Surface
              </button>
              <button
                onClick={() => { setHasFriction(true); resetExperiment(); }}
                disabled={isRolling}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasFriction ? colors.friction : colors.bgSecondary,
                  color: hasFriction ? 'white' : colors.textSecondary,
                  fontWeight: 600,
                  cursor: isRolling ? 'not-allowed' : 'pointer',
                }}
              >
                Rough Surface (mu = 0.3)
              </button>
            </div>

            {/* Angle slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Ramp Angle</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{angle}</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={angle}
                onChange={(e) => { setAngle(parseInt(e.target.value)); resetExperiment(); }}
                disabled={isRolling}
                style={{ width: '100%', cursor: isRolling ? 'not-allowed' : 'pointer' }}
              />
            </div>

            {/* Force display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.parallel }}>{gravityParallel.toFixed(1)} N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Gravity Parallel</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: hasFriction ? colors.friction : colors.textMuted }}>
                  {hasFriction ? frictionForce.toFixed(1) : '0.0'} N
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Friction Force</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.success }}>{netAcceleration.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Net Accel (m/s^2)</div>
              </div>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {!isRolling && ballPosition === 0 && (
                <button
                  onClick={() => { playSound('click'); startRolling(); }}
                  style={{
                    ...primaryButtonStyle,
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  }}
                >
                  Roll Ball
                </button>
              )}
              {(isRolling || ballPosition > 0) && (
                <button
                  onClick={() => { playSound('click'); resetExperiment(); }}
                  style={{
                    ...primaryButtonStyle,
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Observation prompt */}
          {experimentCount >= 5 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              I Understand the Pattern
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Friction on Inclined Planes
          </h2>

          {/* Friction vs Gravity SVG Diagram */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <svg width={400} height={160} style={{ background: colors.bgCard, borderRadius: '12px', display: 'block', margin: '0 auto' }}>
              {/* Title */}
              <text x={200} y={18} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Friction vs. Gravity on a Ramp</text>
              {/* Ground */}
              <rect x={0} y={130} width={400} height={30} fill="#1F2937" />
              <line x1={0} y1={130} x2={400} y2={130} stroke="#374151" strokeWidth={2} />
              {/* Rough ramp */}
              <polygon points="40,40 350,130 350,142 40,52" fill="#64748B" stroke="#475569" strokeWidth={1} />
              {/* Friction dots */}
              {[60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((cx, i) => (
                <circle key={i} cx={cx} cy={40 + (cx - 40) * 0.29 + 6} r="1.5" fill="#78716c" opacity="0.6" />
              ))}
              {/* Box on ramp */}
              <rect x={155} y={62} width={30} height={30} fill="#DC2626" rx={3} transform="rotate(16, 170, 77)" />
              {/* Friction arrow (opposing motion, pointing uphill) */}
              <line x1={155} y1={78} x2={115} y2={90} stroke={colors.friction} strokeWidth={3} />
              <polygon points="112,91 122,87 119,97" fill={colors.friction} />
              <text x={80} y={105} fill={colors.friction} fontSize="10" fontWeight="700">f = μN</text>
              {/* mg sin θ arrow (pointing downhill) */}
              <line x1={185} y1={78} x2={225} y2={90} stroke={colors.parallel} strokeWidth={3} />
              <polygon points="228,91 219,87 221,97" fill={colors.parallel} />
              <text x={215} y={108} fill={colors.parallel} fontSize="10" fontWeight="700">mg sin θ</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: `${colors.accent}08`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${colors.accent}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Friction = mu x N = mu x mg cos(theta)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Friction depends on the <span style={{ color: colors.normal }}>normal force</span>, which decreases as the angle increases (because more weight acts parallel to the ramp).
              </p>
            </div>

            <div style={{
              background: `${colors.warning}08`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${colors.warning}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Friction Always Opposes Motion</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When pushing UP: Friction acts DOWN (adds to required force)<br/>
                When sliding DOWN: Friction acts UP (reduces acceleration)
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
              borderLeft: `4px solid ${colors.success}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Static Equilibrium</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When tan(theta) = mu, friction exactly balances the parallel gravity component. The object neither slides nor needs pushing - it stays put!
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0', flex: 1, overflowY: 'auto' }}>
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
                How This Connects to Your Experiment:
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
          </div>

          {/* Next Application / Continue to Test button */}
          <div style={{ marginBottom: '12px' }}>
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const nextIdx = selectedApp + 1;
                  setSelectedApp(nextIdx);
                  const newCompleted = [...completedApps];
                  newCompleted[nextIdx] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Next Application →
              </button>
            ) : (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Continue to Test →
              </button>
            )}
          </div>

          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>
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
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Test Complete!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: '4px 0' }}>
              You Scored
            </p>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '8px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand inclined plane physics!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer Review — Scrollable container */}
            <div style={{ maxWidth: '600px', margin: '0 auto 24px', textAlign: 'left' }}>
              <p style={{ ...typo.small, color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                Question-by-Question Review
              </p>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px',
              }}>
                {testQuestions.map((q, i) => {
                  const correctOpt = q.options.find(o => o.correct);
                  const isCorrect = testAnswers[i] === correctOpt?.id;
                  const userOpt = q.options.find(o => o.id === testAnswers[i]);
                  return (
                    <div key={i} style={{
                      background: colors.bgCard,
                      borderRadius: '10px',
                      border: `2px solid ${isCorrect ? colors.success : colors.error}30`,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '10px 14px',
                        background: isCorrect ? `${colors.success}15` : `${colors.error}15`,
                        display: 'flex', alignItems: 'center', gap: '10px',
                      }}>
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: 700,
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white',
                        }}>
                          {isCorrect ? '\u2713' : '\u2717'}
                        </div>
                        <div>
                          <p style={{ ...typo.small, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                            Question {i + 1}
                          </p>
                          <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>
                            {q.question.substring(0, 80)}...
                          </p>
                        </div>
                      </div>
                      {!isCorrect && (
                        <div style={{ padding: '10px 14px' }}>
                          <p style={{ fontSize: '11px', color: colors.error, margin: '0 0 4px', fontWeight: 600 }}>
                            Your answer: {userOpt?.label || 'Not answered'}
                          </p>
                          <p style={{ fontSize: '11px', color: colors.success, margin: '0 0 6px', fontWeight: 600 }}>
                            Correct: {correctOpt?.label}
                          </p>
                          <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0, lineHeight: 1.4 }}>
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons — always visible, outside scroll area */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingBottom: '24px' }}>
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
              <a
                href="/"
                style={{
                  padding: isMobile ? '14px 28px' : '16px 32px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
              >
                Back to Dashboard
              </a>
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

        {renderNavDots()}
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
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Inclined Plane Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how inclined planes provide mechanical advantage and how friction affects motion on slopes.
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
              'Force = mg sin(theta) for frictionless ramps',
              'Mechanical Advantage = 1 / sin(theta)',
              'Friction adds mu mg cos(theta) to required force',
              'Normal force = mg cos(theta)',
              'Real-world applications from ramps to screws',
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

export default InclinedPlaneRenderer;
