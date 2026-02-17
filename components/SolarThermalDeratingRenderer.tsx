'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Solar Thermal Derating - Complete 10-Phase Game
// Why hot panels make less power: temperature coefficient and efficiency loss
// ─────────────────────────────────────────────────────────────────────────────

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

interface SolarThermalDeratingRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A solar installer in Phoenix, Arizona notices their panels produce 15% less power in July than in March, despite July having more intense sunlight.",
    question: "What's the primary cause of this summer power reduction?",
    options: [
      { id: 'a', label: "Summer sunlight contains less energy per photon" },
      { id: 'b', label: "High panel temperatures reduce voltage and efficiency", correct: true },
      { id: 'c', label: "Dust accumulation is worse in summer" },
      { id: 'd', label: "The sun is too high in the sky for optimal angle" }
    ],
    explanation: "Solar panel efficiency drops with temperature, typically 0.3-0.5% per degree Celsius above 25°C (STC). In Phoenix summer, panel temperatures can reach 65-75°C, causing 15-25% power loss despite intense sunlight. Voltage drops significantly while current only increases slightly."
  },
  {
    scenario: "Two identical solar installations are compared: one with panels mounted flat on a dark roof, another with panels on raised racks with airflow underneath.",
    question: "Why does the raised installation produce 8-12% more energy annually?",
    options: [
      { id: 'a', label: "The raised panels catch more sunlight" },
      { id: 'b', label: "Air circulation keeps panels cooler, reducing thermal derating", correct: true },
      { id: 'c', label: "The roof absorbs radiation that would otherwise reach the panels" },
      { id: 'd', label: "Raised panels have better viewing angle to the sun" }
    ],
    explanation: "Airflow underneath raised panels removes heat through convection, keeping panels 10-15°C cooler than flush-mounted installations. This temperature difference translates to 5-8% higher instantaneous power during hot periods, compounding to significant annual gains."
  },
  {
    scenario: "A solar panel's data sheet shows: Pmax = 400W at STC (25°C), Temperature Coefficient of Pmax = -0.35%/°C.",
    question: "What power output would you expect when the panel is operating at 60°C?",
    options: [
      { id: 'a', label: "About 350W (12.25% less than rated)", correct: true },
      { id: 'b', label: "About 400W (temperature doesn't affect max power)" },
      { id: 'c', label: "About 260W (35% less power)" },
      { id: 'd', label: "About 420W (higher temperature means more energy)" }
    ],
    explanation: "Temperature rise = 60°C - 25°C = 35°C. Power loss = 35°C × 0.35%/°C = 12.25%. Power at 60°C = 400W × (1 - 0.1225) = 351W. The -0.35%/°C coefficient means you lose 0.35% of rated power for every degree above 25°C."
  },
  {
    scenario: "An engineer compares monocrystalline silicon panels (temp coefficient -0.35%/°C) with thin-film CdTe panels (temp coefficient -0.25%/°C) for a desert installation.",
    question: "Which panels perform better in the hot desert climate, and why?",
    options: [
      { id: 'a', label: "Monocrystalline, because they have higher base efficiency" },
      { id: 'b', label: "Thin-film CdTe, because they lose less power per degree of temperature rise", correct: true },
      { id: 'c', label: "Both perform equally because heat affects all semiconductors the same way" },
      { id: 'd', label: "Monocrystalline, because desert sun is too intense for thin-film" }
    ],
    explanation: "While monocrystalline has higher STC efficiency, thin-film's lower temperature coefficient (-0.25% vs -0.35%/°C) means it loses 29% less power per degree above 25°C. In hot climates where panels routinely hit 60-70°C, this can make thin-film more productive despite lower rated efficiency."
  },
  {
    scenario: "A homeowner notices their solar panels produce the most power on a cool, clear spring day rather than the hottest summer day.",
    question: "What combination of factors makes spring days optimal?",
    options: [
      { id: 'a', label: "High irradiance + low panel temperature maximizes voltage and efficiency", correct: true },
      { id: 'b', label: "Spring sunlight has special wavelengths that are more efficient" },
      { id: 'c', label: "The atmosphere is cleaner in spring, letting more light through" },
      { id: 'd', label: "Solar panels are designed to work best in spring conditions" }
    ],
    explanation: "Spring combines good irradiance (clear skies, reasonable sun angle) with cool ambient temperatures. Panels stay closer to their rated 25°C, maintaining high voltage. Summer's higher irradiance is offset by panels running 20-40°C hotter, losing 8-16% efficiency."
  },
  {
    scenario: "A solar farm operator monitors NOCT (Nominal Operating Cell Temperature) which is rated at 45°C for their panels. On a 35°C ambient day with full sun, panels measure 62°C.",
    question: "Why are the panels 27°C hotter than ambient?",
    options: [
      { id: 'a', label: "The panels must be defective to get that hot" },
      { id: 'b', label: "Panels absorb more solar energy than they convert, with excess becoming heat", correct: true },
      { id: 'c', label: "The measurement equipment is giving false readings" },
      { id: 'd', label: "Electrical resistance in the wiring generates the extra heat" }
    ],
    explanation: "Solar panels are only 15-22% efficient—the rest of absorbed solar energy (78-85%) becomes heat. With 1000 W/m² irradiance, a panel absorbs ~900W of which only ~200W becomes electricity. The remaining 700W heats the panel 20-35°C above ambient, depending on cooling conditions."
  },
  {
    scenario: "A data center rooftop solar installation shows a characteristic 'afternoon dip' where power drops disproportionately from 1-4 PM despite good sun.",
    question: "What causes this afternoon power dip?",
    options: [
      { id: 'a', label: "The building's HVAC system interferes with the panels" },
      { id: 'b', label: "Cumulative heating throughout the day raises panel temperature to its peak", correct: true },
      { id: 'c', label: "Afternoon electricity demand somehow reduces panel output" },
      { id: 'd', label: "The sun's afternoon spectrum is less suitable for solar conversion" }
    ],
    explanation: "Panels heat up throughout the day, reaching peak temperature in early-to-mid afternoon. While morning panels might be at 35°C, afternoon panels can hit 65-70°C. This 30-35°C difference causes 10-15% power reduction, creating the characteristic afternoon dip."
  },
  {
    scenario: "A solar installer offers 'cool roof' white backing material for $500 extra, claiming it will improve panel output by reducing operating temperature by 5-8°C.",
    question: "Is this a worthwhile investment for a 10kW system in a hot climate?",
    options: [
      { id: 'a', label: "Yes, because 5-8°C cooler means 2-3% more annual energy production", correct: true },
      { id: 'b', label: "No, because the cooling effect is negligible" },
      { id: 'c', label: "No, because white backing reflects sunlight away from the panels" },
      { id: 'd', label: "Yes, but only if you also add a fan for active cooling" }
    ],
    explanation: "5-8°C reduction × 0.4%/°C coefficient = 2-3.2% more power. For a 10kW system producing 15,000 kWh/year at $0.15/kWh, that's $45-72/year in extra production. The $500 investment pays back in 7-11 years, making it worthwhile for a 25-year panel lifetime."
  },
  {
    scenario: "Bifacial solar panels are gaining popularity. They can capture light reflected from the ground (albedo) on their rear side.",
    question: "How does thermal derating affect bifacial panels compared to traditional panels?",
    options: [
      { id: 'a', label: "Bifacial panels run cooler because rear absorption reduces front heating" },
      { id: 'b', label: "Bifacial panels may run slightly hotter due to rear absorption, but gain more from albedo than they lose to heat", correct: true },
      { id: 'c', label: "Temperature effects are identical for both panel types" },
      { id: 'd', label: "Bifacial panels are immune to temperature derating" }
    ],
    explanation: "Bifacial panels absorb light on both sides, potentially running 2-5°C hotter. However, the 5-30% extra energy from rear-side capture far exceeds the 1-2% thermal penalty. Net gain is significant, especially over highly reflective surfaces like white roofs or snow."
  },
  {
    scenario: "An off-grid cabin's solar system underperforms in winter despite clear skies and snow reflection boosting light levels.",
    question: "Given that cold temperatures should help, what might cause winter underperformance?",
    options: [
      { id: 'a', label: "Snow covering the panels blocks light, negating temperature benefits", correct: true },
      { id: 'b', label: "Cold makes solar cells completely stop working" },
      { id: 'c', label: "Winter sunlight lacks the energy needed for photovoltaic conversion" },
      { id: 'd', label: "The temperature coefficient reverses in cold weather" }
    ],
    explanation: "While cold temperatures actually boost panel efficiency (panels can exceed their rating in cold, bright conditions), snow accumulation on panel surfaces blocks light entirely. Even partial snow coverage severely reduces output. The thermal advantage of cold is lost if panels can't receive sunlight."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏜️',
    title: 'Desert Solar Farms',
    short: 'Hot climate power optimization',
    tagline: 'Maximum sun, thermal challenges',
    description: 'Large-scale desert installations face extreme thermal derating. Despite abundant sunlight, panel temperatures routinely exceed 70°C, causing 15-20% power loss. Advanced cooling strategies are essential for profitability. Desert engineers must account for thermal derating in every energy yield model and financial projection. The temperature coefficient of -0.4%/°C becomes a critical parameter when panels spend hours at 65-75°C.',
    connection: 'Understanding thermal derating helps engineers choose optimal panel types, mounting configurations, and cooling systems for hot climates where the best sun comes with the worst thermal conditions. Every degree matters when scaling to hundreds of megawatts.',
    howItWorks: 'Desert installations use elevated mounting for airflow, select panels with low temperature coefficients (thin-film, HJT), and schedule intensive maintenance during cooler morning hours when panels perform best.',
    stats: [
      { value: '70°C', label: 'Peak panel temp', icon: '🌡️' },
      { value: '-18%', label: 'Typical derating', icon: '📉' },
      { value: '$2M', label: 'Annual loss per 100MW', icon: '💰' }
    ],
    examples: ['Noor-Ouarzazate Morocco', 'Benban Egypt', 'Mohammed bin Rashid Dubai', 'Atacama Chile'],
    companies: ['First Solar', 'ACWA Power', 'Masdar', 'BrightSource'],
    futureImpact: 'Active cooling systems using waste heat for water desalination may turn thermal losses into secondary revenue streams.',
    color: '#F59E0B'
  },
  {
    icon: '🏢',
    title: 'Rooftop Commercial Solar',
    short: 'Building-integrated thermal management',
    tagline: 'Urban heat island challenges',
    description: 'Commercial rooftop installations face unique thermal challenges: dark roofing materials, limited airflow, and urban heat island effects can push panel temperatures even higher than open-field installations. The interaction between building heat mass and panel temperature creates complex thermal environments that reduce annual energy yield significantly.',
    connection: 'Thermal derating knowledge guides decisions on mounting height, roof color, ventilation gaps, and panel selection for building-integrated solar that must coexist with roofing materials. A 6-inch mounting gap can recover 5-8% annual energy at near-zero cost.',
    howItWorks: 'Best practices include: minimum 6-inch mounting clearance for airflow, white or cool-colored roofing underneath, strategic placement away from HVAC exhaust, and east-west orientation to avoid peak afternoon heat.',
    stats: [
      { value: '6in', label: 'Min mounting gap', icon: '📏' },
      { value: '10-15°C', label: 'Cooler vs flush mount', icon: '❄️' },
      { value: '8-12%', label: 'Annual energy gain', icon: '⚡' }
    ],
    examples: ['Apple Park Cupertino', 'IKEA warehouses', 'Walmart rooftops', 'Amazon fulfillment centers'],
    companies: ['SunPower', 'Sunrun', 'Sunnova', 'Tesla'],
    futureImpact: 'Building-integrated photovoltaics (BIPV) will include active thermal management, using panel heat for building hot water.',
    color: '#3B82F6'
  },
  {
    icon: '🛰️',
    title: 'Space Solar Arrays',
    short: 'Extreme thermal cycling in orbit',
    tagline: 'From -150°C to +120°C every 90 minutes',
    description: 'Spacecraft solar arrays experience the most extreme thermal environments: freezing in Earth\'s shadow, then rapid heating in direct sunlight. This thermal cycling affects both performance and long-term reliability. Understanding the temperature coefficient is critical for mission power budgeting and for designing arrays that survive thousands of thermal cycles over their operational lifetime.',
    connection: 'Space applications demonstrate thermal effects at both extremes: arrays produce MORE power in cold shadow-exit conditions, but thermal stress from repeated cycling causes mechanical degradation that must be engineered around.',
    howItWorks: 'Space-grade cells use multi-junction designs with different temperature coefficients. Thermal control uses specialized coatings, radiators, and sometimes active heating during eclipse to prevent extreme cold damage.',
    stats: [
      { value: '270°C', label: 'Thermal swing range', icon: '🌡️' },
      { value: '+15%', label: 'Cold boost at eclipse exit', icon: '📈' },
      { value: '15yrs', label: 'Design lifetime', icon: '⏱️' }
    ],
    examples: ['ISS Solar Arrays', 'Mars rovers', 'Hubble Space Telescope', 'Starlink satellites'],
    companies: ['Boeing', 'Lockheed Martin', 'SpaceX', 'Northrop Grumman'],
    futureImpact: 'Lunar installations will face 14-day thermal cycles with extreme temperatures, requiring revolutionary thermal management.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Vehicle-Integrated Solar',
    short: 'Mobile thermal challenges',
    tagline: 'Parked cars as solar ovens',
    description: 'Solar panels integrated into vehicles face severe thermal derating when parked in sun. Interior car temperatures can exceed 60°C, and roof-mounted panels can reach 80°C+, drastically reducing the already limited solar harvesting potential. Vehicle solar must account for worst-case thermal conditions in every scenario from desert parking lots to highway driving.',
    connection: 'Vehicle solar must account for worst-case thermal conditions: parked in full sun on hot pavement. Effective designs use ventilation, reflective surfaces, and parking guidance to maximize real-world harvest. The temperature coefficient determines whether vehicle solar is practical.',
    howItWorks: 'Solar EVs use thermally-optimized cells, ventilated mounting, and smart systems that continue charging even when parked. Some vehicles use harvested solar primarily for cabin cooling, reducing the thermal load.',
    stats: [
      { value: '80°C+', label: 'Panel temp when parked', icon: '🔥' },
      { value: '-25%', label: 'Hot parking derating', icon: '📉' },
      { value: '1-2kW', label: 'Typical roof capacity', icon: '⚡' }
    ],
    examples: ['Lightyear 0', 'Sono Sion', 'Hyundai Ioniq 5/6', 'Toyota Prius Solar'],
    companies: ['Lightyear', 'Sono Motors', 'Hyundai', 'Toyota'],
    futureImpact: 'Phase-change materials and active cooling may enable vehicle solar to maintain efficiency even in extreme parking conditions.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SolarThermalDeratingRenderer: React.FC<SolarThermalDeratingRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [temperature, setTemperature] = useState(25); // °C - panel temperature
  const [irradiance, setIrradiance] = useState(1000); // W/m²
  const [airflow, setAirflow] = useState(0); // 0-100% fan speed
  const [ambientTemp, setAmbientTemp] = useState(25); // Ambient temperature

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444',
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
    solar: '#F59E0B',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'explore',
    predict: 'predict',
    play: 'experiment',
    review: 'review',
    twist_predict: 'twist_predict',
    twist_play: 'twist_experiment',
    twist_review: 'twist_review',
    transfer: 'transfer',
    test: 'test',
    mastery: 'mastery',
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Temperature coefficient (typical silicon panel)
  const tempCoefficient = -0.4; // %/°C for power
  const tempCoefficientVoltage = -0.3; // %/°C for voltage
  const stcTemp = 25; // Standard Test Conditions temperature

  // Calculate power based on temperature
  const calculatePower = useCallback((temp: number, irr: number) => {
    const basePower = 400; // Rated power at STC
    const irradianceFactor = irr / 1000;
    const tempDelta = temp - stcTemp;
    const tempFactor = 1 + (tempCoefficient / 100) * tempDelta;
    return basePower * irradianceFactor * Math.max(0.5, tempFactor);
  }, []);

  // Calculate panel temperature based on ambient and irradiance (with cooling)
  const calculatePanelTemp = useCallback((ambient: number, irr: number, cooling: number) => {
    const noctRise = 20;
    const baseRise = (irr / 800) * noctRise;
    const coolingEffect = cooling * 0.15;
    return ambient + Math.max(0, baseRise - coolingEffect);
  }, []);

  const currentPower = calculatePower(temperature, irradiance);
  const ratedPower = 400;
  const deratingPercent = Math.max(0, (temperature - stcTemp) * Math.abs(tempCoefficient));

  // Slider style helper
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '10px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    appearance: 'none',
  };

  // Progress bar component
  const renderProgressBar = () => (
    <nav style={{
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </nav>
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
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 999,
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIndex === 0}
          aria-label="Back"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex === 0 ? colors.textMuted : colors.textSecondary,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          ← Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '13px' }}>
          {currentIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={nextPhase}
          disabled={currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)}
          aria-label="Next"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: (currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)) ? colors.border : colors.accent,
            color: 'white',
            cursor: (currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)) ? 'not-allowed' : 'pointer',
            opacity: (phase === 'test' && !testSubmitted) ? 0.4 : 1,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
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

  // I-V Curve Visualization
  const ThermalIVVisualization = ({ showComparison = false, temp = temperature, irr = irradiance }: { showComparison?: boolean; temp?: number; irr?: number }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 260 : 320;
    const padding = { top: 40, right: 40, bottom: 60, left: 65 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate curve points
    const generateCurve = (t: number) => {
      const points: { x: number; y: number; v: number; i: number }[] = [];
      const Voc = 48 * (1 + (tempCoefficientVoltage / 100) * (t - stcTemp));
      const Isc = 10 * (irr / 1000);

      for (let v = 0; v <= Voc; v += 0.5) {
        const i = Isc * (1 - Math.exp((v - Voc) / 3));
        const x = padding.left + (v / 50) * plotWidth;
        const y = padding.top + plotHeight - (Math.max(0, i) / 12) * plotHeight;
        points.push({ x, y, v, i: Math.max(0, i) });
      }
      return points;
    };

    const currentCurve = generateCurve(temp);
    const stcCurve = showComparison ? generateCurve(25) : [];

    const pathFromPoints = (points: { x: number; y: number }[]) =>
      points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');

    // Find MPP
    let maxPower = 0;
    let mppPoint = currentCurve[0] || { x: 0, y: 0, v: 0, i: 0 };
    currentCurve.forEach(pt => {
      const power = pt.v * pt.i;
      if (power > maxPower) {
        maxPower = power;
        mppPoint = pt;
      }
    });

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', overflow: 'visible' }}>
        <defs>
          <linearGradient id="hotGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.cold} />
            <stop offset="50%" stopColor={colors.solar} />
            <stop offset="100%" stopColor={colors.hot} />
          </linearGradient>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={temp > 40 ? colors.hot : colors.solar} stopOpacity="1" />
            <stop offset="100%" stopColor={temp > 40 ? '#DC2626' : '#D97706'} stopOpacity="0.8" />
          </linearGradient>
          <filter id="glowEffect">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="mppGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <g key={`grid-${frac}`}>
            <line
              x1={padding.left}
              y1={padding.top + frac * plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + frac * plotHeight}
              stroke={colors.border}
              strokeDasharray="4 4"
              opacity="0.3"
            />
            <line
              x1={padding.left + frac * plotWidth}
              y1={padding.top}
              x2={padding.left + frac * plotWidth}
              y2={padding.top + plotHeight}
              stroke={colors.border}
              strokeDasharray="4 4"
              opacity="0.3"
            />
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Axis tick labels */}
        {[0, 10, 20, 30, 40, 50].map(v => (
          <text key={`xt-${v}`} x={padding.left + (v / 50) * plotWidth} y={padding.top + plotHeight + 16}
            fill={colors.textMuted} fontSize="11" textAnchor="middle">{v}</text>
        ))}
        {[0, 3, 6, 9, 12].map(i => (
          <text key={`yt-${i}`} x={padding.left - 8} y={padding.top + plotHeight - (i / 12) * plotHeight + 4}
            fill={colors.textMuted} fontSize="11" textAnchor="end">{i}</text>
        ))}

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 12} fill={colors.textSecondary} fontSize="13" textAnchor="middle">Voltage (V)</text>
        <text x={6} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="13" textAnchor="middle" transform={`rotate(-90, 6, ${padding.top + plotHeight / 2})`}>Current (A)</text>

        {/* STC comparison curve */}
        {showComparison && stcCurve.length > 0 && (
          <path d={pathFromPoints(stcCurve)} fill="none" stroke={colors.cold} strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />
        )}

        {/* Current curve with gradient */}
        <path d={pathFromPoints(currentCurve)} fill="none" stroke="url(#curveGradient)" strokeWidth="3" filter="url(#glowEffect)" />

        {/* MPP marker */}
        <circle cx={mppPoint.x} cy={mppPoint.y} r="9" fill={colors.success} stroke="white" strokeWidth="2" filter="url(#mppGlow)" />
        <text x={mppPoint.x + 14} y={mppPoint.y - 10} fill={colors.success} fontSize="12" fontWeight="600">
          {(mppPoint.v * mppPoint.i).toFixed(0)}W
        </text>

        {/* Temperature label */}
        <text x={width - padding.right - 5} y={padding.top + 16} fill={temp > 50 ? colors.hot : colors.textSecondary} fontSize="12" textAnchor="end" fontWeight="600">
          {temp}°C
        </text>

        {/* Formula near graphic */}
        <text x={padding.left + 10} y={padding.top + 16} fill={colors.textMuted} fontSize="11" fontFamily="monospace">
          P = P₀ × (1 + γ×ΔT)
        </text>

        {/* STC legend if showing comparison */}
        {showComparison && (
          <g>
            <rect x={padding.left + plotWidth - 80} y={padding.top + 52} width="10" height="3" fill={colors.cold} opacity="0.6" />
            <text x={padding.left + plotWidth - 66} y={padding.top + 56} fill={colors.textMuted} fontSize="11">25°C STC</text>
          </g>
        )}
      </svg>
    );
  };

  // Cooling Lab Visualization (for twist_play)
  const CoolingVisualization = ({ panelTemp, airflowPct }: { panelTemp: number; airflowPct: number }) => {
    const width = isMobile ? 320 : 440;
    const height = 220;

    // Panel color based on temperature
    const tempRatio = Math.min(1, Math.max(0, (panelTemp - 20) / 60));
    const r = Math.round(59 + tempRatio * (239 - 59));
    const g = Math.round(130 - tempRatio * 130);
    const b = Math.round(246 - tempRatio * (246 - 68));
    const panelColor = `rgb(${r},${g},${b})`;

    // Air flow particles
    const particles = Array.from({ length: 6 }, (_, i) => ({
      x: 20 + i * (width - 40) / 5,
      opacity: airflowPct > 0 ? 0.4 + (airflowPct / 100) * 0.6 : 0.1,
    }));

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={panelColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={panelColor} stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.7" />
          </linearGradient>
          <filter id="panelGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sun rays */}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={`ray-${i}`}
            x1={width * 0.15 + i * (width * 0.7 / 4)} y1={15}
            x2={width * 0.15 + i * (width * 0.7 / 4)} y2={60}
            stroke="url(#sunGrad)" strokeWidth="3" opacity="0.7" />
        ))}

        {/* Solar panel */}
        <rect x={width * 0.1} y={60} width={width * 0.8} height={70} rx="6"
          fill="url(#panelGrad)" stroke={panelColor} strokeWidth="2" filter="url(#panelGlow)" />

        {/* Panel grid cells */}
        {[1, 2, 3, 4].map(i => (
          <line key={`cell-v-${i}`}
            x1={width * 0.1 + i * (width * 0.8 / 5)} y1={60}
            x2={width * 0.1 + i * (width * 0.8 / 5)} y2={130}
            stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
        ))}
        {[1, 2].map(i => (
          <line key={`cell-h-${i}`}
            x1={width * 0.1} y1={60 + i * (70 / 3)}
            x2={width * 0.1 + width * 0.8} y2={60 + i * (70 / 3)}
            stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
        ))}

        {/* Airflow arrows */}
        {particles.map((p, i) => (
          <g key={`arrow-${i}`} opacity={p.opacity}>
            <line x1={p.x} y1={155} x2={p.x} y2={175}
              stroke={colors.cold} strokeWidth="2" />
            <polygon points={`${p.x - 5},155 ${p.x + 5},155 ${p.x},145`}
              fill={colors.cold} />
          </g>
        ))}

        {/* Temperature display */}
        <text x={width / 2} y={105} fill="white" fontSize="18" fontWeight="700" textAnchor="middle"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          {panelTemp.toFixed(0)}°C
        </text>

        {/* Labels */}
        <text x={width / 2} y={155} fill={colors.textMuted} fontSize="12" textAnchor="middle">Panel Temperature</text>
        <text x={width / 2} y={198} fill={airflowPct > 0 ? colors.cold : colors.textMuted} fontSize="12" textAnchor="middle">
          {airflowPct > 0 ? `Cooling: ${airflowPct}% airflow` : 'No cooling (natural convection only)'}
        </text>

        {/* Formula */}
        <text x={12} y={215} fill={colors.textMuted} fontSize="11" fontFamily="monospace">
          T_panel = T_amb + (G/800)×NOCT_rise − cooling
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔥☀️</div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Solar Thermal Derating
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Does a hotter panel make more power because it's 'energized'? The surprising answer explains why
            <span style={{ color: colors.accent }}> Phoenix summer panels</span> underperform despite blazing sun."
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Every 10°C rise in panel temperature costs you about 4% of your power. On a hot day, that's like losing one panel out of every four."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Solar Installation Best Practices
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore the Science →
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Power increases—heat gives the electrons more energy to flow' },
      { id: 'b', text: 'Power stays the same—the panel is rated for hot conditions' },
      { id: 'c', text: 'Power decreases—heat reduces voltage more than it helps current' },
    ];

    const PredictVisualization = () => (
      <svg width="340" height="200" viewBox="0 0 340 200" style={{ background: colors.bgSecondary, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="coolPanelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.cold} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="hotPanelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.hot} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0.6" />
          </linearGradient>
          <filter id="predGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Cool panel (left) */}
        <rect x="25" y="45" width="90" height="70" fill="url(#coolPanelGrad)" rx="6" filter="url(#predGlow)" />
        <line x1="50" y1="45" x2="50" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="75" y1="45" x2="75" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="100" y1="45" x2="100" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="25" y1="75" x2="115" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x="70" y="135" fill={colors.textMuted} fontSize="12" textAnchor="middle">25°C</text>
        <text x="70" y="154" fill={colors.success} fontSize="15" fontWeight="bold" textAnchor="middle">400W</text>

        {/* Arrow */}
        <line x1="130" y1="80" x2="192" y2="80" stroke={colors.textMuted} strokeWidth="2" />
        <polygon points="192,74 204,80 192,86" fill={colors.textMuted} />
        <text x="165" y="64" fill={colors.warning} fontSize="13" textAnchor="middle">+40°C</text>

        {/* Hot panel (right) */}
        <rect x="220" y="45" width="90" height="70" fill="url(#hotPanelGrad)" rx="6" filter="url(#predGlow)" />
        <line x1="245" y1="45" x2="245" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="270" y1="45" x2="270" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="295" y1="45" x2="295" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="220" y1="75" x2="310" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x="265" y="135" fill={colors.textMuted} fontSize="12" textAnchor="middle">65°C</text>
        <text x="265" y="154" fill={colors.textMuted} fontSize="15" fontWeight="bold" textAnchor="middle">???W</text>

        {/* Title */}
        <text x="170" y="24" fill={colors.textPrimary} fontSize="13" fontWeight="bold" textAnchor="middle">Temperature Effect on Solar Panel</text>
      </svg>
    );

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A solar panel at 25°C produces 400W. What happens when the panel heats up to 65°C on a hot summer day?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <PredictVisualization />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Experiment Now →
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Temperature Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Heat Up the Panel
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Drag the temperature slider and observe how power output changes on the I-V curve
            </p>

            {/* Key physics terms */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Temperature Coefficient (γ):</strong> For every 1°C above 25°C (STC), silicon solar cells lose approximately <strong>0.4% of rated power</strong>. This is called <em>thermal derating</em>. The effect matters because it directly impacts energy yield and project economics.
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <ThermalIVVisualization showComparison={true} temp={temperature} irr={irradiance} />
              </div>

              {/* Temperature slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Panel Temperature</span>
                  <span style={{
                    ...typo.small,
                    color: temperature > 50 ? colors.hot : temperature > 35 ? colors.warning : colors.success,
                    fontWeight: 600
                  }}>
                    {temperature}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="80"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  style={{
                    ...sliderStyle,
                    background: `linear-gradient(to right, ${colors.cold} 0%, ${colors.warning} 50%, ${colors.hot} 100%)`,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.cold }}>-10°C (Cold)</span>
                  <span style={{ ...typo.small, color: colors.success }}>25°C (STC)</span>
                  <span style={{ ...typo.small, color: colors.hot }}>80°C (Hot)</span>
                </div>
              </div>

              {/* Power output display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: temperature > 25 ? colors.hot : colors.cold }}>
                    {currentPower.toFixed(0)}W
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Current Power</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>400W</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Rated (25°C)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: deratingPercent > 15 ? colors.hot : deratingPercent > 5 ? colors.warning : colors.success
                  }}>
                    {deratingPercent > 0 ? `-${deratingPercent.toFixed(1)}%` : `+${Math.abs(deratingPercent).toFixed(1)}%`}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Thermal Effect</div>
                </div>
              </div>
            </div>

            {temperature > 50 && (
              <div style={{
                background: `${colors.hot}22`,
                border: `1px solid ${colors.hot}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.hot, margin: 0 }}>
                  At {temperature}°C, you're losing {deratingPercent.toFixed(0)}% of rated power to heat!
                </p>
              </div>
            )}

            {temperature < 10 && (
              <div style={{
                background: `${colors.cold}22`,
                border: `1px solid ${colors.cold}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.cold, margin: 0 }}>
                  Cold panels actually produce MORE than rated power! You're gaining +{Math.abs(deratingPercent).toFixed(0)}%
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Why →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Why Heat Hurts Solar Panels
            </h2>

            {/* Connect to prediction */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                As you observed in the experiment, panel power drops as temperature rises. You predicted this outcome—now let's understand the physics. Higher temperature reduces voltage through a well-defined mechanism.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Temperature Coefficient</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Silicon solar cells have a <span style={{ color: colors.hot }}>negative temperature coefficient</span> of about <strong>-0.4%/°C</strong> for power.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This means: For every degree above 25°C (Standard Test Conditions), you lose 0.4% of rated power.
                </p>

                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  fontFamily: 'monospace',
                }}>
                  <div style={{ color: colors.textPrimary, marginBottom: '8px' }}>Example: 400W panel at 65°C</div>
                  <div style={{ color: colors.textMuted }}>Temperature rise = 65°C - 25°C = 40°C</div>
                  <div style={{ color: colors.textMuted }}>Power loss = 40°C × 0.4%/°C = <span style={{ color: colors.hot }}>16%</span></div>
                  <div style={{ color: colors.warning }}>Actual power = 400W × 0.84 = <strong>336W</strong></div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.hot}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📉</span>
                  <h3 style={{ ...typo.h3, color: colors.hot, margin: 0 }}>Voltage Drops</h3>
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Heat increases electron thermal energy, reducing the bandgap voltage. Voc drops ~0.3%/°C—the main power loss mechanism.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📈</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Current Rises (Slightly)</h3>
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Heat slightly increases photon absorption, boosting current by ~0.05%/°C. But this small gain doesn't offset voltage loss.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Main Takeaway
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Power = Voltage × Current. Since voltage drops much more than current rises, net power always decreases with temperature. Cool, bright days produce the most solar energy!
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Cooling Solutions →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'No effect—air can\'t remove heat from solid panels' },
      { id: 'b', text: 'Small improvement—cooling reduces panel temperature and increases power' },
      { id: 'c', text: 'Major improvement—active cooling can double power output' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Airflow Cooling
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              If we add a fan to blow air across the back of hot panels, what happens?
            </h2>

            {/* Static SVG for twist predict */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="320" height="160" viewBox="0 0 320 160" style={{ background: colors.bgSecondary, borderRadius: '12px' }}>
                <defs>
                  <linearGradient id="hotPanelPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.hot} stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity="0.5" />
                  </linearGradient>
                  <filter id="predFilter">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* Hot panel */}
                <rect x="100" y="30" width="120" height="60" fill="url(#hotPanelPred)" rx="6" filter="url(#predFilter)" />
                <text x="160" y="65" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle">65°C</text>
                {/* Fan arrow */}
                <text x="50" y="80" fill={colors.warning} fontSize="24" textAnchor="middle">💨</text>
                <line x1="72" y1="75" x2="98" y2="75" stroke={colors.warning} strokeWidth="2" />
                <polygon points="98,69 108,75 98,81" fill={colors.warning} />
                <text x="160" y="120" fill={colors.textMuted} fontSize="12" textAnchor="middle">???°C with cooling</text>
                <text x="160" y="145" fill={colors.textMuted} fontSize="11" textAnchor="middle">T_panel = T_amb + NOCT_rise − cooling</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Run Cooling Experiment →
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const panelTemp = calculatePanelTemp(ambientTemp, irradiance, airflow);
    const cooledPower = calculatePower(panelTemp, irradiance);
    const uncooledPanelTemp = calculatePanelTemp(ambientTemp, irradiance, 0);
    const uncooledPower = calculatePower(uncooledPanelTemp, irradiance);
    const powerGain = ((cooledPower - uncooledPower) / uncooledPower) * 100;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Cooling Lab: Fight the Heat
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust ambient temperature and cooling to see the effects on panel temperature and power
            </p>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Observe how adding airflow cooling reduces panel temperature and increases power output. Compare the cooled vs uncooled power.
              </p>
            </div>

            {/* Cooling visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CoolingVisualization panelTemp={panelTemp} airflowPct={airflow} />
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Ambient temperature slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Ambient Temperature</span>
                  <span style={{
                    ...typo.small,
                    color: ambientTemp > 35 ? colors.hot : colors.textPrimary,
                    fontWeight: 600
                  }}>
                    {ambientTemp}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(parseInt(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              {/* Irradiance slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Sunlight Intensity</span>
                  <span style={{ ...typo.small, color: colors.solar, fontWeight: 600 }}>{irradiance} W/m²</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="50"
                  value={irradiance}
                  onChange={(e) => setIrradiance(parseInt(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              {/* Airflow/cooling slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Cooling Airflow</span>
                  <span style={{ ...typo.small, color: colors.cold, fontWeight: 600 }}>{airflow}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={airflow}
                  onChange={(e) => setAirflow(parseInt(e.target.value))}
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>No cooling</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Maximum fan</span>
                </div>
              </div>

              {/* Results comparison */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  border: `1px solid ${colors.hot}44`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>Without Cooling</div>
                  <div style={{ ...typo.h3, color: colors.hot }}>{uncooledPanelTemp.toFixed(0)}°C</div>
                  <div style={{ ...typo.body, color: colors.textSecondary }}>{uncooledPower.toFixed(0)}W</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  border: `1px solid ${colors.cold}44`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>With Cooling</div>
                  <div style={{ ...typo.h3, color: airflow > 0 ? colors.cold : colors.textMuted }}>{panelTemp.toFixed(0)}°C</div>
                  <div style={{ ...typo.body, color: colors.textSecondary }}>{cooledPower.toFixed(0)}W</div>
                </div>
              </div>

              {airflow > 0 && (
                <div style={{
                  marginTop: '16px',
                  background: `${colors.success}22`,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <span style={{ ...typo.body, color: colors.success, fontWeight: 600 }}>
                    +{powerGain.toFixed(1)}% power gain from cooling ({(uncooledPanelTemp - panelTemp).toFixed(0)}°C cooler)
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Trade-offs →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Practical Cooling Strategies
            </h2>

            {/* Connect to twist prediction */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                As you observed in the cooling experiment, even modest airflow reduces panel temperature and recovers power. The key insight is that passive cooling is nearly free while active cooling requires an energy trade-off.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📏</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Mounting Gap (Free!)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textMuted, margin: 0 }}>
                  Simply raising panels 6+ inches above the roof allows natural convection to cool them 10-15°C. <span style={{ color: colors.success }}>No energy cost, 5-8% annual gain.</span>
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎨</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Cool Roof Colors</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textMuted, margin: 0 }}>
                  White or reflective roofing under panels reduces heat absorption. <span style={{ color: colors.success }}>Low cost, 2-3% gain</span> plus building cooling benefits.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💧</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Water Cooling (PVT)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textMuted, margin: 0 }}>
                  Photovoltaic-Thermal (PVT) systems circulate water behind panels. <span style={{ color: colors.warning }}>Higher cost but captures heat for hot water while boosting electrical output 10-15%.</span>
                </p>
              </div>

              <div style={{
                background: `${colors.warning}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.warning}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚡</span>
                  <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>The Trade-off</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textMuted, margin: 0 }}>
                  Active cooling (fans, pumps) uses energy. It only makes sense when the extra power generated exceeds the cooling energy cost. Passive strategies (gaps, colors) are almost always worth it!
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Apply to Real World →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              App {selectedApp + 1} of {realWorldApps.length} ({completedCount} completed)
            </p>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                    const newCompleted = [...completedApps];
                    newCompleted[i] = true;
                    setCompletedApps(newCompleted);
                  }}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    minHeight: '44px',
                  }}
                >
                  {completedApps[i] && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: colors.success,
                      color: 'white',
                      fontSize: '12px',
                      lineHeight: '18px',
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                    {a.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              borderLeft: `4px solid ${app.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How Thermal Derating Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation through apps */}
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  setSelectedApp(selectedApp + 1);
                }}
                style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
              >
                Next Application →
              </button>
            ) : (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
              >
                Complete Applications
              </button>
            )}

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
              >
                Take the Test →
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          paddingTop: '48px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}
          {renderBottomNav()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '🎉' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed
                  ? 'You\'ve mastered Solar Thermal Derating!'
                  : 'Review the concepts and try again.'}
              </p>

              {/* Answer review */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                maxHeight: '300px',
                overflowY: 'auto',
                textAlign: 'left',
              }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Review</h3>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 0',
                      borderBottom: i < testQuestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                    }}>
                      <span style={{
                        fontSize: '18px',
                        color: isCorrect ? colors.success : colors.error,
                      }}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span style={{ ...typo.small, color: colors.textSecondary, flex: 1 }}>
                        Q{i + 1}: {q.question.substring(0, 50)}...
                      </span>
                      <span style={{
                        ...typo.small,
                        color: isCorrect ? colors.success : colors.error,
                        fontWeight: 600,
                      }}>
                        {userAnswer?.toUpperCase() || '—'} {!isCorrect && `(${correctId?.toUpperCase()})`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  Play Again
                </button>
                {passed && (
                  <button
                    onClick={() => { playSound('complete'); nextPhase(); }}
                    style={primaryButtonStyle}
                  >
                    Complete Lesson →
                  </button>
                )}
                <a
                  href="/"
                  style={{
                    ...primaryButtonStyle,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  }}
                >
                  Dashboard
                </a>
              </div>
            </div>
          </div>

          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion
                      ? colors.accent
                      : testAnswers[i]
                        ? colors.success
                        : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
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

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  ← Previous
                </button>
              )}
              {currentQuestion < 9 ? (
                <button
                  onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                  disabled={!testAnswers[currentQuestion]}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white',
                    cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Next →
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
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white',
                    cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        paddingTop: '48px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        {renderBottomNav()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px' }}>🏆</div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Thermal Derating Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why hot panels lose power and how to design systems that minimize thermal losses.
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
                'Temperature coefficient: -0.4%/°C for power',
                'Voltage drops more than current rises',
                'Cool, bright days produce most power',
                'Mounting gaps enable passive cooling',
                'Real-world thermal management strategies',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>{item}</span>
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

          {renderNavDots()}
        </div>
      </div>
    );
  }

  return null;
};

export default SolarThermalDeratingRenderer;
