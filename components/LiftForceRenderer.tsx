'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Lift Force - Complete 10-Phase Game
// Understanding how wings generate lift through pressure differences
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

interface LiftForceRendererProps {
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A commercial aircraft is cruising at 35,000 feet. The pilot notices the indicated airspeed is 250 knots, but the true airspeed is 450 knots due to the thin air at altitude.",
    question: "Why must the aircraft fly faster (true airspeed) at high altitude to maintain the same lift?",
    options: [
      { id: 'A', label: "The wings become less efficient at altitude" },
      { id: 'B', label: "Lower air density requires higher velocity to generate the same lift", correct: true },
      { id: 'C', label: "Gravity is stronger at high altitude" },
      { id: 'D', label: "The engines produce more thrust at altitude" }
    ],
    explanation: "The lift equation L = 0.5 * rho * V^2 * S * Cl shows that lift depends on air density (rho). At high altitude, rho is much lower, so V must increase to maintain the same lift force."
  },
  {
    scenario: "An aerodynamics engineer is testing two wing designs in a wind tunnel. Wing A has twice the surface area of Wing B, but both have the same airfoil shape. Both are tested at identical airspeeds.",
    question: "How will the lift force of Wing A compare to Wing B?",
    options: [
      { id: 'A', label: "Wing A produces twice the lift of Wing B", correct: true },
      { id: 'B', label: "Both wings produce the same lift" },
      { id: 'C', label: "Wing A produces four times the lift" },
      { id: 'D', label: "Wing B produces more lift due to lower drag" }
    ],
    explanation: "Lift is directly proportional to wing area (S) in the equation L = 0.5 * rho * V^2 * S * Cl. Doubling the area doubles the lift, assuming all other factors remain constant."
  },
  {
    scenario: "A pilot is approaching a runway for landing. The aircraft's stall speed at cruise configuration is 120 knots, but with full flaps deployed, the stall speed drops to 85 knots.",
    question: "How do flaps reduce the stall speed?",
    options: [
      { id: 'A', label: "Flaps make the aircraft lighter" },
      { id: 'B', label: "Flaps increase the lift coefficient, allowing slower flight", correct: true },
      { id: 'C', label: "Flaps reduce gravity's effect on the aircraft" },
      { id: 'D', label: "Flaps increase engine efficiency" }
    ],
    explanation: "Flaps increase both the camber and effective area of the wing, dramatically increasing the lift coefficient (Cl). With higher Cl, the aircraft can fly slower while still generating enough lift to stay airborne."
  },
  {
    scenario: "A flight instructor demonstrates a stall to a student. As the aircraft slows and the nose rises, suddenly the aircraft shudders and the nose drops sharply.",
    question: "What happens aerodynamically during a stall?",
    options: [
      { id: 'A', label: "The engine loses power" },
      { id: 'B', label: "Airflow separates from the upper wing surface, causing sudden lift loss", correct: true },
      { id: 'C', label: "The wing physically breaks" },
      { id: 'D', label: "Air becomes too thin to support the aircraft" }
    ],
    explanation: "At high angles of attack, the smooth airflow over the wing cannot follow the curved upper surface. The flow separates, creating turbulence and destroying the pressure differential that creates lift."
  },
  {
    scenario: "A Formula 1 car's rear wing is essentially an upside-down aircraft wing. At 200 mph, it generates 1,000 lbs of downforce.",
    question: "If the car increases speed to 280 mph (1.4x faster), approximately how much downforce will the wing generate?",
    options: [
      { id: 'A', label: "About 1,400 lbs (1.4x more)" },
      { id: 'B', label: "About 2,000 lbs (2x more)", correct: true },
      { id: 'C', label: "About 1,000 lbs (same)" },
      { id: 'D', label: "About 2,800 lbs (2.8x more)" }
    ],
    explanation: "Lift (and downforce) scales with velocity squared. 1.4^2 = 1.96, approximately 2x. So the downforce nearly doubles from 1,000 to about 2,000 lbs."
  },
  {
    scenario: "A glider pilot notices that on a hot summer day, takeoff requires a longer runway and climb performance is reduced compared to cooler days.",
    question: "Why does hot weather degrade aircraft performance?",
    options: [
      { id: 'A', label: "Hot air is less dense, reducing lift at the same airspeed", correct: true },
      { id: 'B', label: "The sun's radiation pushes the aircraft down" },
      { id: 'C', label: "Pilots get tired in hot weather" },
      { id: 'D', label: "The wings expand in heat and become less efficient" }
    ],
    explanation: "Hot air is less dense than cold air. Since lift depends on air density (rho), the same airspeed produces less lift on hot days. This is why 'density altitude' is crucial for pilots."
  },
  {
    scenario: "An aerospace engineer is comparing a symmetric airfoil (same shape top and bottom) with a cambered airfoil (more curved on top) for a new aircraft design.",
    question: "What is the key advantage of a cambered airfoil?",
    options: [
      { id: 'A', label: "It produces lift even at zero angle of attack", correct: true },
      { id: 'B', label: "It is stronger structurally" },
      { id: 'C', label: "It weighs less" },
      { id: 'D', label: "It produces less drag at all speeds" }
    ],
    explanation: "A cambered airfoil's asymmetric shape accelerates air more over the top surface even when pointed directly into the wind, creating a pressure difference and positive lift at zero angle of attack."
  },
  {
    scenario: "A seaplane is taking off from a lake at 6,000 feet elevation in the mountains compared to a sea-level lake.",
    question: "What adjustment must the pilot make for the mountain takeoff?",
    options: [
      { id: 'A', label: "Use a shorter takeoff run" },
      { id: 'B', label: "Accelerate to a higher takeoff speed or use more flaps", correct: true },
      { id: 'C', label: "Take off at a lower speed" },
      { id: 'D', label: "No adjustment needed" }
    ],
    explanation: "At 6,000 feet, air density is about 20% lower than sea level. The pilot must either increase speed (V) to compensate or deploy flaps to increase Cl, or accept a longer takeoff run."
  },
  {
    scenario: "During landing, pilots are taught to 'flare' - raising the nose just before touchdown. An aircraft approaching at 130 knots flares to an angle of attack just below stall.",
    question: "Why is the flare maneuver essential for a smooth landing?",
    options: [
      { id: 'A', label: "It makes the engines work harder" },
      { id: 'B', label: "It increases Cl to slow descent while bleeding off airspeed", correct: true },
      { id: 'C', label: "It reduces the aircraft's weight" },
      { id: 'D', label: "It signals the tower that landing is imminent" }
    ],
    explanation: "By increasing angle of attack during flare, the pilot temporarily increases Cl, generating more lift. This cushions the descent while the aircraft naturally slows, allowing a gentle touchdown."
  },
  {
    scenario: "An ekranoplan (ground-effect vehicle) can carry enormous loads by flying just a few meters above the water surface, using wings that would be too small for conventional flight.",
    question: "Why does flying close to a surface (ground effect) increase lift?",
    options: [
      { id: 'A', label: "The ground reflects lift force upward" },
      { id: 'B', label: "Wingtip vortices are reduced, decreasing induced drag and increasing effective lift", correct: true },
      { id: 'C', label: "The engines become more efficient near the ground" },
      { id: 'D', label: "Air molecules bounce between the wing and ground" }
    ],
    explanation: "Near the ground, wingtip vortices cannot fully develop because they're interrupted by the surface. This reduces induced drag and increases the effective lift-to-drag ratio, making flight more efficient."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '747',
    title: 'Commercial Aviation',
    short: 'Moving billions of passengers',
    tagline: 'The physics of flight made routine',
    description: 'Commercial aircraft wings generate lift through precise airfoil design. Wing shape, angle of attack, and airspeed combine to create the pressure differential that lifts 500+ ton aircraft. Modern wings include variable geometry for optimal lift at all flight phases.',
    connection: 'The lift equation L = 0.5*rho*V^2*S*Cl directly determines aircraft performance. Designers balance wing area, airfoil shape, and cruise speed to optimize fuel efficiency while ensuring adequate lift for takeoff and landing.',
    howItWorks: 'Wings curve more on top than bottom, accelerating air over the upper surface. Faster air has lower pressure (Bernoulli), creating net upward force. High-lift devices (flaps, slats) increase lift coefficient for slow-speed flight.',
    stats: [
      { value: '500+ tons', label: 'Max takeoff weight', icon: '1f6eb' },
      { value: '900 km/h', label: 'Cruise speed', icon: '26a1' },
      { value: '$838B', label: 'Aviation market', icon: '1f4b0' }
    ],
    examples: ['Boeing 787 Dreamliner', 'Airbus A350', 'Embraer E2 jets', 'Bombardier Global'],
    companies: ['Boeing', 'Airbus', 'Embraer', 'Bombardier'],
    futureImpact: 'Blended wing body designs and active flow control will dramatically improve lift-to-drag ratios, reducing fuel consumption by 20-30%.',
    color: '#3B82F6'
  },
  {
    icon: 'F1',
    title: 'Race Car Aerodynamics',
    short: 'Negative lift for grip',
    tagline: 'Pushing down at 300 km/h',
    description: 'Formula 1 cars use inverted airfoils to generate downforce - negative lift that pushes cars onto the track. At high speeds, downforce can exceed the car\'s weight, enabling cornering forces impossible with tire grip alone.',
    connection: 'The same lift equation applies, but with inverted wings creating downward force. L = 0.5*rho*V^2*S*Cl becomes a pushing force, dramatically increasing tire normal force and therefore maximum friction.',
    howItWorks: 'Front and rear wings act as upside-down aircraft wings. The floor uses ground effect - airflow acceleration under the car creates low pressure. Active elements adjust downforce for straight-line speed vs. cornering grip.',
    stats: [
      { value: '5g', label: 'Cornering force', icon: '1f3ce' },
      { value: '3x weight', label: 'Max downforce', icon: '2b07' },
      { value: '$1.8B', label: 'F1 team budgets', icon: '1f4b5' }
    ],
    examples: ['F1 front and rear wings', 'Le Mans prototype floors', 'NASCAR spoilers', 'Indy car underwings'],
    companies: ['Red Bull Racing', 'Ferrari', 'Mercedes-AMG', 'McLaren'],
    futureImpact: 'Active aerodynamics with real-time adjustment will optimize downforce distribution for every corner, maximizing both speed and safety.',
    color: '#EF4444'
  },
  {
    icon: 'HELI',
    title: 'Helicopter Rotors',
    short: 'Spinning wings for vertical flight',
    tagline: 'Lift in every direction',
    description: 'Helicopter rotor blades are rotating wings that generate lift. By tilting the rotor disc and changing blade pitch, pilots control both the magnitude and direction of lift force, enabling hover, forward flight, and precise maneuvering.',
    connection: 'Each rotor blade section generates lift according to the lift equation. Collective pitch changes overall lift for altitude control; cyclic pitch varies lift around the rotation to tilt the thrust vector.',
    howItWorks: 'Rotor blades have airfoil cross-sections like wings. Collective control changes pitch of all blades equally for altitude. Cyclic control varies pitch through rotation, tilting the rotor disc to direct thrust. Anti-torque tail rotors prevent fuselage spin.',
    stats: [
      { value: '15,000 kg', label: 'Max lift', icon: '1f681' },
      { value: '300 rpm', label: 'Rotor speed', icon: '1f504' },
      { value: '$10B', label: 'Helicopter market', icon: '1f4b0' }
    ],
    examples: ['Medical evacuation', 'Search and rescue', 'Offshore transport', 'Military operations'],
    companies: ['Airbus Helicopters', 'Bell', 'Sikorsky', 'Leonardo'],
    futureImpact: 'Electric vertical takeoff aircraft (eVTOL) will use distributed rotors and fly-by-wire controls for urban air mobility.',
    color: '#10B981'
  },
  {
    icon: 'SAIL',
    title: 'Sailing Yacht Keels',
    short: 'Lift underwater',
    tagline: 'Using water like air',
    description: 'Yacht keels and centerboards are underwater wings that generate lift perpendicular to water flow. This sideways lift counteracts the sideways force of wind on sails, allowing boats to sail at angles to the wind - even partially upwind.',
    connection: 'The lift equation applies to water just as it does to air. Keels generate lift to counteract the lateral component of sail force, with water\'s higher density providing more force at lower speeds.',
    howItWorks: 'Keel foils have symmetric or asymmetric airfoil sections. When the boat moves forward with a side slip angle, the keel generates lift perpendicular to flow. This balances the sideways sail force, allowing upwind sailing.',
    stats: [
      { value: '4000 kg', label: 'Keel lift', icon: '26f5' },
      { value: '45 deg', label: 'Upwind angle', icon: '1f9ed' },
      { value: '$8.5B', label: 'Sailing market', icon: '1f4b0' }
    ],
    examples: ['America\'s Cup foiling yachts', 'Olympic sailing dinghies', 'Cruising sailboats', 'Racing multihulls'],
    companies: ['North Sails', 'Nautor\'s Swan', 'Beneteau', 'Bavaria'],
    futureImpact: 'Hydrofoiling sailboats lift entirely out of the water, using underwater wings to fly on foils at speeds exceeding wind speed.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const LiftForceRenderer: React.FC<LiftForceRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Lift simulation state
  const [airspeed, setAirspeed] = useState(150); // km/h
  const [angleOfAttack, setAngleOfAttack] = useState(5); // degrees
  const [wingArea, setWingArea] = useState(20); // m^2
  const [airDensity, setAirDensity] = useState(1.225); // kg/m^3 (sea level)
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - high-lift devices
  const [airfoilShape, setAirfoilShape] = useState<'flat' | 'symmetric' | 'cambered'>('cambered');
  const [flapsDeployed, setFlapsDeployed] = useState(false);
  const [slatsDeployed, setSlatsDeployed] = useState(false);
  const [groundEffect, setGroundEffect] = useState(false);

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

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate lift coefficient
  const calculateCl = useCallback((aoa: number, shape: string, flaps: boolean, slats: boolean) => {
    let cl = 0;
    const stallAngle = slats ? 18 : 15;

    if (aoa < stallAngle) {
      const clSlope = shape === 'flat' ? 0.08 : shape === 'symmetric' ? 0.1 : 0.11;
      const clZero = shape === 'cambered' ? 0.3 : 0;
      cl = clSlope * aoa + clZero;
    } else {
      cl = 1.5 - (aoa - stallAngle) * 0.1;
    }

    if (flaps) cl += 0.5;
    return Math.max(0, Math.min(cl, 2.5));
  }, []);

  // Calculate lift force: L = 0.5 * rho * v^2 * S * Cl
  const calculateLift = useCallback(() => {
    const v = airspeed / 3.6; // Convert km/h to m/s
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    let lift = 0.5 * airDensity * v * v * wingArea * cl;
    if (groundEffect) lift *= 1.2;
    return lift;
  }, [airspeed, angleOfAttack, wingArea, airDensity, airfoilShape, flapsDeployed, slatsDeployed, groundEffect, calculateCl]);

  // Calculate drag
  const calculateDrag = useCallback(() => {
    const v = airspeed / 3.6;
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const cd = 0.02 + 0.04 * cl * cl + 0.001 * Math.abs(angleOfAttack);
    return 0.5 * airDensity * v * v * wingArea * cd;
  }, [airspeed, angleOfAttack, wingArea, airDensity, airfoilShape, flapsDeployed, slatsDeployed, calculateCl]);

  // Check for stall
  const isStalling = useCallback(() => {
    const stallAngle = slatsDeployed ? 18 : 15;
    return angleOfAttack >= stallAngle;
  }, [angleOfAttack, slatsDeployed]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for aerodynamics
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    lift: '#22C55E',
    drag: '#EF4444',
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
    twist_play: 'High-Lift Devices',
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
        gameType: 'lift-force',
        gameTitle: 'Lift Force',
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

  // Airfoil SVG Visualization
  const AirfoilVisualization = ({ showLabels = true }: { showLabels?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const chordLength = isMobile ? 120 : 160;

    const lift = calculateLift();
    const drag = calculateDrag();
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const stalling = isStalling();
    const speedFactor = airspeed / 150;

    // Scale forces for visualization
    const liftScale = Math.min(lift / 50000, 1) * 70;
    const dragScale = Math.min(drag / 10000, 1) * 40;

    // Generate airfoil path
    const getAirfoilPath = () => {
      const startX = centerX - chordLength / 2;
      const endX = centerX + chordLength / 2;

      if (airfoilShape === 'flat') {
        return `M ${startX} ${centerY} L ${endX} ${centerY - 4} L ${endX} ${centerY + 4} Z`;
      } else if (airfoilShape === 'symmetric') {
        return `M ${startX} ${centerY}
                Q ${centerX - 20} ${centerY - 15} ${centerX + 20} ${centerY - 12}
                Q ${endX - 20} ${centerY - 4} ${endX} ${centerY}
                Q ${endX - 20} ${centerY + 4} ${centerX + 20} ${centerY + 12}
                Q ${centerX - 20} ${centerY + 15} ${startX} ${centerY} Z`;
      } else {
        return `M ${startX} ${centerY}
                Q ${centerX - 30} ${centerY - 22} ${centerX + 10} ${centerY - 18}
                Q ${endX - 30} ${centerY - 6} ${endX} ${centerY + 2}
                Q ${endX - 20} ${centerY + 8} ${centerX + 10} ${centerY + 12}
                Q ${centerX - 30} ${centerY + 14} ${startX} ${centerY} Z`;
      }
    };

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="airfoilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="liftGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <linearGradient id="dragGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>
          <linearGradient id="lowPressure" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="highPressure" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowLift" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="url(#liftGrad)" />
          </marker>
          <marker id="arrowDrag" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto">
            <path d="M9,0 L9,6 L0,3 z" fill="url(#dragGrad)" />
          </marker>
        </defs>

        {/* Title */}
        <text x={width/2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Airfoil Aerodynamics
        </text>

        {/* Ground effect */}
        {groundEffect && (
          <g>
            <rect x="0" y={height - 35} width={width} height="35" fill="#1f2937" />
            <line x1="0" y1={height - 35} x2={width} y2={height - 35} stroke="#4b5563" strokeWidth="2" />
            <text x={width/2} y={height - 12} textAnchor="middle" fill="#06b6d4" fontSize="10">Ground Effect Active</text>
          </g>
        )}

        {/* Streamlines */}
        <g transform={`rotate(${-angleOfAttack}, ${centerX}, ${centerY})`}>
          {Array.from({ length: 8 }).map((_, i) => {
            const yOffset = (i - 4) * 25;
            const isUpper = yOffset < 0;
            const flowOffset = (animationFrame * speedFactor * 3) % 80;
            const turbulence = stalling && isUpper ? Math.sin(animationFrame * 0.3 + i) * 12 : 0;

            return (
              <path
                key={`stream-${i}`}
                d={`M ${centerX - 180 + flowOffset} ${centerY + yOffset}
                    Q ${centerX - 40} ${centerY + yOffset + (isUpper ? -8 : 4) + turbulence}
                      ${centerX + 60} ${centerY + yOffset + (isUpper ? -10 : 6) + turbulence}
                    L ${centerX + 180 + flowOffset} ${centerY + yOffset + (isUpper ? -5 : 3)}`}
                fill="none"
                stroke={stalling && isUpper ? '#ef4444' : isUpper ? '#3b82f6' : '#06b6d4'}
                strokeWidth="2"
                strokeOpacity={0.6}
                strokeDasharray={stalling && isUpper ? "6,4" : "none"}
              />
            );
          })}
        </g>

        {/* Pressure zones */}
        <g transform={`rotate(${-angleOfAttack}, ${centerX}, ${centerY})`}>
          <ellipse cx={centerX} cy={centerY - 30} rx={chordLength * 0.4} ry={20 + cl * 8} fill="url(#lowPressure)" />
          <ellipse cx={centerX} cy={centerY + 20} rx={chordLength * 0.35} ry={15 + cl * 4} fill="url(#highPressure)" />
        </g>

        {/* Airfoil */}
        <g transform={`rotate(${-angleOfAttack}, ${centerX}, ${centerY})`}>
          <path d={getAirfoilPath()} fill="url(#airfoilGrad)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Flaps indicator */}
          {flapsDeployed && (
            <g transform={`translate(${centerX + chordLength * 0.3}, ${centerY})`}>
              <rect x="0" y="-3" width="28" height="8" fill="#4b5563" stroke="#6b7280" rx="2" transform="rotate(25)" />
            </g>
          )}

          {/* Slats indicator */}
          {slatsDeployed && (
            <g transform={`translate(${centerX - chordLength * 0.45}, ${centerY - 4})`}>
              <rect x="-16" y="-5" width="18" height="6" fill="#4b5563" stroke="#6b7280" rx="2" transform="rotate(-10)" />
            </g>
          )}
        </g>

        {/* Force vectors */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {liftScale > 5 && (
            <line x1="0" y1="0" x2="0" y2={-liftScale} stroke="url(#liftGrad)" strokeWidth="5" strokeLinecap="round" markerEnd="url(#arrowLift)" filter="url(#glow)" />
          )}
          {dragScale > 3 && (
            <line x1="0" y1="0" x2={-dragScale} y2="0" stroke="url(#dragGrad)" strokeWidth="4" strokeLinecap="round" markerEnd="url(#arrowDrag)" />
          )}
          <circle cx="0" cy="0" r="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
        </g>

        {/* Stall warning */}
        {stalling && (
          <g>
            <rect x={width/2 - 60} y="40" width="120" height="26" rx="6" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
            <text x={width/2} y="58" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">STALL WARNING</text>
          </g>
        )}

        {/* Stats display */}
        {showLabels && (
          <g transform={`translate(${width - 110}, 45)`}>
            <rect x="0" y="0" width="100" height="85" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
            <text x="50" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="9">Lift Coefficient</text>
            <text x="50" y="35" textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700">{cl.toFixed(2)}</text>
            <text x="50" y="52" textAnchor="middle" fill={colors.textMuted} fontSize="9">Lift Force</text>
            <text x="50" y="69" textAnchor="middle" fill={colors.lift} fontSize="14" fontWeight="600">{(lift/1000).toFixed(1)} kN</text>
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(15, ${height - 45})`}>
          <rect x="0" y="0" width={width - 30} height="35" rx="6" fill={colors.bgSecondary} fillOpacity="0.8" />
          <circle cx="15" cy="17" r="5" fill="#3b82f6" />
          <text x="28" y="21" fill={colors.textMuted} fontSize="9">Low pressure</text>
          <circle cx="105" cy="17" r="5" fill="#ef4444" />
          <text x="118" y="21" fill={colors.textMuted} fontSize="9">High pressure</text>
          <line x1="190" y1="17" x2="210" y2="17" stroke={colors.lift} strokeWidth="3" />
          <text x="218" y="21" fill={colors.textMuted} fontSize="9">Lift</text>
          <line x1="255" y1="17" x2="275" y2="17" stroke={colors.drag} strokeWidth="3" />
          <text x="283" y="21" fill={colors.textMuted} fontSize="9">Drag</text>
        </g>
      </svg>
    );
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'float 3s ease-in-out infinite' }}>
          <span role="img" aria-label="airplane">&#9992;</span>
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Physics of Flight
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          How does a 500-ton aircraft <span style={{ color: colors.accent }}>stay in the sky</span>? The answer lies in how <span style={{ color: colors.lift }}>airflow creates pressure differences</span> around wings.
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
            "For every action, there is an equal and opposite reaction. Wings push air down, and the air pushes back up - that's lift."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Newton's Third Law Applied to Aerodynamics
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Lift Force
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'A', text: 'Air molecules bouncing off the bottom of the wing' },
      { id: 'B', text: 'Lower pressure above the wing than below, due to faster airflow on top', correct: true },
      { id: 'C', text: 'The engine pushing the aircraft upward' },
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
            What primarily causes the upward lift force on an aircraft wing?
          </h2>

          {/* Diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <AirfoilVisualization showLabels={false} />
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
                  {opt.id}
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

  // PLAY PHASE
  if (phase === 'play') {
    const lift = calculateLift();
    const drag = calculateDrag();
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const stalling = isStalling();

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Lift Force Laboratory
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust parameters to see how they affect lift
          </p>

          {/* Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <AirfoilVisualization />
            </div>

            {/* Airspeed slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Airspeed</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{airspeed} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={airspeed}
                onChange={(e) => setAirspeed(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Angle of attack slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Angle of Attack</span>
                <span style={{ ...typo.small, color: stalling ? colors.error : colors.accent, fontWeight: 600 }}>
                  {angleOfAttack}deg {stalling && '(STALL!)'}
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="20"
                value={angleOfAttack}
                onChange={(e) => setAngleOfAttack(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Wing area slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Wing Area</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{wingArea} m2</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={wingArea}
                onChange={(e) => setWingArea(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Air density slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Air Density (Altitude)</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{airDensity.toFixed(3)} kg/m3</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={airDensity}
                onChange={(e) => setAirDensity(parseFloat(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>High Alt (0.5)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Sea Level (1.225)</span>
              </div>
            </div>

            {/* Results */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.lift }}>{(lift/1000).toFixed(1)} kN</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Lift Force</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.drag }}>{(drag/1000).toFixed(2)} kN</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Drag Force</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{cl.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Lift Coeff (Cl)</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: stalling ? colors.error : colors.success }}>
                  {stalling ? 'STALL' : 'Normal'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
              </div>
            </div>
          </div>

          {/* Lift equation display */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Lift Equation</p>
            <p style={{ ...typo.body, color: colors.textPrimary, fontFamily: 'monospace' }}>
              L = 0.5 * rho * V^2 * S * Cl
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
              L = 0.5 * {airDensity.toFixed(3)} * ({(airspeed/3.6).toFixed(1)})^2 * {wingArea} * {cl.toFixed(2)} = <span style={{ color: colors.lift, fontWeight: 600 }}>{(lift/1000).toFixed(1)} kN</span>
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
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
            Understanding Lift Force
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>The Lift Equation</h3>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center',
              fontFamily: 'monospace',
              fontSize: '18px',
              color: colors.accent,
            }}>
              L = 0.5 * rho * V^2 * S * Cl
            </div>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>L</strong> = Lift force (Newtons)</li>
                <li><strong>rho</strong> = Air density (kg/m3)</li>
                <li><strong>V</strong> = Airspeed (m/s)</li>
                <li><strong>S</strong> = Wing area (m2)</li>
                <li><strong>Cl</strong> = Lift coefficient (dimensionless)</li>
              </ul>
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
              Key Insight: Velocity Squared
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Lift increases with the <strong>square</strong> of velocity. Double your speed = <span style={{ color: colors.lift }}>4x the lift!</span> This is why takeoff speed is so critical, and why small speed changes have big effects.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ ...typo.h3, color: colors.lift, marginBottom: '8px' }}>Bernoulli's Principle</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Faster airflow over the curved top creates lower pressure than the bottom. This pressure difference pushes the wing up.
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ ...typo.h3, color: colors.error, marginBottom: '8px' }}>Stall</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                At too high an angle, airflow separates from the wing. Lift drops suddenly - dangerous if unexpected!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore High-Lift Devices
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'A', text: 'Fly dangerously close to stall angle' },
      { id: 'B', text: 'Use larger engines to push harder' },
      { id: 'C', text: 'Deploy flaps and slats to increase lift coefficient', correct: true },
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
              The Twist: Landing at Low Speed
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Aircraft must land at slow speeds, but slower = less lift. How do pilots maintain enough lift for landing?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center' }}>
              A 200-ton aircraft needs to touch down gently at just 140 knots. At cruise speed (500+ knots), it had plenty of lift. Now what?
            </p>
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
                  {opt.id}
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
              Explore High-Lift Devices
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const lift = calculateLift();
    const cl = calculateCl(angleOfAttack, airfoilShape, flapsDeployed, slatsDeployed);
    const stalling = isStalling();
    const stallAngle = slatsDeployed ? 18 : 15;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            High-Lift Devices Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Explore how flaps, slats, and airfoil shape affect low-speed performance
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <AirfoilVisualization />
            </div>

            {/* Airfoil shape selector */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Airfoil Shape</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['flat', 'symmetric', 'cambered'] as const).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => setAirfoilShape(shape)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: airfoilShape === shape ? colors.accent : colors.bgSecondary,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* High-lift device toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => setFlapsDeployed(!flapsDeployed)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: flapsDeployed ? colors.success : colors.bgSecondary,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 600 }}>Flaps</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{flapsDeployed ? 'Deployed (+0.5 Cl)' : 'Retracted'}</div>
              </button>
              <button
                onClick={() => setSlatsDeployed(!slatsDeployed)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: slatsDeployed ? colors.success : colors.bgSecondary,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 600 }}>Slats</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{slatsDeployed ? 'Deployed (+3deg stall)' : 'Retracted'}</div>
              </button>
              <button
                onClick={() => setGroundEffect(!groundEffect)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: groundEffect ? colors.warning : colors.bgSecondary,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 600 }}>Ground</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>{groundEffect ? 'Effect (+20% lift)' : 'High Alt'}</div>
              </button>
            </div>

            {/* Angle of attack */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Angle of Attack</span>
                <span style={{ ...typo.small, color: stalling ? colors.error : colors.accent, fontWeight: 600 }}>
                  {angleOfAttack}deg (Stall: {stallAngle}deg)
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="20"
                value={angleOfAttack}
                onChange={(e) => setAngleOfAttack(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.lift }}>{(lift/1000).toFixed(1)} kN</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Lift</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{cl.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cl</div>
              </div>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{stallAngle}deg</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Stall Angle</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Review Key Insights
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Controlling Lift at Any Speed
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Flap</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Trailing Edge Flaps</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Increase both <strong>camber</strong> and effective <strong>wing area</strong>. Dramatically increases Cl, allowing slower flight. Essential for landing - but adds drag.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Slat</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Leading Edge Slats</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Create a <strong>gap</strong> that re-energizes airflow over the wing. Delays flow separation, allowing <strong>higher angles of attack</strong> before stall. Critical safety margin.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>GE</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Ground Effect</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Near the ground, wingtip vortices are <strong>disrupted</strong>, reducing induced drag and effectively increasing lift. Creates the "floating" sensation during landing flare.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Real-World Impact</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Without high-lift devices, a Boeing 747 would need a takeoff speed of 350+ knots and runway lengths of 5+ miles. Flaps and slats make commercial aviation practical.
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                    OK
                  </div>
                )}
                <div style={{ fontSize: '16px', marginBottom: '4px', fontWeight: 700, color: colors.textPrimary }}>{a.icon}</div>
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
              <span style={{ fontSize: '36px', fontWeight: 700, color: app.color }}>{app.icon}</span>
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
                How Lift Force Connects:
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
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
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
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? 'Trophy!' : 'Book'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand lift force and aerodynamics!'
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
                  {opt.id}
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
          <span role="img" aria-label="trophy">&#127942;</span>
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Aerodynamics Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how wings generate lift and how pilots control it throughout flight.
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
              'L = 0.5 * rho * V^2 * S * Cl',
              'Lift scales with velocity squared',
              'Flaps increase Cl for slow-speed flight',
              'Slats delay stall to higher angles',
              'Ground effect increases lift near surfaces',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>OK</span>
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

export default LiftForceRenderer;
