import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GOLD STANDARD: VENTURI EFFECT RENDERER
// Physics: Continuity (A1v1 = A2v2) + Bernoulli (P + 1/2 pv^2 = const)
// Narrow section = higher velocity = lower pressure
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Physics constants
const AIR_DENSITY = 1.2; // kg/m^3 at sea level
const REFERENCE_PRESSURE = 100; // kPa

const VenturiEffectRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Animation states for Venturi tube
  const [flowRate, setFlowRate] = useState(50);
  const [constrictionSize, setConstrictionSize] = useState(50);
  const [showPressure, setShowPressure] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [isFlowing, setIsFlowing] = useState(true);

  // Twist play state - Venturi meter simulation
  const [meterFlowRate, setMeterFlowRate] = useState(50);
  const [showMeterReadings, setShowMeterReadings] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);

  const phaseNames: Record<Phase, string> = {
    'hook': 'Hook',
    'predict': 'Predict',
    'play': 'Explore',
    'review': 'Review',
    'twist_predict': 'Twist Predict',
    'twist_play': 'Twist Demo',
    'twist_review': 'Twist Review',
    'transfer': 'Transfer',
    'test': 'Test',
    'mastery': 'Mastery'
  };

  // Calculate Venturi properties using physics
  const wideVelocity = flowRate / 100 * 5; // m/s at wide section
  const areaRatio = 100 / constrictionSize; // A1/A2
  const narrowVelocity = wideVelocity * areaRatio; // Continuity: A1v1 = A2v2
  const widePressure = REFERENCE_PRESSURE; // kPa
  // Bernoulli: P1 + 1/2 pv1^2 = P2 + 1/2 pv2^2
  const pressureDrop = 0.5 * AIR_DENSITY * (narrowVelocity * narrowVelocity - wideVelocity * wideVelocity) / 1000;
  const narrowPressure = Math.max(widePressure - pressureDrop, 10);

  // Venturi meter calculations
  const meterWideVelocity = meterFlowRate / 100 * 5;
  const meterNarrowVelocity = meterWideVelocity * 2; // Fixed 2:1 area ratio
  const meterPressureDrop = 0.5 * AIR_DENSITY * (meterNarrowVelocity * meterNarrowVelocity - meterWideVelocity * meterWideVelocity) / 1000;
  const meterNarrowPressure = Math.max(REFERENCE_PRESSURE - meterPressureDrop, 10);
  const calculatedFlowRate = Math.sqrt(2 * meterPressureDrop * 1000 / AIR_DENSITY) / 2 * 100 / 5;

  // Responsive check
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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');

    if (onPhaseComplete) {
      const currentIndex = phaseOrder.indexOf(phase);
      const newIndex = phaseOrder.indexOf(newPhase);
      if (newIndex > currentIndex) {
        onPhaseComplete(phase);
      }
    }

    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });
  }, [phase, playSound, onPhaseComplete, onGameEvent, phaseNames]);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'A' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'A' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });
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
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
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
      explanation: "By the continuity equation A1v1 = A2v2, when area decreases, velocity must increase proportionally to maintain the same volumetric flow rate. This is mass conservation in action."
    },
    {
      scenario: "A medical device company is developing a new oxygen delivery mask that uses the Venturi principle to precisely mix oxygen with room air.",
      question: "The continuity equation A1v1 = A2v2 represents conservation of what quantity?",
      options: [
        { text: "Mass (volumetric flow rate for incompressible fluids)", correct: true },
        { text: "Energy in the fluid system", correct: false },
        { text: "Momentum of the flowing fluid", correct: false },
        { text: "Static pressure at all points", correct: false }
      ],
      explanation: "The continuity equation ensures mass conservation. For incompressible fluids, this means the volumetric flow rate (A x v) must be constant throughout the pipe system."
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
      explanation: "By Bernoulli's principle (P + 1/2 pv^2 = constant), where velocity is highest (narrow throat), pressure must be lowest. The kinetic energy increase comes at the expense of pressure energy."
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
      explanation: "By continuity (A1v1 = A2v2), reducing the exit area while maintaining the same flow rate forces the water velocity to increase proportionally. Higher velocity means the water travels farther."
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
      question: "If pipe cross-sectional area is halved (A2 = A1/2), the fluid velocity at the narrow section...",
      options: [
        { text: "Halves to maintain equilibrium", correct: false },
        { text: "Doubles to conserve mass flow", correct: true },
        { text: "Quadruples due to pressure effects", correct: false },
        { text: "Remains the same throughout", correct: false }
      ],
      explanation: "From A1v1 = A2v2, if A2 = A1/2, then v2 = v1(A1/A2) = v1(A1/(A1/2)) = 2v1. The velocity exactly doubles when area is halved."
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
          {/* Spray bottle body */}
          <rect x="30" y="40" width="40" height="55" rx="5" fill="#3388ff" />
          <rect x="35" y="45" width="30" height="45" rx="3" fill="#55aaff" opacity="0.5" />
          {/* Nozzle assembly */}
          <rect x="42" y="20" width="16" height="25" fill="#666" />
          <rect x="38" y="32" width="24" height="10" rx="2" fill="#888" />
          {/* Spray head */}
          <ellipse cx="50" cy="18" rx="12" ry="6" fill="#444" />
          <circle cx="50" cy="15" r="4" fill="#333" />
          {/* Trigger */}
          <path d="M58 35 Q70 40 68 50 L58 45 Z" fill="#ff6600" />
          {/* Spray mist */}
          <g opacity="0.6">
            <circle cx="50" cy="8" r="2" fill="#88ccff">
              <animate attributeName="cy" values="8;-5;8" dur="0.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="45" cy="5" r="1.5" fill="#88ccff">
              <animate attributeName="cy" values="5;-8;5" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="cx" values="45;40;45" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="55" cy="5" r="1.5" fill="#88ccff">
              <animate attributeName="cy" values="5;-8;5" dur="0.5s" repeatCount="indefinite" />
              <animate attributeName="cx" values="55;60;55" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </g>
          {/* Internal tube */}
          <line x1="50" y1="40" x2="50" y2="85" stroke="#333" strokeWidth="2" />
        </svg>
      ),
      title: "Atomizers & Spray Systems",
      short: "Atomizers",
      tagline: "Creating Fine Mists Through Physics",
      description: "Atomizers use the Venturi effect to break liquids into fine droplets. From perfume sprayers to paint guns, high-velocity air creates low pressure that draws liquid up a tube and shatters it into a mist of tiny particles.",
      connection: "Fast-moving air across the top of a tube creates a pressure drop (Bernoulli). This suction lifts liquid up the tube. When the liquid meets the high-velocity air stream, it's sheared into fine droplets.",
      howItWorks: "Squeezing the trigger forces air through a narrow nozzle at high velocity. This creates low pressure at the liquid tube opening, drawing fluid upward. The high-speed air stream then atomizes the liquid into a fine spray of droplets, with size controlled by air velocity.",
      stats: [
        { value: "10-100", label: "Micron droplet size" },
        { value: "1-5", label: "PSI pressure drop" },
        { value: "90%+", label: "Transfer efficiency" },
        { value: "0.1-10", label: "ml/min flow rate" }
      ],
      examples: [
        "Perfume and cologne sprayers",
        "Medical nebulizers for drug delivery",
        "HVLP paint spray guns",
        "Agricultural crop sprayers"
      ],
      companies: ["DeVilbiss", "SATA", "Graco", "Wagner", "Philips Respironics"],
      futureImpact: "Atomizer technology continues advancing in medical inhalers, precision agriculture, and industrial coating. Understanding the Venturi principle helps optimize droplet size for specific applications.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Main pipe */}
          <rect x="5" y="35" width="90" height="30" fill="#555" rx="2" />
          {/* Venturi constriction */}
          <path d="M30 35 L40 45 L60 45 L70 35 M30 65 L40 55 L60 55 L70 65" fill="#555" stroke="#666" strokeWidth="2" />
          {/* Inner flow area */}
          <rect x="5" y="40" width="25" height="20" fill="#338" />
          <rect x="40" y="45" width="20" height="10" fill="#55a" />
          <rect x="70" y="40" width="25" height="20" fill="#338" />
          {/* Manometer tubes */}
          <rect x="15" y="10" width="8" height="25" fill="#444" stroke="#555" strokeWidth="1" />
          <rect x="17" y="15" width="4" height="18" fill="#ff6666" />
          <rect x="46" y="5" width="8" height="40" fill="#444" stroke="#555" strokeWidth="1" />
          <rect x="48" y="25" width="4" height="18" fill="#6666ff" />
          <rect x="77" y="10" width="8" height="25" fill="#444" stroke="#555" strokeWidth="1" />
          <rect x="79" y="15" width="4" height="18" fill="#ff6666" />
          {/* Flow arrows */}
          <path d="M8 50 L25 50 M65 50 L92 50" stroke="#00ccff" strokeWidth="3" strokeDasharray="5,3">
            <animate attributeName="stroke-dashoffset" from="0" to="-8" dur="0.3s" repeatCount="indefinite" />
          </path>
          {/* Pressure labels */}
          <text x="19" y="8" fontSize="8" fill="#ff6666" textAnchor="middle">P1</text>
          <text x="50" y="3" fontSize="8" fill="#6666ff" textAnchor="middle">P2</text>
          <text x="81" y="8" fontSize="8" fill="#ff6666" textAnchor="middle">P3</text>
          {/* Delta P indicator */}
          <text x="50" y="78" fontSize="10" fill="#00ff00" textAnchor="middle">Delta P = f(Q)</text>
          {/* Flow rate display */}
          <rect x="30" y="82" width="40" height="14" fill="#222" rx="2" />
          <text x="50" y="93" fontSize="9" fill="#00ff00" textAnchor="middle">Q = ?</text>
        </svg>
      ),
      title: "Flow Meters & Measurement Systems",
      short: "Flow Meters",
      tagline: "Measuring Flow Through Pressure",
      description: "Venturi flow meters measure fluid flow rate by measuring the pressure difference between wide and narrow sections. This non-invasive measurement technique is used in water systems, gas pipelines, and industrial processes.",
      connection: "The pressure drop across the Venturi throat is directly related to flow velocity by Bernoulli's equation. By measuring this pressure difference, we can calculate the exact flow rate without inserting any probes into the flow.",
      howItWorks: "Fluid enters the wide section, accelerates through the throat (low pressure), then decelerates back to the original velocity. Pressure taps at the inlet and throat connect to a differential pressure gauge. The flow rate is proportional to the square root of this pressure difference.",
      stats: [
        { value: "0.5-2%", label: "Accuracy" },
        { value: "10:1", label: "Turndown ratio" },
        { value: "0.95-0.99", label: "Discharge coefficient" },
        { value: "10-30%", label: "Permanent pressure loss" }
      ],
      examples: [
        "Municipal water distribution monitoring",
        "Natural gas pipeline metering",
        "HVAC airflow measurement",
        "Chemical process flow control"
      ],
      companies: ["Emerson", "ABB", "Siemens", "Endress+Hauser", "Honeywell"],
      futureImpact: "Smart Venturi meters with digital pressure sensors enable real-time flow monitoring and predictive maintenance. They remain popular for their reliability, low maintenance, and accuracy in harsh conditions.",
      color: "from-green-600 to-teal-600"
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
                <text x="200" y={100 - paperGap - 12} fontSize="10" fill="#ff6666" textAnchor="middle">HIGH P</text>
                <text x="200" y={100 + paperGap + 18} fontSize="10" fill="#ff6666" textAnchor="middle">HIGH P</text>
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
          onClick={() => startBlowing()}
          disabled={isBlowing}
          style={{ position: 'relative', zIndex: 10 }}
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

  // Venturi meter simulation component
  const VenturiMeterSimulation: React.FC = () => {
    return (
      <div className="flex flex-col items-center">
        <p className="text-slate-300 mb-4 text-center max-w-md">
          Adjust the flow rate and see how the Venturi meter measures it using pressure difference!
        </p>

        <div className="relative w-full max-w-lg h-64 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
          <svg viewBox="0 0 400 260" className="w-full h-full">
            <defs>
              {/* Premium meter tube gradient */}
              <linearGradient id="ventMeterTube" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5a7a9c" />
                <stop offset="20%" stopColor="#4a6a8c" />
                <stop offset="50%" stopColor="#3a5a7c" />
                <stop offset="80%" stopColor="#4a6a8c" />
                <stop offset="100%" stopColor="#5a7a9c" />
              </linearGradient>

              {/* Inner channel gradient */}
              <linearGradient id="ventMeterInner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a3a5c" />
                <stop offset="50%" stopColor="#051525" />
                <stop offset="100%" stopColor="#1a3a5c" />
              </linearGradient>

              {/* Manometer glass gradient */}
              <linearGradient id="ventMeterGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a5a" />
                <stop offset="30%" stopColor="#2a4a6a" />
                <stop offset="70%" stopColor="#2a4a6a" />
                <stop offset="100%" stopColor="#1e3a5a" />
              </linearGradient>

              {/* High pressure fluid gradient */}
              <linearGradient id="ventMeterHighP" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="40%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>

              {/* Low pressure fluid gradient */}
              <linearGradient id="ventMeterLowP" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1d4ed8" />
                <stop offset="40%" stopColor="#3b82f6" />
                <stop offset="60%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>

              {/* Flow particle glow */}
              <radialGradient id="ventMeterFlowGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>

              {/* Display panel gradient */}
              <linearGradient id="ventMeterDisplay" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a2a3a" />
                <stop offset="50%" stopColor="#0a1a2a" />
                <stop offset="100%" stopColor="#1a2a3a" />
              </linearGradient>

              {/* Glow filters */}
              <filter id="ventMeterGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="ventMeterDisplayGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect width="400" height="260" fill="#0a1628" />

            {/* Main pipe with Venturi shape - premium gradient */}
            <path
              d="M20 80 L100 80 Q140 80 160 95 L240 95 Q260 80 300 80 L380 80 L380 140 L300 140 Q260 140 240 125 L160 125 Q140 140 100 140 L20 140 Z"
              fill="url(#ventMeterTube)"
              stroke="#6a8aac"
              strokeWidth="2"
            />

            {/* Inner channel */}
            <path
              d="M25 85 L100 85 Q138 85 158 98 L242 98 Q262 85 300 85 L375 85 L375 135 L300 135 Q262 135 242 122 L158 122 Q138 135 100 135 L25 135 Z"
              fill="url(#ventMeterInner)"
            />

            {/* Pipe highlight */}
            <path
              d="M25 87 L100 87 Q138 87 158 100"
              fill="none"
              stroke="#8aaacc"
              strokeWidth="1"
              strokeOpacity="0.4"
            />

            {/* Flow animation with glow */}
            <g filter="url(#ventMeterGlow)">
              {/* Wide section streamlines */}
              {[95, 105, 115, 125].map((y, i) => (
                <line
                  key={`flow-left-${i}`}
                  x1="30"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#00ccff"
                  strokeWidth={i === 1 || i === 2 ? 3 : 2}
                  strokeDasharray="10,6"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-16"
                    dur={`${0.8 / (meterFlowRate / 50)}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}

              {/* Converging streamlines */}
              {[95, 105, 115, 125].map((y, i) => {
                const narrowY = 110 + (y - 110) * 0.4;
                return (
                  <line
                    key={`converge-${i}`}
                    x1="100"
                    y1={y}
                    x2="160"
                    y2={narrowY}
                    stroke="#00ccff"
                    strokeWidth={1.5}
                    strokeDasharray="8,5"
                    strokeOpacity="0.7"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-13"
                      dur={`${0.6 / (meterFlowRate / 50)}s`}
                      repeatCount="indefinite"
                    />
                  </line>
                );
              })}

              {/* Faster flow in narrow section */}
              {[104, 110, 116].map((y, i) => (
                <line
                  key={`narrow-${i}`}
                  x1="160"
                  y1={y}
                  x2="240"
                  y2={y}
                  stroke="#00ffff"
                  strokeWidth={i === 1 ? 3 : 2}
                  strokeDasharray="6,3"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-9"
                    dur={`${0.3 / (meterFlowRate / 50)}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}

              {/* Diverging streamlines */}
              {[104, 110, 116].map((y, i) => {
                const wideY = i === 0 ? 95 : i === 1 ? 110 : 125;
                return (
                  <line
                    key={`diverge-${i}`}
                    x1="240"
                    y1={y}
                    x2="300"
                    y2={wideY}
                    stroke="#00ccff"
                    strokeWidth={1.5}
                    strokeDasharray="8,5"
                    strokeOpacity="0.7"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-13"
                      dur={`${0.6 / (meterFlowRate / 50)}s`}
                      repeatCount="indefinite"
                    />
                  </line>
                );
              })}

              {/* Wide section right */}
              {[95, 105, 115, 125].map((y, i) => (
                <line
                  key={`flow-right-${i}`}
                  x1="300"
                  y1={y}
                  x2="370"
                  y2={y}
                  stroke="#00ccff"
                  strokeWidth={i === 1 || i === 2 ? 3 : 2}
                  strokeDasharray="10,6"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-16"
                    dur={`${0.8 / (meterFlowRate / 50)}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}

              {/* Flow particles */}
              {[0, 1, 2].map((i) => (
                <circle
                  key={`mparticle-${i}`}
                  cx="50"
                  cy={105 + i * 10}
                  r="3"
                  fill="url(#ventMeterFlowGlow)"
                >
                  <animate
                    attributeName="cx"
                    values="30;100;200;300;370;30"
                    dur={`${2.5 / (meterFlowRate / 50)}s`}
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>

            {showMeterReadings && (
              <g>
                {/* Wide section manometer (inlet) */}
                <g filter="url(#ventMeterGlow)">
                  <rect x="50" y="20" width="24" height="60" rx="4" fill="url(#ventMeterGlass)" stroke="#4a6a8a" strokeWidth="1.5" />
                  <rect x="54" y="24" width="16" height="52" rx="2" fill="#0a1a2a" />
                  <rect x="57" y={76 - REFERENCE_PRESSURE * 0.48} width="10" height={REFERENCE_PRESSURE * 0.48} rx="2" fill="url(#ventMeterHighP)" />
                  <rect x="48" y="16" width="28" height="6" rx="2" fill="#5a7a9a" />
                  <line x1="62" y1="80" x2="62" y2="85" stroke="#4a6a8a" strokeWidth="4" />
                </g>
                <text x="62" y="12" fontSize="10" fill="#f87171" textAnchor="middle" fontWeight="bold">P1</text>
                <rect x="40" y="150" width="44" height="16" rx="4" fill="#1a2a3a" stroke="#ef4444" strokeWidth="1" />
                <text x="62" y="161" fontSize="9" fill="#f87171" textAnchor="middle" fontWeight="bold">{REFERENCE_PRESSURE.toFixed(0)} kPa</text>

                {/* Narrow section manometer (throat) */}
                <g filter="url(#ventMeterGlow)">
                  <rect x="188" y="10" width="24" height="75" rx="4" fill="url(#ventMeterGlass)" stroke="#4a6a8a" strokeWidth="1.5" />
                  <rect x="192" y="14" width="16" height="67" rx="2" fill="#0a1a2a" />
                  <rect x="195" y={81 - Math.max(meterNarrowPressure, 10) * 0.6} width="10" height={Math.max(meterNarrowPressure, 10) * 0.6} rx="2" fill="url(#ventMeterLowP)" />
                  <rect x="186" y="6" width="28" height="6" rx="2" fill="#5a7a9a" />
                  <line x1="200" y1="85" x2="200" y2="98" stroke="#4a6a8a" strokeWidth="4" />
                </g>
                <text x="200" y="3" fontSize="10" fill="#60a5fa" textAnchor="middle" fontWeight="bold">P2</text>
                <rect x="178" y="150" width="44" height="16" rx="4" fill="#1a2a3a" stroke="#3b82f6" strokeWidth="1" />
                <text x="200" y="161" fontSize="9" fill="#60a5fa" textAnchor="middle" fontWeight="bold">{meterNarrowPressure.toFixed(0)} kPa</text>

                {/* Wide section manometer (exit) */}
                <g filter="url(#ventMeterGlow)">
                  <rect x="326" y="20" width="24" height="60" rx="4" fill="url(#ventMeterGlass)" stroke="#4a6a8a" strokeWidth="1.5" />
                  <rect x="330" y="24" width="16" height="52" rx="2" fill="#0a1a2a" />
                  <rect x="333" y={76 - REFERENCE_PRESSURE * 0.48} width="10" height={REFERENCE_PRESSURE * 0.48} rx="2" fill="url(#ventMeterHighP)" />
                  <rect x="324" y="16" width="28" height="6" rx="2" fill="#5a7a9a" />
                  <line x1="338" y1="80" x2="338" y2="85" stroke="#4a6a8a" strokeWidth="4" />
                </g>
                <text x="338" y="12" fontSize="10" fill="#f87171" textAnchor="middle" fontWeight="bold">P3</text>

                {/* Premium Delta P display panel */}
                <g filter="url(#ventMeterDisplayGlow)">
                  <rect x="120" y="178" width="160" height="45" rx="8" fill="url(#ventMeterDisplay)" stroke="#22c55e" strokeWidth="2" />
                  <rect x="125" y="183" width="150" height="35" rx="5" fill="#051510" />
                </g>
                <text x="200" y="200" fontSize="13" fill="#4ade80" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                  Delta P = {(REFERENCE_PRESSURE - meterNarrowPressure).toFixed(1)} kPa
                </text>
                <text x="200" y="215" fontSize="11" fill="#86efac" textAnchor="middle" fontFamily="monospace">
                  Q = {calculatedFlowRate.toFixed(0)}% (calculated)
                </text>

                {/* Connection lines visual */}
                <line x1="84" y1="158" x2="120" y2="190" stroke="#4a6a8a" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
                <line x1="200" y1="166" x2="200" y2="178" stroke="#4a6a8a" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
              </g>
            )}

            {/* Section labels with premium styling */}
            <rect x="40" y="232" width="44" height="16" rx="4" fill="#1a2a3a" stroke="#3a5a7a" strokeWidth="1" />
            <text x="62" y="243" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Inlet</text>

            <rect x="172" y="232" width="56" height="16" rx="4" fill="#1a2a3a" stroke="#06b6d4" strokeWidth="1" />
            <text x="200" y="243" fontSize="10" fill="#22d3ee" textAnchor="middle" fontWeight="600">Throat</text>

            <rect x="316" y="232" width="44" height="16" rx="4" fill="#1a2a3a" stroke="#3a5a7a" strokeWidth="1" />
            <text x="338" y="243" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Outlet</text>

            {/* Flow direction */}
            <text x="12" y="115" fontSize="10" fill="#4a6a8a" fontWeight="bold">IN</text>
            <text x="378" y="115" fontSize="10" fill="#4a6a8a" fontWeight="bold">OUT</text>
          </svg>
        </div>

        {/* Flow rate control */}
        <div className="bg-slate-800 p-4 rounded-xl w-full max-w-md mb-4">
          <label className="text-slate-300 text-sm block mb-2">Actual Flow Rate: {meterFlowRate}%</label>
          <input
            type="range"
            min="20"
            max="100"
            value={meterFlowRate}
            onChange={(e) => setMeterFlowRate(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
        </div>

        {/* Toggle readings */}
        <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={showMeterReadings}
            onChange={(e) => setShowMeterReadings(e.target.checked)}
            className="accent-teal-500"
          />
          Show Pressure Readings
        </label>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          <div className="bg-slate-800 p-3 rounded-lg text-center">
            <div className="text-cyan-400 text-lg font-bold">{meterWideVelocity.toFixed(1)}</div>
            <div className="text-slate-400 text-xs">v1 (m/s)</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg text-center">
            <div className="text-green-400 text-lg font-bold">{meterNarrowVelocity.toFixed(1)}</div>
            <div className="text-slate-400 text-xs">v2 (m/s)</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-lg text-center">
            <div className="text-yellow-400 text-lg font-bold">{(REFERENCE_PRESSURE - meterNarrowPressure).toFixed(1)}</div>
            <div className="text-slate-400 text-xs">Delta P (kPa)</div>
          </div>
        </div>
      </div>
    );
  };

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            {/* Premium Badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
              <span className="text-teal-400/80 text-sm font-medium tracking-wide uppercase">Fluid Dynamics</span>
            </div>

            {/* Gradient Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-teal-100 to-green-200 bg-clip-text text-transparent">
              The Venturi Effect
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-lg mb-8">
              Why does water shoot farther when you cover the hose?
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
              onClick={() => goToPhase('predict')}
              style={{ position: 'relative', zIndex: 10 }}
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

      case 'predict':
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
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ position: 'relative', zIndex: 10 }}
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
                  {selectedPrediction === 'B' ? 'Correct!' : 'Think about conservation!'}
                </p>
                <p className="text-slate-300 mb-3">
                  This is the <span className="text-teal-400 font-bold">continuity equation</span>: A1v1 = A2v2
                </p>
                <p className="text-slate-400 text-sm">
                  Smaller area means higher velocity to maintain the same flow rate. Mass is conserved!
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ position: 'relative', zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
                >
                  Explore the Venturi Tube
                </button>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-4">Venturi Tube Simulator</h2>

            <div className="relative w-full max-w-lg h-72 bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                <defs>
                  {/* Premium Venturi tube metal gradient with depth */}
                  <linearGradient id="ventTubeMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#5a7a9c" />
                    <stop offset="20%" stopColor="#4a6a8c" />
                    <stop offset="40%" stopColor="#3a5a7c" />
                    <stop offset="60%" stopColor="#2a4a6c" />
                    <stop offset="80%" stopColor="#3a5a7c" />
                    <stop offset="100%" stopColor="#4a6a8c" />
                  </linearGradient>

                  {/* Inner tube gradient for 3D effect */}
                  <linearGradient id="ventTubeInner" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1a3a5c" />
                    <stop offset="30%" stopColor="#0a2a4c" />
                    <stop offset="50%" stopColor="#051525" />
                    <stop offset="70%" stopColor="#0a2a4c" />
                    <stop offset="100%" stopColor="#1a3a5c" />
                  </linearGradient>

                  {/* Radial gradient for flow effect */}
                  <radialGradient id="ventFlowGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00ffff" stopOpacity="1" />
                    <stop offset="40%" stopColor="#00ccff" stopOpacity="0.8" />
                    <stop offset="70%" stopColor="#0088cc" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#004466" stopOpacity="0" />
                  </radialGradient>

                  {/* Flow particle gradient */}
                  <radialGradient id="ventParticleGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
                    <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                  </radialGradient>

                  {/* Pressure tube glass gradient */}
                  <linearGradient id="ventPressureGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e3a5a" />
                    <stop offset="20%" stopColor="#2a4a6a" />
                    <stop offset="50%" stopColor="#3a5a7a" />
                    <stop offset="80%" stopColor="#2a4a6a" />
                    <stop offset="100%" stopColor="#1e3a5a" />
                  </linearGradient>

                  {/* High pressure fluid gradient (red) */}
                  <linearGradient id="ventHighPressure" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="30%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#f87171" />
                    <stop offset="70%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>

                  {/* Low pressure fluid gradient (blue) */}
                  <linearGradient id="ventLowPressure" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#1d4ed8" />
                    <stop offset="30%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#60a5fa" />
                    <stop offset="70%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>

                  {/* Velocity arrow gradient */}
                  <linearGradient id="ventVelocityArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#86efac" />
                  </linearGradient>

                  {/* Fast velocity arrow gradient */}
                  <linearGradient id="ventFastVelocity" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#67e8f9" />
                  </linearGradient>

                  {/* Glow filter for flow lines */}
                  <filter id="ventFlowBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Glow filter for pressure indicators */}
                  <filter id="ventPressureGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Inner glow for tube depth */}
                  <filter id="ventInnerShadow">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                    <feOffset dx="0" dy="2" result="offsetBlur" />
                    <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff" />
                    <feFlood floodColor="#000000" floodOpacity="0.5" />
                    <feComposite in2="shadowDiff" operator="in" />
                    <feComposite in2="SourceGraphic" operator="over" />
                  </filter>

                  {/* Streamline pattern */}
                  <pattern id="ventStreamlines" width="20" height="10" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="5" x2="15" y2="5" stroke="#00ccff" strokeWidth="1" strokeOpacity="0.3" />
                  </pattern>
                </defs>

                {/* Background with subtle gradient */}
                <rect width="400" height="300" fill="#0a1628" />
                <rect width="400" height="300" fill="url(#ventStreamlines)" opacity="0.2" />

                {/* Venturi tube outer shape with premium gradient */}
                <path
                  d={`M20 100 L100 100 Q150 100 180 ${100 + (50 - constrictionSize) * 0.6} L220 ${100 + (50 - constrictionSize) * 0.6} Q250 100 300 100 L380 100 L380 200 L300 200 Q250 200 220 ${200 - (50 - constrictionSize) * 0.6} L180 ${200 - (50 - constrictionSize) * 0.6} Q150 200 100 200 L20 200 Z`}
                  fill="url(#ventTubeMetal)"
                  stroke="#6a8aac"
                  strokeWidth="2"
                  filter="url(#ventInnerShadow)"
                />

                {/* Inner tube channel for depth */}
                <path
                  d={`M25 105 L100 105 Q148 105 178 ${105 + (50 - constrictionSize) * 0.55} L222 ${105 + (50 - constrictionSize) * 0.55} Q252 105 300 105 L375 105 L375 195 L300 195 Q252 195 222 ${195 - (50 - constrictionSize) * 0.55} L178 ${195 - (50 - constrictionSize) * 0.55} Q148 195 100 195 L25 195 Z`}
                  fill="url(#ventTubeInner)"
                />

                {/* Tube highlight for 3D effect */}
                <path
                  d={`M25 108 L100 108 Q148 108 178 ${108 + (50 - constrictionSize) * 0.5}`}
                  fill="none"
                  stroke="#8aaacc"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />

                {/* Flow lines animation with glow effect */}
                {isFlowing && (
                  <g filter="url(#ventFlowBlur)">
                    {/* Wide section left - slower, spread out streamlines */}
                    {[125, 140, 150, 160, 175].map((y, i) => (
                      <line
                        key={`left-${i}`}
                        x1="30"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="url(#ventParticleGlow)"
                        strokeWidth={i === 2 ? 4 : 2}
                        strokeDasharray="12,8"
                        strokeLinecap="round"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur={`${1.5 / (flowRate / 50)}s`} repeatCount="indefinite" />
                      </line>
                    ))}

                    {/* Converging section - streamlines compress */}
                    {[125, 140, 150, 160, 175].map((y, i) => {
                      const narrowY = 150 + (y - 150) * (constrictionSize / 100);
                      return (
                        <line
                          key={`converge-${i}`}
                          x1="100"
                          y1={y}
                          x2="175"
                          y2={narrowY}
                          stroke="#00ccff"
                          strokeWidth={i === 2 ? 3 : 1.5}
                          strokeDasharray="10,6"
                          strokeOpacity="0.7"
                        >
                          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${1.0 / (flowRate / 50)}s`} repeatCount="indefinite" />
                        </line>
                      );
                    })}

                    {/* Narrow section - faster, compressed with bright glow */}
                    {[145 + (50 - constrictionSize) * 0.35, 150, 155 - (50 - constrictionSize) * 0.35].map((y, i) => (
                      <line
                        key={`middle-${i}`}
                        x1="175"
                        y1={y}
                        x2="225"
                        y2={y}
                        stroke="#00ffff"
                        strokeWidth={i === 1 ? 3 : 2}
                        strokeDasharray="8,4"
                        strokeLinecap="round"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-12" dur={`${0.4 / (flowRate / 50) / areaRatio}s`} repeatCount="indefinite" />
                      </line>
                    ))}

                    {/* Diverging section - streamlines expand */}
                    {[145 + (50 - constrictionSize) * 0.35, 150, 155 - (50 - constrictionSize) * 0.35].map((y, i) => {
                      const wideY = i === 0 ? 125 : i === 1 ? 150 : 175;
                      return (
                        <line
                          key={`diverge-${i}`}
                          x1="225"
                          y1={y}
                          x2="300"
                          y2={wideY}
                          stroke="#00ccff"
                          strokeWidth={i === 1 ? 3 : 1.5}
                          strokeDasharray="10,6"
                          strokeOpacity="0.7"
                        >
                          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur={`${1.0 / (flowRate / 50)}s`} repeatCount="indefinite" />
                        </line>
                      );
                    })}

                    {/* Wide section right - slower again */}
                    {[125, 140, 150, 160, 175].map((y, i) => (
                      <line
                        key={`right-${i}`}
                        x1="300"
                        y1={y}
                        x2="370"
                        y2={y}
                        stroke="url(#ventParticleGlow)"
                        strokeWidth={i === 2 ? 4 : 2}
                        strokeDasharray="12,8"
                        strokeLinecap="round"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur={`${1.5 / (flowRate / 50)}s`} repeatCount="indefinite" />
                      </line>
                    ))}

                    {/* Flow particles for extra visual effect */}
                    {[0, 1, 2].map((i) => (
                      <circle
                        key={`particle-${i}`}
                        cx="50"
                        cy={140 + i * 10}
                        r="3"
                        fill="url(#ventFlowGlow)"
                      >
                        <animate
                          attributeName="cx"
                          values="30;100;200;300;370;30"
                          dur={`${3 / (flowRate / 50)}s`}
                          begin={`${i * 0.3}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ))}
                  </g>
                )}

                {/* Premium pressure indicator tubes */}
                {showPressure && (
                  <g filter="url(#ventPressureGlow)">
                    {/* Left (wide) pressure tube */}
                    <rect x="52" y="45" width="20" height="55" rx="4" fill="url(#ventPressureGlass)" stroke="#4a6a8a" strokeWidth="1.5" />
                    <rect x="55" y="48" width="14" height="49" rx="2" fill="#0a1a2a" />
                    <rect x="57" y={97 - widePressure * 0.45} width="10" height={widePressure * 0.45} rx="2" fill="url(#ventHighPressure)" />
                    {/* Tube cap */}
                    <rect x="50" y="42" width="24" height="6" rx="2" fill="#5a7a9a" />
                    <text x="62" y="38" fontSize="10" fill="#f87171" textAnchor="middle" fontWeight="bold">P1</text>
                    {/* Connection line to tube */}
                    <line x1="62" y1="100" x2="62" y2="105" stroke="#4a6a8a" strokeWidth="4" />

                    {/* Middle (narrow) pressure tube - taller to show lower pressure */}
                    <rect x="190" y="25" width="20" height="65" rx="4" fill="url(#ventPressureGlass)" stroke="#4a6a8a" strokeWidth="1.5" />
                    <rect x="193" y="28" width="14" height="59" rx="2" fill="#0a1a2a" />
                    <rect x="195" y={87 - Math.max(narrowPressure, 10) * 0.5} width="10" height={Math.max(narrowPressure, 10) * 0.5} rx="2" fill="url(#ventLowPressure)" />
                    {/* Tube cap */}
                    <rect x="188" y="22" width="24" height="6" rx="2" fill="#5a7a9a" />
                    <text x="200" y="18" fontSize="10" fill="#60a5fa" textAnchor="middle" fontWeight="bold">P2</text>
                    {/* Connection line */}
                    <line x1="200" y1="90" x2="200" y2={100 + (50 - constrictionSize) * 0.6 - 5} stroke="#4a6a8a" strokeWidth="4" />

                    {/* Right (wide) pressure tube */}
                    <rect x="328" y="45" width="20" height="55" rx="4" fill="url(#ventPressureGlass)" stroke="#4a6a8a" strokeWidth="1.5" />
                    <rect x="331" y="48" width="14" height="49" rx="2" fill="#0a1a2a" />
                    <rect x="333" y={97 - widePressure * 0.45} width="10" height={widePressure * 0.45} rx="2" fill="url(#ventHighPressure)" />
                    {/* Tube cap */}
                    <rect x="326" y="42" width="24" height="6" rx="2" fill="#5a7a9a" />
                    <text x="338" y="38" fontSize="10" fill="#f87171" textAnchor="middle" fontWeight="bold">P3</text>
                    {/* Connection line */}
                    <line x1="338" y1="100" x2="338" y2="105" stroke="#4a6a8a" strokeWidth="4" />

                    {/* Pressure scale markings on middle tube */}
                    {[0, 25, 50, 75, 100].map((mark, i) => (
                      <g key={`scale-${i}`}>
                        <line x1="207" y1={87 - mark * 0.5} x2="212" y2={87 - mark * 0.5} stroke="#6a8aaa" strokeWidth="1" />
                      </g>
                    ))}
                  </g>
                )}

                {/* Premium velocity arrows with gradients */}
                {showVelocity && (
                  <g>
                    {/* Left velocity arrow */}
                    <line x1="45" y1="230" x2={45 + wideVelocity * 14} y2="230" stroke="url(#ventVelocityArrow)" strokeWidth="5" strokeLinecap="round" />
                    <polygon points={`${52 + wideVelocity * 14},230 ${40 + wideVelocity * 14},222 ${40 + wideVelocity * 14},238`} fill="#4ade80" />
                    <rect x="35" y="242" width="80" height="18" rx="4" fill="#0a2a1a" stroke="#22c55e" strokeWidth="1" />
                    <text x="75" y="254" fontSize="10" fill="#4ade80" textAnchor="middle" fontWeight="bold">v1 = {wideVelocity.toFixed(1)} m/s</text>

                    {/* Middle velocity arrow (faster) */}
                    <line x1="155" y1="230" x2={155 + Math.min(narrowVelocity, 18) * 7} y2="230" stroke="url(#ventFastVelocity)" strokeWidth="6" strokeLinecap="round" />
                    <polygon points={`${162 + Math.min(narrowVelocity, 18) * 7},230 ${150 + Math.min(narrowVelocity, 18) * 7},220 ${150 + Math.min(narrowVelocity, 18) * 7},240`} fill="#22d3ee" />
                    <rect x="145" y="242" width="100" height="18" rx="4" fill="#0a1a2a" stroke="#06b6d4" strokeWidth="1" />
                    <text x="195" y="254" fontSize="10" fill="#22d3ee" textAnchor="middle" fontWeight="bold">v2 = {narrowVelocity.toFixed(1)} m/s</text>

                    {/* Right velocity arrow */}
                    <line x1="295" y1="230" x2={295 + wideVelocity * 14} y2="230" stroke="url(#ventVelocityArrow)" strokeWidth="5" strokeLinecap="round" />
                    <polygon points={`${302 + wideVelocity * 14},230 ${290 + wideVelocity * 14},222 ${290 + wideVelocity * 14},238`} fill="#4ade80" />
                    <rect x="285" y="242" width="80" height="18" rx="4" fill="#0a2a1a" stroke="#22c55e" strokeWidth="1" />
                    <text x="325" y="254" fontSize="10" fill="#4ade80" textAnchor="middle" fontWeight="bold">v3 = {wideVelocity.toFixed(1)} m/s</text>
                  </g>
                )}

                {/* Section labels with premium styling */}
                <rect x="40" y="275" width="44" height="16" rx="4" fill="#1a2a3a" stroke="#3a5a7a" strokeWidth="1" />
                <text x="62" y="286" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Wide</text>

                <rect x="168" y="275" width="64" height="16" rx="4" fill="#1a2a3a" stroke="#06b6d4" strokeWidth="1" />
                <text x="200" y="286" fontSize="10" fill="#22d3ee" textAnchor="middle" fontWeight="600">Narrow</text>

                <rect x="316" y="275" width="44" height="16" rx="4" fill="#1a2a3a" stroke="#3a5a7a" strokeWidth="1" />
                <text x="338" y="286" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="600">Wide</text>

                {/* Flow direction indicators */}
                <text x="15" y="155" fontSize="12" fill="#4a6a8a" fontWeight="bold">IN</text>
                <text x="375" y="155" fontSize="12" fill="#4a6a8a" fontWeight="bold">OUT</text>

                {/* Continuity equation label */}
                <rect x="130" y="5" width="140" height="22" rx="6" fill="#0a1a2a" stroke="#06b6d4" strokeWidth="1" />
                <text x="200" y="19" fontSize="10" fill="#22d3ee" textAnchor="middle" fontWeight="bold" fontFamily="monospace">A1v1 = A2v2</text>
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
                <div className="text-slate-400 text-xs">v1 (m/s)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-cyan-400 text-xl font-bold">{narrowVelocity.toFixed(1)}</div>
                <div className="text-slate-400 text-xs">v2 (m/s)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-red-400 text-xl font-bold">{widePressure.toFixed(0)}</div>
                <div className="text-slate-400 text-xs">P1 (kPa)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg text-center">
                <div className="text-blue-400 text-xl font-bold">{narrowPressure.toFixed(0)}</div>
                <div className="text-slate-400 text-xs">P2 (kPa)</div>
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
                onClick={() => {
                  setIsFlowing(!isFlowing);
                  playSound('flow');
                }}
                style={{ position: 'relative', zIndex: 10 }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isFlowing ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white transition-colors`}
              >
                {isFlowing ? 'Stop Flow' : 'Start Flow'}
              </button>
            </div>

            <button
              onClick={() => goToPhase('review')}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
            >
              Review the Physics
            </button>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-teal-400 mb-6">The Venturi Effect Explained</h2>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 max-w-2xl mb-6`}>
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-3">Continuity Equation</h3>
                <div className="bg-slate-900 p-4 rounded-lg text-center mb-3">
                  <span className="text-teal-400 font-mono text-2xl">A1v1 = A2v2</span>
                </div>
                <p className="text-slate-300 text-sm">
                  <span className="text-green-400 font-bold">Mass conservation:</span> If area decreases, velocity must increase to keep the same flow rate (volume/time).
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-blue-400 mb-3">Bernoulli&apos;s Principle</h3>
                <div className="bg-slate-900 p-4 rounded-lg text-center mb-3">
                  <span className="text-cyan-400 font-mono text-2xl">P + 1/2 pv^2 = const</span>
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
                  <div className="text-3xl text-slate-500">-&gt;</div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <div className="w-6 h-12 bg-cyan-500/50 rounded-full" />
                    </div>
                    <div className="text-slate-300 text-sm font-medium">Narrow Section</div>
                    <div className="text-cyan-400 text-xs">Fast velocity</div>
                    <div className="text-blue-400 text-xs">Low pressure</div>
                  </div>
                  <div className="text-3xl text-slate-500">-&gt;</div>
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
              onClick={() => goToPhase('twist_predict')}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all"
            >
              Ready for the Twist?
            </button>
          </div>
        );

      case 'twist_predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist: Venturi Flow Meter</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Engineers need to measure fluid flow rate in a pipe <span className="text-cyan-400 font-bold">without inserting any probes</span> that might obstruct the flow.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                How can a Venturi tube help measure flow rate?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Measure pressure difference between wide and narrow sections' },
                { id: 'B', text: 'Count how many bubbles pass through per second' },
                { id: 'C', text: 'Measure the temperature change in the fluid' },
                { id: 'D', text: 'Time how long it takes fluid to travel through' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ position: 'relative', zIndex: 10 }}
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
                  {twistPrediction === 'A' ? 'Exactly right!' : 'Think about what changes with flow!'}
                </p>
                <p className="text-slate-300">
                  The <span className="text-cyan-400 font-bold">pressure difference</span> between wide and narrow sections is directly related to flow velocity by Bernoulli&apos;s equation!
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ position: 'relative', zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
                >
                  Try the Flow Meter
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Venturi Flow Meter Simulation</h2>
            <VenturiMeterSimulation />
            <button
              onClick={() => goToPhase('twist_review')}
              style={{ position: 'relative', zIndex: 10 }}
              className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
            >
              Understand the Math
            </button>
          </div>
        );

      case 'twist_review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">How Venturi Meters Measure Flow</h2>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 rounded-xl max-w-lg mb-6">
              <h3 className="text-lg font-bold text-pink-400 mb-4">The Flow Rate Equation</h3>

              <div className="space-y-3 text-sm">
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400" />
                    <span className="text-cyan-400 font-bold">Step 1: Measure Pressure Drop</span>
                  </div>
                  <p className="text-slate-300">Delta P = P1 - P2 (pressure difference between sections)</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-green-400 font-bold">Step 2: Apply Bernoulli</span>
                  </div>
                  <p className="text-slate-300">Delta P = 1/2 p (v2^2 - v1^2)</p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="text-yellow-400 font-bold">Step 3: Calculate Flow</span>
                  </div>
                  <p className="text-slate-300">Q = A x v = A x sqrt(2 x Delta P / p)</p>
                </div>
              </div>

              <p className="text-slate-400 text-xs mt-4 text-center">
                Flow rate is proportional to the square root of pressure difference!
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-6">
              <h4 className="text-teal-400 font-bold mb-3">Key Advantages of Venturi Meters</h4>
              <ul className="text-slate-300 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">-</span>
                  No moving parts - extremely reliable
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">-</span>
                  Non-intrusive measurement - no probes in flow
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">-</span>
                  Low permanent pressure loss (10-30%)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">-</span>
                  Works with liquids and gases
                </li>
              </ul>
            </div>

            <button
              onClick={() => goToPhase('transfer')}
              style={{ position: 'relative', zIndex: 10 }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all"
            >
              See Real-World Applications
            </button>
          </div>
        );

      case 'transfer':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {transferApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ position: 'relative', zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? `bg-gradient-to-r ${app.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '+ '}{app.short}
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
                    onClick={() => handleAppComplete(activeAppTab)}
                    style={{ position: 'relative', zIndex: 10 }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">
              Completed: {completedApps.size} / {transferApps.length}
            </p>

            {completedApps.size >= 3 && (
              <button
                onClick={() => goToPhase('test')}
                style={{ position: 'relative', zIndex: 10 }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white font-bold rounded-xl transition-all"
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        );

      case 'test':
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
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        disabled={showTestResults}
                        style={{ position: 'relative', zIndex: 10 }}
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
                onClick={() => {
                  const score = calculateTestScore();
                  setTestScore(score);
                  setShowTestResults(true);
                  playSound('complete');
                  onGameEvent?.({ type: 'test_completed', data: { score } });
                }}
                style={{ position: 'relative', zIndex: 10 }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-teal-400 mb-2">
                  Score: {testScore} / 10
                </p>
                <p className={`text-lg ${testScore >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {testScore >= 9 ? 'Outstanding! You\'ve mastered the Venturi effect!' :
                   testScore >= 7 ? 'Great job! You understand the key concepts!' :
                   'Keep learning! Try reviewing the material and simulations again.'}
                </p>
                {testScore >= 7 && (
                  <button
                    onClick={() => goToPhase('mastery')}
                    style={{ position: 'relative', zIndex: 10 }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all"
                  >
                    Claim Your Mastery Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'mastery':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-8xl mb-6">&#128168;</div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-green-400 mb-4">
              Venturi Effect Master!
            </h2>
            <div className="bg-gradient-to-r from-teal-600/20 to-green-600/20 border-2 border-teal-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                Congratulations! You&apos;ve mastered the principles of fluid flow and pressure!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span><span className="text-teal-400 font-mono">A1v1 = A2v2</span> - Continuity (mass conservation)</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Narrow section = faster velocity</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span><span className="text-cyan-400 font-mono">P + 1/2 pv^2 = const</span> - Bernoulli&apos;s principle</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Faster velocity = lower pressure</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Applications: carburetors, atomizers, flow meters, aspirators</span>
                </p>
              </div>
            </div>
            <p className="text-teal-400 font-medium text-lg">
              Now you understand why covering a hose makes water shoot farther!
            </p>
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => goToPhase('hook')}
                style={{ position: 'relative', zIndex: 10 }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={() => goToPhase('play')}
                style={{ position: 'relative', zIndex: 10 }}
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
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-teal-400 w-6' : phaseOrder.indexOf(phase) > i ? 'bg-teal-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseNames[p]}
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
