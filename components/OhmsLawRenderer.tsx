import React, { useState, useEffect, useCallback, useRef } from 'react';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Explore', 3: 'Review', 4: 'Safety',
  5: 'Power', 6: 'Discovery', 7: 'Apply', 8: 'Test', 9: 'Mastery'
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
  | 'voltage_adjusted'
  | 'resistance_adjusted'
  | 'current_measured'
  | 'circuit_completed'
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

const OhmsLawRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Circuit simulation states
  const [voltage, setVoltage] = useState(12); // Volts
  const [resistance, setResistance] = useState(6); // Ohms
  const [current, setCurrent] = useState(2); // Amps (calculated)
  const [isCircuitOn, setIsCircuitOn] = useState(true);
  const [electronPositions, setElectronPositions] = useState<number[]>([]);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Calculate current from Ohm's Law: I = V/R
  useEffect(() => {
    if (resistance > 0) {
      setCurrent(voltage / resistance);
    }
  }, [voltage, resistance]);

  // Initialize electron positions
  useEffect(() => {
    const positions = Array.from({ length: 12 }, (_, i) => (i * 100) / 12);
    setElectronPositions(positions);
  }, []);

  // Animate electrons
  useEffect(() => {
    if (!isCircuitOn) return;

    const speed = current * 2; // Speed proportional to current

    const animate = () => {
      setElectronPositions(prev =>
        prev.map(pos => (pos + speed * 0.5) % 100)
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCircuitOn, current]);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'buzz' | 'click' | 'spark' | 'complete') => {
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
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
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
      case 'buzz':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(60, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'click':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
        oscillator.frequency.setValueAtTime(500, ctx.currentTime + 0.02);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.05);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
        break;
      case 'spark':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(2000, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
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
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handleVoltageChange = useCallback((newVoltage: number) => {
    setVoltage(newVoltage);
    playSound('click');
    if (onGameEvent) {
      onGameEvent({ type: 'voltage_adjusted', data: { voltage: newVoltage } });
    }
  }, [playSound, onGameEvent]);

  const handleResistanceChange = useCallback((newResistance: number) => {
    setResistance(newResistance);
    playSound('click');
    if (onGameEvent) {
      onGameEvent({ type: 'resistance_adjusted', data: { resistance: newResistance } });
    }
  }, [playSound, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({
        type: isCorrect ? 'prediction_correct' : 'prediction_incorrect',
        data: { prediction, correct: 'C' }
      });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({
        type: isCorrect ? 'twist_correct' : 'twist_incorrect',
        data: { prediction, correct: 'B' }
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
      scenario: "A 9V battery is connected to a resistor. An ammeter shows 0.5A of current flowing.",
      question: "What is the resistance of the resistor?",
      options: [
        { text: "4.5 Ohms", correct: false },
        { text: "9 Ohms", correct: false },
        { text: "18 Ohms", correct: true },
        { text: "0.056 Ohms", correct: false }
      ],
      explanation: "Using V = IR, we get R = V/I = 9V / 0.5A = 18 Ohms. This is a direct application of Ohm's Law rearranged to solve for resistance."
    },
    {
      scenario: "A light bulb rated at 60W operates on household voltage (120V).",
      question: "What current flows through the bulb when it's on?",
      options: [
        { text: "0.25 A", correct: false },
        { text: "0.5 A", correct: true },
        { text: "2 A", correct: false },
        { text: "7200 A", correct: false }
      ],
      explanation: "Power P = V × I, so I = P/V = 60W/120V = 0.5A. The bulb draws half an amp of current. You can verify: 120V × 0.5A = 60W."
    },
    {
      scenario: "You double the voltage across a fixed resistor.",
      question: "What happens to the current?",
      options: [
        { text: "Current stays the same", correct: false },
        { text: "Current halves", correct: false },
        { text: "Current doubles", correct: true },
        { text: "Current quadruples", correct: false }
      ],
      explanation: "Since I = V/R and R is constant, doubling V doubles I. Current and voltage are directly proportional when resistance is fixed. This is the essence of Ohm's Law."
    },
    {
      scenario: "You add more resistance to a circuit while keeping voltage constant.",
      question: "What happens to the current flow?",
      options: [
        { text: "Current increases", correct: false },
        { text: "Current decreases", correct: true },
        { text: "Current stays the same", correct: false },
        { text: "The circuit explodes", correct: false }
      ],
      explanation: "I = V/R. With constant V and increasing R, current I must decrease. More resistance means more opposition to current flow - like a narrower pipe carrying less water."
    },
    {
      scenario: "A car headlight draws 5A from a 12V battery.",
      question: "What is the resistance of the headlight filament and how much power does it use?",
      options: [
        { text: "2.4 Ohms, 60W", correct: true },
        { text: "60 Ohms, 2.4W", correct: false },
        { text: "0.42 Ohms, 720W", correct: false },
        { text: "12 Ohms, 5W", correct: false }
      ],
      explanation: "R = V/I = 12V/5A = 2.4 Ohms. Power P = V × I = 12V × 5A = 60W. You can verify: P = I²R = 25 × 2.4 = 60W."
    },
    {
      scenario: "Two resistors of 10 Ohms each are connected in series to a 20V source.",
      question: "What is the total current in the circuit?",
      options: [
        { text: "0.5 A", correct: false },
        { text: "1 A", correct: true },
        { text: "2 A", correct: false },
        { text: "4 A", correct: false }
      ],
      explanation: "In series, resistances add: R_total = 10 + 10 = 20 Ohms. Then I = V/R = 20V/20Ω = 1A. The same 1A flows through both resistors."
    },
    {
      scenario: "A smartphone charger outputs 5V and can deliver up to 2A.",
      question: "What is the minimum resistance the phone can present to draw maximum current?",
      options: [
        { text: "10 Ohms", correct: false },
        { text: "2.5 Ohms", correct: true },
        { text: "0.4 Ohms", correct: false },
        { text: "7 Ohms", correct: false }
      ],
      explanation: "R = V/I = 5V/2A = 2.5 Ohms. If the phone's effective resistance is lower than 2.5Ω, it would try to draw more than 2A, which the charger can't provide safely."
    },
    {
      scenario: "A 1000 Ohm (1kΩ) resistor has 5V across it.",
      question: "What current flows through it?",
      options: [
        { text: "0.5 A", correct: false },
        { text: "0.05 A (50 mA)", correct: false },
        { text: "0.005 A (5 mA)", correct: true },
        { text: "5000 A", correct: false }
      ],
      explanation: "I = V/R = 5V/1000Ω = 0.005A = 5mA. High resistance (1kΩ) with moderate voltage (5V) results in small current - perfect for LED circuits!"
    },
    {
      scenario: "An electric heater uses 10A at 240V.",
      question: "What is its resistance and power consumption?",
      options: [
        { text: "24 Ohms, 2400W", correct: true },
        { text: "2400 Ohms, 24W", correct: false },
        { text: "0.042 Ohms, 57,600W", correct: false },
        { text: "2.4 Ohms, 240W", correct: false }
      ],
      explanation: "R = V/I = 240V/10A = 24Ω. Power P = V × I = 240V × 10A = 2400W = 2.4kW. This is why heaters need dedicated circuits - they draw a lot of power!"
    },
    {
      scenario: "The human body has roughly 1000 Ohms internal resistance when wet.",
      question: "If someone touches 120V with wet hands, what current would flow through their body?",
      options: [
        { text: "0.012 A (12 mA) - potentially lethal!", correct: false },
        { text: "0.12 A (120 mA) - definitely lethal!", correct: true },
        { text: "1.2 A - instant death", correct: false },
        { text: "0.0012 A (1.2 mA) - barely felt", correct: false }
      ],
      explanation: "I = V/R = 120V/1000Ω = 0.12A = 120mA. Currents above 10mA can cause painful shock, and 100mA+ through the heart is often fatal. This is why water and electricity don't mix!"
    }
  ];

  const applications: TransferApp[] = [
    {
      icon: "💡",
      title: "LED Lighting Design",
      short: "LED Circuits",
      tagline: "Why every LED needs a resistor",
      description: "LEDs require precise current control - too much current destroys them, too little won't light them. Ohm's Law determines the resistor value needed.",
      connection: "LEDs have a fixed forward voltage drop (typically 2-3V). Using V = IR, engineers calculate the resistor needed: R = (V_supply - V_LED) / I_LED.",
      howItWorks: "For a 5V supply and LED needing 20mA at 2V drop: R = (5V - 2V) / 0.02A = 150Ω. This current-limiting resistor protects the LED from burning out.",
      stats: [
        { value: "20 mA", label: "Typical LED current" },
        { value: "150Ω", label: "Common resistor value" },
        { value: "2-3V", label: "LED voltage drop" },
        { value: "100,000+ hrs", label: "LED lifespan with proper design" }
      ],
      examples: [
        "Indicator lights on electronics",
        "Automotive LED assemblies",
        "Architectural lighting",
        "Display backlighting"
      ],
      companies: ["Cree", "Philips", "Osram", "Samsung LED"],
      futureImpact: "Smart LED systems with dynamic current control can adjust brightness and color temperature while maximizing efficiency and lifespan.",
      color: "from-yellow-600 to-amber-600"
    },
    {
      icon: "🔌",
      title: "Home Electrical Safety",
      short: "Wire Sizing",
      tagline: "Why your house hasn't burned down",
      description: "Electrical wires have resistance that generates heat when current flows. Ohm's Law helps engineers size wires to safely carry required current.",
      connection: "Wire resistance causes power loss as heat: P = I²R. Higher current needs thicker (lower resistance) wire to prevent overheating and fires.",
      howItWorks: "A 15A circuit uses 14 AWG wire (2.5mΩ/ft resistance). With 50ft of wire: R = 0.25Ω, Power loss = 15² × 0.25 = 56W. Thicker 12 AWG for 20A circuits reduces this further.",
      stats: [
        { value: "15A/20A", label: "Typical home circuits" },
        { value: "14/12 AWG", label: "Wire gauges used" },
        { value: "3%", label: "Max acceptable voltage drop" },
        { value: "60°C", label: "Wire insulation rating" }
      ],
      examples: [
        "Kitchen appliance circuits",
        "HVAC system wiring",
        "Electric vehicle charging",
        "Industrial power distribution"
      ],
      companies: ["Southwire", "Romex", "Belden", "General Cable"],
      futureImpact: "Smart home systems monitor current draw per circuit, detecting anomalies that indicate damaged wiring before fires occur.",
      color: "from-red-600 to-orange-600"
    },
    {
      icon: "🔋",
      title: "Battery Management",
      short: "Power Systems",
      tagline: "How phones know their battery level",
      description: "Batteries have internal resistance that affects voltage output under load. Measuring voltage and current reveals both charge state and battery health.",
      connection: "A battery's terminal voltage V_terminal = V_internal - I × R_internal. Under heavy load (high I), voltage drops more if R_internal is high (old battery).",
      howItWorks: "Phone batteries have ~100mΩ internal resistance when new. Drawing 2A: voltage drop = 2A × 0.1Ω = 0.2V. As batteries age, R increases, causing bigger voltage sags.",
      stats: [
        { value: "~100 mΩ", label: "New Li-ion internal R" },
        { value: "~300 mΩ", label: "Degraded battery R" },
        { value: "80%", label: "Capacity at 500 cycles" },
        { value: "4.2V", label: "Full charge voltage" }
      ],
      examples: [
        "Smartphone battery health indicators",
        "Electric vehicle range estimation",
        "UPS backup power systems",
        "Laptop power management"
      ],
      companies: ["Tesla", "Panasonic", "LG Energy", "CATL"],
      futureImpact: "AI-powered battery management systems use continuous Ohm's Law measurements to predict battery failure and optimize charging strategies.",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "🎸",
      title: "Audio Electronics",
      short: "Audio Design",
      tagline: "How volume knobs and tone controls work",
      description: "Audio equipment uses variable resistors (potentiometers) to control volume and tone. Ohm's Law governs signal levels and speaker impedance matching.",
      connection: "A volume pot acts as a voltage divider: V_out = V_in × (R2 / (R1 + R2)). As you turn the knob, you change the ratio and thus the output voltage (volume).",
      howItWorks: "Speaker impedance (typically 4-8Ω) must match amplifier output. Power delivered: P = V²/R. An 8Ω speaker with 20V signal gets 50W. A 4Ω speaker would get 100W - potentially damaging!",
      stats: [
        { value: "4-8 Ω", label: "Speaker impedance" },
        { value: "10k-100k Ω", label: "Volume pot range" },
        { value: "1-1000 W", label: "Amplifier power range" },
        { value: "20-20kHz", label: "Audio frequency range" }
      ],
      examples: [
        "Guitar amplifiers and effects pedals",
        "Home theater systems",
        "Studio mixing consoles",
        "Headphone amplifiers"
      ],
      companies: ["Fender", "Marshall", "Bose", "JBL"],
      futureImpact: "Digital-analog hybrid audio systems use precision resistor networks for audiophile-quality sound reproduction with digital convenience.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  const teachingMilestones = [
    { phase: 'hook', concept: 'Electrical circuits have three key properties: voltage, current, and resistance' },
    { phase: 'predict', concept: 'Voltage pushes current through resistance' },
    { phase: 'play', concept: 'V = IR quantifies the relationship between voltage, current, and resistance' },
    { phase: 'review', concept: 'Doubling voltage doubles current; doubling resistance halves current' },
    { phase: 'twist_predict', concept: 'Power depends on both voltage and current: P = VI' },
    { phase: 'twist_play', concept: 'Power can also be calculated as P = I²R or P = V²/R' },
    { phase: 'transfer', concept: 'Ohm\'s Law governs LED design, wire sizing, and audio electronics' },
    { phase: 'test', concept: 'Apply Ohm\'s Law to solve real circuit problems' },
    { phase: 'mastery', concept: 'Master of electrical circuit fundamentals' }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderCircuit = (width: number, height: number, showFlow: boolean = true) => {
    const bulbBrightness = Math.min(current / 3, 1);

    return (
      <svg width={width} height={height} viewBox="0 0 300 200" className="overflow-visible">
        <defs>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <radialGradient id="bulbGlow">
            <stop offset="0%" stopColor={`rgba(253, 224, 71, ${bulbBrightness})`} />
            <stop offset="100%" stopColor="rgba(253, 224, 71, 0)" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Circuit background */}
        <rect x="0" y="0" width="300" height="200" fill="#0f172a" rx="10" />

        {/* Wires */}
        <path d="M50,100 L50,40 L250,40 L250,100" fill="none" stroke="url(#wireGrad)" strokeWidth="4" />
        <path d="M50,100 L50,160 L250,160 L250,100" fill="none" stroke="url(#wireGrad)" strokeWidth="4" />

        {/* Battery (left side) */}
        <rect x="35" y="85" width="30" height="30" fill="url(#batteryGrad)" rx="3" />
        <rect x="45" y="78" width="10" height="7" fill="#16a34a" />
        <text x="50" y="105" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">+</text>
        <text x="50" y="125" textAnchor="middle" fill="#94a3b8" fontSize="8">{voltage}V</text>

        {/* Resistor (bottom) */}
        <g transform="translate(150, 160)">
          <rect x="-30" y="-8" width="60" height="16" fill="#64748b" rx="2" />
          {/* Resistor bands */}
          <rect x="-25" y="-8" width="6" height="16" fill="#a855f7" />
          <rect x="-10" y="-8" width="6" height="16" fill="#3b82f6" />
          <rect x="5" y="-8" width="6" height="16" fill="#ef4444" />
          <rect x="20" y="-8" width="4" height="16" fill="#d97706" />
          <text x="0" y="25" textAnchor="middle" fill="#94a3b8" fontSize="8">{resistance}Ω</text>
        </g>

        {/* Light bulb (right side) */}
        <g transform="translate(250, 100)">
          {/* Glow effect */}
          {isCircuitOn && bulbBrightness > 0.1 && (
            <circle cx="0" cy="0" r={20 + bulbBrightness * 15} fill="url(#bulbGlow)" filter="url(#glow)" />
          )}
          {/* Bulb glass */}
          <ellipse cx="0" cy="-5" rx="15" ry="18" fill={isCircuitOn ? `rgba(253, 224, 71, ${bulbBrightness})` : '#475569'} stroke="#94a3b8" strokeWidth="2" />
          {/* Bulb base */}
          <rect x="-8" y="10" width="16" height="12" fill="#64748b" />
          {/* Filament */}
          <path d="M-5,0 Q0,-8 5,0 Q0,8 -5,0" fill="none" stroke={isCircuitOn ? '#fef08a' : '#64748b'} strokeWidth="2" />
        </g>

        {/* Ammeter display */}
        <g transform="translate(150, 40)">
          <rect x="-25" y="-12" width="50" height="24" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="3" />
          <text x="0" y="5" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">{current.toFixed(2)}A</text>
        </g>

        {/* Electron flow animation */}
        {showFlow && isCircuitOn && electronPositions.map((pos, i) => {
          // Calculate position along circuit path
          let x, y;
          const totalLength = 100;
          const normalizedPos = pos;

          if (normalizedPos < 25) {
            // Top wire (left to right)
            x = 50 + (normalizedPos / 25) * 200;
            y = 40;
          } else if (normalizedPos < 50) {
            // Right side (top to bottom, through bulb)
            x = 250;
            y = 40 + ((normalizedPos - 25) / 25) * 120;
          } else if (normalizedPos < 75) {
            // Bottom wire (right to left, through resistor)
            x = 250 - ((normalizedPos - 50) / 25) * 200;
            y = 160;
          } else {
            // Left side (bottom to top, through battery)
            x = 50;
            y = 160 - ((normalizedPos - 75) / 25) * 120;
          }

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#60a5fa"
              opacity="0.8"
            >
              <animate
                attributeName="opacity"
                values="0.6;1;0.6"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {/* Labels */}
        <text x="150" y="185" textAnchor="middle" fill="#64748b" fontSize="10">V = I × R</text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6 text-center">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Electrical Circuits</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-yellow-400 bg-clip-text text-transparent">
        Ohm's Law
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        The fundamental law of electrical circuits
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex justify-center mb-4">
          {renderCircuit(isMobile ? 220 : 280, isMobile ? 150 : 180)}
        </div>
        <p className="text-cyan-400 font-medium text-2xl font-mono mb-3">
          V = I × R
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 mb-4">
          <div><span className="text-yellow-400 font-bold">V</span> = Volts</div>
          <div><span className="text-blue-400 font-bold">I</span> = Amps</div>
          <div><span className="text-purple-400 font-bold">R</span> = Ohms</div>
        </div>
        <button
          onMouseDown={(e) => { e.preventDefault(); setIsCircuitOn(!isCircuitOn); playSound('click'); }}
          className={`w-full px-6 py-3 ${isCircuitOn ? 'bg-red-600/50 hover:bg-red-500/50' : 'bg-green-600/50 hover:bg-green-500/50'} text-white font-medium rounded-xl transition-colors border border-white/10`}
        >
          {isCircuitOn ? 'Turn Off Circuit' : 'Turn On Circuit'}
        </button>
      </div>

      {/* CTA Button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
      >
        Explore the Law
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Discover how voltage, current, and resistance are connected
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-300 mb-4`}>
          A circuit has a 12V battery and a 6Ω resistor. Currently, 2 Amps of current flows through it.
        </p>
        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-cyan-400 font-medium`}>
          If you DOUBLE the voltage to 24V while keeping the same 6Ω resistor, what happens to the current?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Current stays at 2A (voltage doesn\'t affect current)' },
          { id: 'B', text: 'Current increases to 3A (adds 1A per 12V)' },
          { id: 'C', text: 'Current doubles to 4A (I = V/R, so 24V/6Ω = 4A)' },
          { id: 'D', text: 'Current quadruples to 8A' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
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
            ✓ Correct! <span className="text-cyan-400">I = V/R</span> - current is directly proportional to voltage!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Double the voltage → Double the current (when resistance is constant).
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all duration-300"
          >
            Explore the Circuit Lab →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-4`}>Ohm's Law Laboratory</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4 w-full max-w-3xl">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-shrink-0">
            {renderCircuit(isMobile ? 220 : 280, isMobile ? 150 : 180)}
          </div>

          <div className="flex-1 w-full space-y-4">
            {/* Voltage slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-yellow-400 font-medium">Voltage (V)</span>
                <span className="text-white">{voltage} V</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={voltage}
                onChange={(e) => handleVoltageChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            {/* Resistance slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-purple-400 font-medium">Resistance (R)</span>
                <span className="text-white">{resistance} Ω</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={resistance}
                onChange={(e) => handleResistanceChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Current display */}
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium">Current (I)</span>
                <span className="text-2xl font-bold text-white">{current.toFixed(2)} A</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(current / 5 * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Power display */}
            <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-orange-400 font-medium">Power (P = V × I)</span>
                <span className="text-xl font-bold text-white">{(voltage * current).toFixed(1)} W</span>
              </div>
            </div>

            {/* Equation display */}
            <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 rounded-lg p-3 text-center">
              <div className="text-lg font-mono text-yellow-400">
                <span className="text-yellow-400">{voltage}</span>
                <span className="text-slate-500"> = </span>
                <span className="text-blue-400">{current.toFixed(2)}</span>
                <span className="text-slate-500"> × </span>
                <span className="text-purple-400">{resistance}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                V = I × R ✓
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onMouseDown={(e) => { e.preventDefault(); setIsCircuitOn(!isCircuitOn); playSound('click'); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isCircuitOn
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isCircuitOn ? '⏹ Turn Off' : '▶ Turn On'}
          </button>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Key Relationships:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-yellow-400 font-bold mb-1">For Voltage</div>
            <div className="text-slate-300">V = I × R</div>
            <div className="text-slate-500 text-xs">"Voltage drives current"</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-bold mb-1">For Current</div>
            <div className="text-slate-300">I = V / R</div>
            <div className="text-slate-500 text-xs">"More V or less R = more I"</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-purple-400 font-bold mb-1">For Resistance</div>
            <div className="text-slate-300">R = V / I</div>
            <div className="text-slate-500 text-xs">"Resistance opposes flow"</div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all duration-300"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-6`}>Understanding V = IR</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-yellow-900/50 to-amber-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">The Water Analogy</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <span className="text-yellow-400 font-bold">Voltage</span> = Water pressure (pushing force)</li>
            <li>• <span className="text-blue-400 font-bold">Current</span> = Water flow rate (liters/second)</li>
            <li>• <span className="text-purple-400 font-bold">Resistance</span> = Pipe narrowness (opposition)</li>
            <li>• Higher pressure → more flow</li>
            <li>• Narrower pipe → less flow</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Math Triangle</h3>
          <div className="flex justify-center mb-4">
            <svg width="150" height="130" viewBox="0 0 150 130">
              <polygon points="75,10 140,120 10,120" fill="none" stroke="#3b82f6" strokeWidth="2" />
              <text x="75" y="45" textAnchor="middle" fill="#fbbf24" fontSize="20" fontWeight="bold">V</text>
              <text x="40" y="100" textAnchor="middle" fill="#60a5fa" fontSize="20" fontWeight="bold">I</text>
              <text x="110" y="100" textAnchor="middle" fill="#a855f7" fontSize="20" fontWeight="bold">R</text>
              <line x1="30" y1="70" x2="120" y2="70" stroke="#64748b" strokeWidth="1" />
            </svg>
          </div>
          <p className="text-slate-400 text-xs text-center">Cover what you want → the rest is the formula!</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Power Relationships</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-orange-400 font-mono text-lg">P = V × I</div>
              <div className="text-slate-500 text-xs">Basic power formula</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-orange-400 font-mono text-lg">P = I² × R</div>
              <div className="text-slate-500 text-xs">Current-focused</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-orange-400 font-mono text-lg">P = V² / R</div>
              <div className="text-slate-500 text-xs">Voltage-focused</div>
            </div>
          </div>
          <p className="text-cyan-400 font-medium mt-4 text-sm text-center">
            Power (Watts) = Rate of energy use. All three formulas give the same answer!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        See a Dangerous Application →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>The Safety Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-300 mb-4`}>
          A hair dryer uses 1500W of power at 120V. One day, you accidentally plug it into a 240V outlet (like those in some countries).
        </p>
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">⚠️ Warning: This is extremely dangerous - do not try this!</p>
        </div>
        <p className="text-cyan-400 font-medium">
          Assuming the hair dryer doesn't immediately burn out, what power would it try to draw?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Still 1500W (power stays constant)' },
          { id: 'B', text: '6000W (4× the power!) because P = V²/R' },
          { id: 'C', text: '3000W (double the voltage = double the power)' },
          { id: 'D', text: '750W (higher voltage = lower power)' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
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
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! Power quadruples because P = V²/R!
          </p>
          <p className="text-slate-300 text-sm mt-2">
            The hair dryer's resistance is fixed. At 120V: R = V²/P = 14400/1500 = 9.6Ω.<br/>
            At 240V: P = V²/R = 57600/9.6 = <span className="text-red-400 font-bold">6000W!</span>
          </p>
          <p className="text-red-400 text-sm mt-2">
            This is why wrong-voltage plugs cause fires - the device tries to dissipate 4× its rated power!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Explore Power Safety →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-4`}>Power & Safety</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 max-w-3xl w-full">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">Why V² Matters So Much</h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-yellow-400 font-bold mb-2">At 120V (US)</div>
            <div className="text-slate-300 text-sm">
              P = V²/R = 120²/9.6 = <span className="text-white font-bold">1,500W</span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: '25%' }} />
            </div>
            <div className="text-green-400 text-xs mt-1">Normal operation</div>
          </div>

          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
            <div className="text-red-400 font-bold mb-2">At 240V (Wrong!)</div>
            <div className="text-slate-300 text-sm">
              P = V²/R = 240²/9.6 = <span className="text-red-400 font-bold">6,000W!</span>
            </div>
            <div className="h-4 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: '100%' }} />
            </div>
            <div className="text-red-400 text-xs mt-1">4× overload - FIRE HAZARD!</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg p-4">
          <h4 className="text-purple-400 font-bold mb-2">The Math Breakdown</h4>
          <div className="text-slate-300 text-sm space-y-1">
            <p>• Doubling voltage (2×) squares the power effect: 2² = 4×</p>
            <p>• Current also doubles: I = V/R → 240/9.6 = 25A (vs 12.5A normally)</p>
            <p>• P = V × I = 240 × 25 = 6000W ✓</p>
            <p>• P = I²R = 625 × 9.6 = 6000W ✓ (all formulas agree!)</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h4 className="text-emerald-400 font-bold mb-2">Safety Implications</h4>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>• <span className="text-yellow-400">Circuit breakers</span> trip when current exceeds safe limits</li>
          <li>• <span className="text-yellow-400">Dual-voltage devices</span> (100-240V) automatically adjust internal resistance</li>
          <li>• <span className="text-yellow-400">Transformers</span> in chargers step down voltage safely</li>
          <li>• <span className="text-red-400">Never</span> use a device at the wrong voltage without a proper converter!</li>
        </ul>
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
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-400 mb-6`}>Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Ohm's Law Keeps You Safe!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Understanding V = IR and P = V²/R explains:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><span className="text-cyan-400">Why thick wires</span> are needed for high-current appliances</li>
            <li><span className="text-cyan-400">Why voltage standards</span> exist (120V, 240V, etc.)</li>
            <li><span className="text-cyan-400">Why circuit breakers</span> are essential safety devices</li>
            <li><span className="text-cyan-400">Why LEDs need resistors</span> - without them, they burn out instantly</li>
          </ul>
          <p className="text-emerald-400 font-medium mt-4">
            Every electrician, electronics engineer, and hobbyist uses Ohm's Law daily!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all duration-300"
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
                ? 'bg-yellow-600 text-white'
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
          <h4 className="text-white font-bold mb-2">How V = IR Applies</h4>
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
              <span key={i} className="px-3 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded-full text-sm text-yellow-300">{company}</span>
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
          className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all duration-300"
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
                        ? 'bg-yellow-600 text-white'
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
                : 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white hover:from-yellow-500 hover:to-amber-500'
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
                ? 'Excellent! You\'ve mastered Ohm\'s Law!'
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
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all duration-300"
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
      <div className="bg-gradient-to-br from-yellow-900/50 via-amber-900/50 to-orange-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4`}>
          Ohm's Law Master!
        </h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered V = IR and understand electrical circuits at a fundamental level!
        </p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6 font-mono text-2xl text-yellow-400">
          V = I × R
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">Voltage</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌊</div>
            <p className="text-sm text-slate-300">Current</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🚧</div>
            <p className="text-sm text-slate-300">Resistance</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">💡</div>
            <p className="text-sm text-slate-300">Power</p>
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
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-400`}>
              Ohm's Law
            </span>
            <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  p <= phase
                    ? 'bg-cyan-500'
                    : 'bg-slate-700'
                } ${p === phase ? 'w-6' : 'w-2'}`}
                title={phaseLabels[p]}
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

export default OhmsLawRenderer;
