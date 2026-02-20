'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// SOLAR DEPLOYMENT - Complete 10-Phase Game (Game #13 of 36 ELON Games)
// Solar farm design — tilt angle, row spacing, tracking, ground coverage ratio
// affect energy yield. Optimizing every photon in a solar farm.
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

interface SolarDeploymentRendererProps {
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
    scenario: "A solar farm site receives 5.5 kWh/m²/day of Global Horizontal Irradiance (GHI). The site is at 30°N latitude.",
    question: "What is GHI composed of?",
    options: [
      { id: 'a', label: "Direct Normal Irradiance (DNI) + Diffuse Horizontal Irradiance (DHI)", correct: true },
      { id: 'b', label: "Only direct sunlight hitting the ground" },
      { id: 'c', label: "Reflected light from surrounding surfaces" },
      { id: 'd', label: "Infrared radiation from the atmosphere" }
    ],
    explanation: "GHI = DNI × cos(zenith angle) + DHI. It includes both the direct beam component projected onto a horizontal surface and the diffuse sky radiation scattered by clouds and atmosphere."
  },
  {
    scenario: "You are designing a fixed-tilt solar array at 35°N latitude. The goal is to maximize annual energy production.",
    question: "What is the optimal tilt angle for maximum annual yield?",
    options: [
      { id: 'a', label: "Equal to the site latitude (approximately 35°)", correct: true },
      { id: 'b', label: "Always 0° (flat on the ground)" },
      { id: 'c', label: "Always 90° (vertical)" },
      { id: 'd', label: "60° regardless of location" }
    ],
    explanation: "The rule of thumb for maximum annual energy is tilt ≈ latitude. At 35°N, a 35° tilt angle positions panels perpendicular to the average sun path, maximizing the annual solar harvest."
  },
  {
    scenario: "A utility-scale project has a 100 MW AC inverter capacity but installs 130 MWp DC of solar panels.",
    question: "What is the DC/AC ratio, and why oversize?",
    options: [
      { id: 'a', label: "1.3 ratio — captures more energy in morning/evening, some clipping at peak", correct: true },
      { id: 'b', label: "1.3 ratio — the extra panels are just spares" },
      { id: 'c', label: "0.77 ratio — panels are undersized" },
      { id: 'd', label: "1.3 ratio — it doubles annual output" }
    ],
    explanation: "DC/AC ratio = 130/100 = 1.3. Oversizing DC captures more energy during non-peak hours (morning, evening, cloudy). The small amount of midday clipping is outweighed by the extra energy at other times."
  },
  {
    scenario: "At solar noon on a clear day, your 1.3 DC/AC ratio system is producing 130 MW DC but the inverter is rated at 100 MW AC.",
    question: "What happens to the excess 30 MW?",
    options: [
      { id: 'a', label: "Inverter clipping — the inverter limits output to 100 MW, excess is lost as heat", correct: true },
      { id: 'b', label: "It is stored in batteries automatically" },
      { id: 'c', label: "The panels shut down to prevent damage" },
      { id: 'd', label: "The excess flows back to the panels" }
    ],
    explanation: "Inverter clipping occurs when DC power exceeds AC capacity. The inverter shifts the operating point off MPPT, limiting power to its rated AC output. The 'lost' energy is intentional — the system gains more from morning/evening hours."
  },
  {
    scenario: "A bifacial solar panel can capture light on both its front and rear surfaces. It is mounted 1.5m above white gravel ground cover.",
    question: "What additional energy gain can bifacial panels typically provide?",
    options: [
      { id: 'a', label: "5-15% more energy from rear-side irradiance", correct: true },
      { id: 'b', label: "Exactly 100% more (doubles output)" },
      { id: 'c', label: "Less than 1% — negligible" },
      { id: 'd', label: "50% more energy in all conditions" }
    ],
    explanation: "Bifacial gain typically ranges 5-15% depending on ground albedo (reflectivity), mounting height, and GCR. White surfaces reflect more light to the rear. Higher mounting = more uniform rear irradiance."
  },
  {
    scenario: "After 6 months of operation, a solar farm in a dusty desert region shows a 5% drop in energy output compared to commissioning measurements.",
    question: "What is the most likely cause?",
    options: [
      { id: 'a', label: "Soiling — dust and dirt accumulation on panel surfaces", correct: true },
      { id: 'b', label: "The panels have permanently degraded" },
      { id: 'c', label: "The sun has become weaker" },
      { id: 'd', label: "The inverters are malfunctioning" }
    ],
    explanation: "Soiling losses in arid/dusty environments can reach 5-10% without cleaning. Dust, bird droppings, and pollen reduce light transmission. Regular cleaning schedules or robotic cleaners are essential."
  },
  {
    scenario: "Two adjacent rows of solar panels are spaced with a ground coverage ratio (GCR) of 0.7. The front row casts a shadow during low sun angles.",
    question: "At what point does increasing GCR become counterproductive?",
    options: [
      { id: 'a', label: "When inter-row shading losses exceed the gain from additional panel area", correct: true },
      { id: 'b', label: "GCR can always be increased for more energy" },
      { id: 'c', label: "Above GCR 0.5 panels overheat and fail" },
      { id: 'd', label: "Only at GCR = 1.0 when panels physically touch" }
    ],
    explanation: "Higher GCR means more panels per acre but also more inter-row shading. Typical optimal GCR is 0.35-0.50 for fixed-tilt. Above ~0.5, shading losses accelerate, reducing kWh/kWp even as total capacity increases."
  },
  {
    scenario: "A solar farm uses string inverters. One panel in a string of 20 is heavily shaded by a bird sitting on it.",
    question: "What happens to the output of the entire string?",
    options: [
      { id: 'a', label: "The whole string output drops significantly — limited by the weakest panel", correct: true },
      { id: 'b', label: "Only that one panel loses output, others are fine" },
      { id: 'c', label: "The string automatically bypasses the shaded panel" },
      { id: 'd', label: "Total output drops by exactly 5% (1/20)" }
    ],
    explanation: "In a series string, current is limited by the lowest-performing module. Bypass diodes help but still reduce string voltage. This 'Christmas light effect' is why partial shading is so damaging to string-connected systems."
  },
  {
    scenario: "A solar developer is choosing between a fixed-tilt system at 25° and a single-axis tracking system for a 200 MW project in Texas.",
    question: "What additional energy does single-axis tracking typically provide over fixed-tilt?",
    options: [
      { id: 'a', label: "15-25% more annual energy production", correct: true },
      { id: 'b', label: "1-3% marginal improvement" },
      { id: 'c', label: "Over 50% improvement" },
      { id: 'd', label: "Tracking only helps in winter months" }
    ],
    explanation: "Single-axis tracking (east-west rotation) typically yields 15-25% more energy than fixed-tilt. The gain comes from following the sun across the sky, keeping panels closer to perpendicular throughout the day."
  },
  {
    scenario: "A project has specific energy yield of 1,600 kWh/kWp/year with a performance ratio (PR) of 0.80 and annual degradation of 0.5%/year.",
    question: "What is the expected specific yield in Year 25?",
    options: [
      { id: 'a', label: "Approximately 1,414 kWh/kWp — degradation reduces output by ~0.5%/year", correct: true },
      { id: 'b', label: "Still 1,600 kWh/kWp — panels don't degrade" },
      { id: 'c', label: "800 kWh/kWp — output halves in 25 years" },
      { id: 'd', label: "0 kWh/kWp — panels stop working after 20 years" }
    ],
    explanation: "Year 25 yield = 1600 × (1 - 0.005)^24 = 1600 × 0.887 ≈ 1,414 kWh/kWp. At 0.5%/year degradation, panels retain ~88.7% of original output after 25 years. Most warranties guarantee 80% at year 25."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🇮🇳',
    title: 'Bhadla Solar Park',
    short: 'One of the world\'s largest solar installations in the Rajasthan desert',
    tagline: 'Powering a nation from desert sand',
    description: 'Bhadla Solar Park in Rajasthan, India covers 14,000 acres with 2.25 GW of installed capacity. Operating in extreme desert heat (50°C+), the park demonstrates how GCR optimization, advanced cleaning robots for soiling management, and high DC/AC ratios maximize yield in harsh conditions. The park\'s design accounts for sand-storm soiling losses of up to 8% monthly.',
    connection: 'Ground coverage ratio and inter-row spacing are critical — too tight and desert dust shadows compound shading losses. Bhadla uses GCR ~0.4 to balance land use with shading.',
    howItWorks: 'Thousands of tracker rows follow the sun east-to-west while robotic cleaners traverse each row nightly to combat desert soiling.',
    stats: [
      { value: '2.25GW', label: 'Installed capacity', icon: '⚡' },
      { value: 'Rajasthan', label: 'Desert location', icon: '🏜️' },
      { value: '14,000 acres', label: 'Total area', icon: '📐' }
    ],
    examples: ['Utility-scale PV', 'Desert deployment', 'Robotic cleaning', 'Tracker optimization'],
    companies: ['Adani Green', 'SB Energy', 'Tata Power', 'Azure Power'],
    futureImpact: 'Bifacial panels over white sand reflectors could boost output another 10-15% with minimal additional land.',
    color: '#F59E0B'
  },
  {
    icon: '🏜️',
    title: 'Ivanpah CSP vs Desert Sunlight PV',
    short: 'Two solar technologies, same desert, vastly different land use',
    tagline: 'Concentrated power vs photovoltaic efficiency',
    description: 'In California\'s Mojave Desert, Ivanpah (392 MW CSP) uses mirrors to focus sunlight onto towers, requiring 3,500 acres. Nearby Desert Sunlight (550 MW PV) uses traditional panels on 3,800 acres but produces significantly more energy per acre. This comparison reveals how technology choice dramatically impacts ground coverage ratio and land efficiency.',
    connection: 'CSP requires direct normal irradiance (DNI) and wide mirror spacing, while PV works with GHI and can pack panels tighter — showing how GCR economics differ by technology.',
    howItWorks: 'CSP reflects sunlight to a central tower; PV converts light directly to electricity. Same desert, 5× different land efficiency.',
    stats: [
      { value: 'CSP', label: 'vs PV technology', icon: '🔆' },
      { value: 'same desert', label: 'Mojave location', icon: '🏜️' },
      { value: '5x', label: 'Land use difference', icon: '📊' }
    ],
    examples: ['Ivanpah Solar', 'Desert Sunlight', 'Topaz Solar Farm', 'Crescent Dunes'],
    companies: ['BrightSource', 'First Solar', 'NRG Energy', 'SolarReserve'],
    futureImpact: 'PV + battery storage is now cheaper than CSP thermal storage in most locations, shifting desert solar toward PV dominance.',
    color: '#EF4444'
  },
  {
    icon: '🏠',
    title: 'Tesla Solar Roof',
    short: 'Integrating solar into residential roof geometry at fixed tilt',
    tagline: 'When your roof is the solar farm',
    description: 'Tesla\'s Solar Roof replaces conventional roofing tiles with solar-active glass tiles. Unlike utility solar farms, residential systems must work with fixed roof angles (typically 20-45°), suboptimal azimuths, and unavoidable shading from chimneys, dormers, and neighboring structures. A typical 12 kW system must maximize every available roof face.',
    connection: 'Fixed tilt at whatever angle the roof provides means understanding how tilt and azimuth affect yield — a south-facing 30° roof captures ~95% of optimal, but an east-facing roof drops to ~75%.',
    howItWorks: 'Solar-active tiles are installed alongside inactive tiles, with module-level power electronics (MLPEs) to handle variable tilt and shading.',
    stats: [
      { value: 'fixed', label: 'Tilt angle', icon: '📐' },
      { value: 'roof', label: 'Geometry constraint', icon: '🏗️' },
      { value: '12kW', label: 'Typical system', icon: '⚡' }
    ],
    examples: ['Solar Roof V3', 'Powerwall integration', 'Net metering', 'Virtual power plants'],
    companies: ['Tesla Energy', 'SunRun', 'SunPower', 'Enphase'],
    futureImpact: 'Building-integrated PV (BIPV) will make every surface — walls, windows, facades — a potential solar generator.',
    color: '#3B82F6'
  },
  {
    icon: '🌊',
    title: 'Floating Solar — Yamakura Dam',
    short: 'Solar panels on water — no land required, cooler operation',
    tagline: 'Harvesting sun from the water surface',
    description: 'Japan\'s Yamakura Dam floating solar installation (13.7 MW) places panels on a reservoir surface, eliminating land use entirely. Water cooling improves panel efficiency by 5-10% compared to ground-mount. The system also reduces evaporation, providing a dual benefit. Floating solar ("floatovoltaics") represents a growing niche where land is scarce but water surfaces are available.',
    connection: 'No inter-row shading concerns from terrain, but wind loads and wave action create unique GCR and structural challenges. Water albedo provides natural bifacial gain.',
    howItWorks: 'HDPE floating pontoons support panel arrays, anchored to the reservoir bed. Cables route DC power to shore-based inverters.',
    stats: [
      { value: '13.7MW', label: 'Installed capacity', icon: '⚡' },
      { value: 'water', label: 'Surface type', icon: '🌊' },
      { value: 'no land', label: 'Used for panels', icon: '🌍' }
    ],
    examples: ['Yamakura Dam Japan', 'Tengeh Reservoir Singapore', 'Queen Elizabeth II UK', 'Sirindhorn Dam Thailand'],
    companies: ['Kyocera', 'Ciel & Terre', 'Sungrow', 'Trina Solar'],
    futureImpact: 'Offshore floating solar on ocean surfaces could unlock massive generation potential without any land impact.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_SolarDeploymentRenderer: React.FC<SolarDeploymentRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state — Ground Coverage Ratio
  const [gcr, setGcr] = useState(0.40);
  const [tiltAngle, setTiltAngle] = useState(30);
  const [sunPosition, setSunPosition] = useState(50); // 0-100 representing dawn to dusk

  // Twist phase — single-axis tracking vs fixed-tilt
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackerAngle, setTrackerAngle] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Animation ref
  const animFrameRef = useRef<number>(0);
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sun arc animation for play phase
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      let pos = sunPosition;
      let dir = 1;
      const animate = () => {
        pos += 0.15 * dir;
        if (pos >= 100) { pos = 100; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; }
        setSunPosition(pos);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animFrameRef.current);
    }
  }, [phase]);

  // Calculate solar metrics
  const calculateShadowLength = (tilt: number, gcrVal: number, sunAltitude: number) => {
    const tiltRad = (tilt * Math.PI) / 180;
    const sunRad = (Math.max(sunAltitude, 5) * Math.PI) / 180;
    const panelHeight = Math.sin(tiltRad);
    const shadowLen = panelHeight / Math.tan(sunRad);
    return shadowLen;
  };

  const calculateEnergyYield = (gcrVal: number, tilt: number, tracking: boolean) => {
    // Simplified energy model: base yield modified by GCR shading and tilt efficiency
    const baseYield = 1600; // kWh/kWp/year baseline
    const tiltEfficiency = 1 - 0.005 * Math.abs(tilt - 30); // optimal near 30 degrees
    const shadingLoss = gcrVal > 0.4 ? Math.pow((gcrVal - 0.4) / 0.6, 1.5) * 0.30 : 0;
    const trackingGain = tracking ? 0.20 : 0;
    const yield_kwh = baseYield * (tiltEfficiency - shadingLoss + trackingGain);
    return Math.max(800, yield_kwh);
  };

  const calculateCapacityDensity = (gcrVal: number) => {
    // MW per acre based on GCR
    return gcrVal * 0.5; // rough: GCR 0.4 = 0.2 MW/acre
  };

  // Derived values
  const sunAltitude = 10 + 70 * Math.sin((sunPosition / 100) * Math.PI); // 10° to 80° arc
  const shadowLength = calculateShadowLength(tiltAngle, gcr, sunAltitude);
  const energyYield = calculateEnergyYield(gcr, tiltAngle, false);
  const energyYieldTracking = calculateEnergyYield(gcr, tiltAngle, true);
  const capacityDensity = calculateCapacityDensity(gcr);
  const shadingLossPercent = gcr > 0.4 ? (Math.pow((gcr - 0.4) / 0.6, 1.5) * 30).toFixed(1) : '0.0';

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    solar: '#F59E0B',
    sky: '#3B82F6',
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
        gameType: 'solar-deployment',
        gameTitle: 'Solar Deployment',
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

  // Progress bar component
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.solar})`,
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.solar})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'sticky',
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

  // -------------------------------------------------------------------------
  // SOLAR FARM SVG VISUALIZATION — Side-view cross-section
  // -------------------------------------------------------------------------
  const SolarFarmVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 360;
    const groundY = 260;
    const panelWidth = 60;
    const panelTiltRad = (tiltAngle * Math.PI) / 180;
    const panelVisualHeight = panelWidth * Math.sin(panelTiltRad);
    const panelVisualWidth = panelWidth * Math.cos(panelTiltRad);
    const rowSpacing = panelVisualWidth / Math.max(gcr, 0.2);
    const numRows = Math.min(Math.floor((width - 80) / rowSpacing), 6);

    // Sun position on arc
    const sunAngle = (sunPosition / 100) * Math.PI; // 0 to PI
    const sunX = 40 + (width - 80) * (sunPosition / 100);
    const sunY = groundY - 40 - 160 * Math.sin(sunAngle);

    // Shadow from each panel
    const shadowOffset = sunAltitude > 5 ? panelVisualHeight / Math.tan((sunAltitude * Math.PI) / 180) : 200;
    const shadowDir = sunPosition > 50 ? -1 : 1;

    // Energy meter
    const currentEnergy = calculateEnergyYield(gcr, tiltAngle, trackingEnabled);
    const maxEnergy = 2000;
    const energyFraction = Math.min(currentEnergy / maxEnergy, 1);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1445" />
            <stop offset="40%" stopColor="#1a2a6c" />
            <stop offset="100%" stopColor="#2a3a7c" />
          </linearGradient>
          {/* Sun gradient */}
          <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>
          {/* Panel gradient */}
          <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          {/* Panel highlight */}
          <linearGradient id="panelHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
          </linearGradient>
          {/* Ground gradient */}
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a3728" />
            <stop offset="100%" stopColor="#2d1f14" />
          </linearGradient>
          {/* Energy meter gradient */}
          <linearGradient id="energyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* Shadow gradient */}
          <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          {/* Sun glow filter */}
          <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Panel glow filter */}
          <filter id="panelGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Energy glow */}
          <filter id="energyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky background */}
        <rect x="0" y="0" width={width} height={groundY} fill="url(#skyGrad)" />

        {/* Sun arc path (dashed) */}
        <path
          d={`M 40 ${groundY - 40} Q ${width / 2} ${groundY - 240} ${width - 40} ${groundY - 40}`}
          stroke="rgba(245, 158, 11, 0.15)"
          fill="none"
          strokeWidth="1"
          strokeDasharray="4,6"
        />

        {/* Sun */}
        <circle cx={sunX} cy={sunY} r="22" fill="url(#sunGrad)" />
        <circle cx={sunX} cy={sunY} r="10" fill="#FDE68A" />
        {/* Sun rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={sunX + Math.cos(rad) * 14}
              y1={sunY + Math.sin(rad) * 14}
              x2={sunX + Math.cos(rad) * 26}
              y2={sunY + Math.sin(rad) * 26}
              stroke="#FDE68A"
              strokeWidth="1.5"
              opacity="0.5"
            />
          );
        })}

        {/* Ground plane */}
        <rect x="0" y={groundY} width={width} height={height - groundY} fill="url(#groundGrad)" />
        <line x1="0" y1={groundY} x2={width} y2={groundY} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Grid lines on ground */}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line key={i} x1={width * frac} y1={groundY} x2={width * frac} y2={height} stroke="rgba(255,255,255,0.04)" strokeDasharray="2,4" />
        ))}

        {/* Panel rows with shadows */}
        {Array.from({ length: numRows }).map((_, rowIdx) => {
          const baseX = 50 + rowIdx * rowSpacing;
          const panelTopX = baseX;
          const panelTopY = groundY - panelVisualHeight - 15;
          const panelBottomX = baseX + panelVisualWidth;
          const panelBottomY = groundY - 15;

          // Shadow polygon
          const shadowEndX = panelTopX + shadowOffset * (shadowDir > 0 ? 1 : -1);
          const shadowEndXClamped = Math.max(0, Math.min(width, shadowEndX));
          const isShaded = rowIdx > 0 && gcr > 0.35;

          return (
            <g key={rowIdx}>
              {/* Shadow on ground */}
              <polygon
                points={`${panelBottomX},${groundY} ${panelTopX},${groundY} ${shadowEndXClamped},${groundY} ${panelBottomX + (shadowEndXClamped - panelTopX) * 0.3},${groundY}`}
                fill="rgba(0,0,0,0.25)"
                opacity={sunAltitude > 10 ? 0.6 : 0.2}
              />

              {/* Panel support post */}
              <line
                x1={(panelTopX + panelBottomX) / 2}
                y1={groundY}
                x2={(panelTopX + panelBottomX) / 2}
                y2={(panelTopY + panelBottomY) / 2}
                stroke="#6b7280"
                strokeWidth="3"
              />

              {/* Panel surface */}
              <line
                x1={panelTopX}
                y1={panelTopY}
                x2={panelBottomX}
                y2={panelBottomY}
                stroke="url(#panelGrad)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Panel glass reflection */}
              <line
                x1={panelTopX + 2}
                y1={panelTopY + 1}
                x2={panelBottomX - 2}
                y2={panelBottomY - 1}
                stroke="rgba(96,165,250,0.3)"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Shading indicator */}
              {isShaded && gcr > 0.5 && (
                <circle
                  cx={(panelTopX + panelBottomX) / 2}
                  cy={panelTopY - 8}
                  r="6"
                  fill={colors.error}
                  opacity="0.7"
                  filter="url(#panelGlow)"
                />
              )}

              {/* Row label */}
              <text
                x={(panelTopX + panelBottomX) / 2}
                y={groundY + 14}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                R{rowIdx + 1}
              </text>
            </g>
          );
        })}

        {/* Dimension arrows showing row spacing */}
        {numRows >= 2 && (
          <g>
            <line
              x1={50 + panelVisualWidth / 2}
              y1={groundY + 22}
              x2={50 + rowSpacing + panelVisualWidth / 2}
              y2={groundY + 22}
              stroke="#94a3b8"
              strokeWidth="1"
              markerEnd="url(#arrowEnd)"
            />
            <text
              x={50 + rowSpacing / 2 + panelVisualWidth / 2}
              y={groundY + 35}
              fill="#94a3b8"
              fontSize="11"
              textAnchor="middle"
            >
              GCR: {gcr.toFixed(2)}
            </text>
          </g>
        )}

        {/* Title */}
        <text x={width / 2} y={14} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Solar Farm Cross-Section — GCR: {gcr.toFixed(2)} | Tilt: {tiltAngle}°
        </text>

        {/* Sun altitude label */}
        <text x={sunX} y={sunY - 28} fill="#FDE68A" fontSize="11" textAnchor="middle" fontWeight="600">
          {sunAltitude.toFixed(0)}°
        </text>

        {/* Energy output meter (right side) */}
        <g>
          <rect x={width - 35} y={40} width={16} height={200} rx="8" fill={colors.border} />
          <rect
            x={width - 35}
            y={40 + 200 * (1 - energyFraction)}
            width={16}
            height={200 * energyFraction}
            rx="8"
            fill={energyFraction > 0.7 ? colors.success : energyFraction > 0.4 ? colors.warning : colors.error}
            filter="url(#energyGlow)"
          />
          <circle
            cx={width - 27}
            cy={40 + 200 * (1 - energyFraction)}
            r="6"
            fill={colors.success}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#energyGlow)"
          />
          <text x={width - 27} y={36} fill={colors.textMuted} fontSize="11" textAnchor="middle">kWh</text>
          <text x={width - 27} y={height - 55} fill={colors.textMuted} fontSize="11" textAnchor="middle">0</text>
        </g>

        {/* Energy value */}
        <text x={width - 27} y={40 + 200 * (1 - energyFraction) - 10} fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="600">
          {currentEnergy.toFixed(0)}
        </text>

        {/* DC string layout indicator (top-down mini view in corner) */}
        <g>
          <rect x={8} y={40} width={60} height={45} rx="4" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" />
          <text x={38} y={52} fill="#94a3b8" fontSize="11" textAnchor="middle">DC Layout</text>
          {/* Mini panel rows from above */}
          {[0, 1, 2, 3].map((r) => (
            <rect key={r} x={14} y={56 + r * (28 * gcr)} width={44} height={3} rx="1" fill="#2563EB" opacity="0.8" />
          ))}
          {/* String lines */}
          <line x1={14} y1={58} x2={14} y2={78} stroke="#F59E0B" strokeWidth="0.5" opacity="0.6" />
          <line x1={58} y1={58} x2={58} y2={78} stroke="#F59E0B" strokeWidth="0.5" opacity="0.6" />
        </g>

        {/* Formula */}
        <rect x={width / 2 - 130} y={height - 45} width="260" height="20" rx="4" fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.3)" />
        <text x={width / 2} y={height - 31} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          E = GHI × PR × (1 - losses) | GCR: {gcr.toFixed(2)} | Yield: {currentEnergy.toFixed(0)} kWh/kWp
        </text>

        {/* Legend */}
        <g>
          <circle cx={40} cy={height - 12} r="4" fill="#2563EB" />
          <text x={49} y={height - 8} fill="#94a3b8" fontSize="11">Panels</text>
          <circle cx={110} cy={height - 12} r="4" fill="rgba(0,0,0,0.3)" />
          <text x={119} y={height - 8} fill="#94a3b8" fontSize="11">Shadow</text>
          <circle cx={175} cy={height - 12} r="4" fill="#FDE68A" />
          <text x={184} y={height - 8} fill="#94a3b8" fontSize="11">Sun</text>
          <circle cx={220} cy={height - 12} r="4" fill={colors.success} />
          <text x={229} y={height - 8} fill="#94a3b8" fontSize="11">Energy</text>
        </g>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // TRACKING SVG VISUALIZATION — Comparing fixed vs tracking
  // -------------------------------------------------------------------------
  const TrackingVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 340;
    const groundY = 240;
    const sunAngle = (sunPosition / 100) * Math.PI;
    const sunX = 40 + (width - 80) * (sunPosition / 100);
    const sunY = groundY - 40 - 150 * Math.sin(sunAngle);
    const sunAlt = 10 + 70 * Math.sin(sunAngle);

    // Fixed panel angle
    const fixedAngle = tiltAngle;
    // Tracker follows the sun
    const optimalAngle = 90 - sunAlt;
    const actualTrackerAngle = trackingEnabled ? optimalAngle : fixedAngle;

    // Energy capture — cosine of angle between panel normal and sun direction
    const fixedCosine = Math.cos(((sunAlt - (90 - fixedAngle)) * Math.PI) / 180);
    const trackingCosine = Math.cos(((sunAlt - (90 - actualTrackerAngle)) * Math.PI) / 180);
    const fixedCapture = Math.max(0, fixedCosine) * 100;
    const trackCapture = Math.max(0, trackingCosine) * 100;

    const drawPanel = (cx: number, tilt: number, label: string, capturePercent: number, colorStr: string) => {
      const tiltRad = (tilt * Math.PI) / 180;
      const pLen = 50;
      const dx = (pLen / 2) * Math.cos(tiltRad);
      const dy = (pLen / 2) * Math.sin(tiltRad);
      const baseY = groundY - 15;
      return (
        <g>
          {/* Support */}
          <line x1={cx} y1={groundY} x2={cx} y2={baseY - dy * 0.3} stroke="#6b7280" strokeWidth="3" />
          {/* Panel */}
          <line x1={cx - dx} y1={baseY} x2={cx + dx} y2={baseY - dy * 2} stroke={colorStr} strokeWidth="8" strokeLinecap="round" />
          <line x1={cx - dx + 1} y1={baseY - 1} x2={cx + dx - 1} y2={baseY - dy * 2 + 1} stroke="rgba(96,165,250,0.3)" strokeWidth="5" strokeLinecap="round" />
          {/* Label */}
          <text x={cx} y={groundY + 16} fill={colorStr} fontSize="11" textAnchor="middle" fontWeight="600">{label}</text>
          {/* Capture bar */}
          <rect x={cx - 20} y={groundY + 22} width="40" height="6" rx="3" fill={colors.border} />
          <rect x={cx - 20} y={groundY + 22} width={40 * (capturePercent / 100)} height="6" rx="3" fill={colorStr} />
          <text x={cx} y={groundY + 40} fill={colorStr} fontSize="11" textAnchor="middle">{capturePercent.toFixed(0)}%</text>
        </g>
      );
    };

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="skyGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1445" />
            <stop offset="100%" stopColor="#1a2a6c" />
          </linearGradient>
          <radialGradient id="sunGrad2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>
          <filter id="sunGlow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="trackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="groundGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a3728" />
            <stop offset="100%" stopColor="#2d1f14" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width={width} height={groundY} fill="url(#skyGrad2)" />

        {/* Sun arc */}
        <path
          d={`M 40 ${groundY - 40} Q ${width / 2} ${groundY - 220} ${width - 40} ${groundY - 40}`}
          stroke="rgba(245,158,11,0.12)"
          fill="none"
          strokeWidth="1"
          strokeDasharray="4,6"
        />

        {/* Sun */}
        <circle cx={sunX} cy={sunY} r="18" fill="url(#sunGrad2)" filter="url(#sunGlow2)" />
        <circle cx={sunX} cy={sunY} r="8" fill="#FDE68A" />

        {/* Sun beams to both panels */}
        <line x1={sunX} y1={sunY} x2={width * 0.3} y2={groundY - 40} stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="6,4" />
        <line x1={sunX} y1={sunY} x2={width * 0.7} y2={groundY - 40} stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="6,4" />

        {/* Ground */}
        <rect x="0" y={groundY} width={width} height={height - groundY} fill="url(#groundGrad2)" />
        <line x1="0" y1={groundY} x2={width} y2={groundY} stroke="rgba(255,255,255,0.1)" />

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Fixed-Tilt vs Single-Axis Tracking
        </text>

        {/* Fixed panel (left) */}
        {drawPanel(width * 0.3, fixedAngle, `Fixed ${fixedAngle}°`, fixedCapture, '#3B82F6')}

        {/* Tracking panel (right) */}
        {drawPanel(width * 0.7, actualTrackerAngle, trackingEnabled ? `Track ${actualTrackerAngle.toFixed(0)}°` : `Fixed ${fixedAngle}°`, trackCapture, trackingEnabled ? '#10B981' : '#3B82F6')}

        {/* Comparison bar */}
        <g>
          <rect x={width / 2 - 80} y={groundY + 55} width="160" height="30" rx="6" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" />
          <text x={width / 2} y={groundY + 65} fill="#94a3b8" fontSize="11" textAnchor="middle">Energy Gain from Tracking</text>
          <text x={width / 2} y={groundY + 79} fill={trackingEnabled ? colors.success : colors.textMuted} fontSize="12" textAnchor="middle" fontWeight="700">
            {trackingEnabled ? `+${((trackCapture / Math.max(fixedCapture, 1) - 1) * 100).toFixed(0)}% at this sun angle` : 'Enable tracking to compare'}
          </text>
        </g>

        {/* Annual comparison */}
        <text x={width / 2} y={height - 20} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Annual: Fixed {energyYield.toFixed(0)} vs Tracking {energyYieldTracking.toFixed(0)} kWh/kWp (+{((energyYieldTracking / energyYield - 1) * 100).toFixed(0)}%)
        </text>

        {/* Tracking arrow indicator */}
        {trackingEnabled && (
          <g>
            <circle cx={width * 0.7} cy={groundY - 55} r="6" fill={colors.success} filter="url(#trackGlow)" />
            <text x={width * 0.7} y={groundY - 65} fill={colors.success} fontSize="11" textAnchor="middle">TRACKING</text>
          </g>
        )}
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            ☀️🏗️
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Solar Deployment
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            "Every square meter of a solar farm is a battle to optimize every photon. The difference between a <span style={{ color: colors.solar }}>mediocre design and an excellent one</span> is 20-30% more energy from the same hardware."
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "In solar farm design, every degree of tilt, every centimeter of row spacing, and every decision about tracking vs fixed-tilt compounds across millions of panels over 30 years. Small optimizations yield enormous returns."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Utility-Scale Solar Engineering Principles
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'No catch — more panels always means more energy output' },
      { id: 'b', text: 'Inter-row shading reduces output per panel by 15-30%' },
      { id: 'c', text: 'Panels overheat when packed too closely together' },
      { id: 'd', text: 'Wind damage increases with tighter spacing' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Packing solar panels closer together increases total capacity. But what's the catch?
            </h2>

            {/* Static SVG showing the spacing dilemma */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictPanelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e3a5f" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Wide Spacing vs Tight Spacing</text>

                {/* Wide spacing (top) */}
                <text x="200" y="42" textAnchor="middle" fill="#10B981" fontSize="11">GCR 0.3 — Wide Spacing</text>
                {[0, 1, 2].map(i => (
                  <g key={`wide-${i}`}>
                    <line x1={60 + i * 110} y1={65} x2={100 + i * 110} y2={50} stroke="url(#predictPanelGrad)" strokeWidth="6" strokeLinecap="round" />
                    <line x1={60 + i * 110} y1={67} x2={100 + i * 110} y2={52} stroke="rgba(96,165,250,0.2)" strokeWidth="4" strokeLinecap="round" />
                  </g>
                ))}
                <text x="200" y="85" textAnchor="middle" fill="#10B981" fontSize="11">No shading between rows</text>

                {/* Tight spacing (bottom) */}
                <text x="200" y="110" textAnchor="middle" fill="#EF4444" fontSize="11">GCR 0.7 — Tight Spacing</text>
                {[0, 1, 2, 3, 4].map(i => (
                  <g key={`tight-${i}`}>
                    <line x1={40 + i * 70} y1={135} x2={70 + i * 70} y2={120} stroke="url(#predictPanelGrad)" strokeWidth="6" strokeLinecap="round" />
                    {i > 0 && <rect x={40 + i * 70 - 25} y={136} width="20" height="4" rx="1" fill="rgba(0,0,0,0.4)" />}
                  </g>
                ))}
                <text x="200" y="155" textAnchor="middle" fill="#EF4444" fontSize="11">Shadow overlap between rows!</text>

                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">More panels... but each produces less?</text>
              </svg>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
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
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Solar Farm Designer
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Solar Farm Designer
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Ground Coverage Ratio (GCR) is the single most important layout parameter in utility-scale solar. It determines the trade-off between land efficiency and per-panel yield — affecting the LCOE (Levelized Cost of Energy) of every solar farm built worldwide.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Ground Coverage Ratio (GCR)</strong> is defined as the ratio of panel width to row pitch — the fraction of ground covered by panels when viewed from directly above.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Inter-Row Shading</strong> occurs when the shadow from one row of panels falls on the row behind it, reducing that row's energy output.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.solar }}>Optimal Tilt</strong> is the panel angle that maximizes annual energy capture, typically equal to the site latitude for fixed-tilt systems.
              </p>
            </div>

            {/* Visualization */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows a cross-section of your solar farm. Adjust the GCR slider to see how row spacing affects shading. Watch the animated sun arc to observe shadow patterns at different times of day. The energy meter on the right shows real-time yield.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <SolarFarmVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* GCR slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Ground Coverage Ratio</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        GCR: {gcr.toFixed(2)} — {gcr < 0.35 ? 'Wide spacing' : gcr < 0.55 ? 'Optimal range' : 'Tight — shading risk'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="80"
                      value={gcr * 100}
                      onChange={(e) => setGcr(parseInt(e.target.value) / 100)}
                      onInput={(e) => setGcr(parseInt((e.target as HTMLInputElement).value) / 100)}
                      aria-label="Ground Coverage Ratio"
                      style={sliderStyle(colors.accent, gcr * 100, 20, 80)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0.20 (wide)</span>
                      <span style={{ ...typo.small, color: colors.error }}>0.80 (tight)</span>
                    </div>
                  </div>

                  {/* Tilt angle slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Tilt Angle</span>
                      <span style={{ ...typo.small, color: colors.sky, fontWeight: 600 }}>
                        {tiltAngle}° {Math.abs(tiltAngle - 30) < 5 ? '(near optimal)' : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={tiltAngle}
                      onChange={(e) => setTiltAngle(parseInt(e.target.value))}
                      onInput={(e) => setTiltAngle(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Tilt Angle"
                      style={sliderStyle(colors.sky, tiltAngle, 5, 60)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>5° (flat)</span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>60° (steep)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{energyYield.toFixed(0)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>kWh/kWp/yr</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: parseFloat(shadingLossPercent) > 10 ? colors.error : colors.success }}>
                        {shadingLossPercent}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Shading Loss</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.sky }}>
                        {capacityDensity.toFixed(2)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>MW/acre</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Solar Farm Layout
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — packing panels closer increases total capacity but inter-row shading steals 15-30% of output per shaded panel, reducing the benefit.'
                : 'As you observed in the experiment, packing panels tighter creates a trade-off. While total capacity increases, inter-row shading reduces output per panel by 15-30%, making the economics worse beyond a certain point.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>GCR = Panel Width / Row Pitch</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The <span style={{ color: colors.accent }}>Ground Coverage Ratio</span> determines how much of the ground is "covered" by panels. Higher GCR means more panels per acre (more <span style={{ color: colors.success }}>capacity density</span>) but also more <span style={{ color: colors.error }}>inter-row shading</span> during morning and evening hours when the sun is low.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Optimal GCR ≈ 0.35–0.50 (fixed-tilt) | <strong>Trade-off: $/acre vs $/kWh</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Shading Is So Damaging
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Solar panels in a string are connected in series — like Christmas lights. When one panel is shaded, it limits the current of the entire string (even with bypass diodes). A 10% shaded area can cause 20-30% energy loss. This is why row spacing is critical: the shadow from one row must not fall on the next during productive hours.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key Solar Parameters
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'GCR', value: '0.35-0.50', desc: 'Optimal range' },
                  { name: 'Tilt', value: '≈ Latitude', desc: 'Annual max' },
                  { name: 'DC/AC', value: '1.2-1.4', desc: 'Oversize ratio' },
                  { name: 'GHI', value: '4-7 kWh/m²', desc: 'Solar resource' },
                  { name: 'PR', value: '0.75-0.85', desc: 'Performance ratio' },
                  { name: 'Degrad.', value: '0.4-0.6%', desc: 'Annual loss' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: '1-2% — barely worth the added complexity' },
      { id: 'b', text: '15-25% — a significant energy gain' },
      { id: 'c', text: 'Over 50% — tracking more than doubles morning/evening capture' },
      { id: 'd', text: 'Only works in deserts — no benefit in temperate climates' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Single-Axis Tracking
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Single-axis tracking follows the sun east-to-west throughout the day. The energy gain vs fixed-tilt is...
            </h2>

            {/* Static SVG showing tracking concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Morning sun */}
                <circle cx="60" cy="30" r="12" fill="#FDE68A" filter="url(#twistGlow)" />
                <text x="60" y="55" textAnchor="middle" fill="#94a3b8" fontSize="11">Morning</text>
                {/* Fixed panel stays same */}
                <line x1="130" y1="80" x2="170" y2="60" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" />
                <text x="150" y="100" textAnchor="middle" fill="#3B82F6" fontSize="11">Fixed</text>
                {/* Tracking panel tilts toward morning sun */}
                <line x1="220" y1="80" x2="260" y2="60" stroke="#10B981" strokeWidth="6" strokeLinecap="round" />
                <text x="240" y="100" textAnchor="middle" fill="#10B981" fontSize="11">Tracking</text>
                {/* Afternoon sun */}
                <circle cx="340" cy="30" r="12" fill="#FDE68A" filter="url(#twistGlow)" />
                <text x="340" y="55" textAnchor="middle" fill="#94a3b8" fontSize="11">Afternoon</text>
                {/* Arrow showing tracking movement */}
                <path d="M 230 110 C 235 70, 255 70, 260 110" stroke="#10B981" fill="none" strokeWidth="1.5" />
                <text x="245" y="135" textAnchor="middle" fill="#10B981" fontSize="11">Rotates east-to-west</text>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
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
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Tracking in Action
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Tracking vs Fixed-Tilt Comparison
  if (phase === 'twist_play') {
    const trackingGain = ((energyYieldTracking / energyYield - 1) * 100).toFixed(1);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Tracking vs Fixed-Tilt Comparison
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Watch the sun move across the sky and compare how fixed panels vs trackers capture energy
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <TrackingVisualization />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The left panel stays fixed at your chosen tilt angle while the right panel dynamically tracks the sun across the sky, always staying perpendicular to capture maximum energy.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you toggle tracking on, the right panel rotates to follow the sun, boosting energy capture by 15-25%. Adjusting the base tilt angle changes the fixed panel's performance while the tracker compensates automatically.</p>
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Tracking toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ ...typo.body, color: colors.textSecondary }}>Single-Axis Tracking</span>
                      <button
                        onClick={() => { playSound('click'); setTrackingEnabled(!trackingEnabled); }}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          background: trackingEnabled ? colors.success : colors.border,
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 600,
                          minHeight: '44px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {trackingEnabled ? 'ON — Tracking Active' : 'OFF — Fixed Tilt'}
                      </button>
                    </div>
                  </div>

                  {/* Tilt angle slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Base Tilt Angle</span>
                      <span style={{ ...typo.small, color: colors.sky, fontWeight: 600 }}>{tiltAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={tiltAngle}
                      onChange={(e) => setTiltAngle(parseInt(e.target.value))}
                      onInput={(e) => setTiltAngle(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Tilt Angle"
                      style={sliderStyle(colors.sky, tiltAngle, 5, 60)}
                    />
                  </div>

                  {/* Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#3B82F6' }}>{energyYield.toFixed(0)} kWh/kWp</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Fixed-Tilt Annual</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{energyYieldTracking.toFixed(0)} kWh/kWp</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Tracking Annual</div>
                    </div>
                  </div>

                  {/* Tracking gain highlight */}
                  <div style={{
                    background: trackingEnabled ? `${colors.success}22` : `${colors.warning}22`,
                    border: `1px solid ${trackingEnabled ? colors.success : colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      Tracking Energy Gain:
                    </p>
                    <div style={{
                      ...typo.h2,
                      color: trackingEnabled ? colors.success : colors.warning
                    }}>
                      +{trackingGain}% Annual Energy
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      Added cost: tracker hardware, motors, maintenance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Tracking Economics
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              The Economics of Solar Tracking
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Tracking Gain</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>15-25% more energy from single-axis tracking</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Single-axis trackers rotate panels east-to-west, keeping them perpendicular to the sun for more hours. The gain comes primarily from morning and evening capture — exactly when fixed panels are at the worst angle. In high DNI locations, gains can reach 25%.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Trade-Off: Complexity vs Energy</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Trackers add $0.05-0.10/W in hardware costs, require motors and controllers, need maintenance (stow algorithms for wind, motor replacement), and use wider GCR (more land). The question is whether the 15-25% energy gain justifies the 10-15% cost increase. In most US utility markets today, the answer is yes — trackers dominate new builds.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Solar deployment is an optimization problem with many interacting variables: GCR, tilt, tracking, DC/AC ratio, bifacial gain, soiling, and degradation all compound. A 1% improvement in any parameter, multiplied across gigawatts of capacity over 30 years, translates to billions of dollars. This is why solar engineering is a precision discipline.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Solar Deployment"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
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
                      // Auto-advance to next uncompleted app or test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1) {
                        // All apps completed, advance to test
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
                      }
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
              ← Back
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

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand solar deployment design and the physics of energy optimization!' : 'Review the concepts and try again.'}
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
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Solar Deployment
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of solar farm design to real-world engineering scenarios. Each question presents a practical situation involving GHI/DNI/DHI, optimal tilt, DC/AC ratio, inverter clipping, bifacial gain, soiling, and other key solar parameters. Consider the trade-offs between capacity density and per-panel yield as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
                ← Previous
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

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Solar Deployment Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how ground coverage ratio, tilt angle, tracking systems, and solar resource optimization combine to maximize energy yield in utility-scale solar farms.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'GCR optimization: balancing capacity density vs shading',
                'Single-axis tracking: 15-25% energy gain over fixed-tilt',
                'DC/AC ratio and inverter clipping trade-offs',
                'GHI = DNI + DHI: understanding solar resource',
                'Bifacial gain, soiling losses, and degradation rates',
                'Real-world deployment at Bhadla, Ivanpah, and beyond',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
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

export default ELON_SolarDeploymentRenderer;
