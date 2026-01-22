import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// PASCAL'S LAW - GOLD STANDARD RENDERER
// ============================================================================
// Physics: F₁/A₁ = F₂/A₂ = P (Pressure is constant in confined fluid)
// Force multiplication through area ratio: F₂ = F₁ × (A₂/A₁)
// Conservation of energy: Work = Force × Distance remains constant
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'force_applied'
  | 'pressure_calculated'
  | 'output_force_calculated'
  | 'parameter_adjusted'
  | 'work_demonstrated'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

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
  stats: string[];
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

const PascalLawRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // Core game state
  const [phase, setPhase] = useState(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [expandedApp, setExpandedApp] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Pascal's Law simulation states
  const [inputForce, setInputForce] = useState(100); // Newtons
  const [smallPistonArea, setSmallPistonArea] = useState(1); // cm²
  const [largePistonArea, setLargePistonArea] = useState(10); // cm²
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showPressureWaves, setShowPressureWaves] = useState(true);

  // Navigation refs
  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Physics calculations
  const pressure = inputForce / smallPistonArea; // N/cm² (Pascal)
  const outputForce = pressure * largePistonArea; // N
  const mechanicalAdvantage = largePistonArea / smallPistonArea;
  const inputDistance = 10; // cm (reference push distance)
  const outputDistance = inputDistance * (smallPistonArea / largePistonArea);
  const workIn = inputForce * inputDistance;
  const workOut = outputForce * outputDistance;

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Explore', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Responsive handling
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 100) {
          setIsAnimating(false);
          return 0;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Phase change events
  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase, phaseName: phaseNames[phase] } });
    }
  }, [phase, onGameEvent]);

  // Web Audio API sound system
  const playSound = useCallback((type: 'correct' | 'incorrect' | 'transition' | 'complete' | 'hydraulic' | 'pressure') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (type) {
        case 'correct':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, ctx.currentTime + 0.3) ||
            gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(220, ctx.currentTime);
          oscillator.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'hydraulic':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(80, ctx.currentTime);
          oscillator.frequency.setValueAtTime(60, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        case 'pressure':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete && newPhase > 0) {
      onPhaseComplete(newPhase - 1);
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const handlePrediction = useCallback((index: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setSelectedPrediction(index);
    setShowPredictionFeedback(true);
    playSound(index === 1 ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction: index, correct: index === 1 } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((index: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTwistPrediction(index);
    setShowTwistFeedback(true);
    playSound(index === 2 ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction: index, correct: index === 2, twist: true } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const startAnimation = useCallback(() => {
    setAnimationProgress(0);
    setIsAnimating(true);
    playSound('hydraulic');
    if (onGameEvent) {
      onGameEvent({ type: 'simulation_started', data: { inputForce, smallPistonArea, largePistonArea } });
    }
  }, [playSound, onGameEvent, inputForce, smallPistonArea, largePistonArea]);

  // ============================================================================
  // TEST QUESTIONS - 10 scenario-based questions with explanations
  // ============================================================================
  const testQuestions: TestQuestion[] = [
    {
      scenario: "An automotive technician is setting up a car lift in a new garage. The lift uses a hydraulic system with a small piston (5 cm²) and a large piston (500 cm²).",
      question: "If the technician applies 200 N of force to the small piston, what force is exerted on the car?",
      options: [
        { text: "200 N - pressure doesn't multiply", correct: false },
        { text: "2,000 N - 10× multiplication", correct: false },
        { text: "20,000 N - 100× multiplication", correct: true },
        { text: "100,000 N - 500× multiplication", correct: false }
      ],
      explanation: "Force multiplication = Area ratio = 500/5 = 100×. Output force = 200 N × 100 = 20,000 N. This is Pascal's Law: F₂ = F₁ × (A₂/A₁)."
    },
    {
      scenario: "A hydraulic brake system in a car has a master cylinder with a 1 cm² piston that connects to brake calipers each with 10 cm² pistons.",
      question: "When the driver applies 50 N to the brake pedal mechanism, what happens at each wheel?",
      options: [
        { text: "Each wheel gets 5 N of braking force", correct: false },
        { text: "Each wheel gets 50 N of braking force", correct: false },
        { text: "Each wheel gets 500 N of braking force", correct: true },
        { text: "Total 500 N is split between all wheels", correct: false }
      ],
      explanation: "Pascal's Law transmits pressure equally throughout the fluid. Each brake caliper experiences the same 50 N/cm² pressure, producing 500 N at each 10 cm² piston independently."
    },
    {
      scenario: "An engineer is designing a hydraulic press for a manufacturing plant. The press needs to apply 1,000,000 N of force, but the pump can only provide 1,000 N.",
      question: "What area ratio is needed between the pistons?",
      options: [
        { text: "10:1 (output 10× larger)", correct: false },
        { text: "100:1 (output 100× larger)", correct: false },
        { text: "1000:1 (output 1000× larger)", correct: true },
        { text: "10000:1 (output 10000× larger)", correct: false }
      ],
      explanation: "Required multiplication = 1,000,000 ÷ 1,000 = 1,000×. Since F₂/F₁ = A₂/A₁, we need the output piston to be 1000× the area of the input piston."
    },
    {
      scenario: "A mechanic is using a hydraulic jack that multiplies force by 25×. They need to lift a 2500 kg car (24,500 N weight) by 30 cm.",
      question: "How far must they push the jack handle to lift the car 30 cm?",
      options: [
        { text: "1.2 cm (30 ÷ 25)", correct: false },
        { text: "30 cm (same distance)", correct: false },
        { text: "7.5 meters (30 × 25)", correct: true },
        { text: "75 cm (30 × 2.5)", correct: false }
      ],
      explanation: "Conservation of energy: Work In = Work Out. If force is multiplied 25×, distance must be divided by 25. To lift 30 cm, you push 30 × 25 = 750 cm = 7.5 meters (over many pump strokes)."
    },
    {
      scenario: "A submarine's hydraulic system uses sea water at 1000 m depth to assist hatch operations. The external pressure is approximately 100 atmospheres.",
      question: "Why is the hydraulic fluid in this system kept separate from the sea water?",
      options: [
        { text: "Sea water would freeze the hydraulic system", correct: false },
        { text: "Incompressible oil maintains precise force transmission; water has impurities", correct: true },
        { text: "Pascal's Law only works with oil, not water", correct: false },
        { text: "Sea water pressure would reverse the hydraulic flow", correct: false }
      ],
      explanation: "While Pascal's Law works with any liquid, hydraulic oil is preferred because it's incompressible, lubricates components, doesn't corrode metal, and maintains consistent properties. Sea water impurities could damage precision seals."
    },
    {
      scenario: "An excavator operator notices the hydraulic arm is moving slower than usual despite full lever input. A technician finds tiny air bubbles in the hydraulic fluid.",
      question: "Why do air bubbles cause problems in hydraulic systems?",
      options: [
        { text: "Air bubbles increase fluid density", correct: false },
        { text: "Air is compressible, absorbing energy instead of transmitting pressure instantly", correct: true },
        { text: "Air bubbles make the fluid flow faster", correct: false },
        { text: "Bubbles block the flow but don't affect force", correct: false }
      ],
      explanation: "Pascal's Law requires an incompressible fluid. Air bubbles compress when pressure is applied, absorbing energy and creating a 'spongy' response. This is why brake systems must be bled of air to work properly."
    },
    {
      scenario: "A dental chair uses hydraulics to smoothly raise and lower patients. The chair supports 100 kg (980 N) with a 50 cm² piston activated by a foot pump with a 2 cm² piston.",
      question: "What force does the dentist apply per pump stroke?",
      options: [
        { text: "980 N (same as patient weight)", correct: false },
        { text: "196 N (÷5)", correct: false },
        { text: "39.2 N (÷25)", correct: true },
        { text: "4.9 N (÷200)", correct: false }
      ],
      explanation: "Mechanical advantage = 50/2 = 25×. The dentist needs to apply 980 ÷ 25 = 39.2 N per pump. This is why foot pumps feel easy to push even when supporting heavy loads."
    },
    {
      scenario: "A firefighter uses a hydraulic rescue tool (Jaws of Life) to cut through a car door. The tool provides 10,000 kg of cutting force from a hand-held pump.",
      question: "What makes hydraulic rescue tools more practical than mechanical alternatives?",
      options: [
        { text: "Hydraulics are lighter than mechanical systems", correct: false },
        { text: "Force can be transmitted through flexible hoses and multiplied at the tool head", correct: true },
        { text: "Hydraulic fluid is stronger than steel", correct: false },
        { text: "Mechanical cutters don't work on metal", correct: false }
      ],
      explanation: "Pascal's Law allows force multiplication through flexible hoses that bend around obstacles. A rescuer with a small pump can generate enormous force at the cutting head, directed wherever needed."
    },
    {
      scenario: "An aircraft uses hydraulic systems to move control surfaces. During flight at 10,000 meters, the outside temperature is -50°C.",
      question: "Why do aircraft hydraulic systems use specialized synthetic fluids?",
      options: [
        { text: "Standard hydraulic oil would boil at high altitude", correct: false },
        { text: "Synthetic fluids maintain consistent viscosity across extreme temperature ranges", correct: true },
        { text: "Synthetic fluids are less flammable than water", correct: false },
        { text: "Regular oil would expand and overflow at altitude", correct: false }
      ],
      explanation: "Pascal's Law requires the fluid to remain liquid and incompressible. Standard oil becomes too thick at -50°C to flow properly. Aviation hydraulic fluids are formulated to work from -65°C to +135°C."
    },
    {
      scenario: "A scientist replicates Pascal's famous barrel experiment: a 10-meter tall narrow tube (1 cm²) is attached to a sealed barrel (1000 cm² base). Water is poured into the tube.",
      question: "What happens when the tube is filled with just 1 liter of water?",
      options: [
        { text: "Nothing - 1 liter is too little to affect the barrel", correct: false },
        { text: "The barrel experiences 1000× the tube's pressure and may burst", correct: true },
        { text: "Water flows back up the tube due to pressure", correct: false },
        { text: "The barrel floats due to buoyancy", correct: false }
      ],
      explanation: "Pascal demonstrated that pressure = ρgh, independent of container width. A 10m water column creates ~1 atmosphere of pressure (100,000 Pa) over the barrel's entire 1000 cm² base - about 10,000 N of force from just 1 kg of water!"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctIndex = testQuestions[index].options.findIndex(o => o.correct);
      return score + (answer === correctIndex ? 1 : 0);
    }, 0);
  };

  // ============================================================================
  // TRANSFER APPLICATIONS - 4 comprehensive real-world applications
  // ============================================================================
  const transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Automotive Hydraulic Systems",
      short: "Vehicle Hydraulics",
      tagline: "From brakes to suspension: hydraulics keep you safe on the road",
      description: "Modern vehicles rely on Pascal's Law for critical safety systems. Hydraulic brakes multiply pedal force to stop multi-ton vehicles, power steering makes maneuvering effortless, and active suspension systems provide comfort while maintaining control.",
      connection: "Pascal's Law enables small pedal forces to create massive braking forces at all wheels simultaneously, ensuring proportional and predictable stopping power in any condition.",
      howItWorks: "When you press the brake pedal, a master cylinder (small piston) pressurizes brake fluid. This pressure travels through lines to wheel cylinders/calipers (large pistons), multiplying your force 10-15× at each wheel. ABS systems modulate this pressure thousands of times per second to prevent wheel lockup.",
      stats: [
        "Brake force multiplication: 10-15× at each wheel",
        "ABS modulation speed: up to 25 times per second",
        "Power steering assistance: reduces effort by 80%",
        "Average brake line pressure: 1000-2000 PSI"
      ],
      examples: [
        "Disc brakes: Calipers squeeze rotors with 1000+ lbs of force",
        "Power steering: Makes parallel parking effortless",
        "Convertible tops: Hydraulic cylinders raise/lower the roof",
        "Clutch systems: Smooth engagement in manual transmissions"
      ],
      companies: ["Bosch", "Brembo", "Continental", "ZF Friedrichshafen"],
      futureImpact: "Electric vehicles are transitioning to brake-by-wire with hydraulic backup, while active suspension systems use rapid hydraulic adjustments to provide both sports car handling and luxury ride comfort.",
      color: "from-red-600 to-orange-600"
    },
    {
      icon: "🏗️",
      title: "Construction & Heavy Equipment",
      short: "Heavy Equipment",
      tagline: "Moving mountains with the physics of pressure",
      description: "Excavators, bulldozers, cranes, and loaders all depend on hydraulic systems to transform small control inputs into tremendous forces. A single operator can precisely control machinery capable of lifting dozens of tons.",
      connection: "Pascal's Law allows compact cylinders to generate forces measured in tons while maintaining precise control through proportional valves and feedback systems.",
      howItWorks: "Hydraulic pumps driven by diesel engines pressurize oil to 3000-5000 PSI. This pressure is directed by control valves to cylinders of various sizes. Large boom cylinders provide lifting force, while smaller stick and bucket cylinders enable precise digging movements.",
      stats: [
        "Excavator bucket force: 15,000-50,000 lbs",
        "Crane lifting capacity: up to 1,200 tons",
        "System pressure: 3,000-5,000 PSI typical",
        "Cylinder stroke speed: 0.1 to 3 feet per second"
      ],
      examples: [
        "Excavator boom: Single cylinder lifts entire arm assembly",
        "Bulldozer blade: Hydraulics angle, tilt, and raise the blade",
        "Concrete pump boom: 50m reach with precise placement",
        "Pile driver: Hydraulic hammers drive foundation piles"
      ],
      companies: ["Caterpillar", "Komatsu", "John Deere", "Liebherr"],
      futureImpact: "Hybrid hydraulic systems recover energy during lowering operations, improving fuel efficiency by 25-40%. Autonomous excavators use precise hydraulic control for consistent grading accuracy within millimeters.",
      color: "from-yellow-600 to-amber-600"
    },
    {
      icon: "✈️",
      title: "Aviation Control Systems",
      short: "Aircraft Hydraulics",
      tagline: "Turning pilot inputs into precise control at 600 mph",
      description: "Aircraft use hydraulic systems to move flight control surfaces (ailerons, elevators, rudder), deploy landing gear, activate thrust reversers, and operate cargo doors. The Boeing 747 has over 2,400 gallons of hydraulic fluid flowing through miles of tubing.",
      connection: "Pascal's Law enables lightweight actuators to move massive control surfaces against aerodynamic forces that can exceed 50,000 lbs, while providing the precise response pilots need for safe flight.",
      howItWorks: "Engine-driven pumps maintain 3,000 PSI pressure in three independent hydraulic systems for redundancy. Fly-by-wire computers translate pilot stick movements into precise actuator commands. Accumulators store pressurized fluid for emergency power.",
      stats: [
        "System pressure: 3,000-5,000 PSI",
        "B747 hydraulic fluid capacity: 2,400 gallons",
        "Actuator response time: <50 milliseconds",
        "Control surface force: up to 50,000 lbs"
      ],
      examples: [
        "Landing gear: Hydraulic retraction in under 10 seconds",
        "Thrust reversers: Redirect jet exhaust for braking",
        "Spoilers/speedbrakes: Deploy in milliseconds",
        "Cargo door operation: Safe handling of tons of freight"
      ],
      companies: ["Parker Aerospace", "Moog Inc.", "Eaton", "Collins Aerospace"],
      futureImpact: "More-electric aircraft are supplementing hydraulics with electro-hydrostatic actuators (EHAs) that combine the power of hydraulics with the efficiency of electric systems, reducing weight and maintenance while maintaining redundancy.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🏭",
      title: "Industrial Manufacturing",
      short: "Industrial Presses",
      tagline: "Millions of pounds of force shaping the modern world",
      description: "Hydraulic presses shape everything from car body panels to smartphone cases. Injection molding machines use hydraulic pressure to force molten plastic into precision molds. Metal forming operations rely on controlled hydraulic force for consistent quality.",
      connection: "Pascal's Law enables generating enormous forces (millions of pounds) from relatively compact systems, with precise control over speed, position, and force throughout the forming operation.",
      howItWorks: "High-pressure hydraulic pumps (often 10,000+ PSI) feed large cylinders. Servo valves provide precise control of pressure and flow rate. Modern systems use closed-loop feedback to maintain exact force or position profiles during forming operations.",
      stats: [
        "Forging press force: up to 200,000 tons",
        "Injection molding pressure: 10,000-30,000 PSI",
        "Stamping press cycles: 30-60 per minute",
        "Position accuracy: ±0.001 inches"
      ],
      examples: [
        "Car body stamping: Shapes entire roof panels in one stroke",
        "Forging: Creates aircraft landing gear from solid metal",
        "Injection molding: Produces billions of plastic parts daily",
        "Metal extrusion: Creates aluminum profiles for construction"
      ],
      companies: ["Bosch Rexroth", "Danfoss", "Enerpac", "Schuler Group"],
      futureImpact: "Industry 4.0 integration enables predictive maintenance through hydraulic system monitoring. Hybrid electric-hydraulic systems reduce energy consumption by 50% while maintaining the force capabilities only hydraulics can provide.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  // ============================================================================
  // SVG VISUALIZATIONS
  // ============================================================================
  const renderHydraulicSystem = (size: number = 400, showLabels: boolean = true) => {
    const scale = size / 400;
    const pistonProgress = animationProgress / 100;
    const smallPistonY = 120 - pistonProgress * 30;
    const largePistonY = 120 - pistonProgress * (30 * smallPistonArea / largePistonArea);
    const ratio = Math.min(largePistonArea / smallPistonArea, 50);
    const largeWidth = Math.min(40 + ratio * 1.5, 100);

    return (
      <svg
        width={size}
        height={size * 0.7}
        viewBox="0 0 400 280"
        className="overflow-visible mx-auto"
      >
        <defs>
          <linearGradient id="fluidGradPascal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="metalGradPascal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <filter id="glowPascal" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowDownPascal" markerWidth="10" markerHeight="10" refX="5" refY="10" orient="auto">
            <path d="M0,0 L5,10 L10,0 L5,3 Z" fill="#22c55e" />
          </marker>
          <marker id="arrowUpPascal" markerWidth="10" markerHeight="10" refX="5" refY="0" orient="auto">
            <path d="M0,10 L5,0 L10,10 L5,7 Z" fill="#ef4444" />
          </marker>
          <marker id="arrowRightPascal" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 L3,5 Z" fill="#fcd34d" />
          </marker>
        </defs>

        {/* Container/reservoir with fluid */}
        <rect x="50" y="160" width="300" height="80" fill="url(#fluidGradPascal)" rx="5" opacity="0.9" />

        {/* Pressure wave visualization */}
        {showPressureWaves && isAnimating && (
          <g opacity={0.6}>
            <circle cx="90" cy="190" r={15 + animationProgress * 0.5} fill="none" stroke="#fcd34d" strokeWidth="2" opacity={Math.max(0, 1 - animationProgress / 80)}>
              <animate attributeName="r" from="15" to="100" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="90" cy="190" r={35 + animationProgress * 0.5} fill="none" stroke="#fcd34d" strokeWidth="1" opacity={Math.max(0, 0.4 - animationProgress / 100)}>
              <animate attributeName="r" from="35" to="120" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.4" to="0" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Container border */}
        <rect x="45" y="155" width="310" height="90" fill="none" stroke="#475569" strokeWidth="5" rx="8" />

        {/* Small piston cylinder */}
        <rect x="65" y="90" width="50" height="75" fill="#1e293b" stroke="#475569" strokeWidth="3" rx="2" />

        {/* Small piston */}
        <rect
          x="68"
          y={smallPistonY}
          width="44"
          height="55"
          fill="url(#metalGradPascal)"
          stroke="#475569"
          strokeWidth="2"
          rx="3"
        />

        {/* Input force arrow */}
        {showLabels && (
          <>
            <line
              x1="90"
              y1={smallPistonY - 35}
              x2="90"
              y2={smallPistonY - 8}
              stroke="#22c55e"
              strokeWidth="4"
              markerEnd="url(#arrowDownPascal)"
            />
            <text
              x="90"
              y={smallPistonY - 45}
              textAnchor="middle"
              fill="#22c55e"
              fontSize="13"
              fontWeight="bold"
            >
              F₁ = {inputForce} N
            </text>
          </>
        )}

        {/* Large piston cylinder */}
        <rect
          x={350 - largeWidth - 10}
          y="70"
          width={largeWidth + 10}
          height="95"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="3"
          rx="2"
        />

        {/* Large piston */}
        <rect
          x={350 - largeWidth - 7}
          y={largePistonY}
          width={largeWidth + 4}
          height="55"
          fill="url(#metalGradPascal)"
          stroke="#475569"
          strokeWidth="2"
          rx="3"
        />

        {/* Weight/load on large piston */}
        <rect
          x={350 - largeWidth - 2}
          y={largePistonY - 35}
          width={largeWidth - 6}
          height="32"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="2"
          rx="5"
        />
        <text
          x={350 - largeWidth/2 - 5}
          y={largePistonY - 14}
          textAnchor="middle"
          fill="#1e293b"
          fontSize="11"
          fontWeight="bold"
        >
          LOAD
        </text>

        {/* Output force arrow */}
        {showLabels && (
          <>
            <line
              x1={350 - largeWidth/2 - 5}
              y1={largePistonY + 70}
              x2={350 - largeWidth/2 - 5}
              y2={largePistonY + 45}
              stroke="#ef4444"
              strokeWidth="4"
              markerEnd="url(#arrowUpPascal)"
            />
            <text
              x={350 - largeWidth/2 - 5}
              y={largePistonY + 85}
              textAnchor="middle"
              fill="#ef4444"
              fontSize="13"
              fontWeight="bold"
            >
              F₂ = {outputForce.toFixed(0)} N
            </text>
          </>
        )}

        {/* Pressure transmission arrows */}
        {showLabels && (
          <g opacity="0.8">
            <line x1="125" y1="195" x2="165" y2="195" stroke="#fcd34d" strokeWidth="2" markerEnd="url(#arrowRightPascal)" />
            <line x1="185" y1="195" x2="225" y2="195" stroke="#fcd34d" strokeWidth="2" markerEnd="url(#arrowRightPascal)" />
            <line x1="245" y1="195" x2="285" y2="195" stroke="#fcd34d" strokeWidth="2" markerEnd="url(#arrowRightPascal)" />
          </g>
        )}

        {/* Area labels */}
        {showLabels && (
          <>
            <text x="90" y="265" textAnchor="middle" fill="#94a3b8" fontSize="12">
              A₁ = {smallPistonArea} cm²
            </text>
            <text x={350 - largeWidth/2 - 5} y="265" textAnchor="middle" fill="#94a3b8" fontSize="12">
              A₂ = {largePistonArea} cm²
            </text>

            {/* Pressure label */}
            <rect x="155" y="172" width="90" height="28" fill="#1e293b" stroke="#fcd34d" strokeWidth="1" rx="4" />
            <text x="200" y="191" textAnchor="middle" fill="#fcd34d" fontSize="12" fontWeight="bold">
              P = {pressure.toFixed(0)} N/cm²
            </text>
          </>
        )}
      </svg>
    );
  };

  const renderWorkConservation = () => {
    const ratio = mechanicalAdvantage;
    const outputDist = outputDistance;

    return (
      <svg width={isMobile ? 320 : 420} height={200} viewBox="0 0 420 200" className="mx-auto">
        <defs>
          <marker id="arrowGreenDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
            <path d="M0,0 L4,8 L8,0" fill="none" stroke="#22c55e" strokeWidth="2" />
          </marker>
          <marker id="arrowRedDown" markerWidth="8" markerHeight="8" refX="4" refY="8" orient="auto">
            <path d="M0,0 L4,8 L8,0" fill="none" stroke="#ef4444" strokeWidth="2" />
          </marker>
        </defs>

        {/* Input side */}
        <rect x="40" y="30" width="60" height="130" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="3" />
        <rect x="45" y="50" width="50" height="35" fill="#94a3b8" stroke="#64748b" strokeWidth="2" rx="2" />

        {/* Input distance arrow (long) */}
        <line x1="70" y1="95" x2="70" y2="150" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowGreenDown)" />
        <text x="70" y="175" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
          d₁ = {inputDistance} cm
        </text>

        {/* Input force label */}
        <text x="70" y="25" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
          F₁ = {inputForce} N
        </text>

        {/* Connection pipe */}
        <path d="M100,100 L280,100" fill="none" stroke="#ef4444" strokeWidth="18" />
        <path d="M100,100 L280,100" fill="none" stroke="#b91c1c" strokeWidth="14" />

        {/* Work conservation box */}
        <rect x="140" y="45" width="140" height="45" fill="#1e293b" stroke="#a855f7" strokeWidth="2" rx="6" />
        <text x="210" y="63" textAnchor="middle" fill="#a855f7" fontSize="12" fontWeight="bold">
          Work In = Work Out
        </text>
        <text x="210" y="80" textAnchor="middle" fill="#c084fc" fontSize="11">
          {inputForce}×{inputDistance} = {outputForce.toFixed(0)}×{outputDist.toFixed(1)}
        </text>

        {/* Output side */}
        <rect x="280" y="30" width="100" height="130" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="3" />
        <rect x="285" y="95" width="90" height="35" fill="#94a3b8" stroke="#64748b" strokeWidth="2" rx="2" />

        {/* Output distance arrow (short) */}
        <line x1="330" y1="140" x2="330" y2={140 + Math.max(15, 50/ratio)} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRedDown)" />
        <text x="330" y="175" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
          d₂ = {outputDist.toFixed(1)} cm
        </text>

        {/* Output force label */}
        <text x="330" y="25" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">
          F₂ = {outputForce.toFixed(0)} N
        </text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6 text-center">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-emerald-400/80 text-sm font-medium tracking-wide uppercase">Fluid Mechanics</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
        Pascal's Law
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        Force multiplication through pressure
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="mb-4">
          {renderHydraulicSystem(isMobile ? 280 : 360, false)}
        </div>
        <p className="text-gray-300 text-center leading-relaxed mb-4">
          A mechanic pushes with just 100 Newtons of force...
          and lifts a 2-ton car!
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); startAnimation(); }}
          className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium rounded-xl transition-colors border border-white/10"
        >
          Push the Small Piston
        </button>
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center gap-2"
      >
        Discover the Secret
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Learn how hydraulic systems multiply force
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          When you push down on a small piston in a hydraulic system filled with fluid, what happens to the pressure throughout the fluid?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          'Pressure is strongest near the small piston and weakens with distance',
          'Pressure is transmitted equally in all directions throughout the fluid',
          'Pressure only travels in a straight line from one piston to the other',
          'The fluid compresses and absorbs the pressure'
        ].map((text, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(index); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === index
                ? index === 1
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && index === 1
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{String.fromCharCode(65 + index)}.</span>
            <span className="text-slate-200 ml-2">{text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! This is <span className="text-cyan-400">Pascal's Law</span> - pressure transmits equally everywhere!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Hydraulic Force Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4">
        {renderHydraulicSystem(isMobile ? 340 : 420, true)}

        <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4 text-center">
          <div className="bg-slate-900/50 rounded-lg p-2 md:p-3">
            <div className="text-xl md:text-2xl font-bold text-green-400">{inputForce} N</div>
            <div className="text-xs md:text-sm text-slate-400">Input Force</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 md:p-3">
            <div className="text-xl md:text-2xl font-bold text-yellow-400">{mechanicalAdvantage.toFixed(1)}×</div>
            <div className="text-xs md:text-sm text-slate-400">Multiplied</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 md:p-3">
            <div className="text-xl md:text-2xl font-bold text-red-400">{outputForce.toFixed(0)} N</div>
            <div className="text-xs md:text-sm text-slate-400">Output Force</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Input Force: {inputForce} N</label>
          <input
            type="range"
            min="50"
            max="500"
            value={inputForce}
            onChange={(e) => setInputForce(Number(e.target.value))}
            className="w-full accent-green-500"
          />
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Small Piston: {smallPistonArea} cm²</label>
          <input
            type="range"
            min="1"
            max="10"
            value={smallPistonArea}
            onChange={(e) => setSmallPistonArea(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Large Piston: {largePistonArea} cm²</label>
          <input
            type="range"
            min="10"
            max="100"
            value={largePistonArea}
            onChange={(e) => setLargePistonArea(Number(e.target.value))}
            className="w-full accent-red-500"
          />
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); startAnimation(); }}
          className="p-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
        >
          ⚡ Activate Hydraulics
        </button>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Pascal's Law Formula:</h3>
        <div className="space-y-2 text-sm text-slate-300">
          <p className="text-base md:text-lg text-center font-mono bg-slate-900/50 p-3 rounded">
            F₁/A₁ = F₂/A₂ = P (Pressure is constant everywhere)
          </p>
          <p className="text-center text-cyan-400">
            Rearranged: F₂ = F₁ × (A₂/A₁)
          </p>
          <p className="text-center text-yellow-400">
            Mechanical Advantage = A₂/A₁ = {largePistonArea}/{smallPistonArea} = {mechanicalAdvantage.toFixed(1)}×
          </p>
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
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Understanding Pascal's Law</h2>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-red-400 mb-3">The Core Principle</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Pressure applied to a confined fluid transmits equally in all directions</li>
            <li>• P = F/A (Pressure = Force ÷ Area)</li>
            <li>• The fluid must be incompressible (liquids, not gases)</li>
            <li>• Pressure acts perpendicular to all surfaces</li>
            <li>• Works regardless of the container's shape!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-cyan-400 mb-3">Force Multiplication</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Same pressure on different areas = different forces</li>
            <li>• F₂ = F₁ × (A₂/A₁)</li>
            <li>• A small piston pushing creates large output force</li>
            <li>• The ratio of areas determines the mechanical advantage</li>
            <li>• 10× larger area = 10× more force output</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-4 md:p-6 md:col-span-2">
          <h3 className="text-lg md:text-xl font-bold text-emerald-400 mb-3">The Mathematics</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Pascal's Law:</strong> P₁ = P₂ (pressure is equal everywhere in the fluid)</p>
            <p><strong>Therefore:</strong> F₁/A₁ = F₂/A₂</p>
            <p><strong>Solving for output:</strong> F₂ = F₁ × (A₂/A₁)</p>
            <p className="text-cyan-400 mt-3">
              Example: A 100 N push on a 1 cm² piston creates 100 N/cm² pressure. That same pressure on a 10 cm² piston produces 1000 N of force!
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
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          A hydraulic lift multiplies your force by 20×. You push 100 N and get 2000 N output!
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          Are you getting "free" energy? Where's the catch?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          'There is no catch - hydraulics create free energy',
          'The hydraulic fluid heats up and absorbs the extra energy',
          'You trade force for distance - the output moves 20× less',
          'The system requires electricity to work'
        ].map((text, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(index); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === index
                ? index === 2
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && index === 2
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{String.fromCharCode(65 + index)}.</span>
            <span className="text-slate-200 ml-2">{text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! Work In = Work Out. Force × Distance is conserved!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            If you multiply force by 20, you must push 20× farther to move the output the same distance.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See the Trade-off →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">The Force-Distance Trade-off</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        {renderWorkConservation()}

        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30">
            <div className="text-lg font-bold text-green-400">Work In</div>
            <div className="text-xl md:text-2xl font-mono text-white">{workIn.toFixed(0)} J</div>
            <div className="text-sm text-slate-400">F₁ × d₁</div>
          </div>
          <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
            <div className="text-lg font-bold text-red-400">Work Out</div>
            <div className="text-xl md:text-2xl font-mono text-white">{workOut.toFixed(0)} J</div>
            <div className="text-sm text-slate-400">F₂ × d₂</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-4 md:p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Conservation of Energy:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Work = Force × Distance</strong></li>
          <li>• If you multiply force by 20, distance is divided by 20</li>
          <li>• To lift a car 1 cm, you must push 20 cm!</li>
          <li>• This is why hydraulic jacks require many pump strokes</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          No free lunch! Hydraulics make work easier, not less. You trade distance for force.
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
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-6">Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <h3 className="text-lg md:text-xl font-bold text-purple-400 mb-4">Pascal's Law + Conservation of Energy</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Hydraulic systems follow two fundamental principles:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Pascal's Law:</strong> Pressure transmits equally → Force multiplies with area ratio</li>
            <li><strong>Conservation of Energy:</strong> Work In = Work Out → Distance decreases proportionally</li>
            <li><strong>Mechanical Advantage:</strong> You gain force but lose distance (or vice versa)</li>
            <li><strong>Practical Benefit:</strong> Easier to apply small force over large distance than large force over small distance</li>
          </ol>
          <p className="text-emerald-400 font-medium mt-4">
            Hydraulics don't create energy - they transform it into a more useful form!
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

  const renderTransfer = () => {
    const app = transferApps[activeAppTab];

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Real-World Applications</h2>

        {/* App tabs */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {transferApps.map((a, index) => (
            <button
              key={index}
              onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); setExpandedApp(null); }}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${
                activeAppTab === index
                  ? `bg-gradient-to-r ${a.color} text-white`
                  : completedApps.has(index)
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {a.icon} {isMobile ? '' : a.short}
            </button>
          ))}
        </div>

        {/* Active app card */}
        <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-3xl w-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{app.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-cyan-400 text-sm">{app.tagline}</p>
            </div>
          </div>

          <p className="text-slate-300 mb-4">{app.description}</p>

          <div className={`bg-gradient-to-r ${app.color} bg-opacity-20 rounded-xl p-4 mb-4`}>
            <h4 className="font-semibold text-white mb-2">Physics Connection</h4>
            <p className="text-slate-200 text-sm">{app.connection}</p>
          </div>

          <button
            onMouseDown={(e) => { e.preventDefault(); setExpandedApp(expandedApp === activeAppTab ? null : activeAppTab); }}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mb-4"
          >
            {expandedApp === activeAppTab ? '▼ Hide Details' : '▶ Show More Details'}
          </button>

          {expandedApp === activeAppTab && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="font-semibold text-yellow-400 mb-2">How It Works</h4>
                <p className="text-slate-300 text-sm">{app.howItWorks}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">Key Statistics</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    {app.stats.map((stat, i) => (
                      <li key={i}>• {stat}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Real Examples</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    {app.examples.map((ex, i) => (
                      <li key={i}>• {ex}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Industry Leaders</h4>
                <div className="flex flex-wrap gap-2">
                  {app.companies.map((company, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-sm">
                      {company}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Future Impact</h4>
                <p className="text-slate-300 text-sm">{app.futureImpact}</p>
              </div>
            </div>
          )}

          {!completedApps.has(activeAppTab) && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              ✓ Mark as Understood
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {transferApps.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/4</span>
        </div>

        {completedApps.size >= 4 && (
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-3xl w-full">
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
                onGameEvent({ type: 'test_completed', data: { score: calculateScore(), total: 10 } });
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
        <div className="max-w-3xl w-full space-y-4">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered Pascal\'s Law and hydraulic systems!'
                : 'Keep studying! Review the explanations below and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div className="space-y-4">
            {testQuestions.map((q, qIndex) => {
              const correctIndex = q.options.findIndex(o => o.correct);
              const isCorrect = testAnswers[qIndex] === correctIndex;

              return (
                <div key={qIndex} className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-900/30 border border-emerald-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-lg ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <p className="text-white font-medium text-sm">{qIndex + 1}. {q.question}</p>
                  </div>
                  <p className="text-slate-300 text-sm ml-6">
                    <strong>Correct:</strong> {q.options[correctIndex].text}
                  </p>
                  <p className="text-slate-400 text-sm ml-6 mt-1">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
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
              className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => {
    useEffect(() => {
      if (onGameEvent) {
        onGameEvent({ type: 'mastery_achieved', data: { score: calculateScore() } });
      }
    }, []);

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
        <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-6 md:p-8 max-w-2xl">
          <div className="text-7xl md:text-8xl mb-6">⚙️</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Pascal's Law Master!</h1>
          <p className="text-lg md:text-xl text-slate-300 mb-6">
            You've mastered hydraulic systems and force multiplication through Pascal's Law!
          </p>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">🔴</div>
              <p className="text-xs md:text-sm text-slate-300">Pressure Transmission</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">💪</div>
              <p className="text-xs md:text-sm text-slate-300">Force Multiplication</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">⚖️</div>
              <p className="text-xs md:text-sm text-slate-300">Energy Conservation</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">🚗</div>
              <p className="text-xs md:text-sm text-slate-300">Hydraulic Systems</p>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-2">Key Formula</h3>
            <p className="text-xl md:text-2xl font-mono text-white">F₁/A₁ = F₂/A₂ = P</p>
            <p className="text-slate-400 text-sm mt-2">Pressure is constant throughout a confined fluid</p>
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
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

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
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Pascal's Law</span>
            <span className="text-sm text-slate-500">{phaseNames[phase]}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {phaseNames.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= phase
                    ? 'bg-emerald-500'
                    : 'bg-slate-700'
                } ${i === phase ? 'w-6' : 'w-2'}`}
                title={phaseNames[i]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-8 relative z-10">
        {renderPhase()}
      </div>
    </div>
  );
};

export default PascalLawRenderer;
