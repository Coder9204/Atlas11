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

  // Real-world applications for transfer phase
  const realWorldApps: TransferApp[] = [
    {
      icon: "🔧",
      title: "Vacuum Technology",
      short: "Industrial vacuum systems",
      tagline: "Mastering the absence of molecules for precision manufacturing",
      description: "Industrial vacuum technology is essential for countless manufacturing processes, from food packaging to metallurgy. By removing gas molecules from enclosed spaces, vacuum systems enable processes that would be impossible at atmospheric pressure, including freeze-drying, degassing of molten metals, and thin-film deposition for optical coatings.",
      connection: "Kinetic theory explains why vacuum pumping is progressively harder at lower pressures - as molecular density decreases, molecules collide less frequently, transitioning from viscous flow (molecule-molecule collisions dominate) to molecular flow (wall collisions dominate). Mean free path increases from nanometers at atmosphere to kilometers at ultra-high vacuum.",
      howItWorks: [
        "Rotary vane pumps trap and compress gas volumes mechanically, effective down to 10^-3 torr",
        "Turbomolecular pumps impart momentum to molecules via high-speed rotating blades (up to 90,000 RPM)",
        "Diffusion pumps use high-velocity oil vapor jets to entrain and direct gas molecules",
        "Cryopumps freeze molecules onto cold surfaces, achieving ultra-high vacuum below 10^-10 torr"
      ],
      stats: [
        "Global vacuum equipment market: $8.5 billion annually",
        "Semiconductor fabs require 10^-9 torr for EUV lithography",
        "Food vacuum packaging extends shelf life 3-5x"
      ],
      examples: [
        "Vacuum metallurgy produces aerospace-grade titanium and superalloys",
        "Pharmaceutical freeze-drying preserves vaccines and biologics",
        "Vacuum insulation panels achieve R-values 5-10x better than foam",
        "Vacuum arc remelting purifies specialty steels for critical applications"
      ],
      companies: ["Edwards Vacuum", "Pfeiffer Vacuum", "Leybold", "Busch Vacuum", "Atlas Copco"],
      futureImpact: "Advanced vacuum systems will enable molecular beam epitaxy for quantum dot displays, large-scale quantum computer manufacturing, and industrial-scale graphene production - transforming materials science and electronics.",
      color: "#0891b2"
    },
    {
      icon: "⚗️",
      title: "Mass Spectrometry",
      short: "Analytical chemistry instrumentation",
      tagline: "Sorting molecules by mass at molecular speeds",
      description: "Mass spectrometry is the gold standard for molecular identification in chemistry, biology, and medicine. By ionizing molecules and measuring their mass-to-charge ratios, this technique can identify thousands of compounds in a single sample, from drug metabolites in blood to pollutants in water to proteins in cells.",
      connection: "Kinetic theory directly governs ion behavior in mass spectrometers. The kinetic energy of ions (½mv²) is fixed by the acceleration voltage, so velocity varies inversely with the square root of mass - exactly as predicted by v_rms = sqrt(3kT/m). Lighter ions move faster and can be separated from heavier ones.",
      howItWorks: [
        "Ionization sources convert neutral molecules to charged ions using electron impact, electrospray, or MALDI",
        "Accelerating fields give all ions the same kinetic energy, creating mass-dependent velocities",
        "Quadrupole analyzers use oscillating electric fields to filter ions by mass-to-charge ratio",
        "Time-of-flight analyzers measure how long ions take to traverse a fixed distance"
      ],
      stats: [
        "Mass accuracy: parts per million (0.0001% error)",
        "Detection sensitivity: attomoles (10^-18 moles)",
        "Global mass spectrometry market: $7.2 billion"
      ],
      examples: [
        "Clinical drug testing identifies hundreds of substances simultaneously",
        "Proteomics studies analyze thousands of proteins in single experiments",
        "Environmental monitoring detects trace contaminants at parts-per-trillion",
        "Forensic toxicology provides definitive identification in legal cases"
      ],
      companies: ["Thermo Fisher Scientific", "Agilent Technologies", "Waters Corporation", "SCIEX", "Bruker"],
      futureImpact: "Portable mass spectrometers will enable point-of-care disease diagnosis, real-time environmental monitoring, and instant food safety testing - bringing laboratory-grade molecular analysis to everyday applications.",
      color: "#7c3aed"
    },
    {
      icon: "💾",
      title: "Semiconductor Processing",
      short: "Chip manufacturing technology",
      tagline: "Building atom by atom at the nanoscale",
      description: "Modern semiconductor fabrication depends critically on understanding gas behavior at the molecular level. Every transistor in your phone or computer was built using processes that precisely control how gas molecules interact with silicon surfaces - from depositing atomic layers to etching nanometer-scale features.",
      connection: "Kinetic theory explains the physics of chemical vapor deposition (CVD) and plasma etching. Deposition rates depend on molecular flux to the surface (proportional to pressure and inversely proportional to sqrt(mass*T)), while etch profiles depend on mean free path, which determines whether ions travel straight (anisotropic) or scatter (isotropic).",
      howItWorks: [
        "CVD processes flow precursor gases that decompose on heated wafer surfaces, depositing thin films",
        "Plasma etching ionizes reactive gases, accelerating ions to bombard and remove material directionally",
        "Atomic layer deposition (ALD) uses self-limiting reactions for angstrom-level thickness control",
        "Ion implantation accelerates dopant atoms to precise energies for controlled penetration depth"
      ],
      stats: [
        "Modern chips have 100+ billion transistors at 3nm nodes",
        "Gate oxide thickness: 1-2 nanometers (5-10 atoms)",
        "Semiconductor equipment market: $100+ billion annually"
      ],
      examples: [
        "EUV lithography requires ultra-high vacuum for photon transmission",
        "High-k dielectric deposition uses ALD for atomic precision",
        "Plasma etch creates vertical sidewalls for FinFET transistors",
        "Epitaxial growth builds crystalline silicon layers atom by atom"
      ],
      companies: ["ASML", "Applied Materials", "Lam Research", "Tokyo Electron", "KLA Corporation"],
      futureImpact: "Continued scaling to sub-nanometer dimensions will require unprecedented control of molecular processes, enabling chips with trillions of transistors for artificial general intelligence and quantum-classical hybrid computing.",
      color: "#2563eb"
    },
    {
      icon: "🔥",
      title: "Gas Turbine Design",
      short: "Power generation systems",
      tagline: "Converting molecular chaos into megawatts",
      description: "Gas turbines are the workhorses of modern power generation, converting the thermal energy of combustion gases into rotational power. From jet engines to power plants, these machines depend on precise understanding of how hot, high-pressure gases behave as they expand through turbine stages.",
      connection: "The Brayton cycle that governs gas turbines is a direct application of kinetic theory. Compressor work depends on raising gas temperature (increasing molecular kinetic energy), while turbine output depends on extracting that energy as molecules expand and cool. Efficiency improves with higher turbine inlet temperatures, pushing materials to their limits.",
      howItWorks: [
        "Axial compressors accelerate air molecules through rotating blade stages, increasing pressure 30-40x",
        "Combustors add fuel, raising gas temperature to 1500-1700°C (molecular speeds exceed 1000 m/s)",
        "Turbine blades extract energy as hot molecules expand, spinning the shaft at 3000-15000 RPM",
        "Blade cooling channels use compressed air to keep metal below melting despite extreme gas temperatures"
      ],
      stats: [
        "Combined-cycle efficiency exceeds 64% (world record)",
        "Large turbines produce 500+ MW (enough for 500,000 homes)",
        "Turbine inlet temperatures approach 1700°C"
      ],
      examples: [
        "GE 9HA turbine achieves record-breaking 64.5% combined-cycle efficiency",
        "Aircraft engines operate at pressure ratios above 50:1",
        "Peaker plants provide rapid grid response for renewable integration",
        "Industrial cogeneration captures waste heat for process steam"
      ],
      companies: ["GE Vernova", "Siemens Energy", "Mitsubishi Power", "Rolls-Royce", "Pratt & Whitney"],
      futureImpact: "Hydrogen-fueled turbines will enable zero-carbon dispatchable power, while advanced ceramic matrix composites allow even higher temperatures, pushing thermal efficiency toward theoretical limits and supporting the clean energy transition.",
      color: "#dc2626"
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
              {/* Premium animated molecular motion preview */}
              <div className="relative h-48 rounded-xl overflow-hidden mb-4" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)' }}>
                <svg className="w-full h-full" viewBox="0 0 400 192">
                  <defs>
                    {/* Premium background gradient */}
                    <linearGradient id="ktgHookBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#030712" />
                      <stop offset="30%" stopColor="#0a0f1a" />
                      <stop offset="70%" stopColor="#111827" />
                      <stop offset="100%" stopColor="#030712" />
                    </linearGradient>

                    {/* Container frame gradient */}
                    <linearGradient id="ktgHookFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
                      <stop offset="25%" stopColor="#ea580c" stopOpacity="0.7" />
                      <stop offset="50%" stopColor="#c2410c" stopOpacity="0.8" />
                      <stop offset="75%" stopColor="#ea580c" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
                    </linearGradient>

                    {/* Glass reflection */}
                    <linearGradient id="ktgHookGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                      <stop offset="50%" stopColor="#f97316" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
                    </linearGradient>

                    {/* 3D molecule gradients */}
                    <radialGradient id="ktgHookBlue" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="40%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
                    </radialGradient>

                    <radialGradient id="ktgHookGreen" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#86efac" />
                      <stop offset="40%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#15803d" stopOpacity="0.9" />
                    </radialGradient>

                    <radialGradient id="ktgHookOrange" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#fed7aa" />
                      <stop offset="40%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity="0.9" />
                    </radialGradient>

                    <radialGradient id="ktgHookRed" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#fecaca" />
                      <stop offset="40%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
                    </radialGradient>

                    {/* Glow filter */}
                    <filter id="ktgHookGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Hot glow filter */}
                    <filter id="ktgHookHotGlow" x="-150%" y="-150%" width="400%" height="400%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Background */}
                  <rect width="400" height="192" fill="url(#ktgHookBg)" />

                  {/* Subtle grid */}
                  <pattern id="ktgHookGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
                  </pattern>
                  <rect x="8" y="8" width="384" height="176" fill="url(#ktgHookGrid)" />

                  {/* Glass effect */}
                  <rect x="8" y="8" width="384" height="176" fill="url(#ktgHookGlass)" rx="6" />

                  {/* Container frame */}
                  <rect x="4" y="4" width="392" height="184" fill="none" stroke="url(#ktgHookFrame)" strokeWidth="4" rx="8" />
                  <rect x="6" y="6" width="388" height="180" fill="none" stroke="#fbbf24" strokeWidth="0.5" strokeOpacity="0.3" rx="7" />

                  {/* Animated premium molecules */}
                  {[...Array(30)].map((_, i) => {
                    const duration = 2 + Math.random() * 2;
                    const delay = Math.random() * 2;
                    const startX = 30 + Math.random() * 340;
                    const startY = 25 + Math.random() * 140;
                    const gradients = ['ktgHookBlue', 'ktgHookGreen', 'ktgHookOrange', 'ktgHookRed'];
                    const gradientId = gradients[Math.floor(Math.random() * 4)];
                    const isHot = gradientId === 'ktgHookRed';

                    return (
                      <g key={i}>
                        {/* 3D molecule with glow */}
                        <circle
                          cx={startX}
                          cy={startY}
                          r={5}
                          fill={`url(#${gradientId})`}
                          filter={isHot ? 'url(#ktgHookHotGlow)' : 'url(#ktgHookGlow)'}
                        >
                          <animate
                            attributeName="cx"
                            values={`${startX};${30 + Math.random() * 340};${30 + Math.random() * 340}`}
                            dur={`${duration}s`}
                            begin={`${delay}s`}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="cy"
                            values={`${startY};${25 + Math.random() * 140};${25 + Math.random() * 140}`}
                            dur={`${duration}s`}
                            begin={`${delay}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                        {/* Highlight reflection */}
                        <circle
                          cx={startX - 1.5}
                          cy={startY - 1.5}
                          r={1.8}
                          fill="white"
                          opacity="0.4"
                        >
                          <animate
                            attributeName="cx"
                            values={`${startX - 1.5};${28.5 + Math.random() * 340};${28.5 + Math.random() * 340}`}
                            dur={`${duration}s`}
                            begin={`${delay}s`}
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="cy"
                            values={`${startY - 1.5};${23.5 + Math.random() * 140};${23.5 + Math.random() * 140}`}
                            dur={`${duration}s`}
                            begin={`${delay}s`}
                            repeatCount="indefinite"
                          />
                        </circle>
                      </g>
                    );
                  })}

                  {/* Temperature label */}
                  <rect x="165" y="165" width="70" height="20" rx="4" fill="#111827" fillOpacity="0.9" />
                  <text x="200" y="179" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold" fontFamily="monospace">300 K</text>
                </svg>

                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
                  <p className="text-xs text-gray-400 bg-gray-900/80 px-3 py-1 rounded-full backdrop-blur-sm">Air molecules at room temperature</p>
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

              {/* Premium Visualization */}
              <div className="relative h-44 rounded-xl overflow-hidden mb-4" style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)' }}>
                <svg className="w-full h-full" viewBox="0 0 400 176">
                  <defs>
                    {/* Background gradient */}
                    <linearGradient id="ktgPredictBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#030712" />
                      <stop offset="50%" stopColor="#0a0f1a" />
                      <stop offset="100%" stopColor="#030712" />
                    </linearGradient>

                    {/* Cold container frame (blue) */}
                    <linearGradient id="ktgColdFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                      <stop offset="30%" stopColor="#2563eb" stopOpacity="0.8" />
                      <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Hot container frame (red) */}
                    <linearGradient id="ktgHotFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                      <stop offset="30%" stopColor="#dc2626" stopOpacity="0.8" />
                      <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Glass effect */}
                    <linearGradient id="ktgPredictGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
                    </linearGradient>

                    {/* Cold molecule 3D */}
                    <radialGradient id="ktgPredictColdMol" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.85" />
                    </radialGradient>

                    {/* Arrow gradient */}
                    <linearGradient id="ktgPredictArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id="ktgPredictGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Question mark glow */}
                    <filter id="ktgQuestionGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Arrow marker */}
                    <marker id="ktgPredictArrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
                      <polygon points="0 0, 12 4, 0 8" fill="#fbbf24" />
                    </marker>
                  </defs>

                  {/* Background */}
                  <rect width="400" height="176" fill="url(#ktgPredictBg)" />

                  {/* Grid pattern */}
                  <pattern id="ktgPredictGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
                  </pattern>
                  <rect width="400" height="176" fill="url(#ktgPredictGrid)" />

                  {/* Cold container (left) */}
                  <g transform="translate(20, 30)">
                    {/* Container background */}
                    <rect x="0" y="0" width="150" height="110" rx="8" fill="#0a0f1a" />
                    <rect x="0" y="0" width="150" height="110" rx="8" fill="url(#ktgPredictGlass)" />

                    {/* Metallic frame */}
                    <rect x="0" y="0" width="150" height="110" rx="8" fill="none" stroke="url(#ktgColdFrame)" strokeWidth="4" />
                    <rect x="2" y="2" width="146" height="106" rx="6" fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeOpacity="0.3" />

                    {/* Temperature label */}
                    <rect x="45" y="-18" width="60" height="18" rx="4" fill="#111827" stroke="#3b82f6" strokeWidth="1" />
                    <text x="75" y="-5" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="monospace">300 K</text>

                    {/* Premium molecules with animation */}
                    {[...Array(15)].map((_, i) => {
                      const baseX = 20 + (i % 5) * 25;
                      const baseY = 20 + Math.floor(i / 5) * 30;
                      return (
                        <g key={i}>
                          <circle
                            cx={baseX}
                            cy={baseY}
                            r="6"
                            fill="url(#ktgPredictColdMol)"
                            filter="url(#ktgPredictGlow)"
                          >
                            <animate attributeName="cx" values={`${baseX};${baseX + 4};${baseX}`} dur="0.5s" repeatCount="indefinite" />
                            <animate attributeName="cy" values={`${baseY};${baseY - 2};${baseY}`} dur="0.4s" repeatCount="indefinite" />
                          </circle>
                          <circle cx={baseX - 2} cy={baseY - 2} r="2" fill="white" opacity="0.35">
                            <animate attributeName="cx" values={`${baseX - 2};${baseX + 2};${baseX - 2}`} dur="0.5s" repeatCount="indefinite" />
                            <animate attributeName="cy" values={`${baseY - 2};${baseY - 4};${baseY - 2}`} dur="0.4s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      );
                    })}
                  </g>

                  {/* Arrow section */}
                  <g transform="translate(175, 70)">
                    <rect x="0" y="-12" width="50" height="24" rx="4" fill="#111827" fillOpacity="0.8" />
                    <text x="25" y="-1" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold">2x TEMP</text>

                    <line x1="0" y1="25" x2="45" y2="25" stroke="url(#ktgPredictArrow)" strokeWidth="3" markerEnd="url(#ktgPredictArrowhead)" />

                    <circle cx="25" cy="25" r="8" fill="none" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.3">
                      <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>

                  {/* Hot container (right) */}
                  <g transform="translate(230, 30)">
                    {/* Container background */}
                    <rect x="0" y="0" width="150" height="110" rx="8" fill="#0a0f1a" />
                    <rect x="0" y="0" width="150" height="110" rx="8" fill="url(#ktgPredictGlass)" />

                    {/* Metallic frame with heat glow */}
                    <rect x="0" y="0" width="150" height="110" rx="8" fill="none" stroke="url(#ktgHotFrame)" strokeWidth="4">
                      <animate attributeName="stroke-opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
                    </rect>
                    <rect x="2" y="2" width="146" height="106" rx="6" fill="none" stroke="#f87171" strokeWidth="0.5" strokeOpacity="0.3" />

                    {/* Temperature label */}
                    <rect x="45" y="-18" width="60" height="18" rx="4" fill="#111827" stroke="#ef4444" strokeWidth="1" />
                    <text x="75" y="-5" textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="bold" fontFamily="monospace">600 K</text>

                    {/* Mystery question mark */}
                    <text x="75" y="70" textAnchor="middle" fill="#ef4444" fontSize="48" fontWeight="bold" filter="url(#ktgQuestionGlow)">
                      ?
                      <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
                    </text>

                    {/* Hint text */}
                    <text x="75" y="95" textAnchor="middle" fill="#6b7280" fontSize="9">How fast do molecules move?</text>
                  </g>
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

              {/* Premium Simulation Container */}
              <div
                className="relative rounded-xl overflow-hidden mx-auto"
                style={{
                  width: Math.min(volume * 3, 450),
                  height: Math.min(volume * 3, 450),
                  boxShadow: '0 0 40px rgba(249, 115, 22, 0.15), inset 0 0 60px rgba(0, 0, 0, 0.5)'
                }}
              >
                <svg width="100%" height="100%" viewBox={`0 0 ${volume * 3} ${volume * 3}`}>
                  <defs>
                    {/* === PREMIUM GRADIENT DEFINITIONS === */}

                    {/* Container background gradient - dark lab atmosphere */}
                    <linearGradient id="ktgContainerBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#030712" />
                      <stop offset="25%" stopColor="#0a0f1a" />
                      <stop offset="50%" stopColor="#111827" />
                      <stop offset="75%" stopColor="#0a0f1a" />
                      <stop offset="100%" stopColor="#030712" />
                    </linearGradient>

                    {/* Glass container effect - premium metallic frame */}
                    <linearGradient id="ktgContainerFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6b7280" />
                      <stop offset="15%" stopColor="#9ca3af" />
                      <stop offset="30%" stopColor="#4b5563" />
                      <stop offset="50%" stopColor="#374151" />
                      <stop offset="70%" stopColor="#4b5563" />
                      <stop offset="85%" stopColor="#6b7280" />
                      <stop offset="100%" stopColor="#374151" />
                    </linearGradient>

                    {/* Inner glass reflection */}
                    <linearGradient id="ktgGlassReflection" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
                      <stop offset="20%" stopColor="#67e8f9" stopOpacity="0.05" />
                      <stop offset="80%" stopColor="#0ea5e9" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
                    </linearGradient>

                    {/* Slow molecule (blue) - 3D sphere effect */}
                    <radialGradient id="ktgMoleculeSlow" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
                      <stop offset="25%" stopColor="#60a5fa" stopOpacity="1" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.95" />
                      <stop offset="75%" stopColor="#2563eb" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.85" />
                    </radialGradient>

                    {/* Medium molecule (green) - 3D sphere effect */}
                    <radialGradient id="ktgMoleculeMedium" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
                      <stop offset="25%" stopColor="#4ade80" stopOpacity="1" />
                      <stop offset="50%" stopColor="#22c55e" stopOpacity="0.95" />
                      <stop offset="75%" stopColor="#16a34a" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#15803d" stopOpacity="0.85" />
                    </radialGradient>

                    {/* Fast molecule (orange) - 3D sphere effect */}
                    <radialGradient id="ktgMoleculeFast" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#fed7aa" stopOpacity="1" />
                      <stop offset="25%" stopColor="#fdba74" stopOpacity="1" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.95" />
                      <stop offset="75%" stopColor="#d97706" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity="0.85" />
                    </radialGradient>

                    {/* Very fast molecule (red) - 3D sphere effect */}
                    <radialGradient id="ktgMoleculeHot" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#fecaca" stopOpacity="1" />
                      <stop offset="25%" stopColor="#f87171" stopOpacity="1" />
                      <stop offset="50%" stopColor="#ef4444" stopOpacity="0.95" />
                      <stop offset="75%" stopColor="#dc2626" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.85" />
                    </radialGradient>

                    {/* Collision flash effect */}
                    <radialGradient id="ktgCollisionFlash" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                      <stop offset="30%" stopColor="#fde047" stopOpacity="0.8" />
                      <stop offset="60%" stopColor="#facc15" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                    </radialGradient>

                    {/* Wall collision glow */}
                    <radialGradient id="ktgWallGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#ea580c" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
                    </radialGradient>

                    {/* Velocity vector gradient */}
                    <linearGradient id="ktgVelocityVector" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.2" />
                    </linearGradient>

                    {/* === PREMIUM FILTER DEFINITIONS === */}

                    {/* Molecule glow filter */}
                    <filter id="ktgMoleculeGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Hot molecule intense glow */}
                    <filter id="ktgHotGlow" x="-150%" y="-150%" width="400%" height="400%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Collision flash filter */}
                    <filter id="ktgCollisionGlow" x="-200%" y="-200%" width="500%" height="500%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Inner shadow for container depth */}
                    <filter id="ktgInnerShadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feOffset dx="2" dy="2" />
                      <feComposite in2="SourceGraphic" operator="arithmetic" k2="-1" k3="1" />
                    </filter>

                    {/* Subtle noise texture */}
                    <filter id="ktgNoise">
                      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
                      <feColorMatrix type="saturate" values="0" />
                      <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
                    </filter>

                    {/* Arrow marker for velocity vectors */}
                    <marker id="ktgArrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#22d3ee" fillOpacity="0.8" />
                    </marker>
                  </defs>

                  {/* === PREMIUM CONTAINER RENDERING === */}

                  {/* Dark background */}
                  <rect
                    x="0" y="0"
                    width={volume * 3}
                    height={volume * 3}
                    fill="url(#ktgContainerBg)"
                  />

                  {/* Subtle grid pattern for depth */}
                  <pattern id="ktgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
                  </pattern>
                  <rect
                    x="4" y="4"
                    width={volume * 3 - 8}
                    height={volume * 3 - 8}
                    fill="url(#ktgGrid)"
                    opacity="0.5"
                  />

                  {/* Glass container inner reflection */}
                  <rect
                    x="4" y="4"
                    width={volume * 3 - 8}
                    height={volume * 3 - 8}
                    fill="url(#ktgGlassReflection)"
                    rx="4"
                  />

                  {/* Container metallic frame - outer */}
                  <rect
                    x="0" y="0"
                    width={volume * 3}
                    height={volume * 3}
                    fill="none"
                    stroke="url(#ktgContainerFrame)"
                    strokeWidth="6"
                    rx="8"
                  />

                  {/* Container frame highlight */}
                  <rect
                    x="2" y="2"
                    width={volume * 3 - 4}
                    height={volume * 3 - 4}
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                    rx="6"
                  />

                  {/* Container frame inner shadow line */}
                  <rect
                    x="6" y="6"
                    width={volume * 3 - 12}
                    height={volume * 3 - 12}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    rx="4"
                  />

                  {/* Pressure indicator corners */}
                  {[
                    { x: 12, y: 12 },
                    { x: volume * 3 - 12, y: 12 },
                    { x: 12, y: volume * 3 - 12 },
                    { x: volume * 3 - 12, y: volume * 3 - 12 }
                  ].map((corner, i) => (
                    <g key={i}>
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r="4"
                        fill="#1f2937"
                        stroke="#374151"
                        strokeWidth="1"
                      />
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r="2"
                        fill={pressure > 200 ? '#ef4444' : pressure > 100 ? '#f59e0b' : '#22c55e'}
                      >
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  ))}

                  {/* === PREMIUM MOLECULES WITH 3D EFFECT === */}
                  {molecules.map(mol => {
                    // Determine gradient based on speed
                    const speedFactor = mol.speed / (calculateRmsSpeed(temperature) * 0.00001);
                    let gradientId = 'ktgMoleculeSlow';
                    let filterId = 'ktgMoleculeGlow';

                    if (speedFactor >= 1.3) {
                      gradientId = 'ktgMoleculeHot';
                      filterId = 'ktgHotGlow';
                    } else if (speedFactor >= 1.0) {
                      gradientId = 'ktgMoleculeFast';
                      filterId = 'ktgMoleculeGlow';
                    } else if (speedFactor >= 0.7) {
                      gradientId = 'ktgMoleculeMedium';
                      filterId = 'ktgMoleculeGlow';
                    }

                    // Calculate velocity vector endpoint
                    const velocityScale = 8;
                    const vxDisplay = mol.vx * velocityScale * 60;
                    const vyDisplay = mol.vy * velocityScale * 60;

                    return (
                      <g key={mol.id}>
                        {/* Velocity vector (subtle) */}
                        <line
                          x1={mol.x}
                          y1={mol.y}
                          x2={mol.x + vxDisplay}
                          y2={mol.y + vyDisplay}
                          stroke="url(#ktgVelocityVector)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          markerEnd="url(#ktgArrowhead)"
                          opacity="0.6"
                        />

                        {/* Molecule with 3D gradient */}
                        <circle
                          cx={mol.x}
                          cy={mol.y}
                          r={mol.radius + 1}
                          fill={`url(#${gradientId})`}
                          filter={`url(#${filterId})`}
                        />

                        {/* Highlight reflection on molecule */}
                        <circle
                          cx={mol.x - mol.radius * 0.3}
                          cy={mol.y - mol.radius * 0.3}
                          r={mol.radius * 0.35}
                          fill="white"
                          opacity="0.4"
                        />
                      </g>
                    );
                  })}

                  {/* Temperature indicator label */}
                  <rect x="8" y={volume * 3 - 28} width="70" height="20" rx="4" fill="#111827" fillOpacity="0.9" />
                  <text x="43" y={volume * 3 - 14} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    {temperature} K
                  </text>

                  {/* Pressure gauge */}
                  <rect x={volume * 3 - 78} y={volume * 3 - 28} width="70" height="20" rx="4" fill="#111827" fillOpacity="0.9" />
                  <text x={volume * 3 - 43} y={volume * 3 - 14} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    P: {pressure.toFixed(0)}
                  </text>
                </svg>

                {/* Premium Speed Legend */}
                <div className="absolute top-2 right-2 backdrop-blur-md bg-gray-900/80 rounded-lg p-2 text-xs border border-gray-700/50 shadow-lg">
                  <div className="text-gray-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">Molecular Speed</div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700 shadow-sm shadow-blue-500/50"></div>
                    <span className="text-blue-300">Slow</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-300 via-green-500 to-green-700 shadow-sm shadow-green-500/50"></div>
                    <span className="text-green-300">Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-sm shadow-orange-500/50"></div>
                    <span className="text-orange-300">Fast</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-300 via-red-500 to-red-700 shadow-sm shadow-red-500/50 animate-pulse"></div>
                    <span className="text-red-300">Very Fast</span>
                  </div>
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
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                <h3 className="text-lg font-medium text-purple-400 mb-3">Speed Distribution</h3>
                <svg viewBox="0 0 400 220" className="w-full h-56">
                  <defs>
                    {/* Background gradient */}
                    <linearGradient id="ktgDistBg" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Curve gradient */}
                    <linearGradient id="ktgDistCurve" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="30%" stopColor="#8b5cf6" />
                      <stop offset="60%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>

                    {/* Fill gradient under curve */}
                    <linearGradient id="ktgDistFill" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                    </linearGradient>

                    {/* RMS marker gradient */}
                    <linearGradient id="ktgRmsMarker" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                    </linearGradient>

                    {/* Glow filter for curve */}
                    <filter id="ktgDistGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Axis glow */}
                    <filter id="ktgAxisGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="1" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Background */}
                  <rect x="40" y="10" width="350" height="175" rx="8" fill="url(#ktgDistBg)" />

                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={`h${i}`} x1="50" y1={30 + i * 35} x2="380" y2={30 + i * 35} stroke="#374151" strokeWidth="0.5" strokeOpacity="0.5" />
                  ))}
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <line key={`v${i}`} x1={50 + i * 66} y1="20" x2={50 + i * 66} y2="170" stroke="#374151" strokeWidth="0.5" strokeOpacity="0.5" />
                  ))}

                  {/* Axes with glow */}
                  <line x1="50" y1="170" x2="385" y2="170" stroke="#6b7280" strokeWidth="2" filter="url(#ktgAxisGlow)" />
                  <line x1="50" y1="170" x2="50" y2="15" stroke="#6b7280" strokeWidth="2" filter="url(#ktgAxisGlow)" />

                  {/* Axis arrows */}
                  <polygon points="385,170 378,166 378,174" fill="#6b7280" />
                  <polygon points="50,15 46,22 54,22" fill="#6b7280" />

                  {/* Axis labels */}
                  <text x="215" y="200" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500">Molecular Speed (m/s)</text>
                  <text x="15" y="95" textAnchor="middle" fill="#9ca3af" fontSize="11" fontWeight="500" transform="rotate(-90, 15, 95)">Probability Density</text>

                  {/* Speed tick marks */}
                  {[0, 200, 400, 600, 800, 1000].map((v, i) => (
                    <g key={v}>
                      <line x1={50 + i * 55} y1="170" x2={50 + i * 55} y2="175" stroke="#6b7280" strokeWidth="1" />
                      <text x={50 + i * 55} y="186" textAnchor="middle" fill="#6b7280" fontSize="9">{v}</text>
                    </g>
                  ))}

                  {/* Fill under curve */}
                  <path
                    d={(() => {
                      let path = 'M 50 170';
                      const v_rms = calculateRmsSpeed(temperature);
                      const v_max = v_rms * 2;
                      for (let i = 0; i <= 100; i++) {
                        const v = (i / 100) * v_max;
                        const x = 50 + (v / 1000) * 330;
                        const f = Math.pow(v / v_rms, 2) * Math.exp(-1.5 * Math.pow(v / v_rms, 2));
                        const y = 170 - f * 180;
                        path += ` L ${x} ${y}`;
                      }
                      path += ' L 380 170 Z';
                      return path;
                    })()}
                    fill="url(#ktgDistFill)"
                  />

                  {/* Maxwell-Boltzmann curve with glow */}
                  <path
                    d={(() => {
                      const points: string[] = [];
                      const v_rms = calculateRmsSpeed(temperature);
                      const v_max = v_rms * 2;
                      for (let i = 0; i <= 100; i++) {
                        const v = (i / 100) * v_max;
                        const x = 50 + (v / 1000) * 330;
                        const f = Math.pow(v / v_rms, 2) * Math.exp(-1.5 * Math.pow(v / v_rms, 2));
                        const y = 170 - f * 180;
                        points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
                      }
                      return points.join(' ');
                    })()}
                    fill="none"
                    stroke="url(#ktgDistCurve)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#ktgDistGlow)"
                  />

                  {/* RMS speed marker */}
                  {(() => {
                    const v_rms = calculateRmsSpeed(temperature);
                    const xPos = 50 + (v_rms / 1000) * 330;
                    return (
                      <g>
                        <line x1={xPos} y1="170" x2={xPos} y2="25" stroke="url(#ktgRmsMarker)" strokeWidth="2" strokeDasharray="6 3" />
                        <rect x={xPos - 25} y="8" width="50" height="16" rx="3" fill="#111827" stroke="#f59e0b" strokeWidth="1" />
                        <text x={xPos} y="20" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold">v_rms</text>
                        <circle cx={xPos} cy="170" r="4" fill="#f59e0b">
                          <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    );
                  })()}

                  {/* Current temperature indicator */}
                  <rect x="300" y="25" width="75" height="24" rx="4" fill="#111827" stroke="#8b5cf6" strokeWidth="1" />
                  <text x="337" y="41" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="bold">{temperature} K</text>
                </svg>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  The Maxwell-Boltzmann distribution shows that molecules have a range of speeds.
                  Most are near the peak, but some are much faster or slower. The distribution shifts right with higher temperature.
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

              {/* Premium Simulation - Exploration Mode */}
              <div
                className="relative rounded-xl overflow-hidden mx-auto"
                style={{
                  width: Math.min(volume * 3, isMobile ? 280 : 400),
                  height: Math.min(volume * 3, isMobile ? 280 : 400),
                  boxShadow: '0 0 40px rgba(6, 182, 212, 0.15), inset 0 0 60px rgba(0, 0, 0, 0.5)'
                }}
              >
                <svg width="100%" height="100%" viewBox={`0 0 ${volume * 3} ${volume * 3}`}>
                  <defs>
                    {/* Container background gradient */}
                    <linearGradient id="ktgExploreBg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#030712" />
                      <stop offset="25%" stopColor="#0a0f1a" />
                      <stop offset="50%" stopColor="#111827" />
                      <stop offset="75%" stopColor="#0a0f1a" />
                      <stop offset="100%" stopColor="#030712" />
                    </linearGradient>

                    {/* Premium metallic frame */}
                    <linearGradient id="ktgExploreFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                      <stop offset="20%" stopColor="#0891b2" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#0e7490" stopOpacity="0.9" />
                      <stop offset="80%" stopColor="#0891b2" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
                    </linearGradient>

                    {/* Glass reflection */}
                    <linearGradient id="ktgExploreGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                      <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.03" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
                    </linearGradient>

                    {/* Molecule gradients (reusing same IDs works within this SVG scope) */}
                    <radialGradient id="ktgExpMolSlow" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.85" />
                    </radialGradient>

                    <radialGradient id="ktgExpMolMedium" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#86efac" />
                      <stop offset="50%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#15803d" stopOpacity="0.85" />
                    </radialGradient>

                    <radialGradient id="ktgExpMolFast" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#fed7aa" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity="0.85" />
                    </radialGradient>

                    <radialGradient id="ktgExpMolHot" cx="35%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#fecaca" />
                      <stop offset="50%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.85" />
                    </radialGradient>

                    {/* Glow filters */}
                    <filter id="ktgExpGlow" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <filter id="ktgExpHotGlow" x="-150%" y="-150%" width="400%" height="400%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    {/* Velocity arrow */}
                    <marker id="ktgExpArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#67e8f9" fillOpacity="0.7" />
                    </marker>
                  </defs>

                  {/* Background */}
                  <rect x="0" y="0" width={volume * 3} height={volume * 3} fill="url(#ktgExploreBg)" />

                  {/* Grid */}
                  <pattern id="ktgExpGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                    <rect width="15" height="15" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.5" />
                  </pattern>
                  <rect x="4" y="4" width={volume * 3 - 8} height={volume * 3 - 8} fill="url(#ktgExpGrid)" opacity="0.6" />

                  {/* Glass effect */}
                  <rect x="4" y="4" width={volume * 3 - 8} height={volume * 3 - 8} fill="url(#ktgExploreGlass)" rx="4" />

                  {/* Metallic frame */}
                  <rect x="0" y="0" width={volume * 3} height={volume * 3} fill="none" stroke="url(#ktgExploreFrame)" strokeWidth="5" rx="8" />
                  <rect x="2" y="2" width={volume * 3 - 4} height={volume * 3 - 4} fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.3" rx="6" />

                  {/* Premium Molecules */}
                  {molecules.map(mol => {
                    const speedFactor = mol.speed / (calculateRmsSpeed(temperature) * 0.00001);
                    let gradientId = 'ktgExpMolSlow';
                    let filterId = 'ktgExpGlow';

                    if (speedFactor >= 1.3) {
                      gradientId = 'ktgExpMolHot';
                      filterId = 'ktgExpHotGlow';
                    } else if (speedFactor >= 1.0) {
                      gradientId = 'ktgExpMolFast';
                    } else if (speedFactor >= 0.7) {
                      gradientId = 'ktgExpMolMedium';
                    }

                    const vScale = 6;
                    const vxD = mol.vx * vScale * 60;
                    const vyD = mol.vy * vScale * 60;

                    return (
                      <g key={mol.id}>
                        {/* Velocity vector */}
                        <line
                          x1={mol.x}
                          y1={mol.y}
                          x2={mol.x + vxD}
                          y2={mol.y + vyD}
                          stroke="#67e8f9"
                          strokeWidth="1"
                          strokeOpacity="0.5"
                          markerEnd="url(#ktgExpArrow)"
                        />

                        {/* 3D Molecule */}
                        <circle
                          cx={mol.x}
                          cy={mol.y}
                          r={mol.radius + 1}
                          fill={`url(#${gradientId})`}
                          filter={`url(#${filterId})`}
                        />

                        {/* Highlight */}
                        <circle
                          cx={mol.x - mol.radius * 0.3}
                          cy={mol.y - mol.radius * 0.3}
                          r={mol.radius * 0.3}
                          fill="white"
                          opacity="0.35"
                        />
                      </g>
                    );
                  })}
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

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-medium text-blue-400 mb-4">Maxwell-Boltzmann Distribution</h3>

              <svg viewBox="0 0 500 270" className="w-full h-72">
                <defs>
                  {/* Premium background gradient */}
                  <linearGradient id="ktgMBAdvBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0c1929" />
                    <stop offset="50%" stopColor="#111827" />
                    <stop offset="100%" stopColor="#0c1929" />
                  </linearGradient>

                  {/* Cold (200K) curve gradient */}
                  <linearGradient id="ktgMBCold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>

                  {/* Medium (400K) curve gradient */}
                  <linearGradient id="ktgMBMedium" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>

                  {/* Hot (600K) curve gradient */}
                  <linearGradient id="ktgMBHot" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>

                  {/* Fill gradients for area under curves */}
                  <linearGradient id="ktgMBColdFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>

                  <linearGradient id="ktgMBMediumFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>

                  <linearGradient id="ktgMBHotFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>

                  {/* Curve glow filters */}
                  <filter id="ktgMBGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="ktgMBIntenseGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Premium background */}
                <rect x="0" y="0" width="500" height="270" rx="8" fill="url(#ktgMBAdvBg)" />

                {/* Subtle grid pattern */}
                {[...Array(6)].map((_, i) => (
                  <g key={`grid${i}`}>
                    <line x1="60" y1={40 + i * 35} x2="475" y2={40 + i * 35} stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.4" />
                    <line x1={60 + i * 83} y1="30" x2={60 + i * 83} y2="215" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.4" />
                  </g>
                ))}

                {/* Axes with premium styling */}
                <line x1="60" y1="215" x2="480" y2="215" stroke="#475569" strokeWidth="2" />
                <line x1="60" y1="215" x2="60" y2="25" stroke="#475569" strokeWidth="2" />

                {/* Axis arrows */}
                <polygon points="480,215 473,211 473,219" fill="#475569" />
                <polygon points="60,25 56,32 64,32" fill="#475569" />

                {/* Axis labels */}
                <text x="270" y="250" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500">Molecular Speed (m/s)</text>
                <text x="20" y="120" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500" transform="rotate(-90, 20, 120)">Probability Density</text>

                {/* Temperature curves with fills */}
                {[
                  { temp: 200, gradient: 'ktgMBCold', fill: 'ktgMBColdFill', color: '#60a5fa' },
                  { temp: 400, gradient: 'ktgMBMedium', fill: 'ktgMBMediumFill', color: '#4ade80' },
                  { temp: 600, gradient: 'ktgMBHot', fill: 'ktgMBHotFill', color: '#f87171' }
                ].map(({ temp, gradient, fill, color }, idx) => {
                  const v_rms = calculateRmsSpeed(temp);
                  const v_max = v_rms * 2.5;

                  // Generate curve path
                  let curvePath = '';
                  let fillPath = 'M 60 215';
                  for (let i = 0; i <= 100; i++) {
                    const v = (i / 100) * v_max;
                    const x = 60 + (v / 1500) * 415;
                    const f = Math.pow(v / v_rms, 2) * Math.exp(-1.5 * Math.pow(v / v_rms, 2));
                    const y = 215 - f * 240;
                    curvePath += `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(30, y)}`;
                    fillPath += ` L ${x} ${Math.max(30, y)}`;
                  }
                  fillPath += ' L 475 215 Z';

                  return (
                    <g key={temp}>
                      {/* Fill under curve */}
                      <path d={fillPath} fill={`url(#${fill})`} />

                      {/* Curve with glow */}
                      <path
                        d={curvePath}
                        fill="none"
                        stroke={`url(#${gradient})`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        filter={idx === 2 ? 'url(#ktgMBIntenseGlow)' : 'url(#ktgMBGlow)'}
                      />
                    </g>
                  );
                })}

                {/* Legend box */}
                <rect x="395" y="35" width="95" height="90" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x="442" y="52" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">TEMPERATURE</text>

                {[
                  { temp: '200 K', color: '#3b82f6', label: 'Cold', y: 68 },
                  { temp: '400 K', color: '#22c55e', label: 'Medium', y: 88 },
                  { temp: '600 K', color: '#ef4444', label: 'Hot', y: 108 }
                ].map(({ temp, color, label, y }) => (
                  <g key={temp}>
                    <line x1="402" y1={y} x2="425" y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />
                    <text x="432" y={y + 4} fill={color} fontSize="10" fontWeight="600">{temp}</text>
                  </g>
                ))}

                {/* Speed axis tick marks */}
                {[0, 500, 1000, 1500].map((v, i) => (
                  <g key={v}>
                    <line x1={60 + (v / 1500) * 415} y1="215" x2={60 + (v / 1500) * 415} y2="220" stroke="#475569" strokeWidth="1" />
                    <text x={60 + (v / 1500) * 415} y="232" textAnchor="middle" fill="#6b7280" fontSize="10">{v}</text>
                  </g>
                ))}
              </svg>

              <div className="mt-4 text-sm text-gray-400 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                <p className="leading-relaxed">
                  <span className="text-blue-400 font-medium">Key insight:</span> Higher temperatures shift the distribution to the right (faster speeds) and flatten the peak (wider range of speeds).
                  The area under each curve equals 1 (100% of molecules).
                </p>
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
