import React, { useState, useEffect, useCallback, useRef } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// ELECTROMAGNETIC INDUCTION - Faraday's Law and Lenz's Law
// ════════════════════════════════════════════════════════════════════════════
// Core Physics:
// - Faraday's Law: EMF = -dΦ/dt (induced EMF equals negative rate of flux change)
// - Magnetic Flux: Φ = B × A × cos(θ) (field × area × angle factor)
// - Lenz's Law: Induced current opposes the change that created it
// - Motional EMF: EMF = BLv (for conductor moving through field)
// ════════════════════════════════════════════════════════════════════════════

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'flux_changed'
  | 'emf_induced'
  | 'magnet_moved'
  | 'coil_rotated'
  | 'field_adjusted'
  | 'lenz_demonstrated'
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
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const ElectromagneticInductionRenderer: React.FC<Props> = ({
  phase: initialPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const phaseToIndex: Record<string, number> = {
    'hook': 0, 'predict': 1, 'play': 2, 'review': 3,
    'twist_predict': 4, 'twist_play': 5, 'twist_review': 6,
    'transfer': 7, 'test': 8, 'mastery': 9
  };
  const [phase, setPhase] = useState(phaseToIndex[initialPhase] || 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [magnetPosition, setMagnetPosition] = useState(0); // -100 to 100 (relative to coil)
  const [magnetVelocity, setMagnetVelocity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fieldStrength, setFieldStrength] = useState(1.0); // Tesla (normalized)
  const [coilTurns, setCoilTurns] = useState(50);
  const [coilArea, setCoilArea] = useState(0.01); // m²
  const [inducedEMF, setInducedEMF] = useState(0);
  const [inducedCurrent, setInducedCurrent] = useState(0);
  const [fluxHistory, setFluxHistory] = useState<number[]>([]);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [selectedDemo, setSelectedDemo] = useState<'magnet' | 'rotation' | 'field'>('magnet');
  const [showFieldLines, setShowFieldLines] = useState(true);

  const navigationLockRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Explore', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Web Audio API sound system
  const playSound = useCallback((type: 'click' | 'correct' | 'incorrect' | 'complete' | 'buzz' | 'spark') => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch (type) {
        case 'click':
          oscillator.frequency.value = 600;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.08);
          break;
        case 'correct':
          oscillator.frequency.value = 523;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.value = 200;
          oscillator.type = 'sawtooth';
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.15);
          oscillator.stop(audioContext.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.frequency.value = 440;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.frequency.setValueAtTime(554, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3);
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
        case 'buzz':
          oscillator.frequency.value = 120;
          oscillator.type = 'sawtooth';
          gainNode.gain.value = 0.08;
          oscillator.start();
          gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.2);
          oscillator.stop(audioContext.currentTime + 0.25);
          break;
        case 'spark':
          oscillator.frequency.value = 2000;
          oscillator.type = 'square';
          gainNode.gain.value = 0.05;
          oscillator.start();
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.05);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
      }
    } catch (e) {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('click');
    setPhase(newPhase);

    if (onPhaseComplete) {
      onPhaseComplete();
    }

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  // Calculate magnetic flux through the coil
  const calculateFlux = useCallback(() => {
    // Flux depends on magnet position (closer = stronger field through coil)
    // Maximum flux when magnet is at coil center (position = 0)
    const distanceFactor = Math.exp(-Math.pow(magnetPosition / 50, 2));
    const flux = fieldStrength * coilArea * coilTurns * distanceFactor * Math.cos(rotationAngle * Math.PI / 180);
    return flux;
  }, [magnetPosition, fieldStrength, coilArea, coilTurns, rotationAngle]);

  // Calculate induced EMF from rate of flux change
  const calculateEMF = useCallback((oldFlux: number, newFlux: number, dt: number) => {
    // EMF = -N × dΦ/dt (Faraday's Law)
    const dFlux = newFlux - oldFlux;
    const emf = -coilTurns * (dFlux / dt);
    return emf;
  }, [coilTurns]);

  // Magnet animation
  useEffect(() => {
    if (!isAnimating) return;

    let lastFlux = calculateFlux();
    const dt = 0.016; // ~60fps

    const animate = () => {
      setMagnetPosition(prev => {
        // Oscillate magnet through coil
        const newPos = prev + magnetVelocity;

        // Bounce at boundaries
        if (newPos > 100 || newPos < -100) {
          setMagnetVelocity(v => -v * 0.9);
          return prev;
        }

        return newPos;
      });

      // Calculate new flux and EMF
      const newFlux = calculateFlux();
      const emf = calculateEMF(lastFlux, newFlux, dt);
      setInducedEMF(emf * 100); // Scale for display
      setInducedCurrent(emf * 10); // Simplified: I = EMF/R with R normalized

      setFluxHistory(prev => {
        const updated = [...prev, newFlux];
        if (updated.length > 100) updated.shift();
        return updated;
      });

      lastFlux = newFlux;

      if (Math.abs(emf) > 0.1) {
        playSound('buzz');
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, magnetVelocity, calculateFlux, calculateEMF, playSound]);

  const startMagnetDemo = useCallback(() => {
    setMagnetPosition(-80);
    setMagnetVelocity(3);
    setIsAnimating(true);
    setFluxHistory([]);
  }, []);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'correct' : 'incorrect');

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });

    playSound('click');

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');

    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound]);

  // Test questions with scenarios and explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A lab technician moves a bar magnet quickly toward a coil of wire connected to a galvanometer. The needle deflects to the right.",
      question: "What happens to the galvanometer when the magnet is pulled away at the same speed?",
      options: [
        { text: "The needle stays in the center", correct: false },
        { text: "The needle deflects to the left (opposite direction)", correct: true },
        { text: "The needle deflects further to the right", correct: false },
        { text: "The galvanometer breaks from the reversed current", correct: false }
      ],
      explanation: "Lenz's Law tells us the induced current opposes the change in flux. Moving the magnet toward the coil increases flux, inducing current in one direction. Moving it away decreases flux, inducing current in the opposite direction."
    },
    {
      scenario: "An engineer designs two generators with identical coils but different rotation speeds. Generator A spins at 60 Hz and Generator B at 30 Hz.",
      question: "How do their induced EMFs compare (assuming same magnetic field)?",
      options: [
        { text: "Generator A produces twice the EMF", correct: true },
        { text: "Both produce the same EMF", correct: false },
        { text: "Generator B produces twice the EMF", correct: false },
        { text: "Generator A produces four times the EMF", correct: false }
      ],
      explanation: "EMF = -N(dΦ/dt). Faster rotation means flux changes more rapidly (higher dΦ/dt), directly proportional to frequency. Double the speed means double the rate of flux change, hence double the EMF."
    },
    {
      scenario: "A physics student wraps 100 turns of wire around an iron core and 50 turns around another identical core, connecting both to separate light bulbs.",
      question: "When exposed to the same changing magnetic field, which bulb glows brighter?",
      options: [
        { text: "The 50-turn coil's bulb glows brighter", correct: false },
        { text: "Both glow equally bright", correct: false },
        { text: "The 100-turn coil's bulb glows brighter", correct: true },
        { text: "Neither glows - iron cores block induction", correct: false }
      ],
      explanation: "EMF = -N(dΦ/dt) shows that induced voltage is directly proportional to the number of turns (N). The 100-turn coil produces twice the EMF, delivering more power to its bulb."
    },
    {
      scenario: "A wireless phone charger uses a coil in the base that carries alternating current. A phone with a receiver coil is placed on top.",
      question: "Why does the phone charge even though no wires connect them?",
      options: [
        { text: "The charger sends radio waves that carry energy", correct: false },
        { text: "Static electricity jumps between the devices", correct: false },
        { text: "The changing magnetic field from the base coil induces current in the phone's coil", correct: true },
        { text: "Heat conduction transfers the energy", correct: false }
      ],
      explanation: "Wireless charging uses electromagnetic induction. The alternating current in the base creates a changing magnetic field, which passes through the phone's coil and induces an alternating current that charges the battery."
    },
    {
      scenario: "An aluminum ring sits on a table above an electromagnet. When AC current flows through the electromagnet, the ring hovers in the air.",
      question: "What causes the ring to levitate?",
      options: [
        { text: "The ring becomes magnetized and is attracted upward", correct: false },
        { text: "Hot air from the electromagnet pushes the ring up", correct: false },
        { text: "Induced currents in the ring create an opposing magnetic field that repels it", correct: true },
        { text: "Electric charge on the ring is repelled by the coil", correct: false }
      ],
      explanation: "The changing magnetic field induces eddy currents in the aluminum ring (Faraday's Law). By Lenz's Law, these currents create a magnetic field that opposes the change, resulting in a repulsive force that levitates the ring."
    },
    {
      scenario: "A transformer has 500 turns on its primary coil and 50 turns on its secondary coil. The input voltage is 120V AC.",
      question: "What is the output voltage?",
      options: [
        { text: "1200V (step-up transformer)", correct: false },
        { text: "12V (step-down transformer)", correct: true },
        { text: "120V (voltage unchanged)", correct: false },
        { text: "600V (proportional to turn difference)", correct: false }
      ],
      explanation: "Transformer voltage ratio equals the turns ratio: V₂/V₁ = N₂/N₁. So V₂ = 120V × (50/500) = 12V. With 10× fewer turns on the secondary, we get 1/10 the voltage (step-down transformer)."
    },
    {
      scenario: "A metal detector at an airport security checkpoint beeps when a passenger walks through carrying a set of keys.",
      question: "What electromagnetic principle makes the metal detector work?",
      options: [
        { text: "Metal objects block radio waves", correct: false },
        { text: "Metal objects are naturally magnetic", correct: false },
        { text: "Metal objects disturb the detector's magnetic field, changing induced currents", correct: true },
        { text: "Metal objects emit their own electromagnetic signals", correct: false }
      ],
      explanation: "Metal detectors use electromagnetic induction. They create an oscillating magnetic field that induces eddy currents in metal objects. These currents create their own magnetic fields that the detector senses as a change in its receiving coil."
    },
    {
      scenario: "An induction cooktop heats a steel pan placed on it, but doesn't heat a glass bowl placed in the same spot.",
      question: "Why does only the steel pan heat up?",
      options: [
        { text: "Steel is a better conductor of heat from the cooktop surface", correct: false },
        { text: "Glass reflects the heat waves while steel absorbs them", correct: false },
        { text: "Eddy currents are induced in the steel, causing resistive heating; glass is non-conductive", correct: true },
        { text: "The cooktop only activates when it detects magnetic materials", correct: false }
      ],
      explanation: "Induction cooktops create a rapidly changing magnetic field. This induces eddy currents in conductive materials like steel, which heat up due to electrical resistance. Glass doesn't conduct electricity, so no currents are induced and no heating occurs."
    },
    {
      scenario: "A student drops a strong magnet through a copper pipe and notices it falls much slower than expected.",
      question: "What causes this 'magnetic braking' effect?",
      options: [
        { text: "Air pressure builds up inside the pipe", correct: false },
        { text: "Induced eddy currents create opposing magnetic fields that resist the magnet's motion", correct: true },
        { text: "The magnet sticks to the copper through static electricity", correct: false },
        { text: "Copper is naturally magnetic and attracts the falling magnet", correct: false }
      ],
      explanation: "As the magnet falls, it creates a changing flux through the copper pipe, inducing eddy currents. By Lenz's Law, these currents create magnetic fields that oppose the magnet's motion (the change in flux), acting as a brake."
    },
    {
      scenario: "A power company transmits electricity at 500,000V instead of the 120V used in homes, using transformers at both ends.",
      question: "Why use such high voltage for transmission?",
      options: [
        { text: "High voltage travels faster through wires", correct: false },
        { text: "High voltage, low current reduces I²R power losses in transmission lines", correct: true },
        { text: "High voltage is safer in case of accidents", correct: false },
        { text: "Transformers only work at high voltages", correct: false }
      ],
      explanation: "Power loss in wires = I²R. For the same power (P = VI), higher voltage means lower current, dramatically reducing losses. Transformers (using electromagnetic induction) step voltage up for transmission and back down for safe home use."
    }
  ];

  // Real-world applications
  const applications: TransferApp[] = [
    {
      icon: "🔌",
      title: "Electric Power Generators",
      short: "Generators",
      tagline: "Converting motion into electricity",
      description: "Power generators in hydroelectric dams, wind turbines, and fossil fuel plants all use electromagnetic induction to convert mechanical energy into electrical current.",
      connection: "A conductor (coil) rotating in a magnetic field experiences continuously changing flux, inducing an alternating EMF according to Faraday's Law.",
      howItWorks: [
        "Turbine blades rotate a shaft connected to a rotor with electromagnetic coils",
        "The rotating coil cuts through magnetic field lines from stationary magnets (stator)",
        "Changing magnetic flux through the coil induces an alternating EMF",
        "The EMF drives current through connected circuits, delivering power to the grid"
      ],
      stats: [
        { value: "~68%", label: "Global electricity from thermal generators" },
        { value: "60 Hz", label: "AC frequency in North America" },
        { value: "1.2 GW", label: "Typical large power plant capacity" },
        { value: "~40%", label: "Average thermal plant efficiency" }
      ],
      examples: [
        "Hoover Dam hydroelectric generators",
        "Offshore wind farm turbines",
        "Nuclear power plant steam turbines",
        "Emergency diesel backup generators"
      ],
      companies: ["GE Vernova", "Siemens Energy", "Vestas", "ABB"],
      futureImpact: "Next-generation generators using superconducting coils could boost efficiency by 50%, while direct-drive turbines eliminate mechanical gearboxes for more reliable renewable energy generation.",
      color: "from-yellow-600 to-orange-600"
    },
    {
      icon: "🔋",
      title: "Wireless Charging Technology",
      short: "Wireless Power",
      tagline: "Power without plugs",
      description: "Wireless charging pads for phones, electric toothbrushes, and even electric vehicles use electromagnetic induction to transfer power across an air gap.",
      connection: "An oscillating current in the transmitter coil creates a changing magnetic field that induces current in the receiver coil - mutual induction at work.",
      howItWorks: [
        "Transmitter coil receives AC power, creating oscillating magnetic field",
        "Receiver coil in the device is exposed to this changing field",
        "Changing flux through receiver induces AC voltage (Faraday's Law)",
        "Rectifier converts AC to DC to charge the battery"
      ],
      stats: [
        { value: "15W", label: "Typical phone wireless charging" },
        { value: "~85%", label: "Modern wireless charging efficiency" },
        { value: "150 kW", label: "High-power EV wireless charging" },
        { value: "5mm", label: "Optimal air gap distance" }
      ],
      examples: [
        "Qi wireless phone chargers",
        "Electric vehicle charging pads",
        "Implanted medical device chargers",
        "Wireless electric toothbrush bases"
      ],
      companies: ["Apple (MagSafe)", "Samsung", "WiTricity", "Qualcomm"],
      futureImpact: "Dynamic wireless charging in roads could eliminate range anxiety for EVs, while resonant induction could enable charging across room-sized distances.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🍳",
      title: "Induction Cooktops",
      short: "Induction Cooking",
      tagline: "Heat that stays in the pan",
      description: "Induction cooktops use electromagnetic induction to heat cookware directly, making cooking faster and more energy-efficient than traditional stoves.",
      connection: "High-frequency alternating current in a coil beneath the surface creates eddy currents in ferromagnetic cookware, which heat up due to electrical resistance.",
      howItWorks: [
        "Coil under ceramic surface carries high-frequency AC (20-100 kHz)",
        "Changing magnetic field penetrates into ferromagnetic pan bottom",
        "Eddy currents are induced in the metal, generating I²R heating",
        "Pan heats directly while cooktop surface stays cool"
      ],
      stats: [
        { value: "~90%", label: "Energy transfer efficiency" },
        { value: "2-3x", label: "Faster than gas or electric" },
        { value: "50°C", label: "Surface temp after cooking" },
        { value: "~84%", label: "Less energy than gas stoves" }
      ],
      examples: [
        "Professional restaurant kitchens",
        "Home induction ranges",
        "Portable single-burner units",
        "Industrial heating processes"
      ],
      companies: ["Bosch", "Miele", "GE Appliances", "Thermador"],
      futureImpact: "Flexible induction zones that heat any pan placement, integration with smart home systems for precise temperature control, and expanded compatibility with all cookware types.",
      color: "from-red-600 to-orange-600"
    },
    {
      icon: "🚄",
      title: "Electromagnetic Braking",
      short: "Eddy Current Brakes",
      tagline: "Friction-free stopping power",
      description: "High-speed trains, roller coasters, and industrial machinery use electromagnetic braking that never wears out because there's no physical contact.",
      connection: "Moving conductors through magnetic fields induce eddy currents that, by Lenz's Law, create opposing forces that resist motion - braking without friction.",
      howItWorks: [
        "Electromagnets are activated near a conducting rail or disk",
        "Relative motion induces eddy currents in the conductor",
        "These currents create magnetic fields opposing the motion (Lenz's Law)",
        "The opposing force slows the vehicle without physical contact"
      ],
      stats: [
        { value: "320 km/h", label: "Maximum braking speed for trains" },
        { value: "0.3g", label: "Typical deceleration achieved" },
        { value: "∞", label: "Theoretical brake pad lifespan" },
        { value: "~100%", label: "Reliability rate" }
      ],
      examples: [
        "Shinkansen bullet train braking",
        "Roller coaster magnetic brakes",
        "Heavy truck retarders",
        "Industrial conveyor stops"
      ],
      companies: ["Knorr-Bremse", "INTAMIN", "Telma", "Hitachi Rail"],
      futureImpact: "Regenerative electromagnetic braking in hyperloop pods could recapture kinetic energy, while smart braking systems adapt force in real-time for optimal passenger comfort.",
      color: "from-purple-600 to-indigo-600"
    }
  ];

  const calculateScore = () => {
    const score = testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
    return score;
  };

  // Call onCorrectAnswer when test is passed
  useEffect(() => {
    if (showTestResults && calculateScore() >= 7 && onCorrectAnswer) {
      onCorrectAnswer();
    }
  }, [showTestResults]);

  // Render coil and magnet visualization
  const renderInductionVisualization = (width: number, height: number, interactive: boolean = true) => {
    const coilCenterX = width / 2;
    const coilCenterY = height / 2;
    const magnetX = coilCenterX + (magnetPosition * width / 300);
    const emfColor = inducedEMF > 0 ? '#22c55e' : inducedEMF < 0 ? '#ef4444' : '#94a3b8';
    const emfIntensity = Math.min(Math.abs(inducedEMF) / 50, 1);

    return (
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="coilGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="magnetNorth" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="magnetSouth" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="8" />

        {/* Field lines (if enabled) */}
        {showFieldLines && (
          <g opacity="0.4">
            {[-40, -20, 0, 20, 40].map((offset, i) => (
              <path
                key={i}
                d={`M ${magnetX - 50} ${coilCenterY + offset}
                    Q ${coilCenterX} ${coilCenterY + offset * 0.5}
                    ${magnetX + 100} ${coilCenterY + offset}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
          </g>
        )}

        {/* Coil (solenoid representation) */}
        <g>
          {/* Coil windings */}
          {[...Array(8)].map((_, i) => (
            <ellipse
              key={i}
              cx={coilCenterX}
              cy={coilCenterY}
              rx={30 + i * 3}
              ry={50}
              fill="none"
              stroke="url(#coilGrad)"
              strokeWidth="3"
              opacity={0.8 - i * 0.08}
            />
          ))}

          {/* Coil glow based on EMF */}
          <ellipse
            cx={coilCenterX}
            cy={coilCenterY}
            rx={55}
            ry={60}
            fill="none"
            stroke={emfColor}
            strokeWidth={emfIntensity * 8}
            opacity={emfIntensity * 0.5}
            filter="blur(4px)"
          />

          {/* Wire connections */}
          <line x1={coilCenterX - 60} y1={coilCenterY - 40} x2={coilCenterX - 90} y2={coilCenterY - 60} stroke="#f59e0b" strokeWidth="3" />
          <line x1={coilCenterX - 60} y1={coilCenterY + 40} x2={coilCenterX - 90} y2={coilCenterY + 60} stroke="#f59e0b" strokeWidth="3" />

          {/* Galvanometer */}
          <circle cx={coilCenterX - 100} cy={coilCenterY} r={25} fill="#334155" stroke="#64748b" strokeWidth="2" />
          <text x={coilCenterX - 100} y={coilCenterY - 30} textAnchor="middle" fill="#94a3b8" fontSize="10">EMF</text>

          {/* Galvanometer needle */}
          <line
            x1={coilCenterX - 100}
            y1={coilCenterY}
            x2={coilCenterX - 100 + Math.sin(inducedEMF * 0.1) * 18}
            y2={coilCenterY - Math.cos(inducedEMF * 0.1) * 18}
            stroke={emfColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={coilCenterX - 100} cy={coilCenterY} r={4} fill={emfColor} />
        </g>

        {/* Bar Magnet */}
        <g transform={`translate(${magnetX}, ${coilCenterY})`}>
          {/* Magnet body */}
          <rect x="-40" y="-20" width="40" height="40" fill="url(#magnetNorth)" rx="4" />
          <rect x="0" y="-20" width="40" height="40" fill="url(#magnetSouth)" rx="4" />

          {/* Labels */}
          <text x="-20" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
          <text x="20" y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>

          {/* Motion arrow */}
          {isAnimating && magnetVelocity !== 0 && (
            <g>
              <line
                x1={magnetVelocity > 0 ? 50 : -50}
                y1="0"
                x2={magnetVelocity > 0 ? 70 : -70}
                y2="0"
                stroke="#22c55e"
                strokeWidth="3"
                markerEnd="url(#arrowGreen)"
              />
            </g>
          )}
        </g>

        {/* Arrow marker */}
        <defs>
          <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Data display */}
        <g>
          <rect x="10" y="10" width="120" height="70" fill="#0f172a" rx="6" opacity="0.8" />
          <text x="20" y="30" fill="#94a3b8" fontSize="10">Flux (Φ):</text>
          <text x="100" y="30" fill="#60a5fa" fontSize="10" textAnchor="end">{calculateFlux().toFixed(4)} Wb</text>
          <text x="20" y="48" fill="#94a3b8" fontSize="10">EMF:</text>
          <text x="100" y="48" fill={emfColor} fontSize="10" textAnchor="end">{inducedEMF.toFixed(1)} mV</text>
          <text x="20" y="66" fill="#94a3b8" fontSize="10">Current:</text>
          <text x="100" y="66" fill={emfColor} fontSize="10" textAnchor="end">{inducedCurrent.toFixed(2)} mA</text>
        </g>

        {/* Interactive hint */}
        {interactive && !isAnimating && (
          <text x={width / 2} y={height - 15} textAnchor="middle" fill="#64748b" fontSize="11">
            Click "Start Demo" to move the magnet
          </text>
        )}
      </svg>
    );
  };

  // Render flux graph
  const renderFluxGraph = (width: number, height: number) => {
    const graphWidth = width - 40;
    const graphHeight = height - 40;
    const maxFlux = Math.max(...fluxHistory.map(Math.abs), 0.001);

    const points = fluxHistory.map((flux, i) => {
      const x = 20 + (i / 100) * graphWidth;
      const y = height / 2 - (flux / maxFlux) * (graphHeight / 2 - 10);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="mx-auto">
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="6" />

        {/* Grid */}
        <line x1="20" y1={height / 2} x2={width - 20} y2={height / 2} stroke="#334155" strokeWidth="1" />
        <line x1="20" y1="20" x2="20" y2={height - 20} stroke="#334155" strokeWidth="1" />

        {/* Labels */}
        <text x="10" y="15" fill="#64748b" fontSize="10">Φ</text>
        <text x={width - 25} y={height / 2 + 15} fill="#64748b" fontSize="10">t</text>

        {/* Flux curve */}
        {fluxHistory.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        )}

        <text x={width / 2} y={height - 5} textAnchor="middle" fill="#94a3b8" fontSize="10">
          Magnetic Flux vs Time
        </text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-blue-400 text-sm font-medium">Electromagnetic Physics</span>
      </div>

      {/* Gradient Title */}
      <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent mb-3`}>
        The Magic of Moving Magnets
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg mb-8 max-w-md">
        Discover how changing magnetic fields create electricity
      </p>

      {/* Premium Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl shadow-2xl">
        <svg width={isMobile ? 280 : 360} height={200} className="mx-auto mb-4">
          {/* Simple demo animation */}
          <rect x="0" y="0" width={isMobile ? 280 : 360} height="200" fill="#1e293b" rx="8" />

          {/* Coil */}
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx={isMobile ? 140 : 180}
              cy="100"
              rx={25 + i * 4}
              ry={40}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
            />
          ))}

          {/* Magnet moving */}
          <g className="animate-pulse">
            <rect x={isMobile ? 200 : 260} y="80" width="50" height="40" rx="4" fill="#ef4444" />
            <rect x={isMobile ? 250 : 310} y="80" width="50" height="40" rx="4" fill="#3b82f6" />
            <text x={isMobile ? 225 : 285} y="105" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
            <text x={isMobile ? 275 : 335} y="105" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>
          </g>

          {/* Light bulb */}
          <circle cx={isMobile ? 60 : 70} cy="100" r="20" fill="#fbbf24" opacity="0.6" />
          <circle cx={isMobile ? 60 : 70} cy="100" r="15" fill="#fef3c7" />
          <text x={isMobile ? 60 : 70} y="140" textAnchor="middle" fill="#94a3b8" fontSize="10">Light!</text>

          {/* Arrow */}
          <path d={`M ${isMobile ? 190 : 250} 100 L ${isMobile ? 170 : 220} 100`} stroke="#22c55e" strokeWidth="3" markerEnd="url(#hookArrow)" />
          <defs>
            <marker id="hookArrow" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p className="text-xl text-slate-300 mb-4">
          Move a magnet near a coil of wire... and a light bulb turns on!
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          No batteries. No power source. Just a moving magnet. How is this possible?
        </p>
      </div>

      {/* Premium CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group mt-8 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] flex items-center gap-2"
      >
        Discover the Secret
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
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A bar magnet is pushed toward a coil of wire connected to a meter. The meter needle deflects, indicating electric current!
        </p>
        <p className="text-cyan-400 font-medium">
          What causes current to flow in the wire?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The magnet transfers electrons directly to the wire' },
          { id: 'B', text: 'The changing magnetic field induces an electric field that pushes charges' },
          { id: 'C', text: 'Heat from the magnet causes electrons to move' },
          { id: 'D', text: 'Static electricity builds up between magnet and coil' }
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
            ✓ Correct! This is <span className="text-cyan-400">Faraday's Law of Electromagnetic Induction</span>!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            A changing magnetic field creates an electric field - this is one of the most important discoveries in physics!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Electromagnetic Induction Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderInductionVisualization(isMobile ? 320 : 420, isMobile ? 220 : 260)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); isAnimating ? stopAnimation() : startMagnetDemo(); }}
          className={`p-3 rounded-xl font-semibold transition-colors ${
            isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
          } text-white`}
        >
          {isAnimating ? '⏹ Stop' : '▶ Start Demo'}
        </button>

        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFieldLines(!showFieldLines); }}
          className={`p-3 rounded-xl font-medium transition-colors ${
            showFieldLines ? 'bg-cyan-600' : 'bg-slate-600'
          } text-white`}
        >
          {showFieldLines ? '🔵 Field: ON' : '⚪ Field: OFF'}
        </button>

        <div className="p-3 bg-slate-700/50 rounded-xl text-center">
          <div className="text-sm text-slate-400">Turns</div>
          <input
            type="range"
            min="10"
            max="100"
            value={coilTurns}
            onChange={(e) => setCoilTurns(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-cyan-400 font-bold">{coilTurns}</div>
        </div>

        <div className="p-3 bg-slate-700/50 rounded-xl text-center">
          <div className="text-sm text-slate-400">Field (B)</div>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={fieldStrength}
            onChange={(e) => setFieldStrength(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-cyan-400 font-bold">{fieldStrength.toFixed(1)} T</div>
        </div>
      </div>

      {/* Flux history graph */}
      <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
        {renderFluxGraph(isMobile ? 300 : 380, 100)}
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Faraday's Law:</h3>
        <div className="text-center mb-3">
          <span className="font-mono text-xl text-white bg-slate-700 px-4 py-2 rounded">
            EMF = -N × dΦ/dt
          </span>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>• <strong>EMF:</strong> Induced voltage (volts)</li>
          <li>• <strong>N:</strong> Number of coil turns (more turns = more EMF)</li>
          <li>• <strong>dΦ/dt:</strong> Rate of change of magnetic flux (faster change = more EMF)</li>
          <li>• <strong>Negative sign:</strong> Lenz's Law - induced current opposes the change</li>
        </ul>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); stopAnimation(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Electromagnetic Induction</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">⚡ Faraday's Law</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Discovered by Michael Faraday in 1831</li>
            <li>• Changing magnetic flux induces EMF</li>
            <li>• EMF = -N × dΦ/dt</li>
            <li>• Φ = B × A × cos(θ) (magnetic flux)</li>
            <li>• Faster change = greater induced voltage</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🔄 Lenz's Law</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• The "negative sign" in Faraday's Law</li>
            <li>• Induced current opposes the change</li>
            <li>• Nature resists flux changes</li>
            <li>• Explains magnetic braking</li>
            <li>• Conservation of energy in action</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">🧲 Magnetic Flux</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Φ = B × A × cos(θ)</li>
            <li>• B: Magnetic field strength (Tesla)</li>
            <li>• A: Area of loop (m²)</li>
            <li>• θ: Angle between field and area normal</li>
            <li>• Units: Weber (Wb) = T × m²</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🔌 Ways to Change Flux</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Move a magnet near a coil</li>
            <li>• Rotate the coil in a field (generators)</li>
            <li>• Change the field strength (transformers)</li>
            <li>• Change the area (stretching loops)</li>
            <li>• Change the angle (rotating loops)</li>
          </ul>
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
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Twist Challenge</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A superconducting ring (zero electrical resistance) is placed in a magnetic field. Then the external field is suddenly turned off.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to the magnetic field inside the ring?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The field inside immediately drops to zero' },
          { id: 'B', text: 'The field slowly decays over several hours' },
          { id: 'C', text: 'The field is "trapped" and persists indefinitely' },
          { id: 'D', text: 'The field reverses direction' }
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
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ The field is trapped forever in a superconducting loop!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is called "flux trapping" - a superconductor perfectly opposes any flux change, maintaining the field indefinitely.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See How →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Flux Trapping in Superconductors</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2 text-center">Normal Conductor</h3>
          <svg width="180" height="140" className="mx-auto">
            <rect x="0" y="0" width="180" height="140" fill="#1e293b" rx="8" />

            {/* Ring */}
            <ellipse cx="90" cy="70" rx="50" ry="30" fill="none" stroke="#94a3b8" strokeWidth="8" />

            {/* Fading field lines */}
            <g opacity="0.3">
              {[-20, 0, 20].map((offset, i) => (
                <line key={i} x1="50" y1={70 + offset} x2="130" y2={70 + offset} stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />
              ))}
            </g>

            {/* Arrow showing decay */}
            <path d="M90,110 L90,125" stroke="#ef4444" strokeWidth="2" markerEnd="url(#twistArrowRed)" />
            <text x="90" y="138" textAnchor="middle" fill="#ef4444" fontSize="9">Field decays</text>
          </svg>
          <p className="text-center text-sm text-slate-400 mt-2">
            Resistance causes induced currents to decay
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">Superconductor</h3>
          <svg width="180" height="140" className="mx-auto">
            <rect x="0" y="0" width="180" height="140" fill="#1e293b" rx="8" />

            {/* Ring with glow */}
            <ellipse cx="90" cy="70" rx="50" ry="30" fill="none" stroke="#a855f7" strokeWidth="4" filter="url(#glow)" />
            <ellipse cx="90" cy="70" rx="50" ry="30" fill="none" stroke="#e879f9" strokeWidth="8" />

            {/* Trapped field lines */}
            {[-20, 0, 20].map((offset, i) => (
              <line key={i} x1="50" y1={70 + offset} x2="130" y2={70 + offset} stroke="#60a5fa" strokeWidth="2" />
            ))}

            {/* Forever symbol */}
            <text x="90" y="125" textAnchor="middle" fill="#22c55e" fontSize="16">∞</text>
            <text x="90" y="138" textAnchor="middle" fill="#22c55e" fontSize="9">Field trapped forever</text>

            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
          <p className="text-center text-sm text-slate-400 mt-2">
            Zero resistance = currents flow forever!
          </p>
        </div>

        <defs>
          <marker id="twistArrowRed" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
        </defs>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Why Flux Gets Trapped:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Lenz's Law:</strong> Any flux change induces current that opposes it</li>
          <li>• <strong>Zero Resistance:</strong> In a superconductor, this current never dies</li>
          <li>• <strong>Perfect Opposition:</strong> The induced current exactly maintains the original flux</li>
          <li>• <strong>Result:</strong> Magnetic field is "frozen" inside the loop</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          This principle enables MRI machines, particle accelerators, and quantum computers!
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
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Electromagnetic Induction Powers Our World!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Faraday's discovery that changing magnetic fields create electric fields is the foundation of:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Every power plant and generator</li>
            <li>All transformers in the power grid</li>
            <li>Electric motors (reverse of generators)</li>
            <li>Wireless charging technology</li>
            <li>Induction cooktops</li>
            <li>Metal detectors</li>
            <li>MRI machines</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            Without electromagnetic induction, we'd have no practical way to generate or distribute electricity!
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
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

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

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
            <p className="text-cyan-400 text-sm">{applications[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{applications[activeAppTab].description}</p>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection:</h4>
          <p className="text-sm text-slate-300">{applications[activeAppTab].connection}</p>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-2">How It Works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
            {applications[activeAppTab].howItWorks.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {applications[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg p-2 text-center">
              <div className="text-cyan-400 font-bold text-sm">{stat.value}</div>
              <div className="text-slate-400 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
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
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
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
                ? 'Excellent! You\'ve mastered electromagnetic induction!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div key={qIndex} className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span className="text-sm text-slate-300">Question {qIndex + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-white mb-4">Electromagnetic Induction Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics that powers our entire electrical world!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🧲</div>
            <p className="text-sm text-slate-300">Faraday's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm text-slate-300">Lenz's Law</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Generators</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔌</div>
            <p className="text-sm text-slate-300">Transformers</p>
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
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>Electromagnetic Induction</span>
          <div className="flex gap-1.5 items-center">
            {phaseNames.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i ? 'bg-blue-500 w-6' : phase > i ? 'bg-blue-500 w-2' : 'bg-slate-600 w-2'
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

export default ElectromagneticInductionRenderer;
