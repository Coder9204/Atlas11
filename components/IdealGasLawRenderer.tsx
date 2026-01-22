import React, { useState, useEffect, useCallback, useRef } from 'react';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'twist_prediction_made'
  | 'twist_correct'
  | 'twist_incorrect'
  | 'simulation_started'
  | 'simulation_completed'
  | 'parameter_changed'
  | 'pressure_adjusted'
  | 'volume_adjusted'
  | 'temperature_adjusted'
  | 'gas_added'
  | 'gas_removed'
  | 'app_explored'
  | 'app_completed'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved'
  | 'sound_played'
  | 'milestone_reached';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

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
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const IdealGasLawRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation states
  const [pressure, setPressure] = useState(100); // kPa
  const [volume, setVolume] = useState(1.0); // Liters
  const [temperature, setTemperature] = useState(300); // Kelvin
  const [moles, setMoles] = useState(0.04); // moles of gas
  const [lockedVariable, setLockedVariable] = useState<'P' | 'V' | 'T'>('T');
  const [isAnimating, setIsAnimating] = useState(false);
  const [moleculePositions, setMoleculePositions] = useState<{x: number, y: number, vx: number, vy: number}[]>([]);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Gas constant R = 8.314 J/(mol·K) = 8.314 kPa·L/(mol·K)
  const R = 8.314;

  // Check for mobile
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

  // Initialize molecule positions
  useEffect(() => {
    const numMolecules = Math.round(moles * 250); // Scale for visualization
    const newPositions = Array.from({ length: Math.min(numMolecules, 100) }, () => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    }));
    setMoleculePositions(newPositions);
  }, [moles]);

  // Animate molecules
  useEffect(() => {
    if (!isAnimating) return;

    const speedFactor = Math.sqrt(temperature / 300);

    const animate = () => {
      setMoleculePositions(prev => prev.map(mol => {
        let newX = mol.x + mol.vx * speedFactor;
        let newY = mol.y + mol.vy * speedFactor;
        let newVx = mol.vx;
        let newVy = mol.vy;

        // Container bounds based on volume
        const containerWidth = 80 * Math.cbrt(volume);
        const containerHeight = 80 * Math.cbrt(volume);
        const offsetX = (80 - containerWidth) / 2 + 10;
        const offsetY = (80 - containerHeight) / 2 + 10;

        if (newX < offsetX || newX > offsetX + containerWidth) {
          newVx = -newVx;
          newX = Math.max(offsetX, Math.min(offsetX + containerWidth, newX));
        }
        if (newY < offsetY || newY > offsetY + containerHeight) {
          newVy = -newVy;
          newY = Math.max(offsetY, Math.min(offsetY + containerHeight, newY));
        }

        return { x: newX, y: newY, vx: newVx, vy: newVy };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, temperature, volume]);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'hiss' | 'compress' | 'expand' | 'heat' | 'complete') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (soundType) {
      case 'correct':
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialDecayTo?.(0.01, ctx.currentTime + 0.3) || gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'incorrect':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'hiss':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'compress':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'expand':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'heat':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.setValueAtTime(350, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      default:
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    if (onGameEvent) {
      onGameEvent({ type: 'sound_played', data: { sound: soundType } });
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((newPhase: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Calculate pressure from PV = nRT
  const calculatePressure = (v: number, t: number, n: number) => (n * R * t) / v;
  // Calculate volume from PV = nRT
  const calculateVolume = (p: number, t: number, n: number) => (n * R * t) / p;
  // Calculate temperature from PV = nRT
  const calculateTemperature = (p: number, v: number, n: number) => (p * v) / (n * R);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (lockedVariable === 'T') {
      const newPressure = calculatePressure(newVolume, temperature, moles);
      setPressure(newPressure);
    } else if (lockedVariable === 'P') {
      const newTemp = calculateTemperature(pressure, newVolume, moles);
      setTemperature(newTemp);
    }
    playSound(newVolume > volume ? 'expand' : 'compress');
    if (onGameEvent) {
      onGameEvent({ type: 'volume_adjusted', data: { volume: newVolume } });
    }
  }, [lockedVariable, temperature, pressure, moles, volume, playSound, onGameEvent]);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    setTemperature(newTemp);
    if (lockedVariable === 'V') {
      const newPressure = calculatePressure(volume, newTemp, moles);
      setPressure(newPressure);
    } else if (lockedVariable === 'P') {
      const newVol = calculateVolume(pressure, newTemp, moles);
      setVolume(newVol);
    }
    playSound('heat');
    if (onGameEvent) {
      onGameEvent({ type: 'temperature_adjusted', data: { temperature: newTemp } });
    }
  }, [lockedVariable, volume, pressure, moles, playSound, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({
        type: isCorrect ? 'prediction_correct' : 'prediction_incorrect',
        data: { prediction, correct: 'B' }
      });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({
        type: isCorrect ? 'twist_correct' : 'twist_incorrect',
        data: { prediction, correct: 'C' }
      });
    }
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
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
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_completed', data: { appIndex } });
    }
  }, [playSound, onGameEvent]);

  const testQuestions: TestQuestion[] = [
    {
      scenario: "A sealed balloon is taken from a warm room (25°C) and placed in a freezer (-18°C).",
      question: "What happens to the balloon?",
      options: [
        { text: "It expands because cold air is denser", correct: false },
        { text: "It shrinks because lower temperature means lower pressure and volume", correct: true },
        { text: "Nothing changes because it's sealed", correct: false },
        { text: "It pops from the cold", correct: false }
      ],
      explanation: "From PV = nRT, when T decreases with n constant, PV must decrease. For a flexible balloon, pressure stays roughly constant (atmospheric), so volume decreases."
    },
    {
      scenario: "A scuba diver at 30 meters depth has 2 liters of air in their lungs. They ascend to the surface without exhaling.",
      question: "What volume would the air in their lungs try to occupy at the surface?",
      options: [
        { text: "Still 2 liters", correct: false },
        { text: "About 4 liters", correct: false },
        { text: "About 8 liters (dangerous!)", correct: true },
        { text: "Less than 2 liters", correct: false }
      ],
      explanation: "At 30m depth, pressure is ~4 atm. At surface it's 1 atm. With constant T and n, when P decreases by 4×, V increases by 4× (from 2L to 8L). This is why divers must exhale while ascending!"
    },
    {
      scenario: "A car tire is inflated to 200 kPa on a cool morning (15°C). After highway driving, the tire temperature rises to 45°C.",
      question: "What is the approximate new pressure in the tire?",
      options: [
        { text: "Still 200 kPa - tires are built to handle heat", correct: false },
        { text: "About 220 kPa", correct: true },
        { text: "About 600 kPa", correct: false },
        { text: "The pressure decreases", correct: false }
      ],
      explanation: "Using P₁/T₁ = P₂/T₂ (constant V and n): 200/(273+15) = P₂/(273+45). P₂ = 200 × 318/288 ≈ 220 kPa. That's why tire pressure warnings often appear after long drives."
    },
    {
      scenario: "A rigid steel tank contains nitrogen gas at 500 kPa and 20°C. The tank is heated to 100°C.",
      question: "What happens to the pressure?",
      options: [
        { text: "Stays at 500 kPa because the tank doesn't expand", correct: false },
        { text: "Increases to about 635 kPa", correct: true },
        { text: "Decreases because hot gas is less dense", correct: false },
        { text: "The tank explodes immediately", correct: false }
      ],
      explanation: "With constant V and n: P₁/T₁ = P₂/T₂. 500/(293) = P₂/(373). P₂ = 500 × 373/293 ≈ 635 kPa. Gay-Lussac's Law: pressure and temperature are directly proportional at constant volume."
    },
    {
      scenario: "A syringe with its end blocked contains 10 mL of air. You push the plunger, compressing the air to 5 mL.",
      question: "What happens to the pressure inside?",
      options: [
        { text: "Stays the same", correct: false },
        { text: "Doubles (becomes 2× original)", correct: true },
        { text: "Quadruples (becomes 4× original)", correct: false },
        { text: "Halves (becomes 0.5× original)", correct: false }
      ],
      explanation: "Boyle's Law: P₁V₁ = P₂V₂ at constant T and n. If V halves (10 mL → 5 mL), then P must double. This is why it gets harder to push as you compress more."
    },
    {
      scenario: "Two identical containers hold different gases at the same temperature and pressure. Container A has helium (He, molar mass 4), Container B has argon (Ar, molar mass 40).",
      question: "How do the number of gas molecules compare?",
      options: [
        { text: "Container B has more molecules (argon is heavier)", correct: false },
        { text: "Container A has more molecules (helium is lighter)", correct: false },
        { text: "Both containers have the same number of molecules", correct: true },
        { text: "Cannot determine without knowing the masses", correct: false }
      ],
      explanation: "From PV = nRT, if P, V, and T are equal, then n (moles) must be equal. Equal moles means equal numbers of molecules (Avogadro's principle). The type of gas doesn't matter!"
    },
    {
      scenario: "A hot air balloon envelope holds 2800 m³ of air. Outside air is at 20°C and 101 kPa.",
      question: "If the air inside is heated to 100°C while keeping pressure constant (open bottom), what volume would the same mass of air occupy?",
      options: [
        { text: "About 2800 m³ (no change)", correct: false },
        { text: "About 3560 m³", correct: true },
        { text: "About 14,000 m³", correct: false },
        { text: "About 2200 m³", correct: false }
      ],
      explanation: "Charles's Law: V₁/T₁ = V₂/T₂. 2800/293 = V₂/373. V₂ = 2800 × 373/293 ≈ 3560 m³. But the envelope can only hold 2800 m³, so some air escapes - this is what makes the balloon lighter!"
    },
    {
      scenario: "A weather balloon is released at sea level with volume 1 m³. It rises to an altitude where pressure is 0.3 atm and temperature is -50°C.",
      question: "Approximately what volume does the balloon expand to?",
      options: [
        { text: "About 1 m³ (rubber stretches to compensate)", correct: false },
        { text: "About 2.5 m³", correct: true },
        { text: "About 3.3 m³", correct: false },
        { text: "About 10 m³", correct: false }
      ],
      explanation: "Using combined gas law: P₁V₁/T₁ = P₂V₂/T₂. With T₁=288K, T₂=223K: (1)(1)/288 = (0.3)(V₂)/223. V₂ = 223/(0.3×288) ≈ 2.5 m³. Temperature decrease partially offsets pressure decrease."
    },
    {
      scenario: "In the ideal gas law PV = nRT, R is the gas constant with value 8.314 J/(mol·K).",
      question: "What does R represent physically?",
      options: [
        { text: "The rate of gas reactions", correct: false },
        { text: "The energy per mole per degree of temperature", correct: true },
        { text: "The density of the gas", correct: false },
        { text: "The resistance to compression", correct: false }
      ],
      explanation: "R connects energy and temperature for gases. R = 8.314 J/(mol·K) means each mole of gas gains 8.314 joules of kinetic energy per kelvin of temperature increase. It's the same for ALL ideal gases!"
    },
    {
      scenario: "At STP (Standard Temperature and Pressure: 0°C and 101.325 kPa), one mole of any ideal gas occupies exactly 22.4 liters.",
      question: "If you have 0.5 moles of oxygen at STP, what volume does it occupy?",
      options: [
        { text: "44.8 liters (oxygen is O₂)", correct: false },
        { text: "22.4 liters (one mole equivalent)", correct: false },
        { text: "11.2 liters", correct: true },
        { text: "5.6 liters", correct: false }
      ],
      explanation: "Volume is directly proportional to moles at constant T and P. Half the moles = half the volume. 0.5 mol × 22.4 L/mol = 11.2 L. The molecular formula (O₂) doesn't change this."
    }
  ];

  const applications: TransferApp[] = [
    {
      icon: "🚗",
      title: "Automotive Tire Pressure",
      short: "Tire Safety",
      tagline: "Why your tire pressure light comes on after driving",
      description: "Car tires are calibrated using the ideal gas law to maintain safe pressure across temperature ranges from winter cold to summer highway heat.",
      connection: "Tire rubber has fixed volume, so as temperature increases from driving friction and hot roads, pressure increases proportionally (Gay-Lussac's Law).",
      howItWorks: "TPMS sensors monitor pressure constantly. A tire inflated to 32 psi at 20°C will reach ~35 psi at 50°C - that's why you should check pressure when tires are cold.",
      stats: [
        { value: "10%", label: "Pressure increase per 30°C rise" },
        { value: "3-4 psi", label: "Typical seasonal variation" },
        { value: "25%", label: "Fuel loss from underinflation" },
        { value: "6 months", label: "Average time for 1 psi natural loss" }
      ],
      examples: [
        "Morning vs evening pressure differences",
        "Altitude adjustments for mountain driving",
        "Race car tire warmup procedures",
        "Aircraft tire inflation with nitrogen"
      ],
      companies: ["Michelin", "Goodyear", "Continental", "Bridgestone"],
      futureImpact: "Smart tires with real-time pressure compensation and automatic inflation systems are being developed for autonomous vehicles.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🎈",
      title: "Weather Balloons",
      short: "Meteorology",
      tagline: "How balloons expand 100× as they rise through the atmosphere",
      description: "Weather balloons carrying radiosondes expand dramatically as they ascend through decreasing atmospheric pressure, following Boyle's Law.",
      connection: "As altitude increases, external pressure drops from 101 kPa to near zero. With fixed gas amount, volume must increase inversely - balloons expand until they burst at ~30 km altitude.",
      howItWorks: "Balloons are partially filled at launch (~1 m³). As they rise, P drops → V increases. At burst altitude, they've expanded to 8-10 m³. The radiosonde parachutes down with data.",
      stats: [
        { value: "~2 hrs", label: "Flight time to burst" },
        { value: "30 km", label: "Typical burst altitude" },
        { value: "8-10×", label: "Volume expansion factor" },
        { value: "1,800+", label: "Balloons launched daily worldwide" }
      ],
      examples: [
        "Twice-daily weather balloon launches",
        "Ozone layer monitoring",
        "Cosmic ray detection",
        "High-altitude photography"
      ],
      companies: ["NOAA", "UK Met Office", "Japan Meteorological Agency", "Vaisala"],
      futureImpact: "Stratospheric balloon platforms may provide persistent surveillance and communications using controlled altitude changes via gas heating/cooling.",
      color: "from-sky-600 to-blue-600"
    },
    {
      icon: "🤿",
      title: "Scuba Diving Physics",
      short: "Diving Safety",
      tagline: "Why divers must never hold their breath while ascending",
      description: "Scuba diving safety fundamentally relies on understanding how gas volumes change with pressure at different depths.",
      connection: "At 10m depth, pressure is 2 atm. At 30m, it's 4 atm. Gas volume is inversely proportional to pressure - lungs full of air at depth would catastrophically expand if ascending without exhaling.",
      howItWorks: "Regulators deliver air at ambient pressure. A diver at 30m breathes air at 4× surface pressure. That same breath at the surface would occupy 4× the volume - causing fatal lung overexpansion.",
      stats: [
        { value: "4×", label: "Pressure increase at 30m depth" },
        { value: "2 m/min", label: "Safe ascent rate" },
        { value: "100%", label: "Volume doubling from 10m to surface" },
        { value: "#1", label: "Rule: Never hold breath" }
      ],
      examples: [
        "Decompression illness prevention",
        "Buoyancy control at depth",
        "Air consumption calculations",
        "Nitrogen narcosis management"
      ],
      companies: ["PADI", "SSI", "Aqualung", "Suunto"],
      futureImpact: "Rebreathers with real-time gas mixing optimization use ideal gas calculations to maximize dive time while minimizing decompression requirements.",
      color: "from-teal-600 to-emerald-600"
    },
    {
      icon: "🏭",
      title: "Industrial Gas Storage",
      short: "Gas Cylinders",
      tagline: "How millions of liters fit into small tanks",
      description: "Compressed gas cylinders store enormous quantities of gas by exploiting the relationship between pressure and volume in the ideal gas law.",
      connection: "PV = nRT means high pressure = small volume for the same amount of gas. A 50L cylinder at 200 atm holds the same gas as 10,000 liters at atmospheric pressure!",
      howItWorks: "Industrial compressors force gas into cylinders until target pressure is reached. Temperature must be monitored - compression heats gas, requiring cooling for safe storage.",
      stats: [
        { value: "200-300 bar", label: "Typical cylinder pressure" },
        { value: "200×", label: "Volume reduction factor" },
        { value: "6,000 psi", label: "Medical oxygen standard" },
        { value: "700 bar", label: "Hydrogen fuel cell pressure" }
      ],
      examples: [
        "Medical oxygen tanks",
        "Welding gas cylinders",
        "Fire suppression systems",
        "Hydrogen fuel cell vehicles"
      ],
      companies: ["Air Liquide", "Linde", "Air Products", "Praxair"],
      futureImpact: "Hydrogen economy depends on high-pressure storage (700+ bar) or cryogenic liquefaction for practical vehicle range and refueling infrastructure.",
      color: "from-orange-600 to-red-600"
    }
  ];

  const teachingMilestones = [
    { phase: 'hook', concept: 'Gases are compressible - their volume changes with conditions' },
    { phase: 'predict', concept: 'Pressure, volume, and temperature are interconnected' },
    { phase: 'play', concept: 'PV = nRT quantifies the relationship between gas properties' },
    { phase: 'review', concept: 'When one variable changes, others must adjust proportionally' },
    { phase: 'twist_predict', concept: 'Real-world applications have life-or-death implications' },
    { phase: 'twist_play', concept: 'Scuba diving depth changes demonstrate dramatic volume effects' },
    { phase: 'transfer', concept: 'Ideal gas law governs weather balloons, tires, and industrial processes' },
    { phase: 'test', concept: 'Apply quantitative reasoning to predict gas behavior' },
    { phase: 'mastery', concept: 'Master of thermodynamic gas relationships' }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderGasContainer = (width: number, height: number, showLabels: boolean = true) => {
    const containerWidth = 60 * Math.cbrt(volume / 1.0);
    const containerHeight = 50 * Math.cbrt(volume / 1.0);
    const offsetX = (80 - containerWidth) / 2 + 10;
    const offsetY = (80 - containerHeight) / 2 + 10;

    const speedFactor = Math.sqrt(temperature / 300);
    const pressureIntensity = Math.min(pressure / 200, 1);

    return (
      <svg width={width} height={height} viewBox="0 0 100 100" className="overflow-visible">
        <defs>
          <linearGradient id="containerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="gasGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`rgba(59, 130, 246, ${pressureIntensity * 0.3})`} />
            <stop offset="100%" stopColor={`rgba(147, 51, 234, ${pressureIntensity * 0.4})`} />
          </linearGradient>
          <filter id="moleculeGlow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="moleculeGrad">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
        </defs>

        {/* Container background */}
        <rect x={offsetX} y={offsetY} width={containerWidth} height={containerHeight}
              fill="url(#gasGrad)" stroke="url(#containerGrad)" strokeWidth="3" rx="3" />

        {/* Piston/lid at top */}
        <rect x={offsetX - 2} y={offsetY - 5} width={containerWidth + 4} height="8"
              fill="#64748b" stroke="#475569" strokeWidth="1" rx="2" />
        <rect x={offsetX + containerWidth/2 - 3} y={offsetY - 15} width="6" height="12"
              fill="#475569" />

        {/* Gas molecules */}
        {moleculePositions.map((mol, i) => {
          const scaledX = offsetX + (mol.x - 10) / 80 * containerWidth;
          const scaledY = offsetY + (mol.y - 10) / 80 * containerHeight;
          const size = 1.5 + speedFactor * 0.5;
          return (
            <circle
              key={i}
              cx={scaledX}
              cy={scaledY}
              r={size}
              fill="url(#moleculeGrad)"
              filter="url(#moleculeGlow)"
              opacity={0.8}
            >
              <animate
                attributeName="opacity"
                values="0.6;0.9;0.6"
                dur={`${0.5 + Math.random() * 0.5}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {/* Labels */}
        {showLabels && (
          <>
            <text x="50" y="98" textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="bold">
              V = {volume.toFixed(2)} L
            </text>
            <text x="5" y="50" textAnchor="middle" fill="#94a3b8" fontSize="5"
                  transform="rotate(-90, 5, 50)">
              P = {pressure.toFixed(0)} kPa
            </text>
          </>
        )}

        {/* Temperature indicator (heat waves at bottom) */}
        {temperature > 350 && (
          <g>
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M${offsetX + 10 + i * 15},${offsetY + containerHeight + 2}
                    Q${offsetX + 15 + i * 15},${offsetY + containerHeight + 6}
                    ${offsetX + 20 + i * 15},${offsetY + containerHeight + 2}`}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.5"
                opacity="0.6"
              >
                <animate
                  attributeName="opacity"
                  values="0.3;0.8;0.3"
                  dur="0.8s"
                  repeatCount="indefinite"
                  begin={`${i * 0.2}s`}
                />
              </path>
            ))}
          </g>
        )}
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-blue-400 text-sm font-medium">Thermodynamics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-3`}>
        The Ideal Gas Law
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        One equation to rule the behavior of all gases
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        <div className="flex justify-center mb-6">
          {renderGasContainer(isMobile ? 200 : 250, isMobile ? 200 : 250)}
        </div>
        <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-slate-300 mb-4`}>
          Why does a balloon shrink in cold weather? Why must scuba divers exhale while ascending?
        </p>
        <p className="text-lg text-blue-400 font-medium mb-4">
          One simple equation explains it all: <span className="text-2xl font-bold">PV = nRT</span>
        </p>
        <div className="grid grid-cols-4 gap-2 text-sm text-slate-400 mb-4">
          <div><span className="text-blue-400 font-bold">P</span> = Pressure</div>
          <div><span className="text-green-400 font-bold">V</span> = Volume</div>
          <div><span className="text-purple-400 font-bold">n</span> = Moles</div>
          <div><span className="text-orange-400 font-bold">T</span> = Temperature</div>
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsAnimating(true); }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
        >
          Watch Molecules Move
        </button>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Explore the Law
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

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-300 mb-4`}>
          A sealed syringe contains air at room temperature. You push the plunger to compress the air to half its original volume.
        </p>
        <div className="flex justify-center mb-4">
          <svg width={isMobile ? 200 : 280} height={isMobile ? 80 : 100} viewBox="0 0 280 100">
            <defs>
              <linearGradient id="syringeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>
            {/* Syringe body */}
            <rect x="30" y="30" width="180" height="40" fill="url(#syringeGrad)" stroke="#64748b" strokeWidth="2" rx="3" />
            {/* Plunger */}
            <rect x="210" y="25" width="15" height="50" fill="#475569" rx="2" />
            <rect x="220" y="40" width="40" height="20" fill="#334155" rx="3" />
            {/* Air inside */}
            <rect x="35" y="35" width="170" height="30" fill="rgba(59, 130, 246, 0.2)" rx="2" />
            {/* Arrow showing compression */}
            <path d="M260,50 L230,50" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrowOrange)" />
            <text x="245" y="75" fill="#f59e0b" fontSize="12" fontWeight="bold">Push</text>
            <defs>
              <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-cyan-400 font-medium">
          What happens to the pressure inside the syringe?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Pressure stays the same (air just gets pushed closer together)' },
          { id: 'B', text: 'Pressure doubles (inverse relationship with volume)' },
          { id: 'C', text: 'Pressure quadruples (square of compression ratio)' },
          { id: 'D', text: 'Pressure decreases (more room means less crowding)' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! This is <span className="text-cyan-400">Boyle's Law</span>: P₁V₁ = P₂V₂
          </p>
          <p className="text-slate-400 text-sm mt-2">
            When volume halves, pressure doubles - they're inversely proportional at constant temperature!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
          >
            Explore the Gas Lab →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>Ideal Gas Laboratory</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4 w-full max-w-3xl">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0">
            {renderGasContainer(isMobile ? 180 : 220, isMobile ? 180 : 220)}
          </div>

          <div className="flex-1 w-full space-y-4">
            {/* Lock selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-slate-400 text-sm">Hold constant:</span>
              <div className="flex gap-2">
                {(['T', 'V', 'P'] as const).map(v => (
                  <button
                    key={v}
                    onMouseDown={(e) => { e.preventDefault(); setLockedVariable(v); }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      lockedVariable === v
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {v === 'T' ? 'Temperature' : v === 'V' ? 'Volume' : 'Pressure'}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume slider */}
            <div className={lockedVariable === 'V' ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-400 font-medium">Volume (V)</span>
                <span className="text-white">{volume.toFixed(2)} L</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>

            {/* Temperature slider */}
            <div className={lockedVariable === 'T' ? 'opacity-50 pointer-events-none' : ''}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-orange-400 font-medium">Temperature (T)</span>
                <span className="text-white">{temperature.toFixed(0)} K ({(temperature - 273).toFixed(0)}°C)</span>
              </div>
              <input
                type="range"
                min="200"
                max="500"
                step="10"
                value={temperature}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Pressure display */}
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium">Pressure (P)</span>
                <span className="text-2xl font-bold text-white">{pressure.toFixed(0)} kPa</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                  style={{ width: `${Math.min(pressure / 3, 100)}%` }}
                />
              </div>
            </div>

            {/* Equation display */}
            <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-lg p-3 text-center">
              <div className="text-lg font-mono text-cyan-400">
                <span className="text-blue-400">{pressure.toFixed(0)}</span>
                <span className="text-slate-500"> × </span>
                <span className="text-green-400">{volume.toFixed(2)}</span>
                <span className="text-slate-500"> = </span>
                <span className="text-purple-400">{moles.toFixed(3)}</span>
                <span className="text-slate-500"> × 8.314 × </span>
                <span className="text-orange-400">{temperature.toFixed(0)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                PV = {(pressure * volume).toFixed(1)} ≈ nRT = {(moles * R * temperature).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onMouseDown={(e) => { e.preventDefault(); setIsAnimating(!isAnimating); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isAnimating
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isAnimating ? '⏸ Pause Animation' : '▶ Animate Molecules'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Key Relationships:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-bold mb-1">Boyle's Law</div>
            <div className="text-slate-300">P₁V₁ = P₂V₂</div>
            <div className="text-slate-500 text-xs">(constant T, n)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-green-400 font-bold mb-1">Charles's Law</div>
            <div className="text-slate-300">V₁/T₁ = V₂/T₂</div>
            <div className="text-slate-500 text-xs">(constant P, n)</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-orange-400 font-bold mb-1">Gay-Lussac's Law</div>
            <div className="text-slate-300">P₁/T₁ = P₂/T₂</div>
            <div className="text-slate-500 text-xs">(constant V, n)</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Understanding PV = nRT</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Equation</h3>
          <div className="text-3xl font-bold text-white text-center mb-4 font-mono">
            PV = nRT
          </div>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <span className="text-blue-400 font-bold">P</span> = Pressure (Pa or kPa)</li>
            <li>• <span className="text-green-400 font-bold">V</span> = Volume (L or m³)</li>
            <li>• <span className="text-purple-400 font-bold">n</span> = Amount of gas (moles)</li>
            <li>• <span className="text-yellow-400 font-bold">R</span> = Gas constant (8.314 J/mol·K)</li>
            <li>• <span className="text-orange-400 font-bold">T</span> = Temperature (Kelvin!)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Why "Ideal"?</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Assumes gas molecules have <span className="text-cyan-400">no volume</span></li>
            <li>• Assumes <span className="text-cyan-400">no intermolecular forces</span></li>
            <li>• Assumes perfectly <span className="text-cyan-400">elastic collisions</span></li>
            <li>• Works best at high T and low P</li>
            <li>• Real gases deviate at extremes (van der Waals)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Key Insight</h3>
          <div className="text-slate-300 space-y-3">
            <p>
              If you know any three of P, V, n, and T, you can calculate the fourth!
            </p>
            <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-blue-400">P = nRT/V</span></div>
                <div><span className="text-green-400">V = nRT/P</span></div>
                <div><span className="text-orange-400">T = PV/nR</span></div>
                <div><span className="text-purple-400">n = PV/RT</span></div>
              </div>
            </div>
            <p className="text-cyan-400 font-medium">
              At STP (0°C, 101.325 kPa): 1 mole of any gas occupies exactly 22.4 liters!
            </p>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        See a Life-or-Death Application →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>The Diving Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-300 mb-4`}>
          A scuba diver at 30 meters depth takes a full breath from their tank (2 liters of air at 4 atmospheres pressure). They then make a critical mistake: <span className="text-red-400 font-bold">they hold their breath and swim rapidly to the surface</span>.
        </p>
        <div className="flex justify-center mb-4">
          <svg width={isMobile ? 160 : 200} height={isMobile ? 200 : 240} viewBox="0 0 200 240">
            <defs>
              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </linearGradient>
            </defs>
            {/* Water background */}
            <rect x="0" y="0" width="200" height="240" fill="url(#waterGrad)" />

            {/* Depth markers */}
            <text x="10" y="20" fill="white" fontSize="10" opacity="0.7">Surface (1 atm)</text>
            <line x1="0" y1="25" x2="50" y2="25" stroke="white" strokeOpacity="0.3" strokeDasharray="4" />

            <text x="10" y="90" fill="white" fontSize="10" opacity="0.7">10m (2 atm)</text>
            <line x1="0" y1="95" x2="50" y2="95" stroke="white" strokeOpacity="0.3" strokeDasharray="4" />

            <text x="10" y="160" fill="white" fontSize="10" opacity="0.7">20m (3 atm)</text>
            <line x1="0" y1="165" x2="50" y2="165" stroke="white" strokeOpacity="0.3" strokeDasharray="4" />

            <text x="10" y="225" fill="white" fontSize="10" opacity="0.7">30m (4 atm)</text>
            <line x1="0" y1="230" x2="50" y2="230" stroke="white" strokeOpacity="0.3" strokeDasharray="4" />

            {/* Diver at bottom */}
            <g transform="translate(130, 200)">
              <ellipse cx="0" cy="0" rx="12" ry="20" fill="#1e293b" />
              <circle cx="0" cy="-25" r="12" fill="#fcd34d" />
              <rect x="-8" y="-12" width="16" height="8" fill="#64748b" />
              <ellipse cx="0" cy="5" rx="10" ry="5" fill="rgba(59, 130, 246, 0.5)" stroke="#3b82f6" strokeWidth="1" />
              <text x="0" y="8" textAnchor="middle" fill="white" fontSize="6">2L</text>
            </g>

            {/* Arrow going up */}
            <path d="M130,170 L130,50" stroke="#ef4444" strokeWidth="3" fill="none" markerEnd="url(#arrowRed)" />
            <text x="145" y="110" fill="#ef4444" fontSize="10" fontWeight="bold">Ascending!</text>

            <defs>
              <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <path d="M0,0 L0,10 L10,5 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-red-400 font-medium">
          What happens to the air in their lungs as they reach the surface?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The air stays at 2 liters (lungs are elastic)' },
          { id: 'B', text: 'The air compresses to 0.5 liters' },
          { id: 'C', text: 'The air tries to expand to 8 liters (4× volume!) - potentially fatal' },
          { id: 'D', text: 'The air slowly leaks out through the skin' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-red-900/30 border border-red-500 rounded-xl max-w-xl">
          <p className="text-red-400 font-semibold">
            ⚠️ Correct, and this is why the #1 rule of scuba diving is: NEVER HOLD YOUR BREATH!
          </p>
          <p className="text-slate-300 text-sm mt-2">
            At 4 atm (30m), 2L of air would expand to 8L at the surface (1 atm). Since lungs can only hold ~6L max, this causes <span className="text-red-400">pulmonary barotrauma</span> - air embolism that can be fatal.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>Pressure vs Depth</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 max-w-3xl w-full">
        <div className="flex justify-center mb-6">
          <svg width={isMobile ? 280 : 400} height={isMobile ? 200 : 250} viewBox="0 0 400 250">
            <defs>
              <linearGradient id="depthWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0c4a6e" />
              </linearGradient>
            </defs>

            {/* Background water */}
            <rect x="50" y="20" width="300" height="200" fill="url(#depthWater)" rx="5" />

            {/* Depth levels with expanding balloons */}
            {[
              { depth: 0, pressure: 1, volume: 4, y: 30, label: "Surface" },
              { depth: 10, pressure: 2, volume: 2, y: 80, label: "10m" },
              { depth: 20, pressure: 3, volume: 1.33, y: 130, label: "20m" },
              { depth: 30, pressure: 4, volume: 1, y: 180, label: "30m" }
            ].map((level, i) => (
              <g key={i}>
                {/* Depth line */}
                <line x1="50" y1={level.y} x2="350" y2={level.y} stroke="white" strokeOpacity="0.3" strokeDasharray="4" />

                {/* Depth label */}
                <text x="45" y={level.y + 4} textAnchor="end" fill="white" fontSize="10">{level.label}</text>

                {/* Pressure label */}
                <text x="70" y={level.y + 4} fill="#fcd34d" fontSize="9">{level.pressure} atm</text>

                {/* Balloon */}
                <ellipse
                  cx="200"
                  cy={level.y}
                  rx={10 * level.volume}
                  ry={8 * level.volume}
                  fill="rgba(239, 68, 68, 0.7)"
                  stroke="#ef4444"
                  strokeWidth="2"
                />
                <text x="200" y={level.y + 3} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                  {level.volume.toFixed(1)}L
                </text>

                {/* Volume label */}
                <text x="280" y={level.y + 4} fill="#4ade80" fontSize="9">V = {level.volume.toFixed(2)}L</text>
              </g>
            ))}

            {/* Boyle's Law annotation */}
            <text x="200" y="240" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              P₁V₁ = P₂V₂ → 4 atm × 1L = 1 atm × 4L
            </text>
          </svg>
        </div>

        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4">
          <h4 className="text-red-400 font-bold mb-2">⚠️ Why This Matters</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>• At 30m, pressure is 4× surface pressure</li>
            <li>• Air compressed to 1/4 its surface volume</li>
            <li>• On ascent: volume increases by 4× if you hold your breath</li>
            <li>• Lungs can rupture at just 1-2m depth if breath is held!</li>
          </ul>
        </div>

        <div className="bg-emerald-900/30 border border-emerald-500 rounded-lg p-4">
          <h4 className="text-emerald-400 font-bold mb-2">✓ Safe Diving Practice</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>• <span className="text-emerald-400 font-bold">NEVER hold your breath</span> while ascending</li>
            <li>• Exhale continuously during emergency ascents</li>
            <li>• Ascend slowly (max 9m/min) to allow gas equalization</li>
            <li>• Complete safety stops at 5m for 3 minutes</li>
          </ul>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Ideal Gas Law Saves Lives!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Understanding PV = nRT is critical in:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><span className="text-cyan-400">Scuba diving</span> - Prevents fatal lung overexpansion</li>
            <li><span className="text-cyan-400">Aviation</span> - Cabin pressurization protects passengers</li>
            <li><span className="text-cyan-400">Medicine</span> - Hyperbaric chambers treat decompression sickness</li>
            <li><span className="text-cyan-400">Space travel</span> - Suit and cabin pressure management</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            A simple equation: P₁V₁/T₁ = P₂V₂/T₂ can predict life-threatening situations!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? 'bg-blue-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{applications[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
            <p className="text-cyan-400 text-sm">{applications[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{applications[activeAppTab].description}</p>

        <div className={`bg-gradient-to-r ${applications[activeAppTab].color} rounded-xl p-4 mb-4`}>
          <h4 className="text-white font-bold mb-2">How PV = nRT Applies</h4>
          <p className="text-white/90 text-sm">{applications[activeAppTab].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-slate-400 font-bold mb-2">How It Works</h4>
          <p className="text-slate-300 text-sm">{applications[activeAppTab].howItWorks}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {applications[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-cyan-400">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="text-slate-400 font-bold mb-2">Examples</h4>
          <div className="flex flex-wrap gap-2">
            {applications[activeAppTab].examples.map((ex, i) => (
              <span key={i} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">{ex}</span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-slate-400 font-bold mb-2">Industry Leaders</h4>
          <div className="flex flex-wrap gap-2">
            {applications[activeAppTab].companies.map((company, i) => (
              <span key={i} className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-sm text-blue-300">{company}</span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg p-3">
          <h4 className="text-emerald-400 font-bold text-sm mb-1">Future Impact</h4>
          <p className="text-slate-300 text-sm">{applications[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
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
                        ? 'bg-blue-600 text-white'
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
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); playSound('complete'); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered the Ideal Gas Law!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div className="space-y-3 mb-6">
            {testQuestions.map((q, i) => (
              <div key={i} className={`p-3 rounded-lg ${
                q.options[testAnswers[i]]?.correct
                  ? 'bg-emerald-900/30 border border-emerald-500'
                  : 'bg-red-900/30 border border-red-500'
              }`}>
                <p className="text-sm font-medium text-white mb-1">Q{i + 1}: {q.options[testAnswers[i]]?.correct ? '✓' : '✗'}</p>
                <p className="text-xs text-slate-400">{q.explanation}</p>
              </div>
            ))}
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
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚗️</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Ideal Gas Law Master!
        </h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered PV = nRT and can predict gas behavior in any situation!
        </p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6 font-mono text-2xl text-cyan-400">
          PV = nRT
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-slate-300">Boyle's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌡️</div>
            <p className="text-sm text-slate-300">Charles's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔥</div>
            <p className="text-sm text-slate-300">Gay-Lussac's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🤿</div>
            <p className="text-sm text-slate-300">Diving Safety</p>
          </div>
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
      {/* Premium Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-transparent to-cyan-950/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      {/* Ambient Glow Circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>
            Ideal Gas Law
          </span>
          <div className="flex gap-1.5 items-center">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p ? 'bg-blue-500 w-6' : phase > i ? 'bg-blue-500 w-2' : 'bg-slate-600 w-2'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default IdealGasLawRenderer;
