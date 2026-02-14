'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON GAME #26: SPACE RADIATOR - Complete 10-Phase Game
// Spacecraft thermal control — rejecting waste heat in vacuum via radiation
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ELON_SpaceRadiatorRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "The International Space Station orbits at ~408 km altitude. It generates about 75 kW of waste heat from crew systems and experiments that must be rejected to space.",
    question: "Why can't the ISS simply open a vent to let hot air out, like a building on Earth?",
    options: [
      { id: 'a', label: "In vacuum there is no air for convection — heat can only be rejected by thermal radiation", correct: true },
      { id: 'b', label: "Opening a vent would depressurize the station" },
      { id: 'c', label: "Hot air rises in space just like on Earth, so venting would work but is too expensive" },
      { id: 'd', label: "The ISS does use convection through micrometeorite holes" }
    ],
    explanation: "In the vacuum of space, there is no medium for convective heat transfer. The only mechanism for rejecting heat to the environment is thermal radiation, governed by the Stefan-Boltzmann law. This is why spacecraft need large radiator panels."
  },
  {
    scenario: "A spacecraft designer needs to size radiator panels for a 50 kW heat load. The Stefan-Boltzmann law states radiated power Q = εσAT⁴, where σ = 5.67×10⁻⁸ W/(m²·K⁴).",
    question: "If the radiator temperature is doubled from 300K to 600K, how does the required radiator area change?",
    options: [
      { id: 'a', label: "Area decreases by a factor of 16 (2⁴) due to the T⁴ relationship", correct: true },
      { id: 'b', label: "Area decreases by a factor of 2 (linear relationship)" },
      { id: 'c', label: "Area decreases by a factor of 4 (T² relationship)" },
      { id: 'd', label: "Area stays the same — temperature doesn't affect radiator sizing" }
    ],
    explanation: "The Stefan-Boltzmann law has a T⁴ dependence. Doubling the temperature increases radiated power per unit area by 2⁴ = 16 times. This means 16× less area is needed for the same heat rejection, which is why running radiators hotter is so advantageous — but electronics limit how hot you can go."
  },
  {
    scenario: "A satellite's radiator panel has an absorptivity (α) of 0.2 and an emissivity (ε) of 0.9. It is exposed to direct sunlight with a solar flux of 1361 W/m².",
    question: "Why is the α/ε ratio critical for radiator design?",
    options: [
      { id: 'a', label: "Low α/ε means the radiator absorbs little solar heat while efficiently emitting waste heat", correct: true },
      { id: 'b', label: "High α/ε means better heat rejection in all conditions" },
      { id: 'c', label: "The ratio doesn't matter — only total surface area determines performance" },
      { id: 'd', label: "α/ε should equal 1.0 for optimal thermal equilibrium" }
    ],
    explanation: "A low α/ε ratio is ideal for radiators: low absorptivity (α) minimizes solar heat gain, while high emissivity (ε) maximizes thermal radiation to space. Specialized coatings like white paint or optical solar reflectors achieve α/ε ratios below 0.25, keeping radiators effective even in sunlight."
  },
  {
    scenario: "Heat pipes are used extensively in spacecraft to transport heat from electronics to radiator panels. They contain a working fluid (often ammonia) that evaporates at the hot end and condenses at the cold end.",
    question: "What drives the fluid circulation in a heat pipe without any mechanical pump?",
    options: [
      { id: 'a', label: "Capillary action in the wick structure draws condensed liquid back to the evaporator end", correct: true },
      { id: 'b', label: "Gravity pulls the fluid downward in orbit" },
      { id: 'c', label: "An electric field pushes the fluid through the pipe" },
      { id: 'd', label: "Pressure from expanding vapor forces liquid to circulate" }
    ],
    explanation: "Heat pipes use a porous wick structure that generates capillary pressure to draw condensed liquid from the cold end back to the hot end. This passive mechanism requires no moving parts, making heat pipes extremely reliable. In microgravity, capillary-driven flow works identically to ground conditions."
  },
  {
    scenario: "Multi-layer insulation (MLI) consists of many thin reflective layers (often aluminized Mylar) separated by low-conductivity spacers. A typical MLI blanket has 20-30 layers.",
    question: "How does MLI achieve such effective thermal insulation in vacuum?",
    options: [
      { id: 'a', label: "Each reflective layer blocks radiative heat transfer, and vacuum between layers eliminates conduction and convection", correct: true },
      { id: 'b', label: "The trapped air between layers provides insulation like fiberglass" },
      { id: 'c', label: "MLI generates heat to counteract cold space temperatures" },
      { id: 'd', label: "The aluminum coating conducts heat away from the spacecraft" }
    ],
    explanation: "MLI works by placing many low-emissivity reflective barriers in series. Each layer reflects most incoming thermal radiation back toward the source. In vacuum, there is no gas conduction or convection between layers, so the only heat transfer path is radiation — which each layer dramatically reduces."
  },
  {
    scenario: "A spacecraft enters Earth's shadow (eclipse) during each 90-minute orbit. During eclipse, solar panels produce no power, and the external thermal environment drops to ~3K deep space.",
    question: "What is the primary thermal concern during eclipse?",
    options: [
      { id: 'a', label: "Components may get too cold — heaters must activate to prevent freezing of fluids and damage to electronics", correct: true },
      { id: 'b', label: "The spacecraft will overheat because radiators stop working in shadow" },
      { id: 'c', label: "Eclipse has no thermal effect since space is already cold" },
      { id: 'd', label: "Solar panels will crack from thermal shock" }
    ],
    explanation: "During eclipse, the spacecraft loses its solar heat input (1361 W/m² on illuminated surfaces) but continues radiating heat to space. Without compensating heater power, temperatures can drop below the survival limits of batteries (-20°C), propellant lines (must stay above freezing), and electronics (-40°C)."
  },
  {
    scenario: "The ISS uses external ammonia coolant loops operating at 1-4°C. The coolant absorbs heat from internal water loops via heat exchangers, then flows to external radiator panels.",
    question: "Why does the ISS use a two-loop system (internal water + external ammonia) instead of a single loop?",
    options: [
      { id: 'a', label: "If the external ammonia loop leaks, toxic ammonia won't contaminate the crew cabin — water stays inside for safety", correct: true },
      { id: 'b', label: "Water is better at absorbing heat and ammonia is better at radiating it" },
      { id: 'c', label: "The two-loop system is simpler and cheaper to build" },
      { id: 'd', label: "Ammonia freezes inside the station, so water must be used indoors" }
    ],
    explanation: "Ammonia (NH3) is an excellent coolant with a wide liquid range and high heat capacity, but it is toxic to humans. The ISS uses a two-loop architecture so that any leak in the external ammonia loop cannot enter the crew cabin. The internal water loop provides a safe interface between crew and the high-performance external coolant."
  },
  {
    scenario: "A deep space probe carries a radioisotope thermoelectric generator (RTG) that produces 2 kW of electrical power at 6% efficiency. The remaining 94% becomes waste heat.",
    question: "How much heat must the probe's radiators reject?",
    options: [
      { id: 'a', label: "About 31.3 kW — the RTG produces 33.3 kW total thermal power, minus 2 kW converted to electricity", correct: true },
      { id: 'b', label: "2 kW — only the electrical power needs to be radiated" },
      { id: 'c', label: "33.3 kW — all thermal power must be radiated away" },
      { id: 'd', label: "0.12 kW — efficiency times electrical output" }
    ],
    explanation: "At 6% efficiency, 2 kW electrical means total thermal power is 2/0.06 = 33.3 kW. The waste heat is 33.3 - 2 = 31.3 kW that must be radiated to space. RTGs are essentially space heaters that produce a little electricity as a side effect — the thermal design must handle the full waste heat load."
  },
  {
    scenario: "Thermal cycling occurs when a satellite alternates between sunlight and shadow every orbit. Surface temperatures can swing from +150°C in sun to -150°C in shadow over 90 minutes.",
    question: "What structural risk does thermal cycling create?",
    options: [
      { id: 'a', label: "Repeated expansion and contraction causes fatigue stress at joints between materials with different thermal expansion coefficients", correct: true },
      { id: 'b', label: "The satellite gradually gets hotter with each cycle" },
      { id: 'c', label: "Thermal cycling has no structural effect on spacecraft" },
      { id: 'd', label: "The satellite will eventually freeze solid and stop functioning" }
    ],
    explanation: "Thermal cycling induces repeated stress at interfaces between dissimilar materials (e.g., aluminum structure bonded to composite panels). Over thousands of orbits, this fatigue can crack adhesive bonds, loosen fasteners, and degrade solder joints. Spacecraft must be designed for 30,000+ thermal cycles over a 15-year mission."
  },
  {
    scenario: "Future nuclear electric propulsion spacecraft may generate 1 MW of waste heat in deep space, far from any planetary body. The only heat rejection method is radiation.",
    question: "What is the most effective strategy to minimize radiator mass for high-power spacecraft?",
    options: [
      { id: 'a', label: "Operate radiators at the highest temperature the system can tolerate, exploiting the T⁴ relationship to minimize area and mass", correct: true },
      { id: 'b', label: "Use the largest possible radiator panels at low temperature" },
      { id: 'c', label: "Paint the radiators black to maximize absorption of cosmic radiation" },
      { id: 'd', label: "Vent coolant fluid directly into space to carry away heat" }
    ],
    explanation: "Since radiated power scales as T⁴, increasing radiator temperature dramatically reduces the required area and mass. A radiator at 500K rejects 16× more heat per m² than one at 250K. The challenge is that higher radiator temperatures reduce the Carnot efficiency of the power conversion cycle, creating an optimization tradeoff."
  }
];

// -----------------------------------------------------------------------------
// REAL-WORLD APPLICATIONS - 4 transfer applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F6F0}',
    title: 'ISS Thermal Control System',
    short: 'ISS TCS',
    tagline: '1,120 m² of radiator panels rejecting 75 kW to space',
    description: 'The International Space Station uses 14 external radiator panels spanning 1,120 m² total area. An ammonia coolant loop at 1-4°C transports waste heat from crew modules and experiments to these radiators.',
    connection: 'The ISS thermal control system directly applies Stefan-Boltzmann radiation principles. Each radiator panel operates at carefully controlled temperatures to balance heat rejection capacity against ammonia freezing risk during eclipse.',
    howItWorks: 'Internal water loops collect heat from electronics and crew metabolism. Heat exchangers transfer this to external ammonia loops. Ammonia flows through radiator panels where it cools by radiation to space, then returns to collect more heat.',
    stats: [
      { value: '1,120m²', label: 'Radiator Area' },
      { value: '75kW', label: 'Heat Rejection' },
      { value: '14', label: 'Radiator Panels' }
    ],
    examples: ['Ammonia coolant loops', 'Rotary radiator joints', 'Eclipse heater management'],
    companies: ['NASA', 'Boeing', 'Lockheed Martin'],
    futureImpact: 'Future space stations will need even larger thermal systems as power levels increase for manufacturing and research.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F30C}',
    title: 'Mars Rover Curiosity MMRTG',
    short: 'Curiosity Thermal',
    tagline: 'Nuclear waste heat keeps rover alive at -90°C Mars nights',
    description: 'Curiosity rover uses a Multi-Mission RTG that produces 2 kW electrical and ~31 kW waste heat. This waste heat is actively routed through fluid loops to keep electronics warm during frigid Martian nights reaching -90°C.',
    connection: 'Rather than simply radiating all waste heat away, Curiosity turns the RTG thermal challenge into an advantage. Heat pipes and fluid loops distribute nuclear decay heat to warm-electronics boxes, batteries, and instruments — a creative thermal design that extends mission life.',
    howItWorks: 'Plutonium-238 decay produces steady heat. A fraction becomes electricity via thermocouples. The remaining heat flows through heat exchangers into a pumped fluid loop that warms the rover body. Excess heat radiates from the rover surfaces.',
    stats: [
      { value: '~31kW', label: 'Waste Heat' },
      { value: '-90°C', label: 'Mars Night Temp' },
      { value: '14yr+', label: 'Mission Duration' }
    ],
    examples: ['MMRTG waste heat routing', 'Fluid loop warming', 'Mars night survival'],
    companies: ['NASA JPL', 'DOE', 'Teledyne'],
    futureImpact: 'Mars sample return and human missions will require scaled-up nuclear thermal systems for both power and habitat heating.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX Dragon Thermal',
    short: 'Dragon TCS',
    tagline: 'Flash evaporator for launch/reentry, radiators for orbit',
    description: 'SpaceX Dragon uses a dual thermal strategy: flash evaporators that boil water for rapid cooling during the high-heat phases of launch and reentry, and body-mounted radiators for steady-state orbital heat rejection.',
    connection: 'Dragon demonstrates that different mission phases require different thermal solutions. Radiation alone cannot handle the transient peak loads during reentry, so evaporative cooling supplements the radiators during these critical periods.',
    howItWorks: 'During orbit, coolant loops carry heat to radiators on the trunk and capsule body. During reentry, water is sprayed onto hot surfaces where it flash-evaporates, carrying away enormous amounts of heat via latent heat of vaporization (2,260 kJ/kg).',
    stats: [
      { value: '2', label: 'Cooling Modes' },
      { value: '~12kW', label: 'Orbital Heat Load' },
      { value: '2,260kJ/kg', label: 'Water Latent Heat' }
    ],
    examples: ['Flash evaporator system', 'Body-mounted radiators', 'Trunk radiator panels'],
    companies: ['SpaceX', 'NASA', 'Collins Aerospace'],
    futureImpact: 'Starship will need much larger thermal systems for deep space missions with crew of 100+.',
    color: '#F59E0B'
  },
  {
    icon: '\u{2622}',
    title: 'Nuclear Thermal Propulsion',
    short: 'NTP Radiators',
    tagline: 'Rejecting megawatts of waste heat from space reactors',
    description: 'Nuclear electric propulsion systems generate MW-scale waste heat that must be radiated to space. The radiator system often constitutes 30-50% of total spacecraft mass, making it the dominant design driver.',
    connection: 'At MW power levels, the T⁴ relationship becomes critical. Even small increases in allowable radiator temperature dramatically reduce the massive radiator area needed. This creates a fundamental tension between thermodynamic efficiency and radiator mass.',
    howItWorks: 'A nuclear reactor heats a working fluid that drives a turbine or thermoelectric generator. Waste heat from the conversion cycle flows through large deployable radiator panels. Liquid metal coolants (NaK, lithium) enable high-temperature operation for compact radiators.',
    stats: [
      { value: '1MW+', label: 'Waste Heat' },
      { value: '30-50%', label: 'Mass Fraction' },
      { value: '500K+', label: 'Radiator Temp' }
    ],
    examples: ['SNAP reactor radiators', 'Kilopower/KRUSTY', 'Prometheus concept'],
    companies: ['NASA', 'DARPA', 'BWXT', 'Lockheed Martin'],
    futureImpact: 'Mars transit vehicles will likely use nuclear electric propulsion requiring massive deployable radiator arrays.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_SpaceRadiatorRenderer: React.FC<ELON_SpaceRadiatorRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const [animFrame, setAnimFrame] = useState(0);

  // Primary slider: Radiator Temperature (K)
  const [radiatorTemp, setRadiatorTemp] = useState(400);
  // Twist: Eclipse mode
  const [eclipseMode, setEclipseMode] = useState(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Test states
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Transfer states
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [selectedApp, setSelectedApp] = useState(0);

  // Effects
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setAnimFrame(f => f + 1), 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ eventType: 'game_started', gameType: 'space-radiator', gameTitle: 'Space Radiator', details: {}, timestamp: Date.now() });
    }
  }, []);

  // Physics: Stefan-Boltzmann Q = ε * σ * A * T⁴
  const sigma = 5.67e-8;
  const emissivity = 0.85;
  const heatLoad = 100000; // 100 kW waste heat
  const radiatorArea = heatLoad / (emissivity * sigma * Math.pow(radiatorTemp, 4));
  const eclipseHeatBalance = eclipseMode ? heatLoad * 0.7 : heatLoad;
  const eclipseArea = eclipseHeatBalance / (emissivity * sigma * Math.pow(radiatorTemp, 4));
  const effectiveArea = eclipseMode ? eclipseArea : radiatorArea;
  const heatRejected = emissivity * sigma * effectiveArea * Math.pow(radiatorTemp, 4);
  const tempEfficiency = ((radiatorTemp - 250) / 250) * 100;

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    hot: '#EF4444',
    warm: '#F59E0B',
    cool: '#3B82F6',
    cold: '#06B6D4',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'space-radiator',
        gameTitle: 'Space Radiator',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          style={{
            width: phase === p ? '24px' : '8px',
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: '18px 0',
            backgroundClip: 'content-box',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Navigation bar
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // SVG Visualization: Temperature vs Area chart with T^4 curve
  const RadiatorVisualization = ({ showEclipse }: { showEclipse?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 400;

    // Temperature-based color interpolation
    const tempNorm = (radiatorTemp - 250) / 250;
    const tempColor = tempNorm > 0.5 ? colors.hot : tempNorm > 0.25 ? colors.warm : colors.cool;

    // Chart area dimensions
    const chartLeft = 70;
    const chartRight = width - 30;
    const chartTop = 50;
    const chartBottom = height - 60;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    // Temperature range for chart: 250K to 500K
    const tMin = 250;
    const tMax = 500;

    // Compute area at each temperature for the T^4 curve
    const currentHeat = showEclipse ? heatLoad * 0.7 : heatLoad;
    const areaAtTemp = (t: number) => currentHeat / (emissivity * sigma * Math.pow(t, 4));

    // Area range: use log scale for better visualization
    const areaMaxVal = areaAtTemp(tMin);
    const areaMinVal = areaAtTemp(tMax);
    const logMax = Math.log10(areaMaxVal);
    const logMin = Math.log10(areaMinVal);

    // Map temperature to x pixel
    const tempToX = (t: number) => chartLeft + ((t - tMin) / (tMax - tMin)) * chartW;
    // Map area (log scale) to y pixel
    const areaToY = (a: number) => {
      const logA = Math.log10(a);
      return chartTop + ((logMax - logA) / (logMax - logMin)) * chartH;
    };

    // Generate curve points (20 points for smooth appearance)
    const numPoints = 20;
    const curvePointsArr: { x: number; y: number }[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = tMin + (i / numPoints) * (tMax - tMin);
      const a = areaAtTemp(t);
      curvePointsArr.push({ x: tempToX(t), y: areaToY(a) });
    }

    // Build path string
    const curvePath = curvePointsArr.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    // Current operating point
    const opX = tempToX(radiatorTemp);
    const opY = areaToY(areaAtTemp(radiatorTemp));

    // Grid values
    const yGridValues = [10, 50, 100, 500, 1000, 5000].filter(v => v >= areaMinVal * 0.8 && v <= areaMaxVal * 1.2);
    const xGridValues = [300, 350, 400, 450];

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: showEclipse ? '#050510' : '#0a0a1a', borderRadius: '12px' }}>
        <defs>
          <linearGradient id="radiatorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.hot} />
            <stop offset="50%" stopColor={colors.warm} />
            <stop offset="100%" stopColor={colors.cool} />
          </linearGradient>
          <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Chart title */}
        <g>
          <text x={width / 2} y={25} textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="700">
            Temperature vs Radiator Area (T&#x2074; Law)
          </text>
          <text x={width / 2} y={40} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Q = &#x03B5;&#x03C3;AT&#x2074; (Stefan-Boltzmann)
          </text>
        </g>

        {/* Grid lines group */}
        <g>
          {yGridValues.map((val, i) => {
            const y = areaToY(val);
            return (
              <line key={`hgrid-${i}`} x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={colors.border} strokeDasharray="4,4" opacity={0.4} />
            );
          })}
          {xGridValues.map((val, i) => {
            const x = tempToX(val);
            return (
              <line key={`vgrid-${i}`} x1={x} y1={chartTop} x2={x} y2={chartBottom} stroke={colors.border} strokeDasharray="4,4" opacity={0.4} />
            );
          })}
        </g>

        {/* Axes group */}
        <g>
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.textMuted} strokeWidth="1.5" opacity={0.8} />
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={colors.textMuted} strokeWidth="1.5" opacity={0.8} />

          {[tMin, 300, 350, 400, 450, tMax].map((t, i) => {
            const x = tempToX(t);
            return (
              <g key={`xtick-${i}`}>
                <line x1={x} y1={chartBottom} x2={x} y2={chartBottom + 6} stroke={colors.textMuted} strokeWidth="1" opacity={0.8} />
                <text x={x} y={chartBottom + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">{t}K</text>
              </g>
            );
          })}

          {yGridValues.map((val, i) => {
            const y = areaToY(val);
            return (
              <g key={`ytick-${i}`}>
                <line x1={chartLeft - 6} y1={y} x2={chartLeft} y2={y} stroke={colors.textMuted} strokeWidth="1" opacity={0.8} />
                <text x={chartLeft - 10} y={y + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">{val}</text>
              </g>
            );
          })}

          <text x={chartLeft + chartW / 2} y={height - 10} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">
            Temperature (K)
          </text>
          <text x={16} y={chartTop + chartH / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600" transform={`rotate(-90, 16, ${chartTop + chartH / 2})`}>
            Area (m&#x00B2;)
          </text>
        </g>

        {/* Curve group */}
        <g>
          <path d={curvePath} fill="none" stroke="url(#radiatorGrad)" strokeWidth="2.5" />
        </g>

        {/* Operating point marker */}
        <g>
          <circle cx={opX} cy={opY} r={18} fill="url(#pointGlow)" />
          <circle cx={opX} cy={opY} r={8} fill={tempColor} stroke="white" strokeWidth="2" filter="url(#glowFilter)" />
          <text x={opX + 12} y={opY - 10} fill={colors.textPrimary} fontSize="11" fontWeight="600">
            {areaAtTemp(radiatorTemp).toFixed(1)} m&#x00B2;
          </text>
          <text x={opX + 12} y={opY + 4} fill={colors.textMuted} fontSize="11">
            at {radiatorTemp}K
          </text>
        </g>

        {/* Eclipse indicator */}
        {showEclipse && (
          <g>
            <text x={width - 50} y={chartTop + 15} textAnchor="middle" fill={colors.cold} fontSize="11" fontWeight="600">ECLIPSE</text>
          </g>
        )}
      </svg>
    );
  };

  // ===== HOOK PHASE =====
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{'\u2604\uFE0F'}</div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Space Radiator
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
              In the vacuum of space, there is no air for convection. The only way to reject waste heat is through thermal radiation — governed by the Stefan-Boltzmann law where power scales with T⁴. How do spacecraft designers balance radiator temperature, area, and mass to keep systems alive?
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>The Challenge</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                A spacecraft generates 100 kW of waste heat from electronics, life support, and power systems. You must design a radiator system that rejects this heat to the 3K void of space.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Higher radiator temperatures mean smaller, lighter panels (T⁴ helps enormously) — but your electronics can only tolerate so much heat. Find the optimal balance.
              </p>
            </div>
            <RadiatorVisualization />
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button disabled style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, padding: '12px 24px', borderRadius: '10px', cursor: 'not-allowed', minHeight: '44px', opacity: 0.5 }}>
              {'\u2190'} Back
            </button>
            <button onClick={() => { playSound('click'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
              Begin Challenge {'\u2192'}
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== PREDICT PHASE =====
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Make Your Prediction
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              If you increase the radiator operating temperature from 300K to 450K, what happens to the required radiator area for 100 kW heat rejection?
            </p>
            <div style={{ marginBottom: '24px' }}>
              <RadiatorVisualization />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'a', label: 'Area decreases slightly — maybe 20-30% smaller' },
                { id: 'b', label: 'Area decreases dramatically — about 80% smaller due to T⁴' },
                { id: 'c', label: 'Area stays roughly the same — temperature does not matter much' },
                { id: 'd', label: 'Area increases — hotter radiators are less efficient' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => goToPhase('hook')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', minHeight: '44px' }}>
              {'\u2190'} Back
            </button>
            {prediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
                Test Your Prediction {'\u2192'}
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== PLAY PHASE =====
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Adjust Radiator Temperature
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Slide to change the radiator operating temperature and observe how the required area changes with T⁴. Notice how even small temperature increases dramatically reduce radiator size. Watch the operating point move along the curve as you adjust — this relationship is critical for real-world spacecraft design like the ISS with its 1,120 m² of radiators.
            </p>
            <RadiatorVisualization />
            <div style={{ marginTop: '24px', background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Radiator Temperature</span>
                <span style={{ ...typo.h3, color: colors.accent }}>{radiatorTemp}K ({(radiatorTemp - 273).toFixed(0)}°C)</span>
              </div>
              <input
                type="range"
                min={250}
                max={500}
                value={radiatorTemp}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRadiatorTemp(v);
                  if (onGameEvent) {
                    onGameEvent({ eventType: 'slider_changed', gameType: 'space-radiator', gameTitle: 'Space Radiator', details: { radiatorTemp: v }, timestamp: Date.now() });
                  }
                }}
                onInput={(e) => {
                  const v = Number((e.target as HTMLInputElement).value);
                  setRadiatorTemp(v);
                }}
                style={sliderStyle(colors.accent, radiatorTemp, 250, 500)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>250K (cold, huge area)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>500K (hot, compact)</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.hot }}>{effectiveArea.toFixed(1)} m²</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Radiator Area</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.warm }}>{(heatRejected / 1000).toFixed(0)} kW</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Heat Rejected</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.cool }}>{(effectiveArea * 2.5).toFixed(0)} kg</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Est. Mass (2.5 kg/m²)</div>
              </div>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => goToPhase('predict')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', minHeight: '44px' }}>
              {'\u2190'} Back
            </button>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
              Review Results {'\u2192'}
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== REVIEW PHASE =====
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Understanding Radiator Physics
            </h2>
            <div style={{ background: `${colors.accent}15`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '4px' }}>Revisiting Your Prediction:</p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {prediction === 'b' ? 'Correct! Your prediction was right — the area decreases dramatically (~80%) due to the T⁴ relationship.' : 'As you saw, the T⁴ relationship is more powerful than most people initially predict — area decreases by about 80% when temperature increases from 300K to 450K.'}
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '16px', borderLeft: `4px solid ${colors.accent}` }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>The T⁴ Power Law</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                The Stefan-Boltzmann law (Q = εσAT⁴) means radiated power increases with the fourth power of temperature. Doubling temperature from 250K to 500K increases heat rejection per square meter by 2⁴ = 16 times.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                This is why spacecraft designers push for the highest radiator temperature their systems can tolerate. A small temperature increase yields a dramatic reduction in radiator area and mass.
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '16px', borderLeft: `4px solid ${colors.success}` }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Mass Budget Impact</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Radiator panels typically mass 2-5 kg/m². For a large spacecraft with MW-scale heat rejection, radiators can be 30-50% of total vehicle mass. The T⁴ law makes radiator temperature the single most impactful design variable for high-power spacecraft.
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>The Temperature Tradeoff</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Higher radiator temperatures mean smaller radiators, but they also reduce the temperature difference available for power conversion (Carnot efficiency). There is an optimal radiator temperature that minimizes total system mass by balancing these two competing effects.
              </p>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => goToPhase('play')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', minHeight: '44px' }}>
              {'\u2190'} Back
            </button>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
              Explore the Twist {'\u2192'}
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== TWIST PREDICT PHASE =====
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              New Variable: Eclipse Entry
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Your spacecraft enters Earth's shadow every orbit (~35 minutes of darkness per 90-minute orbit). Solar panels go dark, internal power generation drops 30%, but radiators still emit heat to space. What happens?
            </p>
            <div style={{ marginBottom: '24px' }}>
              <RadiatorVisualization showEclipse={true} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'a', label: 'Spacecraft warms up because radiators stop working in shadow' },
                { id: 'b', label: 'Spacecraft cools rapidly — reduced heat generation but radiators keep radiating' },
                { id: 'c', label: 'Nothing changes — eclipse has no thermal effect' },
                { id: 'd', label: 'Spacecraft temperature oscillates chaotically' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => goToPhase('review')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', minHeight: '44px' }}>
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
                Test Prediction {'\u2192'}
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== TWIST PLAY PHASE =====
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Eclipse Thermal Challenge
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Toggle eclipse mode to see how shadow entry changes the thermal balance.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <button
                onClick={() => setEclipseMode(!eclipseMode)}
                style={{
                  background: eclipseMode ? colors.cold : colors.warm,
                  color: 'white',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '16px',
                  minHeight: '44px',
                }}
              >
                {eclipseMode ? '\u{1F311} Eclipse Mode ON' : '\u{2600}\uFE0F Sunlight Mode'}
              </button>
            </div>
            <RadiatorVisualization showEclipse={eclipseMode} />
            <div style={{ marginTop: '24px', background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Radiator Temperature</span>
                <span style={{ ...typo.h3, color: colors.accent }}>{radiatorTemp}K</span>
              </div>
              <input
                type="range"
                min={250}
                max={500}
                value={radiatorTemp}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRadiatorTemp(v);
                  if (onGameEvent) {
                    onGameEvent({ eventType: 'slider_changed', gameType: 'space-radiator', gameTitle: 'Space Radiator', details: { radiatorTemp: v, eclipse: eclipseMode }, timestamp: Date.now() });
                  }
                }}
                onInput={(e) => {
                  const v = Number((e.target as HTMLInputElement).value);
                  setRadiatorTemp(v);
                }}
                style={sliderStyle(eclipseMode ? colors.cold : colors.accent, radiatorTemp, 250, 500)}
              />
            </div>
            {eclipseMode && (
              <div style={{ background: `${colors.cold}15`, borderRadius: '12px', padding: '16px', marginTop: '16px', border: `1px solid ${colors.cold}` }}>
                <p style={{ ...typo.body, color: colors.cold, fontWeight: 600, marginBottom: '8px' }}>Eclipse Impact:</p>
                <p style={{ ...typo.small, color: colors.textSecondary }}>
                  Heat generation drops to 70 kW (30% reduction from solar panel shutdown). Radiators continue rejecting heat at the same rate, causing net cooling. Heaters must activate to prevent critical components from freezing below -40°C.
                </p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: eclipseMode ? colors.cold : colors.hot }}>{effectiveArea.toFixed(1)} m²</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Radiator Area</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{eclipseMode ? '70' : '100'} kW</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Heat Generated</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: eclipseMode ? colors.error : colors.success }}>{eclipseMode ? 'COOLING' : 'BALANCED'}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Thermal State</div>
              </div>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => goToPhase('twist_predict')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', minHeight: '44px' }}>
              {'\u2190'} Back
            </button>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
              Review Insight {'\u2192'}
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== TWIST REVIEW PHASE =====
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Eclipse Thermal Management
            </h2>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '16px', borderLeft: `4px solid ${colors.cold}` }}>
              <h3 style={{ ...typo.h3, color: colors.cold, marginBottom: '12px' }}>The Eclipse Challenge</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                During eclipse, the spacecraft loses solar power but radiators keep radiating. Internal heat generation drops ~30%, but the radiator system was sized for full heat load. This creates a net energy deficit — the spacecraft cools.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Critical components like batteries, propellant lines, and optics can be damaged by cold. Electric heaters must activate during eclipse to maintain minimum temperatures, consuming precious battery power.
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '16px', borderLeft: `4px solid ${colors.warning}` }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>Design Solutions</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Engineers use louvers (mechanical shutters) on radiators to reduce heat rejection during eclipse, MLI blankets to insulate cold-sensitive components, and thermal mass (phase-change materials) to buffer temperature swings. The thermal control system must handle both the hot case (full sun) and cold case (deep eclipse).
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', borderLeft: `4px solid ${colors.accent}` }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Thermal Cycling Fatigue</h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                LEO satellites experience ~5,800 eclipse cycles per year. The repeated thermal expansion and contraction causes fatigue in structural joints, solder connections, and adhesive bonds. Materials must be tested for 30,000+ thermal cycles for a 15-year mission.
              </p>
            </div>
          </div>
        </div>
        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => goToPhase('twist_play')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', minHeight: '44px' }}>
              {'\u2190'} Back
            </button>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, minHeight: '44px' }}>
              Real-World Applications {'\u2192'}
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== TRANSFER PHASE =====
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== TEST PHASE =====
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderProgressBar()}
          <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand spacecraft thermal control and radiator physics!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Space Radiator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of spacecraft thermal control, radiator physics, Stefan-Boltzmann radiation, and eclipse thermal management to real-world space engineering scenarios. Consider the relationship between temperature, area, emissivity, and heat rejection as you work through each problem.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // ===== MASTERY PHASE =====
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Space Radiator Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how spacecraft reject waste heat through thermal radiation, why the T⁴ law makes radiator temperature so critical, and how eclipse cycles create thermal management challenges in orbit.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Stefan-Boltzmann law: Q = εσAT⁴ governs space heat rejection',
                'Doubling radiator temperature reduces required area by 16×',
                'Heat pipes use capillary action for passive thermal transport',
                'Eclipse entry causes net cooling requiring heater activation',
                'Radiator mass dominates high-power spacecraft design budgets',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Play Again
            </button>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_SpaceRadiatorRenderer;
