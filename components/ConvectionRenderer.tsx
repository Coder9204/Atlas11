'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CONVECTION RENDERER - GOLD STANDARD IMPLEMENTATION
// Physics: Heat transfer through fluid motion (Q = hAΔT)
// Hot fluid rises (less dense), cold fluid sinks (more dense) - creating circulation
// ============================================================================

// Game event types for analytics and state management
type GameEventType =
  | 'phase_started'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_completed'
  | 'parameter_changed'
  | 'heat_intensity_changed'
  | 'fan_speed_changed'
  | 'convection_type_changed'
  | 'particle_heated'
  | 'particle_cooled'
  | 'twist_revealed'
  | 'insight_gained'
  | 'transfer_app_viewed'
  | 'test_answer_submitted'
  | 'test_completed'
  | 'mastery_achieved'
  | 'hint_requested'
  | 'reset_triggered'
  | 'sound_played'
  | 'animation_completed'
  | 'user_interaction';

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

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Play', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Play', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

// Props interface
interface ConvectionRendererProps {
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
}

// Particle interface for simulation
interface Particle {
  id: number;
  x: number;
  y: number;
  temp: number;
  vx: number;
  vy: number;
}

// ============================================================================
// COMPREHENSIVE TEST QUESTIONS (10 questions with scenarios)
// ============================================================================
const testQuestions: TestQuestion[] = [
  {
    scenario: "You're boiling water for pasta and notice bubbles forming at the bottom of the pot and rising to the surface.",
    question: "Why do the heated bubbles rise instead of staying at the bottom?",
    options: [
      { text: "The bubbles are pushed up by steam pressure", correct: false },
      { text: "Heated fluid expands and becomes less dense than surrounding cold fluid", correct: true },
      { text: "Gravity pulls cold water down, pushing hot water up", correct: false },
      { text: "Bubbles are attracted to the air at the surface", correct: false }
    ],
    explanation: "When fluid is heated, it expands and becomes less dense. Since density = mass/volume, the expanded hot fluid weighs less per unit volume than the surrounding cold fluid, so buoyancy forces push it upward. This density-driven movement is the foundation of convection."
  },
  {
    scenario: "An architect is designing a passive solar home and places radiators near the floor instead of near the ceiling.",
    question: "Why is this radiator placement more effective for heating the room?",
    options: [
      { text: "Heat radiates better from lower positions", correct: false },
      { text: "Hot air rises from the radiator, creating circulation throughout the room", correct: true },
      { text: "Cold air is lighter and stays at the bottom", correct: false },
      { text: "The floor absorbs and re-radiates heat better", correct: false }
    ],
    explanation: "Placing radiators near the floor takes advantage of natural convection. Hot air from the radiator rises, displacing cooler air at the top, which sinks down to be heated. This creates a continuous circulation pattern that warms the entire room efficiently."
  },
  {
    scenario: "A meteorologist explains that sea breezes blow from ocean to land during the day but reverse direction at night.",
    question: "What causes this daily reversal of wind direction?",
    options: [
      { text: "The Earth's rotation changes the wind pattern", correct: false },
      { text: "Tides push air back and forth with the water", correct: false },
      { text: "Land heats/cools faster than water, creating reversing convection patterns", correct: true },
      { text: "Barometric pressure changes between day and night", correct: false }
    ],
    explanation: "Land heats up faster than water during the day, so air rises over land and cooler sea air flows in (sea breeze). At night, land cools faster, so warmer air over the ocean rises and land air flows seaward (land breeze). This is convection on a regional scale!"
  },
  {
    scenario: "A CPU in a gaming computer reaches 90°C and throttles performance. The owner adds a fan to the heatsink.",
    question: "Why does adding a fan dramatically improve cooling even though air temperature is the same?",
    options: [
      { text: "The fan creates colder air by compressing it", correct: false },
      { text: "Forced convection removes heat much faster than natural convection", correct: true },
      { text: "The fan blocks heat radiation from other components", correct: false },
      { text: "Moving air has less heat capacity than still air", correct: false }
    ],
    explanation: "This is forced convection vs natural convection. A fan dramatically increases the convective heat transfer coefficient (h in Q=hAΔT) by constantly bringing fresh cool air to the heatsink surface and removing heated air. Forced convection can be 5-50x more effective than natural convection."
  },
  {
    scenario: "A chef compares cooking times: a regular oven takes 60 minutes to roast chicken, but a convection oven takes only 45 minutes.",
    question: "What makes convection ovens cook faster at the same temperature?",
    options: [
      { text: "Convection ovens have stronger heating elements", correct: false },
      { text: "A fan circulates hot air, improving heat transfer to the food", correct: true },
      { text: "Convection ovens use microwave energy in addition to heat", correct: false },
      { text: "The food cooks from inside out in convection ovens", correct: false }
    ],
    explanation: "In a regular oven, a layer of cooler air surrounds the food (boundary layer), slowing heat transfer. The convection oven's fan continuously blows away this boundary layer and brings fresh hot air to the food surface, dramatically increasing the heat transfer rate."
  },
  {
    scenario: "Oceanographers discover that the deep ocean circulates in a 'conveyor belt' pattern taking 1,000 years for water to complete one cycle.",
    question: "What primarily drives this global thermohaline circulation?",
    options: [
      { text: "Wind pushing surface water around the globe", correct: false },
      { text: "The moon's gravitational pull creating currents", correct: false },
      { text: "Temperature and salinity differences creating density variations", correct: true },
      { text: "Underwater volcanic activity heating the ocean floor", correct: false }
    ],
    explanation: "Thermohaline circulation is convection on a planetary scale. Near the poles, cold salty water (very dense) sinks to the ocean floor. Near the equator, warm water is less dense and stays at the surface. This density difference drives a slow but massive global circulation that affects climate worldwide."
  },
  {
    scenario: "A person feels cooler standing in front of a fan even though a thermometer shows the air temperature is 30°C (86°F) both with and without the fan.",
    question: "Why does the fan provide a cooling sensation without actually cooling the air?",
    options: [
      { text: "The fan creates a placebo psychological effect", correct: false },
      { text: "Moving air removes the warm boundary layer around skin and speeds evaporation", correct: true },
      { text: "The fan motor absorbs heat from the air", correct: false },
      { text: "Wind chill only affects thermometers differently than skin", correct: false }
    ],
    explanation: "The fan provides two cooling mechanisms: 1) It removes the warm, humid air layer that builds up next to your skin, replacing it with fresher room air, and 2) It speeds up sweat evaporation, which absorbs heat from your body. Your body is actually cooled - the room air isn't."
  },
  {
    scenario: "A geologist studies volcanic activity and notes that Earth's mantle slowly circulates despite being mostly solid rock.",
    question: "How can solid rock exhibit convection over millions of years?",
    options: [
      { text: "The rock melts completely due to core heat", correct: false },
      { text: "Rock under extreme pressure behaves as a very viscous fluid over long timescales", correct: true },
      { text: "Earthquakes shake the rock into motion", correct: false },
      { text: "Underground rivers of magma carry the rock along", correct: false }
    ],
    explanation: "Mantle convection demonstrates that convection can occur in materials we think of as solid! Under immense pressure and heat, rock flows like an extremely viscous fluid over millions of years. Hot rock from near the core slowly rises, while cooler rock near the surface sinks - driving plate tectonics!"
  },
  {
    scenario: "Engineers design data center cooling systems. They discover that hot aisles and cold aisles improve efficiency by 30%.",
    question: "Why does separating hot and cold airflow improve cooling efficiency?",
    options: [
      { text: "It prevents hot air from being recirculated to server intakes", correct: true },
      { text: "Cold aisles trap cold air better due to higher density", correct: false },
      { text: "Hot aisles radiate heat to the ceiling more efficiently", correct: false },
      { text: "The temperature difference creates stronger natural convection", correct: false }
    ],
    explanation: "Without separation, hot exhaust air can mix with and warm the intake air, reducing cooling efficiency. Hot/cold aisle containment ensures servers always intake the coldest available air and exhaust into a dedicated hot collection system. This is optimized forced convection design."
  },
  {
    scenario: "A physics student calculates that doubling the temperature difference between a heater and the room should double the convective heat transfer.",
    question: "What other factors significantly affect the convective heat transfer rate Q = hAΔT?",
    options: [
      { text: "Only the color of the surfaces involved", correct: false },
      { text: "The surface area (A) and the convection coefficient (h) which depends on fluid velocity", correct: true },
      { text: "Only the specific heat capacity of the fluid", correct: false },
      { text: "The thermal radiation from nearby objects", correct: false }
    ],
    explanation: "The convective heat transfer equation Q = hAΔT shows three key factors: temperature difference (ΔT), surface area (A), and the heat transfer coefficient (h). The coefficient h depends heavily on fluid properties and velocity - this is why fans (forced convection) dramatically increase h compared to still air (natural convection)."
  }
];

// ============================================================================
// TRANSFER APPLICATIONS (4 real-world applications)
// ============================================================================
const transferApps: TransferApp[] = [
  {
    icon: "🏠",
    title: "Home Heating & HVAC",
    short: "HVAC Systems",
    tagline: "Circulating comfort through convection",
    description: "Modern HVAC systems use forced convection to efficiently distribute heated or cooled air throughout buildings. Radiators and heating vents are strategically placed to create optimal natural convection patterns.",
    connection: "Convection allows heat energy to be transported by moving fluid (air) rather than slow conduction. A central furnace can heat an entire house because convection currents distribute warm air everywhere.",
    howItWorks: "Forced-air systems use fans to push conditioned air through ducts. Return vents collect cool (or warm) air for reconditioning. Radiators use natural convection - hot surfaces heat nearby air which rises, pulling cooler air in from below.",
    stats: [
      { value: "15%", label: "Energy from proper design" },
      { value: "40%", label: "Of home energy for HVAC" },
      { value: "5-10x", label: "Forced vs natural efficiency" },
      { value: "68°F", label: "Optimal indoor temp" }
    ],
    examples: [
      "Central air conditioning with supply and return ducts",
      "Baseboard radiators placed under windows",
      "Ceiling fans reversing direction for winter/summer",
      "Underfloor heating using rising warm air principle"
    ],
    companies: ["Carrier", "Trane", "Lennox", "Honeywell"],
    futureImpact: "Smart HVAC systems use AI to optimize airflow patterns based on occupancy, weather forecasts, and energy prices, reducing energy use by 20-30% while improving comfort.",
    color: "#3b82f6"
  },
  {
    icon: "🌊",
    title: "Ocean & Atmospheric Circulation",
    short: "Climate Systems",
    tagline: "Convection cells that shape our weather",
    description: "Earth's climate is driven by massive convection systems in both the oceans and atmosphere. Temperature differences between equator and poles create circulation patterns that distribute heat globally.",
    connection: "Convection operates on planetary scales. The Gulf Stream carries warm water (and its heat) from the Caribbean to Europe, making London warmer than Newfoundland at the same latitude.",
    howItWorks: "Equatorial regions receive more solar energy, heating water and air which rises. This creates low pressure, pulling in air/water from higher latitudes. At poles, cold dense fluid sinks, completing the convection cells (Hadley, Ferrel, Polar).",
    stats: [
      { value: "1,000 yr", label: "Ocean conveyor cycle" },
      { value: "30 Sv", label: "Gulf Stream flow rate" },
      { value: "5°C", label: "Gulf Stream warms Europe" },
      { value: "6", label: "Major atmospheric cells" }
    ],
    examples: [
      "Trade winds and westerlies from atmospheric convection",
      "El Niño/La Niña from Pacific convection changes",
      "Gulf Stream warming Western Europe",
      "Monsoons from land-sea convection reversals"
    ],
    companies: ["NOAA", "NASA Climate", "Met Office", "ECMWF"],
    futureImpact: "Climate models suggest the Atlantic thermohaline circulation may slow by 25-50% this century due to freshwater from melting ice, potentially cooling Europe while the globe warms.",
    color: "#06b6d4"
  },
  {
    icon: "💻",
    title: "Electronics Cooling",
    short: "Thermal Management",
    tagline: "Keeping processors from overheating",
    description: "Modern CPUs and GPUs can generate over 300W of heat in a space smaller than a postage stamp. Convection cooling - both natural and forced - is essential for reliable operation.",
    connection: "Convection transfers heat from hot component surfaces to the surrounding air. Heatsinks increase surface area (A in Q=hAΔT), while fans increase the heat transfer coefficient (h) through forced convection.",
    howItWorks: "A heatsink with many fins dramatically increases the surface area for convection. Fans blow cool air across these fins, replacing heated air with fresh cool air. Liquid cooling uses convecting liquid to carry heat to remote radiators.",
    stats: [
      { value: "300W+", label: "High-end CPU power" },
      { value: "90°C", label: "Max safe CPU temp" },
      { value: "50x", label: "Heatsink surface increase" },
      { value: "5-10x", label: "Fan improves h value" }
    ],
    examples: [
      "CPU air coolers with copper heatpipes",
      "AIO liquid cooling systems",
      "Data center hot/cold aisle containment",
      "Laptop thermal throttling prevention"
    ],
    companies: ["Noctua", "Corsair", "CoolerMaster", "NVIDIA"],
    futureImpact: "Advanced cooling technologies like vapor chambers, immersion cooling, and microfluidic systems are enabling denser data centers and more powerful mobile devices.",
    color: "#8b5cf6"
  },
  {
    icon: "🍳",
    title: "Cooking & Food Processing",
    short: "Culinary Science",
    tagline: "Heat circulation for perfect cooking",
    description: "Convection ovens, deep fryers, and boiling pots all rely on convection to transfer heat to food. Understanding convection helps chefs achieve consistent, efficient cooking results.",
    connection: "Convection carries heat from the heat source to food surfaces much faster than conduction through air. Moving hot fluid (air or oil) continuously replaces the cooled boundary layer next to food.",
    howItWorks: "In a convection oven, a fan circulates hot air around food, eliminating cool spots and reducing the insulating boundary layer. Deep frying works similarly - hot oil convects around food, cooking it rapidly and evenly.",
    stats: [
      { value: "25%", label: "Faster than conventional" },
      { value: "25°F", label: "Lower temp same result" },
      { value: "180°C", label: "Typical frying temp" },
      { value: "350°F", label: "Common roasting temp" }
    ],
    examples: [
      "Convection ovens for even baking and roasting",
      "Deep fryers for rapid cooking",
      "Boiling water for pasta (natural convection)",
      "Steam convection ovens for healthy cooking"
    ],
    companies: ["KitchenAid", "Breville", "Wolf", "Thermador"],
    futureImpact: "Smart ovens with multiple convection modes optimize airflow patterns for specific foods, while combi-steam ovens combine convection with steam for unprecedented cooking control.",
    color: "#f59e0b"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ConvectionRenderer: React.FC<ConvectionRendererProps> = ({
  currentPhase = 0,
  onPhaseComplete,
  onGameEvent
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
  const [heatIntensity, setHeatIntensity] = useState(50);
  const [isHeating, setIsHeating] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showFlowLines, setShowFlowLines] = useState(true);
  const [fanSpeed, setFanSpeed] = useState(0);

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
  const playSound = useCallback((type: 'bubble' | 'whoosh' | 'success' | 'click') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'bubble':
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'whoosh':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
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

    onGameEvent?.({ type: 'sound_played', data: { soundType: type } });
  }, [onGameEvent]);

  // Debounced navigation helper
  const handleNavigation = useCallback((nextPhase: number) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    lastNavigationRef.current = now;
    navigationTimeoutRef.current = setTimeout(() => {
      playSound('click');
      onPhaseComplete?.(nextPhase);
      onGameEvent?.({ type: 'phase_started', data: { phase: nextPhase, phaseLabel: phaseLabels[nextPhase] } });
    }, 50);
  }, [onPhaseComplete, onGameEvent, playSound]);

  // Cleanup navigation timeout
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Initialize particles
  useEffect(() => {
    const initialParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      initialParticles.push({
        id: i,
        x: 40 + Math.random() * 220,
        y: 40 + Math.random() * 180,
        temp: 0.3 + Math.random() * 0.4,
        vx: 0,
        vy: 0
      });
    }
    setParticles(initialParticles);
  }, []);

  // Particle animation
  useEffect(() => {
    if (!isHeating || particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let newX = p.x;
        let newY = p.y;
        let newTemp = p.temp;
        let newVx = p.vx;
        let newVy = p.vy;

        // Heat from bottom
        if (p.y > 200) {
          newTemp = Math.min(1, p.temp + 0.02 * (heatIntensity / 50));
        }
        // Cool at top
        if (p.y < 60) {
          newTemp = Math.max(0, p.temp - 0.015);
        }

        // Buoyancy force (hot rises, cold sinks)
        const buoyancy = (newTemp - 0.5) * -0.8 * (heatIntensity / 50);
        newVy += buoyancy;

        // Fan force (forced convection)
        if (fanSpeed > 0) {
          newVx += fanSpeed * 0.01;
        }

        // Drag
        newVx *= 0.95;
        newVy *= 0.95;

        // Random turbulence
        newVx += (Math.random() - 0.5) * 0.2;
        newVy += (Math.random() - 0.5) * 0.2;

        // Update position
        newX += newVx;
        newY += newVy;

        // Boundary conditions
        if (newX < 40) { newX = 40; newVx *= -0.5; }
        if (newX > 260) { newX = 260; newVx *= -0.5; }
        if (newY < 40) { newY = 40; newVy *= -0.5; }
        if (newY > 220) { newY = 220; newVy *= -0.5; }

        return { ...p, x: newX, y: newY, temp: newTemp, vx: newVx, vy: newVy };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isHeating, heatIntensity, fanSpeed, particles.length]);

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
    onGameEvent?.({ type: 'test_answer_submitted', data: {
      questionIndex: testIndex,
      correct: isCorrect,
      score: isCorrect ? testScore + 1 : testScore
    }});
  }, [testIndex, testAnswers, testScore, onGameEvent, playSound]);

  // Get particle color based on temperature
  const getParticleColor = (temp: number) => {
    const r = Math.floor(temp * 255);
    const b = Math.floor((1 - temp) * 255);
    const g = Math.floor(temp * 100);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // ============================================================================
  // RENDER HELPER FUNCTIONS (not React components)
  // ============================================================================

  // Render convection tank visualization
  const renderConvectionTank = (): React.ReactNode => {
    return (
      <svg viewBox="0 0 300 280" className="w-full h-56">
        <defs>
          <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <marker id="arrowDown" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowUp" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
            <path d="M8,0 L0,3 L8,6 z" fill="#ef4444" />
          </marker>
          <marker id="arrowRight" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 z" fill="#ef4444" />
          </marker>
          <marker id="arrowLeft" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
            <path d="M8,0 L0,3 L8,6 z" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="300" height="280" fill="#1e293b" rx="12" />

        {/* Tank walls */}
        <rect x="30" y="30" width="240" height="200" fill="#0f172a" stroke="#64748b" strokeWidth="3" rx="5" />

        {/* Heat source at bottom */}
        <rect
          x="35"
          y="225"
          width="230"
          height="15"
          fill={`rgb(${Math.floor(heatIntensity * 2.5)}, ${Math.floor(heatIntensity * 0.5)}, 0)`}
          rx="3"
        />

        {/* Heat waves */}
        {isHeating && [0, 1, 2, 3, 4].map(i => (
          <path
            key={i}
            d={`M${60 + i * 45},225 Q${65 + i * 45},${210 - heatIntensity * 0.3} ${70 + i * 45},225`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            opacity={0.5 + (heatIntensity / 200)}
          >
            <animate
              attributeName="d"
              values={`M${60 + i * 45},225 Q${65 + i * 45},${210 - heatIntensity * 0.3} ${70 + i * 45},225;M${60 + i * 45},225 Q${65 + i * 45},${200 - heatIntensity * 0.3} ${70 + i * 45},225;M${60 + i * 45},225 Q${65 + i * 45},${210 - heatIntensity * 0.3} ${70 + i * 45},225`}
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Flow arrows showing convection pattern */}
        {showFlowLines && (
          <g opacity="0.5">
            <path d="M50,80 L50,180" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowDown)" />
            <path d="M70,80 L70,180" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
            <path d="M80,210 L220,210" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowRight)" />
            <path d="M250,180 L250,80" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowUp)" />
            <path d="M230,180 L230,80" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
            <path d="M220,50 L80,50" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowLeft)" />
          </g>
        )}

        {/* Particles */}
        {particles.map(p => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r="6"
            fill={getParticleColor(p.temp)}
            opacity="0.85"
          >
            {isHeating && (
              <animate
                attributeName="r"
                values="5;7;5"
                dur={`${1 + p.temp}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))}

        {/* Fan indicator for forced convection */}
        {fanSpeed > 0 && (
          <g transform="translate(10, 130)">
            <rect x="0" y="-20" width="20" height="40" fill="#475569" rx="3" />
            <circle cx="10" cy="0" r="8" fill="#22c55e" />
            <g>
              <line x1="10" y1="-6" x2="10" y2="6" stroke="white" strokeWidth="2">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 10 0"
                  to="360 10 0"
                  dur={`${1 / (fanSpeed / 50)}s`}
                  repeatCount="indefinite"
                />
              </line>
              <line x1="4" y1="0" x2="16" y2="0" stroke="white" strokeWidth="2">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 10 0"
                  to="360 10 0"
                  dur={`${1 / (fanSpeed / 50)}s`}
                  repeatCount="indefinite"
                />
              </line>
            </g>
            <text x="10" y="35" textAnchor="middle" fill="#94a3b8" fontSize="8">FAN</text>
          </g>
        )}

        {/* Labels */}
        <text x="150" y="250" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">
          HEAT SOURCE ({heatIntensity}%)
        </text>
        <text x="150" y="22" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">
          COOLING ZONE
        </text>

        {/* Legend */}
        <g transform="translate(268, 50)">
          <rect x="0" y="0" width="8" height="40" fill="url(#tempGradient)" rx="2" />
          <text x="12" y="8" fill="#ef4444" fontSize="8">Hot</text>
          <text x="12" y="45" fill="#3b82f6" fontSize="8">Cold</text>
        </g>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Hook phase - engaging opening
  const renderHook = (): React.ReactNode => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">HEAT TRANSFER</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        The Rising Heat Mystery
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
        Why does hot water rise while cold water sinks?
      </p>

      {/* Premium card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 max-w-2xl border border-slate-700/50 shadow-2xl shadow-orange-500/5 mb-8">
        <svg viewBox="0 0 280 180" className="w-full h-40 mx-auto">
          {/* Pot */}
          <ellipse cx="140" cy="150" rx="80" ry="15" fill="#64748b" />
          <rect x="60" y="80" width="160" height="70" fill="#475569" rx="5" />
          <ellipse cx="140" cy="80" rx="80" ry="15" fill="#64748b" />

          {/* Water */}
          <ellipse cx="140" cy="85" rx="70" ry="12" fill="#3b82f6" opacity="0.6" />

          {/* Rising bubbles */}
          {[0, 1, 2, 3, 4].map(i => (
            <circle
              key={i}
              cx={90 + i * 25}
              cy={130}
              r={3 + (i % 2) * 2}
              fill="white"
              opacity="0.7"
            >
              <animate attributeName="cy" values="140;80;140" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.3;0.7" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Steam */}
          <path d="M100,60 Q110,40 100,20" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.5">
            <animate attributeName="d" values="M100,60 Q110,40 100,20;M100,60 Q90,35 100,10;M100,60 Q110,40 100,20" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M140,55 Q150,35 140,15" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.5">
            <animate attributeName="d" values="M140,55 Q150,35 140,15;M140,55 Q130,30 140,5;M140,55 Q150,35 140,15" dur="2.5s" repeatCount="indefinite" />
          </path>
          <path d="M180,60 Q190,40 180,20" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.5">
            <animate attributeName="d" values="M180,60 Q190,40 180,20;M180,60 Q170,35 180,10;M180,60 Q190,40 180,20" dur="2.2s" repeatCount="indefinite" />
          </path>

          {/* Flame */}
          <path d="M100,165 Q120,150 140,165 Q160,150 180,165" fill="#ef4444" />
          <path d="M110,168 Q130,158 150,168 Q170,158 170,168" fill="#f59e0b" />
        </svg>

        <p className="text-lg text-slate-300 mt-4">
          This movement of heat through <span className="text-purple-400 font-semibold">flowing fluid</span> is <strong className="text-orange-400">CONVECTION</strong> — it heats your home, drives weather patterns, and moves tectonic plates!
        </p>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => handleNavigation(1)}
        className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-2">
          Explore Convection
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <p className="mt-6 text-sm text-slate-500">Heat transfer by fluid motion</p>
    </div>
  );

  // Predict phase
  const renderPredict = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">Make Your Prediction</h2>
        <p className="text-gray-600">
          When you heat water from the bottom, hot water rises to the top.
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <svg viewBox="0 0 200 100" className="w-full h-24 mx-auto">
          <rect x="40" y="20" width="120" height="60" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" rx="5" />
          <rect x="45" y="60" width="110" height="15" fill="#ef4444" opacity="0.4" />
          <text x="100" y="70" textAnchor="middle" fill="#fca5a5" fontSize="8">HOT</text>
          <rect x="45" y="25" width="110" height="30" fill="#3b82f6" opacity="0.3" />
          <text x="100" y="42" textAnchor="middle" fill="#93c5fd" fontSize="8">COLD</text>
          <path d="M100,75 L100,35" stroke="#ef4444" strokeWidth="3" markerEnd="url(#predArrow)" />
          <defs>
            <marker id="predArrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,6 L4,0 L8,6 z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
        <p className="text-center text-sm text-blue-700 font-medium mt-2">
          Why does hot water rise?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { id: 'A', text: 'Heat makes water lighter in color so it floats', desc: 'Visual property change' },
          { id: 'B', text: 'Hot water expands and becomes less dense than cold water', desc: 'Density-driven buoyancy' },
          { id: 'C', text: 'Hot molecules move faster and push themselves upward', desc: 'Kinetic energy effect' },
          { id: 'D', text: 'Steam bubbles carry the water up', desc: 'Bubble lift mechanism' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setPrediction(option.id);
              playSound('click');
              onGameEvent?.({ type: 'prediction_made', data: { prediction: option.id } });
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                prediction === option.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {option.id}
              </span>
              <div>
                <p className="font-medium text-gray-800">{option.text}</p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onMouseDown={() => handleNavigation(2)}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  // Play phase - interactive simulation
  const renderPlay = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Convection Cell Lab</h2>
        <p className="text-gray-600">Watch how temperature differences drive fluid circulation</p>
      </div>

      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-4">
        {renderConvectionTank()}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Heat Power</p>
          <p className="font-bold text-red-600">{heatIntensity}%</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Hot Particles</p>
          <p className="font-bold text-orange-600">{particles.filter(p => p.temp > 0.6).length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Cold Particles</p>
          <p className="font-bold text-blue-600">{particles.filter(p => p.temp < 0.4).length}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Heat Intensity:</span>
            <span className="font-medium text-red-600">{heatIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={heatIntensity}
            onChange={(e) => {
              setHeatIntensity(Number(e.target.value));
              onGameEvent?.({ type: 'heat_intensity_changed', data: { value: Number(e.target.value) } });
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onMouseDown={() => {
              setIsHeating(!isHeating);
              playSound('click');
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              isHeating
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isHeating ? 'Heating: ON' : 'Heating: OFF'}
          </button>
          <button
            onMouseDown={() => {
              setShowFlowLines(!showFlowLines);
              playSound('click');
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              showFlowLines
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {showFlowLines ? 'Flow Lines: ON' : 'Flow Lines: OFF'}
          </button>
        </div>
      </div>

      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
        <h4 className="font-semibold text-orange-800 mb-2">The Convection Cycle:</h4>
        <ol className="text-sm text-gray-700 space-y-1">
          <li>1. <span className="text-red-600 font-medium">Bottom heats</span> → fluid expands → density decreases</li>
          <li>2. <span className="text-orange-600 font-medium">Hot fluid rises</span> (buoyancy force)</li>
          <li>3. <span className="text-blue-600 font-medium">Top cools</span> → fluid contracts → density increases</li>
          <li>4. <span className="text-cyan-600 font-medium">Cold fluid sinks</span> → returns to bottom</li>
          <li>5. <span className="text-purple-600 font-medium">Cycle repeats</span> → continuous circulation!</li>
        </ol>
      </div>

      <button
        onMouseDown={() => handleNavigation(3)}
        className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        Review the Concepts
      </button>
    </div>
  );

  // Review phase
  const renderReview = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">Understanding Convection</h2>
        <p className="text-gray-600">
          {prediction === 'B'
            ? "Your prediction was correct! Density differences drive convection."
            : "The answer was B — hot fluid expands and becomes less dense, so it rises!"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
          <h4 className="font-semibold text-orange-800 mb-2">Natural Convection</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Driven by temperature-induced density differences</li>
            <li>• Hot fluid is less dense → rises</li>
            <li>• Cold fluid is more dense → sinks</li>
            <li>• Gravity is essential for this to work</li>
            <li>• Creates self-sustaining circulation</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Three Heat Transfer Types</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Conduction:</strong> Through direct contact</li>
            <li>• <strong>Convection:</strong> Through fluid movement</li>
            <li>• <strong>Radiation:</strong> Through electromagnetic waves</li>
            <li>• Convection is often the most efficient!</li>
          </ul>
        </div>
      </div>

      <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-2">The Physics</h4>
        <div className="bg-white rounded-lg p-3 border border-purple-200 mb-3">
          <p className="text-center font-mono text-lg text-purple-700">Q = h × A × ΔT</p>
          <p className="text-center text-sm text-gray-500 mt-1">
            Heat transfer = coefficient × area × temperature difference
          </p>
        </div>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>h</strong> = convective heat transfer coefficient (depends on fluid velocity)</li>
          <li>• <strong>A</strong> = surface area for heat transfer</li>
          <li>• <strong>ΔT</strong> = temperature difference between surface and fluid</li>
        </ul>
      </div>

      <button
        onMouseDown={() => handleNavigation(4)}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Twist predict phase
  const renderTwistPredict = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">The Fan Paradox</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          A fan blows air at you on a hot day. The air temperature is 30°C (86°F) —
          <span className="text-amber-600 font-medium"> the same temperature with or without the fan</span>.
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <svg viewBox="0 0 200 100" className="w-full h-24 mx-auto">
          {/* Fan */}
          <circle cx="40" cy="50" r="25" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
          <line x1="40" y1="25" x2="40" y2="75" stroke="white" strokeWidth="3">
            <animateTransform attributeName="transform" type="rotate" from="0 40 50" to="360 40 50" dur="0.5s" repeatCount="indefinite" />
          </line>
          <line x1="15" y1="50" x2="65" y2="50" stroke="white" strokeWidth="3">
            <animateTransform attributeName="transform" type="rotate" from="0 40 50" to="360 40 50" dur="0.5s" repeatCount="indefinite" />
          </line>

          {/* Air flow */}
          <path d="M70,50 L150,50" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 3">
            <animate attributeName="stroke-dashoffset" values="0;-16" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M70,40 L140,35" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 3" opacity="0.7">
            <animate attributeName="stroke-dashoffset" values="0;-16" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M70,60 L140,65" stroke="#60a5fa" strokeWidth="2" strokeDasharray="5 3" opacity="0.7">
            <animate attributeName="stroke-dashoffset" values="0;-16" dur="0.5s" repeatCount="indefinite" />
          </path>

          {/* Person */}
          <circle cx="170" cy="40" r="12" fill="#fcd9b6" />
          <rect x="163" y="52" width="14" height="25" fill="#3b82f6" rx="3" />
        </svg>
        <p className="text-center text-lg font-medium text-gray-800 mt-4">
          Why does the fan make you feel cooler if the air isn't any colder?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { id: 'A', text: 'The fan actually does cool the air a little bit', desc: 'Temperature reduction' },
          { id: 'B', text: 'The fan creates a psychological placebo effect', desc: 'Mind over matter' },
          { id: 'C', text: 'Moving air speeds up evaporation and convection from your skin', desc: 'Forced convection effect' },
          { id: 'D', text: 'The fan blocks heat radiation from reaching you', desc: 'Radiation shielding' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setTwistPrediction(option.id);
              playSound('click');
              onGameEvent?.({ type: 'prediction_made', data: { twist: true, prediction: option.id } });
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                twistPrediction === option.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {option.id}
              </span>
              <div>
                <p className="font-medium text-gray-800">{option.text}</p>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onMouseDown={() => handleNavigation(5)}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          Discover Forced Convection
        </button>
      )}
    </div>
  );

  // Twist play phase
  const renderTwistPlay = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Forced Convection Lab</h2>
        <p className="text-gray-600">Add a fan to dramatically increase heat transfer</p>
      </div>

      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-4">
        {renderConvectionTank()}
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Fan Speed</p>
          <p className="font-bold text-purple-600">{fanSpeed}%</p>
        </div>
        <div className="bg-cyan-50 rounded-lg p-3">
          <p className="text-sm text-gray-500">Convection Type</p>
          <p className="font-bold text-cyan-600">{fanSpeed > 0 ? 'Forced' : 'Natural'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Fan Speed (Forced Convection):</span>
            <span className="font-medium text-purple-600">{fanSpeed}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fanSpeed}
            onChange={(e) => {
              setFanSpeed(Number(e.target.value));
              if (Number(e.target.value) > 0) playSound('whoosh');
              onGameEvent?.({ type: 'fan_speed_changed', data: { value: Number(e.target.value) } });
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Heat Intensity:</span>
            <span className="font-medium text-red-600">{heatIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={heatIntensity}
            onChange={(e) => setHeatIntensity(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-3">Natural vs Forced Convection:</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-orange-600 font-semibold text-sm mb-1">Natural</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Driven by buoyancy</li>
              <li>• Slower heat transfer</li>
              <li>• No energy input</li>
              <li>• Ex: Room heating</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-purple-600 font-semibold text-sm mb-1">Forced</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Driven by fans/pumps</li>
              <li>• Much faster transfer</li>
              <li>• Requires energy</li>
              <li>• Ex: CPU cooling</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-center text-purple-700 mt-3 font-medium">
          Forced convection can be 5-50x more efficient!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation(6)}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        Review the Discovery
      </button>
    </div>
  );

  // Twist review phase
  const renderTwistReview = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-gray-800">The Forced Convection Discovery</h2>
        <p className="text-gray-600">
          {twistPrediction === 'C'
            ? "You got it! Moving air enhances convection and evaporation."
            : "The answer was C — the fan speeds up heat and moisture removal from your skin!"}
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h3 className="font-semibold text-purple-800 mb-4">Why Fans Cool You (Without Cooling Air)</h3>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">1</span>
            <p><strong>Removes warm boundary layer:</strong> Still air next to your skin gets warm. Moving air constantly replaces it with fresher room-temperature air.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">2</span>
            <p><strong>Speeds evaporation:</strong> Sweat evaporates faster in moving air, absorbing heat from your body (latent heat of vaporization).</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">3</span>
            <p><strong>Increases h value:</strong> The heat transfer coefficient (h in Q=hAΔT) increases dramatically with air velocity.</p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">Key Insight</h4>
        <p className="text-gray-700">
          Forced convection doesn't change the <em>temperature</em> of the air — it increases the <em>rate</em>
          of heat transfer. This is why fans are useless in empty rooms but feel wonderful when you're in them!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation(7)}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Transfer phase
  const renderTransfer = (): React.ReactNode => {
    const app = transferApps[selectedApp];

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Convection in Action</h2>
          <p className="text-gray-600">From your home to the entire planet</p>
        </div>

        {/* App selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {transferApps.map((a, i) => (
            <button
              key={i}
              onMouseDown={() => {
                setSelectedApp(i);
                playSound('click');
                onGameEvent?.({ type: 'transfer_app_viewed', data: { app: a.title } });
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all ${
                selectedApp === i
                  ? 'text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedApp === i ? { backgroundColor: a.color } : {}}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 text-white" style={{ backgroundColor: app.color }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{app.icon}</span>
              <div>
                <h3 className="text-xl font-bold">{app.title}</h3>
                <p className="text-white/80">{app.tagline}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-gray-700">{app.description}</p>

            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 mb-1">Convection Connection</h4>
              <p className="text-sm text-gray-600">{app.connection}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-1">How It Works</h4>
              <p className="text-sm text-gray-600">{app.howItWorks}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {app.stats.map((stat, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-2 text-center">
                  <p className="font-bold text-lg" style={{ color: app.color }}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Examples:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {app.examples.map((ex, i) => (
                  <li key={i}>• {ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button
          onMouseDown={() => handleNavigation(8)}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg shadow-lg"
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Knowledge Check</h2>
          <span className="text-sm text-gray-500">
            Question {testIndex + 1} of {testQuestions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
            style={{ width: `${((testIndex + (answered ? 1 : 0)) / testQuestions.length) * 100}%` }}
          />
        </div>

        {/* Scenario */}
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <p className="text-sm text-orange-600 font-medium mb-1">Scenario:</p>
          <p className="text-gray-700">{question.scenario}</p>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <p className="font-semibold text-gray-800 mb-4">{question.question}</p>

          <div className="space-y-2">
            {question.options.map((option, i) => {
              const isSelected = testAnswers[testIndex] === i;
              const isCorrect = option.correct;
              const showResult = answered;

              let bgColor = 'bg-gray-50 hover:bg-gray-100';
              let borderColor = 'border-gray-200';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-500';
                } else if (isSelected) {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-500';
                }
              } else if (isSelected) {
                bgColor = 'bg-orange-50';
                borderColor = 'border-orange-500';
              }

              return (
                <button
                  key={i}
                  onMouseDown={() => !answered && handleTestAnswer(i)}
                  disabled={answered}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${bgColor} ${borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                      showResult && isCorrect ? 'bg-green-500 text-white' :
                      showResult && isSelected ? 'bg-red-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    <p className="text-gray-700">{option.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2">Explanation</h4>
            <p className="text-sm text-gray-700">{question.explanation}</p>
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
                onGameEvent?.({ type: 'test_completed', data: { score: testScore, total: testQuestions.length } });
                handleNavigation(9);
              }
            }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-lg shadow-lg"
          >
            {testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}

        {/* Score indicator */}
        <div className="text-center text-sm text-gray-500">
          Current Score: {testScore} / {testIndex + (answered ? 1 : 0)}
        </div>
      </div>
    );
  };

  // Mastery phase
  const renderMastery = (): React.ReactNode => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">
            {passed ? '🔥' : '📚'}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {passed ? 'Convection Mastered!' : 'Keep Learning!'}
          </h2>
          <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white text-3xl font-bold px-6 py-3 rounded-xl">
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
          <h3 className="font-semibold text-orange-800 mb-4">Key Concepts Mastered</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Hot fluid rises because it expands and becomes less dense</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Convection cells create continuous circulation patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Forced convection (fans/pumps) is 5-50x more efficient than natural</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Q = hAΔT governs convective heat transfer rate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Convection drives weather, ocean currents, and tectonic plates</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-6 border shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">The Physics Formula</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-mono text-orange-700 mb-2">Q = h × A × ΔT</p>
            <p className="text-sm text-gray-500">
              Heat rate = coefficient × area × temp difference
            </p>
          </div>
          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <p>• h increases with fluid velocity (forced > natural convection)</p>
            <p>• Large surface areas (fins, heatsinks) increase heat transfer</p>
            <p>• Greater ΔT means faster heat transfer</p>
          </div>
        </div>

        {!passed && (
          <button
            onMouseDown={() => {
              setTestIndex(0);
              setTestScore(0);
              setTestAnswers(new Array(10).fill(null));
              setShowExplanation(false);
              handleNavigation(8);
            }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-lg shadow-lg"
          >
            Try Again
          </button>
        )}

        {passed && (
          <div className="text-center text-green-600 font-semibold">
            Congratulations! You've mastered convection!
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const renderPhase = (): React.ReactNode => {
    switch (currentPhase) {
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-orange-400">Convection</span>
          <div className="flex gap-1.5">
            {[0,1,2,3,4,5,6,7,8,9].map((i) => (
              <button
                key={i}
                onMouseDown={() => handleNavigation(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentPhase === i
                    ? 'bg-gradient-to-r from-orange-400 to-red-400 w-6 shadow-lg shadow-orange-500/50'
                    : currentPhase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">Phase {currentPhase + 1}/10</span>
        </div>
      </div>

      <div className={`relative z-10 pt-16 pb-8 max-w-2xl mx-auto ${isMobile ? 'px-4' : 'px-6'}`}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default ConvectionRenderer;
