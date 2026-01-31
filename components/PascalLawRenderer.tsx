import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// PASCAL'S LAW - GOLD STANDARD RENDERER
// ============================================================================
// Physics: F₁/A₁ = F₂/A₂ = P (Pressure is constant in confined fluid)
// Force multiplication through area ratio: F₂ = F₁ × (A₂/A₁)
// Conservation of energy: Work = Force × Distance remains constant
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

const PascalLawRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  // Core game state
  const [phase, setPhase] = useState<Phase>('hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
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

  // Brake system simulation
  const [brakePedalForce, setBrakePedalForce] = useState(0);
  const [brakeAnimating, setBrakeAnimating] = useState(false);

  // Audio ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Physics calculations
  const pressure = inputForce / smallPistonArea; // N/cm² (Pascal)
  const outputForce = pressure * largePistonArea; // N
  const mechanicalAdvantage = largePistonArea / smallPistonArea;
  const inputDistance = 10; // cm (reference push distance)
  const outputDistance = inputDistance * (smallPistonArea / largePistonArea);
  const workIn = inputForce * inputDistance;
  const workOut = outputForce * outputDistance;

  const phaseNames: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Explore',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Explore',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  // Responsive handling
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

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    const currentIndex = phaseOrder.indexOf(newPhase);
    if (onPhaseComplete && currentIndex > 0) {
      onPhaseComplete(phaseOrder[currentIndex - 1]);
    }
  }, [playSound, onPhaseComplete]);

  const handlePrediction = useCallback((index: number) => {
    setSelectedPrediction(index);
    setShowPredictionFeedback(true);
    playSound(index === 1 ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction: index, correct: index === 1 } });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((index: number) => {
    setTwistPrediction(index);
    setShowTwistFeedback(true);
    playSound(index === 2 ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction: index, correct: index === 2, twist: true } });
    }
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
    }
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
      title: "Car Brakes",
      short: "Car Brakes",
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
      title: "Hydraulic Lifts",
      short: "Hydraulic Lifts",
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
      icon: "🔧",
      title: "Hydraulic Press",
      short: "Hydraulic Press",
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
    },
    {
      icon: "✈️",
      title: "Aircraft Controls",
      short: "Aircraft Controls",
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
    }
  ];

  // ============================================================================
  // SVG VISUALIZATIONS - Premium Graphics with Gradients & Filters
  // ============================================================================
  const renderHydraulicSystem = (size: number = 400, showLabels: boolean = true) => {
    const pistonProgress = animationProgress / 100;
    const smallPistonY = 120 - pistonProgress * 30;
    const largePistonY = 120 - pistonProgress * (30 * smallPistonArea / largePistonArea);
    const ratio = Math.min(largePistonArea / smallPistonArea, 50);
    const largeWidth = Math.min(40 + ratio * 1.5, 100);

    return (
      <div className="flex flex-col items-center">
        <svg
          width={size}
          height={size * 0.65}
          viewBox="0 0 400 260"
          className="overflow-visible mx-auto"
        >
          <defs>
            {/* Premium hydraulic fluid gradient with depth - 5 color stops */}
            <linearGradient id="pascalFluidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="80%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Fluid surface highlight for 3D depth */}
            <linearGradient id="pascalFluidSurface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef2f2" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#fecaca" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            {/* Premium metallic piston gradient with 3D effect - 6 color stops */}
            <linearGradient id="pascalPistonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="15%" stopColor="#f1f5f9" />
              <stop offset="30%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Cylinder wall gradient - 5 stops for brushed metal */}
            <linearGradient id="pascalCylinderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="20%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Container wall gradient - 4 stops */}
            <linearGradient id="pascalContainerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Load/weight gradient - 4 stops */}
            <linearGradient id="pascalLoadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Pressure wave glow gradient */}
            <radialGradient id="pascalPressureGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Input force arrow gradient */}
            <linearGradient id="pascalInputForceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Output force arrow gradient */}
            <linearGradient id="pascalOutputForceGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Glow filter for arrows - feGaussianBlur + feMerge pattern */}
            <filter id="pascalArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pressure wave glow filter */}
            <filter id="pascalWaveGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="pascalInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Arrow markers with gradient fills */}
            <marker id="pascalArrowDown" markerWidth="12" markerHeight="12" refX="6" refY="10" orient="auto">
              <path d="M1,0 L6,10 L11,0 L6,3 Z" fill="url(#pascalInputForceGrad)" />
            </marker>
            <marker id="pascalArrowUp" markerWidth="12" markerHeight="12" refX="6" refY="2" orient="auto">
              <path d="M1,12 L6,2 L11,12 L6,9 Z" fill="url(#pascalOutputForceGrad)" />
            </marker>
            <marker id="pascalArrowRight" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 L3,5 Z" fill="#fcd34d" />
            </marker>
          </defs>

          {/* Container/reservoir with premium fluid */}
          <rect x="50" y="160" width="300" height="80" fill="url(#pascalFluidGrad)" rx="5" />
          {/* Fluid surface highlight for 3D depth */}
          <rect x="50" y="160" width="300" height="25" fill="url(#pascalFluidSurface)" rx="5" />

          {/* Pressure wave visualization with premium glow */}
          {showPressureWaves && isAnimating && (
            <g filter="url(#pascalWaveGlow)">
              <circle cx="90" cy="195" r={15 + animationProgress * 0.5} fill="none" stroke="url(#pascalPressureGlow)" strokeWidth="3" opacity={Math.max(0, 1 - animationProgress / 80)}>
                <animate attributeName="r" from="15" to="100" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx="90" cy="195" r={35 + animationProgress * 0.5} fill="none" stroke="#fcd34d" strokeWidth="2" opacity={Math.max(0, 0.5 - animationProgress / 100)}>
                <animate attributeName="r" from="35" to="120" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx="90" cy="195" r={55 + animationProgress * 0.5} fill="none" stroke="#f59e0b" strokeWidth="1" opacity={Math.max(0, 0.3 - animationProgress / 100)}>
                <animate attributeName="r" from="55" to="140" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Container border with 3D effect */}
          <rect x="45" y="155" width="310" height="90" fill="none" stroke="url(#pascalContainerGrad)" strokeWidth="6" rx="8" />
          <rect x="47" y="157" width="306" height="86" fill="none" stroke="#1e293b" strokeWidth="2" rx="7" opacity="0.5" />

          {/* Small piston cylinder with depth */}
          <rect x="65" y="90" width="50" height="75" fill="url(#pascalCylinderGrad)" stroke="#475569" strokeWidth="2" rx="3" />
          {/* Cylinder inner shadow */}
          <rect x="68" y="93" width="44" height="69" fill="#0f172a" opacity="0.3" rx="2" />

          {/* Small piston with 3D metallic effect */}
          <rect
            x="68"
            y={smallPistonY}
            width="44"
            height="55"
            fill="url(#pascalPistonGrad)"
            stroke="#475569"
            strokeWidth="1"
            rx="3"
          />
          {/* Piston top highlight */}
          <rect
            x="70"
            y={smallPistonY + 2}
            width="40"
            height="8"
            fill="#f1f5f9"
            opacity="0.4"
            rx="2"
          />
          {/* Piston bottom shadow */}
          <rect
            x="70"
            y={smallPistonY + 45}
            width="40"
            height="8"
            fill="#1e293b"
            opacity="0.5"
            rx="2"
          />

          {/* Input force arrow with glow */}
          <g filter="url(#pascalArrowGlow)">
            <line
              x1="90"
              y1={smallPistonY - 40}
              x2="90"
              y2={smallPistonY - 8}
              stroke="url(#pascalInputForceGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              markerEnd="url(#pascalArrowDown)"
            />
          </g>

          {/* Large piston cylinder with depth */}
          <rect
            x={350 - largeWidth - 10}
            y="70"
            width={largeWidth + 10}
            height="95"
            fill="url(#pascalCylinderGrad)"
            stroke="#475569"
            strokeWidth="2"
            rx="3"
          />
          {/* Cylinder inner shadow */}
          <rect
            x={350 - largeWidth - 7}
            y="73"
            width={largeWidth + 4}
            height="89"
            fill="#0f172a"
            opacity="0.3"
            rx="2"
          />

          {/* Large piston with 3D metallic effect */}
          <rect
            x={350 - largeWidth - 7}
            y={largePistonY}
            width={largeWidth + 4}
            height="55"
            fill="url(#pascalPistonGrad)"
            stroke="#475569"
            strokeWidth="1"
            rx="3"
          />
          {/* Piston top highlight */}
          <rect
            x={350 - largeWidth - 4}
            y={largePistonY + 2}
            width={largeWidth - 2}
            height="8"
            fill="#f1f5f9"
            opacity="0.4"
            rx="2"
          />
          {/* Piston bottom shadow */}
          <rect
            x={350 - largeWidth - 4}
            y={largePistonY + 45}
            width={largeWidth - 2}
            height="8"
            fill="#1e293b"
            opacity="0.5"
            rx="2"
          />

          {/* Weight/load on large piston with premium gradient */}
          <rect
            x={350 - largeWidth - 2}
            y={largePistonY - 35}
            width={largeWidth - 6}
            height="32"
            fill="url(#pascalLoadGrad)"
            stroke="#92400e"
            strokeWidth="2"
            rx="5"
          />
          {/* Load highlight */}
          <rect
            x={350 - largeWidth}
            y={largePistonY - 33}
            width={largeWidth - 10}
            height="6"
            fill="#fef3c7"
            opacity="0.5"
            rx="3"
          />
          <text
            x={350 - largeWidth/2 - 5}
            y={largePistonY - 14}
            textAnchor="middle"
            fill="#78350f"
            fontSize="11"
            fontWeight="bold"
          >
            LOAD
          </text>

          {/* Output force arrow with glow */}
          <g filter="url(#pascalArrowGlow)">
            <line
              x1={350 - largeWidth/2 - 5}
              y1={largePistonY + 75}
              x2={350 - largeWidth/2 - 5}
              y2={largePistonY + 48}
              stroke="url(#pascalOutputForceGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              markerEnd="url(#pascalArrowUp)"
            />
          </g>

          {/* Pressure transmission arrows with animation */}
          <g opacity="0.9">
            <line x1="125" y1="200" x2="165" y2="200" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" markerEnd="url(#pascalArrowRight)">
              {isAnimating && <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />}
            </line>
            <line x1="185" y1="200" x2="225" y2="200" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" markerEnd="url(#pascalArrowRight)">
              {isAnimating && <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" begin="0.15s" />}
            </line>
            <line x1="245" y1="200" x2="285" y2="200" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" markerEnd="url(#pascalArrowRight)">
              {isAnimating && <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" begin="0.3s" />}
            </line>
          </g>

          {/* Pressure indicator box with glow */}
          <rect x="155" y="172" width="90" height="24" fill="#1e293b" stroke="#fcd34d" strokeWidth="2" rx="6" opacity="0.95" />
          <rect x="157" y="174" width="86" height="20" fill="#0f172a" opacity="0.5" rx="5" />
        </svg>

        {/* External labels using typo system for responsive typography */}
        {showLabels && (
          <div className="w-full flex justify-between items-start px-4 mt-2" style={{ maxWidth: size }}>
            {/* Left side - Input */}
            <div className="flex flex-col items-center text-center" style={{ width: '30%' }}>
              <span style={{ fontSize: typo.body, fontWeight: 'bold', color: '#22c55e' }}>
                F₁ = {inputForce} N
              </span>
              <span style={{ fontSize: typo.small, color: '#94a3b8' }}>
                A₁ = {smallPistonArea} cm²
              </span>
            </div>

            {/* Center - Pressure */}
            <div className="flex flex-col items-center text-center" style={{ width: '40%' }}>
              <span style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: '#fcd34d' }}>
                P = {pressure.toFixed(0)} N/cm²
              </span>
              <span style={{ fontSize: typo.label, color: '#64748b' }}>
                Pressure (constant)
              </span>
            </div>

            {/* Right side - Output */}
            <div className="flex flex-col items-center text-center" style={{ width: '30%' }}>
              <span style={{ fontSize: typo.body, fontWeight: 'bold', color: '#ef4444' }}>
                F₂ = {outputForce.toFixed(0)} N
              </span>
              <span style={{ fontSize: typo.small, color: '#94a3b8' }}>
                A₂ = {largePistonArea} cm²
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkConservation = () => {
    const ratio = mechanicalAdvantage;
    const outputDist = outputDistance;

    return (
      <div className="flex flex-col items-center">
        <svg width={isMobile ? 320 : 420} height={170} viewBox="0 0 420 170" className="mx-auto">
          <defs>
            {/* Premium cylinder gradient */}
            <linearGradient id="pascalWorkCylinderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="20%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Premium piston gradient */}
            <linearGradient id="pascalWorkPistonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="20%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Connection pipe gradient */}
            <linearGradient id="pascalWorkPipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Work box gradient */}
            <linearGradient id="pascalWorkBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="50%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Arrow glow filter */}
            <filter id="pascalWorkArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="pascalWorkArrowGreenDown" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto">
              <path d="M0,0 L5,10 L10,0 L5,3 Z" fill="#22c55e" />
            </marker>
            <marker id="pascalWorkArrowRedDown" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto">
              <path d="M0,0 L5,10 L10,0 L5,3 Z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Input side cylinder */}
          <rect x="40" y="30" width="60" height="130" fill="url(#pascalWorkCylinderGrad)" stroke="#475569" strokeWidth="2" rx="3" />
          <rect x="42" y="32" width="56" height="126" fill="#0f172a" opacity="0.3" rx="2" />

          {/* Input piston */}
          <rect x="45" y="50" width="50" height="35" fill="url(#pascalWorkPistonGrad)" stroke="#64748b" strokeWidth="1" rx="2" />
          <rect x="47" y="52" width="46" height="6" fill="#f1f5f9" opacity="0.4" rx="1" />

          {/* Input distance arrow with glow */}
          <g filter="url(#pascalWorkArrowGlow)">
            <line x1="70" y1="95" x2="70" y2="148" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" markerEnd="url(#pascalWorkArrowGreenDown)" />
          </g>

          {/* Connection pipe with premium gradient */}
          <rect x="100" y="92" width="180" height="16" fill="url(#pascalWorkPipeGrad)" rx="8" />
          <rect x="102" y="94" width="176" height="4" fill="#fecaca" opacity="0.3" rx="2" />

          {/* Work conservation box with premium styling */}
          <rect x="140" y="45" width="140" height="42" fill="url(#pascalWorkBoxGrad)" stroke="#a855f7" strokeWidth="2" rx="8" />
          <rect x="142" y="47" width="136" height="8" fill="#a855f7" opacity="0.2" rx="4" />

          {/* Output side cylinder */}
          <rect x="280" y="30" width="100" height="130" fill="url(#pascalWorkCylinderGrad)" stroke="#475569" strokeWidth="2" rx="3" />
          <rect x="282" y="32" width="96" height="126" fill="#0f172a" opacity="0.3" rx="2" />

          {/* Output piston */}
          <rect x="285" y="95" width="90" height="35" fill="url(#pascalWorkPistonGrad)" stroke="#64748b" strokeWidth="1" rx="2" />
          <rect x="287" y="97" width="86" height="6" fill="#f1f5f9" opacity="0.4" rx="1" />

          {/* Output distance arrow with glow */}
          <g filter="url(#pascalWorkArrowGlow)">
            <line x1="330" y1="140" x2="330" y2={140 + Math.max(15, 50/ratio)} stroke="#ef4444" strokeWidth="4" strokeLinecap="round" markerEnd="url(#pascalWorkArrowRedDown)" />
          </g>
        </svg>

        {/* External labels using typo system */}
        <div className="w-full flex justify-between items-start px-2 mt-1" style={{ maxWidth: isMobile ? 320 : 420 }}>
          {/* Input side labels */}
          <div className="flex flex-col items-center text-center" style={{ width: '25%' }}>
            <span style={{ fontSize: typo.small, fontWeight: 'bold', color: '#22c55e' }}>
              F₁ = {inputForce} N
            </span>
            <span style={{ fontSize: typo.small, fontWeight: 'bold', color: '#22c55e' }}>
              d₁ = {inputDistance} cm
            </span>
          </div>

          {/* Center - Work conservation */}
          <div className="flex flex-col items-center text-center" style={{ width: '50%' }}>
            <span style={{ fontSize: typo.body, fontWeight: 'bold', color: '#a855f7' }}>
              Work In = Work Out
            </span>
            <span style={{ fontSize: typo.small, color: '#c084fc' }}>
              {inputForce} x {inputDistance} = {outputForce.toFixed(0)} x {outputDist.toFixed(1)}
            </span>
          </div>

          {/* Output side labels */}
          <div className="flex flex-col items-center text-center" style={{ width: '25%' }}>
            <span style={{ fontSize: typo.small, fontWeight: 'bold', color: '#ef4444' }}>
              F₂ = {outputForce.toFixed(0)} N
            </span>
            <span style={{ fontSize: typo.small, fontWeight: 'bold', color: '#ef4444' }}>
              d₂ = {outputDist.toFixed(1)} cm
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderBrakeSystem = () => {
    const pedalProgress = brakePedalForce / 100;
    const caliperClamp = pedalProgress * 15;
    const masterCylinderArea = 2; // cm²
    const caliperArea = 20; // cm²
    const brakeForce = (brakePedalForce * caliperArea / masterCylinderArea);

    return (
      <div className="flex flex-col items-center">
        <svg width={isMobile ? 340 : 450} height={220} viewBox="0 0 450 220" className="mx-auto">
          <defs>
            {/* Premium brake fluid gradient - 5 color stops */}
            <linearGradient id="pascalBrakeFluidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Premium rotor gradient - 6 color stops for metallic effect */}
            <radialGradient id="pascalRotorGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Brake caliper gradient */}
            <linearGradient id="pascalCaliperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Pedal metallic gradient */}
            <linearGradient id="pascalPedalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Master cylinder gradient */}
            <linearGradient id="pascalMasterCylGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="20%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Pressure glow filter */}
            <filter id="pascalBrakePressureGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Rotor shine filter */}
            <filter id="pascalRotorShine" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Brake Pedal with premium metallic look */}
          <g transform={`translate(30, ${80 + pedalProgress * 30})`}>
            <rect x="0" y="0" width="50" height="15" fill="url(#pascalPedalGrad)" rx="3" stroke="#475569" strokeWidth="1" />
            <rect x="2" y="2" width="46" height="4" fill="#cbd5e1" opacity="0.3" rx="2" />
            <rect x="45" y="-40" width="8" height="50" fill="url(#pascalPedalGrad)" stroke="#334155" strokeWidth="1" rx="1" />
          </g>

          {/* Master Cylinder with premium styling */}
          <rect x="90" y="75" width="60" height="40" fill="url(#pascalMasterCylGrad)" stroke="#475569" strokeWidth="2" rx="4" />
          <rect x="92" y="77" width="56" height="36" fill="#0f172a" opacity="0.3" rx="3" />

          {/* Master cylinder piston */}
          <rect x="95" y={85 + pedalProgress * 10} width="20" height="20" fill="url(#pascalPedalGrad)" stroke="#64748b" strokeWidth="1" rx="2" />
          <rect x="97" y={87 + pedalProgress * 10} width="16" height="4" fill="#e2e8f0" opacity="0.4" rx="1" />

          {/* Brake Lines with premium gradient */}
          <path
            d="M150,95 L200,95 L200,50 L280,50"
            fill="none"
            stroke="url(#pascalBrakeFluidGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M152,95 L200,95 L200,52 L278,52"
            fill="none"
            stroke="#fecaca"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
          <path
            d="M150,95 L200,95 L200,150 L280,150"
            fill="none"
            stroke="url(#pascalBrakeFluidGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M152,95 L200,95 L200,148 L278,148"
            fill="none"
            stroke="#fecaca"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />

          {/* Pressure indicator with glow */}
          {brakePedalForce > 0 && (
            <g filter="url(#pascalBrakePressureGlow)">
              <rect x="175" y="80" width="60" height="28" fill="#1e293b" stroke="#fcd34d" strokeWidth="2" rx="6" />
              <rect x="177" y="82" width="56" height="6" fill="#fcd34d" opacity="0.2" rx="3" />
            </g>
          )}

          {/* Front Wheel/Rotor with premium metallic effect */}
          <g transform="translate(320, 50)" filter="url(#pascalRotorShine)">
            <circle cx="40" cy="0" r="38" fill="url(#pascalRotorGrad)" stroke="#1e293b" strokeWidth="3" />
            {/* Rotor ventilation slots */}
            <circle cx="40" cy="0" r="30" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="8 4" />
            <circle cx="40" cy="0" r="22" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6 3" />
            <circle cx="40" cy="0" r="15" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
            {/* Hub center highlight */}
            <circle cx="38" cy="-2" r="6" fill="#475569" opacity="0.5" />
            {/* Brake calipers with gradient */}
            <rect x={8 - caliperClamp} y="-14" width="18" height="28" fill="url(#pascalCaliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
            <rect x={54 + caliperClamp} y="-14" width="18" height="28" fill="url(#pascalCaliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
          </g>

          {/* Rear Wheel/Rotor with premium metallic effect */}
          <g transform="translate(320, 150)" filter="url(#pascalRotorShine)">
            <circle cx="40" cy="0" r="38" fill="url(#pascalRotorGrad)" stroke="#1e293b" strokeWidth="3" />
            {/* Rotor ventilation slots */}
            <circle cx="40" cy="0" r="30" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="8 4" />
            <circle cx="40" cy="0" r="22" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="6 3" />
            <circle cx="40" cy="0" r="15" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
            {/* Hub center highlight */}
            <circle cx="38" cy="-2" r="6" fill="#475569" opacity="0.5" />
            {/* Brake calipers with gradient */}
            <rect x={8 - caliperClamp} y="-14" width="18" height="28" fill="url(#pascalCaliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
            <rect x={54 + caliperClamp} y="-14" width="18" height="28" fill="url(#pascalCaliperGrad)" rx="3" stroke="#991b1b" strokeWidth="1" />
          </g>
        </svg>

        {/* External labels using typo system */}
        <div className="w-full grid grid-cols-4 gap-2 px-2 mt-2" style={{ maxWidth: isMobile ? 340 : 450 }}>
          {/* Pedal label */}
          <div className="flex flex-col items-center text-center">
            <span style={{ fontSize: typo.label, color: '#64748b' }}>Pedal</span>
          </div>

          {/* Master cylinder label */}
          <div className="flex flex-col items-center text-center">
            <span style={{ fontSize: typo.label, color: '#94a3b8' }}>Master</span>
            <span style={{ fontSize: typo.label, color: '#64748b' }}>2 cm²</span>
          </div>

          {/* Pressure label */}
          {brakePedalForce > 0 ? (
            <div className="flex flex-col items-center text-center">
              <span style={{ fontSize: typo.small, fontWeight: 'bold', color: '#fcd34d' }}>
                {(brakePedalForce / masterCylinderArea).toFixed(0)} N/cm²
              </span>
              <span style={{ fontSize: typo.label, color: '#64748b' }}>Pressure</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <span style={{ fontSize: typo.label, color: '#64748b' }}>Brake Lines</span>
            </div>
          )}

          {/* Caliper label */}
          <div className="flex flex-col items-center text-center">
            <span style={{ fontSize: typo.label, color: '#94a3b8' }}>Calipers</span>
            <span style={{ fontSize: typo.label, color: '#64748b' }}>20 cm² each</span>
          </div>
        </div>

        {/* Force readouts using external labels */}
        <div className="w-full grid grid-cols-3 gap-2 px-2 mt-3" style={{ maxWidth: isMobile ? 340 : 450 }}>
          <div className="bg-slate-800/50 rounded-lg p-2 border border-green-500/30 text-center">
            <span style={{ fontSize: typo.label, color: '#22c55e' }}>Input Force</span>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: '#22c55e' }}>{brakePedalForce} N</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2 border border-red-500/30 text-center">
            <span style={{ fontSize: typo.label, color: '#ef4444' }}>Output (per wheel)</span>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: '#ef4444' }}>{brakeForce.toFixed(0)} N</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-2 border border-purple-500/30 text-center">
            <span style={{ fontSize: typo.label, color: '#a855f7' }}>Multiplication</span>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 'bold', color: '#a855f7' }}>{(caliperArea / masterCylinderArea)}x</div>
          </div>
        </div>
      </div>
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
          onClick={() => startAnimation()}
          style={{ position: 'relative', zIndex: 10 }}
          className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium rounded-xl transition-colors border border-white/10"
        >
          Push the Small Piston
        </button>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ position: 'relative', zIndex: 10 }}
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
            onClick={() => handlePrediction(index)}
            style={{ position: 'relative', zIndex: 10 }}
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
            {selectedPrediction === 1 ? '✓ Correct!' : '✗ Not quite.'} This is <span className="text-cyan-400">Pascal's Law</span> - pressure transmits equally everywhere!
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Physics
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
          onClick={() => startAnimation()}
          style={{ position: 'relative', zIndex: 10 }}
          className="p-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
        >
          Activate Hydraulics
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
        onClick={() => goToPhase('review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Understanding Pascal's Law</h2>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-red-400 mb-3">P₁ = P₂ (Equal Pressure)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Pressure applied to a confined fluid transmits equally in all directions</li>
            <li>P = F/A (Pressure = Force / Area)</li>
            <li>The fluid must be incompressible (liquids, not gases)</li>
            <li>Pressure acts perpendicular to all surfaces</li>
            <li>Works regardless of the container's shape!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-cyan-400 mb-3">F₁/A₁ = F₂/A₂</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Same pressure on different areas = different forces</li>
            <li>This is the key to force multiplication!</li>
            <li>A small piston pushing creates large output force</li>
            <li>The ratio of areas determines the mechanical advantage</li>
            <li>10× larger area = 10× more force output</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-4 md:p-6 md:col-span-2">
          <h3 className="text-lg md:text-xl font-bold text-emerald-400 mb-3">Mechanical Advantage</h3>
          <div className="text-slate-300 text-sm space-y-2">
            <p><strong>Pascal's Law:</strong> P₁ = P₂ (pressure is equal everywhere in the fluid)</p>
            <p><strong>Therefore:</strong> F₁/A₁ = F₂/A₂</p>
            <p><strong>Solving for output:</strong> F₂ = F₁ × (A₂/A₁)</p>
            <p className="text-cyan-400 mt-3">
              Example: A 100 N push on a 1 cm² piston creates 100 N/cm² pressure. That same pressure on a 10 cm² piston produces 1000 N of force - a 10× mechanical advantage!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-6">Brake System Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          A car's brake system has a master cylinder (2 cm²) connected to four brake calipers (20 cm² each). When you press the brake pedal with 100 N of force...
        </p>
        <p className="text-base md:text-lg text-cyan-400 font-medium">
          What is the total braking force across all four wheels?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          '100 N total - force just gets distributed to all wheels',
          '1,000 N total - each wheel gets 250 N (1000/4)',
          '4,000 N total - each wheel gets the full 1,000 N independently',
          '10,000 N total - pressure multiplies between wheels too'
        ].map((text, index) => (
          <button
            key={index}
            onClick={() => handleTwistPrediction(index)}
            style={{ position: 'relative', zIndex: 10 }}
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
            {twistPrediction === 2 ? '✓ Correct!' : '✗ Not quite.'} Each caliper gets the FULL multiplied force independently!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Pressure transmits equally to ALL brake calipers. Each 20 cm² caliper produces 1,000 N (10× multiplication). Four calipers = 4,000 N total braking force from just 100 N of pedal input!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore the Brake System
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">Interactive Brake System</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-3xl mb-6">
        {renderBrakeSystem()}

        <div className="mt-6">
          <label className="text-sm text-slate-400 block mb-2">Brake Pedal Force: {brakePedalForce} N</label>
          <input
            type="range"
            min="0"
            max="200"
            value={brakePedalForce}
            onChange={(e) => setBrakePedalForce(Number(e.target.value))}
            className="w-full accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Light press</span>
            <span>Hard brake</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-4 md:p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Hydraulic Multiplication in Brakes:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li><strong>Master Cylinder:</strong> Small piston (2 cm²) creates high pressure</li>
          <li><strong>Brake Lines:</strong> Transmit pressure equally to all calipers</li>
          <li><strong>Calipers:</strong> Large pistons (20 cm²) multiply force at each wheel</li>
          <li><strong>Key Insight:</strong> Each wheel gets 10× your pedal force INDEPENDENTLY!</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          This is why you can stop a 2-ton car with just your foot - Pascal's Law working in every brake system!
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-6">Hydraulic Multiplication Explained</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <h3 className="text-lg md:text-xl font-bold text-purple-400 mb-4">Key Discoveries</h3>
        <div className="space-y-4 text-slate-300">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-cyan-400 font-semibold mb-2">1. Pressure Distributes Equally</h4>
            <p className="text-sm">When you apply force to a master cylinder, the pressure (F/A) is transmitted equally to ALL connected cylinders - not split between them!</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-emerald-400 font-semibold mb-2">2. Each Output Gets Full Multiplication</h4>
            <p className="text-sm">Every brake caliper experiences the same pressure and produces its own multiplied force. Four calipers = four times the force, not the force divided by four.</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-yellow-400 font-semibold mb-2">3. Work is Still Conserved</h4>
            <p className="text-sm">The brake pedal must travel farther to move all four caliper pistons. More output cylinders = more pedal travel required (hydraulic fluid must fill all of them).</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mb-6">
        <h4 className="text-lg font-semibold text-white mb-2">Real-World Impact</h4>
        <p className="text-slate-300 text-sm">
          A typical brake system provides 40:1 total mechanical advantage (including pedal leverage + hydraulic multiplication). Your 50 N foot pressure becomes 2,000+ N of braking force at each wheel!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications
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
              onClick={() => { setActiveAppTab(index); setExpandedApp(null); }}
              style={{ position: 'relative', zIndex: 10 }}
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
            onClick={() => setExpandedApp(expandedApp === activeAppTab ? null : activeAppTab)}
            style={{ position: 'relative', zIndex: 10 }}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mb-4"
          >
            {expandedApp === activeAppTab ? 'Hide Details' : 'Show More Details'}
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
                      <li key={i}>{stat}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Real Examples</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    {app.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
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
              onClick={() => handleAppComplete(activeAppTab)}
              style={{ position: 'relative', zIndex: 10 }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              Mark as Understood
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
            onClick={() => goToPhase('test')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all duration-300"
          >
            Take the Knowledge Test
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
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ position: 'relative', zIndex: 10 }}
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
            onClick={() => {
              const score = calculateScore();
              setTestScore(score);
              setShowTestResults(true);
              if (onGameEvent) {
                onGameEvent({ type: 'test_completed', data: { score, total: 10 } });
              }
            }}
            style={{ position: 'relative', zIndex: 10 }}
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
            <div className="text-6xl mb-4">{testScore >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {testScore}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {testScore >= 7
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

          {testScore >= 7 ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(-1));
                goToPhase('review');
              }}
              style={{ position: 'relative', zIndex: 10 }}
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
        onGameEvent({ type: 'mastery_achieved', data: { score: testScore } });
      }
    }, []);

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
        <div className="bg-gradient-to-br from-red-900/50 via-orange-900/50 to-yellow-900/50 rounded-3xl p-6 md:p-8 max-w-2xl">
          <div className="text-7xl md:text-8xl mb-6">🏆</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Congratulations!</h1>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Pascal's Law Master
          </h2>
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

          <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-bold text-emerald-400 mb-2">Your Score</h3>
            <p className="text-3xl font-bold text-white">{testScore}/10</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => goToPhase('hook')}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
            >
              Explore Again
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard';
                }
              }}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-colors"
            >
              Return to Dashboard
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
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phaseOrder.indexOf(phase) >= i
                    ? 'bg-emerald-500'
                    : 'bg-slate-700'
                } ${phase === p ? 'w-6' : 'w-2'}`}
                title={phaseNames[p]}
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
