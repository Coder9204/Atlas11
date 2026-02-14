'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Humidity & ESD Control - Complete 10-Phase Game
// Why dry air makes you shock everyone and humid air saves electronics
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

interface HumidityESDRendererProps {
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
    scenario: "It's a cold January morning and the indoor heating has been running all night. The relative humidity inside your home has dropped to 15%.",
    question: "Why does low humidity cause increased static electricity buildup?",
    options: [
      { id: 'a', label: "Cold air holds more electrical charge than warm air" },
      { id: 'b', label: "Dry air is an excellent insulator, preventing charge from dissipating and allowing it to accumulate on surfaces", correct: true },
      { id: 'c', label: "Low humidity creates more friction between surfaces" },
      { id: 'd', label: "Water molecules in humid air generate static electricity" }
    ],
    explanation: "Dry air acts as an excellent electrical insulator. When humidity is low, there are fewer water molecules in the air to provide a conductive path for static charges to dissipate."
  },
  {
    scenario: "You've been walking across a carpeted office floor on a dry winter day. As you reach for the metal doorknob, you see a bright spark jump from your finger and feel a sharp zap.",
    question: "What voltage level did that static shock likely reach?",
    options: [
      { id: 'a', label: "About 12 volts, similar to a car battery" },
      { id: 'b', label: "Around 120 volts, like a wall outlet" },
      { id: 'c', label: "Between 3,000 and 25,000 volts", correct: true },
      { id: 'd', label: "Less than 1 volt, barely enough to feel" }
    ],
    explanation: "Visible static sparks typically indicate voltages between 3,000 and 25,000 volts. The current is very low (microamps), which is why it's startling but not dangerous to humans."
  },
  {
    scenario: "A technician is about to replace a RAM module in a server. The data center maintains 50% relative humidity, but the technician skips wearing an ESD wrist strap.",
    question: "What is the risk of handling the RAM module without ESD protection?",
    options: [
      { id: 'a', label: "No risk - 50% humidity completely eliminates static" },
      { id: 'b', label: "Even unfelt static discharges below 100V can damage sensitive CMOS components", correct: true },
      { id: 'c', label: "The only risk is if the technician feels a shock" },
      { id: 'd', label: "RAM modules are immune to ESD damage" }
    ],
    explanation: "Modern CMOS chips can be damaged by ESD events as low as 10-100 volts - far below human perception. Latent damage may not cause immediate failure but leads to premature failure."
  },
  {
    scenario: "A semiconductor cleanroom maintains humidity at exactly 45% +/- 2% RH with continuous monitoring and backup systems.",
    question: "Why is such precise humidity control critical in semiconductor manufacturing?",
    options: [
      { id: 'a', label: "Worker comfort requires exact humidity levels" },
      { id: 'b', label: "Precise humidity prevents ESD damage while avoiding condensation contamination", correct: true },
      { id: 'c', label: "It's primarily for reducing static cling on cleanroom suits" },
      { id: 'd', label: "Humidity variations affect chip coloring and appearance" }
    ],
    explanation: "Nanometer-scale transistors can be destroyed by undetectable ESD events. Water condensation would introduce contamination particles. The tight tolerance keeps both risks minimized."
  },
  {
    scenario: "During winter, a homeowner notices they get shocked frequently when touching metal objects. They consider buying a humidifier.",
    question: "What is the optimal indoor humidity range to prevent both static shocks and humidity-related problems?",
    options: [
      { id: 'a', label: "10-20% RH - as dry as possible to prevent mold" },
      { id: 'b', label: "80-90% RH - maximum humidity eliminates all static" },
      { id: 'c', label: "40-60% RH - balances static prevention with condensation and mold risk", correct: true },
      { id: 'd', label: "Humidity level doesn't matter for static prevention" }
    ],
    explanation: "The 40-60% RH range is optimal. Below 40%, static becomes problematic. Above 60%, condensation leads to mold growth, wood warping, and in electronics, corrosion and short circuits."
  },
  {
    scenario: "An engineer is selecting materials for a product. They reference the triboelectric series, which ranks materials by their tendency to gain or lose electrons.",
    question: "Which material combination would generate the MOST static electricity when rubbed together?",
    options: [
      { id: 'a', label: "Cotton rubbed against cotton" },
      { id: 'b', label: "Glass (highly positive) rubbed against Teflon (highly negative)", correct: true },
      { id: 'c', label: "Aluminum rubbed against steel" },
      { id: 'd', label: "Wood rubbed against paper" }
    ],
    explanation: "When materials far apart on the triboelectric series contact and separate, maximum charge transfer occurs. Glass is near the positive end, Teflon at the extreme negative end."
  },
  {
    scenario: "A contract manufacturer is setting up a new production line for circuit boards. They need comprehensive ESD protection beyond humidity control.",
    question: "Which combination provides the most effective ESD protection?",
    options: [
      { id: 'a', label: "High humidity (80%) alone is sufficient protection" },
      { id: 'b', label: "ESD-safe flooring, grounded workstations, wrist straps, ionizers, humidity control, and conductive packaging", correct: true },
      { id: 'c', label: "Rubber-soled shoes and wooden workbenches" },
      { id: 'd', label: "Air conditioning set to maximum cooling" }
    ],
    explanation: "Effective ESD control requires multiple layers - defense in depth ensures components remain protected even if one control fails."
  },
  {
    scenario: "At a fuel depot, static discharge warnings are posted everywhere. Grounding procedures must be followed even on humid summer days.",
    question: "Why is static electricity particularly dangerous in fuel handling?",
    options: [
      { id: 'a', label: "Static makes fuel flow more slowly" },
      { id: 'b', label: "Fuel vapors create explosive atmospheres ignitable by sparks as small as 0.2 millijoules", correct: true },
      { id: 'c', label: "Static changes the chemical composition of fuel" },
      { id: 'd', label: "It's only a concern for jet fuel, not gasoline" }
    ],
    explanation: "Fuel vapors have extremely low minimum ignition energies. Gasoline vapor can ignite from sparks containing less than 0.2 millijoules, far less than a typical static discharge."
  },
  {
    scenario: "An electronics distributor ships components in special pink or silver bags. A customer asks why they can't use regular plastic bags.",
    question: "What makes antistatic packaging effective at protecting electronics?",
    options: [
      { id: 'a', label: "The color reflects harmful radiation" },
      { id: 'b', label: "Antistatic materials allow charge to dissipate slowly; static-shielding bags block external fields", correct: true },
      { id: 'c', label: "The bags are airtight to prevent humidity changes" },
      { id: 'd', label: "Regular plastic is too thin for physical protection" }
    ],
    explanation: "Regular plastic accumulates static charge. Pink antistatic bags have reduced surface resistivity. Silver static-shielding bags create a Faraday cage blocking external fields."
  },
  {
    scenario: "A data center in Arizona experiences humidity dropping to 25% during summer when the AC runs constantly. The facility manager notices increased server errors.",
    question: "What is the relationship between the AC system and the low humidity problem?",
    options: [
      { id: 'a', label: "AC systems generate static electricity directly" },
      { id: 'b', label: "Cooling air reduces its moisture-holding capacity, causing condensation removal and lower indoor humidity", correct: true },
      { id: 'c', label: "AC systems pump humidity outside" },
      { id: 'd', label: "There is no relationship between AC and humidity" }
    ],
    explanation: "Air conditioning works by cooling air below its dew point, causing moisture to condense on coils. This dehumidified air, when reheated, has very low relative humidity."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💾',
    title: 'Semiconductor Manufacturing',
    short: 'Where a 100V spark kills million-dollar wafers',
    tagline: 'Cleanrooms are humidity-controlled fortresses',
    description: 'Chip fabrication requires precise humidity control (40-60% RH) to prevent ESD damage to nanometer-scale transistors. A single static discharge can destroy thousands of chips on a wafer worth millions.',
    connection: 'The humidity-ESD relationship you explored is critical here: too dry allows charge buildup that arcs across microscopic gaps; too humid causes particle contamination and corrosion.',
    howItWorks: 'Cleanrooms maintain 45% RH using HVAC systems with humidifiers and dehumidifiers. Workers wear grounded suits and wrist straps. Ionizers neutralize surface charges.',
    stats: [
      { value: '45% RH', label: 'Target humidity', icon: '💧' },
      { value: '<10V', label: 'Damage threshold', icon: '⚡' },
      { value: '$100M+', label: 'Cleanroom cost', icon: '💰' }
    ],
    examples: ['Intel fabs', 'TSMC cleanrooms', 'Samsung foundries', 'ASML lithography'],
    companies: ['TSMC', 'Intel', 'Samsung', 'Applied Materials'],
    futureImpact: 'As transistors shrink below 2nm, humidity control within +/-2% RH becomes mandatory.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Operating Room Environment',
    short: 'Balancing infection control with static safety',
    tagline: 'Where sparks near oxygen can be explosive',
    description: 'Operating rooms maintain 30-60% RH to balance infection risk, ESD prevention near electronic equipment, and fire safety around supplemental oxygen and anesthetic gases.',
    connection: 'The trade-off you learned - low humidity increases ESD, high humidity enables microbes - plays out critically in surgical settings with sensitive equipment.',
    howItWorks: 'HVAC systems with HEPA filtration control humidity precisely. Conductive flooring grounds personnel. All equipment is tested for ESD safety near oxygen.',
    stats: [
      { value: '30-60%', label: 'OR humidity range', icon: '💧' },
      { value: '20/hr', label: 'Air changes', icon: '💨' },
      { value: '$20M', label: 'OR build cost', icon: '💰' }
    ],
    examples: ['Cardiac surgery suites', 'Neurosurgery ORs', 'Laser surgery rooms', 'Hybrid operating rooms'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Stryker'],
    futureImpact: 'Smart OR systems will dynamically adjust humidity based on procedure type and real-time ESD monitoring.',
    color: '#22C55E'
  },
  {
    icon: '💻',
    title: 'Data Center Operations',
    short: 'Protecting servers from static and corrosion',
    tagline: 'Humidity determines uptime',
    description: 'Data centers maintain 40-60% RH across thousands of square feet of servers. Too dry causes ESD damage; too humid causes condensation, corrosion, and electrical shorts.',
    connection: 'Your simulation showed the ESD risk curve - data centers operate in the sweet spot where charge dissipation is sufficient but condensation does not occur.',
    howItWorks: 'Precision cooling units control temperature and humidity. Sensors monitor continuously. Ultrasonic humidifiers add moisture without water droplets.',
    stats: [
      { value: '40-60%', label: 'Target RH range', icon: '💧' },
      { value: '$10M/hr', label: 'Outage cost', icon: '💰' },
      { value: '99.999%', label: 'Uptime target', icon: '📊' }
    ],
    examples: ['Google data centers', 'AWS facilities', 'Microsoft Azure', 'Facebook infrastructure'],
    companies: ['Equinix', 'Digital Realty', 'Vertiv', 'Schneider Electric'],
    futureImpact: 'AI-controlled environmental systems will predict and prevent humidity excursions before they cause damage.',
    color: '#8B5CF6'
  },
  {
    icon: '📦',
    title: 'Electronics Packaging & Shipping',
    short: 'Protecting components before they reach you',
    tagline: 'The pink bag has a purpose',
    description: 'Electronic components are packaged in antistatic (pink) or static-shielding (silver) bags. Humidity indicator cards monitor conditions, desiccants control moisture.',
    connection: 'Since shipping environments have uncontrolled humidity, packaging must protect against both low-humidity ESD (antistatic bags) and high-humidity corrosion (desiccants).',
    howItWorks: 'Static-shielding bags form a Faraday cage. Antistatic bags bleed charge slowly. Humidity indicator cards change color at thresholds. Desiccants maintain <30% RH inside.',
    stats: [
      { value: '$5B', label: 'Annual ESD damage', icon: '💰' },
      { value: '<20%', label: 'Dry pack RH', icon: '💧' },
      { value: '10+ yrs', label: 'Shelf life possible', icon: '⏰' }
    ],
    examples: ['Chip packaging', 'PCB shipping', 'Hard drive storage', 'Medical device transport'],
    companies: ['Desco', 'SCS Static Control', 'Protektive Pak', '3M'],
    futureImpact: 'Smart packaging with IoT sensors will track ESD events and humidity throughout the supply chain.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const HumidityESDRenderer: React.FC<HumidityESDRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Play phase
  const [humidity, setHumidity] = useState(50);
  const [temperature, setTemperature] = useState(22);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showSpark, setShowSpark] = useState(false);

  // Twist phase - condensation scenario
  const [twistHumidity, setTwistHumidity] = useState(70);
  const [coldSurfaceTemp, setColdSurfaceTemp] = useState(15);

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

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Calculate dew point using Magnus formula
  const calculateDewPoint = useCallback((temp: number, rh: number): number => {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100);
    return (b * alpha) / (a - alpha);
  }, []);

  // Calculate ESD risk based on humidity
  const getESDRisk = useCallback((rh: number) => {
    if (rh < 20) return { level: 'CRITICAL', voltage: 25000, color: '#EF4444' };
    if (rh < 30) return { level: 'HIGH', voltage: 15000, color: '#F97316' };
    if (rh < 40) return { level: 'MODERATE', voltage: 5000, color: '#F59E0B' };
    if (rh < 60) return { level: 'LOW', voltage: 1500, color: '#22C55E' };
    return { level: 'MINIMAL', voltage: 500, color: '#3B82F6' };
  }, []);

  const esdRisk = getESDRisk(humidity);
  const dewPoint = calculateDewPoint(temperature, humidity);
  const twistDewPoint = calculateDewPoint(22, twistHumidity);
  const hasCondensation = coldSurfaceTemp <= twistDewPoint;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber for ESD/spark theme
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#e2e8f0',
    border: '#2a2a3a',
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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Condensation',
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
        gameType: 'humidity-esd',
        gameTitle: 'Humidity & ESD Control',
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
  }, [phase, goToPhase, phaseOrder]);

  // Trigger spark effect
  const triggerSpark = useCallback(() => {
    if (humidity < 40) {
      setShowSpark(true);
      playSound('click');
      setTimeout(() => setShowSpark(false), 400);
    }
  }, [humidity]);

  // Navigation bar component with fixed position top
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: `1px solid ${colors.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: colors.bgPrimary,
      }}>
        <div style={{
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Phase label */}
      <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
        {phaseLabels[phase]}
      </span>

      {/* Phase indicator */}
      <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
        {phaseOrder.indexOf(phase) + 1} of {phaseOrder.length}
      </span>
    </nav>
  );

  // Progress bar (alias for renderNavBar for backwards compatibility)
  const renderProgressBar = () => renderNavBar();

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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Secondary button style for consistent min height
  const secondaryButtonStyle: React.CSSProperties = {
    minHeight: '44px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ESD VISUALIZATION COMPONENT
  // ─────────────────────────────────────────────────────────────────────────────
  const ESDVisualization = ({ isStatic = false }: { isStatic?: boolean }) => {
    const width = 480;
    const height = 320;
    const displayHumidity = isStatic ? 50 : humidity;
    const waterMolecules = Math.floor(displayHumidity / 5);
    const chargeIntensity = displayHumidity < 40 ? (40 - displayHumidity) / 40 : 0;
    const displayEsdRisk = getESDRisk(displayHumidity);

    return (
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: `${width}px` }}
        role="img"
        aria-label="ESD Risk Visualization showing humidity effect on static electricity"
      >
        <defs>
          <linearGradient id="airGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="vaporGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="chargeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="personGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <radialGradient id="metalGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#airGrad)" rx="12" />

        {/* Water vapor particles */}
        {[...Array(waterMolecules)].map((_, i) => {
          const baseX = 30 + (i % 10) * (width / 12);
          const baseY = 30 + Math.floor(i / 10) * 35;
          const x = baseX + Math.sin(animationFrame / 20 + i) * 10;
          const y = baseY + Math.cos(animationFrame / 25 + i) * 8;
          const size = 3 + Math.sin(animationFrame / 15 + i) * 1;
          const opacity = 0.3 + Math.sin(animationFrame / 30 + i) * 0.2;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={size}
              fill="#93c5fd"
              opacity={opacity}
            />
          );
        })}

        {/* Person silhouette */}
        <g transform={`translate(${width * 0.25}, ${height * 0.4})`}>
          <ellipse cx="0" cy="0" rx="12" ry="16" fill="url(#personGrad)" />
          <rect x="-20" y="16" width="40" height="55" fill="url(#personGrad)" rx="8" />
          <rect x="15" y="28" width="45" height="10" fill="url(#personGrad)" rx="5" transform="rotate(-10)" />
          <rect x="-28" y="24" width="12" height="40" fill="url(#personGrad)" rx="4" />

          {/* Charge buildup aura */}
          {humidity < 40 && (
            <ellipse
              cx="0"
              cy="30"
              rx={30 + chargeIntensity * 15}
              ry={45 + chargeIntensity * 15}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              opacity={0.3 + chargeIntensity * 0.4}
              strokeDasharray="4,4"
            >
              <animate attributeName="stroke-dashoffset" values="0;8" dur="0.4s" repeatCount="indefinite" />
            </ellipse>
          )}

          {/* Floating charge symbols */}
          {humidity < 40 && [...Array(Math.floor((40 - humidity) / 8))].map((_, i) => {
            const angle = (animationFrame / 15 + i * 72) * (Math.PI / 180);
            const radius = 35;
            const cx = Math.cos(angle) * radius;
            const cy = 25 + Math.sin(angle) * radius * 0.6;
            return (
              <g key={i} transform={`translate(${cx}, ${cy})`}>
                <circle r="7" fill="url(#chargeGlow)" opacity={0.7} />
                <text textAnchor="middle" dominantBaseline="central" fill="#fef3c7" fontSize="9" fontWeight="bold">+</text>
              </g>
            );
          })}
        </g>

        {/* Doorknob/metal surface */}
        <g transform={`translate(${width * 0.7}, ${height * 0.5})`}>
          <rect x="-6" y="-50" width="12" height="100" fill="#374151" rx="2" />
          <rect x="6" y="-50" width="60" height="100" fill="#1f2937" rx="4" />
          <circle cx="0" cy="0" r="20" fill="#4b5563" />
          <circle cx="0" cy="0" r="17" fill="url(#metalGrad)" />
          <ellipse cx="-5" cy="-5" rx="6" ry="4" fill="#e5e7eb" opacity="0.3" />

          {/* Spark effect */}
          {showSpark && (
            <g filter="url(#glowFilter)">
              <path
                d="M -17 0 L -30 -6 L -25 0 L -40 -10 L -32 -3 L -50 -5"
                fill="none"
                stroke="url(#sparkGrad)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M -17 0 L -32 4 L -28 0 L -42 8 L -35 3 L -48 5"
                fill="none"
                stroke="url(#sparkGrad)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="-25" cy="0" r="15" fill="#fef08a" opacity="0.5">
                <animate attributeName="r" values="10;20;10" dur="0.2s" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.2s" />
              </circle>
            </g>
          )}

          {/* Continuous micro-discharge when very dry */}
          {!isStatic && displayHumidity < 25 && !showSpark && (
            <path
              d={`M -17 0 L ${-25 - Math.sin(animationFrame / 3) * 4} ${Math.cos(animationFrame / 4) * 6}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              opacity={0.4 + Math.sin(animationFrame / 5) * 0.2}
            />
          )}
        </g>

        {/* Humidity meter */}
        <g transform={`translate(${width - 45}, 25)`}>
          <rect x="0" y="0" width="25" height={height - 70} fill="#1f2937" rx="4" stroke="#374151" />
          <rect
            x="3"
            y={height - 73 - (displayHumidity / 100) * (height - 80)}
            width="19"
            height={(displayHumidity / 100) * (height - 80)}
            fill={displayEsdRisk.color}
            rx="2"
          />
          {[0, 20, 40, 60, 80, 100].map(val => (
            <g key={val} transform={`translate(0, ${height - 73 - (val / 100) * (height - 80)})`}>
              <line x1="0" y1="0" x2="-5" y2="0" stroke={colors.textMuted} strokeWidth="1" />
              <text x="-8" y="3" fill="#e2e8f0" fontSize="8" textAnchor="end">{val}</text>
            </g>
          ))}
        </g>

        {/* Stats display */}
        <g transform={`translate(15, ${height - 55})`}>
          <rect x="0" y="0" width={width - 30} height="45" fill="#0f172a" rx="8" stroke="#334155" />
          <g transform="translate(20, 15)">
            <text fill="#e2e8f0" fontSize="9">HUMIDITY</text>
            <text y="15" fill={displayEsdRisk.color} fontSize="14" fontWeight="bold">{displayHumidity}% RH</text>
          </g>
          <g transform={`translate(${(width - 30) * 0.3}, 15)`}>
            <text fill="#e2e8f0" fontSize="9">ESD RISK</text>
            <text y="15" fill={displayEsdRisk.color} fontSize="14" fontWeight="bold">{displayEsdRisk.level}</text>
          </g>
          <g transform={`translate(${(width - 30) * 0.55}, 15)`}>
            <text fill="#e2e8f0" fontSize="9">MAX VOLTAGE</text>
            <text y="15" fill={displayEsdRisk.color} fontSize="14" fontWeight="bold">{(displayEsdRisk.voltage / 1000).toFixed(0)}kV</text>
          </g>
          <g transform={`translate(${(width - 30) * 0.8}, 15)`}>
            <text fill="#e2e8f0" fontSize="9">DEW POINT</text>
            <text y="15" fill="#60a5fa" fontSize="14" fontWeight="bold">{dewPoint.toFixed(1)}C</text>
          </g>
        </g>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CONDENSATION VISUALIZATION COMPONENT
  // ─────────────────────────────────────────────────────────────────────────────
  const CondensationVisualization = () => {
    const width = 480;
    const height = 320;
    const condensationIntensity = hasCondensation ? Math.min(1, (twistDewPoint - coldSurfaceTemp) / 10) : 0;

    return (
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: `${width}px` }}
        role="img"
        aria-label="Condensation Visualization showing humidity and temperature interaction"
      >
        <defs>
          <linearGradient id="condBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <radialGradient id="dropletGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </radialGradient>
          <filter id="dropGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#condBg)" rx="12" />

        {/* Ambient vapor particles */}
        {[...Array(Math.floor(twistHumidity / 6))].map((_, i) => {
          const x = 20 + (i % 15) * (width / 16) + Math.sin(animationFrame / 25 + i) * 6;
          const y = 15 + Math.floor(i / 15) * 30 + Math.cos(animationFrame / 30 + i) * 5;
          const opacity = 0.15 + Math.sin(animationFrame / 20 + i * 0.7) * 0.1;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2}
              fill="#93c5fd"
              opacity={opacity}
            />
          );
        })}

        {/* Cold pipe/surface */}
        <g transform={`translate(${width * 0.15}, ${height * 0.35})`}>
          <ellipse cx={width * 0.35} cy="45" rx={width * 0.32} ry="6" fill="#000000" opacity="0.2" />
          <rect x="0" y="0" width={width * 0.7} height="40" fill="url(#pipeGrad)" rx="20" />
          <rect x="5" y="5" width={width * 0.68} height="8" fill="#94a3b8" opacity="0.2" rx="4" />

          {/* Frost effect when cold */}
          {coldSurfaceTemp < 12 && (
            <rect
              x="0"
              y="0"
              width={width * 0.7}
              height="40"
              fill="#e0f2fe"
              opacity={0.15 + (12 - coldSurfaceTemp) * 0.02}
              rx="20"
            />
          )}

          {/* Condensation droplets */}
          {hasCondensation && [...Array(Math.floor(condensationIntensity * 12))].map((_, i) => {
            const dropX = 15 + i * (width * 0.055);
            const dropY = 40 + Math.sin(animationFrame / 10 + i * 2) * 2;
            const dropSize = 4 + condensationIntensity * 3 + Math.sin(animationFrame / 15 + i) * 1.5;

            return (
              <g key={i} filter="url(#dropGlow)">
                <ellipse
                  cx={dropX}
                  cy={dropY}
                  rx={dropSize * 0.7}
                  ry={dropSize}
                  fill="url(#dropletGrad)"
                  opacity={0.7 + Math.sin(animationFrame / 20 + i) * 0.2}
                />
              </g>
            );
          })}

          {/* Falling droplets when heavy condensation */}
          {condensationIntensity > 0.5 && [...Array(3)].map((_, i) => {
            const fallY = ((animationFrame * 2 + i * 50) % 100);
            if (fallY < 60) {
              return (
                <ellipse
                  key={`fall-${i}`}
                  cx={50 + i * 80}
                  cy={45 + fallY}
                  rx={2}
                  ry={4}
                  fill="#60a5fa"
                  opacity={0.6}
                />
              );
            }
            return null;
          })}
        </g>

        {/* Temperature indicators */}
        <g transform={`translate(20, ${height - 95})`}>
          <rect x="0" y="0" width={width - 40} height="80" fill="#0f172a" rx="8" stroke="#334155" />

          {/* Temperature scale */}
          <g transform="translate(20, 20)">
            <text fill={colors.textMuted} fontSize="10">COLD SURFACE</text>
            <rect x="0" y="12" width={width - 100} height="8" fill="#1f2937" rx="4" />
            <rect
              x="0"
              y="12"
              width={((coldSurfaceTemp + 5) / 35) * (width - 100)}
              height="8"
              fill={coldSurfaceTemp <= twistDewPoint ? '#3B82F6' : '#10B981'}
              rx="4"
            />
            <text x={width - 90} y="20" fill={coldSurfaceTemp <= twistDewPoint ? '#3B82F6' : '#10B981'} fontSize="12" fontWeight="bold">
              {coldSurfaceTemp}C
            </text>
          </g>

          {/* Dew point indicator */}
          <g transform="translate(20, 50)">
            <text fill={colors.textMuted} fontSize="10">DEW POINT: {twistDewPoint.toFixed(1)}C</text>
            <text x={width - 90} y="0" fill={hasCondensation ? '#EF4444' : '#10B981'} fontSize="12" fontWeight="bold">
              {hasCondensation ? 'CONDENSING' : 'DRY'}
            </text>
          </g>
        </g>

        {/* Status badge */}
        <g transform={`translate(${width / 2}, 30)`}>
          <rect
            x="-60"
            y="-12"
            width="120"
            height="24"
            fill={hasCondensation ? '#EF444433' : '#10B98133'}
            rx="12"
            stroke={hasCondensation ? '#EF4444' : '#10B981'}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={hasCondensation ? '#EF4444' : '#10B981'}
            fontSize="12"
            fontWeight="bold"
          >
            {hasCondensation ? 'CONDENSATION RISK' : 'SAFE ZONE'}
          </text>
        </g>
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
      }}>
        {renderNavBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡💧
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Humidity & Static Electricity
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "You shuffle across the carpet in winter and ZAP - a 15,000 volt shock jumps to the doorknob. Why does <span style={{ color: colors.accent }}>dry air</span> turn you into a walking Tesla coil?"
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
            "The same humidity that prevents your winter shocks can destroy a $500 million chip fab if not controlled precisely. It's a balance between too little and too much."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — ESD Control Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore ESD Physics →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Humidity has no effect - static comes from friction only' },
      { id: 'b', text: 'Low humidity INCREASES static - dry air can not dissipate charges', correct: true },
      { id: 'c', text: 'Low humidity DECREASES static - water vapor creates friction' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            Indoor humidity drops from 50% to 15% during winter. What happens to static electricity buildup?
          </h2>

          {/* Static SVG diagram for prediction */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <ESDVisualization isStatic={true} />
          </div>

          {/* Options */}
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
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive ESD Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            ESD Risk Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust humidity and temperature to see how ESD risk changes. Click the doorknob to trigger a discharge.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div onClick={triggerSpark} style={{ cursor: humidity < 40 ? 'pointer' : 'default' }}>
                <ESDVisualization />
              </div>
            </div>

            {/* Humidity slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Relative Humidity</span>
                <span style={{ ...typo.small, color: esdRisk.color, fontWeight: 600 }}>{humidity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={humidity}
                onChange={(e) => setHumidity(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.error} 0%, ${colors.warning} 30%, ${colors.success} 50%, ${colors.accent} 100%)`,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.error }}>Dry (High ESD)</span>
                <span style={{ ...typo.small, color: colors.success }}>Optimal</span>
                <span style={{ ...typo.small, color: colors.accent }}>Humid</span>
              </div>
            </div>

            {/* Temperature slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Room Temperature</span>
                <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{temperature}C</span>
              </div>
              <input
                type="range"
                min="15"
                max="30"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Status display */}
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
                <div style={{ ...typo.h3, color: esdRisk.color }}>{esdRisk.level}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>ESD Risk</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: esdRisk.color }}>{(esdRisk.voltage / 1000).toFixed(0)}kV</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Max Discharge</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: '#60a5fa' }}>{dewPoint.toFixed(1)}C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Dew Point</div>
              </div>
            </div>
          </div>

          {/* Discovery prompts */}
          {humidity >= 40 && humidity <= 60 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                40-60% RH is the "Goldilocks zone" - charges dissipate but no condensation risk!
              </p>
            </div>
          )}

          {humidity < 30 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                DANGER: At {humidity}% RH, static voltages can reach {(esdRisk.voltage / 1000).toFixed(0)}kV - enough to destroy sensitive electronics!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics →
          </button>
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
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Humidity Controls ESD
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Science:</strong> Air acts as an electrical insulator. Water vapor molecules in humid air provide a conductive path for static charges to dissipate.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.error }}>Low humidity (below 30%)</span>: Charge accumulates on surfaces with nowhere to go. Walking across carpet can generate 25,000+ volts.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.success }}>Optimal humidity (40-60%)</span>: Water molecules form a thin conductive layer on surfaces, allowing charges to bleed off continuously.
              </p>
              <p>
                <span style={{ color: colors.accent }}>High humidity (above 60%)</span>: ESD risk is minimal, but new problems emerge - condensation, corrosion, and mold growth.
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
              Key Insight: Voltage Thresholds
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Human perception:</strong> We feel shocks above ~3,000V
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>CMOS damage:</strong> Chips can be destroyed by as little as 10-100V
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong>The problem:</strong> You can damage electronics without ever feeling a shock!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Condensation Problem →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Higher humidity is always better - it eliminates all static' },
      { id: 'b', text: 'Too much humidity causes condensation when surfaces are cold', correct: true },
      { id: 'c', text: 'Humidity only matters for ESD, not for equipment operation' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Cold Surfaces
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A data center increases humidity to 70% to prevent ESD. But servers have cold heat sinks. What's the risk?
          </h2>

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
              See the Condensation Effect →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Condensation Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how humidity and cold surfaces interact to cause condensation
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CondensationVisualization />
            </div>

            {/* Humidity slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Ambient Humidity</span>
                <span style={{ ...typo.small, color: '#60a5fa', fontWeight: 600 }}>{twistHumidity}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                value={twistHumidity}
                onChange={(e) => setTwistHumidity(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Cold surface temperature slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Cold Surface Temperature</span>
                <span style={{ ...typo.small, color: hasCondensation ? colors.error : colors.success, fontWeight: 600 }}>{coldSurfaceTemp}C</span>
              </div>
              <input
                type="range"
                min="-5"
                max="30"
                value={coldSurfaceTemp}
                onChange={(e) => setColdSurfaceTemp(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Cold (AC coil)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Warm (Room temp)</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: '#60a5fa' }}>{twistDewPoint.toFixed(1)}C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Dew Point</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: hasCondensation ? colors.error : colors.success }}>
                  {hasCondensation ? 'YES' : 'NO'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Condensation</div>
              </div>
            </div>
          </div>

          {hasCondensation && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Surface temp ({coldSurfaceTemp}C) is below dew point ({twistDewPoint.toFixed(1)}C) - water is condensing!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Trade-off →
          </button>
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Humidity Balancing Act
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Too Dry (below 40%)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Static charges accumulate to dangerous levels. ESD can destroy sensitive electronics. Common in winter with heating.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>✓</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Optimal (40-60%)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Charges dissipate continuously. No condensation risk at normal temperatures. This is the target for data centers and fabs.
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Too Humid (above 60%)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Condensation forms on cold surfaces causing shorts and corrosion. Mold and bacteria thrive. Equipment reliability suffers.
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
              Why This Matters in Real Facilities
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Data centers spend millions on HVAC systems that can maintain humidity within +/-2% of target. A single excursion outside the safe zone can cause equipment failures worth far more than the environmental controls.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                How Humidity Control Connects:
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

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
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
                ? 'You understand humidity and ESD control!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                style={primaryButtonStyle}
              >
                Review & Try Again
              </button>
            )}
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          ESD Control Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the delicate balance between humidity, static electricity, and condensation that protects billions of dollars in electronics.
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
              'Low humidity allows dangerous static buildup',
              'High humidity risks condensation and corrosion',
              '40-60% RH is the optimal range',
              'CMOS chips can be damaged by unfelt discharges',
              'Why data centers control humidity precisely',
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
    );
  }

  return null;
};

export default HumidityESDRenderer;
