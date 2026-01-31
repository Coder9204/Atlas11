'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// KINETIC THEORY OF GASES GAME - GOLD STANDARD IMPLEMENTATION
// ============================================================================
// Physics: PV = NkT, v_rms = sqrt(3kT/m), KE_avg = (3/2)kT
// Key insight: Temperature IS molecular motion - gas pressure comes from
// countless molecular collisions with container walls
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
  | 'volume_changed'
  | 'particle_count_changed'
  | 'distribution_viewed'
  | 'collision_counted'
  | 'pressure_calculated'
  | 'rms_speed_calculated'
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

// Gas molecule for simulation
interface Molecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  mass: number;
  radius: number;
  color: string;
}

interface KineticTheoryGasesRendererProps {
  onEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Boltzmann constant
const k_B = 1.38e-23; // J/K

export default function KineticTheoryGasesRenderer({
  onEvent,
  gamePhase: externalPhase,
  onPhaseComplete
}: KineticTheoryGasesRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>((externalPhase as Phase) ?? 'hook');
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [temperature, setTemperature] = useState(300); // Kelvin
  const [volume, setVolume] = useState(100); // Arbitrary units
  const [particleCount, setParticleCount] = useState(50);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [wallCollisions, setWallCollisions] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [showDistribution, setShowDistribution] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [userPrediction, setUserPrediction] = useState<string | null>(null);
  const [predictionCorrect, setPredictionCorrect] = useState<boolean | null>(null);

  // Refs
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const collisionCountRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Helper to get phase index
  const getPhaseIndex = useCallback((p: Phase) => phaseOrder.indexOf(p), []);

  // Helper to check if simulation should run
  const shouldRunSimulation = useCallback((p: Phase) => {
    return ['predict', 'play', 'review', 'twist_predict', 'twist_play'].includes(p);
  }, []);

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
  const playSound = useCallback((soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (!audioContextRef.current) return;

    const soundConfig = {
      click: { frequency: 440, type: 'sine' as OscillatorType, duration: 0.1 },
      success: { frequency: 660, type: 'sine' as OscillatorType, duration: 0.2 },
      failure: { frequency: 220, type: 'sawtooth' as OscillatorType, duration: 0.3 },
      transition: { frequency: 500, type: 'sine' as OscillatorType, duration: 0.1 },
      complete: { frequency: 800, type: 'sine' as OscillatorType, duration: 0.3 }
    };
    const { frequency, type, duration } = soundConfig[soundType];

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + duration);
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

  // Calculate RMS speed: v_rms = sqrt(3kT/m)
  const calculateRmsSpeed = useCallback((temp: number, mass: number = 4.65e-26) => {
    // Default mass is nitrogen molecule (~28 g/mol = 4.65e-26 kg)
    return Math.sqrt((3 * k_B * temp) / mass);
  }, []);

  // Calculate average kinetic energy: KE = (3/2)kT
  const calculateAvgKE = useCallback((temp: number) => {
    return (3 / 2) * k_B * temp;
  }, []);

  // Get color based on speed
  const getSpeedColor = useCallback((speedFactor: number): string => {
    if (speedFactor < 0.7) return '#3b82f6'; // Blue - slow
    if (speedFactor < 1.0) return '#22c55e'; // Green - medium
    if (speedFactor < 1.3) return '#f59e0b'; // Orange - fast
    return '#ef4444'; // Red - very fast
  }, []);

  // Initialize molecules
  const initializeMolecules = useCallback(() => {
    const containerSize = 300;
    const newMolecules: Molecule[] = [];
    const baseSpeed = calculateRmsSpeed(temperature);
    const scaleFactor = 0.00001; // Scale for visualization

    for (let i = 0; i < particleCount; i++) {
      // Maxwell-Boltzmann distributed speeds (simplified)
      const speedFactor = 0.5 + Math.random() * 1.5; // Varies around mean
      const speed = baseSpeed * scaleFactor * speedFactor;
      const angle = Math.random() * 2 * Math.PI;

      newMolecules.push({
        id: i,
        x: 20 + Math.random() * (containerSize - 40),
        y: 20 + Math.random() * (containerSize - 40),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        speed: speed,
        mass: 4.65e-26,
        radius: 4,
        color: getSpeedColor(speedFactor)
      });
    }

    setMolecules(newMolecules);
    collisionCountRef.current = 0;
    setWallCollisions(0);
  }, [particleCount, temperature, calculateRmsSpeed, getSpeedColor]);

  // Update molecule positions and handle collisions
  const updateMolecules = useCallback((deltaTime: number) => {
    const containerSize = volume * 3; // Scale volume to visual size

    setMolecules(prev => {
      let newCollisions = 0;

      const updated = prev.map(mol => {
        let newX = mol.x + mol.vx * deltaTime * 60;
        let newY = mol.y + mol.vy * deltaTime * 60;
        let newVx = mol.vx;
        let newVy = mol.vy;

        // Wall collisions
        if (newX <= mol.radius) {
          newX = mol.radius;
          newVx = -newVx;
          newCollisions++;
        } else if (newX >= containerSize - mol.radius) {
          newX = containerSize - mol.radius;
          newVx = -newVx;
          newCollisions++;
        }

        if (newY <= mol.radius) {
          newY = mol.radius;
          newVy = -newVy;
          newCollisions++;
        } else if (newY >= containerSize - mol.radius) {
          newY = containerSize - mol.radius;
          newVy = -newVy;
          newCollisions++;
        }

        return { ...mol, x: newX, y: newY, vx: newVx, vy: newVy };
      });

      collisionCountRef.current += newCollisions;

      return updated;
    });

    // Update wall collision count periodically
    setWallCollisions(collisionCountRef.current);

    // Calculate pressure from collision rate (proportional to N*T/V)
    const theoreticalPressure = (particleCount * temperature) / volume;
    setPressure(theoreticalPressure);
  }, [volume, particleCount, temperature]);

  // Animation loop
  useEffect(() => {
    if (!simulationRunning || !shouldRunSimulation(phase)) return;

    const animate = (time: number) => {
      const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;

      if (deltaTime < 0.1) { // Cap delta time
        updateMolecules(deltaTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    initializeMolecules();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simulationRunning, phase, initializeMolecules, updateMolecules, shouldRunSimulation]);

  // Reinitialize on parameter changes
  useEffect(() => {
    if (shouldRunSimulation(phase)) {
      initializeMolecules();
    }
  }, [temperature, volume, particleCount, phase, initializeMolecules, shouldRunSimulation]);

  // Event logging
  const logEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    const event: GameEvent = { type, timestamp: Date.now(), data };
    onEvent?.(event);
  }, [onEvent]);

  // Go to specific phase
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    logEvent('phase_change', { from: phase, to: newPhase });
    onPhaseComplete?.(phase);
    setShowExplanation(false);
    setSelectedAnswer(null);
    setUserPrediction(null);
    setPredictionCorrect(null);
  }, [phase, playSound, logEvent, onPhaseComplete]);

  // Navigation
  const handleNext = useCallback(() => {
    const currentIndex = getPhaseIndex(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, getPhaseIndex, goToPhase]);

  const handleBack = useCallback(() => {
    const currentIndex = getPhaseIndex(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, getPhaseIndex, goToPhase]);

  // Handle prediction
  const makePrediction = useCallback((prediction: string) => {
    setUserPrediction(prediction);
    logEvent('prediction_made', { prediction });
    playSound('click');
  }, [logEvent, playSound]);

  // Test questions - scenario-based
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A sealed balloon is taken from sea level (300 K) to a hot car interior (330 K).",
      question: "What happens to the average speed of air molecules inside?",
      options: [
        { text: "Increases by about 5%", correct: true },
        { text: "Increases by about 10%", correct: false },
        { text: "Stays the same", correct: false },
        { text: "Decreases slightly", correct: false }
      ],
      explanation: "v_rms is proportional to sqrt(T). When T increases from 300 K to 330 K (10% increase), v_rms increases by sqrt(330/300) = 1.05, or about 5%. Speed scales with the square root of temperature, not linearly."
    },
    {
      scenario: "Two containers hold different gases at the same temperature: helium (mass 4 u) and argon (mass 40 u).",
      question: "How does the RMS speed of helium compare to argon?",
      options: [
        { text: "Helium is sqrt(10) = 3.2x faster", correct: true },
        { text: "Helium is 10x faster", correct: false },
        { text: "They have the same speed", correct: false },
        { text: "Argon is faster (heavier = more momentum)", correct: false }
      ],
      explanation: "v_rms = sqrt(3kT/m). At the same temperature, lighter molecules move faster. v_He/v_Ar = sqrt(m_Ar/m_He) = sqrt(40/4) = sqrt(10) = 3.2. This is why hydrogen and helium escape Earth's atmosphere."
    },
    {
      scenario: "A gas in a piston is compressed to half its original volume while temperature is held constant.",
      question: "What happens to the pressure?",
      options: [
        { text: "Doubles", correct: true },
        { text: "Quadruples", correct: false },
        { text: "Stays the same", correct: false },
        { text: "Halves", correct: false }
      ],
      explanation: "PV = NkT (ideal gas law). At constant T and N, if V goes to V/2, then P goes to 2P. Molecules hit the walls twice as often in half the volume, doubling the pressure."
    },
    {
      scenario: "Scientists measure that oxygen molecules at room temperature have an RMS speed of about 480 m/s.",
      question: "Why don't we feel this 'molecular wind'?",
      options: [
        { text: "Molecules move randomly in all directions, averaging to zero net flow", correct: true },
        { text: "The molecules are too small to detect", correct: false },
        { text: "Our nerves aren't sensitive enough", correct: false },
        { text: "Air pressure cancels out the motion", correct: false }
      ],
      explanation: "While individual molecules zoom at hundreds of m/s, their directions are random. At any point, roughly equal numbers move left vs right, up vs down. The net momentum transfer is zero unless there's bulk flow (wind)."
    },
    {
      scenario: "A tire pressure gauge reads 32 psi when the car has been parked overnight at 20C. After highway driving, the tire temperature rises to 50C.",
      question: "What is the approximate new gauge pressure?",
      options: [
        { text: "About 35 psi", correct: true },
        { text: "About 40 psi", correct: false },
        { text: "About 32 psi (pressure doesn't depend on temperature)", correct: false },
        { text: "About 48 psi", correct: false }
      ],
      explanation: "P/T = constant for fixed volume and amount of gas. Converting to Kelvin: P2 = P1(T2/T1) = 32(323/293) = 35.3 psi. The 10% temperature increase (in Kelvin) causes a 10% pressure increase."
    },
    {
      scenario: "In the Maxwell-Boltzmann distribution, there's a peak (most probable) speed, an average speed, and an RMS speed.",
      question: "What is the correct ordering of these speeds from lowest to highest?",
      options: [
        { text: "Most probable < average < RMS", correct: true },
        { text: "RMS < average < most probable", correct: false },
        { text: "Average < most probable < RMS", correct: false },
        { text: "They're all equal", correct: false }
      ],
      explanation: "The Maxwell-Boltzmann distribution is asymmetric, with a long high-speed tail. This skews the average above the peak, and since RMS weights higher speeds more (due to squaring), RMS > average > most probable."
    },
    {
      scenario: "A container has a mixture of gases in thermal equilibrium: nitrogen (N2), oxygen (O2), and carbon dioxide (CO2).",
      question: "Which statement about their average kinetic energies is true?",
      options: [
        { text: "All molecules have the same average KE", correct: true },
        { text: "CO2 has the highest KE (largest molecule)", correct: false },
        { text: "N2 has the highest KE (moves fastest)", correct: false },
        { text: "O2 has the highest KE (most reactive)", correct: false }
      ],
      explanation: "Average kinetic energy depends ONLY on temperature: KE_avg = (3/2)kT. At thermal equilibrium, all species have the same temperature and therefore the same average KE, regardless of mass. Lighter molecules achieve this KE by moving faster."
    },
    {
      scenario: "At absolute zero (0 K), according to classical kinetic theory, molecules would have zero kinetic energy.",
      question: "Why is absolute zero impossible to reach in practice?",
      options: [
        { text: "Removing the last bit of energy requires infinite work (3rd law of thermodynamics)", correct: true },
        { text: "Molecules are always vibrating due to chemical bonds", correct: false },
        { text: "The container walls always transfer some heat", correct: false },
        { text: "Gravity prevents molecules from stopping completely", correct: false }
      ],
      explanation: "The third law of thermodynamics states that absolute zero cannot be reached in a finite number of steps. As T approaches 0, extracting each remaining joule of heat requires exponentially more work. Quantum mechanics also requires zero-point energy."
    },
    {
      scenario: "A scuba diver's tank contains air at 200 atm and 20C. After rapid decompression to 1 atm, the air cools significantly.",
      question: "Why does rapid expansion cause cooling?",
      options: [
        { text: "Gas does work pushing against surrounding air, losing internal energy", correct: true },
        { text: "Lower pressure means lower temperature (direct relationship)", correct: false },
        { text: "The molecules slow down due to friction with the tank walls", correct: false },
        { text: "Heat is absorbed by the tank material", correct: false }
      ],
      explanation: "When gas expands against external pressure, it does work (W = P*deltaV). This work comes from the gas's internal (kinetic) energy. Since temperature is proportional to average KE, losing energy means cooling. This is adiabatic expansion."
    },
    {
      scenario: "Graham's Law states that the rate of gas effusion (leaking through a tiny hole) is inversely proportional to sqrt(molecular mass).",
      question: "This is a direct consequence of which kinetic theory principle?",
      options: [
        { text: "Lighter molecules have higher average speeds at the same temperature", correct: true },
        { text: "Lighter molecules have more kinetic energy", correct: false },
        { text: "Smaller molecules fit through holes more easily", correct: false },
        { text: "Lighter molecules have fewer collisions", correct: false }
      ],
      explanation: "Effusion rate depends on molecular speed (how often molecules hit the hole) and mass (momentum transfer). Since v_rms is proportional to 1/sqrt(m), lighter gases effuse faster. This is used in uranium enrichment to separate U-235 from U-238."
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
      icon: "🚀",
      title: "Aerospace Engineering",
      short: "Rocket propulsion & high-altitude flight",
      tagline: "Where molecular speeds become rocket speeds",
      description: "Kinetic theory underlies rocket propulsion, atmospheric reentry heating, and spacecraft thermal control. Understanding molecular behavior at extreme temperatures is essential for space exploration.",
      connection: "Rocket exhaust velocity depends directly on exhaust gas temperature and molecular mass - lighter, hotter gases produce faster exhaust and more thrust.",
      howItWorks: [
        "Rocket nozzles convert thermal energy (random molecular motion) into directed kinetic energy (thrust)",
        "Reentry vehicles experience intense heating as kinetic energy converts to thermal energy via molecular collisions",
        "Spacecraft use gas kinetics to design thermal protection systems and life support",
        "Ion thrusters accelerate individual molecules to extreme speeds for efficient propulsion"
      ],
      stats: [
        "Rocket exhaust reaches 3000C (v_rms ~ 3000 m/s)",
        "Reentry heating can exceed 10,000C at shock front",
        "ISS thermal control manages +/-150C temperature swings",
        "Ion thrusters achieve exhaust velocities of 30,000 m/s"
      ],
      examples: [
        "SpaceX Raptor engines optimize combustion temperature for thrust",
        "Space Shuttle tiles survived 1650C reentry temperatures",
        "James Webb Telescope maintains 7 K for infrared sensors",
        "NEXT ion thruster tested for 50,000+ hours"
      ],
      companies: ["SpaceX", "NASA", "Blue Origin", "Rocket Lab", "Northrop Grumman"],
      futureImpact: "Advanced propulsion systems using nuclear thermal rockets (heating hydrogen to 2500C) could halve Mars transit times, while understanding kinetic theory enables designs for Venus and Jupiter atmospheric probes.",
      color: "#f97316"
    },
    {
      icon: "💨",
      title: "HVAC & Refrigeration",
      short: "Climate control systems",
      tagline: "Molecular motion management for human comfort",
      description: "Heating, ventilation, and air conditioning systems rely on kinetic theory to transfer heat efficiently. Understanding gas behavior under compression, expansion, and phase changes is fundamental to climate control.",
      connection: "The relationship PV = NkT governs every stage of refrigeration cycles - compression heats gas, expansion cools it, enabling heat pumps that move thermal energy against natural flow.",
      howItWorks: [
        "Compressors increase gas density and temperature through molecular collisions",
        "Expansion valves cause rapid cooling as gas molecules do work expanding",
        "Heat exchangers transfer energy via molecular collisions between fluids and surfaces",
        "Airflow design uses kinetic theory to optimize molecular heat transport"
      ],
      stats: [
        "HVAC industry: $240 billion global market",
        "Air conditioning uses 6% of US electricity",
        "Modern heat pumps achieve 300-400% efficiency (COP 3-4)",
        "Data centers require precise molecular-level thermal management"
      ],
      examples: [
        "Geothermal heat pumps use ground temperature stability",
        "CO2 refrigeration systems (lower molecular mass = efficiency)",
        "Hospital HVAC maintains strict temperature/humidity control",
        "Electric vehicle thermal management for battery optimization"
      ],
      companies: ["Carrier", "Trane", "Daikin", "Johnson Controls", "Honeywell"],
      futureImpact: "Magnetocaloric and electrocaloric cooling technologies could replace compression-based systems, using molecular spin alignment instead of gas compression for more efficient, refrigerant-free climate control.",
      color: "#0ea5e9"
    },
    {
      icon: "⚗️",
      title: "Chemical Engineering",
      short: "Industrial reactions & separations",
      tagline: "Controlling trillions of molecular collisions",
      description: "Chemical reactors depend on kinetic theory to predict reaction rates, design separation processes, and optimize industrial chemistry. Collision frequency and energy distribution determine product yield.",
      connection: "Reaction rates depend on molecular collision frequency (proportional to pressure) and the fraction of collisions with sufficient energy (proportional to e^(-Ea/kT)). Kinetic theory quantifies both.",
      howItWorks: [
        "Higher temperature increases collision frequency and energy, accelerating reactions",
        "Catalysts lower activation energy barriers without changing molecular speeds",
        "Distillation separates mixtures using different molecular volatilities (related to mass and intermolecular forces)",
        "Membrane separations exploit Graham's Law for gas mixture purification"
      ],
      stats: [
        "Haber process for ammonia: 450C, 200 atm optimizes kinetics vs equilibrium",
        "Petroleum refining: $4 trillion industry based on molecular separations",
        "10C temperature increase roughly doubles reaction rates",
        "Membrane gas separation: $3 billion market"
      ],
      examples: [
        "Ammonia synthesis reactors operate at extreme conditions",
        "Hydrogen purification uses molecular size differences",
        "Pharmaceutical crystallization controls molecular assembly",
        "Natural gas processing separates methane from heavier hydrocarbons"
      ],
      companies: ["BASF", "Dow Chemical", "Air Liquide", "Linde", "ExxonMobil"],
      futureImpact: "Understanding kinetic theory at the nanoscale enables designer catalysts, artificial photosynthesis, and direct air capture of CO2 - potentially reversing climate change through controlled molecular reactions.",
      color: "#8b5cf6"
    },
    {
      icon: "🔬",
      title: "Vacuum Technology",
      short: "Ultra-high vacuum systems",
      tagline: "The art of removing molecules",
      description: "From semiconductor fabrication to particle accelerators, vacuum technology requires deep understanding of gas kinetics. Mean free path, outgassing rates, and molecular flow regimes determine system performance.",
      connection: "Mean free path (average distance between collisions) increases as pressure decreases. At ultra-high vacuum, molecules travel meters between collisions, enabling atomic-scale precision manufacturing.",
      howItWorks: [
        "Vacuum pumps remove molecules through various mechanisms (mechanical, diffusion, cryo-trapping)",
        "Outgassing from surfaces releases trapped molecules, limiting ultimate vacuum",
        "Molecular flow regime: molecules interact with walls more than each other",
        "Residual gas analyzers identify molecular species by mass"
      ],
      stats: [
        "Semiconductor fabs operate at 10^-6 to 10^-9 torr",
        "LIGO gravitational wave detectors: 10^-9 torr",
        "LHC beam pipe: 10^-10 torr (better than Moon's surface)",
        "Mean free path at 10^-6 torr: ~100 meters"
      ],
      examples: [
        "Chip manufacturing requires molecular-level contamination control",
        "Electron microscopes need vacuum to prevent molecular scattering",
        "Thermal evaporation coatings require long mean free paths",
        "Space simulation chambers test satellite components"
      ],
      companies: ["Applied Materials", "ASML", "Edwards Vacuum", "Pfeiffer Vacuum", "Leybold"],
      futureImpact: "Extreme vacuum technology enables next-generation quantum computers (eliminating molecular interference), gravitational wave astronomy, and atomic-precision manufacturing for revolutionary materials.",
      color: "#06b6d4"
    }
  ];

  // Render phase content
  const renderPhase = () => {
    switch(phase) {
      case 'hook': // Hook/Introduction
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] py-8">
            {/* Premium badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-orange-400/80 text-sm font-medium tracking-wide uppercase">Thermal Physics</span>
            </div>

            {/* Gradient title */}
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
              The Invisible Storm
            </h1>

            {/* Subtitle */}
            <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
              Temperature IS molecular motion
            </p>

            {/* Premium card */}
            <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              {/* Animated molecular motion preview */}
              <div className="relative h-48 bg-gray-900/50 rounded-xl overflow-hidden mb-4">
                <svg className="w-full h-full">
                  {/* Animated molecules */}
                  {[...Array(30)].map((_, i) => {
                    const duration = 2 + Math.random() * 2;
                    const delay = Math.random() * 2;
                    const startX = 50 + Math.random() * 300;
                    const startY = 20 + Math.random() * 150;
                    return (
                      <g key={i}>
                        <circle
                          cx={startX}
                          cy={startY}
                          r={4}
                          fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)]}
                          opacity={0.8}
                        >
                          <animate
                            attributeName="cx"
                            values={`${startX};${50 + Math.random() * 300};${50 + Math.random() * 300}`}
                            dur={`${duration}s`}
                            begin={`${delay}s`}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="cy"
                            values={`${startY};${20 + Math.random() * 150};${20 + Math.random() * 150}`}
                            dur={`${duration}s`}
                            begin={`${delay}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                  <p className="text-sm text-gray-400">Air molecules at room temperature</p>
                </div>
              </div>

              <p className="text-gray-300 text-center leading-relaxed">
                Right now, air molecules are bombarding your skin at <span className="text-orange-400 font-bold">500 meters per second</span> -
                faster than a bullet! Yet you feel nothing but gentle air pressure.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleNext}
              style={{ zIndex: 10 }}
              className="group px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center gap-2"
            >
              Start Exploration
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {/* Hint text */}
            <p className="text-slate-500 text-sm mt-6">
              Discover why temperature is the furious dance of countless particles
            </p>
          </div>
        );

      case 'predict': // Prediction
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-blue-400">Make Your Prediction</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <p className="mb-4">
                You have a sealed container of gas. If you <span className="text-orange-400 font-bold">double the temperature</span> (in Kelvin),
                how will the <span className="text-blue-400 font-bold">average molecular speed</span> change?
              </p>

              {/* Visualization */}
              <div className="relative h-40 bg-gray-900/50 rounded-lg mb-4">
                <svg className="w-full h-full" viewBox="0 0 400 160">
                  {/* Before container */}
                  <rect x="30" y="30" width="140" height="100" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2"/>
                  <text x="100" y="20" textAnchor="middle" fill="#9ca3af" fontSize="12">T = 300 K</text>
                  {[...Array(15)].map((_, i) => (
                    <circle key={i} cx={50 + (i % 5) * 25} cy={50 + Math.floor(i / 5) * 25} r="4" fill="#3b82f6" opacity="0.8">
                      <animate attributeName="cx" values={`${50 + (i % 5) * 25};${55 + (i % 5) * 25};${50 + (i % 5) * 25}`} dur="0.5s" repeatCount="indefinite"/>
                    </circle>
                  ))}

                  {/* Arrow */}
                  <path d="M190 80 L210 80" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrowhead)"/>
                  <text x="200" y="70" textAnchor="middle" fill="#f59e0b" fontSize="12">2x Temp</text>
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b"/>
                    </marker>
                  </defs>

                  {/* After container */}
                  <rect x="230" y="30" width="140" height="100" rx="8" fill="none" stroke="#ef4444" strokeWidth="2"/>
                  <text x="300" y="20" textAnchor="middle" fill="#9ca3af" fontSize="12">T = 600 K</text>
                  <text x="300" y="85" textAnchor="middle" fill="#9ca3af" fontSize="24">?</text>
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'double', text: 'Speed doubles (2x)', color: 'blue' },
                { id: 'root2', text: 'Speed increases by sqrt(2) = 1.41x', color: 'green' },
                { id: 'quadruple', text: 'Speed quadruples (4x)', color: 'orange' },
                { id: 'same', text: 'Speed stays the same', color: 'purple' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => makePrediction(option.id)}
                  disabled={userPrediction !== null}
                  style={{ zIndex: 10 }}
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
              <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                <p className="text-gray-300">
                  Prediction recorded! Let's run the simulation to find out...
                </p>
              </div>
            )}
          </div>
        );

      case 'play': // Observation/Experiment
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400">Observe: Molecular Motion</h2>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-gray-400 mb-1">
                    Temperature: {temperature} K
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="600"
                    value={temperature}
                    onChange={(e) => {
                      setTemperature(Number(e.target.value));
                      logEvent('temperature_changed', { temperature: Number(e.target.value) });
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-gray-400 mb-1">
                    Volume: {volume} units
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      logEvent('volume_changed', { volume: Number(e.target.value) });
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Simulation container */}
              <div
                className="relative bg-gray-900 rounded-lg overflow-hidden mx-auto"
                style={{ width: Math.min(volume * 3, 450), height: Math.min(volume * 3, 450) }}
              >
                <svg width="100%" height="100%">
                  {/* Container walls */}
                  <rect
                    x="0" y="0"
                    width={volume * 3}
                    height={volume * 3}
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth="2"
                  />

                  {/* Molecules */}
                  {molecules.map(mol => (
                    <circle
                      key={mol.id}
                      cx={mol.x}
                      cy={mol.y}
                      r={mol.radius}
                      fill={mol.color}
                      opacity={0.9}
                    />
                  ))}
                </svg>

                {/* Speed legend */}
                <div className="absolute top-2 right-2 bg-gray-800/80 rounded p-2 text-xs">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Slow</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Medium</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Fast</div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Very Fast</div>
                </div>
              </div>

              {/* Stats panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">RMS Speed</p>
                  <p className="text-lg font-bold text-orange-400">
                    {calculateRmsSpeed(temperature).toFixed(0)} m/s
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Wall Collisions</p>
                  <p className="text-lg font-bold text-blue-400">{wallCollisions}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Pressure (rel.)</p>
                  <p className="text-lg font-bold text-green-400">{pressure.toFixed(1)}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Avg KE</p>
                  <p className="text-lg font-bold text-purple-400">
                    {(calculateAvgKE(temperature) * 1e21).toFixed(2)}x10^-21 J
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDistribution(!showDistribution)}
              style={{ zIndex: 10 }}
              className="w-full p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30"
            >
              {showDistribution ? 'Hide' : 'Show'} Maxwell-Boltzmann Distribution
            </button>

            {showDistribution && (
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="text-lg font-medium text-purple-400 mb-3">Speed Distribution</h3>
                <svg viewBox="0 0 400 200" className="w-full h-48">
                  {/* Axes */}
                  <line x1="50" y1="170" x2="380" y2="170" stroke="#4b5563" strokeWidth="2"/>
                  <line x1="50" y1="170" x2="50" y2="20" stroke="#4b5563" strokeWidth="2"/>
                  <text x="215" y="195" textAnchor="middle" fill="#9ca3af" fontSize="12">Speed (m/s)</text>
                  <text x="25" y="95" textAnchor="middle" fill="#9ca3af" fontSize="12" transform="rotate(-90, 25, 95)">Probability</text>

                  {/* Maxwell-Boltzmann curve */}
                  <path
                    d={(() => {
                      const points: string[] = [];
                      const v_rms = calculateRmsSpeed(temperature);
                      const v_max = v_rms * 2;
                      for (let i = 0; i <= 100; i++) {
                        const v = (i / 100) * v_max;
                        const x = 50 + (v / v_max) * 330;
                        // Simplified Maxwell-Boltzmann shape
                        const f = Math.pow(v / v_rms, 2) * Math.exp(-1.5 * Math.pow(v / v_rms, 2));
                        const y = 170 - f * 200;
                        points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
                      }
                      return points.join(' ');
                    })()}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                  />

                  {/* Markers */}
                  <line x1={50 + 165} y1="170" x2={50 + 165} y2="30" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4"/>
                  <text x={50 + 165} y="15" textAnchor="middle" fill="#f59e0b" fontSize="10">v_rms</text>
                </svg>
                <p className="text-sm text-gray-400 mt-2">
                  The Maxwell-Boltzmann distribution shows that molecules have a range of speeds.
                  Most are near the peak, but some are much faster or slower.
                </p>
              </div>
            )}

            {userPrediction && (
              <div className={`p-4 rounded-lg ${
                userPrediction === 'root2' ? 'bg-green-500/20 border border-green-500/30' : 'bg-orange-500/20 border border-orange-500/30'
              }`}>
                <p className="font-medium">
                  {userPrediction === 'root2'
                    ? 'Correct! Speed scales with sqrt(T), not T directly.'
                    : `Your prediction: ${userPrediction}. Let's see why the answer is sqrt(2)x...`
                  }
                </p>
              </div>
            )}
          </div>
        );

      case 'review': // Explanation
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-yellow-400">The Physics Revealed</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-orange-400 mb-4">The Kinetic Theory Equations</h3>

              <div className="space-y-6">
                {/* Equation 1: Ideal Gas Law */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center text-2xl font-mono text-blue-400 mb-2">
                    PV = NkT
                  </div>
                  <p className="text-sm text-gray-300">
                    <span className="text-blue-400">Pressure x Volume</span> =
                    <span className="text-green-400"> Number of molecules</span> x
                    <span className="text-purple-400"> Boltzmann constant</span> x
                    <span className="text-orange-400"> Temperature</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Pressure comes from molecular collisions with walls. More molecules, higher temperature, or smaller volume means more/harder collisions = higher pressure.
                  </p>
                </div>

                {/* Equation 2: RMS Speed */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center text-2xl font-mono text-green-400 mb-2">
                    v_rms = sqrt(3kT/m)
                  </div>
                  <p className="text-sm text-gray-300">
                    Speed depends on <span className="text-orange-400">temperature</span> and
                    <span className="text-blue-400"> molecular mass</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    <strong>This is why doubling T gives sqrt(2)x speed!</strong> Since v is proportional to sqrt(T),
                    when T goes to 2T, v goes to sqrt(2) x v = 1.41x v
                  </p>
                </div>

                {/* Equation 3: Average KE */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-center text-2xl font-mono text-purple-400 mb-2">
                    KE_avg = (3/2)kT
                  </div>
                  <p className="text-sm text-gray-300">
                    Average kinetic energy depends <span className="text-yellow-400">ONLY on temperature</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    All gas molecules at the same temperature have the same average KE, regardless of mass!
                    Lighter molecules achieve this energy by moving faster.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
              <h4 className="text-orange-400 font-bold mb-2">The Deep Insight</h4>
              <p className="text-gray-300">
                Temperature isn't just correlated with molecular motion - <strong>it IS molecular motion</strong>.
                When you measure temperature, you're measuring the average kinetic energy of countless colliding particles.
                Heat flow is just the transfer of this kinetic energy from faster-vibrating molecules to slower ones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Why sqrt(T) for speed?</h4>
                <p className="text-sm text-gray-300">
                  KE = (1/2)mv^2. If KE is proportional to T and m is constant, then v^2 is proportional to T, so v is proportional to sqrt(T).
                  Doubling temperature doubles kinetic energy but only increases speed by sqrt(2).
                </p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-medium mb-2">Why 1/sqrt(m) for speed?</h4>
                <p className="text-sm text-gray-300">
                  At the same temperature, light and heavy molecules have the same average KE.
                  Since KE = (1/2)mv^2, lighter molecules must move faster: v is proportional to 1/sqrt(m).
                </p>
              </div>
            </div>
          </div>
        );

      case 'twist_predict': // Interactive Exploration
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Explore: Gas Properties</h2>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Temperature: {temperature} K
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="800"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Volume: {volume} units
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Particles: {particleCount}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Simulation */}
              <div
                className="relative bg-gray-900 rounded-lg overflow-hidden mx-auto"
                style={{
                  width: Math.min(volume * 3, isMobile ? 280 : 400),
                  height: Math.min(volume * 3, isMobile ? 280 : 400)
                }}
              >
                <svg width="100%" height="100%">
                  <rect
                    x="0" y="0"
                    width={volume * 3}
                    height={volume * 3}
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth="2"
                  />
                  {molecules.map(mol => (
                    <circle
                      key={mol.id}
                      cx={mol.x}
                      cy={mol.y}
                      r={mol.radius}
                      fill={mol.color}
                      opacity={0.9}
                    />
                  ))}
                </svg>
              </div>

              {/* Live calculations */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">v_rms</p>
                  <p className="text-lg font-bold text-orange-400">
                    {calculateRmsSpeed(temperature).toFixed(0)} m/s
                  </p>
                  <p className="text-xs text-gray-500">sqrt(3kT/m)</p>
                </div>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Pressure</p>
                  <p className="text-lg font-bold text-blue-400">
                    {((particleCount * temperature) / volume).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">NkT/V</p>
                </div>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Avg KE</p>
                  <p className="text-lg font-bold text-green-400">
                    {(calculateAvgKE(temperature) * 1e21).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">x10^-21 J</p>
                </div>
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Density</p>
                  <p className="text-lg font-bold text-purple-400">
                    {(particleCount / volume).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">N/V</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-400 mb-3">Try These Experiments:</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• <strong>Isothermal compression:</strong> Decrease volume at constant T. Watch pressure increase!</p>
                <p>• <strong>Isobaric heating:</strong> To keep pressure constant while heating, you must increase volume.</p>
                <p>• <strong>Adding molecules:</strong> More particles = more collisions = higher pressure.</p>
                <p>• <strong>Speed colors:</strong> Higher temperatures shift colors toward red (faster molecules).</p>
              </div>
            </div>
          </div>
        );

      case 'twist_play': // Advanced Exploration
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-purple-400">Advanced: Molecular Distributions</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-medium text-blue-400 mb-4">Maxwell-Boltzmann Distribution</h3>

              <svg viewBox="0 0 500 250" className="w-full h-64">
                {/* Background */}
                <rect x="0" y="0" width="500" height="250" fill="#111827"/>

                {/* Grid */}
                {[...Array(5)].map((_, i) => (
                  <g key={i}>
                    <line x1="60" y1={50 + i * 40} x2="480" y2={50 + i * 40} stroke="#1f2937" strokeWidth="1"/>
                    <line x1={60 + i * 105} y1="30" x2={60 + i * 105} y2="210" stroke="#1f2937" strokeWidth="1"/>
                  </g>
                ))}

                {/* Axes */}
                <line x1="60" y1="210" x2="480" y2="210" stroke="#6b7280" strokeWidth="2"/>
                <line x1="60" y1="210" x2="60" y2="30" stroke="#6b7280" strokeWidth="2"/>

                {/* Labels */}
                <text x="270" y="240" textAnchor="middle" fill="#9ca3af" fontSize="14">Molecular Speed (m/s)</text>
                <text x="25" y="120" textAnchor="middle" fill="#9ca3af" fontSize="14" transform="rotate(-90, 25, 120)">Probability</text>

                {/* Temperature curves */}
                {[200, 400, 600].map((temp, idx) => {
                  const colors = ['#3b82f6', '#22c55e', '#ef4444'];
                  const v_rms = calculateRmsSpeed(temp);
                  const v_max = v_rms * 2.5;

                  let path = '';
                  for (let i = 0; i <= 100; i++) {
                    const v = (i / 100) * v_max;
                    const x = 60 + (v / 1500) * 420;
                    const f = Math.pow(v / v_rms, 2) * Math.exp(-1.5 * Math.pow(v / v_rms, 2));
                    const y = 210 - f * 250;
                    path += `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(30, y)}`;
                  }

                  return (
                    <g key={temp}>
                      <path d={path} fill="none" stroke={colors[idx]} strokeWidth="3"/>
                      <text x="400" y={60 + idx * 25} fill={colors[idx]} fontSize="12">
                        {temp} K
                      </text>
                    </g>
                  );
                })}

                {/* Speed axis labels */}
                {[0, 500, 1000, 1500].map((v, i) => (
                  <text key={i} x={60 + (v / 1500) * 420} y="225" textAnchor="middle" fill="#6b7280" fontSize="10">
                    {v}
                  </text>
                ))}
              </svg>

              <div className="mt-4 text-sm text-gray-400">
                <p>Higher temperatures shift the distribution to the right (faster speeds) and flatten the peak (wider range of speeds).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Speed Markers</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <strong>Most probable:</strong> v_p = sqrt(2kT/m)</li>
                  <li>• <strong>Average:</strong> v_avg = sqrt(8kT/pi*m)</li>
                  <li>• <strong>RMS:</strong> v_rms = sqrt(3kT/m)</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">
                  Ratio: v_p : v_avg : v_rms = 1 : 1.13 : 1.22
                </p>
              </div>

              <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                <h4 className="text-orange-400 font-medium mb-2">Escape Velocity</h4>
                <p className="text-sm text-gray-300">
                  Earth's escape velocity: 11.2 km/s
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  At 300 K: H2 v_rms = 1.9 km/s, N2 v_rms = 0.5 km/s
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  The high-speed tail of the Maxwell-Boltzmann distribution means some H2 molecules exceed escape velocity - this is why Earth has lost most of its hydrogen!
                </p>
              </div>
            </div>

            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-medium mb-2">Mean Free Path</h4>
              <p className="text-sm text-gray-300">
                The average distance a molecule travels between collisions:
              </p>
              <div className="text-center font-mono text-lg text-green-400 my-2">
                lambda = 1/(sqrt(2) * n * sigma)
              </div>
              <p className="text-sm text-gray-400">
                At sea level: lambda = 70 nm (molecules collide every 70 nanometers)
                <br/>
                At 100 km altitude: lambda = 1 m (molecules travel meters between collisions)
              </p>
            </div>
          </div>
        );

      case 'twist_review': // Quiz phases combined
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
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                    style={{ zIndex: 10 }}
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
                onClick={nextQuestion}
                style={{ zIndex: 10 }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'Continue to Applications'}
              </button>
            )}
          </div>
        );

      case 'transfer': // Applications
        const currentApp = applications[currentAppIndex];

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-purple-400">Real-World Applications</h2>

            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400">
                Application {currentAppIndex + 1} of {applications.length}
              </span>
              <div className="flex gap-2">
                {applications.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${idx === currentAppIndex ? 'bg-purple-500' : 'bg-gray-600'}`}
                  />
                ))}
              </div>
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
                  <h3 className="text-xl font-bold" style={{ color: currentApp.color }}>
                    {currentApp.title}
                  </h3>
                  <p className="text-sm text-gray-400 italic">{currentApp.tagline}</p>
                </div>
              </div>

              <p className="text-gray-300 mb-4">{currentApp.description}</p>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-orange-400 mb-2">Physics Connection:</h4>
                <p className="text-sm text-gray-300">{currentApp.connection}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">How It Works:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {currentApp.howItWorks.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-2">Key Stats:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {currentApp.stats.map((stat, i) => (
                      <li key={i}>• {stat}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-purple-400 mb-2">Examples:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {currentApp.examples.map((ex, i) => (
                      <li key={i}>• {ex}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-cyan-400 mb-2">Industry Leaders:</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentApp.companies.map((company, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-400 mb-2">Future Impact:</h4>
                <p className="text-sm text-gray-300">{currentApp.futureImpact}</p>
              </div>
            </div>

            {currentAppIndex < applications.length - 1 ? (
              <button
                onClick={() => {
                  setCurrentAppIndex(currentAppIndex + 1);
                  logEvent('application_viewed', { app: applications[currentAppIndex + 1].title });
                  playSound('click');
                }}
                style={{ zIndex: 10 }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Next Application
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleNext}
                style={{ zIndex: 10 }}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-lg font-medium transition-colors"
              >
                Continue to Test
              </button>
            )}
          </div>
        );

      case 'test': // Test phase - additional quiz questions
        const testQuestion = testQuestions[currentQuestion];

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-green-400">Final Test</h2>
              <div className="text-sm text-gray-400">
                Question {currentQuestion + 1} of {testQuestions.length} | Score: {score}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-blue-300 text-sm font-medium mb-1">Scenario:</p>
                <p className="text-gray-200">{testQuestion.scenario}</p>
              </div>

              <h3 className="text-lg font-medium text-white mb-4">{testQuestion.question}</h3>

              <div className="space-y-3">
                {testQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                    style={{ zIndex: 10 }}
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
                  <p className="text-gray-300">{testQuestion.explanation}</p>
                </div>
              )}
            </div>

            {showExplanation && (
              <button
                onClick={nextQuestion}
                style={{ zIndex: 10 }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'View Results'}
              </button>
            )}
          </div>
        );

      case 'mastery': // Summary
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-yellow-400">Mastery Complete!</h2>

            <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl p-6 border border-orange-500/30">
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🌡️</div>
                <h3 className="text-2xl font-bold text-orange-400">Kinetic Theory of Gases</h3>
                <p className="text-gray-400">Temperature is molecular motion</p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-medium text-white mb-2">Your Score</h4>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-green-400">{score}/{testQuestions.length}</div>
                  <div className="text-gray-400">
                    {score === testQuestions.length ? 'Perfect! You\'ve mastered the molecular world!' :
                     score >= 8 ? 'Excellent understanding of kinetic theory!' :
                     score >= 6 ? 'Good grasp of the fundamentals!' :
                     'Keep exploring the physics of molecular motion!'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white">Key Equations Mastered:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-mono text-blue-400">PV = NkT</div>
                    <p className="text-xs text-gray-400 mt-1">Ideal Gas Law</p>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-mono text-green-400">v = sqrt(3kT/m)</div>
                    <p className="text-xs text-gray-400 mt-1">RMS Speed</p>
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 text-center">
                    <div className="text-lg font-mono text-purple-400">KE = (3/2)kT</div>
                    <p className="text-xs text-gray-400 mt-1">Average KE</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <h4 className="text-orange-400 font-bold mb-2">The Big Picture:</h4>
                <p className="text-gray-300">
                  You now understand that temperature isn't some mysterious property - it's simply the average
                  kinetic energy of molecular motion. Every gas law, every phase change, every chemical reaction
                  emerges from the chaotic dance of countless molecules. This microscopic perspective explains
                  macroscopic phenomena - from weather patterns to rocket propulsion.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentPhaseIndex = getPhaseIndex(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-4 md:p-8 relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Premium progress bar */}
        <div className="mb-6 backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex justify-between text-sm text-gray-400 mb-3">
            <span className="font-medium">Kinetic Theory of Gases</span>
            <span>Phase {currentPhaseIndex + 1} of {phaseOrder.length}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%` }}
            />
          </div>
          {/* Phase dots */}
          <div className="flex justify-between mt-3 px-1">
            {phaseOrder.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= currentPhaseIndex
                    ? 'bg-orange-500'
                    : 'bg-gray-700'
                } ${i === currentPhaseIndex ? 'w-6' : 'w-2'}`}
              />
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-xl border border-white/5">
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
                ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-white border border-white/10'
            }`}
          >
            Back
          </button>

          {phase !== 'mastery' && phase !== 'hook' && !(['twist_review', 'test'].includes(phase) && !showExplanation) && phase !== 'transfer' && (
            <button
              onClick={handleNext}
              disabled={phase === 'predict' && !userPrediction}
              style={{ zIndex: 10 }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                (phase === 'predict' && !userPrediction)
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-500/25'
              }`}
            >
              {phase === 'predict' ? 'Run Experiment' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
