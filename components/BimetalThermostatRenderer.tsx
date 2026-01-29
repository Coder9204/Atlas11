'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// BIMETAL THERMOSTAT RENDERER - GAME 137
// Physics: Two metals with different α bonded together → curvature with temperature
// Hook: "Can a strip bend just because it warms?"
// ============================================================================

// Test question interface with scenarios and explanations
interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

// Transfer application interface for real-world connections
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

// Metal pair interface
interface MetalPair {
  name: string;
  metal1: { name: string; alpha: number; color: string };
  metal2: { name: string; alpha: number; color: string };
  description: string;
}

// Props interface
interface BimetalThermostatRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ============================================================================
// COMPREHENSIVE TEST QUESTIONS (10 questions with scenarios)
// ============================================================================
const testQuestions: TestQuestion[] = [
  {
    scenario: "A bimetallic strip is made of brass (α = 19×10⁻⁶/°C) bonded to steel (α = 12×10⁻⁶/°C). It starts flat at 20°C.",
    question: "When heated to 80°C, which way does the strip curve?",
    options: [
      { text: "Toward the brass side (brass becomes the inner curve)", correct: false },
      { text: "Toward the steel side (steel becomes the inner curve)", correct: true },
      { text: "It stays flat but gets longer", correct: false },
      { text: "It twists into a spiral", correct: false }
    ],
    explanation: "When heated, brass (higher α) expands more than steel. Since they're bonded, the brass side becomes longer than the steel side. This forces the strip to curve with brass on the outside (longer path) and steel on the inside (shorter path). Think of it like two runners on a curved track - the outer lane is longer!"
  },
  {
    scenario: "An old thermostat clicks when the room reaches 68°F. You notice it clicks ON again when temperature drops to 65°F.",
    question: "What causes this 3°F difference between on and off temperatures?",
    options: [
      { text: "The thermostat is broken", correct: false },
      { text: "Hysteresis - the strip must bend past equilibrium to snap", correct: true },
      { text: "The thermometer isn't accurate", correct: false },
      { text: "Air currents affect the temperature reading", correct: false }
    ],
    explanation: "This is deliberate hysteresis. Bimetallic strips in snap-action thermostats must overcome a 'detent' force to switch states. Without hysteresis, the thermostat would rapidly cycle on/off near the setpoint. The 3°F dead band prevents rapid switching and extends equipment life."
  },
  {
    scenario: "A toaster uses a bimetallic strip to control browning level. The dial adjusts the distance between the strip and contact.",
    question: "How does adjusting this distance control toast darkness?",
    options: [
      { text: "It changes the heating element power", correct: false },
      { text: "It changes how much the strip must bend to trip, thus heating time", correct: true },
      { text: "It adjusts the reflector position", correct: false },
      { text: "It controls a timer circuit", correct: false }
    ],
    explanation: "The bimetallic strip bends as it heats up from the toaster's heat. When it bends enough to touch the contact, it trips the release. A larger gap means more bending needed, more heating time, darker toast. Smaller gap = less heating = lighter toast. Simple and elegant!"
  },
  {
    scenario: "A fire sprinkler has a small glass vial filled with liquid. When broken, it releases water. Some systems use bimetallic elements instead.",
    question: "What advantage does a bimetallic fire detector have over glass vials?",
    options: [
      { text: "It's cheaper to manufacture", correct: false },
      { text: "It can be reset and reused after a false alarm or test", correct: true },
      { text: "It responds faster to heat", correct: false },
      { text: "It's more aesthetically pleasing", correct: false }
    ],
    explanation: "Glass vial sprinklers are destroyed when they activate - the entire sprinkler head must be replaced. Bimetallic detectors can cool down and return to their original position, allowing reset after tests or false alarms. This is valuable for industrial applications with frequent testing requirements."
  },
  {
    scenario: "A circuit breaker has both a bimetallic strip for overload protection and an electromagnet for short circuit protection.",
    question: "Why use the bimetallic strip instead of just the faster electromagnet?",
    options: [
      { text: "It's cheaper than electromagnets", correct: false },
      { text: "It provides time-delayed tripping for temporary overloads", correct: true },
      { text: "It can handle higher currents", correct: false },
      { text: "It makes a better clicking sound", correct: false }
    ],
    explanation: "The bimetallic strip heats up gradually with sustained overcurrent, providing time-delay protection. This prevents nuisance tripping from brief startup surges (motors, etc.) while still protecting against dangerous sustained overloads. The electromagnet handles instantaneous short circuits. Together, they provide comprehensive protection."
  },
  {
    scenario: "An engineer is designing a bimetallic strip for maximum deflection. She must choose between various metal combinations.",
    question: "Which factor most affects how much the strip bends per degree of temperature change?",
    options: [
      { text: "The total thickness of both metals", correct: false },
      { text: "The difference in expansion coefficients (Δα) between the two metals", correct: true },
      { text: "The electrical conductivity of the metals", correct: false },
      { text: "The melting point of the metals", correct: false }
    ],
    explanation: "Bending is proportional to Δα × ΔT × L. The difference in expansion coefficients (Δα) directly determines sensitivity. Brass-steel (Δα = 7) bends more than bronze-steel (Δα = 5) for the same temperature change. Length increases deflection, but Δα is the key material property."
  },
  {
    scenario: "A coiled bimetallic strip is used in a dial thermometer, like those found in ovens or meat thermometers.",
    question: "Why coil the strip instead of using it straight?",
    options: [
      { text: "It looks more professional", correct: false },
      { text: "Coiling amplifies small deflections into larger rotation angles", correct: true },
      { text: "It protects the strip from damage", correct: false },
      { text: "It makes it respond faster to temperature changes", correct: false }
    ],
    explanation: "A straight strip's tip moves only a small amount. But when coiled into a spiral, each segment's small bend adds up, rotating the center by a larger angle. A pointer attached to the center can move across a dial to indicate temperature precisely. This is mechanical amplification!"
  },
  {
    scenario: "Some thermostats use a mercury switch tilted by a bimetallic coil. Mercury is being phased out due to toxicity.",
    question: "What's a common non-toxic replacement for the mercury switch?",
    options: [
      { text: "A water-based switch", correct: false },
      { text: "A magnetic snap-action switch", correct: true },
      { text: "An air pressure switch", correct: false },
      { text: "A spring-loaded lever", correct: false }
    ],
    explanation: "Magnetic reed switches or snap-action micro switches are common replacements. The bimetallic element still provides temperature sensing, but instead of tilting mercury, it moves a magnet near a reed switch or actuates a micro switch. Same principle, no toxic mercury!"
  },
  {
    scenario: "A car's engine cooling fan uses a thermostatic clutch with a bimetallic spring to engage the fan when the engine is hot.",
    question: "Why not just run the fan all the time?",
    options: [
      { text: "The fan would break from constant use", correct: false },
      { text: "Running the fan wastes fuel and causes overcooling in cold weather", correct: true },
      { text: "The engine can't start with the fan running", correct: false },
      { text: "It would be too noisy", correct: false }
    ],
    explanation: "A constantly running fan wastes 5-10 HP in drag and fuel. In cold weather, it can overcool the engine, reducing efficiency and increasing wear. The bimetallic spring engages the fan only when needed, improving fuel economy and allowing faster warm-up. Modern cars often use electric fans with similar thermal control."
  },
  {
    scenario: "A kettle's auto-shutoff uses a bimetallic disc that 'pops' when water boils, triggering the off switch.",
    question: "Why does the disc 'pop' suddenly rather than bend gradually?",
    options: [
      { text: "The water suddenly gets much hotter at boiling", correct: false },
      { text: "It's designed with a snap-through geometry that stores and releases energy", correct: true },
      { text: "Electricity causes the sudden movement", correct: false },
      { text: "The steam pressure pushes it", correct: false }
    ],
    explanation: "The disc is pre-shaped like a dome. As it heats, internal stress builds until a critical point where it suddenly inverts (snap-through instability). This sudden 'pop' provides reliable actuation force regardless of heating rate. It's the same principle as pressing the bottom of a jar lid - it pops back forcefully!"
  }
];

// ============================================================================
// TRANSFER APPLICATIONS (4 real-world applications)
// ============================================================================
const transferApps: TransferApp[] = [
  {
    icon: "🌡️",
    title: "Traditional Thermostats",
    short: "Thermostats",
    tagline: "Temperature control without batteries",
    description: "For over a century, bimetallic strips have been the heart of mechanical thermostats. They sense temperature and actuate switches without any external power, providing simple and reliable climate control.",
    connection: "The bimetallic coil winds or unwinds as temperature changes, tilting a mercury switch or actuating a snap-action contact. When the room is too cold, the heating circuit closes. Too warm? It opens. No microprocessors needed!",
    howItWorks: "A coiled bimetallic strip responds to room temperature. As it expands/contracts differently, it rotates. At the setpoint (adjustable via the dial), it makes or breaks an electrical contact. Hysteresis prevents rapid cycling.",
    stats: [
      { value: "1883", label: "First bimetal thermostat" },
      { value: "3-5°F", label: "Typical hysteresis" },
      { value: "millions", label: "Still in use today" },
      { value: "0W", label: "Standby power" }
    ],
    examples: [
      "Honeywell Round thermostat (iconic design)",
      "Baseboard heater thermostats",
      "Window AC units with dial controls",
      "Industrial process temperature control"
    ],
    companies: ["Honeywell", "White-Rodgers", "Johnson Controls", "Lux"],
    futureImpact: "While digital thermostats dominate new installations, bimetallic technology remains valuable for fail-safe backup systems and applications where reliability without power is essential.",
    color: "#f59e0b"
  },
  {
    icon: "🍞",
    title: "Toaster Controls",
    short: "Toasters",
    tagline: "Perfect browning without electronics",
    description: "The classic pop-up toaster uses a bimetallic strip as both a timer and thermostat. As the strip heats up from the toaster's radiant heat, it bends until it releases the toast carriage.",
    connection: "The bimetallic strip is positioned near the heating elements. As it absorbs heat, it bends. When it reaches a preset deflection, it releases the latch holding the toast down. Adjusting the 'darkness' dial changes the trip point.",
    howItWorks: "Pushing the lever down latches the carriage and closes the heating element circuit. The bimetallic strip heats and bends. At the set deflection, it trips the latch, the carriage pops up, and the heating elements turn off.",
    stats: [
      { value: "2-4 min", label: "Typical toast time" },
      { value: "300°C", label: "Element temperature" },
      { value: "1893", label: "First electric toaster" },
      { value: "95%", label: "Use bimetallic control" }
    ],
    examples: [
      "Classic 2-slice pop-up toasters",
      "Commercial conveyor toasters",
      "Toaster ovens with auto-shutoff",
      "Vintage chrome toasters"
    ],
    companies: ["Cuisinart", "Breville", "KitchenAid", "Dualit"],
    futureImpact: "Modern toasters increasingly use electronic timers, but many still rely on bimetallic strips for their simplicity, reliability, and satisfying 'pop' action.",
    color: "#ef4444"
  },
  {
    icon: "🔥",
    title: "Fire Detection & Alarms",
    short: "Fire Alarms",
    tagline: "Mechanical fire sensing",
    description: "Rate-of-rise fire detectors use bimetallic elements to sense rapid temperature increases. Unlike smoke detectors, they respond to the heat signature of fires and can be more reliable in dusty or steamy environments.",
    connection: "A bimetallic disc or strip deflects as temperature rises. In rate-of-rise detectors, rapid heating causes faster deflection than the thermal lag of the housing, triggering the alarm. Slower heating (like sunlight) doesn't trip it.",
    howItWorks: "Two bimetallic elements: one exposed, one insulated. Rapid heating bends the exposed element faster than the insulated one, closing a contact. Slow temperature changes affect both equally, so no false alarm.",
    stats: [
      { value: "135°F", label: "Fixed-temp trigger" },
      { value: "15°F/min", label: "Rate-of-rise trigger" },
      { value: "30 sec", label: "Typical response time" },
      { value: "10+ yrs", label: "Detector lifespan" }
    ],
    examples: [
      "Warehouse heat detectors",
      "Kitchen fire detection (no false alarms from cooking)",
      "Garage and workshop alarms",
      "Industrial fire suppression triggers"
    ],
    companies: ["Kidde", "Honeywell Fire", "Siemens", "EST (Edwards)"],
    futureImpact: "Bimetallic fire detectors remain standard in commercial settings where smoke detectors are impractical. Integration with smart building systems adds connectivity while keeping the reliable bimetallic sensor.",
    color: "#dc2626"
  },
  {
    icon: "⚡",
    title: "Circuit Breaker Protection",
    short: "Circuit Breakers",
    tagline: "Thermal overload protection",
    description: "Circuit breakers use bimetallic strips for thermal overload protection. Sustained overcurrent heats the strip, which bends until it trips the breaker. This provides time-delayed protection that allows brief surges while stopping dangerous overloads.",
    connection: "Current flowing through the bimetallic strip causes resistive heating (I²R). The strip bends as it heats, eventually tripping the mechanism. Higher currents = faster heating = faster trip. This creates the inverse-time characteristic shown on trip curves.",
    howItWorks: "The bimetallic strip carries the circuit current. At rated current, heating is balanced by cooling - no trip. Above rated current, heating exceeds cooling, the strip bends progressively, and eventually trips the breaker. An electromagnet handles instantaneous short-circuit trips.",
    stats: [
      { value: "150%", label: "Trip at 1+ hour" },
      { value: "200%", label: "Trip in 2-10 min" },
      { value: "500%", label: "Trip in seconds" },
      { value: "10,000+", label: "Cycle lifetime" }
    ],
    examples: [
      "Residential panel circuit breakers",
      "Motor overload relays",
      "Equipment thermal cutoffs",
      "Automotive circuit protection"
    ],
    companies: ["Eaton", "Siemens", "Square D", "ABB"],
    futureImpact: "While electronic trip units offer more features, bimetallic thermal elements remain standard in most residential breakers due to their reliability, simplicity, and self-powered operation.",
    color: "#8b5cf6"
  }
];

// Metal pairs for simulation
const metalPairs: MetalPair[] = [
  {
    name: "Brass-Steel",
    metal1: { name: "Brass", alpha: 19, color: "#fbbf24" },
    metal2: { name: "Steel", alpha: 12, color: "#6b7280" },
    description: "Classic combination, good sensitivity"
  },
  {
    name: "Aluminum-Steel",
    metal1: { name: "Aluminum", alpha: 23, color: "#94a3b8" },
    metal2: { name: "Steel", alpha: 12, color: "#6b7280" },
    description: "High sensitivity, larger deflection"
  },
  {
    name: "Copper-Invar",
    metal1: { name: "Copper", alpha: 17, color: "#f97316" },
    metal2: { name: "Invar", alpha: 1.2, color: "#22c55e" },
    description: "Maximum sensitivity with Invar"
  },
  {
    name: "Brass-Invar",
    metal1: { name: "Brass", alpha: 19, color: "#fbbf24" },
    metal2: { name: "Invar", alpha: 1.2, color: "#22c55e" },
    description: "Very high sensitivity"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const BimetalThermostatRenderer: React.FC<BimetalThermostatRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationRef = useRef<number>(0);

  // Audio context for sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<number>(0);
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  // Simulation state
  const [temperature, setTemperature] = useState(20); // Current temperature
  const [baseTemp] = useState(20); // Reference temperature (strip is flat)
  const [selectedPair, setSelectedPair] = useState(0);
  const [contactThreshold, setContactThreshold] = useState(30); // Temperature for contact
  const [isContactMade, setIsContactMade] = useState(false);
  const [showHysteresis, setShowHysteresis] = useState(false);
  const [heatingHistory, setHeatingHistory] = useState<{temp: number; contact: boolean}[]>([]);
  const [coolingHistory, setCoolingHistory] = useState<{temp: number; contact: boolean}[]>([]);
  const [isHeating, setIsHeating] = useState(true);

  // Initialize responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Sound effect helper
  const playSound = useCallback((type: 'click_contact' | 'release' | 'success' | 'click') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'click_contact':
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'release':
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
        break;
    }

      }, []);

  // Debounced navigation helper
  const handleNavigation = useCallback(() => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    lastNavigationRef.current = now;
    navigationTimeoutRef.current = setTimeout(() => {
      playSound('click');
      onPhaseComplete?.();
    }, 50);
  }, [onPhaseComplete, playSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Calculate bending based on temperature difference and metal pair
  const calculateBending = useCallback((temp: number) => {
    const pair = metalPairs[selectedPair];
    const deltaAlpha = pair.metal1.alpha - pair.metal2.alpha;
    const deltaT = temp - baseTemp;
    // Curvature is proportional to Δα × ΔT
    // Using a scaling factor for visualization
    return deltaAlpha * deltaT * 0.15;
  }, [selectedPair, baseTemp]);

  // Check and update contact state
  useEffect(() => {
    const bending = calculateBending(temperature);
    const hysteresisOffset = showHysteresis ? 3 : 0; // 3°C hysteresis

    // Determine contact threshold based on direction
    const onThreshold = contactThreshold;
    const offThreshold = contactThreshold - hysteresisOffset;

    const shouldBeContact = isHeating
      ? temperature >= onThreshold
      : temperature >= offThreshold;

    if (shouldBeContact !== isContactMade) {
      setIsContactMade(shouldBeContact);
      if (shouldBeContact) {
        playSound('click_contact');
              } else {
        playSound('release');
              }
    }
  }, [temperature, contactThreshold, isHeating, showHysteresis, calculateBending, isContactMade, playSound]);

  // Handle test answer
  const handleTestAnswer = useCallback((optionIndex: number) => {
    if (testAnswers[testIndex] !== null) return;

    const newAnswers = [...testAnswers];
    newAnswers[testIndex] = optionIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[testIndex].options[optionIndex].correct;
    if (isCorrect) {
      setTestScore(prev => prev + 1);
      playSound('success');
    } else {
      playSound('click');
    }

    setShowExplanation(true);
  }, [testIndex, testAnswers, testScore, playSound]);

  // Get current metal pair
  const currentPair = metalPairs[selectedPair];
  const bending = calculateBending(temperature);

  // ============================================================================
  // RENDER HELPER FUNCTIONS
  // ============================================================================

  // Render bimetallic strip visualization
  const renderBimetallicStrip = (): React.ReactNode => {
    const pair = currentPair;
    const curvature = bending;
    const stripLength = 150;
    const stripThickness = 20;

    // Calculate arc parameters based on curvature
    const radius = curvature !== 0 ? 1 / Math.abs(curvature) * 10 : 10000;
    const arcAngle = curvature !== 0 ? (stripLength / radius) * (180 / Math.PI) : 0;

    // For SVG path, we'll use a quadratic bezier curve to approximate the bend
    const bendFactor = curvature * 2;
    const controlPointY = 120 + bendFactor * 50;

    return (
      <svg viewBox="0 0 300 280" style={{ width: '100%', height: '250px' }}>
        <defs>
          <linearGradient id="metal1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={pair.metal1.color} />
            <stop offset="100%" stopColor={pair.metal1.color} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="metal2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={pair.metal2.color} />
            <stop offset="100%" stopColor={pair.metal2.color} stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="300" height="280" fill="#1e293b" rx="12" />

        {/* Fixed mounting point */}
        <rect x="25" y="100" width="30" height="40" fill="#475569" rx="4" />
        <circle cx="40" cy="115" r="3" fill="#1e293b" />
        <circle cx="40" cy="125" r="3" fill="#1e293b" />

        {/* Bimetallic strip - two layers */}
        <g transform={`translate(55, 120)`}>
          {/* Top metal (higher expansion - bends away when heated) */}
          <path
            d={`M0,0 Q${stripLength/2},${-bendFactor * 40} ${stripLength},${bendFactor * -20}`}
            fill="none"
            stroke={pair.metal1.color}
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Bottom metal (lower expansion - becomes inner curve) */}
          <path
            d={`M0,10 Q${stripLength/2},${10 - bendFactor * 40} ${stripLength},${10 + bendFactor * -20}`}
            fill="none"
            stroke={pair.metal2.color}
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Bond line between metals */}
          <path
            d={`M0,5 Q${stripLength/2},${5 - bendFactor * 40} ${stripLength},${5 + bendFactor * -20}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
          />

          {/* Contact point on strip */}
          <circle
            cx={stripLength}
            cy={5 + bendFactor * -20}
            r="8"
            fill={isContactMade ? "#22c55e" : "#64748b"}
            stroke="white"
            strokeWidth="2"
            filter={isContactMade ? "url(#glow)" : "none"}
          />
        </g>

        {/* Fixed contact point */}
        <g>
          <rect
            x={55 + stripLength - 5}
            y={95}
            width="20"
            height="15"
            fill="#475569"
            rx="2"
          />
          <circle
            cx={55 + stripLength + 5}
            cy={102}
            r="6"
            fill={isContactMade ? "#22c55e" : "#94a3b8"}
            stroke="white"
            strokeWidth="2"
          />
        </g>

        {/* Connection wires */}
        {isContactMade && (
          <g>
            <path
              d="M220,102 L260,102 L260,60"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="4 2"
            >
              <animate attributeName="stroke-dashoffset" values="0;-12" dur="0.5s" repeatCount="indefinite" />
            </path>
            <text x="265" y="55" fill="#22c55e" fontSize="10">ON</text>
          </g>
        )}

        {/* Temperature indicator */}
        <rect x="20" y="200" width="260" height="60" fill="rgba(0,0,0,0.3)" rx="8" />

        {/* Temperature bar */}
        <rect x="40" y="230" width="180" height="12" fill="#374151" rx="6" />
        <rect
          x="40"
          y="230"
          width={Math.max(0, Math.min(180, (temperature / 100) * 180))}
          height="12"
          fill={temperature > 60 ? '#ef4444' : temperature > 40 ? '#f59e0b' : '#22d3ee'}
          rx="6"
        />

        {/* Temperature value */}
        <text x="235" y="240" fill="#e2e8f0" fontSize="16" fontWeight="bold">
          {temperature}°C
        </text>

        {/* Labels */}
        <text x="150" y="220" textAnchor="middle" fill="#94a3b8" fontSize="12">
          {pair.metal1.name} (α={pair.metal1.alpha}) + {pair.metal2.name} (α={pair.metal2.alpha})
        </text>

        {/* Heat indicator */}
        {temperature > 30 && (
          <g>
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M${100 + i * 40},${175} Q${105 + i * 40},${160} ${100 + i * 40},${145}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                opacity={0.3 + (temperature - 30) / 100}
              >
                <animate
                  attributeName="d"
                  values={`M${100 + i * 40},175 Q${105 + i * 40},160 ${100 + i * 40},145;M${100 + i * 40},175 Q${95 + i * 40},155 ${100 + i * 40},140;M${100 + i * 40},175 Q${105 + i * 40},160 ${100 + i * 40},145`}
                  dur={`${1.5 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </path>
            ))}
          </g>
        )}

        {/* Status */}
        <rect
          x="230"
          y="10"
          width="60"
          height="30"
          fill={isContactMade ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)'}
          stroke={isContactMade ? '#22c55e' : '#64748b'}
          strokeWidth="2"
          rx="6"
        />
        <text x="260" y="30" textAnchor="middle" fill={isContactMade ? '#22c55e' : '#94a3b8'} fontSize="12" fontWeight="bold">
          {isContactMade ? 'ON' : 'OFF'}
        </text>
      </svg>
    );
  };

  // Render hysteresis diagram
  const renderHysteresisDiagram = (): React.ReactNode => {
    return (
      <svg viewBox="0 0 280 160" style={{ width: '100%', height: '140px' }}>
        <rect x="0" y="0" width="280" height="160" fill="#1e293b" rx="8" />

        {/* Axes */}
        <line x1="40" y1="130" x2="260" y2="130" stroke="#475569" strokeWidth="2" />
        <line x1="40" y1="30" x2="40" y2="130" stroke="#475569" strokeWidth="2" />

        {/* Labels */}
        <text x="150" y="150" textAnchor="middle" fill="#94a3b8" fontSize="10">Temperature</text>
        <text x="15" y="80" textAnchor="middle" fill="#94a3b8" fontSize="10" transform="rotate(-90 15 80)">Contact State</text>

        {/* Hysteresis loop */}
        <path
          d="M60,100 L140,100 L140,60 L220,60"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M220,60 L180,60 L180,100 L60,100"
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeDasharray="6 3"
          strokeLinecap="round"
        />

        {/* Arrows */}
        <polygon points="220,60 210,55 210,65" fill="#22c55e" />
        <polygon points="60,100 70,95 70,105" fill="#ef4444" />

        {/* State labels */}
        <text x="100" y="115" fill="#64748b" fontSize="10">OFF</text>
        <text x="200" y="50" fill="#22c55e" fontSize="10">ON</text>

        {/* Temperature markers */}
        <text x="140" y="145" textAnchor="middle" fill="#ef4444" fontSize="9">T_on</text>
        <text x="180" y="145" textAnchor="middle" fill="#22c55e" fontSize="9">T_off</text>

        <line x1="140" y1="125" x2="140" y2="135" stroke="#ef4444" strokeWidth="2" />
        <line x1="180" y1="125" x2="180" y2="135" stroke="#22c55e" strokeWidth="2" />

        {/* Legend */}
        <text x="70" y="25" fill="#22c55e" fontSize="9">Heating</text>
        <text x="200" y="25" fill="#ef4444" fontSize="9">Cooling</text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Hook phase
  const renderHook = (): React.ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '9999px', marginBottom: '24px' }}>
        <span style={{ width: '8px', height: '8px', backgroundColor: '#8b5cf6', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#a78bfa', letterSpacing: '0.05em' }}>THERMAL MECHANICS</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 'bold', marginBottom: '12px', background: 'linear-gradient(to right, #8b5cf6, #a78bfa, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        The Self-Bending Strip
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '32px' }}>
        Can a strip of metal bend just because it warms up?
      </p>

      {/* Animation */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '16px', padding: '24px', maxWidth: '350px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <svg viewBox="0 0 200 120" style={{ width: '100%', height: '120px' }}>
          {/* Straight strip */}
          <g transform="translate(20, 30)">
            <text x="0" y="-5" fill="#94a3b8" fontSize="10">Cold:</text>
            <rect x="20" y="0" width="120" height="8" fill="#fbbf24" rx="2" />
            <rect x="20" y="8" width="120" height="8" fill="#6b7280" rx="2" />
          </g>

          {/* Bent strip */}
          <g transform="translate(20, 80)">
            <text x="0" y="-5" fill="#ef4444" fontSize="10">Hot:</text>
            <path d="M20,8 Q80,-20 140,5" fill="none" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" />
            <path d="M20,16 Q80,-12 140,13" fill="none" stroke="#6b7280" strokeWidth="8" strokeLinecap="round" />
          </g>

          {/* Arrow */}
          <path d="M100,55 L100,65" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowBimetal)" />
          <defs>
            <marker id="arrowBimetal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
          </defs>

          {/* Heat symbol */}
          <text x="160" y="70" fill="#ef4444" fontSize="20">🔥</text>
        </svg>

        <p style={{ color: '#e2e8f0', marginTop: '16px', lineHeight: '1.6' }}>
          Two different metals bonded together expand at <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>different rates</span>,
          creating <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>bending motion</span> from temperature alone!
        </p>
      </div>

      {/* CTA */}
      <button
        onMouseDown={() => handleNavigation()}
        style={{ padding: '16px 32px', background: 'linear-gradient(to right, #8b5cf6, #7c3aed)', color: 'white', fontSize: '18px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)' }}
      >
        Discover Bimetallic Magic
      </button>
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>This powers thermostats, toasters & more!</p>
    </div>
  );

  // Predict phase
  const renderPredict = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Make Your Prediction</h2>
        <p style={{ color: '#94a3b8' }}>
          A strip of brass (α = 19) bonded to steel (α = 12) is flat at room temperature.
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '20px' }}>
        <p style={{ textAlign: 'center', color: '#a78bfa', fontWeight: '500' }}>
          When heated, which way will it bend?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'A', text: 'Toward the brass side (brass on inside)', desc: 'Brass becomes shorter?' },
          { id: 'B', text: 'Toward the steel side (steel on inside)', desc: 'Steel becomes shorter?' },
          { id: 'C', text: 'It stays flat but gets longer', desc: 'No bending effect' },
          { id: 'D', text: 'It twists into a spiral', desc: 'Rotational motion' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setPrediction(option.id);
              playSound('click');
                          }}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id ? '2px solid #8b5cf6' : '2px solid #374151',
              backgroundColor: prediction === option.id ? 'rgba(139, 92, 246, 0.1)' : 'rgba(30, 41, 59, 0.5)',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                backgroundColor: prediction === option.id ? '#8b5cf6' : '#374151',
                color: prediction === option.id ? 'white' : '#94a3b8'
              }}>
                {option.id}
              </span>
              <div>
                <p style={{ fontWeight: '500', color: '#e2e8f0' }}>{option.text}</p>
                <p style={{ fontSize: '14px', color: '#64748b' }}>{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onMouseDown={() => handleNavigation()}
          style={{ width: '100%', marginTop: '20px', padding: '16px', background: 'linear-gradient(to right, #22c55e, #10b981)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  // Play phase
  const renderPlay = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Bimetallic Strip Lab</h2>
        <p style={{ color: '#94a3b8' }}>Watch it bend as temperature changes</p>
      </div>

      {/* Strip visualization */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '8px', marginBottom: '16px' }}>
        {renderBimetallicStrip()}
      </div>

      {/* Temperature control */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8' }}>Temperature:</span>
          <span style={{ fontWeight: '600', color: temperature > 50 ? '#ef4444' : '#22d3ee' }}>{temperature}°C</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={temperature}
          onChange={(e) => {
            const newTemp = Number(e.target.value);
            setIsHeating(newTemp > temperature);
            setTemperature(newTemp);
                      }}
          style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
          <span>0°C</span>
          <span>Contact: {contactThreshold}°C</span>
          <span>100°C</span>
        </div>
      </div>

      {/* Metal pair selector */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#94a3b8', marginBottom: '8px' }}>Metal Pair:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {metalPairs.map((pair, i) => (
            <button
              key={i}
              onMouseDown={() => {
                setSelectedPair(i);
                playSound('click');
                              }}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: selectedPair === i ? '2px solid #8b5cf6' : '2px solid #374151',
                backgroundColor: selectedPair === i ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.3)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: pair.metal1.color }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: pair.metal2.color }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>{pair.name}</span>
              </div>
              <p style={{ fontSize: '10px', color: '#64748b' }}>Δα = {pair.metal1.alpha - pair.metal2.alpha}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>{currentPair.metal1.name}</p>
          <p style={{ fontWeight: 'bold', color: currentPair.metal1.color }}>α = {currentPair.metal1.alpha}</p>
        </div>
        <div style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>{currentPair.metal2.name}</p>
          <p style={{ fontWeight: 'bold', color: currentPair.metal2.color }}>α = {currentPair.metal2.alpha}</p>
        </div>
        <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Difference</p>
          <p style={{ fontWeight: 'bold', color: '#a78bfa' }}>Δα = {currentPair.metal1.alpha - currentPair.metal2.alpha}</p>
        </div>
      </div>

      {/* Physics insight */}
      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <h4 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '8px' }}>How It Works:</h4>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          The top metal (higher α) expands more when heated, becoming "longer" than the bottom. Since they're bonded together, the strip must curve to accommodate this length difference!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Review the Concepts
      </button>
    </div>
  );

  // Review phase
  const renderReview = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Understanding Bimetallic Bending</h2>
        <p style={{ color: '#94a3b8' }}>
          {prediction === 'B'
            ? "Correct! The strip curves toward the lower-expansion metal."
            : "The answer was B - steel becomes the inner curve!"}
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '12px' }}>The Track Analogy</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
          Imagine two runners on a curved track. The outer lane is longer than the inner lane. When the metals are bonded:
        </p>
        <ul style={{ color: '#94a3b8', fontSize: '14px', paddingLeft: '20px', marginTop: '8px' }}>
          <li style={{ marginBottom: '4px' }}><strong style={{ color: '#fbbf24' }}>High-α metal (brass)</strong> = wants to be longer = outer lane</li>
          <li><strong style={{ color: '#6b7280' }}>Low-α metal (steel)</strong> = stays shorter = inner lane</li>
        </ul>
        <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '12px', fontWeight: '500' }}>
          Result: The strip curves toward the low-α metal!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <h4 style={{ fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>The Key Formula</h4>
          <p style={{ fontFamily: 'monospace', color: '#e2e8f0', textAlign: 'center', marginBottom: '8px' }}>
            κ ∝ (Δα × ΔT) / t
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            Curvature depends on α difference, temperature change, and inversely on thickness.
          </p>
        </div>
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h4 style={{ fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>Maximize Sensitivity</h4>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Large Δα (use Invar with α ≈ 1), thin strips, and long length all increase deflection per degree.
          </p>
        </div>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Twist predict phase
  const renderTwistPredict = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>The Thermostat Mystery</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          Your thermostat clicks ON at 68°F but doesn't click OFF until 71°F. Then it clicks ON again at 65°F.
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '20px' }}>
        <p style={{ fontSize: '18px', textAlign: 'center', fontWeight: '500', color: '#e2e8f0' }}>
          Why doesn't it switch at the same temperature both ways?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'A', text: 'The thermostat is broken or poorly calibrated', desc: 'Manufacturing defect' },
          { id: 'B', text: 'Hysteresis - intentional dead band to prevent rapid cycling', desc: 'Design feature' },
          { id: 'C', text: 'Temperature sensors are inaccurate', desc: 'Measurement error' },
          { id: 'D', text: 'The bimetallic strip takes time to respond', desc: 'Thermal lag' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setTwistPrediction(option.id);
              playSound('click');
                          }}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: twistPrediction === option.id ? '2px solid #ec4899' : '2px solid #374151',
              backgroundColor: twistPrediction === option.id ? 'rgba(236, 72, 153, 0.1)' : 'rgba(30, 41, 59, 0.5)',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                backgroundColor: twistPrediction === option.id ? '#ec4899' : '#374151',
                color: twistPrediction === option.id ? 'white' : '#94a3b8'
              }}>
                {option.id}
              </span>
              <div>
                <p style={{ fontWeight: '500', color: '#e2e8f0' }}>{option.text}</p>
                <p style={{ fontSize: '14px', color: '#64748b' }}>{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onMouseDown={() => handleNavigation()}
          style={{ width: '100%', marginTop: '20px', padding: '16px', background: 'linear-gradient(to right, #ec4899, #8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Explore Hysteresis
        </button>
      )}
    </div>
  );

  // Twist play phase
  const renderTwistPlay = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Hysteresis Lab</h2>
        <p style={{ color: '#94a3b8' }}>Watch the different switching temperatures</p>
      </div>

      {/* Toggle hysteresis */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          onMouseDown={() => {
            setShowHysteresis(false);
            playSound('click');
          }}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: !showHysteresis ? '2px solid #8b5cf6' : '2px solid #374151',
            backgroundColor: !showHysteresis ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <p style={{ fontWeight: '600', color: !showHysteresis ? '#a78bfa' : '#94a3b8' }}>No Hysteresis</p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>Same ON/OFF point</p>
        </button>
        <button
          onMouseDown={() => {
            setShowHysteresis(true);
            playSound('click');
          }}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: showHysteresis ? '2px solid #ec4899' : '2px solid #374151',
            backgroundColor: showHysteresis ? 'rgba(236, 72, 153, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <p style={{ fontWeight: '600', color: showHysteresis ? '#ec4899' : '#94a3b8' }}>With Hysteresis</p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>3°C dead band</p>
        </button>
      </div>

      {/* Hysteresis diagram */}
      {showHysteresis && (
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Hysteresis Loop</h3>
          {renderHysteresisDiagram()}
        </div>
      )}

      {/* Strip visualization */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '8px', marginBottom: '16px' }}>
        {renderBimetallicStrip()}
      </div>

      {/* Temperature control with direction indicator */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8' }}>
            Temperature ({isHeating ? '↑ Heating' : '↓ Cooling'}):
          </span>
          <span style={{ fontWeight: '600', color: temperature > 50 ? '#ef4444' : '#22d3ee' }}>{temperature}°C</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={temperature}
          onChange={(e) => {
            const newTemp = Number(e.target.value);
            setIsHeating(newTemp > temperature);
            setTemperature(newTemp);
          }}
          style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
          {showHysteresis ? (
            <>
              <span style={{ color: '#64748b' }}>0°C</span>
              <span style={{ color: '#ef4444' }}>OFF: {contactThreshold - 3}°C</span>
              <span style={{ color: '#22c55e' }}>ON: {contactThreshold}°C</span>
              <span style={{ color: '#64748b' }}>100°C</span>
            </>
          ) : (
            <>
              <span style={{ color: '#64748b' }}>0°C</span>
              <span style={{ color: '#8b5cf6' }}>Switch: {contactThreshold}°C</span>
              <span style={{ color: '#64748b' }}>100°C</span>
            </>
          )}
        </div>
      </div>

      {/* Info panel */}
      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: '600', color: '#ec4899', marginBottom: '8px' }}>Why Hysteresis Matters:</h4>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Without hysteresis, the thermostat would rapidly click ON/OFF/ON/OFF near the setpoint. This would:
        </p>
        <ul style={{ fontSize: '14px', color: '#94a3b8', paddingLeft: '20px', marginTop: '8px' }}>
          <li>Wear out the contacts quickly</li>
          <li>Cause annoying clicking sounds</li>
          <li>Stress the heating/cooling equipment</li>
        </ul>
        <p style={{ fontSize: '14px', color: '#e2e8f0', marginTop: '8px' }}>
          The 3°F dead band is a feature, not a bug!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Understand Hysteresis
      </button>
    </div>
  );

  // Twist review phase
  const renderTwistReview = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Hysteresis Explained</h2>
        <p style={{ color: '#94a3b8' }}>
          {twistPrediction === 'B'
            ? "Correct! Hysteresis is intentional engineering."
            : "The answer was B - the dead band is a design feature!"}
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', color: '#ec4899', marginBottom: '12px' }}>How Snap-Action Works</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#22c55e', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>1</span>
            <p style={{ color: '#e2e8f0' }}><strong>Snap-through:</strong> The switch mechanism stores spring energy until a critical point, then snaps to the new state.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#f59e0b', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>2</span>
            <p style={{ color: '#e2e8f0' }}><strong>Return lag:</strong> To snap back, the bimetallic must overcome the spring force - requiring extra temperature change.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>3</span>
            <p style={{ color: '#e2e8f0' }}><strong>Dead band:</strong> The difference between ON and OFF temperatures prevents hunting/cycling.</p>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>Adjustable Hysteresis</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          In precision applications, hysteresis can be minimized but never eliminated entirely with mechanical switches. This is why high-precision thermostats use electronic sensors and relay switches.
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #6366f1, #8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Transfer phase
  const renderTransfer = (): React.ReactNode => {
    const app = transferApps[selectedApp];

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Bimetallic Strips Everywhere</h2>
          <p style={{ color: '#94a3b8' }}>From thermostats to fire alarms</p>
        </div>

        {/* App selector */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
          {transferApps.map((a, i) => (
            <button
              key={i}
              onMouseDown={() => {
                setSelectedApp(i);
                playSound('click');
                              }}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                borderRadius: '9999px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedApp === i ? a.color : '#374151',
                color: selectedApp === i ? 'white' : '#94a3b8'
              }}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #374151', overflow: 'hidden' }}>
          <div style={{ padding: '16px', backgroundColor: app.color }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '36px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{app.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{app.tagline}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            <p style={{ color: '#94a3b8', marginBottom: '12px', lineHeight: '1.6' }}>{app.description}</p>

            <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <h4 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>How It Works</h4>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>{app.howItWorks}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '16px', color: app.color }}>{stat.value}</p>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>Examples:</h4>
              <ul style={{ color: '#94a3b8', fontSize: '14px', paddingLeft: '20px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button
          onMouseDown={() => handleNavigation()}
          style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(to right, #22c55e, #10b981)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Test Your Knowledge
        </button>
      </div>
    );
  };

  // Test phase
  const renderTest = (): React.ReactNode => {
    const question = testQuestions[testIndex];
    const answered = testAnswers[testIndex] !== null;

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e2e8f0' }}>Knowledge Check</h2>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            Question {testIndex + 1} of {testQuestions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '8px', backgroundColor: '#374151', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(to right, #8b5cf6, #a78bfa)',
              transition: 'width 0.3s',
              width: `${((testIndex + (answered ? 1 : 0)) / testQuestions.length) * 100}%`
            }}
          />
        </div>

        {/* Scenario */}
        <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '500', marginBottom: '4px' }}>Scenario:</p>
          <p style={{ color: '#e2e8f0', lineHeight: '1.5' }}>{question.scenario}</p>
        </div>

        {/* Question */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #374151', marginBottom: '16px' }}>
          <p style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>{question.question}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((option, i) => {
              const isSelected = testAnswers[testIndex] === i;
              const isCorrect = option.correct;
              const showResult = answered;

              let bgColor = 'rgba(30, 41, 59, 0.5)';
              let borderColor = '#374151';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'rgba(34, 197, 94, 0.2)';
                  borderColor = '#22c55e';
                } else if (isSelected) {
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                  borderColor = '#ef4444';
                }
              } else if (isSelected) {
                bgColor = 'rgba(139, 92, 246, 0.2)';
                borderColor = '#a78bfa';
              }

              return (
                <button
                  key={i}
                  onMouseDown={() => !answered && handleTestAnswer(i)}
                  disabled={answered}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    textAlign: 'left',
                    cursor: answered ? 'default' : 'pointer',
                    opacity: answered && !isCorrect && !isSelected ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: showResult && isCorrect ? '#22c55e' : showResult && isSelected ? '#ef4444' : '#374151',
                      color: showResult && (isCorrect || isSelected) ? 'white' : '#94a3b8'
                    }}>
                      {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{option.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '16px' }}>
            <h4 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '8px' }}>Explanation</h4>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        {answered && (
          <button
            onMouseDown={() => {
              if (testIndex < testQuestions.length - 1) {
                setTestIndex(prev => prev + 1);
                setShowExplanation(false);
                playSound('click');
              } else {
                                handleNavigation();
              }
            }}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #a78bfa)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            {testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}

        {/* Score indicator */}
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: '#64748b' }}>
          Current Score: {testScore} / {testIndex + (answered ? 1 : 0)}
        </div>
      </div>
    );
  };

  // Call onCorrectAnswer when mastery is achieved
  useEffect(() => {
    if (phase === 'mastery') {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      if (percentage >= 70 && onCorrectAnswer) {
        onCorrectAnswer();
      }
    }
  }, [phase, testScore, onCorrectAnswer]);

  // Mastery phase
  const renderMastery = (): React.ReactNode => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {passed ? '🌡️' : '📚'}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '12px' }}>
            {passed ? "Bimetallic Strips Mastered!" : 'Keep Learning!'}
          </h2>
          <div style={{ display: 'inline-block', background: 'linear-gradient(to right, #8b5cf6, #a78bfa)', color: 'white', fontSize: '28px', fontWeight: 'bold', padding: '12px 24px', borderRadius: '12px' }}>
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '12px' }}>Key Concepts Mastered</h3>
          <ul style={{ color: '#94a3b8' }}>
            {[
              'Two bonded metals bend toward the lower-α metal when heated',
              'Curvature ∝ Δα × ΔT / thickness',
              'Hysteresis prevents rapid cycling in thermostats',
              'Snap-action provides reliable switching',
              'Applications: thermostats, toasters, fire alarms, circuit breakers'
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: '#22c55e' }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #374151', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>The Bending Principle</h3>
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#a78bfa', marginBottom: '8px' }}>
              κ = 6(α₁ - α₂)(T - T₀) / t
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Curvature depends on α difference and temperature change
            </p>
          </div>
        </div>

        {!passed && (
          <button
            onMouseDown={() => {
              setTestIndex(0);
              setTestScore(0);
              setTestAnswers(new Array(10).fill(null));
              setShowExplanation(false);
              handleNavigation();
            }}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #a78bfa)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            Try Again
          </button>
        )}

        {passed && (
          <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: '600', fontSize: '16px' }}>
            Congratulations! You understand bimetallic thermostats!
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const renderPhase = (): React.ReactNode => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const phaseIndex = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].indexOf(phase);
  const phaseNumber = phaseIndex >= 0 ? phaseIndex : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden' }}>
      {/* Background gradients */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(167, 139, 250, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

      {/* Fixed header with progress */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', maxWidth: '896px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#a78bfa' }}>Bimetal Thermostat</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  transition: 'all 0.3s',
                  backgroundColor: phaseNumber === i ? '#a78bfa' : phaseNumber > i ? '#22c55e' : '#475569',
                  width: phaseNumber === i ? '24px' : '8px',
                  boxShadow: phaseNumber === i ? '0 0 8px rgba(167, 139, 250, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Phase {phaseNumber + 1}/10</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '64px', paddingBottom: '32px', maxWidth: '672px', margin: '0 auto', padding: isMobile ? '64px 16px 32px' : '64px 24px 32px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default BimetalThermostatRenderer;
