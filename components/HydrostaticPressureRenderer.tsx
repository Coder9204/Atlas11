import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================
// TYPES
// =============================================
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'depth_changed'
  | 'fluid_changed'
  | 'pressure_calculated'
  | 'paradox_discovered'
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
  howItWorks: string[];
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
}

// =============================================
// CONSTANTS
// =============================================
const phaseNames = [
  'Hook',
  'Predict',
  'Experiment',
  'Measure',
  'Paradox',
  'Challenge',
  'Apply',
  'Transfer',
  'Test',
  'Mastery'
];

const GRAVITY = 9.81; // m/s²
const ATM_PRESSURE = 101325; // Pa (1 atm)

const testQuestions: TestQuestion[] = [
  {
    scenario: "You're designing an underwater research station at the bottom of a lake. The engineering team needs to calculate wall thickness to withstand the pressure at 20 meters depth.",
    question: "What is the total pressure on the station walls at 20m depth in fresh water?",
    options: [
      { text: "About 3 atmospheres - 1 atm surface + 2 atm from water depth", correct: true },
      { text: "About 1 atmosphere - depth doesn't affect pressure", correct: false },
      { text: "About 20 atmospheres - 1 atm per meter", correct: false },
      { text: "About 2 atmospheres - only the water pressure counts", correct: false }
    ],
    explanation: "At 20m depth, hydrostatic pressure adds about 2 atm (P = ρgh = 1000 × 9.81 × 20 ≈ 196 kPa ≈ 2 atm). Adding the 1 atm surface pressure gives approximately 3 atm total."
  },
  {
    scenario: "A municipal engineer is designing two water tanks for a hilltop community. Tank A is wide and shallow (50m diameter, 5m tall), while Tank B is narrow and tall (5m diameter, 50m tall).",
    question: "Which tank provides higher water pressure to homes at the base of the hill?",
    options: [
      { text: "Tank B - pressure depends only on height, not volume", correct: true },
      { text: "Tank A - more water volume means more pressure", correct: false },
      { text: "Equal pressure - same amount of water", correct: false },
      { text: "Tank A - wider base distributes pressure more", correct: false }
    ],
    explanation: "This is the Hydrostatic Paradox: pressure depends only on depth (P = ρgh), not on volume. Tank B's 50m height creates 10× more pressure than Tank A's 5m, regardless of their volumes."
  },
  {
    scenario: "A scuba diver descends from the surface to 30 meters in a tropical ocean. Before diving, their tank shows 200 bar of air pressure.",
    question: "Why must divers ascend slowly despite having plenty of air remaining?",
    options: [
      { text: "Dissolved nitrogen in blood forms dangerous bubbles if pressure drops too quickly", correct: true },
      { text: "The tank pressure decreases too quickly during ascent", correct: false },
      { text: "Water temperature changes cause equipment malfunction", correct: false },
      { text: "Buoyancy becomes uncontrollable at shallow depths", correct: false }
    ],
    explanation: "At 30m (4 atm), nitrogen dissolves into blood at 4× the surface rate. Rapid ascent causes these dissolved gases to form bubbles - like opening a shaken soda - causing decompression sickness ('the bends')."
  },
  {
    scenario: "The Hoover Dam holds back Lake Mead, which can reach 180 meters deep. Engineers observe that the dam is 200 meters thick at the base but only 14 meters thick at the top.",
    question: "Why is the dam so much thicker at the bottom?",
    options: [
      { text: "Hydrostatic pressure increases linearly with depth, requiring more strength at bottom", correct: true },
      { text: "The bottom needs more weight to prevent sliding", correct: false },
      { text: "Construction limitations require a wider base", correct: false },
      { text: "Water flows faster at the bottom, requiring reinforcement", correct: false }
    ],
    explanation: "At 180m depth, pressure is about 18 atm (1.8 MPa). The dam must resist this enormous sideways force. Since P = ρgh increases linearly with depth, the structural requirements increase proportionally."
  },
  {
    scenario: "An astronaut on the International Space Station notices their face appears puffy and their legs are thinner than on Earth. Medical monitoring shows fluid redistribution in their body.",
    question: "What causes this 'puffy face syndrome' in microgravity?",
    options: [
      { text: "Without gravity, there's no hydrostatic pressure gradient to keep blood in lower body", correct: true },
      { text: "Space radiation causes tissue swelling", correct: false },
      { text: "Lower air pressure in the station causes expansion", correct: false },
      { text: "Lack of exercise reduces circulation", correct: false }
    ],
    explanation: "On Earth, hydrostatic pressure keeps about 2 liters of blood in your legs. In microgravity, without the ρgh gradient, blood redistributes evenly, causing facial puffiness and thin legs - a direct demonstration of hydrostatic effects."
  },
  {
    scenario: "A hydraulic car lift uses Pascal's principle. A mechanic applies 50 N of force to a small piston (area 0.01 m²), which connects to a large piston (area 0.5 m²) supporting a car.",
    question: "What maximum weight can this lift support?",
    options: [
      { text: "2,500 N - pressure transmits equally, force multiplies by area ratio", correct: true },
      { text: "50 N - force cannot be amplified", correct: false },
      { text: "25 N - force is divided by area ratio", correct: false },
      { text: "5,000 N - force multiplies by 100", correct: false }
    ],
    explanation: "By Pascal's principle, pressure transmits equally throughout the fluid: P = F₁/A₁ = F₂/A₂. So F₂ = F₁ × (A₂/A₁) = 50 × (0.5/0.01) = 50 × 50 = 2,500 N. This is hydraulic force multiplication."
  },
  {
    scenario: "A submarine descends to the Mariana Trench, reaching a depth of 10,900 meters. The submarine's hull is made of titanium designed to withstand extreme compression.",
    question: "What approximate pressure does the hull experience at this depth?",
    options: [
      { text: "About 1,100 atmospheres - roughly 1 atm per 10 meters of seawater", correct: true },
      { text: "About 110 atmospheres - seawater is less dense than expected", correct: false },
      { text: "About 10,900 atmospheres - 1 atm per meter", correct: false },
      { text: "About 100 atmospheres - pressure stops increasing at depth", correct: false }
    ],
    explanation: "Using P = ρgh with seawater (ρ ≈ 1025 kg/m³): P = 1025 × 9.81 × 10900 ≈ 110 MPa ≈ 1,086 atm. This is why only specially designed vessels can reach these depths - the pressure is crushing."
  },
  {
    scenario: "A city water tower stands 40 meters tall. An engineer needs to determine if this height is sufficient to supply water to the 10th floor of a building (30 meters high) without pumps.",
    question: "Will the water tower provide adequate pressure to reach the 10th floor?",
    options: [
      { text: "Yes - the 10m height difference creates enough pressure to push water up", correct: true },
      { text: "No - water cannot flow uphill without pumps", correct: false },
      { text: "Only if the pipe diameter is large enough", correct: false },
      { text: "Only during low-demand periods", correct: false }
    ],
    explanation: "With 40m tower height and 30m building height, there's a 10m head difference. This creates ρgh = 1000 × 9.81 × 10 ≈ 98 kPa of driving pressure - about 1 atm, plenty to push water to the 10th floor."
  },
  {
    scenario: "A blood pressure cuff measures 120/80 mmHg when placed on a patient's arm at heart level. The doctor wants to understand how position affects readings.",
    question: "If the cuff were placed on the ankle instead (about 1m below heart), how would the reading change?",
    options: [
      { text: "Increase by about 75 mmHg due to the hydrostatic column of blood", correct: true },
      { text: "Decrease because blood has to pump against gravity", correct: false },
      { text: "Stay the same - the heart pumps equally everywhere", correct: false },
      { text: "Increase by about 10 mmHg - blood is mostly water", correct: false }
    ],
    explanation: "Blood (ρ ≈ 1060 kg/m³) creates a hydrostatic column: P = ρgh = 1060 × 9.81 × 1 ≈ 10,400 Pa ≈ 78 mmHg. Ankle readings are typically 80-100 mmHg higher than arm readings for this reason."
  },
  {
    scenario: "Pascal's famous barrel experiment in 1646 used a sealed barrel filled with water, with a tall thin tube inserted through the top. He climbed to a balcony and poured water into the tube.",
    question: "What happened when Pascal poured just a few cups of water into the 10-meter tall tube?",
    options: [
      { text: "The barrel burst - the height created enormous pressure regardless of volume", correct: true },
      { text: "Nothing unusual - the small volume couldn't create significant pressure", correct: false },
      { text: "Water slowly leaked from the barrel seams", correct: false },
      { text: "The tube overflowed but the barrel was fine", correct: false }
    ],
    explanation: "This dramatic demonstration proved the Hydrostatic Paradox: a 10m column creates P = 1000 × 9.81 × 10 ≈ 100 kPa ≈ 1 atm of additional pressure - regardless of the tube's tiny volume. The barrel couldn't withstand this and burst spectacularly."
  }
];

const transferApps: TransferApp[] = [
  {
    icon: "🏗️",
    title: "Dam Engineering",
    short: "Dams",
    tagline: "Holding back millions of tons of water",
    description: "Modern dams are marvels of hydrostatic engineering, designed to withstand pressure that increases dramatically with depth. Every meter of water adds predictable force.",
    connection: "The fundamental equation P = ρgh determines dam wall thickness at every level. Engineers must account for hydrostatic pressure acting perpendicular to the dam face, which increases linearly with depth.",
    howItWorks: [
      "Calculate pressure at each depth using P = ρgh",
      "Design wall thickness to resist horizontal hydrostatic force",
      "Include safety factors for dynamic loads (waves, earthquakes)",
      "Install pressure relief systems and monitoring sensors",
      "Use curved shapes to transfer loads to canyon walls"
    ],
    stats: [
      { value: "1.8 MPa", label: "Pressure at 180m depth" },
      { value: "200m", label: "Hoover Dam base thickness" },
      { value: "6.6M tons", label: "Concrete in Three Gorges Dam" },
      { value: "$100B+", label: "Global dam infrastructure value" }
    ],
    examples: [
      "Hoover Dam withstands 180m water column",
      "Three Gorges Dam - world's largest hydroelectric",
      "Oroville Dam spillway failure analysis",
      "Vajont Dam disaster - wave overtopping"
    ],
    companies: ["Bechtel", "China Three Gorges Corporation", "Strabag", "Bureau of Reclamation"],
    futureImpact: "Climate change is altering precipitation patterns, requiring dams to handle both extreme floods and droughts. New designs incorporate hydrostatic principles with smart sensors.",
    color: "from-slate-600 to-gray-600"
  },
  {
    icon: "🤿",
    title: "Scuba Diving & Deep Sea",
    short: "Diving",
    tagline: "Exploring the pressure frontier",
    description: "Divers experience hydrostatic pressure directly as they descend. Understanding P = ρgh is literally a matter of life and death for managing nitrogen absorption and decompression.",
    connection: "Every 10m of seawater adds about 1 atmosphere of pressure. Divers breathe compressed air at ambient pressure, but must manage gas dissolution into blood tissues following Henry's Law.",
    howItWorks: [
      "Pressure doubles at 10m, triples at 20m, etc.",
      "Nitrogen dissolves into blood proportionally to pressure",
      "Ascent speed limited to allow safe nitrogen off-gassing",
      "Decompression stops required for deep/long dives",
      "Dive computers continuously calculate safe ascent profiles"
    ],
    stats: [
      { value: "40m", label: "Recreational dive limit" },
      { value: "332m", label: "World record scuba depth" },
      { value: "1,100 atm", label: "Mariana Trench pressure" },
      { value: "15-30 ft/min", label: "Safe ascent rate" }
    ],
    examples: [
      "Technical diving with mixed gases",
      "Saturation diving for offshore work",
      "James Cameron's Deepsea Challenger",
      "Navy submarine rescue operations"
    ],
    companies: ["Rolex (Deepsea)", "Triton Submarines", "PADI", "Dräger"],
    futureImpact: "New materials and life support systems are enabling deeper exploration. Understanding hydrostatic physiology is key to human presence in extreme depths.",
    color: "from-blue-600 to-cyan-600"
  },
  {
    icon: "🗼",
    title: "Municipal Water Systems",
    short: "Water",
    tagline: "Gravity-powered delivery to millions",
    description: "Cities have used elevated water storage for centuries. The height of water towers directly determines delivery pressure using the fundamental hydrostatic equation.",
    connection: "A water tower's height creates pressure P = ρgh at ground level. A 30m tower provides about 3 atm - enough to reach the 3rd floor without pumps. This passive system requires no electricity.",
    howItWorks: [
      "Elevate water storage to create potential energy",
      "Height converts to pressure via P = ρgh",
      "Pumps fill towers during low-demand periods",
      "Gravity provides consistent pressure 24/7",
      "Multiple towers balance pressure across city zones"
    ],
    stats: [
      { value: "30-50m", label: "Typical tower height" },
      { value: "3-5 atm", label: "Delivery pressure range" },
      { value: "500K gal", label: "Large tower capacity" },
      { value: "99.9%", label: "System reliability" }
    ],
    examples: [
      "New York City's hilltop reservoirs",
      "Singapore's elevated storage network",
      "Dubai's pressure-boosted high-rises",
      "Rural water tower systems"
    ],
    companies: ["American Water", "Veolia", "Xylem", "Suez"],
    futureImpact: "Smart water systems combine traditional hydrostatic principles with IoT sensors and predictive maintenance to reduce losses and optimize pressure management.",
    color: "from-sky-600 to-blue-600"
  },
  {
    icon: "🚗",
    title: "Hydraulic Systems",
    short: "Hydraulics",
    tagline: "Pascal's principle in action",
    description: "From car brakes to construction equipment, hydraulic systems use incompressible fluids to transmit force. Pascal's principle - that pressure transmits equally - enables enormous force multiplication.",
    connection: "Pascal's principle states that pressure applied to an enclosed fluid transmits equally throughout. Combined with different piston areas (F = P × A), small forces can lift tons.",
    howItWorks: [
      "Apply force to small piston (high pressure, low volume)",
      "Pressure transmits equally through hydraulic fluid",
      "Large piston receives same pressure over larger area",
      "Force multiplies by ratio of piston areas",
      "Trade-off: large piston moves shorter distance"
    ],
    stats: [
      { value: "50:1", label: "Typical force multiplication" },
      { value: "700 bar", label: "Industrial hydraulic pressure" },
      { value: "100+ tons", label: "Hydraulic press capacity" },
      { value: "$50B", label: "Global hydraulics market" }
    ],
    examples: [
      "Automotive brake systems",
      "Excavators and construction equipment",
      "Aircraft control surfaces",
      "Industrial stamping presses"
    ],
    companies: ["Bosch Rexroth", "Parker Hannifin", "Caterpillar", "Eaton"],
    futureImpact: "Electro-hydraulic systems combine the force density of hydraulics with precision electric control. Biodegradable fluids are reducing environmental impact.",
    color: "from-orange-600 to-red-600"
  }
];

// =============================================
// COMPONENT
// =============================================
const HydrostaticPressureRenderer: React.FC<Props> = ({
  currentPhase = 0,
  onPhaseComplete,
  onGameEvent
}) => {
  // Phase and navigation state
  const [phase, setPhase] = useState(currentPhase);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictionResult, setShowPredictionResult] = useState(false);
  const [paradoxPrediction, setParadoxPrediction] = useState<string | null>(null);
  const [showParadoxResult, setShowParadoxResult] = useState(false);

  // Simulation states
  const [depth, setDepth] = useState(10);
  const [fluidDensity, setFluidDensity] = useState(1000);
  const [showPressureArrows, setShowPressureArrows] = useState(true);
  const [animationOffset, setAnimationOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Transfer states
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // =============================================
  // CALCULATIONS
  // =============================================
  const hydrostaticPressure = fluidDensity * GRAVITY * depth;
  const totalPressure = ATM_PRESSURE + hydrostaticPressure;
  const pressureInAtm = totalPressure / ATM_PRESSURE;

  // =============================================
  // EFFECTS
  // =============================================
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setPhase(currentPhase);
  }, [currentPhase]);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationOffset(prev => (prev + 1) % 60);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // =============================================
  // AUDIO
  // =============================================
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'transition' | 'complete' | 'bubble') => {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'click':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'error':
          oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(277, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'bubble':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.2);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.6);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.6);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  // =============================================
  // NAVIGATION
  // =============================================
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    if (newPhase < 0 || newPhase > 9) return;

    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);

    onGameEvent?.({
      type: 'phase_change',
      data: { from: phase, to: newPhase, phaseName: phaseNames[newPhase] }
    });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [phase, playSound, onGameEvent]);

  const completePhase = useCallback(() => {
    onPhaseComplete?.(phase);
    if (phase < 9) {
      goToPhase(phase + 1);
    }
  }, [phase, onPhaseComplete, goToPhase]);

  // =============================================
  // EVENT HANDLERS
  // =============================================
  const handlePrediction = useCallback((answer: string) => {
    setPrediction(answer);
    setShowPredictionResult(true);
    const isCorrect = answer === 'B';
    playSound(isCorrect ? 'success' : 'error');
    onGameEvent?.({ type: 'prediction_made', data: { answer, correct: isCorrect } });
  }, [playSound, onGameEvent]);

  const handleParadoxPrediction = useCallback((answer: string) => {
    setParadoxPrediction(answer);
    setShowParadoxResult(true);
    const isCorrect = answer === 'C';
    playSound(isCorrect ? 'success' : 'error');
    onGameEvent?.({ type: 'paradox_discovered', data: { answer, correct: isCorrect } });
  }, [playSound, onGameEvent]);

  const handleDepthChange = useCallback((newDepth: number) => {
    setDepth(newDepth);
    playSound('bubble');
    onGameEvent?.({ type: 'depth_changed', data: { depth: newDepth } });
  }, [playSound, onGameEvent]);

  const handleFluidChange = useCallback((density: number) => {
    setFluidDensity(density);
    playSound('click');
    onGameEvent?.({ type: 'fluid_changed', data: { density } });
  }, [playSound, onGameEvent]);

  const handleAppExplore = useCallback((index: number) => {
    setActiveApp(index);
    if (!completedApps.has(index)) {
      setCompletedApps(prev => new Set([...prev, index]));
      playSound('success');
      onGameEvent?.({ type: 'app_explored', data: { app: transferApps[index].title } });
    }
  }, [completedApps, playSound, onGameEvent]);

  const handleAnswerSelect = useCallback((index: number) => {
    if (answeredQuestions.has(currentQuestion)) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = testQuestions[currentQuestion].options[index].correct;
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      playSound('success');
    } else {
      playSound('error');
    }

    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    onGameEvent?.({ type: 'test_answered', data: { question: currentQuestion, correct: isCorrect } });
  }, [currentQuestion, answeredQuestions, playSound, onGameEvent]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      onGameEvent?.({ type: 'test_completed', data: { score: correctAnswers, total: testQuestions.length } });
      if (correctAnswers >= 7) {
        playSound('complete');
        completePhase();
      }
    }
  }, [currentQuestion, correctAnswers, playSound, completePhase, onGameEvent]);

  // =============================================
  // RENDER FUNCTIONS
  // =============================================

  const renderPressureTank = (width: number = 400, height: number = 320) => {
    const tankTop = 50;
    const tankHeight = 200;
    const tankLeft = 80;
    const tankWidth = 160;
    const depthRatio = depth / 50; // max depth 50m for visualization
    const objectY = tankTop + depthRatio * tankHeight;

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
          </linearGradient>
          <marker id="pressureArrowGreen" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="12" />

        {/* Tank body */}
        <rect x={tankLeft} y={tankTop} width={tankWidth} height={tankHeight}
              fill="url(#waterGradient)" stroke="#64748b" strokeWidth="3" rx="8" />

        {/* Surface line */}
        <line x1={tankLeft} y1={tankTop + 5} x2={tankLeft + tankWidth} y2={tankTop + 5}
              stroke="#7dd3fc" strokeWidth="2" strokeDasharray="5,5" />
        <text x={tankLeft - 10} y={tankTop + 8} textAnchor="end" fill="#7dd3fc" fontSize="10">Surface</text>

        {/* Depth markers */}
        {[0, 10, 20, 30, 40, 50].map((d, i) => {
          const y = tankTop + (d / 50) * tankHeight;
          return (
            <g key={i}>
              <line x1={tankLeft - 8} y1={y} x2={tankLeft} y2={y} stroke="#94a3b8" strokeWidth="1" />
              <text x={tankLeft - 12} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="9">{d}m</text>
            </g>
          );
        })}

        {/* Object/Diver at current depth */}
        <g transform={`translate(${tankLeft + tankWidth/2}, ${Math.min(objectY, tankTop + tankHeight - 20)})`}>
          <circle r="18" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
          <text y="5" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">
            {depth}m
          </text>
        </g>

        {/* Pressure arrows from all directions */}
        {showPressureArrows && (
          <g transform={`translate(${tankLeft + tankWidth/2}, ${Math.min(objectY, tankTop + tankHeight - 20)})`}>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const length = 25 + (depth / 50) * 30;
              const rad = (angle * Math.PI) / 180;
              const x1 = Math.cos(rad) * 25;
              const y1 = Math.sin(rad) * 25;
              const x2 = Math.cos(rad) * (25 + length);
              const y2 = Math.sin(rad) * (25 + length);
              return (
                <line
                  key={i}
                  x1={x2} y1={y2}
                  x2={x1} y2={y1}
                  stroke="#22c55e"
                  strokeWidth="2"
                  markerEnd="url(#pressureArrowGreen)"
                  opacity={0.8}
                />
              );
            })}
          </g>
        )}

        {/* Bubbles animation */}
        {[1, 2, 3].map(i => {
          const bubbleY = tankTop + tankHeight - ((animationOffset * 2 + i * 40) % tankHeight);
          const bubbleX = tankLeft + 30 + i * 40;
          return (
            <circle
              key={i}
              cx={bubbleX}
              cy={bubbleY}
              r={3 + i}
              fill="white"
              opacity={0.3 + (bubbleY - tankTop) / tankHeight * 0.3}
            />
          );
        })}

        {/* Pressure readout panel */}
        <rect x={width - 130} y="60" width="120" height="130" fill="#1e293b" rx="8" stroke="#374151" />
        <text x={width - 70} y="82" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">PRESSURE</text>

        <text x={width - 70} y="108" textAnchor="middle" fill="#22c55e" fontSize="18" fontWeight="bold">
          {(hydrostaticPressure / 1000).toFixed(1)}
        </text>
        <text x={width - 70} y="122" textAnchor="middle" fill="#94a3b8" fontSize="10">kPa (hydrostatic)</text>

        <text x={width - 70} y="152" textAnchor="middle" fill="#3b82f6" fontSize="18" fontWeight="bold">
          {pressureInAtm.toFixed(2)}
        </text>
        <text x={width - 70} y="166" textAnchor="middle" fill="#94a3b8" fontSize="10">atm (total)</text>

        {/* Formula */}
        <text x={width/2} y={height - 35} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">
          P = ρgh = {fluidDensity} × 9.81 × {depth}
        </text>
        <text x={width/2} y={height - 15} textAnchor="middle" fill="#94a3b8" fontSize="11">
          = {(hydrostaticPressure / 1000).toFixed(1)} kPa = {(hydrostaticPressure / ATM_PRESSURE).toFixed(2)} atm
        </text>
      </svg>
    );
  };

  const renderPhase0 = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-cyan-400 text-sm font-medium">Fluid Mechanics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent mb-3`}>
        Hydrostatic Pressure
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover why the ocean depths are so crushing
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl mb-8">
        <svg width={isMobile ? 300 : 380} height={200} className="mx-auto">
          <defs>
            <linearGradient id="hookWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <rect width={isMobile ? 300 : 380} height="200" fill="#0c1929" rx="10" />

          {/* Swimming pool cross-section */}
          <path d={isMobile
            ? "M20,40 L20,180 L280,180 L280,40 Q250,40 250,70 L250,160 L50,160 L50,70 Q50,40 20,40"
            : "M30,40 L30,180 L350,180 L350,40 Q310,40 310,80 L310,160 L70,160 L70,80 Q70,40 30,40"
          }
                fill="url(#hookWaterGrad)" opacity="0.7" />

          {/* Surface indicators */}
          <text x={isMobile ? 80 : 100} y="30" fill="#94a3b8" fontSize="10">Surface: 1 atm</text>
          <circle cx={isMobile ? 80 : 100} cy="55" r="10" fill="#fbbf24" />

          {/* Deep diver */}
          <text x={isMobile ? 180 : 220} y="120" fill="#ef4444" fontSize="10" fontWeight="bold">10m: 2 atm!</text>
          <circle cx={isMobile ? 180 : 220} cy="140" r="10" fill="#fbbf24" />
        </svg>

        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-slate-300 mt-6 mb-4`}>
          Why do your ears hurt when you dive to the bottom of a deep pool?
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          At just 10 meters deep, the pressure DOUBLES!
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-2xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Discover the Science
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

  const renderPhase1 = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Make Your Prediction
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Why does pressure increase as you go deeper in water?
        </p>
        <svg width={isMobile ? 280 : 340} height={140} className="mx-auto">
          <rect width={isMobile ? 280 : 340} height="140" fill="#0f172a" rx="8" />
          <rect x={(isMobile ? 280 : 340)/2 - 40} y="20" width="80" height="90" fill="#3b82f6" opacity="0.5" rx="4" />
          <text x={(isMobile ? 280 : 340)/2} y="50" textAnchor="middle" fill="#ffffff" fontSize="11">Water above</text>
          <text x={(isMobile ? 280 : 340)/2} y="68" textAnchor="middle" fill="#ffffff" fontSize="11">pushes down</text>
          <line x1={(isMobile ? 280 : 340)/2} y1="75" x2={(isMobile ? 280 : 340)/2} y2="105" stroke="#22c55e" strokeWidth="3" markerEnd="url(#predArrowGreen)" />
          <text x={(isMobile ? 280 : 340)/2} y="130" textAnchor="middle" fill="#94a3b8" fontSize="10">More depth = More weight = More pressure</text>
          <defs>
            <marker id="predArrowGreen" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
      </div>
      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'A', text: 'Water gets colder and denser at depth' },
          { id: 'B', text: 'The weight of water above pushes down' },
          { id: 'C', text: 'Gravity is stronger at greater depths' },
          { id: 'D', text: 'Light pressure adds to water pressure' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionResult}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionResult && prediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionResult && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionResult && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-md">
          <p className={`font-semibold ${prediction === 'B' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {prediction === 'B'
              ? '✓ Correct! The weight of water above creates hydrostatic pressure.'
              : '✗ Not quite. Think about what physically pushes on you underwater.'}
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPhase2 = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
        Hydrostatic Pressure Lab
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderPressureTank(isMobile ? 340 : 420, isMobile ? 280 : 320)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-sm text-slate-300 mb-2 block">Depth: {depth} m</label>
          <input
            type="range"
            min="0"
            max="50"
            value={depth}
            onChange={(e) => handleDepthChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-sm text-slate-300 mb-2 block">Fluid Type</label>
          <select
            value={fluidDensity}
            onChange={(e) => handleFluidChange(Number(e.target.value))}
            className="w-full bg-slate-600 text-white p-2 rounded-lg"
          >
            <option value={1000}>Fresh Water (1,000 kg/m³)</option>
            <option value={1025}>Salt Water (1,025 kg/m³)</option>
            <option value={13600}>Mercury (13,600 kg/m³)</option>
            <option value={789}>Ethanol (789 kg/m³)</option>
          </select>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); setShowPressureArrows(!showPressureArrows); }}
        className={`px-4 py-2 rounded-xl font-semibold mb-4 transition-all ${
          showPressureArrows
            ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
        }`}
      >
        {showPressureArrows ? 'Hide Pressure Arrows' : 'Show Pressure Arrows'}
      </button>

      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 max-w-2xl">
        <h3 className="text-cyan-400 font-bold mb-2">Key Observations:</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>• Pressure increases <span className="text-cyan-400">linearly</span> with depth</li>
          <li>• Pressure acts <span className="text-amber-400">equally in all directions</span> at any point</li>
          <li>• Denser fluids create <span className="text-emerald-400">higher pressure</span> at same depth</li>
          <li>• Every 10m of water adds approximately <span className="text-cyan-400">1 atmosphere</span></li>
        </ul>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
      >
        Learn the Formula →
      </button>
    </div>
  );

  const renderPhase3 = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        The Hydrostatic Equation
      </h2>

      <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <div className="bg-slate-800/50 p-6 rounded-xl mb-6 text-center">
          <p className="text-4xl font-mono text-cyan-400 font-bold mb-2">P = ρgh</p>
          <p className="text-slate-400">Hydrostatic Pressure Equation</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono text-cyan-400 font-bold w-8">P</span>
              <span className="text-slate-300">Pressure (Pascals)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono text-amber-400 font-bold w-8">ρ</span>
              <span className="text-slate-300">Fluid density (kg/m³)</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono text-emerald-400 font-bold w-8">g</span>
              <span className="text-slate-300">Gravity (9.81 m/s²)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono text-purple-400 font-bold w-8">h</span>
              <span className="text-slate-300">Depth below surface (m)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-emerald-400 mb-4">Quick Reference:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-cyan-400 font-bold">0m</p>
            <p className="text-sm text-slate-400">1 atm</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-cyan-400 font-bold">10m</p>
            <p className="text-sm text-slate-400">2 atm</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-cyan-400 font-bold">30m</p>
            <p className="text-sm text-slate-400">4 atm</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3">
            <p className="text-cyan-400 font-bold">11km</p>
            <p className="text-sm text-slate-400">~1,100 atm!</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-4 text-center">
          Mariana Trench depth - pressure crushes most submarines!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        Discover the Paradox →
      </button>
    </div>
  );

  const renderPhase4 = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        The Hydrostatic Paradox
      </h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg width={isMobile ? 300 : 380} height={160} className="mx-auto">
          <rect width={isMobile ? 300 : 380} height="160" fill="#0f172a" rx="8" />

          {/* Wide tank */}
          <rect x="30" y="40" width="80" height="80" fill="#3b82f6" opacity="0.5" rx="4" />
          <text x="70" y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Wide tank</text>
          <text x="70" y="25" textAnchor="middle" fill="#ffffff" fontSize="10">1000 L</text>

          {/* Medium tube */}
          <rect x={(isMobile ? 150 : 180) - 20} y="40" width="40" height="80" fill="#3b82f6" opacity="0.5" rx="4" />
          <text x={isMobile ? 150 : 180} y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Tube</text>
          <text x={isMobile ? 150 : 180} y="25" textAnchor="middle" fill="#ffffff" fontSize="10">10 L</text>

          {/* Thin tube */}
          <rect x={(isMobile ? 240 : 300) - 5} y="40" width="10" height="80" fill="#3b82f6" opacity="0.5" rx="2" />
          <text x={isMobile ? 240 : 300} y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Thin tube</text>
          <text x={isMobile ? 240 : 300} y="25" textAnchor="middle" fill="#ffffff" fontSize="10">0.1 L</text>

          {/* Height indicator */}
          <line x1={(isMobile ? 280 : 350)} y1="40" x2={(isMobile ? 280 : 350)} y2="120" stroke="#fbbf24" strokeWidth="2" />
          <text x={(isMobile ? 285 : 360)} y="80" textAnchor="start" fill="#fbbf24" fontSize="10" transform={`rotate(90, ${isMobile ? 285 : 360}, 80)`}>Same height!</text>
        </svg>
        <p className="text-lg text-slate-300 mb-4 mt-4">
          Three containers with vastly different water volumes, but filled to the same height.
        </p>
        <p className="text-lg text-purple-400 font-medium">
          Which has the highest pressure at the bottom?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-md">
        {[
          { id: 'A', text: 'Wide tank - most water means most pressure' },
          { id: 'B', text: 'Thin tube - water is more concentrated' },
          { id: 'C', text: 'All equal! Only height matters' },
          { id: 'D', text: 'Cannot determine without exact volumes' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleParadoxPrediction(option.id); }}
            disabled={showParadoxResult}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showParadoxResult && paradoxPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showParadoxResult && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showParadoxResult && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-md">
          <p className={`font-semibold ${paradoxPrediction === 'C' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {paradoxPrediction === 'C'
              ? '✓ Exactly! This is the Hydrostatic Paradox!'
              : '✗ Surprising, but pressure only depends on height!'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            P = ρgh - volume doesn't appear in the equation! Only depth matters.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            See Pascal's Proof →
          </button>
        </div>
      )}
    </div>
  );

  const renderPhase5 = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>
        Pascal's Barrel Experiment (1646)
      </h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg width={isMobile ? 280 : 350} height={200} className="mx-auto">
          <rect width={isMobile ? 280 : 350} height="200" fill="#0f172a" rx="8" />

          {/* Building with balcony */}
          <rect x="20" y="30" width="60" height="160" fill="#64748b" />
          <rect x="60" y="50" width="30" height="10" fill="#94a3b8" />

          {/* Pascal on balcony */}
          <circle cx="75" cy="45" r="8" fill="#fcd9b6" />
          <rect x="70" y="53" width="10" height="15" fill="#3b82f6" />

          {/* Thin tube from balcony to barrel */}
          <line x1="75" y1="68" x2="75" y2="10" stroke="#60a5fa" strokeWidth="4" />
          <rect x="73" y="10" width="4" height="10" fill="#3b82f6" opacity="0.8" />

          {/* Barrel */}
          <ellipse cx={(isMobile ? 200 : 250)} cy="175" rx="50" ry="15" fill="#8b4513" />
          <rect x={(isMobile ? 150 : 200)} y="110" width="100" height="65" fill="#8b4513" />
          <ellipse cx={(isMobile ? 200 : 250)} cy="110" rx="50" ry="15" fill="#a0522d" />

          {/* Water in barrel */}
          <ellipse cx={(isMobile ? 200 : 250)} cy="115" rx="45" ry="12" fill="#3b82f6" opacity="0.6" />

          {/* Tube connecting to barrel */}
          <path d={`M75,68 L75,100 L${isMobile ? 200 : 250},100 L${isMobile ? 200 : 250},110`}
                fill="none" stroke="#60a5fa" strokeWidth="4" />

          {/* Explosion marks */}
          <text x={(isMobile ? 200 : 250)} y="145" textAnchor="middle" fill="#ef4444" fontSize="20">💥</text>

          <text x={(isMobile ? 140 : 175)} y="195" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">
            BURST!
          </text>
        </svg>

        <div className="mt-4 space-y-3 text-slate-300">
          <p className="font-semibold text-purple-400">What happened:</p>
          <ul className="text-sm space-y-2">
            <li>• Pascal attached a thin 10-meter tube to a sealed barrel of water</li>
            <li>• He climbed to a balcony and poured just a few cups of water into the tube</li>
            <li>• The tiny volume of water created <span className="text-cyan-400">enormous pressure</span> due to the 10m height</li>
            <li>• The barrel <span className="text-red-400 font-bold">BURST</span> from less than 1 liter of added water!</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 max-w-2xl">
        <p className="text-emerald-400 font-semibold mb-2">The Lesson:</p>
        <p className="text-slate-300 text-sm">
          A 10m water column creates P = 1000 × 9.81 × 10 ≈ <span className="text-cyan-400">100 kPa ≈ 1 atm</span> of pressure -
          regardless of how thin the tube is. Shape and volume are irrelevant; <span className="text-amber-400">only height matters!</span>
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all"
      >
        Apply the Knowledge →
      </button>
    </div>
  );

  const renderPhase6 = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
        Summary: Hydrostatic Pressure
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">The Core Equation</h3>
          <div className="text-4xl text-center text-white font-mono mb-4">P = ρgh</div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Pressure increases linearly with depth</li>
            <li>• Every 10m of water ≈ +1 atmosphere</li>
            <li>• Denser fluids = higher pressure</li>
            <li>• Shape/volume don't matter - only height!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Key Principles</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Pressure acts equally in all directions</li>
            <li>• This is Pascal's Principle</li>
            <li>• Hydrostatic Paradox: volume ≠ pressure</li>
            <li>• Enables hydraulic force multiplication</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 max-w-4xl">
        <h3 className="text-xl font-bold text-emerald-400 mb-4">Key Applications</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl mb-2">🏗️</div>
            <p className="text-sm text-slate-300">Dam Design</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🤿</div>
            <p className="text-sm text-slate-300">Diving Safety</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🗼</div>
            <p className="text-sm text-slate-300">Water Towers</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🚗</div>
            <p className="text-sm text-slate-300">Hydraulics</p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
      >
        See Real-World Applications →
      </button>
    </div>
  );

  const renderPhase7 = () => {
    const app = transferApps[activeApp];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>
          Real-World Applications
        </h2>

        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {transferApps.map((a, index) => (
            <button
              key={index}
              onMouseDown={(e) => { e.preventDefault(); handleAppExplore(index); }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeApp === index
                  ? `bg-gradient-to-r ${a.color} text-white`
                  : completedApps.has(index)
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-600'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{app.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-slate-400">{app.tagline}</p>
            </div>
          </div>

          <p className="text-slate-300 mb-4">{app.description}</p>

          <div className={`bg-gradient-to-r ${app.color} bg-opacity-20 rounded-xl p-4 mb-4`}>
            <h4 className="font-semibold text-white mb-2">Physics Connection:</h4>
            <p className="text-slate-200 text-sm">{app.connection}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-cyan-400 mb-2">How It Works:</h4>
              <ul className="text-slate-300 text-sm space-y-1">
                {app.howItWorks.slice(0, 3).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-amber-400 mb-2">Key Stats:</h4>
              <div className="grid grid-cols-2 gap-2">
                {app.stats.slice(0, 4).map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-xl p-4">
            <h4 className="font-semibold text-purple-400 mb-2">Industry Leaders:</h4>
            <div className="flex flex-wrap gap-2">
              {app.companies.map((company, i) => (
                <span key={i} className="px-3 py-1 bg-slate-600/50 rounded-full text-sm text-slate-300">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-slate-400">Explored:</span>
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
          <span className="text-slate-400">{completedApps.size}/{transferApps.length}</span>
        </div>

        {completedApps.size >= transferApps.length && (
          <button
            onMouseDown={(e) => { e.preventDefault(); completePhase(); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderPhase8 = () => {
    const question = testQuestions[currentQuestion];
    const progress = (answeredQuestions.size / testQuestions.length) * 100;

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>
          Knowledge Test
        </h2>

        <div className="w-full max-w-2xl mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentQuestion + 1} of {testQuestions.length}</span>
            <span>{correctAnswers} correct</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full mb-6">
          <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
            <p className="text-sm text-cyan-400 font-medium mb-2">Scenario:</p>
            <p className="text-slate-300">{question.scenario}</p>
          </div>

          <p className="text-lg text-white font-medium mb-4">{question.question}</p>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onMouseDown={(e) => { e.preventDefault(); handleAnswerSelect(index); }}
                disabled={answeredQuestions.has(currentQuestion)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  showResult
                    ? option.correct
                      ? 'bg-emerald-600/40 border-2 border-emerald-400'
                      : selectedAnswer === index
                      ? 'bg-red-600/40 border-2 border-red-400'
                      : 'bg-slate-700/30 border-2 border-transparent opacity-50'
                    : selectedAnswer === index
                    ? 'bg-cyan-600/40 border-2 border-cyan-400'
                    : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                }`}
              >
                <span className="text-slate-200">{option.text}</span>
              </button>
            ))}
          </div>

          {showResult && (
            <div className={`mt-4 p-4 rounded-xl ${
              question.options[selectedAnswer!]?.correct
                ? 'bg-emerald-900/30 border border-emerald-600'
                : 'bg-amber-900/30 border border-amber-600'
            }`}>
              <p className={`font-semibold mb-2 ${
                question.options[selectedAnswer!]?.correct ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {question.options[selectedAnswer!]?.correct ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-slate-300 text-sm">{question.explanation}</p>
            </div>
          )}
        </div>

        {showResult && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleNextQuestion(); }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            {currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →'}
          </button>
        )}
      </div>
    );
  };

  const renderPhase9 = () => {
    const passed = correctAnswers >= 7;

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className={`rounded-3xl p-8 max-w-2xl ${
          passed
            ? 'bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50'
            : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50'
        }`}>
          <div className="text-8xl mb-6">{passed ? '🌊' : '📚'}</div>
          <h1 className={`text-3xl font-bold mb-4 ${passed ? 'text-white' : 'text-slate-300'}`}>
            {passed ? 'Hydrostatic Pressure Master!' : 'Keep Learning!'}
          </h1>

          <div className="text-5xl font-bold text-cyan-400 mb-4">
            {correctAnswers}/10
          </div>

          <p className="text-xl text-slate-300 mb-6">
            {passed
              ? "You've mastered the physics of fluid pressure! From deep-sea diving to hydraulic systems."
              : "Review the concepts and try again. Understanding hydrostatic pressure is fundamental to fluid mechanics."}
          </p>

          {passed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">📐</div>
                <p className="text-sm text-slate-300">P = ρgh</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🎯</div>
                <p className="text-sm text-slate-300">Pascal's Paradox</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🏗️</div>
                <p className="text-sm text-slate-300">Dam Engineering</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🚗</div>
                <p className="text-sm text-slate-300">Hydraulics</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setCurrentQuestion(0);
                setSelectedAnswer(null);
                setShowResult(false);
                setCorrectAnswers(0);
                setAnsweredQuestions(new Set());
                goToPhase(passed ? 0 : 8);
              }}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                passed
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
              }`}
            >
              {passed ? '↺ Start Over' : 'Try Again'}
            </button>
            {!passed && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
              >
                Review Concepts
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  const renderPhase = () => {
    switch (phase) {
      case 0: return renderPhase0();
      case 1: return renderPhase1();
      case 2: return renderPhase2();
      case 3: return renderPhase3();
      case 4: return renderPhase4();
      case 5: return renderPhase5();
      case 6: return renderPhase6();
      case 7: return renderPhase7();
      case 8: return renderPhase8();
      case 9: return renderPhase9();
      default: return renderPhase0();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/50 via-transparent to-blue-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>
            {isMobile ? 'Hydrostatic' : 'Hydrostatic Pressure'}
          </span>
          <div className="flex gap-1.5 items-center">
            {phaseNames.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i ? 'bg-cyan-500 w-6' : i < phase ? 'bg-cyan-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseNames[i]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseNames[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default HydrostaticPressureRenderer;
