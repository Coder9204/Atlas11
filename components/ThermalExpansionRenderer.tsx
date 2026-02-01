'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// THERMAL EXPANSION GAME - GOLD STANDARD IMPLEMENTATION
// ============================================================================
// Physics: ΔL = αL₀ΔT (linear), ΔV = βV₀ΔT (volumetric, β ≈ 3α)
// Key insight: Materials expand when heated because atoms vibrate more,
// pushing each other apart - essential for engineering bridges, rails, etc.
// ============================================================================

// Phase type and order
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// Comprehensive event types for analytics
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'observation_complete'
  | 'answer_submitted'
  | 'answer_correct'
  | 'answer_incorrect'
  | 'application_viewed'
  | 'hint_requested'
  | 'experiment_started'
  | 'experiment_completed'
  | 'parameter_adjusted'
  | 'temperature_changed'
  | 'material_changed'
  | 'length_calculated'
  | 'stress_calculated'
  | 'gap_measured'
  | 'game_completed';

interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

// Test question with scenario-based learning
interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

// Rich application data structure
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string[];
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

// Material properties for simulation
interface Material {
  name: string;
  alpha: number; // Linear expansion coefficient (per °C) × 10^-6
  color: string;
  description: string;
}

interface ThermalExpansionRendererProps {
  onEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function ThermalExpansionRenderer({
  onEvent,
  gamePhase: externalPhase,
  onPhaseComplete
}: ThermalExpansionRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>(externalPhase as Phase ?? 'hook');
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [transferAppIndex, setTransferAppIndex] = useState(0);

  // Simulation state
  const [temperature, setTemperature] = useState(20); // Celsius
  const [baseTemperature] = useState(20);
  const [selectedMaterial, setSelectedMaterial] = useState(0);
  const [initialLength, setInitialLength] = useState(1000); // mm
  const [showAtomicView, setShowAtomicView] = useState(false);
  const [userPrediction, setUserPrediction] = useState<string | null>(null);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Materials with thermal expansion coefficients (× 10^-6 per °C)
  const materials: Material[] = [
    { name: 'Aluminum', alpha: 23.1, color: '#94a3b8', description: 'High expansion, lightweight' },
    { name: 'Steel', alpha: 12.0, color: '#6b7280', description: 'Moderate expansion, strong' },
    { name: 'Copper', alpha: 16.5, color: '#f97316', description: 'Good conductor, moderate expansion' },
    { name: 'Glass', alpha: 8.5, color: '#0ea5e9', description: 'Low expansion, brittle' },
    { name: 'Invar', alpha: 1.2, color: '#22c55e', description: 'Ultra-low expansion alloy' },
    { name: 'Concrete', alpha: 12.0, color: '#9ca3af', description: 'Similar to steel (reinforcement compatible)' }
  ];

const realWorldApps = [
  {
    icon: '🌉',
    title: 'Bridge Expansion Joints',
    short: 'Accommodating thermal movement in massive structures',
    tagline: 'Bridges that breathe with the seasons',
    description: 'Large bridges can expand several feet between winter and summer. Expansion joints allow controlled movement, preventing the enormous forces that would crack concrete and buckle steel.',
    connection: 'The formula L = L0 * alpha * delta T explains why the Golden Gate Bridge is 7 inches longer in summer than winter.',
    howItWorks: 'Finger joints, sliding plates, and modular systems create gaps that close in summer and open in winter. Bearings allow bridge sections to slide freely while supporting massive loads.',
    stats: [
      { value: '18cm', label: 'Golden Gate expansion', icon: '🌉' },
      { value: '12ppm/C', label: 'Steel expansion rate', icon: '📏' },
      { value: '50C', label: 'Typical temp range', icon: '🌡️' }
    ],
    examples: ['Golden Gate Bridge', 'Sydney Harbour Bridge', 'Highway overpasses', 'Railway bridges'],
    companies: ['Mageba', 'Freyssinet', 'D.S. Brown', 'Watson Bowman'],
    futureImpact: 'Shape-memory alloy joints will self-adjust to temperature changes, eliminating maintenance needs.',
    color: '#3B82F6'
  },
  {
    icon: '✈️',
    title: 'Aircraft Design',
    short: 'Managing thermal stress at Mach 2+',
    tagline: 'When metal meets friction heat',
    description: 'Supersonic aircraft skins heat to over 300C from air friction. The Concorde grew 10 inches longer in flight. Engineers must account for dramatic expansion while maintaining structural integrity.',
    connection: 'Different materials expanding at different rates create thermal stress. Aircraft use matching alloys and flexible joints to prevent cracking.',
    howItWorks: 'Titanium frames with aluminum skins use similar expansion coefficients. Overlapping panels slide past each other. Fuel tanks use the thermal expansion for cabin pressurization.',
    stats: [
      { value: '300C', label: 'Supersonic skin temp', icon: '🔥' },
      { value: '25cm', label: 'Concorde expansion', icon: '✈️' },
      { value: '23ppm/C', label: 'Aluminum expansion', icon: '📐' }
    ],
    examples: ['Concorde', 'SR-71 Blackbird', 'Space Shuttle', 'Hypersonic vehicles'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Carbon-carbon composites with near-zero expansion will enable sustained Mach 5+ flight.',
    color: '#EF4444'
  },
  {
    icon: '🔬',
    title: 'Precision Instruments',
    short: 'Defeating expansion for atomic-scale accuracy',
    tagline: 'Where nanometers matter',
    description: 'Scientific instruments like interferometers and electron microscopes use ultra-low expansion materials like Invar and Zerodur. A temperature change of 0.1C could ruin measurements.',
    connection: 'Invar\'s coefficient is just 1.2 ppm/C - 20 times lower than steel - because its magnetic properties counteract thermal expansion.',
    howItWorks: 'Low-expansion alloys, temperature-controlled enclosures, and symmetric designs minimize dimensional changes. Critical components use materials that expand in opposite directions to cancel out.',
    stats: [
      { value: '1.2ppm/C', label: 'Invar expansion', icon: '🎯' },
      { value: '0ppm/C', label: 'Zerodur at 20C', icon: '🔬' },
      { value: 'nm', label: 'Measurement precision', icon: '📏' }
    ],
    examples: ['LIGO gravitational wave detector', 'Hubble mirrors', 'Semiconductor steppers', 'Atomic clocks'],
    companies: ['Schott', 'Corning', 'ASML', 'Carl Zeiss'],
    futureImpact: 'Meta-materials with negative thermal expansion will create truly zero-expansion structures.',
    color: '#10B981'
  },
  {
    icon: '🚂',
    title: 'Railway Engineering',
    short: 'Letting steel rails grow with the sun',
    tagline: 'Miles of metal in motion',
    description: 'Rails expand 12mm per 100m for every 10C rise. Without expansion gaps, summer heat would buckle tracks. Modern continuously welded rail is pre-stressed to handle temperature extremes.',
    connection: 'Rail buckling occurs when thermal stress exceeds the lateral resistance of the track bed - a dramatic demonstration of thermal expansion forces.',
    howItWorks: 'Rails are welded at a neutral temperature (around 25C) while stretched. They\'re in tension when cold and compression when hot, but never buckle because stresses are controlled.',
    stats: [
      { value: '12mm/100m', label: 'Expansion per 10C', icon: '📏' },
      { value: '1000km', label: 'Continuous rail lengths', icon: '🛤️' },
      { value: '±30C', label: 'Design temp range', icon: '🌡️' }
    ],
    examples: ['High-speed rail', 'Freight railways', 'Metro systems', 'Maglev tracks'],
    companies: ['Network Rail', 'SNCF', 'Deutsche Bahn', 'JR Central'],
    futureImpact: 'Active rail tensioning systems will automatically adjust stress based on real-time temperature monitoring.',
    color: '#F59E0B'
  }
];

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play sound effect
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (!audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      const sounds = {
        click: { freq: 600, duration: 0.08, type: 'sine' as OscillatorType, vol: 0.15 },
        success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType, vol: 0.2 },
        failure: { freq: 220, duration: 0.2, type: 'triangle' as OscillatorType, vol: 0.15 },
        transition: { freq: 440, duration: 0.12, type: 'sine' as OscillatorType, vol: 0.15 },
        complete: { freq: 660, duration: 0.25, type: 'sine' as OscillatorType, vol: 0.2 },
      };

      const s = sounds[type];
      oscillator.frequency.value = s.freq;
      oscillator.type = s.type;

      gainNode.gain.setValueAtTime(s.vol, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + s.duration);

      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + s.duration);
    } catch {
      // Audio context may not be available
    }
  }, []);

  // Mobile detection
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

  // Sync with external phase
  useEffect(() => {
    if (externalPhase !== undefined && phaseOrder.includes(externalPhase as Phase)) {
      setPhase(externalPhase as Phase);
    }
  }, [externalPhase]);

  // Animation for atomic vibration
  useEffect(() => {
    if (!showAtomicView) return;

    const animate = () => {
      setAnimationPhase(prev => (prev + 0.1) % (2 * Math.PI));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showAtomicView]);

  // Calculate expansion: ΔL = αL₀ΔT
  const calculateExpansion = useCallback((tempC: number, alphaE6: number, lengthMm: number) => {
    const deltaT = tempC - baseTemperature;
    const alpha = alphaE6 * 1e-6;
    const deltaL = alpha * lengthMm * deltaT;
    return deltaL;
  }, [baseTemperature]);

  // Calculate thermal stress when constrained: σ = EαΔT
  const calculateStress = useCallback((tempC: number, alphaE6: number, youngsModulusGPa: number = 200) => {
    const deltaT = tempC - baseTemperature;
    const alpha = alphaE6 * 1e-6;
    const stress = youngsModulusGPa * 1000 * alpha * deltaT; // MPa
    return stress;
  }, [baseTemperature]);

  // Event logging
  const logEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    const event: GameEvent = { type, timestamp: Date.now(), data };
    onEvent?.(event);
  }, [onEvent]);

  // Helper to get next phase
  const getNextPhase = useCallback((currentPhase: Phase): Phase | null => {
    const currentIndex = phaseOrder.indexOf(currentPhase);
    if (currentIndex < phaseOrder.length - 1) {
      return phaseOrder[currentIndex + 1];
    }
    return null;
  }, []);

  // Helper to get previous phase
  const getPreviousPhase = useCallback((currentPhase: Phase): Phase | null => {
    const currentIndex = phaseOrder.indexOf(currentPhase);
    if (currentIndex > 0) {
      return phaseOrder[currentIndex - 1];
    }
    return null;
  }, []);

  // Simple goToPhase function
  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
  }, []);

  // Navigation
  const handleNext = useCallback(() => {
    playSound('transition');
    const nextPhase = getNextPhase(phase);
    if (nextPhase) {
      logEvent('phase_change', { from: phase, to: nextPhase });
      onPhaseComplete?.(phase);
      setPhase(nextPhase);
      setShowExplanation(false);
      setSelectedAnswer(null);
      setUserPrediction(null);
    }
  }, [phase, playSound, logEvent, onPhaseComplete, getNextPhase]);

  const handleBack = useCallback(() => {
    const prevPhase = getPreviousPhase(phase);
    if (prevPhase) {
      playSound('click');
      setPhase(prevPhase);
      setShowExplanation(false);
      setSelectedAnswer(null);
    }
  }, [phase, playSound, getPreviousPhase]);

  // Handle prediction
  const makePrediction = useCallback((prediction: string) => {
    setUserPrediction(prediction);
    logEvent('prediction_made', { prediction });
    playSound('click');
  }, [logEvent, playSound]);

  // Test questions - scenario-based
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A steel bridge is 500 meters long. The temperature ranges from -20C in winter to 40C in summer.",
      question: "How much does the bridge expand between extremes?",
      options: [
        { text: "About 36 cm (360 mm)", correct: true },
        { text: "About 3.6 cm (36 mm)", correct: false },
        { text: "About 3.6 meters", correct: false },
        { text: "Less than 1 cm", correct: false }
      ],
      explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(500,000 mm)(60°C) = 360 mm = 36 cm. This is why bridges have expansion joints - without them, the thermal stress would crack the structure!"
    },
    {
      scenario: "Railroad tracks are laid with small gaps between sections. On a hot summer day (40C), you notice the gaps are almost closed.",
      question: "What happens if tracks are laid without gaps on a cold day (0C)?",
      options: [
        { text: "They buckle and derail trains when heated", correct: true },
        { text: "Nothing - steel is strong enough", correct: false },
        { text: "They contract and break apart", correct: false },
        { text: "The train wheels grind them smooth", correct: false }
      ],
      explanation: "When constrained expansion is prevented, enormous thermal stress builds up: σ = EαΔT. For steel with ΔT = 40°C: σ ≈ 96 MPa - enough to buckle rails! This is called 'sun kink' and causes derailments."
    },
    {
      scenario: "A jar has a tight metal lid. Someone suggests running hot water over just the lid to open it.",
      question: "Why does this work?",
      options: [
        { text: "Metal expands more than glass, loosening the seal", correct: true },
        { text: "Hot water lubricates the threads", correct: false },
        { text: "Heat weakens the metal", correct: false },
        { text: "Steam pressure pushes the lid off", correct: false }
      ],
      explanation: "Most metals have higher α than glass (α_metal ≈ 12-23 vs α_glass ≈ 8.5 ×10⁻⁶/°C). Heating the lid makes it expand faster than the glass rim, breaking the seal. Running hot water on the jar would tighten the lid!"
    },
    {
      scenario: "A bimetallic strip is made of brass (α = 19) bonded to steel (α = 12). When heated uniformly:",
      question: "Which way does it bend?",
      options: [
        { text: "Curves toward the steel (lower expansion) side", correct: true },
        { text: "Curves toward the brass (higher expansion) side", correct: false },
        { text: "Stays straight", correct: false },
        { text: "Twists into a spiral", correct: false }
      ],
      explanation: "The brass expands more, becoming longer than the steel. Since they're bonded, the brass 'outer' surface forces the strip to curve with brass on the outside, steel on the inside. This is how mechanical thermostats work!"
    },
    {
      scenario: "Pyrex glass (α ≈ 3.3) is used for cookware and lab glassware instead of regular glass (α ≈ 9).",
      question: "Why is low thermal expansion important for these applications?",
      options: [
        { text: "Resists cracking from uneven heating (thermal shock)", correct: true },
        { text: "Heats food more evenly", correct: false },
        { text: "Is more transparent", correct: false },
        { text: "Is cheaper to manufacture", correct: false }
      ],
      explanation: "When part of glass heats faster than another (hot soup in cold glass), differential expansion creates stress. Lower α means less stress difference. Pyrex's low expansion makes it resistant to thermal shock - essential for going from freezer to oven!"
    },
    {
      scenario: "Water is unique - it has maximum density at 4C, not at 0C. When a lake cools in winter:",
      question: "What happens to the water at 4C relative to colder water?",
      options: [
        { text: "It sinks to the bottom, so ice forms on top", correct: true },
        { text: "It rises to the surface, so lakes freeze from bottom up", correct: false },
        { text: "It stays evenly mixed", correct: false },
        { text: "It freezes first", correct: false }
      ],
      explanation: "Water's anomalous expansion means 4°C water is densest and sinks. Colder water (0-4°C) is less dense and rises, eventually freezing on the surface. This insulates deeper water, allowing fish to survive winter. If lakes froze from bottom up, aquatic life would die!"
    },
    {
      scenario: "The Eiffel Tower (height 300m, iron α ≈ 12) experiences 35C temperature swings between seasons.",
      question: "How much does its height change?",
      options: [
        { text: "About 12-15 cm", correct: true },
        { text: "About 1-2 cm", correct: false },
        { text: "About 1 meter", correct: false },
        { text: "It doesn't change - iron is rigid", correct: false }
      ],
      explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(300,000 mm)(35°C) = 126 mm ≈ 12-15 cm. The tower is measurably taller in summer! Thermal expansion affects all structures - engineers must account for it."
    },
    {
      scenario: "Concrete and steel have nearly identical thermal expansion coefficients (both α ≈ 12 ×10⁻⁶/°C).",
      question: "Why is this coincidence critical for reinforced concrete?",
      options: [
        { text: "They expand together, preventing internal cracking", correct: true },
        { text: "It makes the concrete stronger", correct: false },
        { text: "It reduces the amount of steel needed", correct: false },
        { text: "It's just a coincidence with no practical importance", correct: false }
      ],
      explanation: "If concrete and steel had different α values, temperature changes would create shear stress at the interface, causing cracking and delamination. Their matched expansion coefficients allow reinforced concrete to work as a unified material across temperature swings."
    },
    {
      scenario: "A mechanic heats a stuck bolt with a torch to remove it from an aluminum engine block.",
      question: "Why does this help, even though both materials expand?",
      options: [
        { text: "The bolt heats faster and expands first, breaking the bond", correct: true },
        { text: "Aluminum expands more than steel", correct: false },
        { text: "Heat weakens the bolt threads", correct: false },
        { text: "It creates a vacuum", correct: false }
      ],
      explanation: "When you apply heat locally, the bolt heats up faster than the surrounding block. The bolt expands before the block can 'catch up', temporarily creating clearance. Quick action while hot is essential - once thermal equilibrium is reached, both expand equally!"
    },
    {
      scenario: "Invar alloy (α ≈ 1.2 ×10⁻⁶/°C) is 10× more stable than steel. It's used in precision instruments.",
      question: "What makes Invar so unusual?",
      options: [
        { text: "Magnetic properties cancel normal thermal expansion", correct: true },
        { text: "It's extremely pure iron", correct: false },
        { text: "It's hollow inside", correct: false },
        { text: "It's kept at constant temperature", correct: false }
      ],
      explanation: "Invar (64% Fe, 36% Ni) exhibits the 'Invar effect' - magnetic ordering changes with temperature in a way that contracts the lattice, counteracting normal thermal expansion. This Nobel Prize-winning discovery enabled precision timekeeping, surveying, and scientific instruments."
    }
  ];

  // Answer handling for quiz
  const handleAnswer = useCallback((answerIndex: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    const isCorrect = testQuestions[currentQuestion].options[answerIndex].correct;

    if (isCorrect) {
      setScore(s => s + 1);
      playSound('success');
      logEvent('answer_correct', { question: currentQuestion });
    } else {
      playSound('failure');
      logEvent('answer_incorrect', { question: currentQuestion });
    }

    setShowExplanation(true);
    logEvent('answer_submitted', { question: currentQuestion, answer: answerIndex, correct: isCorrect });
  }, [selectedAnswer, currentQuestion, playSound, logEvent, testQuestions]);

  const nextQuestion = useCallback(() => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      playSound('transition');
    } else {
      handleNext();
    }
  }, [currentQuestion, playSound, handleNext, testQuestions.length]);

  // Real-world applications with full TransferApp structure
  const applications: TransferApp[] = [
    {
      icon: "🌉",
      title: "Bridge Engineering",
      short: "Expansion joints & structural design",
      tagline: "Designing for movement in stationary structures",
      description: "Bridges experience massive temperature swings and must accommodate expansion without structural failure. Expansion joints, sliding bearings, and flexible connections are essential components of bridge design.",
      connection: "A 500m steel bridge can expand/contract 36cm with a 60C temperature range. Without expansion joints, thermal stress would reach hundreds of MPa, cracking concrete and buckling steel.",
      howItWorks: [
        "Expansion joints allow bridge decks to move while maintaining a smooth driving surface",
        "Sliding bearings support the bridge while allowing horizontal movement",
        "Modular joints can accommodate 1+ meter of movement in long spans",
        "Finger joints interlock to prevent debris from falling through gaps"
      ],
      stats: [
        "Golden Gate Bridge expands 40cm in summer",
        "Expansion joints rated for 50+ years of cycles",
        "Long bridges may have 10+ expansion joints",
        "Thermal stress can exceed 100 MPa without joints"
      ],
      examples: [
        "Millau Viaduct - tallest bridge, complex thermal design",
        "Brooklyn Bridge - 19th century expansion joint innovation",
        "Akashi Kaikyo Bridge - 4km span with massive thermal movement",
        "Highway overpass joints visible as bumps in road"
      ],
      companies: ["Mageba", "Watson Bowman", "MAURER", "Freyssinet", "D.S. Brown"],
      futureImpact: "Smart expansion joints with embedded sensors will monitor bridge health in real-time, predicting maintenance needs and detecting damage from earthquakes or overloading before failure occurs.",
      color: "#f97316"
    },
    {
      icon: "🚂",
      title: "Railroad Engineering",
      short: "Continuous welded rail & track design",
      tagline: "Miles of steel that can't be allowed to move",
      description: "Modern railroads use continuous welded rail (CWR) that deliberately restrains thermal expansion. Understanding and managing thermal stress is critical to prevent dangerous rail buckling.",
      connection: "Rail temperature can reach 70C in direct sun. CWR is installed at 'stress-free' temperature (~27C) and designed to safely handle tensile and compressive stress from seasonal temperature swings.",
      howItWorks: [
        "Rail is welded at neutral temperature to pre-stress the system",
        "Concrete ties and ballast anchor rail to resist expansion forces",
        "Rail anchors prevent longitudinal movement at intervals",
        "Thermal gradient sensors trigger speed restrictions in extreme heat"
      ],
      stats: [
        "Rail temperature can be 20C+ above air temperature in sun",
        "Buckling typically occurs above 65C rail temperature",
        "CWR stress can reach 400+ MPa (yield stress ~800 MPa)",
        "Track buckles cause 30+ derailments per year in US"
      ],
      examples: [
        "High-speed rail requires precise thermal management",
        "Heat-induced slow orders on hot summer days",
        "Winter rail breaks from tensile stress",
        "Transition joints where CWR meets jointed rail"
      ],
      companies: ["Union Pacific", "BNSF Railway", "Network Rail", "Deutsche Bahn", "Pandrol"],
      futureImpact: "AI-powered track monitoring using drone thermal imaging and vibration sensors will predict buckling risk and optimize train scheduling during temperature extremes.",
      color: "#ef4444"
    },
    {
      icon: "🔩",
      title: "Precision Manufacturing",
      short: "Dimensional stability & metrology",
      tagline: "When micrometers matter",
      description: "In precision manufacturing, thermal expansion is enemy number one. Parts machined at one temperature may not fit at another. Clean rooms, Invar fixtures, and compensation algorithms maintain accuracy.",
      connection: "A 1-meter aluminum part changes 23 micrometers per degree C - significant when tolerances are ±5 micrometers. Temperature-controlled manufacturing and measurement is essential for aerospace and semiconductor industries.",
      howItWorks: [
        "Climate-controlled facilities maintain constant temperature (±0.1C)",
        "Invar and Zerodur fixtures minimize thermal drift",
        "Coordinate measuring machines compensate for temperature",
        "Parts are 'soaked' at reference temperature before measurement"
      ],
      stats: [
        "Semiconductor fabs maintain 20C ± 0.5C",
        "Invar expansion: 1/10th of steel",
        "Zerodur glass-ceramic: near-zero expansion",
        "Thermal compensation improves accuracy 10-100x"
      ],
      examples: [
        "Telescope mirror blanks made of Zerodur",
        "Invar masks for semiconductor lithography",
        "CMM temperature compensation in quality labs",
        "Engine block machining in temperature-controlled cells"
      ],
      companies: ["Zeiss", "Hexagon", "Invar Technologies", "Schott", "Renishaw"],
      futureImpact: "In-situ thermal compensation using distributed temperature sensors and real-time CNC adjustment will enable precision manufacturing without expensive climate control.",
      color: "#8b5cf6"
    },
    {
      icon: "🔥",
      title: "Thermal Protection Systems",
      short: "Spacecraft & industrial heat shields",
      tagline: "Surviving extreme thermal cycling",
      description: "Spacecraft experience temperature swings from -150C in shadow to +150C in sunlight every 90 minutes. Thermal protection materials must survive expansion cycles and protect internal systems.",
      connection: "Space Shuttle tiles used silica with ultra-low expansion (α ≈ 0.6) to survive 1650C reentry while protecting aluminum structure. Differential expansion between tiles and structure required flexible mounting.",
      howItWorks: [
        "Low-CTE materials minimize thermal stress during cycling",
        "Flexible mounting systems accommodate differential expansion",
        "Thermal barrier coatings insulate hot sections from structure",
        "Active cooling manages thermal gradients in engines"
      ],
      stats: [
        "Space Shuttle tiles: α ≈ 0.6 ×10⁻⁶/C",
        "Temperature range in orbit: ±150C",
        "Thermal cycles per mission: 100+",
        "Turbine blade TBC extends life 10x"
      ],
      examples: [
        "Space Shuttle silica tiles",
        "JWST sunshield operates at 50K (-223C)",
        "Jet engine thermal barrier coatings",
        "Spacecraft MLI insulation"
      ],
      companies: ["Lockheed Martin", "Boeing", "NASA", "Pratt & Whitney", "Rolls-Royce"],
      futureImpact: "Ceramic matrix composites (CMCs) with engineered thermal expansion will enable hypersonic aircraft and reusable spacecraft with longer service lives and higher operating temperatures.",
      color: "#06b6d4"
    }
  ];

  // Render phase content
  const renderPhase = () => {
    const currentMaterial = materials[selectedMaterial];
    const expansion = calculateExpansion(temperature, currentMaterial.alpha, initialLength);
    const finalLength = initialLength + expansion;

    switch(phase) {
      case 'hook': // Hook/Introduction
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-orange-400">The Hidden Movement</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <p style={{ fontSize: typo.bodyLarge }} className="leading-relaxed">
                Every day, the Eiffel Tower grows <span className="text-orange-400 font-bold">15 centimeters taller</span> in summer
                and shrinks back in winter. Steel railroad tracks can buckle into dangerous curves on hot days.
              </p>

              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                <p style={{ fontSize: typo.body }} className="text-gray-300">
                  This invisible movement affects everything engineers build - bridges, buildings, pipelines, and precision instruments.
                  Understanding <span className="text-yellow-400">thermal expansion</span> is essential for safe design.
                </p>
              </div>
            </div>

            {/* Animated bridge expansion with premium SVG graphics */}
            <div className="relative h-64 bg-gradient-to-b from-sky-400/20 to-gray-900/50 rounded-xl overflow-hidden">
              <svg viewBox="0 0 400 200" className="w-full h-full">
                <defs>
                  {/* Premium sun gradient with glow */}
                  <radialGradient id="thexSunGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef3c7" />
                    <stop offset="30%" stopColor="#fcd34d" />
                    <stop offset="60%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </radialGradient>

                  {/* Sun glow filter */}
                  <filter id="thexSunGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Sun rays gradient */}
                  <radialGradient id="thexSunRays" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                  </radialGradient>

                  {/* Bridge tower concrete gradient */}
                  <linearGradient id="thexTowerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6b7280" />
                    <stop offset="25%" stopColor="#4b5563" />
                    <stop offset="50%" stopColor="#374151" />
                    <stop offset="75%" stopColor="#4b5563" />
                    <stop offset="100%" stopColor="#374151" />
                  </linearGradient>

                  {/* Bridge deck steel gradient */}
                  <linearGradient id="thexSteelDeckGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="20%" stopColor="#6b7280" />
                    <stop offset="50%" stopColor="#4b5563" />
                    <stop offset="80%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#374151" />
                  </linearGradient>

                  {/* Water gradient with depth effect */}
                  <linearGradient id="thexWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
                    <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#2563eb" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
                  </linearGradient>

                  {/* Expansion joint glow */}
                  <filter id="thexJointGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Heat shimmer effect for expansion */}
                  <linearGradient id="thexHeatShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                    <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Sun rays outer glow */}
                <circle cx="50" cy="40" r="40" fill="url(#thexSunRays)">
                  <animate attributeName="r" values="40;45;40" dur="2s" repeatCount="indefinite"/>
                </circle>

                {/* Sun with premium gradient and glow */}
                <circle cx="50" cy="40" r="25" fill="url(#thexSunGradient)" filter="url(#thexSunGlow)">
                  <animate attributeName="r" values="25;28;25" dur="2s" repeatCount="indefinite"/>
                </circle>

                {/* Bridge towers with gradient */}
                <rect x="80" y="80" width="20" height="80" fill="url(#thexTowerGradient)" rx="2"/>
                <rect x="300" y="80" width="20" height="80" fill="url(#thexTowerGradient)" rx="2"/>

                {/* Tower highlights */}
                <rect x="80" y="80" width="4" height="80" fill="#9ca3af" opacity="0.3" rx="1"/>
                <rect x="300" y="80" width="4" height="80" fill="#9ca3af" opacity="0.3" rx="1"/>

                {/* Bridge deck left - animated expansion with gradient */}
                <rect x="60" y="110" width="140" height="15" fill="url(#thexSteelDeckGradient)" rx="2">
                  <animate attributeName="width" values="140;145;140" dur="3s" repeatCount="indefinite"/>
                </rect>

                {/* Bridge deck right - animated with gradient */}
                <rect x="205" y="110" width="140" height="15" fill="url(#thexSteelDeckGradient)" rx="2">
                  <animate attributeName="x" values="205;202;205" dur="3s" repeatCount="indefinite"/>
                </rect>

                {/* Heat shimmer effect above deck */}
                <rect x="60" y="105" width="285" height="5" fill="url(#thexHeatShimmer)" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0.8;0.5" dur="1.5s" repeatCount="indefinite"/>
                </rect>

                {/* Expansion joint gap with glow */}
                <rect x="199" y="110" width="6" height="15" fill="#1f2937" filter="url(#thexJointGlow)">
                  <animate attributeName="width" values="6;3;6" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="x" values="199;200;199" dur="3s" repeatCount="indefinite"/>
                </rect>

                {/* Joint highlight indicator */}
                <rect x="200" y="108" width="4" height="2" fill="#f59e0b" opacity="0.8" rx="1">
                  <animate attributeName="width" values="4;2;4" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="x" values="200;201;200" dur="3s" repeatCount="indefinite"/>
                </rect>

                {/* Water with gradient */}
                <rect x="0" y="160" width="400" height="40" fill="url(#thexWaterGradient)"/>

                {/* Water surface ripples */}
                <ellipse cx="100" cy="165" rx="30" ry="3" fill="#93c5fd" opacity="0.3">
                  <animate attributeName="rx" values="30;35;30" dur="2s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="280" cy="168" rx="25" ry="2" fill="#93c5fd" opacity="0.2">
                  <animate attributeName="rx" values="25;30;25" dur="2.5s" repeatCount="indefinite"/>
                </ellipse>
              </svg>

              {/* Labels moved outside SVG using typo system */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
                <p style={{ fontSize: typo.small }} className="text-gray-400">Expansion Joint</p>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <p style={{ fontSize: typo.small }} className="text-gray-500">Gap changes with temperature</p>
              </div>
            </div>

            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
              <p style={{ fontSize: typo.body }} className="text-orange-300 font-medium">
                The Twist: Materials don't just expand uniformly - thermal stress builds up when expansion is restrained.
                A constrained beam can generate hundreds of tons of force from just a 50C temperature change!
              </p>
            </div>
          </div>
        );

      case 'predict': // Prediction
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-blue-400">Make Your Prediction</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <p style={{ fontSize: typo.body }} className="mb-4">
                A <span className="text-orange-400 font-bold">100-meter steel bridge</span> is installed on a cool spring day (20C).
                In summer, the temperature reaches <span className="text-red-400 font-bold">60C</span> (a 40C increase).
              </p>

              {/* Premium Visualization */}
              <div className="relative h-36 bg-gray-900/50 rounded-lg mb-4 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 110">
                  <defs>
                    {/* Cool steel gradient (spring) */}
                    <linearGradient id="thexCoolSteelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#9ca3af" />
                      <stop offset="25%" stopColor="#6b7280" />
                      <stop offset="50%" stopColor="#4b5563" />
                      <stop offset="75%" stopColor="#6b7280" />
                      <stop offset="100%" stopColor="#374151" />
                    </linearGradient>

                    {/* Hot steel gradient (summer) */}
                    <linearGradient id="thexHotSteelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="25%" stopColor="#f87171" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="75%" stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>

                    {/* Arrow gradient */}
                    <linearGradient id="thexArrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>

                    {/* Heat glow for hot bridge */}
                    <filter id="thexPredictHeatGlow" x="-20%" y="-30%" width="140%" height="160%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Metal highlight */}
                    <linearGradient id="thexPredictHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                      <stop offset="20%" stopColor="#ffffff" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
                    </linearGradient>

                    {/* Premium arrow marker */}
                    <marker id="thexPredictArrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                      <polygon points="0 0, 12 4, 0 8" fill="url(#thexArrowGradient)"/>
                    </marker>

                    {/* Question mark glow */}
                    <filter id="thexQuestionGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Before (Spring) bridge with gradient */}
                  <rect x="30" y="42" width="145" height="22" fill="url(#thexCoolSteelGradient)" rx="3"/>
                  <rect x="30" y="42" width="145" height="22" fill="url(#thexPredictHighlight)" rx="3"/>
                  {/* End caps */}
                  <rect x="30" y="42" width="6" height="22" fill="#4b5563" rx="2"/>
                  <rect x="169" y="42" width="6" height="22" fill="#4b5563" rx="2"/>

                  {/* Arrow with glow */}
                  <path d="M190 53 L218 53" stroke="url(#thexArrowGradient)" strokeWidth="3" markerEnd="url(#thexPredictArrow)"/>

                  {/* After (Summer) bridge - expanded with heat glow */}
                  <g filter="url(#thexPredictHeatGlow)">
                    <rect x="235" y="42" width="155" height="22" fill="url(#thexHotSteelGradient)" rx="3"/>
                    <rect x="235" y="42" width="155" height="22" fill="url(#thexPredictHighlight)" rx="3"/>
                    {/* End caps */}
                    <rect x="235" y="42" width="6" height="22" fill="#b91c1c" rx="2"/>
                    <rect x="384" y="42" width="6" height="22" fill="#b91c1c" rx="2"/>
                  </g>

                  {/* Expansion indicator with question mark */}
                  <g filter="url(#thexQuestionGlow)">
                    <text x="312" y="90" textAnchor="middle" fill="#fbbf24" fontSize="16" fontWeight="bold">???</text>
                  </g>

                  {/* Heat shimmer effect above hot bridge */}
                  <rect x="235" y="36" width="155" height="6" fill="url(#thexArrowGradient)" opacity="0.3">
                    <animate attributeName="opacity" values="0.2;0.4;0.2" dur="1.5s" repeatCount="indefinite"/>
                  </rect>
                </svg>

                {/* Labels outside SVG */}
                <div className="absolute top-1 left-12">
                  <p style={{ fontSize: typo.label }} className="text-cyan-400">Spring: 20C</p>
                </div>
                <div className="absolute bottom-2 left-16">
                  <p style={{ fontSize: typo.small }} className="text-gray-500">100.000 m</p>
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  <p style={{ fontSize: typo.label }} className="text-amber-400 font-bold">+40C</p>
                </div>
                <div className="absolute top-1 right-12">
                  <p style={{ fontSize: typo.label }} className="text-red-400">Summer: 60C</p>
                </div>
                <div className="absolute bottom-2 right-12">
                  <p style={{ fontSize: typo.small }} className="text-gray-400">100.??? m</p>
                </div>
              </div>

              <p style={{ fontSize: typo.small }} className="text-gray-400">
                Steel has alpha = 12 x 10^-6 per C. How much longer will the bridge become?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'small', text: '4.8 mm (less than 1 centimeter)' },
                { id: 'medium', text: '48 mm (about 5 centimeters)', correct: true },
                { id: 'large', text: '480 mm (about half a meter)' },
                { id: 'huge', text: '4.8 meters (longer than a car)' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => makePrediction(option.id)}
                  disabled={userPrediction !== null}
                  style={{ zIndex: 10, fontSize: typo.body }}
                  className={`p-4 rounded-lg text-left transition-all ${
                    userPrediction === option.id
                      ? 'bg-blue-500/30 border-2 border-blue-500'
                      : userPrediction !== null
                      ? 'bg-gray-800/30 opacity-50'
                      : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {userPrediction && (
              <div className={`p-4 rounded-lg ${
                userPrediction === 'medium' ? 'bg-green-500/20 border border-green-500/30' : 'bg-orange-500/20 border border-orange-500/30'
              }`}>
                <p style={{ fontSize: typo.body }} className="font-medium">
                  {userPrediction === 'medium'
                    ? 'Correct! Let\'s see the calculation...'
                    : 'Interesting guess! Let\'s calculate the actual expansion...'
                  }
                </p>
                <p style={{ fontSize: typo.small }} className="text-gray-400 mt-2">
                  Delta L = alpha x L0 x Delta T = (12 x 10^-6) x (100,000 mm) x (40C) = 48 mm
                </p>
              </div>
            )}
          </div>
        );

      case 'play': // Observation/Experiment
        // Calculate temperature color for gradient
        const tempNormalized = (temperature + 40) / 140; // 0 at -40C, 1 at 100C
        const tempColorHue = 240 - (tempNormalized * 240); // Blue (240) to Red (0)

        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-green-400">Observe: Thermal Expansion</h2>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={{ fontSize: typo.small }} className="block text-gray-400 mb-1">
                    Temperature: {temperature}C
                  </label>
                  <input
                    type="range"
                    min="-40"
                    max="100"
                    value={temperature}
                    onChange={(e) => {
                      setTemperature(Number(e.target.value));
                      logEvent('temperature_changed', { temperature: Number(e.target.value) });
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between" style={{ fontSize: typo.label }}>
                    <span className="text-blue-400">-40C</span>
                    <span className="text-gray-500">20C (ref)</span>
                    <span className="text-red-400">100C</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: typo.small }} className="block text-gray-400 mb-1">
                    Material: {currentMaterial.name}
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => {
                      setSelectedMaterial(Number(e.target.value));
                      logEvent('material_changed', { material: materials[Number(e.target.value)].name });
                    }}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                    style={{ fontSize: typo.body }}
                  >
                    {materials.map((mat, i) => (
                      <option key={i} value={i}>{mat.name} (alpha = {mat.alpha} x 10^-6/C)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Premium SVG Bar Visualization */}
              <div className="relative bg-gray-900/50 rounded-lg overflow-hidden" style={{ height: isMobile ? '180px' : '220px' }}>
                <svg viewBox="0 0 500 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    {/* Reference bar gradient - neutral gray */}
                    <linearGradient id="thexRefBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#6b7280" stopOpacity="0.4" />
                      <stop offset="30%" stopColor="#4b5563" stopOpacity="0.3" />
                      <stop offset="70%" stopColor="#374151" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#4b5563" stopOpacity="0.4" />
                    </linearGradient>

                    {/* Dynamic temperature-based gradient for metal bar */}
                    <linearGradient id="thexMetalBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={`hsl(${tempColorHue}, 80%, 70%)`} />
                      <stop offset="20%" stopColor={`hsl(${tempColorHue}, 75%, 55%)`} />
                      <stop offset="50%" stopColor={`hsl(${tempColorHue}, 70%, 45%)`} />
                      <stop offset="80%" stopColor={`hsl(${tempColorHue}, 75%, 55%)`} />
                      <stop offset="100%" stopColor={`hsl(${tempColorHue}, 70%, 40%)`} />
                    </linearGradient>

                    {/* Metal bar highlight for 3D effect */}
                    <linearGradient id="thexMetalHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                      <stop offset="10%" stopColor="#ffffff" stopOpacity="0.1" />
                      <stop offset="50%" stopColor="#000000" stopOpacity="0" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
                    </linearGradient>

                    {/* Heat glow filter for hot temperatures */}
                    <filter id="thexHeatGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation={temperature > 50 ? "4" : "0"} result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Cold frost filter */}
                    <filter id="thexFrostGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation={temperature < -20 ? "3" : "0"} result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Heat source gradient */}
                    <radialGradient id="thexHeatSourceGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef3c7" />
                      <stop offset="30%" stopColor="#fbbf24" />
                      <stop offset="60%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
                    </radialGradient>

                    {/* Heat source glow filter */}
                    <filter id="thexHeatSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Cold source gradient */}
                    <radialGradient id="thexColdSourceGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#e0f2fe" />
                      <stop offset="30%" stopColor="#7dd3fc" />
                      <stop offset="60%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
                    </radialGradient>

                    {/* Expansion indicator gradient */}
                    <linearGradient id="thexExpansionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>

                    {/* Contraction indicator gradient */}
                    <linearGradient id="thexContractionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>

                    {/* Grid pattern */}
                    <pattern id="thexMeasureGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="20" stroke="#374151" strokeWidth="0.5" strokeOpacity="0.5" />
                    </pattern>

                    {/* Measurement tick marks */}
                    <pattern id="thexRulerTicks" width="50" height="10" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="5" stroke="#6b7280" strokeWidth="1" />
                      <line x1="25" y1="0" x2="25" y2="3" stroke="#4b5563" strokeWidth="0.5" />
                    </pattern>
                  </defs>

                  {/* Background grid */}
                  <rect x="30" y="30" width="440" height="120" fill="url(#thexMeasureGrid)" opacity="0.5" />

                  {/* Reference bar (at 20C) */}
                  <rect x="50" y="50" width="400" height="25" fill="url(#thexRefBarGradient)" rx="3" stroke="#4b5563" strokeWidth="1" strokeDasharray="4 2" />

                  {/* Heat/Cold source indicator */}
                  {temperature > 30 && (
                    <g transform="translate(25, 105)">
                      <circle r="15" fill="url(#thexHeatSourceGradient)" filter="url(#thexHeatSourceGlow)">
                        <animate attributeName="r" values="14;16;14" dur="1s" repeatCount="indefinite" />
                      </circle>
                      {/* Heat waves */}
                      <path d="M -8,8 Q -4,12 -8,16" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6">
                        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.8s" repeatCount="indefinite" />
                      </path>
                      <path d="M 0,10 Q 4,14 0,18" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.4">
                        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
                      </path>
                      <path d="M 8,8 Q 12,12 8,16" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.5">
                        <animate attributeName="opacity" values="0.5;0.15;0.5" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
                      </path>
                    </g>
                  )}

                  {temperature < -10 && (
                    <g transform="translate(25, 105)">
                      <circle r="15" fill="url(#thexColdSourceGradient)" filter="url(#thexHeatSourceGlow)">
                        <animate attributeName="r" values="14;16;14" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      {/* Snowflake/frost indicator */}
                      <path d="M 0,-10 L 0,10 M -8,-5 L 8,5 M -8,5 L 8,-5" stroke="#7dd3fc" strokeWidth="1.5" fill="none" opacity="0.7" />
                    </g>
                  )}

                  {/* Expanded/contracted metal bar with premium styling */}
                  <g filter={temperature > 50 ? "url(#thexHeatGlow)" : temperature < -20 ? "url(#thexFrostGlow)" : undefined}>
                    <rect
                      x={50}
                      y="95"
                      width={400 * (finalLength / initialLength)}
                      height="35"
                      fill="url(#thexMetalBarGradient)"
                      rx="4"
                      className="transition-all duration-300"
                    />
                    {/* Highlight overlay for 3D effect */}
                    <rect
                      x={50}
                      y="95"
                      width={400 * (finalLength / initialLength)}
                      height="35"
                      fill="url(#thexMetalHighlight)"
                      rx="4"
                      className="transition-all duration-300"
                    />
                    {/* End cap details */}
                    <rect
                      x={50}
                      y="95"
                      width="8"
                      height="35"
                      fill={`hsl(${tempColorHue}, 60%, 35%)`}
                      rx="4"
                      className="transition-all duration-300"
                    />
                    <rect
                      x={50 + 400 * (finalLength / initialLength) - 8}
                      y="95"
                      width="8"
                      height="35"
                      fill={`hsl(${tempColorHue}, 60%, 35%)`}
                      rx="4"
                      className="transition-all duration-300"
                    />
                  </g>

                  {/* Expansion/contraction arrows */}
                  {expansion > 0 && (
                    <g>
                      <path
                        d={`M ${50 + 400} 112 L ${50 + 400 * (finalLength / initialLength) + 10} 112`}
                        stroke="url(#thexExpansionArrow)"
                        strokeWidth="3"
                        markerEnd="url(#thexArrowHead)"
                      />
                      <polygon
                        points={`${50 + 400 * (finalLength / initialLength) + 15},112 ${50 + 400 * (finalLength / initialLength) + 5},107 ${50 + 400 * (finalLength / initialLength) + 5},117`}
                        fill="#22c55e"
                      />
                    </g>
                  )}

                  {expansion < 0 && (
                    <g>
                      <path
                        d={`M ${50 + 400 * (finalLength / initialLength)} 112 L ${50 + 400 - 10} 112`}
                        stroke="url(#thexContractionArrow)"
                        strokeWidth="3"
                      />
                      <polygon
                        points={`${50 + 400 * (finalLength / initialLength) - 5},112 ${50 + 400 * (finalLength / initialLength) + 5},107 ${50 + 400 * (finalLength / initialLength) + 5},117`}
                        fill="#3b82f6"
                      />
                    </g>
                  )}

                  {/* Ruler/measurement marks at bottom */}
                  <rect x="50" y="145" width="400" height="8" fill="url(#thexRulerTicks)" />
                  <line x1="50" y1="145" x2="450" y2="145" stroke="#6b7280" strokeWidth="1" />
                </svg>

                {/* Labels outside SVG */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                  <p style={{ fontSize: typo.small }} className="text-gray-400 text-center">
                    Initial Length: {initialLength} mm at 20C
                  </p>
                </div>

                <div className="absolute top-14 left-4">
                  <p style={{ fontSize: typo.label }} className="text-gray-500">Reference at 20C</p>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                  <p style={{ fontSize: typo.body }} className="font-medium" style={{ color: temperature > 50 ? '#fbbf24' : temperature < -10 ? '#7dd3fc' : '#ffffff' }}>
                    {finalLength.toFixed(3)} mm at {temperature}C
                  </p>
                </div>
              </div>

              {/* Change indicator */}
              <div className={`text-center mt-3 font-bold ${
                expansion > 0 ? 'text-red-400' : expansion < 0 ? 'text-blue-400' : 'text-gray-400'
              }`} style={{ fontSize: typo.bodyLarge }}>
                {expansion > 0 ? '+' : ''}{expansion.toFixed(3)} mm
                ({expansion > 0 ? 'expansion' : expansion < 0 ? 'contraction' : 'no change'})
              </div>

              {/* Stats panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Temperature Change</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-orange-400">
                    {temperature - baseTemperature > 0 ? '+' : ''}{temperature - baseTemperature}C
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Expansion Coef.</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-blue-400">{currentMaterial.alpha}</p>
                  <p style={{ fontSize: typo.label }} className="text-gray-500">x 10^-6/C</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Length Change</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-green-400">
                    {expansion.toFixed(3)} mm
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Strain</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-purple-400">
                    {((expansion / initialLength) * 100).toFixed(4)}%
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAtomicView(!showAtomicView)}
              style={{ zIndex: 10, fontSize: typo.body }}
              className="w-full p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30"
            >
              {showAtomicView ? 'Hide' : 'Show'} Atomic View
            </button>

            {showAtomicView && (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 style={{ fontSize: typo.bodyLarge }} className="font-medium text-purple-400 mb-3">Why Materials Expand</h3>
                <div className="flex gap-8 justify-center mb-4">
                  {/* Cold atoms with premium styling */}
                  <div className="text-center">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      <defs>
                        <radialGradient id="thexColdAtomGradient" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#93c5fd" />
                          <stop offset="50%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </radialGradient>
                        <filter id="thexAtomGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="1.5" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      {[0, 1, 2].map(row => (
                        [0, 1, 2].map(col => (
                          <circle
                            key={`cold-${row}-${col}`}
                            cx={20 + col * 25}
                            cy={20 + row * 25}
                            r="8"
                            fill="url(#thexColdAtomGradient)"
                            filter="url(#thexAtomGlow)"
                          >
                            <animate
                              attributeName="cx"
                              values={`${20 + col * 25};${21 + col * 25};${20 + col * 25}`}
                              dur="0.3s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        ))
                      ))}
                    </svg>
                    <p style={{ fontSize: typo.small }} className="text-blue-400">Cold: Small vibrations</p>
                    <p style={{ fontSize: typo.label }} className="text-gray-500">Atoms closer together</p>
                  </div>

                  {/* Hot atoms with premium styling */}
                  <div className="text-center">
                    <svg viewBox="0 0 120 120" className="w-24 h-24">
                      <defs>
                        <radialGradient id="thexHotAtomGradient" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#fca5a5" />
                          <stop offset="50%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#b91c1c" />
                        </radialGradient>
                        <filter id="thexHotAtomGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      {[0, 1, 2].map(row => (
                        [0, 1, 2].map(col => {
                          const baseX = 25 + col * 30;
                          const baseY = 25 + row * 30;
                          const offset = Math.sin(animationPhase + row + col) * 5;
                          return (
                            <circle
                              key={`hot-${row}-${col}`}
                              cx={baseX + offset}
                              cy={baseY + Math.cos(animationPhase + row) * 5}
                              r="8"
                              fill="url(#thexHotAtomGradient)"
                              filter="url(#thexHotAtomGlow)"
                            />
                          );
                        })
                      ))}
                    </svg>
                    <p style={{ fontSize: typo.small }} className="text-red-400">Hot: Large vibrations</p>
                    <p style={{ fontSize: typo.label }} className="text-gray-500">Atoms pushed apart</p>
                  </div>
                </div>
                <p style={{ fontSize: typo.small }} className="text-gray-400 text-center">
                  Thermal expansion occurs because atoms vibrate more at higher temperatures,
                  pushing their neighbors farther away on average.
                </p>
              </div>
            )}
          </div>
        );

      case 'review': // Explanation
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-yellow-400">The Physics Revealed</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 style={{ fontSize: typo.bodyLarge }} className="font-bold text-orange-400 mb-4">Thermal Expansion Equations</h3>

              <div className="space-y-6">
                {/* Linear expansion */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center font-mono text-blue-400 mb-2" style={{ fontSize: isMobile ? '18px' : '22px' }}>
                    Delta L = alpha x L0 x Delta T
                  </div>
                  <p style={{ fontSize: typo.small }} className="text-gray-300">
                    <span className="text-green-400">Length change</span> =
                    <span className="text-purple-400"> expansion coefficient</span> x
                    <span className="text-blue-400"> original length</span> x
                    <span className="text-orange-400"> temperature change</span>
                  </p>
                  <p style={{ fontSize: typo.label }} className="text-gray-400 mt-2">
                    Linear expansion applies to any one dimension - length, width, or height.
                    Each dimension expands independently.
                  </p>
                </div>

                {/* Volumetric expansion */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center font-mono text-green-400 mb-2" style={{ fontSize: isMobile ? '18px' : '22px' }}>
                    Delta V = beta x V0 x Delta T <span className="text-gray-500" style={{ fontSize: isMobile ? '14px' : '16px' }}>(beta ~ 3 alpha)</span>
                  </div>
                  <p style={{ fontSize: typo.small }} className="text-gray-300">
                    Volume expands in <span className="text-yellow-400">three dimensions</span>,
                    so beta ~ 3 alpha for solids
                  </p>
                  <p style={{ fontSize: typo.label }} className="text-gray-400 mt-2">
                    A cube that expands 0.1% in each dimension gains about 0.3% in volume.
                    This is why liquid thermometers work - the liquid expands more than the glass.
                  </p>
                </div>

                {/* Thermal stress */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center font-mono text-red-400 mb-2" style={{ fontSize: isMobile ? '18px' : '22px' }}>
                    sigma = E x alpha x Delta T
                  </div>
                  <p style={{ fontSize: typo.small }} className="text-gray-300">
                    When expansion is <span className="text-red-400">prevented</span>,
                    thermal stress builds up!
                  </p>
                  <p style={{ fontSize: typo.label }} className="text-gray-400 mt-2">
                    E = Young's modulus (~200 GPa for steel). A 40C rise in restrained steel
                    creates ~96 MPa stress - enough to buckle railroad tracks!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 style={{ fontSize: typo.body }} className="text-blue-400 font-medium mb-2">Why Different alpha Values?</h4>
                <p style={{ fontSize: typo.small }} className="text-gray-300">
                  The expansion coefficient depends on atomic bonding. Stronger bonds (like in ceramics)
                  resist atomic displacement, giving lower alpha. Metals with weaker metallic bonds
                  expand more easily.
                </p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h4 style={{ fontSize: typo.body }} className="text-green-400 font-medium mb-2">The Invar Exception</h4>
                <p style={{ fontSize: typo.small }} className="text-gray-300">
                  Invar (36% Ni, 64% Fe) has near-zero expansion because magnetic effects
                  counteract thermal expansion. This Nobel Prize discovery enables
                  precision instruments.
                </p>
              </div>
            </div>

            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
              <h4 style={{ fontSize: typo.body }} className="text-orange-400 font-bold mb-2">The Deep Insight</h4>
              <p style={{ fontSize: typo.small }} className="text-gray-300">
                Thermal expansion isn't just about making things bigger - it's about the
                <strong> forces that develop when expansion is constrained</strong>.
                Engineers must either allow movement (expansion joints) or design structures
                strong enough to handle the stress.
              </p>
            </div>
          </div>
        );

      case 'twist_predict': // Interactive Exploration
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-cyan-400">Explore: Expansion Joints</h2>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <p style={{ fontSize: typo.body }} className="text-gray-300 mb-4">
                Design an expansion joint for a steel bridge. The bridge is 200 meters long
                and must handle temperatures from -30C to +50C.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={{ fontSize: typo.small }} className="block text-gray-400 mb-1">
                    Minimum Temperature: {temperature}C
                  </label>
                  <input
                    type="range"
                    min="-40"
                    max="20"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label style={{ fontSize: typo.small }} className="block text-gray-400 mb-1">
                    Bridge Length: {initialLength / 1000} m
                  </label>
                  <input
                    type="range"
                    min="50000"
                    max="500000"
                    step="10000"
                    value={initialLength}
                    onChange={(e) => setInitialLength(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Premium Bridge Visualization */}
              <div className="relative bg-gradient-to-b from-sky-400/20 to-gray-900/50 rounded-lg h-48 overflow-hidden">
                <svg viewBox="0 0 400 150" className="w-full h-full">
                  <defs>
                    {/* Sky gradient */}
                    <linearGradient id="thexSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="#0284c7" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.3" />
                    </linearGradient>

                    {/* Premium water gradient */}
                    <linearGradient id="thexTwistWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Concrete tower gradient */}
                    <linearGradient id="thexTowerConcreteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#78716c" />
                      <stop offset="25%" stopColor="#57534e" />
                      <stop offset="50%" stopColor="#44403c" />
                      <stop offset="75%" stopColor="#57534e" />
                      <stop offset="100%" stopColor="#44403c" />
                    </linearGradient>

                    {/* Steel deck gradient */}
                    <linearGradient id="thexTwistDeckGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#9ca3af" />
                      <stop offset="30%" stopColor="#6b7280" />
                      <stop offset="70%" stopColor="#4b5563" />
                      <stop offset="100%" stopColor="#374151" />
                    </linearGradient>

                    {/* Expansion joint glow */}
                    <filter id="thexTwistJointGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Temperature indicator glow */}
                    <filter id="thexTempGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Joint highlight gradient */}
                    <linearGradient id="thexJointHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                      <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Sky background */}
                  <rect x="0" y="0" width="400" height="120" fill="url(#thexSkyGradient)" />

                  {/* Water with gradient */}
                  <rect x="0" y="120" width="400" height="30" fill="url(#thexTwistWaterGradient)"/>
                  {/* Water surface highlights */}
                  <ellipse cx="100" cy="125" rx="40" ry="3" fill="#93c5fd" opacity="0.2"/>
                  <ellipse cx="300" cy="128" rx="35" ry="2" fill="#93c5fd" opacity="0.15"/>

                  {/* Towers with gradient */}
                  <rect x="50" y="60" width="15" height="70" fill="url(#thexTowerConcreteGradient)" rx="1"/>
                  <rect x="335" y="60" width="15" height="70" fill="url(#thexTowerConcreteGradient)" rx="1"/>
                  {/* Tower highlights */}
                  <rect x="50" y="60" width="3" height="70" fill="#a8a29e" opacity="0.3"/>
                  <rect x="335" y="60" width="3" height="70" fill="#a8a29e" opacity="0.3"/>

                  {/* Bridge segments with premium gap visualization */}
                  {(() => {
                    const coldExpansion = calculateExpansion(-30, 12, initialLength);
                    const hotExpansion = calculateExpansion(50, 12, initialLength);
                    const totalRange = hotExpansion - coldExpansion;
                    const gapNeeded = Math.abs(totalRange);
                    const currentExpansion = calculateExpansion(temperature, 12, initialLength);
                    const gapWidth = Math.max(2, gapNeeded - (currentExpansion - coldExpansion)) / 10;

                    return (
                      <>
                        {/* Left deck segment */}
                        <rect x="65" y="83" width={130 - gapWidth/2} height="14" fill="url(#thexTwistDeckGradient)" rx="2"/>
                        {/* Left deck highlight */}
                        <rect x="65" y="83" width={130 - gapWidth/2} height="3" fill="#d1d5db" opacity="0.2" rx="1"/>

                        {/* Right deck segment */}
                        <rect x={200 + gapWidth/2} y="83" width={135 - gapWidth/2} height="14" fill="url(#thexTwistDeckGradient)" rx="2"/>
                        {/* Right deck highlight */}
                        <rect x={200 + gapWidth/2} y="83" width={135 - gapWidth/2} height="3" fill="#d1d5db" opacity="0.2" rx="1"/>

                        {/* Expansion joint gap with glow */}
                        <rect x={195 - gapWidth/2} y="83" width={gapWidth + 10} height="14" fill="#0f172a"/>
                        <rect x={198} y="80" width={4} height="2" fill="url(#thexJointHighlight)" filter="url(#thexTwistJointGlow)">
                          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
                        </rect>
                      </>
                    );
                  })()}

                  {/* Temperature indicator with glow */}
                  <g filter="url(#thexTempGlow)">
                    <circle cx="30" cy="25" r="18" fill={temperature < 0 ? '#1e40af' : '#dc2626'} opacity="0.3"/>
                  </g>
                </svg>

                {/* Labels outside SVG */}
                <div className="absolute top-2 left-6">
                  <p style={{ fontSize: typo.bodyLarge }} className={`font-bold ${temperature < 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {temperature}C
                  </p>
                </div>

                {(() => {
                  const coldExpansion = calculateExpansion(-30, 12, initialLength);
                  const hotExpansion = calculateExpansion(50, 12, initialLength);
                  const totalRange = hotExpansion - coldExpansion;
                  const gapNeeded = Math.abs(totalRange);
                  const currentExpansion = calculateExpansion(temperature, 12, initialLength);
                  const gapWidth = Math.max(2, gapNeeded - (currentExpansion - coldExpansion)) / 10;

                  return (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                      <p style={{ fontSize: typo.small }} className="text-amber-400 font-medium">
                        Gap: {gapWidth.toFixed(1)} mm
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Calculations */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">At -30C</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-blue-400">
                    {calculateExpansion(-30, 12, initialLength).toFixed(1)} mm
                  </p>
                  <p style={{ fontSize: typo.label }} className="text-gray-500">contracted</p>
                </div>
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">At +50C</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-red-400">
                    +{calculateExpansion(50, 12, initialLength).toFixed(1)} mm
                  </p>
                  <p style={{ fontSize: typo.label }} className="text-gray-500">expanded</p>
                </div>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Total Range</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-green-400">
                    {(calculateExpansion(50, 12, initialLength) - calculateExpansion(-30, 12, initialLength)).toFixed(1)} mm
                  </p>
                </div>
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-center">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Gap Needed</p>
                  <p style={{ fontSize: typo.bodyLarge }} className="font-bold text-orange-400">
                    {Math.abs(calculateExpansion(50, 12, initialLength) - calculateExpansion(-30, 12, initialLength)).toFixed(1)} mm
                  </p>
                  <p style={{ fontSize: typo.label }} className="text-gray-500">minimum</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 style={{ fontSize: typo.bodyLarge }} className="font-medium text-yellow-400 mb-3">Engineering Considerations:</h3>
              <div className="space-y-2 text-gray-300" style={{ fontSize: typo.small }}>
                <p>* <strong>Safety factor:</strong> Real joints are sized 50-100% larger than calculated</p>
                <p>* <strong>Multiple joints:</strong> Long bridges use several joints to distribute movement</p>
                <p>* <strong>Bearing type:</strong> Sliding bearings allow movement; fixed bearings anchor one end</p>
                <p>* <strong>Waterproofing:</strong> Joints must seal against rain while allowing movement</p>
              </div>
            </div>
          </div>
        );

      case 'twist_play': // Advanced: Water Anomaly
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-purple-400">Advanced: Water's Anomaly</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 style={{ fontSize: typo.bodyLarge }} className="font-medium text-blue-400 mb-4">Why Lakes Don't Freeze Solid</h3>

              <div className="relative">
                <svg viewBox="0 0 400 250" className="w-full h-64">
                  <defs>
                    {/* Background gradient */}
                    <linearGradient id="thexLakeBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>

                    {/* Ice layer gradient with crystalline effect */}
                    <linearGradient id="thexIceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
                      <stop offset="30%" stopColor="#bae6fd" stopOpacity="0.9" />
                      <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
                    </linearGradient>

                    {/* Ice glow filter */}
                    <filter id="thexIceGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Water layer gradients */}
                    <linearGradient id="thexWaterLayer1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
                    </linearGradient>

                    <linearGradient id="thexWaterLayer2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
                    </linearGradient>

                    <linearGradient id="thexWaterLayer3" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#1e40af" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#1e3a8a" stopOpacity="1" />
                    </linearGradient>

                    {/* Lake bottom sediment gradient */}
                    <linearGradient id="thexSedimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#92400e" />
                      <stop offset="50%" stopColor="#78350f" />
                      <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>

                    {/* Fish glow */}
                    <filter id="thexFishGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="1" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Density curve glow */}
                    <filter id="thexCurveGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Max density point glow */}
                    <radialGradient id="thexMaxDensityGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="60%" stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
                    </radialGradient>

                    {/* Graph line gradient */}
                    <linearGradient id="thexDensityCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="40%" stopColor="#3b82f6" />
                      <stop offset="60%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>

                  {/* Background */}
                  <rect x="0" y="0" width="400" height="250" fill="url(#thexLakeBgGradient)"/>

                  {/* Ice layer with crystalline gradient */}
                  <rect x="50" y="30" width="300" height="30" fill="url(#thexIceGradient)" rx="2" filter="url(#thexIceGlow)"/>
                  {/* Ice surface shimmer */}
                  <rect x="50" y="30" width="300" height="5" fill="#f0f9ff" opacity="0.4" rx="1"/>

                  {/* Water layers with gradients */}
                  <rect x="50" y="60" width="300" height="25" fill="url(#thexWaterLayer1)"/>
                  <rect x="50" y="85" width="300" height="30" fill="url(#thexWaterLayer2)"/>
                  <rect x="50" y="115" width="300" height="50" fill="url(#thexWaterLayer3)"/>

                  {/* Animated fish silhouettes */}
                  <g filter="url(#thexFishGlow)">
                    <ellipse cx="150" cy="140" rx="8" ry="4" fill="#93c5fd" opacity="0.6">
                      <animate attributeName="cx" values="150;160;150" dur="3s" repeatCount="indefinite"/>
                    </ellipse>
                    <ellipse cx="250" cy="145" rx="6" ry="3" fill="#bae6fd" opacity="0.5">
                      <animate attributeName="cx" values="250;240;250" dur="4s" repeatCount="indefinite"/>
                    </ellipse>
                  </g>

                  {/* Lake bottom with gradient */}
                  <rect x="50" y="165" width="300" height="30" fill="url(#thexSedimentGradient)"/>
                  {/* Sediment texture dots */}
                  <circle cx="80" cy="175" r="2" fill="#a16207" opacity="0.4"/>
                  <circle cx="150" cy="180" r="1.5" fill="#a16207" opacity="0.3"/>
                  <circle cx="280" cy="178" r="2" fill="#a16207" opacity="0.35"/>

                  {/* Density graph with premium styling */}
                  <g transform="translate(60, 195)">
                    {/* Axis lines */}
                    <line x1="0" y1="0" x2="280" y2="0" stroke="#4b5563" strokeWidth="1"/>
                    <line x1="0" y1="0" x2="0" y2="-40" stroke="#4b5563" strokeWidth="1"/>

                    {/* Grid lines */}
                    <line x1="56" y1="0" x2="56" y2="-40" stroke="#374151" strokeWidth="0.5" strokeDasharray="2 2"/>

                    {/* Density curve with gradient and glow */}
                    <path
                      d="M 0,-20 Q 30,-35 56,-38 Q 80,-35 120,-20"
                      fill="none"
                      stroke="url(#thexDensityCurveGradient)"
                      strokeWidth="3"
                      filter="url(#thexCurveGlow)"
                    />

                    {/* Max density point with glow */}
                    <circle cx="56" cy="-38" r="6" fill="url(#thexMaxDensityGlow)" opacity="0.5"/>
                    <circle cx="56" cy="-38" r="4" fill="#ef4444"/>

                    {/* Axis tick marks */}
                    <line x1="0" y1="0" x2="0" y2="4" stroke="#6b7280" strokeWidth="1"/>
                    <line x1="56" y1="0" x2="56" y2="4" stroke="#6b7280" strokeWidth="1"/>
                    <line x1="140" y1="0" x2="140" y2="4" stroke="#6b7280" strokeWidth="1"/>
                  </g>
                </svg>

                {/* Labels outside SVG using typo system */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2">
                  <p style={{ fontSize: typo.small }} className="text-slate-800 font-medium">Ice (0C)</p>
                </div>
                <div className="absolute top-16 right-4">
                  <p style={{ fontSize: typo.label }} className="text-sky-400">1-2C</p>
                </div>
                <div className="absolute top-24 right-4">
                  <p style={{ fontSize: typo.label }} className="text-sky-500">3C</p>
                </div>
                <div className="absolute top-32 right-4">
                  <p style={{ fontSize: typo.label }} className="text-blue-400 font-bold">4C (densest!)</p>
                </div>
                <div className="absolute top-36 left-1/2 -translate-x-1/2">
                  <p style={{ fontSize: typo.small }} className="text-blue-200">Fish survive here</p>
                </div>
                <div className="absolute bottom-16 left-16">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Temperature (C)</p>
                </div>
                <div className="absolute bottom-20 left-8">
                  <p style={{ fontSize: typo.label }} className="text-gray-400">Density</p>
                </div>
                <div className="absolute bottom-10 left-14">
                  <p style={{ fontSize: typo.label }} className="text-gray-500">0</p>
                </div>
                <div className="absolute bottom-6 left-20">
                  <p style={{ fontSize: typo.label }} className="text-red-400 font-bold">4C</p>
                </div>
                <div className="absolute bottom-10 left-36">
                  <p style={{ fontSize: typo.label }} className="text-gray-500">10</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 style={{ fontSize: typo.body }} className="text-blue-400 font-medium mb-2">Normal Materials</h4>
                <ul style={{ fontSize: typo.small }} className="text-gray-300 space-y-1">
                  <li>* Density increases as temperature decreases</li>
                  <li>* Coldest material sinks to bottom</li>
                  <li>* Would freeze from bottom up</li>
                  <li>* All aquatic life would die each winter</li>
                </ul>
              </div>

              <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4">
                <h4 style={{ fontSize: typo.body }} className="text-cyan-400 font-medium mb-2">Water's Anomaly</h4>
                <ul style={{ fontSize: typo.small }} className="text-gray-300 space-y-1">
                  <li>* Maximum density at 4C (not 0C)</li>
                  <li>* 4C water sinks, colder water rises</li>
                  <li>* Ice forms on surface, insulating below</li>
                  <li>* Deep water stays at 4C - life survives!</li>
                </ul>
              </div>
            </div>

            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <h4 style={{ fontSize: typo.body }} className="text-purple-400 font-medium mb-2">The Molecular Explanation</h4>
              <p style={{ fontSize: typo.small }} className="text-gray-300">
                Water molecules form hydrogen bonds that create an open, hexagonal structure in ice.
                This structure is actually <strong>less dense</strong> than liquid water! As water cools
                toward 0C, hydrogen bonding starts organizing the structure before freezing, making
                cold water less dense than 4C water.
              </p>
            </div>
          </div>
        );

      case 'twist_review': // Quiz phase 1
      case 'transfer': // Quiz phase 2
        const question = testQuestions[currentQuestion];

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 style={{ fontSize: typo.heading }} className="font-bold text-green-400">Knowledge Check</h2>
              <div style={{ fontSize: typo.small }} className="text-gray-400">
                Question {currentQuestion + 1} of {testQuestions.length} | Score: {score}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p style={{ fontSize: typo.small }} className="text-blue-300 font-medium mb-1">Scenario:</p>
                <p style={{ fontSize: typo.body }} className="text-gray-200">{question.scenario}</p>
              </div>

              <h3 style={{ fontSize: typo.bodyLarge }} className="font-medium text-white mb-4">{question.question}</h3>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                    style={{ zIndex: 10, fontSize: typo.body }}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      selectedAnswer === null
                        ? 'bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600'
                        : selectedAnswer === index
                        ? option.correct
                          ? 'bg-green-500/30 border-2 border-green-500'
                          : 'bg-red-500/30 border-2 border-red-500'
                        : option.correct && showExplanation
                        ? 'bg-green-500/20 border border-green-500/50'
                        : 'bg-gray-800/50 border border-gray-700 opacity-50'
                    }`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option.text}
                  </button>
                ))}
              </div>

              {showExplanation && (
                <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <h4 style={{ fontSize: typo.body }} className="text-yellow-400 font-medium mb-2">Explanation:</h4>
                  <p style={{ fontSize: typo.small }} className="text-gray-300">{question.explanation}</p>
                </div>
              )}
            </div>

            {showExplanation && (
              <button
                onClick={nextQuestion}
                style={{ zIndex: 10, fontSize: typo.body }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'Continue to Applications'}
              </button>
            )}
          </div>
        );

      case 'test': // Applications
        const currentApp = applications[transferAppIndex];
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-purple-400">Real-World Applications</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {applications.map((app, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setTransferAppIndex(index);
                    setSelectedApp(index);
                    logEvent('application_viewed', { app: app.title });
                    playSound('click');
                  }}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl text-center transition-all ${
                    transferAppIndex === index
                      ? 'bg-gray-700 ring-2 ring-purple-500'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-3xl mb-2">{app.icon}</div>
                  <p style={{ fontSize: typo.small }} className="font-medium">{app.title}</p>
                  <p style={{ fontSize: typo.label }} className="text-gray-400 mt-1">{app.short}</p>
                </button>
              ))}
            </div>

            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: `${currentApp.color}15`,
                borderColor: `${currentApp.color}40`,
                borderWidth: '1px'
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{currentApp.icon}</div>
                <div>
                  <h3 style={{ fontSize: typo.bodyLarge, color: currentApp.color }} className="font-bold">
                    {currentApp.title}
                  </h3>
                  <p style={{ fontSize: typo.small }} className="text-gray-400 italic">{currentApp.tagline}</p>
                </div>
              </div>

              <p style={{ fontSize: typo.body }} className="text-gray-300 mb-4">{currentApp.description}</p>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <h4 style={{ fontSize: typo.small }} className="font-medium text-orange-400 mb-2">Physics Connection:</h4>
                <p style={{ fontSize: typo.small }} className="text-gray-300">{currentApp.connection}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 style={{ fontSize: typo.small }} className="font-medium text-blue-400 mb-2">How It Works:</h4>
                  <ul style={{ fontSize: typo.small }} className="text-gray-300 space-y-1">
                    {currentApp.howItWorks.map((item, i) => (
                      <li key={i}>* {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: typo.small }} className="font-medium text-green-400 mb-2">Key Stats:</h4>
                  <ul style={{ fontSize: typo.small }} className="text-gray-300 space-y-1">
                    {currentApp.stats.map((stat, i) => (
                      <li key={i}>* {stat}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 style={{ fontSize: typo.small }} className="font-medium text-purple-400 mb-2">Examples:</h4>
                  <ul style={{ fontSize: typo.small }} className="text-gray-300 space-y-1">
                    {currentApp.examples.map((ex, i) => (
                      <li key={i}>* {ex}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: typo.small }} className="font-medium text-cyan-400 mb-2">Industry Leaders:</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentApp.companies.map((company, i) => (
                      <span key={i} style={{ fontSize: typo.label }} className="px-2 py-1 bg-gray-800 rounded text-gray-300">
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 style={{ fontSize: typo.small }} className="font-medium text-yellow-400 mb-2">Future Impact:</h4>
                <p style={{ fontSize: typo.small }} className="text-gray-300">{currentApp.futureImpact}</p>
              </div>
            </div>

            {transferAppIndex < applications.length - 1 && (
              <button
                onClick={() => {
                  setTransferAppIndex(transferAppIndex + 1);
                  playSound('click');
                }}
                style={{ zIndex: 10 }}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 rounded-lg font-medium transition-all"
              >
                Next Application →
              </button>
            )}
          </div>
        );

      case 'mastery': // Summary
        return (
          <div className="space-y-6">
            <h2 style={{ fontSize: typo.heading }} className="font-bold text-yellow-400">Mastery Complete!</h2>

            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-6 border border-orange-500/30">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">Thermometer Icon</div>
                <h3 style={{ fontSize: typo.heading }} className="font-bold text-orange-400">Thermal Expansion</h3>
                <p style={{ fontSize: typo.body }} className="text-gray-400">Materials in motion with temperature</p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <h4 style={{ fontSize: typo.bodyLarge }} className="font-medium text-white mb-2">Your Score</h4>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-green-400">{score}/{testQuestions.length}</div>
                  <div style={{ fontSize: typo.body }} className="text-gray-400">
                    {score === testQuestions.length ? 'Perfect! You understand the expanding world!' :
                     score >= 8 ? 'Excellent grasp of thermal expansion!' :
                     score >= 6 ? 'Good understanding of the fundamentals!' :
                     'Keep exploring thermal physics!'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 style={{ fontSize: typo.bodyLarge }} className="font-medium text-white">Key Equations Mastered:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div style={{ fontSize: typo.bodyLarge }} className="font-mono text-blue-400">Delta L = alpha L0 Delta T</div>
                    <p style={{ fontSize: typo.label }} className="text-gray-400 mt-1">Linear Expansion</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <div style={{ fontSize: typo.bodyLarge }} className="font-mono text-green-400">Delta V = 3 alpha V0 Delta T</div>
                    <p style={{ fontSize: typo.label }} className="text-gray-400 mt-1">Volume Expansion</p>
                  </div>
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                    <div style={{ fontSize: typo.bodyLarge }} className="font-mono text-red-400">sigma = E alpha Delta T</div>
                    <p style={{ fontSize: typo.label }} className="text-gray-400 mt-1">Thermal Stress</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <h4 style={{ fontSize: typo.body }} className="text-orange-400 font-bold mb-2">The Big Picture:</h4>
                <p style={{ fontSize: typo.small }} className="text-gray-300">
                  Thermal expansion is invisible yet affects every structure we build.
                  Engineers must either accommodate movement with expansion joints, or design
                  for the enormous forces that develop when expansion is constrained.
                  From bridges to railroads to precision instruments, thermal physics shapes our world.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get phase index for progress display
  const phaseIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Thermal Expansion</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">
            Phase {phaseIndex + 1}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-slate-800/50 rounded-2xl p-6 md:p-8 shadow-xl border border-slate-700/50">
            {renderPhase()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={phase === 'hook'}
              style={{ zIndex: 10 }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                phase === 'hook'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              Back
            </button>

            {phase !== 'mastery' && !((phase === 'twist_review' || phase === 'transfer') && !showExplanation) && (
              <button
                onClick={handleNext}
                disabled={phase === 'predict' && !userPrediction}
                style={{ zIndex: 10 }}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  (phase === 'predict' && !userPrediction)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/25'
                }`}
              >
                {phase === 'predict' ? 'See Calculation' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
