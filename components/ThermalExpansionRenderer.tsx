'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// THERMAL EXPANSION GAME - GOLD STANDARD IMPLEMENTATION
// ============================================================================
// Physics: ΔL = αL₀ΔT (linear), ΔV = βV₀ΔT (volumetric, β ≈ 3α)
// Key insight: Materials expand when heated because atoms vibrate more,
// pushing each other apart - essential for engineering bridges, rails, etc.
// ============================================================================

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
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

export default function ThermalExpansionRenderer({
  onEvent,
  currentPhase: externalPhase,
  onPhaseComplete
}: ThermalExpansionRendererProps) {
  // Core state
  const [phase, setPhase] = useState(externalPhase ?? 0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [temperature, setTemperature] = useState(20); // Celsius
  const [baseTemperature] = useState(20);
  const [selectedMaterial, setSelectedMaterial] = useState(0);
  const [initialLength, setInitialLength] = useState(1000); // mm
  const [showAtomicView, setShowAtomicView] = useState(false);
  const [userPrediction, setUserPrediction] = useState<string | null>(null);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Refs
  const navTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Sync with external phase
  useEffect(() => {
    if (externalPhase !== undefined) {
      setPhase(externalPhase);
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

  // Navigation with debouncing
  const handleNext = useCallback(() => {
    if (navTimeoutRef.current) return;

    navTimeoutRef.current = setTimeout(() => {
      navTimeoutRef.current = null;
    }, 400);

    playSound('transition');
    const nextPhase = phase + 1;
    setPhase(nextPhase);
    logEvent('phase_change', { from: phase, to: nextPhase });
    onPhaseComplete?.(phase);
    setShowExplanation(false);
    setSelectedAnswer(null);
    setUserPrediction(null);
  }, [phase, playSound, logEvent, onPhaseComplete]);

  const handleBack = useCallback(() => {
    if (navTimeoutRef.current || phase <= 0) return;

    navTimeoutRef.current = setTimeout(() => {
      navTimeoutRef.current = null;
    }, 400);

    playSound('click');
    setPhase(phase - 1);
    setShowExplanation(false);
    setSelectedAnswer(null);
  }, [phase, playSound]);

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
      case 0: // Hook/Introduction
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-orange-400">The Hidden Movement</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <p className="text-lg leading-relaxed">
                Every day, the Eiffel Tower grows <span className="text-orange-400 font-bold">15 centimeters taller</span> in summer
                and shrinks back in winter. Steel railroad tracks can buckle into dangerous curves on hot days.
              </p>

              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
                <p className="text-gray-300">
                  This invisible movement affects everything engineers build - bridges, buildings, pipelines, and precision instruments.
                  Understanding <span className="text-yellow-400">thermal expansion</span> is essential for safe design.
                </p>
              </div>
            </div>

            {/* Animated bridge expansion */}
            <div className="relative h-64 bg-gradient-to-b from-sky-400/20 to-gray-900/50 rounded-xl overflow-hidden">
              <svg viewBox="0 0 400 200" className="w-full h-full">
                {/* Sun */}
                <circle cx="50" cy="40" r="25" fill="#fbbf24" opacity="0.8">
                  <animate attributeName="r" values="25;28;25" dur="2s" repeatCount="indefinite"/>
                </circle>

                {/* Bridge towers */}
                <rect x="80" y="80" width="20" height="80" fill="#4b5563"/>
                <rect x="300" y="80" width="20" height="80" fill="#4b5563"/>

                {/* Bridge deck - animated expansion */}
                <rect x="60" y="110" width="140" height="15" fill="#6b7280">
                  <animate attributeName="width" values="140;145;140" dur="3s" repeatCount="indefinite"/>
                </rect>
                <rect x="205" y="110" width="140" height="15" fill="#6b7280">
                  <animate attributeName="x" values="205;202;205" dur="3s" repeatCount="indefinite"/>
                </rect>

                {/* Expansion joint gap */}
                <rect x="199" y="110" width="6" height="15" fill="#1f2937">
                  <animate attributeName="width" values="6;3;6" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="x" values="199;200;199" dur="3s" repeatCount="indefinite"/>
                </rect>

                {/* Water */}
                <rect x="0" y="160" width="400" height="40" fill="#3b82f6" opacity="0.4"/>

                {/* Labels */}
                <text x="200" y="145" textAnchor="middle" fill="#9ca3af" fontSize="10">Expansion Joint</text>
                <text x="200" y="185" textAnchor="middle" fill="#6b7280" fontSize="11">Gap changes with temperature</text>
              </svg>
            </div>

            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
              <p className="text-orange-300 font-medium">
                The Twist: Materials don't just expand uniformly - thermal stress builds up when expansion is restrained.
                A constrained beam can generate hundreds of tons of force from just a 50C temperature change!
              </p>
            </div>
          </div>
        );

      case 1: // Prediction
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-blue-400">Make Your Prediction</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <p className="mb-4">
                A <span className="text-orange-400 font-bold">100-meter steel bridge</span> is installed on a cool spring day (20C).
                In summer, the temperature reaches <span className="text-red-400 font-bold">60C</span> (a 40C increase).
              </p>

              {/* Visualization */}
              <div className="relative h-32 bg-gray-900/50 rounded-lg mb-4">
                <svg className="w-full h-full" viewBox="0 0 400 100">
                  {/* Before */}
                  <rect x="30" y="40" width="150" height="20" fill="#6b7280" rx="2"/>
                  <text x="105" y="35" textAnchor="middle" fill="#9ca3af" fontSize="10">Spring: 20C</text>
                  <text x="105" y="75" textAnchor="middle" fill="#6b7280" fontSize="12">100.000 m</text>

                  {/* Arrow */}
                  <path d="M195 50 L215 50" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)"/>
                  <text x="205" y="40" textAnchor="middle" fill="#f59e0b" fontSize="10">+40C</text>
                  <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b"/>
                    </marker>
                  </defs>

                  {/* After */}
                  <rect x="230" y="40" width="160" height="20" fill="#ef4444" rx="2"/>
                  <text x="310" y="35" textAnchor="middle" fill="#9ca3af" fontSize="10">Summer: 60C</text>
                  <text x="310" y="75" textAnchor="middle" fill="#9ca3af" fontSize="12">100.??? m</text>
                </svg>
              </div>

              <p className="text-sm text-gray-400">
                Steel has α = 12 × 10⁻⁶ per C. How much longer will the bridge become?
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
                  onMouseDown={() => makePrediction(option.id)}
                  disabled={userPrediction !== null}
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
                <p className="font-medium">
                  {userPrediction === 'medium'
                    ? 'Correct! Let\'s see the calculation...'
                    : 'Interesting guess! Let\'s calculate the actual expansion...'
                  }
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  ΔL = α × L₀ × ΔT = (12×10⁻⁶) × (100,000 mm) × (40C) = 48 mm
                </p>
              </div>
            )}
          </div>
        );

      case 2: // Observation/Experiment
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400">Observe: Thermal Expansion</h2>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
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
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>-40C</span>
                    <span>20C (ref)</span>
                    <span>100C</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Material: {currentMaterial.name}
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => {
                      setSelectedMaterial(Number(e.target.value));
                      logEvent('material_changed', { material: materials[Number(e.target.value)].name });
                    }}
                    className="w-full bg-gray-700 rounded p-2 text-white"
                  >
                    {materials.map((mat, i) => (
                      <option key={i} value={i}>{mat.name} (α = {mat.alpha}×10⁻⁶/C)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="relative bg-gray-900/50 rounded-lg p-4">
                <div className="mb-2 text-center text-sm text-gray-400">
                  Initial Length: {initialLength} mm at 20C
                </div>

                {/* Reference bar */}
                <div className="relative h-8 mb-2">
                  <div
                    className="absolute h-full bg-gray-600/50 border border-gray-500 rounded"
                    style={{ width: '100%' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    Reference at 20C
                  </div>
                </div>

                {/* Expanded/contracted bar */}
                <div className="relative h-12 mb-2">
                  <div
                    className="absolute h-full rounded transition-all duration-300"
                    style={{
                      width: `${100 * (finalLength / initialLength)}%`,
                      backgroundColor: currentMaterial.color,
                      left: expansion < 0 ? `${100 - (100 * finalLength / initialLength)}%` : 0
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center text-sm font-medium"
                    style={{ color: temperature > 50 ? '#1f2937' : '#ffffff' }}
                  >
                    {finalLength.toFixed(3)} mm at {temperature}C
                  </div>
                </div>

                {/* Change indicator */}
                <div className={`text-center text-lg font-bold ${
                  expansion > 0 ? 'text-red-400' : expansion < 0 ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {expansion > 0 ? '+' : ''}{expansion.toFixed(3)} mm
                  ({expansion > 0 ? 'expansion' : expansion < 0 ? 'contraction' : 'no change'})
                </div>
              </div>

              {/* Stats panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Temperature Change</p>
                  <p className="text-lg font-bold text-orange-400">
                    {temperature - baseTemperature > 0 ? '+' : ''}{temperature - baseTemperature}C
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Expansion Coef.</p>
                  <p className="text-lg font-bold text-blue-400">{currentMaterial.alpha}</p>
                  <p className="text-xs text-gray-500">×10⁻⁶/C</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Length Change</p>
                  <p className="text-lg font-bold text-green-400">
                    {expansion.toFixed(3)} mm
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Strain</p>
                  <p className="text-lg font-bold text-purple-400">
                    {((expansion / initialLength) * 100).toFixed(4)}%
                  </p>
                </div>
              </div>
            </div>

            <button
              onMouseDown={() => setShowAtomicView(!showAtomicView)}
              className="w-full p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30"
            >
              {showAtomicView ? 'Hide' : 'Show'} Atomic View
            </button>

            {showAtomicView && (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-lg font-medium text-purple-400 mb-3">Why Materials Expand</h3>
                <div className="flex gap-8 justify-center mb-4">
                  {/* Cold atoms */}
                  <div className="text-center">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      {[0, 1, 2].map(row => (
                        [0, 1, 2].map(col => (
                          <circle
                            key={`cold-${row}-${col}`}
                            cx={20 + col * 25}
                            cy={20 + row * 25}
                            r="8"
                            fill="#3b82f6"
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
                    <p className="text-sm text-blue-400">Cold: Small vibrations</p>
                    <p className="text-xs text-gray-500">Atoms closer together</p>
                  </div>

                  {/* Hot atoms */}
                  <div className="text-center">
                    <svg viewBox="0 0 120 120" className="w-24 h-24">
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
                              fill="#ef4444"
                            />
                          );
                        })
                      ))}
                    </svg>
                    <p className="text-sm text-red-400">Hot: Large vibrations</p>
                    <p className="text-xs text-gray-500">Atoms pushed apart</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 text-center">
                  Thermal expansion occurs because atoms vibrate more at higher temperatures,
                  pushing their neighbors farther away on average.
                </p>
              </div>
            )}
          </div>
        );

      case 3: // Explanation
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-yellow-400">The Physics Revealed</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-orange-400 mb-4">Thermal Expansion Equations</h3>

              <div className="space-y-6">
                {/* Linear expansion */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center text-2xl font-mono text-blue-400 mb-2">
                    ΔL = α × L₀ × ΔT
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-green-400">Length change</span> =
                    <span className="text-purple-400"> expansion coefficient</span> ×
                    <span className="text-blue-400"> original length</span> ×
                    <span className="text-orange-400"> temperature change</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Linear expansion applies to any one dimension - length, width, or height.
                    Each dimension expands independently.
                  </p>
                </div>

                {/* Volumetric expansion */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center text-2xl font-mono text-green-400 mb-2">
                    ΔV = β × V₀ × ΔT <span className="text-gray-500 text-lg">(β ≈ 3α)</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Volume expands in <span className="text-yellow-400">three dimensions</span>,
                    so β ≈ 3α for solids
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    A cube that expands 0.1% in each dimension gains about 0.3% in volume.
                    This is why liquid thermometers work - the liquid expands more than the glass.
                  </p>
                </div>

                {/* Thermal stress */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center text-2xl font-mono text-red-400 mb-2">
                    σ = E × α × ΔT
                  </div>
                  <p className="text-sm text-gray-300">
                    When expansion is <span className="text-red-400">prevented</span>,
                    thermal stress builds up!
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    E = Young's modulus (~200 GPa for steel). A 40C rise in restrained steel
                    creates ~96 MPa stress - enough to buckle railroad tracks!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Why Different α Values?</h4>
                <p className="text-sm text-gray-300">
                  The expansion coefficient depends on atomic bonding. Stronger bonds (like in ceramics)
                  resist atomic displacement, giving lower α. Metals with weaker metallic bonds
                  expand more easily.
                </p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-medium mb-2">The Invar Exception</h4>
                <p className="text-sm text-gray-300">
                  Invar (36% Ni, 64% Fe) has near-zero expansion because magnetic effects
                  counteract thermal expansion. This Nobel Prize discovery enables
                  precision instruments.
                </p>
              </div>
            </div>

            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
              <h4 className="text-orange-400 font-bold mb-2">The Deep Insight</h4>
              <p className="text-gray-300">
                Thermal expansion isn't just about making things bigger - it's about the
                <strong> forces that develop when expansion is constrained</strong>.
                Engineers must either allow movement (expansion joints) or design structures
                strong enough to handle the stress.
              </p>
            </div>
          </div>
        );

      case 4: // Interactive Exploration
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Explore: Expansion Joints</h2>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-300 mb-4">
                Design an expansion joint for a steel bridge. The bridge is 200 meters long
                and must handle temperatures from -30C to +50C.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
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
                  <label className="block text-sm text-gray-400 mb-1">
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

              {/* Bridge visualization */}
              <div className="relative bg-gradient-to-b from-sky-400/20 to-gray-900/50 rounded-lg h-48 overflow-hidden">
                <svg viewBox="0 0 400 150" className="w-full h-full">
                  {/* Water */}
                  <rect x="0" y="120" width="400" height="30" fill="#3b82f6" opacity="0.3"/>

                  {/* Towers */}
                  <rect x="50" y="60" width="15" height="70" fill="#4b5563"/>
                  <rect x="335" y="60" width="15" height="70" fill="#4b5563"/>

                  {/* Bridge segments with gap */}
                  {(() => {
                    const coldExpansion = calculateExpansion(-30, 12, initialLength);
                    const hotExpansion = calculateExpansion(50, 12, initialLength);
                    const totalRange = hotExpansion - coldExpansion;
                    const gapNeeded = Math.abs(totalRange);
                    const currentExpansion = calculateExpansion(temperature, 12, initialLength);
                    const gapWidth = Math.max(2, gapNeeded - (currentExpansion - coldExpansion)) / 10;

                    return (
                      <>
                        <rect x="65" y="85" width={130 - gapWidth/2} height="12" fill="#6b7280"/>
                        <rect x={200 + gapWidth/2} y="85" width={135 - gapWidth/2} height="12" fill="#6b7280"/>
                        <rect x={195 - gapWidth/2} y="85" width={gapWidth} height="12" fill="#1f2937"/>

                        <text x="200" y="115" textAnchor="middle" fill="#f59e0b" fontSize="10">
                          Gap: {gapWidth.toFixed(1)} mm
                        </text>
                      </>
                    );
                  })()}

                  {/* Temperature indicator */}
                  <text x="30" y="30" fill={temperature < 0 ? '#3b82f6' : '#ef4444'} fontSize="14">
                    {temperature}C
                  </text>
                </svg>
              </div>

              {/* Calculations */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">At -30C</p>
                  <p className="text-lg font-bold text-blue-400">
                    {calculateExpansion(-30, 12, initialLength).toFixed(1)} mm
                  </p>
                  <p className="text-xs text-gray-500">contracted</p>
                </div>
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">At +50C</p>
                  <p className="text-lg font-bold text-red-400">
                    +{calculateExpansion(50, 12, initialLength).toFixed(1)} mm
                  </p>
                  <p className="text-xs text-gray-500">expanded</p>
                </div>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Total Range</p>
                  <p className="text-lg font-bold text-green-400">
                    {(calculateExpansion(50, 12, initialLength) - calculateExpansion(-30, 12, initialLength)).toFixed(1)} mm
                  </p>
                </div>
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Gap Needed</p>
                  <p className="text-lg font-bold text-orange-400">
                    {Math.abs(calculateExpansion(50, 12, initialLength) - calculateExpansion(-30, 12, initialLength)).toFixed(1)} mm
                  </p>
                  <p className="text-xs text-gray-500">minimum</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-400 mb-3">Engineering Considerations:</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• <strong>Safety factor:</strong> Real joints are sized 50-100% larger than calculated</p>
                <p>• <strong>Multiple joints:</strong> Long bridges use several joints to distribute movement</p>
                <p>• <strong>Bearing type:</strong> Sliding bearings allow movement; fixed bearings anchor one end</p>
                <p>• <strong>Waterproofing:</strong> Joints must seal against rain while allowing movement</p>
              </div>
            </div>
          </div>
        );

      case 5: // Advanced: Water Anomaly
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-purple-400">Advanced: Water's Anomaly</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-blue-400 mb-4">Why Lakes Don't Freeze Solid</h3>

              <svg viewBox="0 0 400 250" className="w-full h-64">
                {/* Background */}
                <rect x="0" y="0" width="400" height="250" fill="#111827"/>

                {/* Ice layer at top */}
                <rect x="50" y="30" width="300" height="30" fill="#a5f3fc" opacity="0.8"/>
                <text x="200" y="50" textAnchor="middle" fill="#0f172a" fontSize="10">Ice (0C)</text>

                {/* Water layers with temperature gradient */}
                <rect x="50" y="60" width="300" height="25" fill="#38bdf8" opacity="0.6"/>
                <text x="360" y="75" fill="#38bdf8" fontSize="9">1-2C</text>

                <rect x="50" y="85" width="300" height="30" fill="#0284c7" opacity="0.7"/>
                <text x="360" y="102" fill="#0284c7" fontSize="9">3C</text>

                <rect x="50" y="115" width="300" height="50" fill="#1e40af" opacity="0.9"/>
                <text x="360" y="145" fill="#3b82f6" fontSize="9">4C (densest!)</text>
                <text x="200" y="145" textAnchor="middle" fill="#93c5fd" fontSize="11">Fish survive here</text>

                {/* Lake bottom */}
                <rect x="50" y="165" width="300" height="30" fill="#78350f"/>

                {/* Density graph */}
                <g transform="translate(60, 195)">
                  <line x1="0" y1="0" x2="280" y2="0" stroke="#4b5563" strokeWidth="1"/>
                  <line x1="0" y1="0" x2="0" y2="-40" stroke="#4b5563" strokeWidth="1"/>
                  <text x="140" y="15" textAnchor="middle" fill="#9ca3af" fontSize="8">Temperature (C)</text>
                  <text x="-5" y="-20" textAnchor="end" fill="#9ca3af" fontSize="8">Density</text>

                  {/* Curve showing max density at 4C */}
                  <path
                    d="M 0,-20 Q 30,-35 56,-38 Q 80,-35 120,-20"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <circle cx="56" cy="-38" r="3" fill="#ef4444"/>
                  <text x="56" y="-42" textAnchor="middle" fill="#ef4444" fontSize="8">4C</text>

                  {/* Temperature labels */}
                  <text x="0" y="8" textAnchor="middle" fill="#6b7280" fontSize="7">0</text>
                  <text x="56" y="8" textAnchor="middle" fill="#6b7280" fontSize="7">4</text>
                  <text x="140" y="8" textAnchor="middle" fill="#6b7280" fontSize="7">10</text>
                </g>
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Normal Materials</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Density increases as temperature decreases</li>
                  <li>• Coldest material sinks to bottom</li>
                  <li>• Would freeze from bottom up</li>
                  <li>• All aquatic life would die each winter</li>
                </ul>
              </div>

              <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="text-cyan-400 font-medium mb-2">Water's Anomaly</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Maximum density at 4C (not 0C)</li>
                  <li>• 4C water sinks, colder water rises</li>
                  <li>• Ice forms on surface, insulating below</li>
                  <li>• Deep water stays at 4C - life survives!</li>
                </ul>
              </div>
            </div>

            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">The Molecular Explanation</h4>
              <p className="text-sm text-gray-300">
                Water molecules form hydrogen bonds that create an open, hexagonal structure in ice.
                This structure is actually <strong>less dense</strong> than liquid water! As water cools
                toward 0C, hydrogen bonding starts organizing the structure before freezing, making
                cold water less dense than 4C water.
              </p>
            </div>
          </div>
        );

      case 6: // Quiz
      case 7:
      case 8:
        const question = testQuestions[currentQuestion];

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-green-400">Knowledge Check</h2>
              <div className="text-sm text-gray-400">
                Question {currentQuestion + 1} of {testQuestions.length} | Score: {score}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-blue-300 text-sm font-medium mb-1">Scenario:</p>
                <p className="text-gray-200">{question.scenario}</p>
              </div>

              <h3 className="text-lg font-medium text-white mb-4">{question.question}</h3>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onMouseDown={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
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
                  <h4 className="text-yellow-400 font-medium mb-2">Explanation:</h4>
                  <p className="text-gray-300">{question.explanation}</p>
                </div>
              )}
            </div>

            {showExplanation && (
              <button
                onMouseDown={nextQuestion}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'Continue to Applications'}
              </button>
            )}
          </div>
        );

      case 9: // Applications
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-purple-400">Real-World Applications</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {applications.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={() => {
                    setSelectedApp(selectedApp === index ? null : index);
                    logEvent('application_viewed', { app: app.title });
                    playSound('click');
                  }}
                  className={`p-4 rounded-xl text-center transition-all ${
                    selectedApp === index
                      ? 'bg-gray-700 ring-2 ring-purple-500'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-3xl mb-2">{app.icon}</div>
                  <p className="text-sm font-medium">{app.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{app.short}</p>
                </button>
              ))}
            </div>

            {selectedApp !== null && (
              <div
                className="rounded-xl p-6"
                style={{
                  backgroundColor: `${applications[selectedApp].color}15`,
                  borderColor: `${applications[selectedApp].color}40`,
                  borderWidth: '1px'
                }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{applications[selectedApp].icon}</div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: applications[selectedApp].color }}>
                      {applications[selectedApp].title}
                    </h3>
                    <p className="text-sm text-gray-400 italic">{applications[selectedApp].tagline}</p>
                  </div>
                </div>

                <p className="text-gray-300 mb-4">{applications[selectedApp].description}</p>

                <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-orange-400 mb-2">Physics Connection:</h4>
                  <p className="text-sm text-gray-300">{applications[selectedApp].connection}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-2">How It Works:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {applications[selectedApp].howItWorks.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2">Key Stats:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {applications[selectedApp].stats.map((stat, i) => (
                        <li key={i}>• {stat}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-purple-400 mb-2">Examples:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {applications[selectedApp].examples.map((ex, i) => (
                        <li key={i}>• {ex}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-cyan-400 mb-2">Industry Leaders:</h4>
                    <div className="flex flex-wrap gap-2">
                      {applications[selectedApp].companies.map((company, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-400 mb-2">Future Impact:</h4>
                  <p className="text-sm text-gray-300">{applications[selectedApp].futureImpact}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 10: // Summary
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-yellow-400">Mastery Complete!</h2>

            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-6 border border-orange-500/30">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🌡️</div>
                <h3 className="text-2xl font-bold text-orange-400">Thermal Expansion</h3>
                <p className="text-gray-400">Materials in motion with temperature</p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-medium text-white mb-2">Your Score</h4>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-green-400">{score}/{testQuestions.length}</div>
                  <div className="text-gray-400">
                    {score === testQuestions.length ? 'Perfect! You understand the expanding world!' :
                     score >= 8 ? 'Excellent grasp of thermal expansion!' :
                     score >= 6 ? 'Good understanding of the fundamentals!' :
                     'Keep exploring thermal physics!'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white">Key Equations Mastered:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-mono text-blue-400">ΔL = αL₀ΔT</div>
                    <p className="text-xs text-gray-400 mt-1">Linear Expansion</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-mono text-green-400">ΔV = 3αV₀ΔT</div>
                    <p className="text-xs text-gray-400 mt-1">Volume Expansion</p>
                  </div>
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-mono text-red-400">σ = EαΔT</div>
                    <p className="text-xs text-gray-400 mt-1">Thermal Stress</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <h4 className="text-orange-400 font-bold mb-2">The Big Picture:</h4>
                <p className="text-gray-300">
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
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p, i) => (
              <div
                key={p}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">
            Phase {phase + 1}
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
              onMouseDown={handleBack}
              disabled={phase === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                phase === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              Back
            </button>

            {phase < 10 && !((phase >= 6 && phase <= 8) && !showExplanation) && (
              <button
                onMouseDown={handleNext}
                disabled={phase === 1 && !userPrediction}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  (phase === 1 && !userPrediction)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/25'
                }`}
              >
                {phase === 1 ? 'See Calculation' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
