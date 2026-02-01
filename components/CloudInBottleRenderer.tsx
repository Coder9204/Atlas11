'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// CLOUD IN A BOTTLE RENDERER - Make Weather From Pressure
// =============================================================================
// Game 134: Explore how pressure changes create clouds through adiabatic
// cooling and condensation on nucleation sites - real weather physics!
// =============================================================================


type PhaseType = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: PhaseType[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface TestQuestion {
  id: number;
  scenario: string;
  question: string;
  options: { id: string; text: string; correct?: boolean }[];
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

interface CloudInBottleRendererProps {
  phase: PhaseType;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface CloudParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
}

const realWorldApps = [
  {
    icon: '🌧️',
    title: 'Cloud Seeding',
    short: 'Making it rain on demand',
    tagline: 'Engineering precipitation through nucleation',
    description: 'Cloud seeding introduces artificial condensation nuclei (silver iodide, dry ice) to clouds, triggering precipitation. This technology is used for drought relief, snow pack enhancement, and hail suppression.',
    connection: 'Just like adding smoke to our bottle experiment, cloud seeding provides nucleation sites. Water vapor that would remain supersaturated can now condense into droplets large enough to fall as rain.',
    howItWorks: 'Aircraft release silver iodide flares into clouds with supercooled water. The silver iodide crystals have a structure similar to ice, acting as nucleation sites for ice crystals that grow and fall.',
    stats: [
      { value: '10-15%', label: 'Precipitation increase', icon: '🌧️' },
      { value: '50+', label: 'Countries using it', icon: '🌍' },
      { value: '$15/acre-ft', label: 'Water cost', icon: '💰' }
    ],
    examples: ['Dubai rain enhancement', 'Colorado snowpack', 'Beijing Olympics', 'Australian drought relief'],
    companies: ['Weather Modification Inc', 'North American Weather', 'Seeding Operations', 'Cloud Seeding Technologies'],
    futureImpact: 'Drone-based seeding and AI-optimized targeting could make cloud seeding more precise and effective for water resource management.',
    color: '#3B82F6'
  },
  {
    icon: '✈️',
    title: 'Aircraft Contrail Formation',
    short: 'Jet engine cloud creation',
    tagline: 'How airplanes make their own weather',
    description: 'Jet contrails are human-made clouds formed when hot, humid exhaust meets cold air. The exhaust provides both water vapor and nucleation particles, creating visible trails that can persist for hours.',
    connection: 'Jet exhaust contains water vapor and soot particles (nuclei). In cold, humid upper atmosphere, this triggers the same cloud formation process we see in our bottle experiment.',
    howItWorks: 'Jet fuel combustion produces water vapor and particulates. At cruise altitude (-40°C), exhaust humidity exceeds saturation. Soot provides nucleation sites, forming ice crystals that create the visible trail.',
    stats: [
      { value: '-40°C', label: 'Formation temp', icon: '❄️' },
      { value: '1-2%', label: 'Climate forcing', icon: '🌡️' },
      { value: '100,000', label: 'Flights daily', icon: '✈️' }
    ],
    examples: ['Commercial aviation', 'Military aircraft', 'Private jets', 'Cargo flights'],
    companies: ['Boeing', 'Airbus', 'Rolls-Royce', 'GE Aviation'],
    futureImpact: 'Sustainable aviation fuels and flight path optimization may reduce contrail formation, addressing their contribution to climate change.',
    color: '#8B5CF6'
  },
  {
    icon: '🌬️',
    title: 'Fog Machines & Special Effects',
    short: 'Creating atmospheric effects',
    tagline: 'Controlled cloud generation for entertainment',
    description: 'Stage fog machines create artificial clouds by rapidly cooling glycol or glycerin vapor. The cooled vapor condenses on aerosol particles in the air, mimicking natural cloud formation.',
    connection: 'Fog machines work exactly like our bottle experiment - rapid cooling (from liquid CO2 or thermoelectric coolers) causes water or glycol vapor to condense on nucleation particles.',
    howItWorks: 'A heating element vaporizes fog fluid (glycol/glycerin mix). The hot vapor exits into cooler air where it condenses into tiny droplets. Some machines add CO2 cooling for low-lying fog effects.',
    stats: [
      { value: '10,000', label: 'CFM output (large)', icon: '💨' },
      { value: '400°F', label: 'Heater temp', icon: '🔥' },
      { value: '$5B', label: 'FX industry size', icon: '🎬' }
    ],
    examples: ['Concert productions', 'Haunted houses', 'Film production', 'Theme parks'],
    companies: ['Ultratec', 'MDG', 'Antari', 'Chauvet'],
    futureImpact: 'Water-based fog and advanced particle control are creating more realistic and environmentally friendly atmospheric effects for entertainment.',
    color: '#F59E0B'
  },
  {
    icon: '☁️',
    title: 'Weather Prediction',
    short: 'Understanding cloud physics',
    tagline: 'Forecasting through condensation science',
    description: 'Accurate weather prediction requires understanding how clouds form and evolve. The same physics in our bottle experiment - pressure changes, cooling, nucleation - drives real atmospheric processes.',
    connection: 'Weather models simulate adiabatic cooling in rising air, nucleation on atmospheric aerosols, and droplet growth. Our bottle demonstrates these fundamental processes at human scale.',
    howItWorks: 'Numerical weather models solve equations for air motion, temperature, and moisture. Microphysics schemes calculate condensation rates and precipitation based on nucleation theory.',
    stats: [
      { value: '10-day', label: 'Useful forecast range', icon: '📅' },
      { value: '90%', label: '24hr accuracy', icon: '✅' },
      { value: '10 km', label: 'Global model resolution', icon: '🌍' }
    ],
    examples: ['ECMWF forecasts', 'GFS model', 'Local forecasts', 'Hurricane prediction'],
    companies: ['NOAA', 'ECMWF', 'The Weather Company', 'AccuWeather'],
    futureImpact: 'AI-enhanced weather models and higher resolution simulations are extending accurate forecast range and improving severe weather warnings.',
    color: '#10B981'
  }
];

const CloudInBottleRenderer: React.FC<CloudInBottleRendererProps> = ({ phase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }) => {
  const [currentPhase, setCurrentPhase] = useState<PhaseType>(phase || 'hook');
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
  const [squeezePressure, setSqueezePressure] = useState(0); // 0-100 (0=released, 100=fully squeezed)
  const [hasNuclei, setHasNuclei] = useState(true); // Aerosol nuclei present
  const [cloudDensity, setCloudDensity] = useState(0); // 0-100
  const [temperature, setTemperature] = useState(20); // Celsius
  const [humidity, setHumidity] = useState(80); // Relative humidity %
  const [isSqueezing, setIsSqueezing] = useState(false);
  const [cloudParticles, setCloudParticles] = useState<CloudParticle[]>([]);
  const [showSmoke, setShowSmoke] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#3b82f6',       // blue-500 (sky/cloud)
    primaryDark: '#2563eb',   // blue-600
    accent: '#06b6d4',        // cyan-500
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
    // Theme-specific
    cloud: '#e2e8f0',         // slate-200
    pressure: '#ef4444',      // red-500
    bottle: 'rgba(59, 130, 246, 0.3)', // blue with transparency
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

  useEffect(() => {
    if (phase !== undefined && phase !== currentPhase) {
      setCurrentPhase(phase);
    }
  }, [phase, currentPhase]);

  // Cloud physics simulation
  useEffect(() => {
    // When pressure is released, temperature drops (adiabatic expansion)
    // If temp drops below dew point and nuclei present, cloud forms
    const dewPointDrop = (100 - squeezePressure) * 0.15; // Up to 15C drop
    const effectiveTemp = temperature - dewPointDrop;

    // Saturation temperature based on humidity
    const saturationTemp = temperature - (100 - humidity) * 0.5;

    // Cloud forms when effective temp < saturation temp AND nuclei present
    let newDensity = 0;
    if (squeezePressure < 30 && effectiveTemp < saturationTemp) {
      const supersaturation = saturationTemp - effectiveTemp;
      newDensity = hasNuclei
        ? Math.min(100, supersaturation * 10)
        : Math.min(30, supersaturation * 3); // Much weaker without nuclei
    }

    setCloudDensity(newDensity);
  }, [squeezePressure, hasNuclei, temperature, humidity]);

  // Cloud particle animation
  useEffect(() => {
    const generateParticles = () => {
      if (cloudDensity < 10) {
        setCloudParticles([]);
        return;
      }

      const count = Math.floor(cloudDensity * 0.5);
      const particles: CloudParticle[] = Array.from({ length: count }, () => ({
        x: 50 + Math.random() * 200,
        y: 80 + Math.random() * 120,
        size: 5 + Math.random() * 15 * (cloudDensity / 100),
        opacity: 0.3 + Math.random() * 0.4 * (cloudDensity / 100),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3
      }));
      setCloudParticles(particles);
    };

    generateParticles();
  }, [cloudDensity]);

  // Animate cloud particles
  useEffect(() => {
    if (cloudParticles.length === 0) return;

    const interval = setInterval(() => {
      setCloudParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vx: p.vx + (Math.random() - 0.5) * 0.1,
        vy: p.vy + (Math.random() - 0.5) * 0.1
      })));
    }, 50);

    return () => clearInterval(interval);
  }, [cloudParticles.length]);

  const playSound = useCallback((soundType: 'correct' | 'incorrect' | 'complete' | 'transition' | 'squeeze' | 'release' | 'puff') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const frequencies: Record<string, number[]> = {
        correct: [523, 659, 784],
        incorrect: [200, 150],
        complete: [523, 659, 784, 1047],
        transition: [440, 550],
        squeeze: [150, 200, 250],
        release: [250, 200, 150],
        puff: [400, 300, 200]
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      });

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

          } catch {
      // Audio not supported
    }
  }, []);

  const goToNextPhase = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');

    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      setCurrentPhase(PHASE_ORDER[currentIndex + 1]);
      onPhaseComplete?.();
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, currentPhase, onPhaseComplete]);

  const goToPrevPhase = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');

    const currentIndex = PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex > 0) {
      setCurrentPhase(PHASE_ORDER[currentIndex - 1]);
    }
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, currentPhase]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      onCorrectAnswer?.();
    } else {
      onIncorrectAnswer?.();
    }
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
      }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
      }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
      }, [playSound]);

  const handleSqueeze = useCallback(() => {
    setIsSqueezing(true);
    setSqueezePressure(100);
    playSound('squeeze');
      }, [playSound]);

  const handleRelease = useCallback(() => {
    setIsSqueezing(false);
    setSqueezePressure(0);
    playSound('release');
      }, [playSound]);

  const addSmoke = useCallback(() => {
    setShowSmoke(true);
    setHasNuclei(true);
    playSound('puff');
    setTimeout(() => setShowSmoke(false), 1000);
  }, [playSound]);

  const testQuestions: TestQuestion[] = [
    {
      id: 1,
      scenario: "You squeeze a plastic bottle containing moist air and a little smoke, then quickly release it.",
      question: "What causes the cloud to appear when you release?",
      options: [
        { id: 'a', text: 'Smoke particles become visible' },
        { id: 'b', text: 'Water evaporates from the bottle walls' },
        { id: 'c', text: 'Rapid expansion cools the air below dew point, causing condensation on smoke particles', correct: true },
        { id: 'd', text: 'Pressure decrease creates water from thin air' }
      ],
      explanation: "When you release the bottle, the compressed air expands rapidly (adiabatically). This expansion cools the air enough to reach saturation, and water vapor condenses onto the smoke particles (condensation nuclei) to form tiny droplets - a cloud!"
    },
    {
      id: 2,
      scenario: "You try the cloud-in-a-bottle experiment without adding any smoke first.",
      question: "Why is the cloud much weaker or absent without smoke?",
      options: [
        { id: 'a', text: 'Smoke provides heat for cloud formation' },
        { id: 'b', text: 'Without condensation nuclei, water vapor needs much lower temperature to condense (supersaturation required)', correct: true },
        { id: 'c', text: 'Smoke traps the water vapor' },
        { id: 'd', text: 'The bottle shape is wrong without smoke' }
      ],
      explanation: "Water vapor needs surfaces to condense on. Without nuclei (dust, smoke, salt), the air must become highly supersaturated before homogeneous nucleation occurs. With nuclei, condensation happens at exactly the dew point - much easier to achieve!"
    },
    {
      id: 3,
      scenario: "A warm, humid air mass rises over a mountain range.",
      question: "Why do clouds form on the windward side of mountains?",
      options: [
        { id: 'a', text: 'The mountain releases moisture' },
        { id: 'b', text: 'Wind creates clouds from friction' },
        { id: 'c', text: 'Rising air expands and cools adiabatically, reaching dew point', correct: true },
        { id: 'd', text: 'Mountains attract water vapor' }
      ],
      explanation: "As air is forced up the mountain, atmospheric pressure decreases. The air expands adiabatically, cooling at about 10C per km (dry) or 6C per km (saturated). When temperature drops to dew point, clouds form. This is orographic lift."
    },
    {
      id: 4,
      scenario: "An airplane flies at 35,000 feet altitude where outside temperature is -50C.",
      question: "What creates the contrails (condensation trails) behind jet engines?",
      options: [
        { id: 'a', text: 'Smoke from burning fuel' },
        { id: 'b', text: 'Hot, humid exhaust mixing with cold air; water vapor condenses and freezes on exhaust particles', correct: true },
        { id: 'c', text: 'Fuel leaking from the engines' },
        { id: 'd', text: 'Static electricity forming ice' }
      ],
      explanation: "Jet exhaust contains water vapor (from burning hydrocarbon fuel) and particles. When this hot, moist exhaust mixes with extremely cold ambient air, water vapor supersaturates and condenses/freezes into ice crystals on soot particles, creating visible contrails."
    },
    {
      id: 5,
      scenario: "Fog machines at concerts produce thick clouds of 'fog' that hug the ground.",
      question: "How do theatrical fog machines create their effect?",
      options: [
        { id: 'a', text: 'They freeze water from the air' },
        { id: 'b', text: 'They heat a glycol/water mixture to create vapor, which condenses in cool air', correct: true },
        { id: 'c', text: 'They release compressed clouds' },
        { id: 'd', text: 'They use chemical reactions to make fog' }
      ],
      explanation: "Fog machines heat a mixture of water and propylene glycol (or glycerin) to produce vapor. When this hot vapor exits the machine and mixes with cooler ambient air, it condenses into tiny droplets - artificial fog. For ground-hugging fog, the vapor is often chilled with dry ice."
    },
    {
      id: 6,
      scenario: "Cloud seeding aircraft release silver iodide particles into clouds.",
      question: "How does cloud seeding work to potentially increase rainfall?",
      options: [
        { id: 'a', text: 'Silver iodide creates water molecules' },
        { id: 'b', text: 'Silver iodide particles serve as ice nuclei, promoting ice crystal formation which leads to precipitation', correct: true },
        { id: 'c', text: "The aircraft's heat melts clouds into rain" },
        { id: 'd', text: 'Silver iodide absorbs water from the ground' }
      ],
      explanation: "Silver iodide has a crystal structure similar to ice, making it an excellent ice nucleus. When released into supercooled clouds (water below 0C but not frozen), it triggers ice crystal formation. Ice crystals grow at the expense of water droplets, eventually becoming heavy enough to fall as precipitation."
    },
    {
      id: 7,
      scenario: "The dew point temperature is defined as the temperature to which air must cool for condensation to occur.",
      question: "What happens to dew point as you increase water vapor content of air?",
      options: [
        { id: 'a', text: 'Dew point decreases (drier)' },
        { id: 'b', text: 'Dew point increases (closer to current temperature)', correct: true },
        { id: 'c', text: 'Dew point stays the same' },
        { id: 'd', text: 'Dew point fluctuates randomly' }
      ],
      explanation: "More water vapor means saturation occurs at higher temperature. If air at 25C has low humidity, it might need to cool to 5C to saturate. But humid air at 25C might already be near dew point - little cooling needed for condensation. High dew point = muggy weather!"
    },
    {
      id: 8,
      scenario: "You observe that clouds often have flat bottoms at a consistent altitude.",
      question: "Why do cumulus clouds have flat bases?",
      options: [
        { id: 'a', text: 'Wind flattens them from below' },
        { id: 'b', text: 'The flat base marks the lifting condensation level where rising air reaches dew point', correct: true },
        { id: 'c', text: 'Gravity pulls the bottom flat' },
        { id: 'd', text: 'Cloud bases are always at 1000m' }
      ],
      explanation: "The flat cloud base marks the lifting condensation level (LCL) - the altitude where rising air cools to its dew point. Below this level, air is unsaturated (clear). Above it, condensation forms the visible cloud. All rising air parcels from the surface reach dew point at roughly the same altitude."
    },
    {
      id: 9,
      scenario: "Coastal areas often experience sea fog, especially in summer mornings.",
      question: "What causes advection fog over cool ocean water?",
      options: [
        { id: 'a', text: 'Ocean water evaporates into the air' },
        { id: 'b', text: 'Warm, moist air moves over cool water and cools below dew point', correct: true },
        { id: 'c', text: 'Cold water creates fog directly' },
        { id: 'd', text: 'Salt spray creates clouds' }
      ],
      explanation: "Advection fog forms when warm, moist air moves horizontally over a cold surface (like the cool Pacific Ocean). The air's temperature drops by conduction/radiation, reaching dew point. The result is thick fog that can persist until the air warms or wind mixes it away."
    },
    {
      id: 10,
      scenario: "During the water cycle, water evaporates from the ocean, rises, forms clouds, and falls as precipitation.",
      question: "What provides the energy for lifting water vapor high enough to form clouds?",
      options: [
        { id: 'a', text: "The Moon's gravity" },
        { id: 'b', text: 'Solar heating creates convection currents and weather fronts', correct: true },
        { id: 'c', text: 'Ocean currents push water up' },
        { id: 'd', text: 'Magnetic fields' }
      ],
      explanation: "Solar energy drives the water cycle. Sunlight heats Earth's surface, which heats air. Warm air rises (convection), carrying water vapor. As it rises, pressure drops, air expands and cools, eventually forming clouds. Weather fronts and orographic lift also raise air, all ultimately driven by solar heating."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🌧",
      title: "Weather Formation",
      short: "Weather",
      tagline: "How clouds and precipitation really work",
      description: "All clouds in nature form through the same basic process: air cools below its dew point and water condenses on atmospheric nuclei.",
      connection: "Rising air expands adiabatically, cooling until it reaches saturation. Natural nuclei (dust, sea salt, pollen) enable condensation at exactly the dew point.",
      howItWorks: "Air rises via convection, fronts, or terrain. Cooling air reaches 100% humidity. Vapor condenses on nuclei. Droplets grow by collision/coalescence. When heavy enough, precipitation falls.",
      stats: [
        { value: "10C/km", label: "Dry adiabatic rate" },
        { value: "6C/km", label: "Moist adiabatic rate" },
        { value: "1M+", label: "Droplets per raindrop" },
        { value: "0.02mm", label: "Cloud droplet size" }
      ],
      examples: [
        "Cumulus clouds from surface heating",
        "Stratus from frontal lifting",
        "Orographic clouds over mountains",
        "Thunderstorms from convection"
      ],
      companies: ["NOAA", "Met Office", "ECMWF", "NASA"],
      futureImpact: "Better understanding of cloud microphysics improves weather forecasting and climate models. This is critical for predicting extreme weather events and long-term climate change.",
      color: "from-blue-600 to-sky-600"
    },
    {
      icon: "✈️",
      title: "Contrails",
      short: "Contrails",
      tagline: "Aircraft create artificial clouds",
      description: "Jet contrails are human-made clouds formed when hot, humid engine exhaust mixes with cold upper atmosphere air.",
      connection: "Exhaust contains water vapor and particles. Mixing cools the vapor below saturation, condensing and freezing into ice crystals visible as white trails.",
      howItWorks: "Jet fuel combustion produces CO2, water vapor, and soot particles. At high altitude (-40C or colder), exhaust water vapor supersaturates, forming ice crystals on exhaust particles. Persistence depends on humidity.",
      stats: [
        { value: "-40C", label: "Typical contrail altitude" },
        { value: "35,000ft", label: "Cruise altitude" },
        { value: "Hours", label: "Persistent contrails" },
        { value: "2-3%", label: "Of aviation CO2 warming" }
      ],
      examples: [
        "Short-lived contrails (dry air)",
        "Persistent contrails (humid air)",
        "Contrail cirrus clouds",
        "Distrails (dissipation trails)"
      ],
      companies: ["Boeing", "Airbus", "NASA", "DLR"],
      futureImpact: "Research shows contrails may have significant climate impact beyond CO2. Airlines are testing flight path adjustments to avoid contrail formation, potentially reducing aviation's climate footprint.",
      color: "from-slate-600 to-gray-600"
    },
    {
      icon: "🎭",
      title: "Fog Machines",
      short: "Fog",
      tagline: "Making clouds on demand for entertainment",
      description: "Theatrical fog machines create artificial clouds using heated glycol solutions - the same condensation physics as real clouds.",
      connection: "Heating glycol/water creates vapor; when it exits into cooler air, it cools below dew point and condenses into visible droplets - instant fog!",
      howItWorks: "Pump forces glycol/water mixture onto a heat exchanger. Liquid vaporizes. Hot vapor exits the nozzle. Contact with room air cools vapor below dew point. Condensation forms fog droplets.",
      stats: [
        { value: "250C", label: "Heater temperature" },
        { value: "20,000+", label: "Cubic ft/min output" },
        { value: "Safe", label: "Propylene glycol" },
        { value: "Minutes", label: "Hang time" }
      ],
      examples: [
        "Concert and stage fog",
        "Haunted house effects",
        "Film and TV production",
        "Fire training simulations"
      ],
      companies: ["Chauvet", "Antari", "Look Solutions", "MDG"],
      futureImpact: "Advanced fog systems now include scented fog, colored fog with lighting, and cryo-fog (using liquid CO2) for ground-hugging effects. Environmental concerns drive water-based alternatives.",
      color: "from-purple-600 to-indigo-600"
    },
    {
      icon: "🌧",
      title: "Cloud Seeding",
      short: "Seeding",
      tagline: "Modifying weather on purpose",
      description: "Cloud seeding introduces artificial nuclei to trigger or enhance precipitation from existing clouds.",
      connection: "Silver iodide or other materials serve as ice nuclei in supercooled clouds, promoting ice crystal formation that leads to precipitation via the Bergeron process.",
      howItWorks: "Aircraft or ground generators release silver iodide into supercooled clouds. Particles act as ice nuclei. Ice crystals form and grow. Crystals fall as snow or melt to rain.",
      stats: [
        { value: "10-30%", label: "Possible precip increase" },
        { value: "50+", label: "Countries with programs" },
        { value: "-5C", label: "Best seeding temperature" },
        { value: "$50M", label: "Annual global spending" }
      ],
      examples: [
        "Drought relief in agriculture",
        "Ski resort snowfall enhancement",
        "Hail suppression",
        "Fog dispersal at airports"
      ],
      companies: ["Weather Modification Inc", "North American Weather", "Seeding Operations", "NCAR"],
      futureImpact: "Climate change increases interest in weather modification. Research continues on effectiveness, while concerns about unintended consequences and 'stealing' rain from neighbors prompt international discussions.",
      color: "from-cyan-600 to-teal-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctIndex = testQuestions[index].options.findIndex(opt => opt.correct);
      return score + (answer === correctIndex ? 1 : 0);
    }, 0);
  };

  const renderBottleVisualization = () => {
    const bottleWidth = 160;
    const bottleHeight = 220;
    const compression = isSqueezing ? 0.85 : 1;

    // Generate stable particle positions using seed-based approach
    const smokeParticles = React.useMemo(() => {
      return Array.from({ length: 20 }, (_, i) => ({
        cx: 80 + ((i * 13) % 140),
        cy: 70 + ((i * 17) % 160),
        r: 1.5 + (i % 3),
        opacity: 0.2 + (i % 5) * 0.1
      }));
    }, []);

    // Generate water vapor particles
    const vaporParticles = React.useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => ({
        cx: 90 + ((i * 11) % 120),
        cy: 200 + ((i * 7) % 50),
        r: 2 + (i % 2),
        delay: i * 0.3
      }));
    }, []);

    // Status label text
    const statusText = isSqueezing
      ? 'Squeezed - Pressurized'
      : cloudDensity > 20
        ? 'Released - Cloud!'
        : 'Released - Ready';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg viewBox="0 0 300 260" style={{ width: '100%', maxWidth: '350px', height: 'auto' }}>
          <defs>
            {/* Premium glass bottle gradient with transparency effect */}
            <linearGradient id="cloudBottleGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#94a3b8" stopOpacity="0.25" />
              <stop offset="35%" stopColor="#e2e8f0" stopOpacity="0.15" />
              <stop offset="65%" stopColor="#e2e8f0" stopOpacity="0.15" />
              <stop offset="85%" stopColor="#94a3b8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.4" />
            </linearGradient>

            {/* Glass highlight for 3D effect */}
            <linearGradient id="cloudBottleHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Bottle neck metallic cap gradient */}
            <linearGradient id="cloudBottleCap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Water at bottom with depth gradient */}
            <linearGradient id="cloudWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
            </linearGradient>

            {/* Cloud formation radial gradient - fluffy white effect */}
            <radialGradient id="cloudFormationGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#f8fafc" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#e2e8f0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
            </radialGradient>

            {/* Cloud particle glow gradient */}
            <radialGradient id="cloudParticleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
            </radialGradient>

            {/* Smoke/nuclei particle gradient */}
            <radialGradient id="cloudSmokeParticle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0" />
            </radialGradient>

            {/* Pressure indicator gradient - red/orange for compression */}
            <linearGradient id="cloudPressureGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>

            {/* Water vapor rising gradient */}
            <linearGradient id="cloudVaporGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
            </linearGradient>

            {/* Hand skin tone gradient */}
            <linearGradient id="cloudHandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Background subtle gradient */}
            <linearGradient id="cloudBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Glow filter for cloud particles */}
            <filter id="cloudGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft blur for dense cloud */}
            <filter id="cloudDenseBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pressure release effect filter */}
            <filter id="cloudPressureBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Smoke particle blur */}
            <filter id="cloudSmokeBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Water shimmer effect */}
            <filter id="cloudWaterShimmer" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background with gradient */}
          <rect width="300" height="260" fill="url(#cloudBgGradient)" rx="12" />

          {/* Subtle grid pattern for depth */}
          <pattern id="cloudGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width="300" height="260" fill="url(#cloudGridPattern)" rx="12" />

          {/* Pressure release visual effect (when releasing) */}
          {!isSqueezing && squeezePressure < 30 && cloudDensity > 10 && (
            <g filter="url(#cloudPressureBlur)">
              <ellipse
                cx="150"
                cy="130"
                rx={80}
                ry={60}
                fill="url(#cloudPressureGradient)"
                opacity={0.3}
              >
                <animate attributeName="rx" values="70;90;70" dur="1s" repeatCount="indefinite" />
                <animate attributeName="ry" values="50;70;50" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1s" repeatCount="indefinite" />
              </ellipse>
            </g>
          )}

          {/* Bottle body - glass effect with multiple layers */}
          <g>
            {/* Main bottle shape - glass body */}
            <path
              d={`M${150 - bottleWidth/2 * compression},${50}
                  L${150 - bottleWidth/2 * compression},${50 + bottleHeight}
                  Q${150 - bottleWidth/2 * compression},${50 + bottleHeight + 20} ${150},${50 + bottleHeight + 20}
                  Q${150 + bottleWidth/2 * compression},${50 + bottleHeight + 20} ${150 + bottleWidth/2 * compression},${50 + bottleHeight}
                  L${150 + bottleWidth/2 * compression},${50}
                  Q${150 + bottleWidth/2 * compression},${30} ${150},${30}
                  Q${150 - bottleWidth/2 * compression},${30} ${150 - bottleWidth/2 * compression},${50}
                  Z`}
              fill="url(#cloudBottleGlass)"
              stroke="#64748b"
              strokeWidth="2"
            />

            {/* Glass highlight reflection */}
            <path
              d={`M${150 - bottleWidth/2 * compression + 10},${55}
                  L${150 - bottleWidth/2 * compression + 10},${50 + bottleHeight - 10}
                  Q${150 - bottleWidth/2 * compression + 15},${50 + bottleHeight + 10} ${150 - bottleWidth/4 * compression},${50 + bottleHeight + 10}
                  L${150 - bottleWidth/4 * compression},${55}
                  Z`}
              fill="url(#cloudBottleHighlight)"
            />

            {/* Right side subtle reflection */}
            <path
              d={`M${150 + bottleWidth/3 * compression},${60}
                  L${150 + bottleWidth/3 * compression},${50 + bottleHeight - 20}
                  L${150 + bottleWidth/3 * compression + 8},${50 + bottleHeight - 25}
                  L${150 + bottleWidth/3 * compression + 8},${65}
                  Z`}
              fill="#ffffff"
              opacity="0.1"
            />
          </g>

          {/* Bottle neck with metallic cap */}
          <g>
            <rect
              x="135"
              y="10"
              width="30"
              height="22"
              fill="url(#cloudBottleCap)"
              stroke="#475569"
              strokeWidth="1.5"
              rx="4"
            />
            {/* Cap ridges for realism */}
            <line x1="138" y1="12" x2="138" y2="30" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
            <line x1="143" y1="12" x2="143" y2="30" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
            <line x1="157" y1="12" x2="157" y2="30" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
            <line x1="162" y1="12" x2="162" y2="30" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
          </g>

          {/* Water at bottom with shimmer */}
          <g filter="url(#cloudWaterShimmer)">
            <path
              d={`M${150 - bottleWidth/2 * compression + 5},${50 + bottleHeight - 20}
                  L${150 - bottleWidth/2 * compression + 5},${50 + bottleHeight + 15}
                  Q${150},${50 + bottleHeight + 18} ${150 + bottleWidth/2 * compression - 5},${50 + bottleHeight + 15}
                  L${150 + bottleWidth/2 * compression - 5},${50 + bottleHeight - 20}
                  Z`}
              fill="url(#cloudWaterGradient)"
            />
            {/* Water surface highlight */}
            <ellipse
              cx="150"
              cy={50 + bottleHeight - 18}
              rx={bottleWidth/2 * compression - 10}
              ry="3"
              fill="#93c5fd"
              opacity="0.4"
            />
          </g>

          {/* Water vapor particles rising from water */}
          {humidity > 60 && (
            <g>
              {vaporParticles.map((vp, i) => (
                <ellipse
                  key={`vapor-${i}`}
                  cx={vp.cx}
                  cy={vp.cy}
                  rx={vp.r}
                  ry={vp.r * 1.5}
                  fill="url(#cloudVaporGradient)"
                  opacity={0.4}
                >
                  <animate
                    attributeName="cy"
                    values={`${vp.cy};${vp.cy - 40};${vp.cy}`}
                    dur="3s"
                    begin={`${vp.delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.4;0;0.4"
                    dur="3s"
                    begin={`${vp.delay}s`}
                    repeatCount="indefinite"
                  />
                </ellipse>
              ))}
            </g>
          )}

          {/* Smoke particles (nuclei indicator) */}
          {hasNuclei && (showSmoke || cloudDensity < 30) && (
            <g filter="url(#cloudSmokeBlur)">
              {smokeParticles.map((sp, i) => (
                <circle
                  key={`smoke-${i}`}
                  cx={sp.cx}
                  cy={sp.cy}
                  r={sp.r}
                  fill="url(#cloudSmokeParticle)"
                  opacity={sp.opacity}
                >
                  {showSmoke && (
                    <animate
                      attributeName="opacity"
                      values={`${sp.opacity};${sp.opacity * 0.3};${sp.opacity}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              ))}
            </g>
          )}

          {/* Cloud particles with glow effect */}
          <g filter="url(#cloudGlowFilter)">
            {cloudParticles.map((p, i) => (
              <circle
                key={`cloud-${i}`}
                cx={p.x}
                cy={p.y}
                r={p.size}
                fill="url(#cloudParticleGlow)"
                opacity={p.opacity * (cloudDensity / 100)}
              />
            ))}
          </g>

          {/* Dense cloud overlay - main cloud formation */}
          {cloudDensity > 30 && (
            <g filter="url(#cloudDenseBlur)">
              {/* Multiple cloud puffs for realistic look */}
              <ellipse
                cx="150"
                cy="120"
                rx={45 * (cloudDensity / 100)}
                ry={35 * (cloudDensity / 100)}
                fill="url(#cloudFormationGradient)"
                opacity={cloudDensity / 120}
              />
              <ellipse
                cx="125"
                cy="135"
                rx={35 * (cloudDensity / 100)}
                ry={30 * (cloudDensity / 100)}
                fill="url(#cloudFormationGradient)"
                opacity={cloudDensity / 130}
              />
              <ellipse
                cx="175"
                cy="135"
                rx={35 * (cloudDensity / 100)}
                ry={30 * (cloudDensity / 100)}
                fill="url(#cloudFormationGradient)"
                opacity={cloudDensity / 130}
              />
              <ellipse
                cx="150"
                cy="150"
                rx={50 * (cloudDensity / 100)}
                ry={40 * (cloudDensity / 100)}
                fill="url(#cloudFormationGradient)"
                opacity={cloudDensity / 140}
              />
            </g>
          )}

          {/* Hands squeezing with gradient (when active) */}
          {isSqueezing && (
            <g>
              {/* Left hand */}
              <path
                d="M25,90 Q45,100 58,130 Q55,160 58,190 Q45,195 25,195 Q30,150 25,90"
                fill="url(#cloudHandGradient)"
                opacity="0.9"
                stroke="#d97706"
                strokeWidth="1"
              />
              {/* Left hand fingers */}
              <path
                d="M58,115 Q65,118 68,130 Q65,145 58,150"
                fill="url(#cloudHandGradient)"
                opacity="0.85"
              />

              {/* Right hand */}
              <path
                d="M275,90 Q255,100 242,130 Q245,160 242,190 Q255,195 275,195 Q270,150 275,90"
                fill="url(#cloudHandGradient)"
                opacity="0.9"
                stroke="#d97706"
                strokeWidth="1"
              />
              {/* Right hand fingers */}
              <path
                d="M242,115 Q235,118 232,130 Q235,145 242,150"
                fill="url(#cloudHandGradient)"
                opacity="0.85"
              />

              {/* Pressure arrows */}
              <path d="M55,140 L70,140 L65,135 M70,140 L65,145" stroke="#f59e0b" strokeWidth="2" opacity="0.7" />
              <path d="M245,140 L230,140 L235,135 M230,140 L235,145" stroke="#f59e0b" strokeWidth="2" opacity="0.7" />
            </g>
          )}
        </svg>

        {/* Status label moved outside SVG using typo system */}
        <div style={{
          fontSize: typo.small,
          color: cloudDensity > 20 ? colors.primary : colors.textSecondary,
          fontWeight: cloudDensity > 20 ? 600 : 400,
          textAlign: 'center',
          padding: '4px 12px',
          background: cloudDensity > 20 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(71, 85, 105, 0.3)',
          borderRadius: '8px',
          border: cloudDensity > 20 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(71, 85, 105, 0.3)',
          transition: 'all 0.3s ease'
        }}>
          {statusText}
        </div>
      </div>
    );
  };

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', padding: '24px 16px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#3b82f6', letterSpacing: '0.05em' }}>ATMOSPHERIC SCIENCE</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #93c5fd, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Cloud in a Bottle
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '400px', marginBottom: '32px' }}>
        Can you make a <span style={{ color: '#3b82f6', fontWeight: 600 }}>cloud on command</span>?
      </p>

      {/* Visual card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid rgba(71, 85, 105, 0.5)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <svg viewBox="0 0 200 120" style={{ width: '200px' }}>
            {/* Bottle */}
            <rect x="70" y="20" width="60" height="80" fill="rgba(148, 163, 184, 0.2)" stroke="#64748b" strokeWidth="2" rx="5" />
            <rect x="85" y="5" width="30" height="15" fill="rgba(148, 163, 184, 0.2)" stroke="#64748b" strokeWidth="2" rx="3" />

            {/* Cloud inside */}
            <ellipse cx="100" cy="55" rx="25" ry="18" fill="white" opacity="0.7" />
            <ellipse cx="90" cy="50" rx="15" ry="12" fill="white" opacity="0.6" />
            <ellipse cx="110" cy="50" rx="15" ry="12" fill="white" opacity="0.6" />

            {/* Question marks */}
            <text x="40" y="60" fontSize="24" fill="#f59e0b">?</text>
            <text x="155" y="60" fontSize="24" fill="#f59e0b">?</text>
          </svg>
        </div>

        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          Squeeze a bottle, release it, and watch a <span style={{ color: '#3b82f6' }}>real cloud</span> form inside!
        </p>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          This is the same physics that creates every cloud in the sky, from morning fog to thunderstorms.
        </p>
      </div>

      {/* CTA */}
      <button
        onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        style={{ padding: '16px 32px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontSize: '18px', fontWeight: 600, borderRadius: '16px', border: 'none', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)' }}
      >
        Make a Cloud
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '16px' }}>
          You add a little smoke to a plastic bottle containing moist air. You squeeze the bottle hard, then quickly release it.
        </p>
        <p style={{ fontSize: '16px', color: '#3b82f6', fontWeight: 500 }}>
          What happens when you release the squeeze?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Nothing visible happens' },
          { id: 'B', text: 'The bottle makes a popping sound but stays clear' },
          { id: 'C', text: 'A cloud forms inside the bottle' },
          { id: 'D', text: 'Water droplets condense on the bottle walls' }
        ].map(option => (
          <button
            key={option.id}
            onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              background: showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showPredictionFeedback && option.id === 'C'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
              border: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'C')
                ? option.id === 'C' ? '2px solid #22c55e' : '2px solid #ef4444'
                : '2px solid transparent',
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '500px' }}>
          <p style={{ color: '#22c55e', fontWeight: 600 }}>
            {selectedPrediction === 'C' ? 'Correct!' : 'Yes!'} A real cloud forms!
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            When you release, air expands rapidly and cools. This drops temperature below the dew point, causing water to condense on smoke particles - forming a cloud!
          </p>
          <button
            onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
            style={{ marginTop: '16px', padding: '12px 24px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
          >
            Try It Yourself
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Cloud Lab</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Squeeze and release to make clouds!</p>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        {renderBottleVisualization()}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
        {/* Squeeze/Release buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleSqueeze(); }}
            disabled={isSqueezing}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: isSqueezing ? 'default' : 'pointer',
              background: isSqueezing ? 'rgba(251, 191, 36, 0.5)' : 'linear-gradient(to right, #f59e0b, #d97706)',
              color: 'white',
              transition: 'all 0.3s'
            }}
          >
            ✊ Squeeze
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleRelease(); }}
            disabled={!isSqueezing}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: !isSqueezing ? 'default' : 'pointer',
              background: !isSqueezing ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(to right, #3b82f6, #2563eb)',
              color: 'white',
              transition: 'all 0.3s'
            }}
          >
            ✋ Release
          </button>
        </div>

        {/* Add smoke button */}
        <button
          onPointerDown={(e) => { e.preventDefault(); addSmoke(); }}
          style={{
            padding: '12px',
            borderRadius: '12px',
            fontWeight: 600,
            border: hasNuclei ? '2px solid #22c55e' : '2px solid #64748b',
            cursor: 'pointer',
            background: hasNuclei ? 'rgba(34, 197, 94, 0.2)' : 'rgba(71, 85, 105, 0.5)',
            color: hasNuclei ? '#22c55e' : '#94a3b8',
            transition: 'all 0.3s'
          }}
        >
          {hasNuclei ? '💨 Nuclei Present' : '💨 Add Smoke (Nuclei)'}
        </button>

        {/* Toggle nuclei */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px' }}>
          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Condensation Nuclei</span>
          <button
            onPointerDown={(e) => { e.preventDefault(); setHasNuclei(!hasNuclei); }}
            style={{
              width: '48px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: hasNuclei ? '#22c55e' : '#475569',
              position: 'relative',
              transition: 'all 0.3s'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '2px',
              left: hasNuclei ? '26px' : '2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              transition: 'all 0.3s'
            }} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '20px' }}>{cloudDensity.toFixed(0)}%</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Cloud Density</div>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '20px' }}>{isSqueezing ? '↑' : temperature - (100 - squeezePressure) * 0.15 < 15 ? '↓' : '—'}</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Temperature</div>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '20px' }}>{hasNuclei ? 'Yes' : 'No'}</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Nuclei</div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', maxWidth: '400px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <p style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '8px' }}>How It Works</p>
        <ol style={{ color: '#cbd5e1', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
          <li>Make sure nuclei are present (add smoke)</li>
          <li>Squeeze to pressurize (heats air slightly)</li>
          <li>Release to expand (cools air rapidly)</li>
          <li>Cloud forms as vapor condenses on nuclei!</li>
        </ol>
      </div>

      <button
        onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
      >
        Understand the Physics
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Why Clouds Form</h2>

      {/* Three requirements */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59, 130, 246, 0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💧</div>
          <h3 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '8px' }}>Water Vapor</h3>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>Moist air contains invisible water vapor ready to condense</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>❄️</div>
          <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>Cooling</h3>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>Temperature must drop below dew point (saturation)</p>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(34, 197, 94, 0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔘</div>
          <h3 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>Nuclei</h3>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>Particles for vapor to condense onto (dust, smoke, salt)</p>
        </div>
      </div>

      {/* Process explanation */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <h3 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '16px' }}>The Process</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>1</div>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Squeeze: Compress air, slightly warming it</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>2</div>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Release: Air expands rapidly (adiabatically)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>3</div>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Cool: Expansion cools air below dew point</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>4</div>
            <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Condense: Water vapor condenses on nuclei = CLOUD!</span>
          </div>
        </div>
      </div>

      {/* Key equation */}
      <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', width: '100%', border: '1px solid rgba(139, 92, 246, 0.3)', textAlign: 'center' }}>
        <h3 style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '12px' }}>The Same Physics Everywhere</h3>
        <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
          This bottle demonstrates the exact process that forms ALL clouds: Rising air → Expansion → Cooling → Condensation
        </p>
      </div>

      <button
        onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #8b5cf6, #7c3aed)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
      >
        Discover the Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>The Twist: Without Smoke?</h2>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '16px' }}>
          The cloud formed beautifully with smoke particles as condensation nuclei.
        </p>
        <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: 500, marginBottom: '16px' }}>
          What if you try the experiment WITHOUT any smoke?
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: '2px solid #22c55e' }}>
              <span style={{ fontSize: '24px' }}>💨</span>
            </div>
            <span style={{ color: '#22c55e', fontSize: '12px' }}>With Smoke</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', color: '#94a3b8' }}>→</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(139, 92, 246, 0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: '2px solid #8b5cf6' }}>
              <span style={{ fontSize: '24px' }}>❓</span>
            </div>
            <span style={{ color: '#8b5cf6', fontSize: '12px' }}>Without Smoke</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'The cloud forms exactly the same way' },
          { id: 'B', text: 'Little to no visible cloud forms (nuclei are essential!)' },
          { id: 'C', text: 'The cloud is actually bigger without smoke' },
          { id: 'D', text: 'Water rains out instead of forming a cloud' }
        ].map(option => (
          <button
            key={option.id}
            onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              background: showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showTwistFeedback && option.id === 'B'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : 'rgba(51, 65, 85, 0.5)',
              border: showTwistFeedback && (twistPrediction === option.id || option.id === 'B')
                ? option.id === 'B' ? '2px solid #22c55e' : '2px solid #ef4444'
                : '2px solid transparent',
              cursor: showTwistFeedback ? 'default' : 'pointer',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '500px' }}>
          <p style={{ color: '#22c55e', fontWeight: 600 }}>
            {twistPrediction === 'B' ? 'Exactly!' : 'Surprising result!'} The cloud is much weaker without nuclei!
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            Without condensation nuclei, water vapor needs extreme "supersaturation" to condense. The air must get much colder before homogeneous nucleation occurs. Nuclei are essential!
          </p>
          <button
            onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
            style={{ marginTop: '16px', padding: '12px 24px', background: 'linear-gradient(to right, #8b5cf6, #7c3aed)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
          >
            Compare Both
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>With vs Without Nuclei</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Toggle nuclei and see the dramatic difference</p>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        {renderBottleVisualization()}
      </div>

      {/* Toggle and controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
        {/* Nuclei toggle */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onPointerDown={(e) => { e.preventDefault(); setHasNuclei(true); addSmoke(); }}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              border: hasNuclei ? '2px solid #22c55e' : '2px solid transparent',
              cursor: 'pointer',
              background: hasNuclei ? 'rgba(34, 197, 94, 0.2)' : 'rgba(51, 65, 85, 0.5)',
              color: hasNuclei ? '#22c55e' : '#94a3b8',
              transition: 'all 0.3s'
            }}
          >
            💨 With Nuclei
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); setHasNuclei(false); }}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              border: !hasNuclei ? '2px solid #ef4444' : '2px solid transparent',
              cursor: 'pointer',
              background: !hasNuclei ? 'rgba(239, 68, 68, 0.2)' : 'rgba(51, 65, 85, 0.5)',
              color: !hasNuclei ? '#ef4444' : '#94a3b8',
              transition: 'all 0.3s'
            }}
          >
            🚫 Without Nuclei
          </button>
        </div>

        {/* Squeeze/Release */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleSqueeze(); }}
            disabled={isSqueezing}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: isSqueezing ? 'default' : 'pointer',
              background: isSqueezing ? 'rgba(251, 191, 36, 0.5)' : 'linear-gradient(to right, #f59e0b, #d97706)',
              color: 'white'
            }}
          >
            ✊ Squeeze
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleRelease(); }}
            disabled={!isSqueezing}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: !isSqueezing ? 'default' : 'pointer',
              background: !isSqueezing ? 'rgba(59, 130, 246, 0.3)' : 'linear-gradient(to right, #3b82f6, #2563eb)',
              color: 'white'
            }}
          >
            ✋ Release
          </button>
        </div>
      </div>

      {/* Comparison info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '400px' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>With Nuclei</h4>
          <p style={{ color: '#cbd5e1', fontSize: '12px' }}>Cloud forms at exactly dew point. Thick, visible cloud!</p>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h4 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>Without Nuclei</h4>
          <p style={{ color: '#cbd5e1', fontSize: '12px' }}>Needs supersaturation. Weak or no visible cloud!</p>
        </div>
      </div>

      <button
        onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #8b5cf6, #7c3aed)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>Key Discovery</h2>

      <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.1))', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <h3 style={{ color: 'white', fontWeight: 700, fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>
          Condensation Nuclei Are Essential!
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
          In the real atmosphere, these nuclei come from:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏜</div>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Dust</span>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌊</div>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Sea Salt</span>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌸</div>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Pollen</span>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏭</div>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Pollution</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', width: '100%', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
        <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '12px' }}>This Explains...</h4>
        <ul style={{ color: '#cbd5e1', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: '8px' }}>Why clean air over oceans can be "too clean" for clouds</li>
          <li style={{ marginBottom: '8px' }}>How cloud seeding works (adding artificial nuclei)</li>
          <li style={{ marginBottom: '8px' }}>Why polluted areas may have more clouds (but less rain per cloud)</li>
          <li>Why contrails form from jet exhaust particles</li>
        </ul>
      </div>

      <button
        onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
      >
        Explore Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Real-World Applications</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Cloud physics everywhere</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {transferApps.map((app, index) => (
          <button
            key={index}
            onPointerDown={(e) => {
              e.preventDefault();
              setActiveAppTab(index);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: activeAppTab === index
                ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                : completedApps.has(index)
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(51, 65, 85, 0.5)',
              color: 'white',
              transition: 'all 0.3s'
            }}
          >
            {app.icon} {isMobile ? app.short : app.title}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px' }}>{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{transferApps[activeAppTab].title}</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p style={{ color: '#cbd5e1', marginBottom: '16px', fontSize: '14px' }}>{transferApps[activeAppTab].description}</p>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Physics Connection</h4>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>{transferApps[activeAppTab].connection}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
              <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '14px' }}>{stat.value}</div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onPointerDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {transferApps.map((_, i) => (
            <div
              key={i}
              style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#22c55e' : '#475569' }}
            />
          ))}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>{completedApps.size}/{transferApps.length}</span>
      </div>

      {completedApps.size >= transferApps.length && (
        <button
          onPointerDown={(e) => { e.preventDefault(); goToNextPhase(); }}
          style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
        >
          Take the Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Knowledge Test</h2>

      {!showTestResults ? (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {testQuestions.map((q, qIndex) => (
            <div key={q.id} style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>{q.scenario}</p>
              </div>
              <p style={{ color: 'white', fontWeight: 500, marginBottom: '12px' }}>{qIndex + 1}. {q.question}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((opt, oIndex) => (
                  <button
                    key={opt.id}
                    onPointerDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      background: testAnswers[qIndex] === oIndex ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                      color: '#e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
            }}
            disabled={testAnswers.includes(-1)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: testAnswers.includes(-1) ? 'not-allowed' : 'pointer',
              background: testAnswers.includes(-1) ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(to right, #3b82f6, #2563eb)',
              color: testAnswers.includes(-1) ? '#64748b' : 'white',
              marginTop: '16px'
            }}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Score: {calculateScore()}/10
            </h3>
            <p style={{ color: '#94a3b8' }}>
              {calculateScore() >= 7 ? 'Excellent! You understand cloud physics!' : 'Keep learning! Review and try again.'}
            </p>

            {calculateScore() >= 7 ? (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  goToNextPhase();
                  onCorrectAnswer?.();
                }}
                style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #22c55e, #16a34a)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                Claim Your Badge
              </button>
            ) : (
              <button
                onPointerDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToNextPhase(); }}
                style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                Review & Try Again
              </button>
            )}
          </div>

          {/* Show explanations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testQuestions.map((q, i) => {
              const correctIndex = q.options.findIndex(opt => opt.correct);
              const isCorrect = testAnswers[i] === correctIndex;
              return (
                <div key={q.id} style={{ padding: '16px', borderRadius: '12px', background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: isCorrect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 500, fontSize: '14px' }}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct: ${q.options[correctIndex].text}`}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))', borderRadius: '24px', padding: '32px', maxWidth: '500px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>☁️</div>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Cloud Master!</h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '24px' }}>
          You've mastered the physics of cloud formation and atmospheric science!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💧</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Condensation</p>
            <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600 }}>Physics</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔘</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Nucleation</p>
            <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600 }}>Sites</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌡</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Adiabatic</p>
            <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600 }}>Cooling</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌧</div>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Weather</p>
            <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600 }}>Systems</p>
          </div>
        </div>

        <button
          onPointerDown={(e) => { e.preventDefault(); setCurrentPhase('hook'); }}
          style={{ padding: '12px 24px', background: 'rgba(71, 85, 105, 0.5)', color: 'white', fontWeight: 500, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
        >
          Explore Again
        </button>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (currentPhase) {
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)' }} />
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

      {/* Fixed header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#3b82f6' }}>Cloud in a Bottle</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {PHASE_ORDER.map((p, index) => {
              const currentIndex = PHASE_ORDER.indexOf(currentPhase);
              return (
                <div
                  key={p}
                  style={{
                    height: '8px',
                    borderRadius: '4px',
                    transition: 'all 0.3s',
                    width: currentPhase === p ? '24px' : '8px',
                    background: currentPhase === p
                      ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                      : index < currentIndex
                        ? '#22c55e'
                        : '#475569'
                  }}
                />
              );
            })}
          </div>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>{currentPhase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '64px', paddingBottom: '32px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default CloudInBottleRenderer;
