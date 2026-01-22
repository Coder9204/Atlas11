'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CAPILLARY ACTION - GOLD STANDARD RENDERER
// ============================================================================
// Physics: h = 2γcos(θ)/(ρgr) - Jurin's Law
// Surface tension (γ) and adhesion drive liquid up narrow tubes
// Height inversely proportional to radius (narrower = higher)
// Contact angle (θ) determines rise (hydrophilic) or depression (hydrophobic)
// ============================================================================

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_adjusted'
  | 'tube_analyzed'
  | 'meniscus_observed'
  | 'contact_angle_compared'
  | 'height_calculated'
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
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// Physics constants
const WATER_SURFACE_TENSION = 0.073; // N/m
const WATER_DENSITY = 1000; // kg/m³
const GRAVITY = 9.81; // m/s²
const WATER_CONTACT_ANGLE = 0; // degrees (perfectly wetting)
const MERCURY_CONTACT_ANGLE = 140; // degrees (non-wetting)
const MERCURY_SURFACE_TENSION = 0.486; // N/m

// Calculate capillary rise height using Jurin's Law
function calculateCapillaryHeight(
  radiusMm: number,
  surfaceTension: number = WATER_SURFACE_TENSION,
  contactAngle: number = WATER_CONTACT_ANGLE
): number {
  // h = 2γcos(θ)/(ρgr)
  // For water at room temperature: h (mm) ≈ 14.9 / r (mm)
  const r = radiusMm;
  const cosTheta = Math.cos((contactAngle * Math.PI) / 180);
  return ((14.9 * surfaceTension) / WATER_SURFACE_TENSION) * cosTheta / r;
}

const CapillaryActionRenderer: React.FC<Props> = ({
  onGameEvent,
  currentPhase,
  onPhaseComplete,
}) => {
  // Core game state
  const [phase, setPhase] = useState(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [expandedApp, setExpandedApp] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [tubeRadius, setTubeRadius] = useState(2); // mm
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showMercury, setShowMercury] = useState(false);

  // Navigation refs
  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const phaseNames = [
    'Hook', 'Predict', 'Explore', 'Review',
    'Twist Predict', 'Twist Explore', 'Twist Review',
    'Transfer', 'Test', 'Mastery'
  ];

  // Responsive handling
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationProgress(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Phase change events
  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase, phaseName: phaseNames[phase] } });
    }
  }, [phase, onGameEvent]);

  // Web Audio API sound system
  const playSound = useCallback((type: 'correct' | 'incorrect' | 'transition' | 'complete' | 'water' | 'drip') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (type) {
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
          oscillator.frequency.setValueAtTime(220, ctx.currentTime);
          oscillator.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'water':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'drip':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
      }
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete && newPhase > 0) {
      onPhaseComplete(newPhase - 1);
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const handlePrediction = useCallback((index: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setSelectedPrediction(index);
    setShowPredictionFeedback(true);
    playSound(index === 1 ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction: index, correct: index === 1 } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((index: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTwistPrediction(index);
    setShowTwistFeedback(true);
    playSound(index === 3 ? 'correct' : 'incorrect');
    if (onGameEvent) {
      onGameEvent({ type: 'prediction_made', data: { prediction: index, correct: index === 3, twist: true } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onGameEvent]);

  // ============================================================================
  // TEST QUESTIONS - 10 scenario-based questions with explanations
  // ============================================================================
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A botanist is studying how a 100-meter tall Coast Redwood tree transports water from its roots to its crown without any mechanical pump.",
      question: "What combination of forces allows water to reach the top of such a tall tree?",
      options: [
        { text: "Root pressure alone pushes water up", correct: false },
        { text: "Capillary action in narrow xylem vessels combined with transpiration pull", correct: true },
        { text: "Osmosis between cells creates sufficient pressure", correct: false },
        { text: "Gravity pulls water down from rain on the leaves", correct: false }
      ],
      explanation: "Trees use capillary action in their narrow xylem vessels (10-200 μm) plus transpiration-driven negative pressure. The cohesion of water molecules creates a continuous column pulled up as water evaporates from leaves."
    },
    {
      scenario: "A materials scientist is testing paper towels by dipping strips into water and measuring how high the water climbs in 30 seconds.",
      question: "Why does water rise higher in paper towels with finer (smaller) fiber structures?",
      options: [
        { text: "Finer fibers absorb more water chemically", correct: false },
        { text: "Smaller gaps between fibers create narrower capillary channels where h ∝ 1/r", correct: true },
        { text: "Finer fibers are more hydrophobic, pushing water up", correct: false },
        { text: "Air pressure is higher in smaller spaces", correct: false }
      ],
      explanation: "Jurin's Law states h = 2γcos(θ)/(ρgr). Height is inversely proportional to radius. Finer fibers create smaller channels (lower r), resulting in greater capillary rise."
    },
    {
      scenario: "A microfluidics engineer is designing a lab-on-a-chip device for blood testing that must move samples through channels without any pumps.",
      question: "What channel width would maximize capillary-driven flow rate?",
      options: [
        { text: "1 mm - larger channels flow faster", correct: false },
        { text: "100 μm - balance between height and flow resistance", correct: true },
        { text: "1 μm - smallest possible for maximum rise", correct: false },
        { text: "Channel width doesn't affect capillary flow", correct: false }
      ],
      explanation: "While narrower channels have higher capillary rise, extremely narrow channels have high flow resistance. Microfluidic devices typically use 10-200 μm channels to balance capillary pressure with practical flow rates."
    },
    {
      scenario: "A chemist observes that when a glass capillary tube is dipped into liquid mercury, the mercury level inside the tube drops below the surrounding mercury level.",
      question: "What causes mercury to be depressed rather than elevated in glass tubes?",
      options: [
        { text: "Mercury is too heavy for surface tension to lift", correct: false },
        { text: "Glass absorbs mercury preventing it from rising", correct: false },
        { text: "Mercury's contact angle with glass is >90°, making cos(θ) negative", correct: true },
        { text: "Mercury is a metal and metals don't experience capillary action", correct: false }
      ],
      explanation: "Mercury has a contact angle of ~140° with glass (hydrophobic interaction). Since cos(140°) ≈ -0.77, the capillary rise equation gives a negative height, meaning depression rather than elevation."
    },
    {
      scenario: "An athlete chooses between a cotton t-shirt and a polyester wicking shirt for a marathon. The polyester shirt keeps them drier during the race.",
      question: "How does the wicking fabric move sweat away from skin more effectively than cotton?",
      options: [
        { text: "Polyester is waterproof and doesn't absorb any sweat", correct: false },
        { text: "Engineered fiber structures create capillary channels that transport sweat to the outer surface", correct: true },
        { text: "Cotton is naturally hydrophobic and repels sweat", correct: false },
        { text: "Polyester is chemically attracted to salt in sweat", correct: false }
      ],
      explanation: "Wicking fabrics use specially engineered hydrophilic fibers with micro-channels that draw sweat outward via capillary action. Once at the outer surface, sweat evaporates. Cotton absorbs and holds water, staying wet."
    },
    {
      scenario: "A paint manufacturer is developing a new primer that must penetrate deeply into porous concrete. They test different viscosity formulations.",
      question: "How does reducing the primer's viscosity affect its capillary penetration into concrete?",
      options: [
        { text: "Lower viscosity reduces surface tension, decreasing penetration", correct: false },
        { text: "Viscosity has no effect on capillary rise height", correct: false },
        { text: "Lower viscosity increases flow speed but doesn't change final penetration depth (determined by surface tension and pore size)", correct: true },
        { text: "Higher viscosity always means deeper penetration", correct: false }
      ],
      explanation: "Viscosity affects the rate of capillary rise, not the final height. The equilibrium height h = 2γcos(θ)/(ρgr) doesn't include viscosity. Lower viscosity primers penetrate faster but reach the same final depth."
    },
    {
      scenario: "A candle maker notices that wax rises up the wick even when the candle isn't lit. When lit, molten wax continuously feeds the flame.",
      question: "What principle allows the solid wick to continuously draw liquid wax upward to the flame?",
      options: [
        { text: "Heat from the flame creates suction that pulls wax up", correct: false },
        { text: "Capillary action in the fibrous wick structure lifts molten wax against gravity", correct: true },
        { text: "Wax vapor condenses at the top of the wick", correct: false },
        { text: "The wick acts as a pump powered by the flame", correct: false }
      ],
      explanation: "Candle wicks are made of braided cotton fibers creating many tiny capillary channels. These continuously draw molten wax upward to the flame, where it vaporizes and combusts. The same principle makes oil lamps work."
    },
    {
      scenario: "A soil scientist studies water movement in different soil types. Clay soil has much smaller pore spaces than sandy soil.",
      question: "How does pore size affect water movement and retention in soil?",
      options: [
        { text: "Sandy soil retains more water due to larger pores", correct: false },
        { text: "Clay's smaller pores create stronger capillary forces, holding water more tightly against gravity", correct: true },
        { text: "Pore size only affects drainage speed, not water retention", correct: false },
        { text: "Both soil types retain equal amounts of water", correct: false }
      ],
      explanation: "Clay soil's tiny pores (< 2 μm) create strong capillary forces that hold water tightly. Sandy soil's large pores (50-2000 μm) have weak capillary forces, so water drains quickly. This is why clay soils stay moist longer but may become waterlogged."
    },
    {
      scenario: "An astronaut on the ISS notices that water behaves differently in microgravity. When dipping a tube into water, the water doesn't stop rising at any particular height.",
      question: "Why does water fill an entire capillary tube in microgravity?",
      options: [
        { text: "Surface tension is stronger in space", correct: false },
        { text: "Without gravity opposing capillary forces, surface tension pulls water until the tube is full", correct: true },
        { text: "Air pressure is different in spacecraft", correct: false },
        { text: "Water molecules move faster in microgravity", correct: false }
      ],
      explanation: "On Earth, capillary rise stops when surface tension force balances gravitational weight (h = 2γcos(θ)/(ρgr)). In microgravity, g ≈ 0, so there's no opposing force. Surface tension pulls water to fill any wetting container completely."
    },
    {
      scenario: "A forensic scientist is analyzing a blood spatter pattern on a cotton fabric. The blood has spread outward from the point of impact in an irregular pattern.",
      question: "What determines the final spread pattern of blood on fabric?",
      options: [
        { text: "Only the velocity of blood impact", correct: false },
        { text: "Capillary wicking through fabric fibers, affected by fiber orientation and fabric structure", correct: true },
        { text: "Blood always spreads in circular patterns on fabric", correct: false },
        { text: "The color of the fabric determines spread", correct: false }
      ],
      explanation: "Blood spreads through fabric via capillary action along fiber pathways. The pattern depends on fabric weave, fiber orientation, thread count, and fabric treatments. Forensic analysts use these patterns to determine impact angle and blood source."
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctIndex = testQuestions[index].options.findIndex(o => o.correct);
      return score + (answer === correctIndex ? 1 : 0);
    }, 0);
  };

  // ============================================================================
  // TRANSFER APPLICATIONS - 4 comprehensive real-world applications
  // ============================================================================
  const transferApps: TransferApp[] = [
    {
      icon: "🌳",
      title: "Plant Vascular Systems",
      short: "Plant Xylem",
      tagline: "Nature's water delivery system reaches 100+ meters",
      description: "Trees and plants use capillary action in narrow xylem vessels, combined with transpiration pull, to transport water and dissolved nutrients from roots to leaves. This passive system works without any mechanical pump.",
      connection: "Xylem vessels are typically 10-200 micrometers in diameter. At this scale, capillary forces are strong enough to initiate water rise, while transpiration creates negative pressure that pulls the water column upward.",
      howItWorks: "Water evaporates from leaf stomata (transpiration), creating tension in the water column. The cohesive nature of water molecules, combined with adhesion to xylem walls, pulls water up from the roots. Capillary action in the narrow vessels assists this process.",
      stats: [
        "Coast Redwoods: water rises >100 meters",
        "Xylem vessel diameter: 10-200 μm",
        "Transpiration rate: 200-400 liters/day for large trees",
        "Negative pressure in xylem: up to -2 MPa"
      ],
      examples: [
        "Redwood trees: tallest water transport in nature",
        "Desert cacti: modified xylem for water storage",
        "Bamboo: rapid growth requires efficient transport",
        "Crop irrigation: understanding plant water needs"
      ],
      companies: ["Syngenta", "Bayer CropScience", "BASF Agricultural", "Corteva Agriscience"],
      futureImpact: "Understanding plant hydraulics enables development of drought-resistant crops through genetic modification of xylem structure, potentially helping agriculture adapt to climate change.",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "🧻",
      title: "Absorbent Materials & Paper Products",
      short: "Absorbents",
      tagline: "Millions of micro-channels working in parallel",
      description: "Paper towels, tissues, diapers, and sponges all rely on capillary action to rapidly absorb and hold liquids. Their fibrous or porous structures create countless tiny channels that wick liquid against gravity.",
      connection: "Cellulose fibers in paper are naturally hydrophilic (water-loving) with contact angles near 0°. The spaces between fibers act as capillary channels, with smaller gaps creating stronger wicking forces.",
      howItWorks: "When an absorbent material contacts liquid, surface tension pulls liquid into the tiny gaps between fibers. The liquid spreads through the material's capillary network until the forces balance or the material is saturated.",
      stats: [
        "Paper towel fiber diameter: 10-30 μm",
        "Pore sizes: 10-100 μm",
        "Absorption capacity: up to 10x material weight",
        "Wicking speed: several cm/second"
      ],
      examples: [
        "Premium paper towels: optimized fiber structure for speed",
        "Baby diapers: superabsorbent polymers + distribution layers",
        "Oil spill cleanup: hydrophobic sorbents for selective absorption",
        "Industrial wipes: engineered for specific liquid types"
      ],
      companies: ["Procter & Gamble", "Kimberly-Clark", "Georgia-Pacific", "Essity"],
      futureImpact: "Development of sustainable, biodegradable absorbents from agricultural waste, reducing environmental impact while maintaining performance through optimized capillary structures.",
      color: "from-cyan-600 to-blue-600"
    },
    {
      icon: "👕",
      title: "Performance Athletic Fabrics",
      short: "Wicking Fabrics",
      tagline: "Engineered to keep athletes dry and comfortable",
      description: "Modern athletic wear uses specially designed fiber structures to transport sweat away from skin to the outer fabric surface where it can evaporate, keeping athletes cooler and more comfortable during intense activity.",
      connection: "Moisture-wicking fabrics have hydrophilic (water-attracting) inner surfaces and channels that create capillary pathways. The fabric structure pulls sweat outward through these channels to the outer surface for evaporation.",
      howItWorks: "Sweat contacts the inner fabric surface, where capillary forces in micro-channels between specially shaped fibers draw moisture outward. The outer surface has larger exposure area and often hydrophobic treatment to promote rapid evaporation.",
      stats: [
        "Moisture transport rate: >0.5 g/hour/cm²",
        "Dry time: 50-70% faster than cotton",
        "Fiber types: polyester, nylon, polypropylene",
        "Channel widths: typically 10-50 μm"
      ],
      examples: [
        "Marathon running: prevents chafing and overheating",
        "Basketball jerseys: rapid sweat management",
        "Hiking base layers: temperature regulation",
        "Compression wear: combining support with wicking"
      ],
      companies: ["Nike (Dri-FIT)", "Under Armour (HeatGear)", "Adidas (Climalite)", "Lululemon"],
      futureImpact: "Smart fabrics with integrated sensors and adaptive wicking properties, combined with sustainable bio-based fibers that match synthetic performance while being biodegradable.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: "🔬",
      title: "Microfluidic Lab-on-a-Chip Devices",
      short: "Microfluidics",
      tagline: "Capillary-powered diagnostics in your pocket",
      description: "Lab-on-a-chip devices use capillary action to move tiny fluid samples through micro-scale channels for medical diagnostics, eliminating the need for pumps, power, or trained operators.",
      connection: "At the micro-scale (10-200 μm channels), capillary forces dominate over gravity. This allows precise fluid control using only surface tension, enabling complex sample processing in portable, disposable devices.",
      howItWorks: "Sample is applied to an inlet. Capillary action draws fluid through channels where it mixes with reagents, separates into components, or contacts detection zones. Channel geometry controls flow timing and direction.",
      stats: [
        "Channel dimensions: 10-200 μm width",
        "Sample volumes: microliters to nanoliters",
        "Analysis time: minutes instead of hours",
        "Cost: often <$1 per test"
      ],
      examples: [
        "Pregnancy tests: capillary flow through nitrocellulose",
        "COVID-19 rapid tests: lateral flow immunoassays",
        "Blood glucose monitors: capillary-filled test strips",
        "Point-of-care diagnostics: infectious disease testing"
      ],
      companies: ["Abbott", "Roche Diagnostics", "Becton Dickinson", "Danaher (Cepheid)"],
      futureImpact: "Multiplexed diagnostics testing for dozens of conditions from a single drop of blood, with results transmitted wirelessly to healthcare providers, enabling personalized medicine in remote locations.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  // ============================================================================
  // SVG VISUALIZATIONS
  // ============================================================================
  const renderCapillaryTubes = () => {
    const tubes = [
      { radius: 0.5, x: 80 },
      { radius: 1, x: 160 },
      { radius: 2, x: 240 },
      { radius: 4, x: 320 }
    ];

    return (
      <svg
        width={isMobile ? 320 : 400}
        height={isMobile ? 240 : 280}
        viewBox="0 0 400 280"
        className="mx-auto"
      >
        <defs>
          <linearGradient id="waterFillCap" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="mercuryFillCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="280" fill="#0f172a" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" className="fill-white text-sm font-bold">
          Capillary Rise: Narrower = Higher!
        </text>

        {/* Water reservoir */}
        <rect x="40" y="200" width="320" height="60" fill="#0369a1" opacity="0.4" />
        <rect x="40" y="195" width="320" height="8" fill="#0ea5e9" />

        {/* Glass tubes with water columns */}
        {tubes.map((tube, index) => {
          const height = calculateCapillaryHeight(tube.radius);
          const displayHeight = Math.min(height * 4, 150);
          const tubeWidth = tube.radius * 8;
          const animatedHeight = Math.min(animationProgress * 2, displayHeight);

          return (
            <g key={index}>
              {/* Tube outline */}
              <rect
                x={tube.x - tubeWidth / 2}
                y={50}
                width={tubeWidth}
                height={155}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                rx="2"
              />

              {/* Water column */}
              <rect
                x={tube.x - tubeWidth / 2 + 2}
                y={203 - animatedHeight}
                width={tubeWidth - 4}
                height={animatedHeight}
                fill="url(#waterFillCap)"
                rx="1"
              />

              {/* Meniscus (curved surface) */}
              <path
                d={`M ${tube.x - tubeWidth / 2 + 2} ${203 - animatedHeight} Q ${tube.x} ${198 - animatedHeight}, ${tube.x + tubeWidth / 2 - 2} ${203 - animatedHeight}`}
                fill="#7dd3fc"
              />

              {/* Labels */}
              <text x={tube.x} y={40} textAnchor="middle" className="fill-slate-400 text-xs">
                r = {tube.radius}mm
              </text>
              <text x={tube.x} y={270} textAnchor="middle" className="fill-cyan-400 text-xs font-bold">
                h = {height.toFixed(1)}mm
              </text>
            </g>
          );
        })}

        {/* Formula */}
        <rect x="280" y="230" width="110" height="40" fill="#1e293b" rx="6" opacity="0.9" />
        <text x="335" y="250" textAnchor="middle" className="fill-cyan-400 text-xs">
          h = 2γcosθ/(ρgr)
        </text>
        <text x="335" y="264" textAnchor="middle" className="fill-slate-400 text-[10px]">
          h ∝ 1/r
        </text>
      </svg>
    );
  };

  const renderMercuryComparison = () => {
    const waterHeight = calculateCapillaryHeight(tubeRadius);
    const mercuryHeight = calculateCapillaryHeight(tubeRadius, MERCURY_SURFACE_TENSION, MERCURY_CONTACT_ANGLE);

    return (
      <svg
        width={isMobile ? 320 : 400}
        height={isMobile ? 220 : 250}
        viewBox="0 0 400 250"
        className="mx-auto"
      >
        <defs>
          <linearGradient id="mercuryGradCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        <rect width="400" height="250" fill="#0f172a" />

        {/* Water side */}
        <g transform="translate(50, 0)">
          <text x="70" y="25" textAnchor="middle" className="fill-cyan-400 text-sm font-bold">
            Water (θ &lt; 90°)
          </text>

          {/* Container */}
          <rect x="20" y="150" width="100" height="70" fill="#0369a1" opacity="0.3" />
          <rect x="20" y="145" width="100" height="8" fill="#0ea5e9" />

          {/* Tube */}
          <rect x="60" y="50" width="20" height="105" fill="none" stroke="#94a3b8" strokeWidth="2" rx="2" />

          {/* Water rising */}
          <rect
            x="62"
            y={153 - Math.min(waterHeight * 3, 100)}
            width="16"
            height={Math.min(waterHeight * 3, 100)}
            fill="#0ea5e9"
          />

          {/* Meniscus curving UP (concave) */}
          <path
            d={`M 62 ${153 - Math.min(waterHeight * 3, 100)} Q 70 ${148 - Math.min(waterHeight * 3, 100)}, 78 ${153 - Math.min(waterHeight * 3, 100)}`}
            fill="#7dd3fc"
          />

          <text x="70" y="235" textAnchor="middle" className="fill-green-400 text-xs font-semibold">
            RISES (adhesion wins)
          </text>
        </g>

        {/* Mercury side */}
        <g transform="translate(210, 0)">
          <text x="70" y="25" textAnchor="middle" className="fill-slate-300 text-sm font-bold">
            Mercury (θ &gt; 90°)
          </text>

          {/* Container */}
          <rect x="20" y="150" width="100" height="70" fill="#475569" opacity="0.3" />
          <rect x="20" y="145" width="100" height="8" fill="url(#mercuryGradCap)" />

          {/* Tube */}
          <rect x="60" y="50" width="20" height="105" fill="none" stroke="#94a3b8" strokeWidth="2" rx="2" />

          {/* Mercury DROPPING */}
          <rect
            x="62"
            y="153"
            width="16"
            height={Math.min(Math.abs(mercuryHeight) * 2, 40)}
            fill="url(#mercuryGradCap)"
          />

          {/* Meniscus curving DOWN (convex) */}
          <path
            d="M 62 153 Q 70 160, 78 153"
            fill="#94a3b8"
          />

          <text x="70" y="235" textAnchor="middle" className="fill-red-400 text-xs font-semibold">
            DROPS (cohesion wins)
          </text>
        </g>

        {/* Contact angle diagrams */}
        <rect x="155" y="75" width="90" height="70" fill="#1e293b" rx="8" />
        <text x="200" y="92" textAnchor="middle" className="fill-slate-400 text-xs font-semibold">
          Contact Angle θ
        </text>

        {/* Water angle */}
        <g transform="translate(163, 100)">
          <line x1="0" y1="25" x2="30" y2="25" stroke="#64748b" strokeWidth="1" />
          <path d="M 15 25 Q 15 15, 25 10" stroke="#0ea5e9" strokeWidth="2" fill="none" />
          <text x="15" y="42" textAnchor="middle" className="fill-cyan-400 text-[9px]">
            θ≈0°
          </text>
        </g>

        {/* Mercury angle */}
        <g transform="translate(203, 100)">
          <line x1="0" y1="25" x2="30" y2="25" stroke="#64748b" strokeWidth="1" />
          <path d="M 15 25 Q 15 40, 25 43" stroke="#94a3b8" strokeWidth="2" fill="none" />
          <text x="15" y="42" textAnchor="middle" className="fill-slate-400 text-[9px]">
            θ≈140°
          </text>
        </g>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-teal-200 bg-clip-text text-transparent">
        The Giant Redwood Mystery
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        How does water defy gravity in towering trees?
      </p>

      {/* Premium card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 max-w-2xl border border-slate-700/50 shadow-2xl shadow-cyan-500/5 mb-8">
        <div className="text-6xl mb-6">🌲</div>
        <p className="text-lg text-slate-300 mb-4">
          A Coast Redwood tree can grow over <span className="text-cyan-400 font-bold">100 meters</span> tall.
        </p>
        <p className="text-base text-slate-400 mb-6">
          How does water travel from the roots to the very top leaves... <span className="text-amber-400 font-semibold">without any mechanical pump?</span>
        </p>
        <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 rounded-2xl p-4 border border-cyan-500/20">
          <p className="text-cyan-300 font-medium">
            What invisible force defies gravity?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <p className="mt-6 text-sm text-slate-500">Explore capillary action and surface tension</p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          You dip three glass tubes of <span className="text-cyan-400">different widths</span> into water.
          What do you predict will happen?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          'Water rises highest in the widest tube',
          'Water rises highest in the narrowest tube',
          'Water rises to the same height in all tubes',
          'Water drops below the surface in all tubes'
        ].map((text, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(index); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === index
                ? index === 1
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && index === 1
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{String.fromCharCode(65 + index)}.</span>
            <span className="text-slate-200 ml-2">{text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {selectedPrediction === 1 ? "✓ Excellent prediction!" : "The answer: Water rises highest in the narrowest tube!"}
          </p>
          <p className="text-slate-300 text-sm mt-2">
            This is <span className="text-cyan-400 font-semibold">capillary action</span> - let's see it in action!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
          >
            See the Experiment →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Capillary Tubes Experiment</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4">
        {renderCapillaryTubes()}
      </div>

      <div className="bg-cyan-900/30 rounded-xl p-4 max-w-2xl mb-6 border border-cyan-500/30">
        <p className="text-slate-300 text-center">
          Notice: <strong className="text-cyan-400">Narrower tubes = Higher rise!</strong>
        </p>
        <p className="text-sm text-slate-400 text-center mt-2">
          The 0.5mm tube rises ~8× higher than the 4mm tube.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-cyan-400 mb-2">Adhesion</h3>
          <p className="text-slate-300 text-sm">Water molecules stick to the glass walls, "climbing" up the surface.</p>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Surface Tension</h3>
          <p className="text-slate-300 text-sm">Water molecules pull each other, forming a curved meniscus that pulls the column up.</p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Understand the Physics →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">The Science of Capillary Action</h2>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-cyan-400 mb-3">Jurin's Law</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
            <p className="text-lg text-center font-mono text-white">h = 2γcos(θ)/(ρgr)</p>
          </div>
          <ul className="space-y-1 text-slate-300 text-sm">
            <li><span className="text-cyan-400">γ</span> = surface tension</li>
            <li><span className="text-cyan-400">θ</span> = contact angle</li>
            <li><span className="text-cyan-400">ρ</span> = liquid density</li>
            <li><span className="text-cyan-400">g</span> = gravity</li>
            <li><span className="text-cyan-400">r</span> = tube radius</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-green-400 mb-3">Key Insight</h3>
          <p className="text-slate-300 text-center text-lg mb-3">
            h ∝ 1/r
          </p>
          <p className="text-slate-300">
            Height is <strong>inversely proportional</strong> to radius.
          </p>
          <p className="text-green-400 mt-2 font-semibold">
            Half the radius = Double the height!
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-4 md:p-6 md:col-span-2">
          <h3 className="text-lg md:text-xl font-bold text-amber-400 mb-3">Why Trees Need Narrow Tubes</h3>
          <p className="text-slate-300">
            Tree xylem vessels are incredibly narrow (10-200 micrometers). At this scale, capillary forces are strong enough to help lift water, while transpiration from leaves creates additional pulling force that can move water over 100 meters against gravity!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Explore a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-6">The Twist: Mercury</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-2xl mb-6">
        <p className="text-base md:text-lg text-slate-300 mb-4">
          What if we use <span className="text-slate-200 font-bold">mercury</span> instead of water?
          Mercury doesn't "wet" glass like water does...
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          'Mercury rises even higher than water',
          'Mercury rises to the same height as water',
          'Mercury rises, but less than water',
          'Mercury drops BELOW the surrounding level!'
        ].map((text, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(index); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === index
                ? index === 3
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && index === 3
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{String.fromCharCode(65 + index)}.</span>
            <span className="text-slate-200 ml-2">{text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 3 ? "✓ Exactly right!" : "The answer: Mercury drops BELOW the surface!"}
          </p>
          <p className="text-slate-300 text-sm mt-2">
            Mercury's atoms bond strongly to each other but barely interact with glass.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See the Comparison →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const waterHeight = calculateCapillaryHeight(tubeRadius);
    const mercuryHeight = calculateCapillaryHeight(tubeRadius, MERCURY_SURFACE_TENSION, MERCURY_CONTACT_ANGLE);

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-4">Water vs Mercury</h2>

        <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-4">
          {renderMercuryComparison()}
        </div>

        <div className="mb-6 max-w-xl w-full">
          <label className="block text-slate-300 mb-2 text-center">
            Tube Radius: {tubeRadius} mm
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={tubeRadius}
            onChange={(e) => setTubeRadius(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-xl mb-6">
          <div className="bg-cyan-500/10 rounded-xl p-3 text-center border border-cyan-500/30">
            <p className="text-cyan-400 font-semibold">Water Rise</p>
            <p className="text-2xl font-bold text-cyan-300">+{waterHeight.toFixed(1)} mm</p>
          </div>
          <div className="bg-slate-500/10 rounded-xl p-3 text-center border border-slate-500/30">
            <p className="text-slate-400 font-semibold">Mercury Drop</p>
            <p className="text-2xl font-bold text-slate-300">{mercuryHeight.toFixed(1)} mm</p>
          </div>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
        >
          Understand the Difference →
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-purple-400 mb-6">Contact Angle: The Key Factor</h2>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-bold text-cyan-400 mb-3">💧 Hydrophilic (θ &lt; 90°)</h3>
          <p className="text-slate-300 text-sm">
            <strong>Adhesion</strong> to walls is stronger than <strong>cohesion</strong> between molecules.
          </p>
          <p className="text-cyan-400 mt-2 font-semibold">
            Liquid wets the surface and RISES
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg font-bold text-slate-300 mb-3">🔘 Hydrophobic (θ &gt; 90°)</h3>
          <p className="text-slate-300 text-sm">
            <strong>Cohesion</strong> between molecules is stronger than <strong>adhesion</strong> to walls.
          </p>
          <p className="text-red-400 mt-2 font-semibold">
            Liquid repels the surface and DROPS
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-4 md:p-6 md:col-span-2">
          <h3 className="text-lg font-bold text-amber-400 mb-3">The Math: cos(θ) Makes the Difference</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-sm">Water: θ ≈ 0°</p>
              <p className="text-cyan-400 font-mono">cos(0°) = +1</p>
              <p className="text-green-400 text-sm mt-1">Positive height = rise</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Mercury: θ ≈ 140°</p>
              <p className="text-slate-300 font-mono">cos(140°) ≈ -0.77</p>
              <p className="text-red-400 text-sm mt-1">Negative height = drop</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = transferApps[activeAppTab];

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Real-World Applications</h2>

        {/* App tabs */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {transferApps.map((a, index) => (
            <button
              key={index}
              onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); setExpandedApp(null); }}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${
                activeAppTab === index
                  ? `bg-gradient-to-r ${a.color} text-white`
                  : completedApps.has(index)
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {a.icon} {isMobile ? '' : a.short}
            </button>
          ))}
        </div>

        {/* Active app card */}
        <div className="bg-slate-800/50 rounded-2xl p-4 md:p-6 max-w-3xl w-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{app.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{app.title}</h3>
              <p className="text-cyan-400 text-sm">{app.tagline}</p>
            </div>
          </div>

          <p className="text-slate-300 mb-4">{app.description}</p>

          <div className={`bg-gradient-to-r ${app.color} bg-opacity-20 rounded-xl p-4 mb-4`}>
            <h4 className="font-semibold text-white mb-2">Physics Connection</h4>
            <p className="text-slate-200 text-sm">{app.connection}</p>
          </div>

          <button
            onMouseDown={(e) => { e.preventDefault(); setExpandedApp(expandedApp === activeAppTab ? null : activeAppTab); }}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mb-4"
          >
            {expandedApp === activeAppTab ? '▼ Hide Details' : '▶ Show More Details'}
          </button>

          {expandedApp === activeAppTab && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="font-semibold text-yellow-400 mb-2">How It Works</h4>
                <p className="text-slate-300 text-sm">{app.howItWorks}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">Key Statistics</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    {app.stats.map((stat, i) => (
                      <li key={i}>• {stat}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Real Examples</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    {app.examples.map((ex, i) => (
                      <li key={i}>• {ex}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-purple-400 mb-2">Industry Leaders</h4>
                <div className="flex flex-wrap gap-2">
                  {app.companies.map((company, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-sm">
                      {company}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-orange-400 mb-2">Future Impact</h4>
                <p className="text-slate-300 text-sm">{app.futureImpact}</p>
              </div>
            </div>
          )}

          {!completedApps.has(activeAppTab) && (
            <button
              onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              ✓ Mark as Understood
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">
            {transferApps.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400">{completedApps.size}/4</span>
        </div>

        {completedApps.size >= 4 && (
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-3xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-slate-400 text-sm italic">{q.scenario}</p>
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
                        ? 'bg-cyan-600 text-white'
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
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              if (onGameEvent) {
                onGameEvent({ type: 'test_completed', data: { score: calculateScore(), total: 10 } });
              }
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-3xl w-full space-y-4">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered capillary action!'
                : 'Keep studying! Review the explanations below and try again.'}
            </p>
          </div>

          {/* Show explanations */}
          <div className="space-y-4">
            {testQuestions.map((q, qIndex) => {
              const correctIndex = q.options.findIndex(o => o.correct);
              const isCorrect = testAnswers[qIndex] === correctIndex;

              return (
                <div key={qIndex} className={`rounded-xl p-4 ${isCorrect ? 'bg-emerald-900/30 border border-emerald-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-lg ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <p className="text-white font-medium text-sm">{qIndex + 1}. {q.question}</p>
                  </div>
                  <p className="text-slate-300 text-sm ml-6">
                    <strong>Correct:</strong> {q.options[correctIndex].text}
                  </p>
                  <p className="text-slate-400 text-sm ml-6 mt-1">{q.explanation}</p>
                </div>
              );
            })}
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
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => {
    useEffect(() => {
      if (onGameEvent) {
        onGameEvent({ type: 'mastery_achieved', data: { score: calculateScore() } });
      }
    }, []);

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-4 md:p-6 text-center">
        <div className="bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-teal-900/50 rounded-3xl p-6 md:p-8 max-w-2xl">
          <div className="text-7xl md:text-8xl mb-6">🏆</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Capillary Action Master!</h1>
          <p className="text-lg md:text-xl text-slate-300 mb-6">
            You now understand how liquids defy gravity through surface tension and adhesion!
          </p>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">📐</div>
              <p className="text-xs md:text-sm text-slate-300">Jurin's Law: h ∝ 1/r</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">💧</div>
              <p className="text-xs md:text-sm text-slate-300">Surface Tension</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">🔬</div>
              <p className="text-xs md:text-sm text-slate-300">Contact Angles</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 md:p-4">
              <div className="text-2xl mb-2">🌳</div>
              <p className="text-xs md:text-sm text-slate-300">Nature's Plumbing</p>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-bold text-cyan-400 mb-2">Key Formula</h3>
            <p className="text-xl md:text-2xl font-mono text-white">h = 2γcos(θ)/(ρgr)</p>
            <p className="text-slate-400 text-sm mt-2">Narrower tubes = Higher rise</p>
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
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

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
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-cyan-400">Capillary Action</span>
          <div className="flex gap-1.5">
            {phaseNames.map((_, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i
                    ? 'bg-gradient-to-r from-cyan-400 to-teal-400 w-6 shadow-lg shadow-cyan-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseNames[i]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseNames[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default CapillaryActionRenderer;
