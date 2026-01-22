import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GOLD STANDARD: VENTURI EFFECT RENDERER
// Physics: Continuity (A₁v₁ = A₂v₂) + Bernoulli (P + ½ρv² = const)
// Narrow section = higher velocity = lower pressure
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'flow_rate_adjusted'
  | 'constriction_adjusted'
  | 'velocity_calculated'
  | 'pressure_calculated'
  | 'twist_prediction_made'
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
  icon: React.ReactNode;
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

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// Physics constants
const AIR_DENSITY = 1.2; // kg/m³ at sea level
const REFERENCE_PRESSURE = 100; // kPa

const VenturiEffectRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState(0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Animation states for Venturi tube
  const [flowRate, setFlowRate] = useState(50);
  const [constrictionSize, setConstrictionSize] = useState(50);
  const [showPressure, setShowPressure] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [isFlowing, setIsFlowing] = useState(true);

  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Demo', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Calculate Venturi properties using physics
  const wideVelocity = flowRate / 100 * 5; // m/s at wide section
  const areaRatio = 100 / constrictionSize; // A₁/A₂
  const narrowVelocity = wideVelocity * areaRatio; // Continuity: A₁v₁ = A₂v₂
  const widePressure = REFERENCE_PRESSURE; // kPa
  // Bernoulli: P₁ + ½ρv₁² = P₂ + ½ρv₂²
  const pressureDrop = 0.5 * AIR_DENSITY * (narrowVelocity * narrowVelocity - wideVelocity * wideVelocity) / 1000;
  const narrowPressure = Math.max(widePressure - pressureDrop, 10);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Web Audio API sound system
  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'flow' | 'whoosh') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(392, ctx.currentTime);
          oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'flow':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(120, ctx.currentTime);
          oscillator.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'whoosh':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
          oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.35);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    if (newPhase < 0 || newPhase > 9) return;
    navigationLockRef.current = true;
    playSound('transition');

    if (onPhaseComplete && newPhase > phase) {
      onPhaseComplete(phase);
    }

    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, onPhaseComplete, onGameEvent, phaseNames]);

  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'A' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'A' } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [testAnswers, playSound, onGameEvent]);

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer !== -1 && testQuestions[index].options[answer].correct) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  // 10 scenario-based test questions with explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A race car engineer is designing air intake ducts for the engine. They need to understand how air velocity changes as it moves through a narrower section of the duct.",
      question: "When air flows through a narrower pipe section at the same flow rate, what happens to its velocity?",
      options: [
        { text: "Velocity decreases proportionally to the area reduction", correct: false },
        { text: "Velocity increases to maintain constant flow rate", correct: true },
        { text: "Velocity stays the same but pressure increases", correct: false },
        { text: "Flow reverses direction in the narrow section", correct: false }
      ],
      explanation: "By the continuity equation A₁v₁ = A₂v₂, when area decreases, velocity must increase proportionally to maintain the same volumetric flow rate. This is mass conservation in action."
    },
    {
      scenario: "A medical device company is developing a new oxygen delivery mask that uses the Venturi principle to precisely mix oxygen with room air.",
      question: "The continuity equation A₁v₁ = A₂v₂ represents conservation of what quantity?",
      options: [
        { text: "Mass (volumetric flow rate for incompressible fluids)", correct: true },
        { text: "Energy in the fluid system", correct: false },
        { text: "Momentum of the flowing fluid", correct: false },
        { text: "Static pressure at all points", correct: false }
      ],
      explanation: "The continuity equation ensures mass conservation. For incompressible fluids, this means the volumetric flow rate (A×v) must be constant throughout the pipe system."
    },
    {
      scenario: "A plumber is installing a Venturi meter to measure water flow in a building's main pipe. The meter has wide inlet/outlet sections and a narrow throat in the middle.",
      question: "In a Venturi tube, where is the static pressure LOWEST?",
      options: [
        { text: "At the wide entrance section", correct: false },
        { text: "At the wide exit section", correct: false },
        { text: "At the narrow middle section (throat)", correct: true },
        { text: "Pressure is equal at all locations", correct: false }
      ],
      explanation: "By Bernoulli's principle (P + ½ρv² = constant), where velocity is highest (narrow throat), pressure must be lowest. The kinetic energy increase comes at the expense of pressure energy."
    },
    {
      scenario: "A child playing with a garden hose discovers that covering part of the nozzle with their thumb makes water spray much farther across the yard.",
      question: "Why does water spray farther when you partially cover a garden hose opening?",
      options: [
        { text: "The hose pressure increases dramatically", correct: false },
        { text: "Reducing the opening area increases exit velocity", correct: true },
        { text: "Water becomes lighter and travels farther", correct: false },
        { text: "Air resistance is reduced at the nozzle", correct: false }
      ],
      explanation: "By continuity (A₁v₁ = A₂v₂), reducing the exit area while maintaining the same flow rate forces the water velocity to increase proportionally. Higher velocity means the water travels farther."
    },
    {
      scenario: "A physics teacher demonstrates the Venturi effect by holding two sheets of paper parallel and blowing air between them. Students are surprised by the result.",
      question: "When you blow air between two parallel papers, they move together because...",
      options: [
        { text: "Moving air creates low pressure between the papers", correct: true },
        { text: "The air pushes the papers outward", correct: false },
        { text: "Static electricity attracts the papers", correct: false },
        { text: "Gravity pulls them toward the air stream", correct: false }
      ],
      explanation: "Fast-moving air between the papers creates low pressure (Venturi effect). The surrounding stationary air has higher pressure, which pushes the papers inward toward the low-pressure region."
    },
    {
      scenario: "A vintage car mechanic is explaining to an apprentice how older carburetors worked before fuel injection systems became standard.",
      question: "A carburetor uses the Venturi effect primarily to...",
      options: [
        { text: "Cool the incoming air charge", correct: false },
        { text: "Filter particles from the air", correct: false },
        { text: "Draw fuel into the air stream for mixing", correct: true },
        { text: "Increase air pressure before the engine", correct: false }
      ],
      explanation: "The narrow Venturi throat creates low pressure that draws fuel from the float bowl through a jet. This atomizes the fuel and mixes it with the incoming air in the correct ratio for combustion."
    },
    {
      scenario: "A chemical engineer is designing a pipe system where the diameter needs to be reduced by half at a certain point. They need to calculate the new velocity.",
      question: "If pipe cross-sectional area is halved (A₂ = A₁/2), the fluid velocity at the narrow section...",
      options: [
        { text: "Halves to maintain equilibrium", correct: false },
        { text: "Doubles to conserve mass flow", correct: true },
        { text: "Quadruples due to pressure effects", correct: false },
        { text: "Remains the same throughout", correct: false }
      ],
      explanation: "From A₁v₁ = A₂v₂, if A₂ = A₁/2, then v₂ = v₁(A₁/A₂) = v₁(A₁/(A₁/2)) = 2v₁. The velocity exactly doubles when area is halved."
    },
    {
      scenario: "A fluid dynamics student is studying why airplane wings generate lift and how it relates to fluid flow principles they learned about in pipe systems.",
      question: "The Venturi effect is a direct consequence of...",
      options: [
        { text: "Bernoulli's principle relating pressure and velocity", correct: true },
        { text: "Newton's third law of action-reaction", correct: false },
        { text: "Archimedes' principle of buoyancy", correct: false },
        { text: "Hooke's law of elasticity", correct: false }
      ],
      explanation: "The Venturi effect combines continuity (velocity increase in narrow sections) with Bernoulli's principle (higher velocity means lower pressure). Together they explain the pressure drop at constrictions."
    },
    {
      scenario: "A chemistry lab technician uses a Bunsen burner daily but never understood the physics behind why adjusting the air intake collar changes the flame characteristics.",
      question: "A Bunsen burner's air intake collar uses the Venturi effect to...",
      options: [
        { text: "Preheat the gas before combustion", correct: false },
        { text: "Cool the burner barrel", correct: false },
        { text: "Draw in air for premixed combustion", correct: true },
        { text: "Reduce gas consumption significantly", correct: false }
      ],
      explanation: "Gas flowing up the barrel creates low pressure at the air holes. This draws in room air, which premixes with the gas for more complete, hotter combustion with a blue flame instead of a yellow one."
    },
    {
      scenario: "A research lab uses water aspirators connected to faucets to create vacuum for filtration experiments, which surprises new students who expect vacuum pumps to need electricity.",
      question: "How does a water aspirator create vacuum without electricity?",
      options: [
        { text: "Water has special chemical properties that absorb air", correct: false },
        { text: "Fast water through a Venturi creates low pressure that pulls air", correct: true },
        { text: "The weight of falling water pulls air downward", correct: false },
        { text: "Evaporating water removes air from the system", correct: false }
      ],
      explanation: "Water flowing rapidly through the aspirator's narrow throat creates a region of low pressure (Venturi effect). This low pressure pulls air from the attached vessel, creating a vacuum without any moving electrical parts."
    }
  ];

  // 4 comprehensive transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Carburetor body */}
          <rect x="15" y="30" width="70" height="45" rx="5" fill="#4a4a4a" stroke="#666" strokeWidth="2" />
          {/* Venturi throat */}
          <path d="M25 40 L40 45 L60 45 L75 40 L75 65 L60 60 L40 60 L25 65 Z" fill="#333" />
          {/* Air flow */}
          <path d="M10 52 L90 52" stroke="#00ccff" strokeWidth="2" strokeDasharray="6,3">
            <animate attributeName="stroke-dashoffset" from="0" to="-9" dur="0.3s" repeatCount="indefinite" />
          </path>
          {/* Fuel tube */}
          <line x1="50" y1="85" x2="50" y2="60" stroke="#ff6600" strokeWidth="4" />
          <circle cx="50" cy="90" r="8" fill="#ff9933" />
          {/* Fuel droplets being drawn up */}
          <circle cx="50" cy="57" r="2" fill="#ff6600">
            <animate attributeName="cy" values="60;52;60" dur="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
          </circle>
          {/* Throttle plate */}
          <line x1="70" y1="45" x2="70" y2="60" stroke="#888" strokeWidth="3">
            <animateTransform attributeName="transform" type="rotate" values="0 70 52;15 70 52;0 70 52" dur="2s" repeatCount="indefinite" />
          </line>
        </svg>
      ),
      title: "Automotive Carburetors & Fuel Systems",
      short: "Carburetors",
      tagline: "Mixing Fuel and Air Since 1893",
      description: "Before fuel injection dominated, carburetors used the Venturi effect to precisely meter fuel into the air stream for internal combustion engines. Air flows through a carefully designed Venturi throat, creating low pressure that draws fuel from the float bowl through calibrated jets.",
      connection: "The low pressure at the Venturi throat (where air velocity is highest) creates the suction force that atomizes and draws fuel into the air stream. The degree of vacuum determines fuel flow rate.",
      howItWorks: "As air rushes through the narrow Venturi, its velocity increases and pressure drops per Bernoulli's principle. A fuel jet positioned at the throat experiences this low pressure, which draws liquid fuel upward. The high-velocity air then atomizes the fuel into fine droplets for efficient combustion.",
      stats: [
        { value: "130+", label: "Years of development" },
        { value: "50-100", label: "CFM typical flow" },
        { value: "14.7:1", label: "Stoichiometric ratio" },
        { value: "0.5-2", label: "Pressure drop (psi)" }
      ],
      examples: [
        "Vintage car restoration and maintenance",
        "Small engine applications (lawn mowers, chainsaws)",
        "Racing carburetors with multiple Venturis",
        "Aviation carburetors with altitude compensation"
      ],
      companies: ["Holley", "Edelbrock", "Weber", "Carter", "Rochester"],
      futureImpact: "While fuel injection has replaced carburetors in most modern vehicles, understanding Venturi-based fuel metering remains essential for vintage vehicle maintenance, small engines, and as a teaching tool for fluid dynamics principles.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Face outline */}
          <ellipse cx="50" cy="40" rx="28" ry="32" fill="#ffcc99" />
          {/* Eyes */}
          <ellipse cx="40" cy="32" rx="4" ry="5" fill="#333" />
          <ellipse cx="60" cy="32" rx="4" ry="5" fill="#333" />
          {/* Venturi mask */}
          <path d="M20 48 Q35 70 50 75 Q65 70 80 48 L82 55 Q65 82 50 88 Q35 82 18 55 Z" fill="#88ccff" stroke="#4488cc" strokeWidth="2" />
          {/* Venturi mechanism on side */}
          <rect x="78" y="48" width="18" height="12" rx="2" fill="#666" stroke="#888" strokeWidth="1" />
          {/* Oxygen inlet */}
          <circle cx="95" cy="54" r="4" fill="#00ff00" />
          {/* Air entrainment arrows */}
          <path d="M88 42 L85 48" stroke="#00ccff" strokeWidth="2" markerEnd="url(#arrow)">
            <animate attributeName="stroke-dashoffset" from="0" to="-4" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M88 66 L85 60" stroke="#00ccff" strokeWidth="2">
            <animate attributeName="stroke-dashoffset" from="0" to="-4" dur="0.5s" repeatCount="indefinite" />
          </path>
          {/* Mixed flow to mask */}
          <path d="M80 54 Q70 54 60 60" stroke="#88ffcc" strokeWidth="2" strokeDasharray="4,2">
            <animate attributeName="stroke-dashoffset" from="0" to="-6" dur="0.3s" repeatCount="indefinite" />
          </path>
          {/* Strap */}
          <path d="M18 55 Q10 40 20 30" stroke="#666" strokeWidth="3" fill="none" />
          <path d="M82 55 Q90 40 80 30" stroke="#666" strokeWidth="3" fill="none" />
        </svg>
      ),
      title: "Medical Venturi Masks & Oxygen Delivery",
      short: "Medical Masks",
      tagline: "Precise Oxygen Therapy Through Physics",
      description: "Venturi masks deliver precisely controlled oxygen concentrations to patients. Pure oxygen jets through a narrow orifice, creating low pressure that entrains exact amounts of room air. Different colored adaptors provide specific FiO₂ (fraction of inspired oxygen) levels.",
      connection: "The Venturi jet creates predictable low pressure that draws in ambient air at a fixed ratio. This physics-based mixing ensures accurate oxygen concentrations regardless of the patient's breathing pattern.",
      howItWorks: "High-pressure oxygen flows through a small jet orifice at high velocity. The resulting low pressure draws room air through calibrated side ports. The ratio of entrained air to oxygen is determined by the orifice size and port area, providing fixed oxygen concentrations from 24% to 60%.",
      stats: [
        { value: "24-60%", label: "FiO₂ range" },
        { value: "4-15", label: "L/min O₂ flow" },
        { value: "±1-2%", label: "Accuracy" },
        { value: "40-60", label: "L/min total flow" }
      ],
      examples: [
        "COPD patients needing precise low-flow oxygen",
        "Post-surgical recovery oxygen therapy",
        "Emergency room acute care",
        "Respiratory therapy treatments"
      ],
      companies: ["Teleflex", "Smiths Medical", "Vyaire", "Fisher & Paykel", "Intersurgical"],
      futureImpact: "Venturi masks remain the gold standard for precise oxygen delivery in patients where too much oxygen could be harmful (like COPD). Advanced designs incorporate humidity and nebulizer functions while maintaining accurate FiO₂ control.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Base */}
          <rect x="30" y="78" width="40" height="18" fill="#555" rx="3" />
          {/* Gas inlet */}
          <rect x="40" y="90" width="8" height="8" fill="#444" />
          <path d="M44 98 L44 105" stroke="#ff9900" strokeWidth="3" />
          {/* Barrel */}
          <rect x="40" y="25" width="20" height="53" fill="#777" />
          {/* Collar/air intake ring */}
          <rect x="35" y="60" width="30" height="12" fill="#555" rx="2" />
          {/* Air holes */}
          <rect x="35" y="63" width="6" height="6" fill="#222" />
          <rect x="59" y="63" width="6" height="6" fill="#222" />
          {/* Air flow arrows */}
          <path d="M25 66 L35 66" stroke="#00ccff" strokeWidth="2" strokeDasharray="4,2">
            <animate attributeName="stroke-dashoffset" from="0" to="-6" dur="0.3s" repeatCount="indefinite" />
          </path>
          <path d="M75 66 L65 66" stroke="#00ccff" strokeWidth="2" strokeDasharray="4,2">
            <animate attributeName="stroke-dashoffset" from="0" to="-6" dur="0.3s" repeatCount="indefinite" />
          </path>
          {/* Inner tube showing gas flow */}
          <line x1="50" y1="75" x2="50" y2="30" stroke="#ffcc00" strokeWidth="4" strokeDasharray="5,3">
            <animate attributeName="stroke-dashoffset" from="0" to="-8" dur="0.2s" repeatCount="indefinite" />
          </line>
          {/* Flame */}
          <ellipse cx="50" cy="15" rx="10" ry="18" fill="#ff6600" opacity="0.9">
            <animate attributeName="ry" values="18;22;18" dur="0.3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="50" cy="17" rx="5" ry="12" fill="#ffff00">
            <animate attributeName="ry" values="12;15;12" dur="0.3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="50" cy="18" rx="2" ry="6" fill="#aaddff">
            <animate attributeName="ry" values="6;8;6" dur="0.3s" repeatCount="indefinite" />
          </ellipse>
        </svg>
      ),
      title: "Bunsen Burners & Laboratory Gas Equipment",
      short: "Lab Burners",
      tagline: "Venturi-Powered Combustion Since 1855",
      description: "The Bunsen burner revolutionized laboratory work by using the Venturi effect for premixed combustion. Gas flowing up the barrel creates low pressure that draws air through adjustable ports, allowing precise control of flame temperature and characteristics.",
      connection: "Gas velocity through the barrel creates a low-pressure zone at the air intake collar. This Venturi-induced suction draws in primary air for premixing before combustion, resulting in a hotter, cleaner flame.",
      howItWorks: "Natural gas or propane flows upward through the barrel. At the adjustable collar, the gas velocity creates low pressure that entrains room air. This premixed fuel-air combination burns more completely at the top, producing a hot blue flame. Closing the collar reduces air intake, producing a cooler yellow flame.",
      stats: [
        { value: "1500°C", label: "Max flame temp" },
        { value: "1855", label: "Year invented" },
        { value: "40-60%", label: "Air entrainment" },
        { value: "2-5", label: "cm flame height" }
      ],
      examples: [
        "Chemistry laboratory heating and sterilization",
        "Glass bending and tube working",
        "Microbiology inoculation loop sterilization",
        "Industrial torch and burner designs"
      ],
      companies: ["Fisher Scientific", "Eisco Labs", "Humboldt", "Kimble", "United Scientific"],
      futureImpact: "The Bunsen burner principle extends to industrial burners, gas stoves, and furnaces. Understanding Venturi-based air entrainment is essential for designing efficient, clean-burning combustion systems with minimal emissions.",
      color: "from-yellow-600 to-orange-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Water inlet pipe */}
          <rect x="5" y="35" width="30" height="14" fill="#4488cc" />
          {/* Venturi body */}
          <path d="M35 30 L50 42 L75 42 L90 30 L90 54 L75 42 L50 42 L35 54 Z" fill="#666" stroke="#888" strokeWidth="2" />
          {/* Water outlet */}
          <rect x="90" y="37" width="8" height="10" fill="#4488cc" />
          {/* Water drain down */}
          <path d="M95 47 L95 75" stroke="#4488cc" strokeWidth="6" />
          <path d="M90 75 L100 75 L95 85 Z" fill="#4488cc" />
          {/* Vacuum port going up */}
          <rect x="58" y="15" width="8" height="27" fill="#555" />
          {/* Flask attachment */}
          <circle cx="62" cy="12" r="8" fill="#aaa" stroke="#888" strokeWidth="2" />
          {/* Water flow animation */}
          <path d="M10 42 L85 42" stroke="#00ccff" strokeWidth="3" strokeDasharray="8,4">
            <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="0.25s" repeatCount="indefinite" />
          </path>
          {/* Suction effect arrows */}
          <path d="M55 18 L60 28" stroke="#ff6666" strokeWidth="2">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M69 18 L64 28" stroke="#ff6666" strokeWidth="2">
            <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
          </path>
          {/* Vacuum label */}
          <text x="62" y="8" fontSize="8" fill="#ff6666" textAnchor="middle" fontWeight="bold">VAC</text>
          {/* Drain label */}
          <text x="95" y="92" fontSize="7" fill="#4488cc" textAnchor="middle">drain</text>
        </svg>
      ),
      title: "Water Aspirators & Vacuum Systems",
      short: "Aspirators",
      tagline: "Creating Vacuum with Running Water",
      description: "Water aspirators generate laboratory vacuum using only flowing tap water. The Venturi effect creates low pressure that can pull air from flasks and vessels, enabling filtration and evaporation without electrical vacuum pumps.",
      connection: "Water accelerating through the narrow throat creates a low-pressure region per Bernoulli's principle. A side port in this region connects to the vessel being evacuated, pulling air into the water stream.",
      howItWorks: "Tap water enters the aspirator and accelerates through a constricted throat. The high velocity creates low pressure (often reaching 10-25 mmHg absolute). A side arm connected to this low-pressure zone evacuates air from attached flasks. The air-water mixture exits down the drain.",
      stats: [
        { value: "10-25", label: "mmHg vacuum" },
        { value: "0", label: "Electricity needed" },
        { value: "97%", label: "Pressure reduction" },
        { value: "5-15", label: "L/min water use" }
      ],
      examples: [
        "Vacuum filtration in chemistry labs",
        "Rotary evaporator vacuum source",
        "Degassing liquids and removing dissolved air",
        "Simple distillation under reduced pressure"
      ],
      companies: ["Chemglass", "Ace Glass", "SP Scienceware", "Corning", "DWK Life Sciences"],
      futureImpact: "While mechanical vacuum pumps offer deeper vacuum, water aspirators remain valuable for their simplicity, low cost, and safety. Modern designs improve efficiency and include water recirculation to reduce consumption.",
      color: "from-teal-600 to-green-600"
    }
  ];

  // Twist animation component
  const TwistAnimation: React.FC = () => {
    const [paperGap, setPaperGap] = useState(40);
    const [isBlowing, setIsBlowing] = useState(false);

    const startBlowing = useCallback(() => {
      if (isBlowing) return;
      setIsBlowing(true);
      setPaperGap(40);
      playSound('whoosh');

      let t = 0;
      const interval = setInterval(() => {
        t += 0.1;
        setPaperGap(40 - Math.sin(t) * 28);

        if (t >= Math.PI) {
          clearInterval(interval);
          setIsBlowing(false);
          setPaperGap(40);
        }
      }, 50);
    }, [isBlowing]);

    return (
      <div className="flex flex-col items-center">
        <p className="text-slate-300 mb-4 text-center max-w-md">
          Hold two sheets of paper parallel and blow between them. Watch what happens!
        </p>

        <div className="relative w-full max-w-md h-48 bg-gradient-to-b from-purple-900/30 to-slate-900/50 rounded-xl overflow-hidden">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            {/* Face */}
            <circle cx="50" cy="100" r="35" fill="#ffcc99" />
            <ellipse cx="38" cy="88" rx="5" ry="7" fill="#333" />
            <ellipse cx="55" cy="88" rx="5" ry="7" fill="#333" />
            {/* Puckered lips */}
            <ellipse cx="75" cy="100" rx="8" ry="5" fill="#cc8877" />
            <ellipse cx="78" cy="100" rx="4" ry="2" fill="#aa6655" />

            {/* Air stream when blowing */}
            {isBlowing && (
              <>
                <path d="M90 100 Q200 95 320 100" stroke="#00ccff" strokeWidth="15" fill="none" opacity="0.3">
                  <animate attributeName="stroke-dasharray" values="0,400;400,0" dur="0.4s" repeatCount="indefinite" />
                </path>
                <path d="M90 100 Q200 100 320 100" stroke="#00aaff" strokeWidth="8" fill="none" opacity="0.5">
                  <animate attributeName="stroke-dasharray" values="0,400;400,0" dur="0.3s" repeatCount="indefinite" />
                </path>
              </>
            )}

            {/* Left paper */}
            <rect
              x="140"
              y={100 - paperGap}
              width="120"
              height="6"
              fill="white"
              transform={`rotate(-3 200 ${100 - paperGap})`}
              rx="1"
            />

            {/* Right paper */}
            <rect
              x="140"
              y={100 + paperGap - 6}
              width="120"
              height="6"
              fill="white"
              transform={`rotate(3 200 ${100 + paperGap})`}
              rx="1"
            />

            {/* Pressure labels when blowing */}
            {isBlowing && (
              <>
                <text x="200" y="102" fontSize="12" fill="#00ccff" textAnchor="middle" fontWeight="bold">LOW P</text>
                <text x="200" y={100 - paperGap - 12} fontSize="10" fill="#ff6666" textAnchor="middle">HIGH P ↓</text>
                <text x="200" y={100 + paperGap + 18} fontSize="10" fill="#ff6666" textAnchor="middle">↑ HIGH P</text>
              </>
            )}

            {/* Instructions */}
            {!isBlowing && (
              <text x="280" y="100" fontSize="14" fill="#aaa" textAnchor="middle">
                Click to blow!
              </text>
            )}
          </svg>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); startBlowing(); }}
          disabled={isBlowing}
          className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-colors"
        >
          {isBlowing ? 'Blowing...' : 'Blow Between Papers'}
        </button>

        <p className="text-slate-400 text-sm mt-2">
          The papers come together - not apart!
        </p>
      </div>
    );
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: // Hook
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            {/* Premium Badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-teal-400/80 text-sm font-medium tracking-wide uppercase">Fluid Dynamics</span>
            </div>

            {/* Gradient Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-teal-100 to-green-200 bg-clip-text text-transparent">
              The Garden Hose Trick
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-lg mb-8">
              Why does water shoot farther when you cover the nozzle?
            </p>

            {/* Premium Card */}
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 max-w-lg border border-slate-700/50 shadow-2xl mb-6">
              <div className="relative w-full h-64 bg-gradient-to-b from-green-900/30 to-slate-900/50 rounded-xl overflow-hidden">
                <svg viewBox="0 0 400 300" className="w-full h-full">
                  {/* Background - garden scene */}
                  <rect x="0" y="250" width="400" height="50" fill="#2d5a27" />
                  <rect x="0" y="0" width="400" height="250" fill="url(#skyGradient)" />
                  <defs>
                    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#87CEEB" />
                      <stop offset="100%" stopColor="#98FB98" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>

                  {/* Sun */}
                  <circle cx="350" cy="50" r="30" fill="#FFD700" opacity="0.8" />

                  {/* Person holding hose */}
                  <g transform="translate(60, 140)">
                    <circle cx="0" cy="0" r="22" fill="#ffcc99" /> {/* Head */}
                    <ellipse cx="-6" cy="-5" rx="3" ry="4" fill="#333" /> {/* Eye */}
                    <ellipse cx="6" cy="-5" rx="3" ry="4" fill="#333" /> {/* Eye */}
                    <path d="M-5 8 Q0 12 5 8" stroke="#333" strokeWidth="2" fill="none" /> {/* Smile */}
                    <rect x="-18" y="22" width="36" height="65" fill="#3366cc" rx="8" /> {/* Body */}
                    <line x1="-18" y1="87" x2="-22" y2="130" stroke="#3366cc" strokeWidth="12" strokeLinecap="round" />
                    <line x1="18" y1="87" x2="22" y2="130" stroke="#3366cc" strokeWidth="12" strokeLinecap="round" />
                    {/* Arms */}
                    <line x1="18" y1="35" x2="55" y2="55" stroke="#ffcc99" strokeWidth="10" strokeLinecap="round" />
                    {/* Thumb over hose */}
                    <ellipse cx="75" cy="55" rx="8" ry="6" fill="#ffcc99" />
                  </g>

                  {/* Hose */}
                  <path d="M115 195 Q160 200 190 180 Q230 155 280 155" stroke="#228B22" strokeWidth="14" fill="none" strokeLinecap="round" />

                  {/* Hose nozzle */}
                  <path d="M280 155 L310 155 L318 150 L318 160 L310 155" fill="#444" stroke="#333" strokeWidth="2" />

                  {/* Water stream - powerful spray */}
                  <path d="M318 155 Q350 145 380 165 Q350 200 300 260" fill="none" stroke="#00ccff" strokeWidth="10" opacity="0.6">
                    <animate attributeName="d" values="M318 155 Q350 145 380 165 Q350 200 300 260;M318 155 Q355 140 385 170 Q355 210 305 265;M318 155 Q350 145 380 165 Q350 200 300 260" dur="0.4s" repeatCount="indefinite" />
                  </path>
                  <path d="M318 155 Q345 150 375 175 Q340 220 280 270" fill="none" stroke="#00aaff" strokeWidth="5" opacity="0.4">
                    <animate attributeName="d" values="M318 155 Q345 150 375 175 Q340 220 280 270;M318 155 Q350 145 380 180 Q345 225 285 275;M318 155 Q345 150 375 175 Q340 220 280 270" dur="0.4s" repeatCount="indefinite" />
                  </path>

                  {/* Water droplets */}
                  {[0, 1, 2].map(i => (
                    <circle key={i} cx={340 + i * 15} cy={175 + i * 20} r="4" fill="#00ccff" opacity="0.7">
                      <animate attributeName="cy" values={`${175 + i * 20};${195 + i * 25};${175 + i * 20}`} dur={`${0.6 + i * 0.2}s`} repeatCount="indefinite" />
                      <animate attributeName="cx" values={`${340 + i * 15};${350 + i * 15};${340 + i * 15}`} dur={`${0.6 + i * 0.2}s`} repeatCount="indefinite" />
                    </circle>
                  ))}

                  {/* Question bubble */}
                  <rect x="140" y="15" width="220" height="35" rx="10" fill="white" opacity="0.9" />
                  <text x="250" y="38" fontSize="14" fill="#333" textAnchor="middle" fontWeight="bold">
                    Why does covering the hose work?
                  </text>
                </svg>
              </div>
              <p className="text-xl text-slate-200 mt-4 mb-3">
                You cover part of a garden hose with your thumb. The water <span className="text-teal-400 font-bold">shoots out faster</span> and reaches farther!
              </p>
              <p className="text-lg text-green-300">
                What makes fluid speed up when the opening gets smaller?
              </p>
            </div>

            {/* Premium CTA Button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
              className="group px-8 py-4 bg-gradient-to-r from-teal-600 to-green-600 text-white text-lg font-semibold rounded-2xl hover:from-teal-500 hover:to-green-500 transition-all duration-300 shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                Discover the Venturi Effect
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Subtle hint text */}
            <p className="text-slate-500 text-sm mt-4">
              Tap to explore pressure and velocity relationships
            </p>
          </div>
        );

      case 1: // Predict
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              Water flows through a pipe that narrows in the middle. If the <span className="text-cyan-400 font-bold">same amount of water</span> must pass through both sections every second, what happens to the water <span className="text-teal-400 font-bold">speed</span> in the narrow section?
            </p>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Speed stays the same - water is incompressible' },
                { id: 'B', text: 'Speed increases - same volume, smaller area' },
                { id: 'C', text: 'Speed decreases - narrow section slows flow' },
                { id: 'D', text: 'Water stops flowing at the narrow section' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                  disabled={showPredictionFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'B'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-md">
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'B' ? 'text-green-400' : 'text-teal-400'}`}>
                  {selectedPrediction === 'B' ? '✓ Correct!' : 'Think about conservation!'}
                </p>
                <p className="text-slate-300 mb-3">
                  This is the <span className="text-teal-400 font-bold">continuity equation</span>: A₁v₁ = A₂v₂
                </p>
                <p className="text-slate-400 text-sm">
                  Smaller area means higher velocity to maintain the same flow rate. Mass is conserved!
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
                  className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
                >
                  Explore the Venturi Tube
                </button>
              </div>
            )}
          </div>
        );

      case 2: // Play/Explore
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-4">Venturi Tube Simulator</h2>

            <div className="relative w-full max-w-lg h-72 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                {/* Venturi tube shape */}
                <path
                  d={`M20 100 L100 100 Q150 100 180 ${100 + (50 - constrictionSize) * 0.6} L220 ${100 + (50 - constrictionSize) * 0.6} Q250 100 300 100 L380 100 L380 200 L300 200 Q250 200 220 ${200 - (50 - constrictionSize) * 0.6} L180 ${200 - (50 - constrictionSize) * 0.6} Q150 200 100 200 L20 200 Z`}
                  fill="#3a5a7c"
                  stroke="#5588aa"
                  strokeWidth="3"
                />

                {/* Flow lines animation */}
                {isFlowing && (
                  <>
                    {/* Wide section - slower, spread out */}
                    {[130, 150, 170].map((y, i) => (
                      <line
                        key={`left-${i}`}
                        x1="30"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="#00ccff"
                        strokeWidth="4"
                        strokeDasharray="15,10"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-25" dur={`${1.5 / (flowRate / 50)}s`} repeatCount="indefinite" />
                      </line>
                    ))}

                    {/* Narrow section - faster, compressed */}
                    {[140 + (50 - constrictionSize) * 0.4, 150, 160 - (50 - constrictionSize) * 0.4].map((y, i) => (
                      <line
                        key={`middle-${i}`}
                        x1="175"
                        y1={y}
                        x2="225"
                        y2={y}
                        stroke="#00ffff"
                        strokeWidth="2"
                        strokeDasharray="10,5"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-15" dur={`${0.5 / (flowRate / 50) / areaRatio}s`} repeatCount="indefinite" />
                      </line>
                    ))}

                    {/* Wide section right - slower again */}
                    {[130, 150, 170].map((y, i) => (
                      <line
                        key={`right-${i}`}
                        x1="300"
                        y1={y}
                        x2="370"
                        y2={y}
                        stroke="#00ccff"
                        strokeWidth="4"
                        strokeDasharray="15,10"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-25" dur={`${1.5 / (flowRate / 50)}s`} repeatCount="indefinite" />
                      </line>
                    ))}
                  </>
                )}

                {/* Pressure indicators (manometer tubes) */}
                {showPressure && (
                  <>
                    {/* Left (wide) pressure */}
                    <rect x="55" y="55" width="14" height="45" fill="#224466" stroke="#335577" strokeWidth="2" rx="2" />
                    <rect x="57" y={100 - widePressure * 0.4} width="10" height={widePressure * 0.4} fill="#ff6666" rx="1" />
                    <text x="62" y="48" fontSize="11" fill="#ff6666" textAnchor="middle" fontWeight="bold">P₁</text>

                    {/* Middle (narrow) pressure */}
                    <rect x="193" y="35" width="14" height="55" fill="#224466" stroke="#335577" strokeWidth="2" rx="2" />
                    <rect x="195" y={90 - Math.max(narrowPressure, 10) * 0.45} width="10" height={Math.max(narrowPressure, 10) * 0.45} fill="#6666ff" rx="1" />
                    <text x="200" y="28" fontSize="11" fill="#6666ff" textAnchor="middle" fontWeight="bold">P₂</text>

                    {/* Right (wide) pressure */}
                    <rect x="331" y="55" width="14" height="45" fill="#224466" stroke="#335577" strokeWidth="2" rx="2" />
                    <rect x="333" y={100 - widePressure * 0.4} width="10" height={widePressure * 0.4} fill="#ff6666" rx="1" />
                    <text x="338" y="48" fontSize="11" fill="#ff6666" textAnchor="middle" fontWeight="bold">P₃</text>
                  </>
                )}

                {/* Velocity arrows */}
                {showVelocity && (
                  <>
                    {/* Left velocity */}
                    <line x1="50" y1="230" x2={50 + wideVelocity * 12} y2="230" stroke="#00ff00" strokeWidth="4" />
                    <polygon points={`${55 + wideVelocity * 12},230 ${45 + wideVelocity * 12},224 ${45 + wideVelocity * 12},236`} fill="#00ff00" />
                    <text x="60" y="255" fontSize="11" fill="#00ff00" fontWeight="bold">v₁ = {wideVelocity.toFixed(1)} m/s</text>

                    {/* Middle velocity */}
                    <line x1="165" y1="230" x2={165 + Math.min(narrowVelocity, 18) * 6} y2="230" stroke="#00ffff" strokeWidth="4" />
                    <polygon points={`${170 + Math.min(narrowVelocity, 18) * 6},230 ${160 + Math.min(narrowVelocity, 18) * 6},224 ${160 + Math.min(narrowVelocity, 18) * 6},236`} fill="#00ffff" />
                    <text x="175" y="255" fontSize="11" fill="#00ffff" fontWeight="bold">v₂ = {narrowVelocity.toFixed(1)} m/s</text>

                    {/* Right velocity */}
                    <line x1="305" y1="230" x2={305 + wideVelocity * 12} y2="230" stroke="#00ff00" strokeWidth="4" />
                    <polygon points={`${310 + wideVelocity * 12},230 ${300 + wideVelocity * 12},224 ${300 + wideVelocity * 12},236`} fill="#00ff00" />
                    <text x="315" y="255" fontSize="11" fill="#00ff00" fontWeight="bold">v₃ = {wideVelocity.toFixed(1)} m/s</text>
                  </>
                )}

                {/* Section labels */}
                <text x="62" y="285" fontSize="12" fill="#aaa" textAnchor="middle">Wide</text>
                <text x="200" y="285" fontSize="12" fill="#aaa" textAnchor="middle">Narrow</text>
                <text x="338" y="285" fontSize="12" fill="#aaa" textAnchor="middle">Wide</text>
              </svg>
            </div>

            {/* Controls */}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 w-full max-w-lg mb-4`}>
              <div className="bg-slate-800 p-4 rounded-xl">
                <label className="text-slate-300 text-sm block mb-2">Flow Rate: {flowRate}%</label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={flowRate}
                  onChange={(e) => {
                    setFlowRate(Number(e.target.value));
                    onGameEvent?.({ type: 'flow_rate_adjusted', data: { flowRate: Number(e.target.value) } });
                  }}
                  className="w-full accent-teal-500"
                />
              </div>
              <div className="bg-slate-800 p-4 rounded-xl">
                <label className="text-slate-300 text-sm block mb-2">Constriction: {constrictionSize}% of original</label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={constrictionSize}
                  onChange={(e) => {
                    setConstrictionSize(Number(e.target.value));
                    onGameEvent?.({ type: 'constriction_adjusted', data: { constriction: Number(e.target.value), areaRatio } });
                  }}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>

            {/* Stats display */}
            <div className="grid grid-cols-4 gap-2 w-full max-w-lg mb-4">
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-green-400 text-xl font-bold">{wideVelocity.toFixed(1)}</div>
                <div className="text-slate-400 text-xs">v₁ (m/s)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-cyan-400 text-xl font-bold">{narrowVelocity.toFixed(1)}</div>
                <div className="text-slate-400 text-xs">v₂ (m/s)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-red-400 text-xl font-bold">{widePressure.toFixed(0)}</div>
                <div className="text-slate-400 text-xs">P₁ (kPa)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-blue-400 text-xl font-bold">{narrowPressure.toFixed(0)}</div>
                <div className="text-slate-400 text-xs">P₂ (kPa)</div>
              </div>
            </div>

            {/* Toggle controls */}
            <div className="flex gap-4 mb-4 flex-wrap justify-center">
              <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPressure}
                  onChange={(e) => setShowPressure(e.target.checked)}
                  className="accent-teal-500"
                />
                Show Pressure
              </label>
              <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVelocity}
                  onChange={(e) => setShowVelocity(e.target.checked)}
                  className="accent-teal-500"
                />
                Show Velocity
              </label>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsFlowing(!isFlowing);
                  playSound('flow');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isFlowing ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white transition-colors`}
              >
                {isFlowing ? 'Stop Flow' : 'Start Flow'}
              </button>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
            >
              Review the Physics
            </button>
          </div>
        );

      case 3: // Review
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-6">The Venturi Effect Explained</h2>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 max-w-2xl mb-6`}>
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-3">Continuity Equation</h3>
                <div className="bg-slate-900 p-4 rounded-lg text-center mb-3">
                  <span className="text-teal-400 font-mono text-2xl">A₁v₁ = A₂v₂</span>
                </div>
                <p className="text-slate-300 text-sm">
                  <span className="text-green-400 font-bold">Mass conservation:</span> If area decreases, velocity must increase to keep the same flow rate (volume/time).
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-blue-400 mb-3">Bernoulli&apos;s Principle</h3>
                <div className="bg-slate-900 p-4 rounded-lg text-center mb-3">
                  <span className="text-cyan-400 font-mono text-2xl">P + ½ρv² = const</span>
                </div>
                <p className="text-slate-300 text-sm">
                  <span className="text-blue-400 font-bold">Energy conservation:</span> Higher velocity means lower pressure. Kinetic energy up = pressure energy down.
                </p>
              </div>

              <div className={`bg-gradient-to-r from-teal-900/50 to-green-900/50 p-5 rounded-xl ${isMobile ? '' : 'col-span-2'}`}>
                <h3 className="text-lg font-bold text-teal-400 mb-4">The Complete Picture</h3>
                <div className="flex justify-around items-center mb-4 flex-wrap gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <div className="w-12 h-12 bg-blue-500/30 rounded-full" />
                    </div>
                    <div className="text-slate-300 text-sm font-medium">Wide Section</div>
                    <div className="text-green-400 text-xs">Slow velocity</div>
                    <div className="text-red-400 text-xs">High pressure</div>
                  </div>
                  <div className="text-3xl text-slate-500">→</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <div className="w-6 h-12 bg-cyan-500/50 rounded-full" />
                    </div>
                    <div className="text-slate-300 text-sm font-medium">Narrow Section</div>
                    <div className="text-cyan-400 text-xs">Fast velocity</div>
                    <div className="text-blue-400 text-xs">Low pressure</div>
                  </div>
                  <div className="text-3xl text-slate-500">→</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <div className="w-12 h-12 bg-blue-500/30 rounded-full" />
                    </div>
                    <div className="text-slate-300 text-sm font-medium">Wide Section</div>
                    <div className="text-green-400 text-xs">Slow velocity</div>
                    <div className="text-red-400 text-xs">High pressure</div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm text-center">
                  The low pressure at the narrow section can be used to draw in other fluids - the basis for carburetors, aspirators, and more!
                </p>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all"
            >
              Ready for the Twist?
            </button>
          </div>
        );

      case 4: // Twist Predict
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist: Two Sheets of Paper</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                You hold two sheets of paper parallel to each other, about an inch apart, and blow <span className="text-cyan-400 font-bold">between</span> them.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                What happens to the papers?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'They move TOGETHER - low pressure between them' },
                { id: 'B', text: 'They move APART - air pushes them away' },
                { id: 'C', text: 'They stay still - air goes straight through' },
                { id: 'D', text: 'Only the front paper moves' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                  disabled={showTwistFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'A'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl max-w-md">
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'A' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'A' ? '✓ Exactly right!' : 'Counter-intuitive, but true!'}
                </p>
                <p className="text-slate-300">
                  The fast-moving air between the papers creates <span className="text-cyan-400 font-bold">low pressure</span> (Venturi effect).
                  The higher pressure on the outer sides pushes the papers <span className="text-purple-400 font-bold">together</span>!
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                >
                  See the Demo
                </button>
              </div>
            )}
          </div>
        );

      case 5: // Twist Play/Demo
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Papers Pulled Together</h2>
            <TwistAnimation />
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
              className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
            >
              Understand Why
            </button>
          </div>
        );

      case 6: // Twist Review
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Venturi Effect Everywhere</h2>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 rounded-xl max-w-lg mb-6">
              <h3 className="text-lg font-bold text-pink-400 mb-4">Pressure Difference in Action</h3>

              <div className="space-y-3 text-sm">
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400" />
                    <span className="text-cyan-400 font-bold">Between the papers:</span>
                  </div>
                  <p className="text-slate-300">Fast-moving air = <span className="text-cyan-400">Low pressure</span></p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-red-400 font-bold">Outside the papers:</span>
                  </div>
                  <p className="text-slate-300">Still air = <span className="text-red-400">Normal (high) pressure</span></p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-green-400 font-bold">Result:</span>
                  </div>
                  <p className="text-slate-300">Higher outside pressure <span className="text-green-400">pushes papers inward!</span></p>
                </div>
              </div>

              <p className="text-slate-400 text-xs mt-4 text-center">
                This same principle explains why trains create suction as they pass and why shower curtains blow inward!
              </p>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all"
            >
              See Real-World Applications
            </button>
          </div>
        );

      case 7: // Transfer
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {transferApps.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? `bg-gradient-to-r ${app.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.short}
                </button>
              ))}
            </div>

            <div className={`bg-gradient-to-r ${transferApps[activeAppTab].color} p-1 rounded-xl w-full max-w-2xl`}>
              <div className="bg-slate-900 p-6 rounded-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 flex-shrink-0">
                    {transferApps[activeAppTab].icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{transferApps[activeAppTab].title}</h3>
                    <p className="text-slate-400 text-sm italic">{transferApps[activeAppTab].tagline}</p>
                  </div>
                </div>

                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-teal-400 font-bold mb-2">Physics Connection</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].connection}</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-cyan-400 font-bold mb-2">How It Works</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].howItWorks}</p>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {transferApps[activeAppTab].stats.map((stat, i) => (
                    <div key={i} className="bg-slate-800 p-2 rounded-lg text-center">
                      <div className="text-white font-bold text-lg">{stat.value}</div>
                      <div className="text-slate-400 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <h4 className="text-green-400 font-bold mb-2 text-sm">Applications</h4>
                  <div className="flex flex-wrap gap-2">
                    {transferApps[activeAppTab].examples.map((ex, i) => (
                      <span key={i} className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300">{ex}</span>
                    ))}
                  </div>
                </div>

                {!completedApps.has(activeAppTab) && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                  >
                    Mark as Understood ✓
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">
              Completed: {completedApps.size} / {transferApps.length}
            </p>

            {completedApps.size >= 3 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white font-bold rounded-xl transition-all"
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        );

      case 8: // Test
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-6">Knowledge Test</h2>

            <div className="w-full max-w-2xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm mb-2 italic">{q.scenario}</p>
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {q.question}</p>
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                        disabled={showTestResults}
                        className={`p-3 rounded-lg text-sm text-left transition-all ${
                          showTestResults && option.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex && !option.correct
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                  {showTestResults && (
                    <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-slate-300 text-sm">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTestResults(true);
                  playSound('complete');
                  onGameEvent?.({ type: 'test_completed', data: { score: calculateTestScore() } });
                }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-teal-400 mb-2">
                  Score: {calculateTestScore()} / 10
                </p>
                <p className={`text-lg ${calculateTestScore() >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {calculateTestScore() >= 9 ? 'Outstanding! You\'ve mastered the Venturi effect!' :
                   calculateTestScore() >= 7 ? 'Great job! You understand the key concepts!' :
                   'Keep learning! Try reviewing the material and simulations again.'}
                </p>
                {calculateTestScore() >= 7 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all"
                  >
                    Claim Your Mastery Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 9: // Mastery
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-8xl mb-6">💨</div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-green-400 mb-4">
              Venturi Effect Master!
            </h2>
            <div className="bg-gradient-to-r from-teal-600/20 to-green-600/20 border-2 border-teal-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You&apos;ve mastered the principles of fluid flow and pressure!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span><span className="text-teal-400 font-mono">A₁v₁ = A₂v₂</span> - Continuity (mass conservation)</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Narrow section = faster velocity</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span><span className="text-cyan-400 font-mono">P + ½ρv² = const</span> - Bernoulli&apos;s principle</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Faster velocity = lower pressure</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <span>Applications: carburetors, aspirators, masks, burners</span>
                </p>
              </div>
            </div>
            <p className="text-teal-400 font-medium text-lg">
              Now you understand why covering a hose makes water shoot farther!
            </p>
            <div className="mt-6 flex gap-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Start Over
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors"
              >
                Explore More
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden text-white">
      {/* Premium gradient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Premium Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Venturi Effect</span>
          <div className="flex gap-1.5">
            {phaseNames.map((name, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i ? 'bg-teal-400 w-6' : phase > i ? 'bg-teal-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={name}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">{phaseNames[phase]}</span>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 pt-16 pb-20">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default VenturiEffectRenderer;
