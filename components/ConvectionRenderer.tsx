'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// CONVECTION RENDERER - PREMIUM 10-PHASE PHYSICS GAME
// Physics: Heat transfer through fluid motion (Q = hAΔT)
// Hot fluid rises (less dense), cold fluid sinks (more dense) - creating circulation
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Play',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

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

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface ConvectionRendererProps {
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  onGameEvent?: (event: GameEvent) => void;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  temp: number;
  vx: number;
  vy: number;
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

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFER APPLICATIONS (4 Real-World Applications)
// ═══════════════════════════════════════════════════════════════════════════

const transferApps: TransferApp[] = [
  {
    icon: "🌤",
    title: "Weather & Climate Systems",
    short: "Weather",
    tagline: "Convection drives global atmospheric circulation",
    description: "Atmospheric convection is the engine behind weather - from gentle breezes to violent thunderstorms. When the sun heats Earth's surface unevenly, it triggers massive convection cells that circulate air and create our weather patterns.",
    connection: "The same physics that makes hot water rise in your pot creates thunderstorms, trade winds, and monsoons. Temperature differences drive air circulation on scales from meters to thousands of kilometers.",
    howItWorks: "Warm air near heated surfaces expands, becomes less dense, and rises - forming updrafts. As it ascends, it cools, becomes denser, and eventually sinks. This creates convection cells that can span from local thermals to global Hadley cells spanning 30 degrees of latitude.",
    stats: [
      { value: "3 cells", label: "Per hemisphere" },
      { value: "15 km", label: "Thunderstorm height" },
      { value: "300 km/h", label: "Jet stream speed" },
      { value: "10^18 W", label: "Solar heating" }
    ],
    examples: [
      "Thunderstorms from strong daytime heating over land",
      "Sea breezes from land-ocean temperature differences",
      "Trade winds from Hadley cell circulation",
      "Monsoons from seasonal continental heating"
    ],
    companies: ["NOAA", "NASA", "European Centre for Medium-Range Weather Forecasts", "UK Met Office"],
    futureImpact: "Climate change is intensifying convection patterns - stronger storms, shifting monsoons, and altered precipitation could affect billions who depend on predictable weather for agriculture and water.",
    color: "#3b82f6"
  },
  {
    icon: "🌊",
    title: "Ocean Thermohaline Circulation",
    short: "Oceans",
    tagline: "The global ocean conveyor belt",
    description: "Thermohaline circulation moves water around the entire planet in a 1,000-year cycle. This 'global conveyor belt' transports heat, nutrients, and carbon dioxide, regulating Earth's climate and supporting marine ecosystems.",
    connection: "Ocean convection is driven by density differences from temperature (thermo) and salinity (haline). Cold, salty water is dense and sinks; warm, fresh water rises - the same buoyancy-driven flow as a heated pot.",
    howItWorks: "Near the poles, surface water cools and becomes saltier as sea ice forms (leaving salt behind). This ultra-dense water sinks to the ocean floor (downwelling) and flows toward the equator. Warm surface water flows poleward to replace it, completing a global loop.",
    stats: [
      { value: "1000 yr", label: "Full cycle time" },
      { value: "30 Sv", label: "Gulf Stream flow" },
      { value: "5°C", label: "Europe warming" },
      { value: "4 km", label: "Deep water depth" }
    ],
    examples: [
      "Gulf Stream warming Western Europe by 5°C",
      "Antarctic Bottom Water formation in Weddell Sea",
      "North Atlantic Deep Water driving the conveyor",
      "Upwelling zones creating rich fishing grounds"
    ],
    companies: ["Woods Hole Oceanographic Institution", "Scripps Institution", "NOAA Ocean Service", "CSIRO Oceans"],
    futureImpact: "Melting ice sheets add fresh water that could slow thermohaline circulation by 25-50% this century, potentially disrupting the Gulf Stream and dramatically cooling Europe while warming tropics.",
    color: "#06b6d4"
  },
  {
    icon: "🖥️",
    title: "Electronics & Data Center Cooling",
    short: "Computing",
    tagline: "Keeping chips cool in the AI age",
    description: "Every electronic device relies on convection to survive. A modern GPU generates 300+ watts in a chip smaller than a postage stamp - without convective cooling, it would melt in seconds. Data centers use convection engineering to cool millions of servers.",
    connection: "Heat sinks exploit convection by increasing surface area. Fans create forced convection, boosting the heat transfer coefficient (h) by 10-50x. The same Q = hAΔT physics determines whether your laptop throttles or your server farm overheats.",
    howItWorks: "Heat conducts from chip to heatsink base, spreads through fins. Natural convection: warm air rises from fins, drawing cool air from below. Forced convection: fans push air across fins at high velocity, dramatically increasing heat transfer rate.",
    stats: [
      { value: "300+ W", label: "GPU TDP (H100)" },
      { value: "40-60%", label: "Data center for cooling" },
      { value: "1 MW", label: "Per server rack" },
      { value: "PUE 1.1", label: "Best efficiency" }
    ],
    examples: [
      "CPU heatsinks with optimized fin geometry",
      "Hot aisle/cold aisle data center layouts",
      "Liquid cooling loops for high-performance GPUs",
      "Immersion cooling in dielectric fluid"
    ],
    companies: ["Noctua", "NVIDIA", "Google Data Centers", "Microsoft Azure"],
    futureImpact: "AI training clusters now require megawatts of cooling. Liquid and immersion cooling are becoming standard as air convection reaches its limits. Waste heat recovery could heat entire neighborhoods.",
    color: "#ef4444"
  },
  {
    icon: "🌋",
    title: "Mantle Convection & Plate Tectonics",
    short: "Geology",
    tagline: "Convection powers continental drift",
    description: "Earth's solid mantle actually flows like an extremely viscous fluid over millions of years. Convection in the mantle drives plate tectonics - moving continents, creating earthquakes, and building mountains.",
    connection: "Even 'solid' rock behaves as a fluid under extreme pressure and heat over geological timescales. Hot rock near the core expands, rises slowly, cools near the surface, and sinks - the same density-driven flow as your boiling water, just 10 billion times slower.",
    howItWorks: "Heat from Earth's core (radioactive decay + primordial heat) warms the lower mantle to ~4000°C. This hot rock expands, becomes less dense, and rises as mantle plumes. At the surface it cools, becomes denser, and sinks at subduction zones. This 100+ million year cycle moves tectonic plates at ~2-10 cm/year.",
    stats: [
      { value: "2-10 cm/yr", label: "Plate speed" },
      { value: "2900 km", label: "Mantle thickness" },
      { value: "4000°C", label: "Core boundary" },
      { value: "10^21 Pa·s", label: "Mantle viscosity" }
    ],
    examples: [
      "Mid-ocean ridges where hot rock rises",
      "Subduction zones where cool plates sink",
      "Hawaiian hotspot from a mantle plume",
      "Himalayan orogeny from plate collision"
    ],
    companies: ["USGS", "Caltech Seismological Lab", "ETH Zurich", "GFZ Potsdam"],
    futureImpact: "Understanding mantle convection helps predict volcanic eruptions, locate geothermal energy sources, and find mineral deposits formed by ancient circulation. It also explains why earthquakes cluster at plate boundaries.",
    color: "#f59e0b"
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// TEST QUESTIONS (10 Scenario-Based Questions)
// ═══════════════════════════════════════════════════════════════════════════

const testQuestions: TestQuestion[] = [
  {
    scenario: "You're boiling pasta and notice the water circulating - rising in the center and sinking along the edges of the pot.",
    question: "What physical property change causes the hot water at the bottom to rise?",
    options: [
      { text: "Hot water becomes chemically lighter", correct: false },
      { text: "Hot water expands and becomes less dense than surrounding cold water", correct: true },
      { text: "Steam bubbles carry the water molecules upward", correct: false },
      { text: "Heat energy pushes the water up like a jet", correct: false }
    ],
    explanation: "When water is heated, it expands (thermal expansion). The same mass now occupies more volume, so density = mass/volume decreases. Less dense fluid experiences buoyancy forces and rises, while denser cold fluid sinks to replace it. This density-driven flow is the foundation of all convection."
  },
  {
    scenario: "An architect designs a home with radiators placed near the floor under windows.",
    question: "Why is this radiator placement more effective than ceiling-mounted heaters?",
    options: [
      { text: "Heat radiates better from low positions", correct: false },
      { text: "Hot air rises from the radiator, creating circulation that warms the entire room", correct: true },
      { text: "Cold air is lighter and naturally stays at floor level", correct: false },
      { text: "Windows conduct heat better at lower heights", correct: false }
    ],
    explanation: "Placing heaters low takes advantage of natural convection. Hot air rises from the radiator, displaces cooler air at the ceiling, which then sinks down the opposite wall to be reheated. This creates a convection cell that circulates warmth throughout the room. Ceiling heaters would trap hot air at the top with no circulation."
  },
  {
    scenario: "A coastal town experiences predictable winds: sea breeze during the day (ocean to land) and land breeze at night (land to ocean).",
    question: "What causes this daily wind reversal?",
    options: [
      { text: "Earth's rotation changes direction of wind", correct: false },
      { text: "Tides push air along with water movement", correct: false },
      { text: "Land heats and cools faster than water, reversing the convection pattern", correct: true },
      { text: "Atmospheric pressure is always higher over oceans", correct: false }
    ],
    explanation: "Land has lower heat capacity than water - it heats quickly by day and cools quickly at night. During the day, hot air over land rises, creating low pressure; cooler air from the sea flows in (sea breeze). At night, land cools faster, so air rises over the still-warm ocean, and cooler land air flows seaward (land breeze). This is convection on a regional scale!"
  },
  {
    scenario: "A data center engineer discovers that servers at the end of a row are overheating while those at the start stay cool.",
    question: "What convection principle explains this problem?",
    options: [
      { text: "Air pressure decreases along the row", correct: false },
      { text: "The air gets progressively heated as it passes each server, reducing ΔT", correct: true },
      { text: "Servers at the end generate more heat", correct: false },
      { text: "Convection currents reverse direction mid-row", correct: false }
    ],
    explanation: "Heat transfer rate Q = hAΔT depends on temperature difference. As air flows down the row, each server heats it. By the end, the air is nearly as hot as the server exhaust, so ΔT ≈ 0 and heat transfer drops dramatically. The solution is hot aisle/cold aisle layout with dedicated exhaust paths to maintain high ΔT for all servers."
  },
  {
    scenario: "A chef notices that a convection oven cooks food 25% faster than a regular oven at the same temperature setting.",
    question: "What makes convection ovens more efficient without increasing air temperature?",
    options: [
      { text: "Convection ovens have more powerful heating elements", correct: false },
      { text: "The fan increases air velocity, raising the heat transfer coefficient (h)", correct: true },
      { text: "Circulating air has higher heat capacity than still air", correct: false },
      { text: "The fan creates pressure that forces heat into food", correct: false }
    ],
    explanation: "In Q = hAΔT, the heat transfer coefficient (h) depends strongly on fluid velocity. A convection oven's fan creates forced convection, which can increase h by 2-5x compared to natural convection in a regular oven. The fan also continuously removes the cool boundary layer around the food, maintaining maximum ΔT at the food surface."
  },
  {
    scenario: "Oceanographers track a water mass that sinks in the North Atlantic, flows along the ocean floor, and doesn't return to the surface for 1,000 years.",
    question: "What property makes this North Atlantic water sink so deeply?",
    options: [
      { text: "It's pushed down by surface winds", correct: false },
      { text: "Cold temperatures make it denser than underlying water", correct: false },
      { text: "It's both cold AND salty, making it extremely dense", correct: true },
      { text: "Ice formation pushes it downward mechanically", correct: false }
    ],
    explanation: "Thermohaline circulation depends on both temperature (thermo) and salinity (haline). In the North Atlantic, water cools AND becomes saltier as ice forms (sea ice is fresh; salt is left behind). This creates the densest water in the ocean, which sinks to the bottom and drives the global conveyor belt circulation."
  },
  {
    scenario: "A person feels noticeably cooler standing in front of a fan, even though a thermometer shows the air temperature is unchanged at 30°C.",
    question: "Why does the fan provide cooling sensation without changing air temperature?",
    options: [
      { text: "Moving air has less thermal energy than still air", correct: false },
      { text: "The fan removes the warm boundary layer and speeds sweat evaporation", correct: true },
      { text: "Air velocity creates a wind chill that thermometers can't detect", correct: false },
      { text: "The fan motor absorbs heat from the surrounding air", correct: false }
    ],
    explanation: "Your body heats a thin layer of air next to your skin. In still air, this warm boundary layer acts as insulation. A fan blows away this layer (increasing h in Q = hAΔT) and brings fresh 30°C air to your skin. It also speeds sweat evaporation, which removes latent heat. Your body actually loses more heat - the room temperature doesn't change, but your body temperature regulation improves."
  },
  {
    scenario: "Geologists observe that the mantle rock beneath Hawaii is hotter than surrounding mantle, creating a 'hotspot' that has built a chain of volcanic islands.",
    question: "What convection feature creates stationary hotspots as plates move overhead?",
    options: [
      { text: "Volcanic eruptions heat the surrounding mantle rock", correct: false },
      { text: "A mantle plume - a column of hot rock rising from near the core", correct: true },
      { text: "Friction from plate movement heats the mantle locally", correct: false },
      { text: "Radioactive minerals concentrate beneath volcanic islands", correct: false }
    ],
    explanation: "Mantle plumes are part of the mantle convection system - narrow columns of hot, buoyant rock rising from the core-mantle boundary. As the plume rises and reaches the surface, it partially melts to create volcanic islands. The plume stays relatively stationary while the plate moves overhead, creating island chains like Hawaii that record millions of years of plate motion."
  },
  {
    scenario: "A building uses a solar chimney - a tall black-painted tower that heats up in sunlight, causing air to rise and draw fresh air through the building.",
    question: "According to convection principles, how could you increase the chimney's ventilation rate?",
    options: [
      { text: "Paint the chimney white to reflect more heat", correct: false },
      { text: "Make the chimney shorter to reduce air resistance", correct: false },
      { text: "Increase the chimney height to create greater buoyancy-driven pressure", correct: true },
      { text: "Add a cap to trap hot air at the top", correct: false }
    ],
    explanation: "Natural convection strength depends on the height of the convection column and temperature difference. A taller chimney creates a longer column of hot, less-dense air, generating greater buoyancy-driven pressure difference between the chimney base and top. This 'stack effect' increases airflow velocity and ventilation rate proportionally to the square root of height."
  },
  {
    scenario: "Climate scientists model a 'snowball Earth' scenario where ice covers the entire planet. They predict that even if volcanic CO2 eventually warms the atmosphere, recovery would be sudden rather than gradual.",
    question: "What convection-related feedback makes the recovery non-linear?",
    options: [
      { text: "Volcanic convection would suddenly intensify", correct: false },
      { text: "Once ice melts, dark ocean absorbs more heat, accelerating warming", correct: true },
      { text: "Atmospheric convection only works above freezing temperatures", correct: false },
      { text: "Ocean convection would reverse direction abruptly", correct: false }
    ],
    explanation: "Ice reflects most sunlight (high albedo), keeping Earth cold. But once warming begins to melt ice, darker ocean water absorbs much more solar energy, further increasing temperature - a positive feedback. This accelerates convection in atmosphere and ocean, distributing heat faster. The transition would be rapid, not gradual, because feedback loops amplify the initial warming exponentially."
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ConvectionRenderer: React.FC<ConvectionRendererProps> = ({
  gamePhase,
  onPhaseComplete,
  onGameEvent,
  onComplete
}) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>('hook');

  // Sync with external gamePhase prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

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
  const [heatIntensity, setHeatIntensity] = useState(70);
  const [isHeating, setIsHeating] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showFlowLines, setShowFlowLines] = useState(true);
  const [fanSpeed, setFanSpeed] = useState(0);
  const [simRunning, setSimRunning] = useState(true);

  // Initialize responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DESIGN SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  const colors = {
    primary: '#f97316',       // orange-500 (heat)
    primaryDark: '#ea580c',   // orange-600
    accent: '#3b82f6',        // blue-500 (cold)
    secondary: '#8b5cf6',     // violet-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    hotParticle: '#ef4444',   // red-500
    coldParticle: '#3b82f6',  // blue-500
    flowLine: '#a78bfa',      // violet-400
  };

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

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    } catch {
      // Audio not available
    }
    return () => {
      try {
        if (audioContextRef.current && audioContextRef.current.close) {
          audioContextRef.current.close();
        }
      } catch {
        // Audio cleanup failed silently
      }
    };
  }, []);

  const playSound = useCallback((type: 'bubble' | 'whoosh' | 'success' | 'click' | 'ding') => {
    try {
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
      case 'ding':
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;
    }

    onGameEvent?.({ type: 'sound_played', data: { soundType: type } });
    } catch { /* Audio not available */ }
  }, [onGameEvent]);

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  const goToPhase = useCallback((nextPhase: Phase) => {
    playSound('click');
    setPhase(nextPhase);
    onPhaseComplete?.(nextPhase);
    onGameEvent?.({ type: 'phase_started', data: { phase: nextPhase, phaseLabel: phaseLabels[nextPhase] } });
  }, [onPhaseComplete, onGameEvent, playSound]);

  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTICLE SIMULATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Initialize particles
  useEffect(() => {
    const initialParticles: Particle[] = [];
    for (let i = 0; i < 35; i++) {
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
    if (!simRunning || particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => {
        let newX = p.x;
        let newY = p.y;
        let newTemp = p.temp;
        let newVx = p.vx;
        let newVy = p.vy;

        // Heat from bottom when heating is on
        if (isHeating && p.y > 200) {
          newTemp = Math.min(1, p.temp + 0.025 * (heatIntensity / 50));
        }
        // Cool at top
        if (p.y < 60) {
          newTemp = Math.max(0, p.temp - 0.018);
        }
        // Gradual cooling elsewhere
        newTemp = newTemp * 0.998;

        // Buoyancy force (hot rises, cold sinks)
        const buoyancy = (newTemp - 0.5) * -0.9 * (heatIntensity / 50);
        newVy += buoyancy;

        // Fan force (forced convection) - horizontal push
        if (fanSpeed > 0) {
          newVx += fanSpeed * 0.012;
          // Also create some vertical turbulence
          newVy += (Math.random() - 0.5) * fanSpeed * 0.005;
        }

        // Drag
        newVx *= 0.94;
        newVy *= 0.94;

        // Random turbulence
        newVx += (Math.random() - 0.5) * 0.25;
        newVy += (Math.random() - 0.5) * 0.25;

        // Update position
        newX += newVx;
        newY += newVy;

        // Boundary conditions with bounce
        if (newX < 40) { newX = 40; newVx *= -0.5; }
        if (newX > 260) { newX = 260; newVx *= -0.5; }
        if (newY < 40) { newY = 40; newVy *= -0.5; }
        if (newY > 220) { newY = 220; newVy *= -0.5; }

        return { ...p, x: newX, y: newY, temp: newTemp, vx: newVx, vy: newVy };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [simRunning, isHeating, heatIntensity, fanSpeed, particles.length]);

  // Get particle color based on temperature
  const getParticleColor = (temp: number): string => {
    const r = Math.floor(temp * 255);
    const b = Math.floor((1 - temp) * 255);
    const g = Math.floor(temp * 80 + (1 - temp) * 50);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  const [selectedTestOption, setSelectedTestOption] = useState<number | null>(null);
  const [confirmedTestQ, setConfirmedTestQ] = useState<number | null>(null);
  const [testCompleted, setTestCompleted] = useState(false);

  const handleTestAnswer = useCallback((optionIndex: number) => {
    if (confirmedTestQ === testIndex) return;
    setSelectedTestOption(optionIndex);
  }, [testIndex, confirmedTestQ]);

  const confirmTestAnswer = useCallback(() => {
    if (selectedTestOption === null || confirmedTestQ === testIndex) return;

    const newAnswers = [...testAnswers];
    newAnswers[testIndex] = selectedTestOption;
    setTestAnswers(newAnswers);
    setConfirmedTestQ(testIndex);

    const isCorrect = testQuestions[testIndex].options[selectedTestOption].correct;
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
  }, [testIndex, selectedTestOption, testAnswers, testScore, onGameEvent, playSound, confirmedTestQ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderProgressBar = () => (
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
        style={{ width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%` }}
      />
    </div>
  );

  const renderNavDots = () => (
    <div className="flex gap-1.5">
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          className={`h-2 rounded-full transition-all duration-300 ${
            phase === p
              ? 'bg-gradient-to-r from-orange-400 to-red-400 w-6 shadow-lg shadow-orange-500/50'
              : currentPhaseIndex > i
              ? 'bg-emerald-500 w-2'
              : 'bg-slate-600 w-2 hover:bg-slate-500'
          }`}
          title={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVECTION TANK VISUALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  const renderConvectionTank = (): React.ReactNode => {
    return (
      <div className="relative">
        <svg viewBox="0 0 300 260" className="w-full h-56">
          <defs>
            {/* Temperature gradient */}
            <linearGradient id="convTempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="30%" stopColor="#f97316" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Fluid gradient */}
            <linearGradient id="convFluidGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.15" />
              <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.35" />
            </linearGradient>

            {/* Heat source gradient */}
            <linearGradient id="convHeatSource" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgb(${Math.floor(180 + heatIntensity * 0.75)}, ${Math.floor(80 + heatIntensity * 0.4)}, 30)`} />
              <stop offset="50%" stopColor={`rgb(${Math.floor(220 + heatIntensity * 0.35)}, ${Math.floor(50 + heatIntensity * 0.3)}, 10)`} />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>

            {/* Tank metallic gradient */}
            <linearGradient id="convTankEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="15%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="85%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="convHeatGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={3 + heatIntensity * 0.04} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="convParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Flow arrow markers */}
            <marker id="convArrowDown" markerWidth="10" markerHeight="8" refX="5" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 L2,4 z" fill="#60a5fa" />
            </marker>
            <marker id="convArrowUp" markerWidth="10" markerHeight="8" refX="5" refY="4" orient="auto">
              <path d="M10,0 L0,4 L10,8 L8,4 z" fill="#f97316" />
            </marker>
            <marker id="convArrowRight" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 L2,4 z" fill="#ef4444" />
            </marker>
            <marker id="convArrowLeft" markerWidth="10" markerHeight="8" refX="0" refY="4" orient="auto">
              <path d="M10,0 L0,4 L10,8 L8,4 z" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="300" height="260" fill="#0f172a" rx="16" />

          {/* Heat glow from bottom */}
          {isHeating && (
            <ellipse
              cx="150"
              cy="230"
              rx={100 + heatIntensity * 0.5}
              ry={50 + heatIntensity * 0.3}
              fill={`rgba(239, 68, 68, ${0.15 + heatIntensity * 0.003})`}
              filter="url(#convHeatGlowFilter)"
            >
              <animate
                attributeName="ry"
                values={`${45 + heatIntensity * 0.3};${55 + heatIntensity * 0.3};${45 + heatIntensity * 0.3}`}
                dur="2s"
                repeatCount="indefinite"
              />
            </ellipse>
          )}

          {/* Tank outer frame */}
          <rect x="28" y="28" width="244" height="184" fill="none" stroke="url(#convTankEdge)" strokeWidth="4" rx="8" />

          {/* Tank interior */}
          <rect x="32" y="32" width="236" height="176" fill="#020617" rx="6" />

          {/* Fluid with temperature gradient */}
          <rect x="35" y="35" width="230" height="170" fill="url(#convFluidGradient)" rx="4" />

          {/* Heat source */}
          <rect
            x="35"
            y="210"
            width="230"
            height="18"
            fill="url(#convHeatSource)"
            rx="4"
            filter={isHeating ? "url(#convHeatGlowFilter)" : undefined}
          />

          {/* Heat source coils */}
          {isHeating && [0, 1, 2, 3].map(i => (
            <g key={`coil-${i}`}>
              <line
                x1={55 + i * 55}
                y1="214"
                x2={85 + i * 55}
                y2="214"
                stroke={`rgba(255, ${180 + heatIntensity * 0.7}, 100, ${0.6 + heatIntensity * 0.004})`}
                strokeWidth="3"
                strokeLinecap="round"
              >
                <animate
                  attributeName="opacity"
                  values="0.6;1;0.6"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </line>
              <line
                x1={55 + i * 55}
                y1="222"
                x2={85 + i * 55}
                y2="222"
                stroke={`rgba(255, ${150 + heatIntensity * 0.5}, 80, ${0.5 + heatIntensity * 0.003})`}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Rising heat waves */}
          {isHeating && [0, 1, 2, 3, 4, 5].map(i => (
            <path
              key={`wave-${i}`}
              d={`M${50 + i * 40},205 Q${55 + i * 40},${185 - heatIntensity * 0.2} ${60 + i * 40},205`}
              fill="none"
              stroke={`rgba(249, 115, 22, ${0.3 + heatIntensity * 0.004})`}
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animate
                attributeName="d"
                values={`M${50 + i * 40},205 Q${55 + i * 40},${190 - heatIntensity * 0.2} ${60 + i * 40},205;M${50 + i * 40},205 Q${55 + i * 40},${170 - heatIntensity * 0.3} ${60 + i * 40},205;M${50 + i * 40},205 Q${55 + i * 40},${190 - heatIntensity * 0.2} ${60 + i * 40},205`}
                dur={`${0.8 + i * 0.1}s`}
                repeatCount="indefinite"
              />
            </path>
          ))}

          {/* Convection flow arrows */}
          {showFlowLines && (
            <g opacity="0.7">
              {/* Left side - cold sinking */}
              <path
                d="M55,60 C55,80 55,160 55,180"
                stroke="url(#convTempGradient)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#convArrowDown)"
              >
                <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="2s" repeatCount="indefinite" />
              </path>

              {/* Bottom - heating and moving right */}
              <path
                d="M70,195 C120,195 180,195 230,195"
                stroke="#ef4444"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#convArrowRight)"
              >
                <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="2s" repeatCount="indefinite" />
              </path>

              {/* Right side - hot rising */}
              <path
                d="M245,180 C245,160 245,80 245,60"
                stroke="#f97316"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#convArrowUp)"
              >
                <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="2s" repeatCount="indefinite" />
              </path>

              {/* Top - cooling and moving left */}
              <path
                d="M230,45 C180,45 120,45 70,45"
                stroke="#3b82f6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#convArrowLeft)"
              >
                <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="2s" repeatCount="indefinite" />
              </path>

              {/* Central circulation indicator */}
              <ellipse
                cx="150"
                cy="120"
                rx="60"
                ry="50"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="1.5"
                strokeDasharray="8 4"
                opacity="0.4"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 150 120"
                  to="-360 150 120"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </ellipse>
            </g>
          )}

          {/* Particles */}
          {particles.map(p => (
            <g key={p.id} filter="url(#convParticleGlow)">
              {/* Particle glow */}
              <circle
                cx={p.x}
                cy={p.y}
                r={8 + p.temp * 3}
                fill={getParticleColor(p.temp)}
                opacity={0.15 + p.temp * 0.1}
              />
              {/* Main particle */}
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill={getParticleColor(p.temp)}
                stroke={p.temp > 0.6 ? 'rgba(255,255,255,0.3)' : 'rgba(100,150,255,0.3)'}
                strokeWidth="1"
              />
              {/* Hot particle inner glow */}
              {p.temp > 0.7 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2"
                  fill="rgba(255,255,200,0.6)"
                >
                  <animate
                    attributeName="opacity"
                    values="0.4;0.8;0.4"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          ))}

          {/* Fan indicator for forced convection */}
          {fanSpeed > 0 && (
            <g transform="translate(8, 100)">
              {/* Fan housing */}
              <rect x="0" y="0" width="22" height="50" fill="#334155" rx="4" stroke="#475569" strokeWidth="1" />
              <rect x="2" y="2" width="18" height="46" fill="#1e293b" rx="3" />

              {/* Fan motor */}
              <circle cx="11" cy="25" r="12" fill="#475569" stroke="#64748b" strokeWidth="1" />
              <circle cx="11" cy="25" r="9" fill="#22c55e" opacity={0.3 + fanSpeed * 0.007}>
                <animate
                  attributeName="opacity"
                  values={`${0.3 + fanSpeed * 0.005};${0.5 + fanSpeed * 0.005};${0.3 + fanSpeed * 0.005}`}
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Fan blades */}
              {[0, 90, 180, 270].map(angle => (
                <line
                  key={angle}
                  x1="11"
                  y1="18"
                  x2="11"
                  y2="32"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${angle} 11 25)`}
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`${angle} 11 25`}
                    to={`${angle + 360} 11 25`}
                    dur={`${Math.max(0.1, 1 - fanSpeed * 0.009)}s`}
                    repeatCount="indefinite"
                  />
                </line>
              ))}

              {/* Air flow indicators */}
              {[0, 1, 2].map(i => (
                <path
                  key={`airflow-${i}`}
                  d={`M22,${18 + i * 7} L${35 + fanSpeed * 0.1},${18 + i * 7}`}
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={0.4 + fanSpeed * 0.005}
                >
                  <animate
                    attributeName="d"
                    values={`M22,${18 + i * 7} L${30},${18 + i * 7};M22,${18 + i * 7} L${40 + fanSpeed * 0.15},${18 + i * 7};M22,${18 + i * 7} L${30},${18 + i * 7}`}
                    dur={`${0.3 + i * 0.1}s`}
                    repeatCount="indefinite"
                  />
                </path>
              ))}
            </g>
          )}

          {/* Grid lines for visual reference */}
          <line x1="35" y1="80" x2="265" y2="80" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="35" y1="120" x2="265" y2="120" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="35" y1="160" x2="265" y2="160" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="100" y1="35" x2="100" y2="205" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="200" y1="35" x2="200" y2="205" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />

          {/* Temperature profile curve (data path using vertical space) */}
          <path
            d={`M40,${40 + (1 - heatIntensity / 100) * 80} L80,${60 + (1 - heatIntensity / 100) * 60} L120,${90 + (1 - heatIntensity / 100) * 40} L160,${120 + (1 - heatIntensity / 100) * 30} L200,${150 + (1 - heatIntensity / 100) * 20} L240,${170 + (1 - heatIntensity / 100) * 15} L260,${180 + (1 - heatIntensity / 100) * 10}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Interactive point on temperature curve */}
          <circle
            cx={150}
            cy={120 + (1 - heatIntensity / 100) * 30}
            r={9}
            fill="#fbbf24"
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#convParticleGlow)"
          />

          {/* Temperature legend bar */}
          <g transform="translate(272, 45)">
            <rect x="0" y="0" width="10" height="60" fill="url(#convTempGradient)" rx="3" stroke="#475569" strokeWidth="1" />
            <text x="5" y="-4" textAnchor="middle" fill="#ef4444" fontSize="11">Hot</text>
            <text x="5" y="72" textAnchor="middle" fill="#3b82f6" fontSize="11">Cold</text>
          </g>

          {/* Educational labels */}
          <text x="150" y="18" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="700">Convection Cell — Temperature Profile</text>
          <text x="150" y="250" textAnchor="middle" fill="#f97316" fontSize="12">Heat Intensity: {heatIntensity}%</text>
          <text x="55" y="130" textAnchor="middle" fill="#60a5fa" fontSize="11">Cool Sinks</text>
          <text x="245" y="130" textAnchor="middle" fill="#f97316" fontSize="11">Warm Rises</text>
        </svg>

        {/* Labels */}
        <div className="flex justify-between items-center mt-2 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-b from-red-500 to-orange-500" />
            <span style={{ fontSize: typo.small }} className="text-red-400 font-medium">Hot rises</span>
          </div>
          <span style={{ fontSize: typo.small }} className="text-orange-400 font-semibold">
            Heat: {heatIntensity}%
          </span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: typo.small }} className="text-blue-400 font-medium">Cold sinks</span>
            <div className="w-3 h-3 rounded-full bg-gradient-to-b from-blue-500 to-blue-700" />
          </div>
        </div>
        {fanSpeed > 0 && (
          <div className="text-center mt-1">
            <span style={{ fontSize: typo.label }} className="text-green-400 font-medium">
              Fan: {fanSpeed}% (Forced Convection Mode)
            </span>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: HOOK - Engaging introduction
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHook = (): React.ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '48px 24px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: '#fb923c', borderRadius: '50%' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#fb923c', letterSpacing: '0.05em' }}>HEAT TRANSFER PHYSICS</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', color: 'white', lineHeight: '1.2' }}>
        The Rising Heat Mystery
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '560px', marginBottom: '32px', lineHeight: '1.6', fontWeight: 400 }}>
        Have you ever wondered why hot air rises and cold air sinks? This simple phenomenon drives
        everything from a boiling pot to global weather patterns.
      </p>

      {/* Animated illustration */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 max-w-2xl border border-slate-700/50 shadow-2xl shadow-orange-500/5 mb-8">
        <svg viewBox="0 0 280 180" className="w-full h-40 mx-auto">
          {/* Pot */}
          <ellipse cx="140" cy="150" rx="80" ry="15" fill="#64748b" />
          <rect x="60" y="80" width="160" height="70" fill="#475569" rx="5" />
          <ellipse cx="140" cy="80" rx="80" ry="15" fill="#64748b" />

          {/* Water with gradient */}
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
              <animate attributeName="cy" values="140;75;140" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Steam wisps */}
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
          <path d="M100,165 Q120,150 140,165 Q160,150 180,165" fill="#ef4444">
            <animate attributeName="d" values="M100,165 Q120,150 140,165 Q160,150 180,165;M100,165 Q120,145 140,165 Q160,145 180,165;M100,165 Q120,150 140,165 Q160,150 180,165" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M110,168 Q130,158 150,168 Q170,158 170,168" fill="#f59e0b" />
        </svg>

        <p className="text-lg text-slate-300 mt-4">
          <span className="text-orange-400 font-semibold">Convection</span> is heat transfer through the
          <span className="text-purple-400 font-semibold"> movement of fluids</span>. When you heat water
          from below, the hot water expands, becomes less dense, and <span className="text-red-400">rises</span>.
          Cooler, denser water <span className="text-blue-400">sinks</span> to replace it - creating a continuous circulation.
        </p>
      </div>

      {/* Key concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mb-8">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-2xl mb-2">🔥</div>
          <h3 className="font-semibold text-orange-400 mb-1">Heat Rises</h3>
          <p className="text-sm text-slate-400">Hot fluid expands, becomes less dense</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-2xl mb-2">❄️</div>
          <h3 className="font-semibold text-blue-400 mb-1">Cold Sinks</h3>
          <p className="text-sm text-slate-400">Cold fluid contracts, becomes more dense</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-2xl mb-2">🔄</div>
          <h3 className="font-semibold text-purple-400 mb-1">Circulation</h3>
          <p className="text-sm text-slate-400">Creates convection cells that transfer heat</p>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #ea580c, #dc2626)', color: 'white', fontSize: '18px', fontWeight: 600, borderRadius: '16px', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 10px 25px rgba(234,88,12,0.25)' }}
      >
        Explore Convection
      </button>

      <p style={{ marginTop: '24px', fontSize: '14px', color: 'rgba(148,163,184,1)' }}>The physics formula: Q = hAΔT</p>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: PREDICT - User makes a prediction
  // ═══════════════════════════════════════════════════════════════════════════

  const renderPredict = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">Make Your Prediction</h2>
        <p className="text-slate-400">
          When you heat water from below, the hot water rises to the top while cold water sinks.
        </p>
      </div>

      {/* Visual diagram */}
      <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-500/30">
        <svg viewBox="0 0 200 100" className="w-full h-24 mx-auto">
          <rect x="40" y="20" width="120" height="60" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" rx="5" />
          <rect x="45" y="60" width="110" height="15" fill="#ef4444" opacity="0.4" />
          <text x="100" y="70" textAnchor="middle" fill="#fca5a5" fontSize="8">HOT ZONE</text>
          <rect x="45" y="25" width="110" height="30" fill="#3b82f6" opacity="0.3" />
          <text x="100" y="42" textAnchor="middle" fill="#93c5fd" fontSize="8">COLD ZONE</text>
          <path d="M100,70 L100,35" stroke="#ef4444" strokeWidth="3" markerEnd="url(#predArrow)" />
          <defs>
            <marker id="predArrow" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
              <path d="M0,6 L4,0 L8,6 z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
        <p className="text-center text-sm text-blue-300 font-medium mt-2">
          Why does hot water rise while cold water sinks?
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { id: 'A', text: 'Heat makes water molecules lighter in weight', desc: 'Mass change theory' },
          { id: 'B', text: 'Hot water expands and becomes less dense than cold water', desc: 'Density-driven buoyancy' },
          { id: 'C', text: 'Fast-moving hot molecules push themselves upward', desc: 'Kinetic momentum theory' },
          { id: 'D', text: 'Steam bubbles lift the hot water up like balloons', desc: 'Bubble lift mechanism' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setPrediction(option.id);
              playSound('click');
              onGameEvent?.({ type: 'prediction_made', data: { prediction: option.id } });
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? 'border-orange-500 bg-orange-500/20'
                : 'border-slate-600 hover:border-orange-400 bg-slate-800/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                prediction === option.id ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {option.id}
              </span>
              <div>
                <p className="font-medium text-white">{option.text}</p>
                <p className="text-sm text-slate-400">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onClick={() => goToPhase('play')}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: PLAY - Interactive simulation
  // ═══════════════════════════════════════════════════════════════════════════

  const renderPlay = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">Convection Cell Lab</h2>
        <p style={{ color: '#e2e8f0' }}>Watch how temperature differences drive fluid circulation</p>
      </div>

      {/* Observation guidance */}
      <div style={{ background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', padding: '12px 16px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <p style={{ color: '#93c5fd', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>What to observe:</p>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>Notice how particles change color (temperature) as they move through the convection cycle. This demonstrates heat transfer through fluid motion.</p>
      </div>

      {/* Simulation */}
      <div style={{ background: 'linear-gradient(to bottom, #1f2937, #111827)', borderRadius: '16px', padding: '16px', border: '1px solid #374151' }}>
        {renderConvectionTank()}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div style={{ background: 'rgba(127, 29, 29, 0.3)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <p style={{ fontSize: '12px', color: '#e2e8f0' }}>Heat Power</p>
          <p className="font-bold text-red-400">{heatIntensity}%</p>
        </div>
        <div style={{ background: 'rgba(124, 45, 18, 0.3)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
          <p style={{ fontSize: '12px', color: '#e2e8f0' }}>Hot Particles</p>
          <p className="font-bold text-orange-400">{particles.filter(p => p.temp > 0.6).length}</p>
        </div>
        <div style={{ background: 'rgba(30, 58, 138, 0.3)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <p style={{ fontSize: '12px', color: '#e2e8f0' }}>Cold Particles</p>
          <p className="font-bold text-blue-400">{particles.filter(p => p.temp < 0.4).length}</p>
        </div>
      </div>

      {/* Controls with cause-effect explanations */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid #475569' }}>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '14px', color: '#e2e8f0' }}>Heat Intensity:</span>
              <span className="font-medium text-red-400">{heatIntensity}%</span>
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
              onInput={(e) => {
                setHeatIntensity(Number((e.target as HTMLInputElement).value));
              }}
              style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
            />
            <p style={{ fontSize: '12px', color: '#93c5fd' }}>When you increase heat, more particles become hot (red) and rise faster. This causes stronger circulation.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsHeating(!isHeating);
                playSound('click');
              }}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 600, transition: 'all 0.3s ease', background: isHeating ? '#ef4444' : '#334155', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {isHeating ? 'Heating: ON' : 'Heating: OFF'}
            </button>
            <button
              onClick={() => {
                setShowFlowLines(!showFlowLines);
                playSound('click');
              }}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 600, transition: 'all 0.3s ease', background: showFlowLines ? '#8b5cf6' : '#334155', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {showFlowLines ? 'Flow Lines: ON' : 'Flow Lines: OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Physics explanation with definitions and real-world relevance */}
      <div style={{ background: 'rgba(124, 45, 18, 0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
        <h4 style={{ fontWeight: 600, color: '#fb923c', marginBottom: '8px' }}>The Convection Cycle:</h4>
        <ol style={{ fontSize: '14px', color: '#e2e8f0' }} className="space-y-1">
          <li>1. <span className="text-red-400 font-medium">Bottom heats</span> - fluid expands - density decreases</li>
          <li>2. <span className="text-orange-400 font-medium">Hot fluid rises</span> (buoyancy force pushes less dense fluid up)</li>
          <li>3. <span className="text-blue-400 font-medium">Top cools</span> - fluid contracts - density increases</li>
          <li>4. <span className="text-cyan-400 font-medium">Cold fluid sinks</span> (gravity pulls denser fluid down)</li>
          <li>5. <span className="text-purple-400 font-medium">Cycle repeats</span> - continuous circulation!</li>
        </ol>
      </div>

      {/* Key physics definition */}
      <div style={{ background: 'rgba(88, 28, 135, 0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <h4 style={{ fontWeight: 600, color: '#a855f7', marginBottom: '8px' }}>Key Physics Formula:</h4>
        <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#c4b5fd', textAlign: 'center', marginBottom: '8px' }}>Q = h × A × ΔT</p>
        <p style={{ fontSize: '13px', color: '#e2e8f0' }}>Convection heat transfer is defined as the heat flow rate (Q) equals the heat transfer coefficient (h) times the surface area (A) times the temperature difference (ΔT). This formula is essential for designing heating and cooling systems.</p>
        <p style={{ fontSize: '13px', color: '#93c5fd', marginTop: '8px' }}>This is important because convection is used in practical applications everywhere - from your home radiator to cooling your computer's CPU. Engineers use this formula to design efficient heating, ventilation, and cooling systems.</p>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', borderRadius: '12px', fontWeight: 600, fontSize: '18px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)', transition: 'all 0.3s ease' }}
      >
        Review the Concepts
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: REVIEW - Debrief explaining the physics
  // ═══════════════════════════════════════════════════════════════════════════

  const renderReview = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">Understanding Convection</h2>
        <p style={{ color: '#e2e8f0' }}>
          {prediction === 'B'
            ? "Excellent! Your prediction was correct - as you observed in the experiment, density differences drive convection."
            : "As you saw in the simulation, the result shows that hot fluid expands and becomes less dense, so it rises due to buoyancy! Your observation confirms that density is the key factor."}
        </p>
      </div>

      {/* Main concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-4 border border-orange-500/30">
          <h4 className="font-semibold text-orange-400 mb-2">Density-Driven Flow</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Heating causes thermal expansion</li>
            <li>- Same mass, larger volume = lower density</li>
            <li>- Buoyancy: less dense fluid rises</li>
            <li>- Cooling causes contraction</li>
            <li>- Same mass, smaller volume = higher density</li>
            <li>- Gravity: denser fluid sinks</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-500/30">
          <h4 className="font-semibold text-blue-400 mb-2">Three Types of Heat Transfer</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- <strong>Conduction:</strong> Direct contact (solids)</li>
            <li>- <strong>Convection:</strong> Fluid movement (liquids/gases)</li>
            <li>- <strong>Radiation:</strong> EM waves (no medium needed)</li>
            <li>- Convection is often most efficient in fluids!</li>
          </ul>
        </div>
      </div>

      {/* Physics formula */}
      <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/30">
        <h4 className="font-semibold text-purple-400 mb-2">The Physics Formula</h4>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20 mb-3">
          <p className="text-center font-mono text-2xl text-purple-300">Q = h × A × ΔT</p>
          <p className="text-center text-sm text-slate-400 mt-2">
            Heat transfer rate = coefficient × area × temperature difference
          </p>
        </div>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>- <strong>Q</strong> = heat transfer rate (Watts)</li>
          <li>- <strong>h</strong> = convective heat transfer coefficient (depends on fluid velocity)</li>
          <li>- <strong>A</strong> = surface area for heat transfer</li>
          <li>- <strong>ΔT</strong> = temperature difference between surface and fluid</li>
        </ul>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: TWIST_PREDICT - Second prediction with new variable
  // ═══════════════════════════════════════════════════════════════════════════

  const renderTwistPredict = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">New Twist: The Fan Paradox</h2>
        <p className="text-slate-400 max-w-lg mx-auto">
          A fan blows air at you on a hot day. The air temperature is 30°C (86°F) -
          <span className="text-amber-400 font-medium"> the same temperature with or without the fan</span>.
          What do you predict will happen?
        </p>
      </div>

      {/* Visual */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
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
        <p className="text-center text-lg font-medium text-white mt-4">
          If the air temperature is the same, why does the fan make you feel cooler?
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { id: 'A', text: 'The fan actually does cool the air temperature slightly', desc: 'Temperature reduction' },
          { id: 'B', text: 'It is purely a psychological placebo effect', desc: 'Mind over matter' },
          { id: 'C', text: 'Moving air increases heat transfer and evaporation from your skin', desc: 'Forced convection effect' },
          { id: 'D', text: 'The fan blocks thermal radiation from reaching you', desc: 'Radiation shielding' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              playSound('click');
              onGameEvent?.({ type: 'prediction_made', data: { twist: true, prediction: option.id } });
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-slate-600 hover:border-purple-400 bg-slate-800/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                twistPrediction === option.id ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {option.id}
              </span>
              <div>
                <p className="font-medium text-white">{option.text}</p>
                <p className="text-sm text-slate-400">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onClick={() => goToPhase('twist_play')}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
        >
          Discover Forced Convection
        </button>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6: TWIST_PLAY - Second interactive experiment
  // ═══════════════════════════════════════════════════════════════════════════

  const renderTwistPlay = (): React.ReactNode => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">Forced Convection Lab</h2>
        <p className="text-slate-400">Add a fan to dramatically increase heat transfer rate</p>
      </div>

      {/* Simulation */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-4">
        {renderConvectionTank()}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
          <p className="text-sm text-slate-400">Fan Speed</p>
          <p className="font-bold text-purple-400">{fanSpeed}%</p>
        </div>
        <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
          <p className="text-sm text-slate-400">Heat Power</p>
          <p className="font-bold text-red-400">{heatIntensity}%</p>
        </div>
        <div className="bg-cyan-900/30 rounded-lg p-3 border border-cyan-500/30">
          <p className="text-sm text-slate-400">Heat Transfer Rate</p>
          <p className="font-bold text-cyan-400">{Math.round((5 + fanSpeed * 2.45) * 0.1 * (heatIntensity * 0.8))} W</p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Fan Speed (Forced Convection):</span>
            <span className="font-medium text-purple-400">{fanSpeed}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fanSpeed}
            onChange={(e) => {
              const newSpeed = Number(e.target.value);
              setFanSpeed(newSpeed);
              if (newSpeed > 0 && fanSpeed === 0) playSound('whoosh');
              onGameEvent?.({ type: 'fan_speed_changed', data: { value: newSpeed } });
            }}
            onInput={(e) => {
              const newSpeed = Number((e.target as HTMLInputElement).value);
              setFanSpeed(newSpeed);
            }}
            style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Heat Intensity:</span>
            <span className="font-medium text-red-400">{heatIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={heatIntensity}
            onChange={(e) => setHeatIntensity(Number(e.target.value))}
            onInput={(e) => {
              setHeatIntensity(Number((e.target as HTMLInputElement).value));
            }}
            style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl p-4 border border-purple-500/30">
        <h4 className="font-semibold text-purple-400 mb-3">Natural vs Forced Convection:</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
            <p className="text-orange-400 font-semibold text-sm mb-1">Natural Convection</p>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>- Driven by buoyancy alone</li>
              <li>- h = 5-25 W/m²K</li>
              <li>- No energy input needed</li>
              <li>- Ex: Room radiator</li>
            </ul>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
            <p className="text-purple-400 font-semibold text-sm mb-1">Forced Convection</p>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>- Driven by fans/pumps</li>
              <li>- h = 25-250 W/m²K</li>
              <li>- Requires energy input</li>
              <li>- Ex: CPU cooler</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-center text-purple-300 mt-3 font-medium">
          Forced convection can be 5-50x more efficient than natural!
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        Review the Discovery
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: TWIST_REVIEW - Deep explanation
  // ═══════════════════════════════════════════════════════════════════════════

  const renderTwistReview = (): React.ReactNode => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">The Forced Convection Discovery</h2>
        <p className="text-slate-400">
          {twistPrediction === 'C'
            ? "You got it! Moving air increases heat transfer without changing air temperature."
            : "The answer was C - the fan speeds up heat and moisture removal from your skin!"}
        </p>
      </div>

      {/* Main explanation */}
      <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
        <h3 className="font-semibold text-purple-400 mb-4">Why Fans Cool You (Without Cooling Air)</h3>
        <div className="space-y-3 text-slate-300">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <p><strong className="text-purple-300">Removes warm boundary layer:</strong> Still air next to your skin heats up and insulates you. Moving air constantly replaces this warm layer with fresh room-temperature air.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <p><strong className="text-purple-300">Speeds evaporation:</strong> Sweat evaporates faster in moving air, and evaporation absorbs heat from your body (latent heat of vaporization = 2.4 MJ/kg).</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
            <p><strong className="text-purple-300">Increases h value:</strong> The heat transfer coefficient (h in Q = hAΔT) depends on fluid velocity. Faster air = higher h = faster heat transfer at the same ΔT.</p>
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/30">
        <h4 className="font-semibold text-green-400 mb-2">Key Insight</h4>
        <p className="text-slate-300">
          Forced convection doesn't change the <em className="text-green-300">temperature</em> of the cooling medium -
          it increases the <em className="text-green-300">rate</em> of heat transfer. This is why:
        </p>
        <ul className="text-sm text-slate-400 mt-2 space-y-1">
          <li>- Fans cool people but not empty rooms</li>
          <li>- CPU heatsinks need fans despite same air temperature</li>
          <li>- Convection ovens cook faster at lower temperatures</li>
        </ul>
      </div>

      {/* Factors affecting h */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
        <h4 className="font-semibold text-white mb-2">Factors Affecting Heat Transfer Coefficient (h)</h4>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>- <strong>Fluid velocity:</strong> Faster flow = higher h (most important!)</li>
          <li>- <strong>Fluid properties:</strong> Thermal conductivity, viscosity, density</li>
          <li>- <strong>Flow pattern:</strong> Turbulent flow has higher h than laminar</li>
          <li>- <strong>Surface geometry:</strong> Fins, roughness, orientation</li>
          <li>- <strong>Temperature:</strong> Some fluids have temperature-dependent h</li>
        </ul>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg"
      >
        See Real-World Applications
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 8: TRANSFER - 4 Real-world applications
  // ═══════════════════════════════════════════════════════════════════════════

  const renderTransfer = (): React.ReactNode => {
    const app = transferApps[selectedApp];

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 style={{ fontSize: typo.heading }} className="font-bold text-white">Convection in the Real World</h2>
          <p style={{ color: '#e2e8f0' }}>From kitchen to planet - convection is everywhere</p>
          <p style={{ color: '#93c5fd', fontSize: '14px', marginTop: '8px' }}>Application {selectedApp + 1} of {transferApps.length}</p>
        </div>

        {/* App selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {transferApps.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedApp(i);
                playSound('click');
                onGameEvent?.({ type: 'transfer_app_viewed', data: { app: a.title } });
              }}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                borderRadius: '9999px',
                fontWeight: 500,
                transition: 'all 0.3s ease',
                background: selectedApp === i ? a.color : '#334155',
                color: selectedApp === i ? 'white' : '#e2e8f0',
                border: 'none',
                cursor: 'pointer',
                boxShadow: selectedApp === i ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* App details card */}
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', border: '1px solid #475569', overflow: 'hidden' }}>
          <div style={{ padding: '16px', color: 'white', backgroundColor: app.color }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{app.icon}</span>
              <div>
                <h3 className="text-xl font-bold">{app.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>{app.tagline}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px' }} className="space-y-4">
            <p style={{ color: '#e2e8f0' }}>{app.description}</p>

            <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>Convection Connection</h4>
              <p style={{ fontSize: '14px', color: '#e2e8f0' }}>{app.connection}</p>
            </div>

            <div style={{ background: 'rgba(30, 58, 138, 0.3)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h4 style={{ fontWeight: 600, color: '#60a5fa', marginBottom: '4px' }}>How It Works</h4>
              <p style={{ fontSize: '14px', color: '#e2e8f0' }}>{app.howItWorks}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {app.stats.map((stat, i) => (
                <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, fontSize: '18px', color: app.color }}>{stat.value}</p>
                  <p style={{ fontSize: '12px', color: '#e2e8f0' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div>
              <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '8px' }}>Examples:</h4>
              <ul style={{ fontSize: '14px', color: '#e2e8f0' }} className="space-y-1">
                {app.examples.map((ex, i) => (
                  <li key={i}>- {ex}</li>
                ))}
              </ul>
            </div>

            {/* Companies */}
            <div className="flex flex-wrap gap-2">
              {app.companies.map((company, i) => (
                <span key={i} style={{ padding: '4px 8px', background: '#334155', borderRadius: '4px', fontSize: '12px', color: '#e2e8f0' }}>
                  {company}
                </span>
              ))}
            </div>

            {/* Future impact */}
            <div style={{ background: 'linear-gradient(to right, rgba(88, 28, 135, 0.2), rgba(219, 39, 119, 0.2))', borderRadius: '8px', padding: '12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <h4 style={{ fontWeight: 600, color: '#a855f7', marginBottom: '4px' }}>Future Impact</h4>
              <p style={{ fontSize: '14px', color: '#e2e8f0' }}>{app.futureImpact}</p>
            </div>

            {/* Got It button for each app */}
            <button
              onClick={() => {
                if (selectedApp < transferApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                  playSound('click');
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: selectedApp < transferApps.length - 1 ? `linear-gradient(135deg, ${app.color}, ${app.color}dd)` : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              {selectedApp < transferApps.length - 1 ? 'Got It → Next App' : 'Got It! Ready for Test'}
            </button>
          </div>
        </div>

        <button
          onClick={() => goToPhase('test')}
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '18px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          Test Your Knowledge
        </button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 9: TEST - 10 Scenario-based questions
  // ═══════════════════════════════════════════════════════════════════════════

  const renderTest = (): React.ReactNode => {
    if (testCompleted) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f97316' }}>Test Complete!</h2>
          <p style={{ fontSize: '32px', fontWeight: 700, color: 'white' }}>{testScore} / {testQuestions.length}</p>
          <p style={{ fontSize: '18px', color: '#94a3b8' }}>{percentage}%</p>
        </div>
      );
    }

    const question = testQuestions[testIndex];
    const isConfirmed = confirmedTestQ === testIndex;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>Knowledge Check</h2>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>
            Question {testIndex + 1} of {testQuestions.length}
          </span>
        </div>

        <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #f97316, #ef4444)', transition: 'width 0.3s ease', width: `${((testIndex) / testQuestions.length) * 100}%` }} />
        </div>

        <div style={{ background: 'rgba(154,83,8,0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(249,115,22,0.3)' }}>
          <p style={{ fontSize: '14px', color: '#fb923c', fontWeight: 500, marginBottom: '4px' }}>Scenario:</p>
          <p style={{ color: '#cbd5e1', lineHeight: '1.5' }}>{question.scenario}</p>
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px', border: '1px solid #475569' }}>
          <p style={{ fontWeight: 600, color: 'white', marginBottom: '16px', lineHeight: '1.5' }}>{question.question}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((option, i) => {
              const isSelected = selectedTestOption === i;
              let bg = '#334155';
              if (isConfirmed && option.correct) bg = '#166534';
              else if (isConfirmed && isSelected && !option.correct) bg = '#991b1b';
              else if (isSelected) bg = '#9a3412';
              return (
                <button
                  key={i}
                  onClick={() => handleTestAnswer(i)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #475569', textAlign: 'left', cursor: isConfirmed ? 'default' : 'pointer', transition: 'all 0.3s ease', background: bg, color: 'white', fontSize: '14px', lineHeight: '1.5' }}
                >
                  {String.fromCharCode(65 + i)}) {option.text}
                </button>
              );
            })}
          </div>
        </div>

        {isConfirmed && (
          <div style={{ background: 'rgba(88,28,135,0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(168,85,247,0.3)' }}>
            <h4 style={{ fontWeight: 600, color: '#a855f7', marginBottom: '8px' }}>Explanation</h4>
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>{question.explanation}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {!isConfirmed ? (
            <button
              onClick={confirmTestAnswer}
              disabled={selectedTestOption === null}
              style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: selectedTestOption !== null ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: selectedTestOption !== null ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '16px', transition: 'all 0.3s ease', boxShadow: selectedTestOption !== null ? '0 4px 15px rgba(249,115,22,0.3)' : 'none' }}
            >
              Check Answer
            </button>
          ) : testIndex < testQuestions.length - 1 ? (
            <button
              onClick={() => {
                setTestIndex(prev => prev + 1);
                setSelectedTestOption(null);
                setConfirmedTestQ(null);
                setShowExplanation(false);
                playSound('click');
              }}
              style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '16px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={() => {
                setTestCompleted(true);
                onGameEvent?.({ type: 'test_completed', data: { score: testScore, total: testQuestions.length } });
                playSound('success');
              }}
              style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '16px', transition: 'all 0.3s ease' }}
            >
              Submit Test
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
          Current Score: {testScore} / {testIndex + (isConfirmed ? 1 : 0)}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 10: MASTERY - Completion celebration
  // ═══════════════════════════════════════════════════════════════════════════

  const renderMastery = (): React.ReactNode => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>
            {passed ? 'Congratulations! Convection Mastered!' : 'Keep Learning!'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>You have successfully completed the convection module.</p>

          {/* Score display */}
          <div className={`inline-block text-white text-3xl font-bold px-6 py-3 rounded-xl ${
            passed
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : 'bg-gradient-to-r from-slate-600 to-slate-700'
          }`}>
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>
        </div>

        {/* Success message */}
        {passed && (
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-500/30">
            <h3 className="font-semibold text-green-400 mb-4 text-center">Congratulations!</h3>
            <p className="text-slate-300 text-center">
              You now understand how heat transfers through moving fluids - from boiling water
              to global weather patterns to cooling your computer!
            </p>
          </div>
        )}

        {/* Key concepts mastered */}
        <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-xl p-6 border border-orange-500/30">
          <h3 className="font-semibold text-orange-400 mb-4">Key Concepts Mastered</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Hot fluid rises because it expands and becomes less dense (buoyancy)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Convection cells create continuous circulation patterns that transfer heat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Forced convection (fans/pumps) increases h by 5-50x vs natural convection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Q = hAΔT governs all convective heat transfer rates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Convection drives weather, ocean currents, plate tectonics, and cooling systems</span>
            </li>
          </ul>
        </div>

        {/* Formula summary */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600">
          <h3 className="font-semibold text-white mb-3">The Master Formula</h3>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-mono text-orange-400 mb-2">Q = h × A × ΔT</p>
            <p className="text-sm text-slate-400">
              Heat rate = coefficient × area × temperature difference
            </p>
          </div>
          <div className="mt-4 text-sm text-slate-400 space-y-1">
            <p>- h increases with fluid velocity (forced convection beats natural)</p>
            <p>- Larger surface area (fins, heatsinks) = more heat transfer</p>
            <p>- Greater temperature difference = faster heat flow</p>
          </div>
        </div>

        {/* Action buttons */}
        {!passed ? (
          <button
            onClick={() => {
              setTestIndex(0);
              setTestScore(0);
              setTestAnswers(new Array(10).fill(null));
              setShowExplanation(false);
              goToPhase('test');
            }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-lg shadow-lg"
          >
            Try Again
          </button>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-green-400 font-semibold">
              You have completed the Convection module!
            </p>
            <button
              onClick={() => goToPhase('hook')}
              className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-all"
            >
              Review Again
            </button>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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

  const isFirst = currentPhaseIndex === 0;
  const isLast = currentPhaseIndex === phaseOrder.length - 1;
  const isTestPhase = phase === 'test';
  const quizComplete = isTestPhase && testIndex >= testQuestions.length - 1 && testAnswers[testIndex] !== null;
  const canGoNext = !isLast && (!isTestPhase || quizComplete);

  return (
    <div style={{ height: '100vh', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a, #0a1628, #0f172a)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f97316' }}>Convection</span>
        <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>{phaseLabels[phase]} ({currentPhaseIndex + 1}/{phaseOrder.length})</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', maxWidth: '640px', margin: '0 auto', width: '100%', padding: '16px 24px' }}>
        {renderPhase()}
      </div>

      {/* Bottom bar */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <button onClick={() => !isFirst && goToPhase(phaseOrder[currentPhaseIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirst ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1, transition: 'all 0.3s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <div key={p} onClick={() => i <= currentPhaseIndex && goToPhase(p)} title={phaseLabels[p]} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#f97316' : i < currentPhaseIndex ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= currentPhaseIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <button onClick={() => canGoNext && goToPhase(phaseOrder[currentPhaseIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4, transition: 'all 0.3s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif' }}>
          Next →
        </button>
      </div>
    </div>
  );
};

export default ConvectionRenderer;
