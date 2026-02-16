'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Fan Laws - Complete 10-Phase Game
// Understanding how fan speed affects airflow, pressure, and power
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

interface FanLawsRendererProps {
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
    scenario: "A data center cooling system needs 20% more airflow to handle increased server loads. An engineer proposes simply increasing fan speed from 1000 RPM to 1200 RPM.",
    question: "By what percentage will the power consumption increase?",
    options: [
      { id: 'a', label: "20% (proportional to airflow increase)" },
      { id: 'b', label: "44% (square of the speed ratio)" },
      { id: 'c', label: "73% (cube of the speed ratio)", correct: true },
      { id: 'd', label: "100% (double speed means double power)" }
    ],
    explanation: "Fan power follows the cube law: P2/P1 = (N2/N1)^3. A 20% speed increase (1.2x) means power increases by 1.2^3 = 1.73 = 73% more power. This cubic relationship makes speed increases very expensive energy-wise."
  },
  {
    scenario: "An HVAC technician is troubleshooting a ventilation system that's not delivering enough airflow. They measure 800 CFM but need 1000 CFM. The fan is currently running at 50% speed.",
    question: "What fan speed setting would achieve the required airflow?",
    options: [
      { id: 'a', label: "62.5% (linear proportion)", correct: true },
      { id: 'b', label: "79% (square root relationship)" },
      { id: 'c', label: "70% (estimated middle ground)" },
      { id: 'd', label: "100% (maximum to ensure enough)" }
    ],
    explanation: "Airflow is proportional to speed (first fan law): Q2/Q1 = N2/N1. To get 1000/800 = 1.25x more airflow, increase speed by 1.25x. So 50% x 1.25 = 62.5% speed."
  },
  {
    scenario: "A building's exhaust fan system uses variable frequency drives (VFDs). Management asks why reducing fan speed to 80% saves so much more than 20% on the energy bill.",
    question: "What explains the disproportionate energy savings?",
    options: [
      { id: 'a', label: "VFDs are most efficient at reduced speeds" },
      { id: 'b', label: "Fan power varies with the cube of speed, so 80% speed uses only 51% power", correct: true },
      { id: 'c', label: "The building's HVAC system has a minimum power threshold" },
      { id: 'd', label: "Lower speeds reduce friction in the ductwork" }
    ],
    explanation: "The third fan law states power is proportional to speed cubed. At 80% speed: 0.8^3 = 0.512, meaning power drops to 51.2% - a 49% reduction for only 20% less airflow. This cubic relationship makes VFDs extremely cost-effective for HVAC."
  },
  {
    scenario: "An engineer is sizing fans for a cleanroom. They have a choice between one large fan at 100% speed or two smaller fans each at 70% speed, both providing the same total airflow.",
    question: "Which option uses less total power?",
    options: [
      { id: 'a', label: "One large fan - fewer motors means higher efficiency" },
      { id: 'b', label: "Two smaller fans at 70% speed - cubic law makes this much more efficient", correct: true },
      { id: 'c', label: "Both use the same power since they move the same air" },
      { id: 'd', label: "Cannot determine without knowing fan specifications" }
    ],
    explanation: "Two fans at 70% each: Power = 2 x 0.7^3 = 2 x 0.343 = 0.686 (68.6% of single fan power). One fan at 100%: 1.0^3 = 1.0. Two slower fans use 31% less power for the same airflow - this is why large systems use multiple parallel fans."
  },
  {
    scenario: "A gaming PC builder notices their case fans spin up to 100% speed but temperatures only improve slightly compared to 70% speed.",
    question: "Why do diminishing returns occur at high fan speeds?",
    options: [
      { id: 'a', label: "The thermal mass of components limits heat transfer rate" },
      { id: 'b', label: "Airflow increases linearly but cooling effectiveness has diminishing returns while power consumption grows cubically", correct: true },
      { id: 'c', label: "Fan motors become less efficient at high RPM" },
      { id: 'd', label: "Turbulent airflow at high speeds reduces cooling" }
    ],
    explanation: "Going from 70% to 100% speed increases airflow by 43% but increases power by 2.9x (1/0.343). Heat transfer doesn't scale 1:1 with airflow due to thermal resistance limits. The cubic power cost usually isn't worth the marginal cooling gain."
  },
  {
    scenario: "A factory replaces its 10-year-old fans with modern high-efficiency units. The new fans move the same air but the motors are rated at 15% less power. The engineer also reduces speed by 10%.",
    question: "What is the total power reduction compared to the original system?",
    options: [
      { id: 'a', label: "25% (15% + 10% roughly)" },
      { id: 'b', label: "38% (15% efficiency + 27% from speed reduction)", correct: true },
      { id: 'c', label: "15% (only the motor efficiency matters)" },
      { id: 'd', label: "10% (only the speed reduction matters)" }
    ],
    explanation: "Speed reduction: 0.9^3 = 0.729 (27% power reduction). Combined with 15% efficiency gain: 0.729 x 0.85 = 0.62 or 38% total reduction. Fan laws compound with motor efficiency improvements for dramatic savings."
  },
  {
    scenario: "An aerospace engineer is designing a pressurized aircraft cabin. They need to overcome the pressure differential at cruise altitude, which is twice the ground-level back pressure.",
    question: "How does the required fan pressure capability change?",
    options: [
      { id: 'a', label: "Remains the same - pressure is independent of altitude" },
      { id: 'b', label: "Doubles proportionally with the back pressure increase" },
      { id: 'c', label: "Increases by 41% (fan speed must increase to generate more pressure)", correct: true },
      { id: 'd', label: "Quadruples due to the pressure-speed squared relationship" }
    ],
    explanation: "Fan pressure is proportional to speed squared. To double pressure capability: speed must increase by sqrt(2) = 1.414 (41% increase). However, this also means power increases by 1.414^3 = 2.83 times. This is why aircraft environmental systems are carefully optimized."
  },
  {
    scenario: "A semiconductor fab is upgrading its cleanroom HEPA filtration. The new filters have 30% higher pressure drop. The facilities manager wants to maintain the same airflow.",
    question: "What happens to fan power consumption to maintain airflow through higher-resistance filters?",
    options: [
      { id: 'a', label: "Increases by 30% (proportional to filter resistance)" },
      { id: 'b', label: "Increases by 14% (fan speed increases to overcome resistance)", correct: true },
      { id: 'c', label: "Decreases because HEPA filters are more efficient" },
      { id: 'd', label: "Stays the same if airflow remains constant" }
    ],
    explanation: "To maintain airflow with 30% more pressure drop, fan speed must increase by sqrt(1.3) = 1.14 (14% faster). Power then increases by 1.14^3 = 1.48 or 48% more. This shows why low-pressure-drop filter designs are crucial for energy efficiency."
  },
  {
    scenario: "A building manager is comparing two options for increasing ventilation: (A) Replace the fan with one that's 20% larger, or (B) Speed up the existing fan by 20%.",
    question: "Which option is typically more energy efficient?",
    options: [
      { id: 'a', label: "Option B - same fan means consistent efficiency" },
      { id: 'b', label: "Option A - larger fans are more efficient at lower speeds", correct: true },
      { id: 'c', label: "Both are equivalent - they move the same air" },
      { id: 'd', label: "Depends entirely on the ductwork design" }
    ],
    explanation: "Larger fans operating at lower speeds benefit from the cubic power relationship and typically have better aerodynamic efficiency at their design point. Speeding up a smaller fan by 20% increases power by 73%, while a properly sized larger fan can achieve the same airflow at lower relative speed with better efficiency."
  },
  {
    scenario: "A wind tunnel operator needs to test at 50% of the tunnel's maximum airflow. They have two options: run one of two parallel fans at full speed, or run both fans at reduced speed.",
    question: "Which configuration minimizes power consumption?",
    options: [
      { id: 'a', label: "One fan at 100% speed - only one motor's losses" },
      { id: 'b', label: "Two fans each at 50% speed - cubic law dramatically reduces total power", correct: true },
      { id: 'c', label: "Both use the same power" },
      { id: 'd', label: "One fan at 100% is always better for partial loads" }
    ],
    explanation: "One fan at 100%: Power = 1.0. Two fans at 50% each: 2 x 0.5^3 = 2 x 0.125 = 0.25. Running two fans at half speed uses only 25% of the power of one fan at full speed! This is why parallel fan systems are so efficient at partial loads."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏢',
    title: 'HVAC Building Systems',
    short: 'Variable air volume for efficiency',
    tagline: 'Cubic savings, linear comfort',
    description: 'Modern buildings use variable frequency drives (VFDs) on HVAC fans to match airflow to actual demand. The cubic power relationship means that running fans at 80% speed uses only half the power - transforming building energy efficiency.',
    connection: 'Fan laws govern every aspect of HVAC design: duct sizing, fan selection, VFD programming, and building energy modeling. Understanding the cubic relationship between speed and power is essential for achieving net-zero buildings.',
    howItWorks: 'VFDs adjust motor frequency to control fan speed. Building automation systems monitor CO2, temperature, and occupancy to determine required airflow. Fans slow down when demand drops, exploiting the cube law for massive savings.',
    stats: [
      { value: '50%', label: 'HVAC energy savings', icon: '💰' },
      { value: '40%', label: 'Of building energy is HVAC', icon: '⚡' },
      { value: '3-5yr', label: 'VFD payback period', icon: '📅' }
    ],
    examples: ['Empire State Building retrofit', 'Singapore Marina Bay Sands', 'LEED Platinum buildings', 'Hospital operating rooms'],
    companies: ['Trane', 'Carrier', 'Johnson Controls', 'Siemens Building Technologies'],
    futureImpact: 'AI-driven demand prediction will optimize fan speeds in real-time, potentially reducing HVAC energy use by another 20-30%.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'Data Center Cooling',
    short: 'Keeping servers cool efficiently',
    tagline: 'Where cubic law meets compute power',
    description: 'Data centers consume 1-2% of global electricity, with cooling being a major component. Understanding fan laws allows operators to optimize cooling while minimizing the massive power required to move air through server racks.',
    connection: 'Server inlet temperature, hot aisle containment, and variable-speed CRAC units all rely on fan law principles. Running fans at the minimum speed that maintains safe temperatures dramatically reduces PUE.',
    howItWorks: 'Hot aisle/cold aisle containment reduces mixing, lowering required airflow. Variable-speed fans respond to real-time temperature sensors. Many data centers now raise inlet temperatures to 27 degrees C+ to reduce fan speeds.',
    stats: [
      { value: '1.1-1.2', label: 'Best-in-class PUE', icon: '📊' },
      { value: '30-40%', label: 'Cooling power reduction', icon: '❄️' },
      { value: '100MW+', label: 'Hyperscale DC power', icon: '⚡' }
    ],
    examples: ['Google data centers', 'Microsoft Azure facilities', 'AWS server farms', 'Meta AI infrastructure'],
    companies: ['Vertiv', 'Schneider Electric', 'Emerson', 'Stulz'],
    futureImpact: 'Liquid cooling and direct chip cooling will reduce fan dependence, but air cooling will remain dominant for most workloads.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Automotive Thermal Management',
    short: 'Engine and EV battery cooling',
    tagline: 'Efficiency at every RPM',
    description: 'Vehicle cooling systems use electric fans that vary speed based on engine or battery temperature. The cubic power relationship makes intelligent fan control crucial for fuel economy and EV range.',
    connection: 'Fan laws determine how much engine power or battery energy is consumed by cooling. Variable-speed electric fans replace belt-driven fans to exploit the cubic relationship and improve efficiency.',
    howItWorks: 'Temperature sensors trigger fan speed changes. In EVs, battery thermal management uses precisely controlled fans and pumps. Many vehicles shut off fans completely when not needed.',
    stats: [
      { value: '2-5%', label: 'Fuel/range improvement', icon: '⛽' },
      { value: '500W', label: 'Typical radiator fan power', icon: '⚡' },
      { value: '0W', label: 'When not cooling', icon: '🔋' }
    ],
    examples: ['Tesla thermal management', 'BMW efficient dynamics', 'Toyota hybrid cooling', 'Formula 1 aero cooling'],
    companies: ['Bosch', 'Denso', 'Valeo', 'BorgWarner'],
    futureImpact: 'Heat pumps and integrated thermal systems will further reduce fan power needs in next-generation vehicles.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Industrial Process Systems',
    short: 'Manufacturing and process cooling',
    tagline: 'Production efficiency through airflow',
    description: 'Factories use massive fans for process cooling, ventilation, and pneumatic conveying. Fan laws guide system design and operation, often determining whether a facility is profitable or not due to energy costs.',
    connection: 'Industrial fans can consume megawatts of power. The cubic relationship means that even small speed reductions yield substantial energy savings.',
    howItWorks: 'Variable speed drives allow fans to match actual process needs rather than running at full speed constantly. Parallel fan arrangements enable turndown by shutting off units while others run at efficient speeds.',
    stats: [
      { value: '25%', label: 'Of industrial motor energy', icon: '⚡' },
      { value: '60%', label: 'Potential savings with VFDs', icon: '💰' },
      { value: '1MW+', label: 'Large industrial fans', icon: '🏭' }
    ],
    examples: ['Steel mill ventilation', 'Cement plant cooling', 'Chemical process exhaust', 'Food processing ventilation'],
    companies: ['ABB', 'Siemens', 'Howden', 'Twin City Fan'],
    futureImpact: 'Industry 4.0 and digital twins will enable real-time optimization of fan systems across entire manufacturing processes.',
    color: '#8B5CF6'
  }
];

// Slider style constant
const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
  accentColor: '#3b82f6',
  cursor: 'pointer',
  borderRadius: '4px',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FanLawsRenderer: React.FC<FanLawsRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [fanSpeed, setFanSpeed] = useState(50); // 0-100%
  const [baselineSpeed] = useState(100);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [, setComparisonMode] = useState(false);
  const [fanCount, setFanCount] = useState(1);

  // Derived values
  const speedRatio = fanSpeed / baselineSpeed;
  const airflow = speedRatio * 1000; // CFM (baseline 1000 at 100%)
  const pressure = speedRatio * speedRatio * 2; // inches WC (baseline 2 at 100%)
  const power = speedRatio * speedRatio * speedRatio * 100; // Watts (baseline 100 at 100%)

  // Multi-fan calculations
  const totalAirflow = fanCount * (fanSpeed / 100) * 1000;
  const totalPower = fanCount * Math.pow(fanSpeed / 100, 3) * 100;
  const equivalentSingleFanSpeed = (totalAirflow / 1000) * 100;
  const singleFanPower = Math.pow(equivalentSingleFanSpeed / 100, 3) * 100;

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
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
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Explore',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Render function: Fan Laws chart SVG (main interactive visualization)
  const renderFanLawsChart = (speed: number, chartWidth = 450, chartHeight = 300) => {
    const w = chartWidth;
    const h = chartHeight;
    const padL = 50;
    const padR = 20;
    const padT = 30;
    const padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Generate data points for the three curves
    const points = 11; // 0%, 10%, ..., 100%
    const airflowPts: string[] = [];
    const pressurePts: string[] = [];
    const powerPts: string[] = [];

    for (let i = 0; i <= points - 1; i++) {
      const pct = i / (points - 1);
      const x = padL + pct * plotW;
      // Airflow: linear
      const yAir = padT + plotH - pct * plotH;
      airflowPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yAir.toFixed(1)}`);
      // Pressure: squared
      const yPres = padT + plotH - (pct * pct) * plotH;
      pressurePts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yPres.toFixed(1)}`);
      // Power: cubed
      const yPow = padT + plotH - (pct * pct * pct) * plotH;
      powerPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yPow.toFixed(1)}`);
    }

    // Current speed position
    const currentX = padL + (speed / 100) * plotW;
    const currentYAir = padT + plotH - (speed / 100) * plotH;
    const currentYPres = padT + plotH - Math.pow(speed / 100, 2) * plotH;
    const currentYPow = padT + plotH - Math.pow(speed / 100, 3) * plotH;

    // Color based on speed for semantic mapping
    const speedColor = speed > 75 ? '#EF4444' : speed > 40 ? '#F59E0B' : '#10B981';

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id="fanChartBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a24" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </linearGradient>
          <radialGradient id="fanGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="airflowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="pressureGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="powerGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={w} height={h} rx="8" fill="url(#fanChartBg)" />

        {/* Title */}
        <text x={w / 2} y="18" fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Fan Laws: Speed vs Output Relationship
        </text>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((frac, i) => {
          const gy = padT + plotH - frac * plotH;
          return (
            <line key={`hgrid-${i}`} x1={padL} y1={gy} x2={padL + plotW} y2={gy}
              stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
          );
        })}
        {[0.25, 0.5, 0.75, 1.0].map((frac, i) => {
          const gx = padL + frac * plotW;
          return (
            <line key={`vgrid-${i}`} x1={gx} y1={padT} x2={gx} y2={padT + plotH}
              stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
          );
        })}

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={colors.textSecondary} strokeWidth="1.5" />
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={colors.textSecondary} strokeWidth="1.5" />

        {/* Axis labels */}
        <text x={padL + plotW / 2} y={h - 5} fill={colors.textSecondary} fontSize="12" textAnchor="middle">
          Fan Speed (%)
        </text>
        <text x="14" y={padT + plotH / 2} fill={colors.textSecondary} fontSize="12" textAnchor="middle"
          transform={`rotate(-90, 14, ${padT + plotH / 2})`}>
          Output (%)
        </text>

        {/* Tick labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const tx = padL + (v / 100) * plotW;
          return (
            <text key={`xlabel-${v}`} x={tx} y={padT + plotH + 15} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
              {v}
            </text>
          );
        })}
        {[0, 25, 50, 75, 100].map((v) => {
          const ty = padT + plotH - (v / 100) * plotH;
          return (
            <text key={`ylabel-${v}`} x={padL - 8} y={ty + 4} fill={colors.textSecondary} fontSize="11" textAnchor="end">
              {v}
            </text>
          );
        })}

        {/* Curves */}
        <path d={airflowPts.join(' ')} fill="none" stroke="url(#airflowGrad)" strokeWidth="2.5" />
        <path d={pressurePts.join(' ')} fill="none" stroke="url(#pressureGrad)" strokeWidth="2.5" />
        <path d={powerPts.join(' ')} fill="none" stroke="url(#powerGrad)" strokeWidth="2.5" />

        {/* Current speed vertical indicator */}
        <line x1={currentX} y1={padT} x2={currentX} y2={padT + plotH}
          stroke={speedColor} strokeDasharray="4 4" opacity={0.5} strokeWidth="1" />

        {/* Interactive points with glow */}
        <circle cx={currentX} cy={currentYAir} r={8} fill="#3B82F6"
          filter="url(#glow)" stroke="#fff" strokeWidth={2} />
        <circle cx={currentX} cy={currentYPres} r={8} fill="#F59E0B"
          filter="url(#glow)" stroke="#fff" strokeWidth={2} />
        <circle cx={currentX} cy={currentYPow} r={8} fill="#10B981"
          filter="url(#glow)" stroke="#fff" strokeWidth={2} />

        {/* Legend */}
        <g transform={`translate(${padL + 10}, ${padT + 8})`}>
          <rect x="0" y="0" width="120" height="50" rx="4" fill="rgba(10,10,15,0.8)" />
          <line x1="6" y1="12" x2="22" y2="12" stroke="#3B82F6" strokeWidth="2" />
          <text x="28" y="15" fill="#3B82F6" fontSize="11">Airflow (Q = N)</text>
          <line x1="6" y1="26" x2="22" y2="26" stroke="#F59E0B" strokeWidth="2" />
          <text x="28" y="29" fill="#F59E0B" fontSize="11">Pressure (P = N{'\u00B2'})</text>
          <line x1="6" y1="40" x2="22" y2="40" stroke="#10B981" strokeWidth="2" />
          <text x="28" y="43" fill="#10B981" fontSize="11">Power (W = N{'\u00B3'})</text>
        </g>

        {/* Current values annotation */}
        <text x={w - padR - 5} y={currentYPow - 8} fill="#10B981" fontSize="12" textAnchor="end" fontWeight="600">
          {power.toFixed(1)}W
        </text>
      </svg>
    );
  };

  // Render function: Predict phase SVG
  const renderPredictSVG = () => {
    return (
      <svg width="350" height="200" viewBox="0 0 350 200">
        <defs>
          <linearGradient id="predictBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a24" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </linearGradient>
          <filter id="predictGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="350" height="200" rx="8" fill="url(#predictBg)" />
        <text x="175" y="20" fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Fan Speed vs Power
        </text>
        {/* 100% bar */}
        <rect x="60" y="40" width="100" height="30" rx="4" fill="#3B82F6" opacity="0.8" />
        <text x="110" y="60" fill="#fff" fontSize="12" textAnchor="middle">100% Speed</text>
        <text x="175" y="60" fill={colors.textSecondary} fontSize="12" textAnchor="start">= 100W</text>
        {/* 50% bar */}
        <rect x="60" y="90" width="50" height="30" rx="4" fill={colors.accent} opacity="0.8" />
        <text x="85" y="110" fill="#fff" fontSize="12" textAnchor="middle">50%</text>
        <text x="175" y="110" fill={colors.warning} fontSize="14" fontWeight="700" textAnchor="start">= ?W</text>
        {/* Arrow */}
        <path d="M 175 135 L 175 170 L 185 160 M 175 170 L 165 160" stroke={colors.accent} strokeWidth="2" fill="none" />
        <text x="200" y="160" fill={colors.textSecondary} fontSize="12">What happens to power?</text>
      </svg>
    );
  };

  // Progress bar render function
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots render function
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
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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

  // Fixed navigation bar render function
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    // Disable Next in test phase
    const isTestPhase = phase === 'test';
    const canGoNext = currentIndex < phaseOrder.length - 1 && !isTestPhase;

    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: canGoBack ? colors.textSecondary : colors.border,
            cursor: canGoBack ? 'pointer' : 'default',
            padding: '8px 12px',
            borderRadius: '8px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🌀</span>
          <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Fan Laws</span>
        </div>
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            background: 'transparent',
            border: 'none',
            color: canGoNext ? colors.textSecondary : colors.border,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            padding: '8px 12px',
            borderRadius: '8px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Next →
        </button>
      </nav>
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
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '80px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🌀💨
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            The Fan Laws
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Slow a fan down by 20%, and you'd expect 20% less power. But the reality is <span style={{ color: colors.success }}>nearly 50% savings</span>. This counterintuitive relationship governs everything from your laptop cooling to massive data centers."
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
              "Power consumption doesn't follow speed - it follows the cube of speed. Master this law, and you unlock massive energy savings."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              -- HVAC Engineering Principle
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Discover the Cube Law →
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Power drops by 50% (proportional to speed)' },
      { id: 'b', text: 'Power drops by 75% (square of speed)' },
      { id: 'c', text: 'Power drops by 87.5% (cube of speed)' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              ...typo.small,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              Step 1 of 1 - Make your prediction
            </div>

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
              A fan running at 100% consumes 100W. If you reduce speed to 50%, what happens to power consumption?
            </h2>

            {/* Visual */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              {renderPredictSVG()}
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
                Test My Prediction →
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Fan Laws
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              The Three Fan Laws
            </h2>

            {/* Observation guidance + real-world relevance */}
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Observe how the fan speed affects airflow, pressure, and power consumption.
              This is why engineers design variable-speed fans for real-world HVAC and data center technology applications.
            </p>

            {/* Main chart visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderFanLawsChart(fanSpeed)}
              </div>

              {/* Speed slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Fan Speed</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{fanSpeed}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={fanSpeed}
                  onChange={(e) => setFanSpeed(parseInt(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              {/* Three Laws Display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '20px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  borderTop: `3px solid #3B82F6`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Airflow (Q)</div>
                  <div style={{ ...typo.h3, color: '#3B82F6' }}>{airflow.toFixed(0)} CFM</div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                    Q = N (linear)
                  </div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  borderTop: `3px solid ${colors.warning}`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Pressure (P)</div>
                  <div style={{ ...typo.h3, color: colors.warning }}>{pressure.toFixed(2)}" WC</div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                    P = N{'\u00B2'} (squared)
                  </div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  borderTop: `3px solid ${colors.success}`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Power (W)</div>
                  <div style={{ ...typo.h3, color: colors.success }}>{power.toFixed(1)}W</div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                    W = N{'\u00B3'} (cubed)
                  </div>
                </div>
              </div>

              {/* Formula visualization */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textSecondary }}>
                  Speed at {fanSpeed}%: ({fanSpeed}/100){'\u00B3'} = {(speedRatio ** 3).toFixed(3)} {'\u00D7'} 100 = <span style={{ color: colors.success }}>{power.toFixed(1)}W</span>
                </div>
              </div>
            </div>

            {/* Discovery insight */}
            {fanSpeed <= 80 && fanSpeed > 50 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  At {fanSpeed}% speed, you use only {power.toFixed(0)}W - a {(100 - power).toFixed(0)}% power savings!
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
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Why the Cube Law?
            </h2>

            {/* Connect to prediction */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
                As you observed in the experiment, the result shows that power does not drop linearly with speed.
                Your prediction helped frame this discovery - the correct answer is that power follows the cube of speed.
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
                  The three fan laws derive from fundamental physics:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    background: colors.bgSecondary,
                    padding: '16px',
                    borderRadius: '8px',
                    borderLeft: `3px solid #3B82F6`,
                  }}>
                    <h4 style={{ color: '#3B82F6', margin: '0 0 8px 0' }}>1st Law: Q = N (Airflow)</h4>
                    <p style={{ margin: 0, color: colors.textSecondary }}>
                      Spin the fan twice as fast, move twice as much air. Direct proportionality.
                    </p>
                  </div>

                  <div style={{
                    background: colors.bgSecondary,
                    padding: '16px',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${colors.warning}`,
                  }}>
                    <h4 style={{ color: colors.warning, margin: '0 0 8px 0' }}>2nd Law: P = N{'\u00B2'} (Pressure)</h4>
                    <p style={{ margin: 0, color: colors.textSecondary }}>
                      Pressure depends on air velocity squared (kinetic energy). Double speed = 4{'\u00D7'} pressure.
                    </p>
                  </div>

                  <div style={{
                    background: colors.bgSecondary,
                    padding: '16px',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${colors.success}`,
                  }}>
                    <h4 style={{ color: colors.success, margin: '0 0 8px 0' }}>3rd Law: W = N{'\u00B3'} (Power)</h4>
                    <p style={{ margin: 0, color: colors.textSecondary }}>
                      Power = Pressure {'\u00D7'} Flow. Since P = N{'\u00B2'} and Q = N: W = N{'\u00B2'} {'\u00D7'} N = N{'\u00B3'}
                    </p>
                  </div>
                </div>
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
                The Cubic Advantage
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This cubic relationship is why variable speed fans are so valuable. Dropping speed by just 20% (from 100% to 80%) reduces power by 49% - almost half the energy for only slightly less airflow!
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Multiple Fans →
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'One fan at 100% uses less power - fewer motors, less loss' },
      { id: 'b', text: 'Both use the same power - same total airflow means same energy' },
      { id: 'c', text: 'Two fans at 50% use dramatically less power due to the cube law' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              ...typo.small,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              Step 1 of 1 - Predict multiple fan behavior
            </div>

            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Scenario: Multiple Fans
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              You need 1000 CFM of airflow. Which uses less power: one fan at 100% speed, or two fans each at 50% speed?
            </h2>

            {/* Twist predict SVG visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <svg width="350" height="200" viewBox="0 0 350 200">
                <defs>
                  <linearGradient id="twistPredBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1a24" />
                    <stop offset="100%" stopColor="#0a0a0f" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="350" height="200" rx="8" fill="url(#twistPredBg)" />
                <text x="175" y="22" fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
                  Single Fan vs Multiple Fans
                </text>
                {/* Single fan bar */}
                <rect x="40" y="50" width="120" height="40" rx="6" fill="#3B82F6" />
                <text x="100" y="75" fill="#fff" fontSize="12" textAnchor="middle">1 Fan @ 100%</text>
                <text x="175" y="75" fill={colors.textSecondary} fontSize="12">= 100W</text>
                {/* Two fan bars */}
                <rect x="40" y="110" width="60" height="35" rx="6" fill={colors.accent} />
                <rect x="110" y="110" width="60" height="35" rx="6" fill={colors.accent} />
                <text x="100" y="133" fill="#fff" fontSize="11" textAnchor="middle">2 Fans @ 50%</text>
                <text x="175" y="133" fill={colors.warning} fontSize="14" fontWeight="700">= ?W</text>
                <text x="175" y="175" fill={colors.textMuted} fontSize="12" textAnchor="middle">Same total airflow: 1000 CFM</text>
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
                onClick={() => { playSound('success'); setComparisonMode(true); nextPhase(); }}
                style={primaryButtonStyle}
              >
                See the Comparison →
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Build multi-fan comparison chart SVG
    const renderMultiFanChart = () => {
      const w = 450;
      const h = 300;
      const padL = 55;
      const padR = 20;
      const padT = 35;
      const padB = 45;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      // Single fan power curve vs multi-fan effective power
      const singlePts: string[] = [];
      const multiPts: string[] = [];
      const points = 11;
      for (let i = 0; i <= points - 1; i++) {
        const pct = i / (points - 1);
        const x = padL + pct * plotW;
        // Single fan: power = speed^3
        const ySingle = padT + plotH - Math.pow(pct, 3) * plotH;
        singlePts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ySingle.toFixed(1)}`);
        // Multi-fan: same airflow but split across fans, power = fanCount * (speed/fanCount)^3
        const effectiveSpeed = pct / fanCount;
        const multiPower = fanCount * Math.pow(effectiveSpeed, 3);
        const yMulti = padT + plotH - Math.min(multiPower, 1) * plotH;
        multiPts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yMulti.toFixed(1)}`);
      }

      // Current position on single curve
      const currentPct = fanSpeed / 100;
      const currentX = padL + currentPct * plotW;
      const currentYSingle = padT + plotH - Math.pow(currentPct, 3) * plotH;
      const effectiveMultiSpeed = currentPct / fanCount;
      const multiPowerVal = fanCount * Math.pow(effectiveMultiSpeed, 3);
      const currentYMulti = padT + plotH - Math.min(multiPowerVal, 1) * plotH;

      const speedColor = fanSpeed > 75 ? '#EF4444' : fanSpeed > 40 ? '#F59E0B' : '#10B981';

      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <linearGradient id="twistBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a24" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <radialGradient id="twistGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="singleFanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="multiFanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <filter id="twistGlowFilter">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={w} height={h} rx="8" fill="url(#twistBg)" />

          <text x={w / 2} y="22" fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
            Power: {fanCount} Fan(s) at {fanSpeed}% Speed
          </text>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map((frac, i) => (
            <line key={`hg-${i}`} x1={padL} y1={padT + plotH - frac * plotH} x2={padL + plotW} y2={padT + plotH - frac * plotH}
              stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
          ))}
          {[0.25, 0.5, 0.75, 1.0].map((frac, i) => (
            <line key={`vg-${i}`} x1={padL + frac * plotW} y1={padT} x2={padL + frac * plotW} y2={padT + plotH}
              stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
          ))}

          {/* Axes */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={colors.textSecondary} strokeWidth="1.5" />
          <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={colors.textSecondary} strokeWidth="1.5" />

          <text x={padL + plotW / 2} y={h - 5} fill={colors.textSecondary} fontSize="12" textAnchor="middle">
            Total Airflow (%)
          </text>
          <text x="16" y={padT + plotH / 2} fill={colors.textSecondary} fontSize="12" textAnchor="middle"
            transform={`rotate(-90, 16, ${padT + plotH / 2})`}>
            Power (%)
          </text>

          {/* Tick labels */}
          {[0, 25, 50, 75, 100].map(v => (
            <text key={`xl-${v}`} x={padL + (v / 100) * plotW} y={padT + plotH + 16} fill={colors.textSecondary} fontSize="11" textAnchor="middle">{v}</text>
          ))}
          {[0, 25, 50, 75, 100].map(v => (
            <text key={`yl-${v}`} x={padL - 8} y={padT + plotH - (v / 100) * plotH + 4} fill={colors.textSecondary} fontSize="11" textAnchor="end">{v}</text>
          ))}

          {/* Curves */}
          <path d={singlePts.join(' ')} fill="none" stroke="url(#singleFanGrad)" strokeWidth="2.5" />
          <path d={multiPts.join(' ')} fill="none" stroke="url(#multiFanGrad)" strokeWidth="2.5" />

          {/* Speed indicator */}
          <line x1={currentX} y1={padT} x2={currentX} y2={padT + plotH}
            stroke={speedColor} strokeDasharray="4 4" opacity={0.5} />

          {/* Interactive points */}
          <circle cx={currentX} cy={currentYSingle} r={8} fill="#EF4444"
            filter="url(#twistGlowFilter)" stroke="#fff" strokeWidth={2} />
          <circle cx={currentX} cy={currentYMulti} r={8} fill="#10B981"
            filter="url(#twistGlowFilter)" stroke="#fff" strokeWidth={2} />

          {/* Legend */}
          <g transform={`translate(${padL + 10}, ${padT + 8})`}>
            <rect x="0" y="0" width="130" height="36" rx="4" fill="rgba(10,10,15,0.8)" />
            <line x1="6" y1="12" x2="22" y2="12" stroke="#EF4444" strokeWidth="2" />
            <text x="28" y="15" fill="#EF4444" fontSize="11">1 Fan (reference)</text>
            <line x1="6" y1="26" x2="22" y2="26" stroke="#10B981" strokeWidth="2" />
            <text x="28" y="29" fill="#10B981" fontSize="11">{fanCount} Fan(s) @ {fanSpeed}%</text>
          </g>

          {/* Values */}
          <text x={w - padR - 5} y={currentYSingle - 8} fill="#EF4444" fontSize="12" textAnchor="end" fontWeight="600">
            {singleFanPower.toFixed(1)}W
          </text>
          <text x={w - padR - 5} y={currentYMulti - 8} fill="#10B981" fontSize="12" textAnchor="end" fontWeight="600">
            {totalPower.toFixed(1)}W
          </text>
        </svg>
      );
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Multiple Fans vs Single Fan
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Observe how multiple fans at lower speeds compare to a single fan at high speed
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Chart */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                {renderMultiFanChart()}
              </div>

              {/* Fan count selector */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Number of Fans</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{fanCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={fanCount}
                  onChange={(e) => setFanCount(parseInt(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              {/* Speed per fan slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Speed per Fan</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{fanSpeed}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={fanSpeed}
                  onChange={(e) => setFanSpeed(parseInt(e.target.value))}
                  style={sliderStyle}
                />
              </div>

              {/* Comparison stats */}
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
                  border: `2px solid ${colors.accent}`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                    {fanCount} Fan(s) @ {fanSpeed}%
                  </div>
                  <div style={{ ...typo.h3, color: colors.accent }}>{totalAirflow.toFixed(0)} CFM</div>
                  <div style={{ ...typo.h2, color: colors.success, marginTop: '8px' }}>{totalPower.toFixed(1)}W</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  border: `2px solid ${colors.border}`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                    Equivalent: 1 Fan @ {equivalentSingleFanSpeed.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.h3, color: colors.textSecondary }}>{totalAirflow.toFixed(0)} CFM</div>
                  <div style={{ ...typo.h2, color: colors.error, marginTop: '8px' }}>{singleFanPower.toFixed(1)}W</div>
                </div>
              </div>

              {/* Savings highlight */}
              {fanCount > 1 && totalPower < singleFanPower && (
                <div style={{
                  background: `${colors.success}22`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                    {fanCount} fans save {((1 - totalPower / singleFanPower) * 100).toFixed(0)}% power!
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Why →
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Power of Running Slow
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📐</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Math</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Two fans at 50% speed: <strong>2 {'\u00D7'} 0.5{'\u00B3'} = 0.25</strong> (25% of single fan power)
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                  Each fan contributes half the airflow but only 12.5% of the power!
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Design Implications</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  This is why data centers, HVAC systems, and industrial plants use <strong>multiple parallel fans</strong> that can be individually speed-controlled or shut off entirely.
                </p>
              </div>

              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💡</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Key Takeaway</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Running fans slower is almost always more efficient. <strong>Oversizing and slowing down</strong> is a fundamental HVAC design principle that exploits the cubic power relationship.
                </p>
              </div>
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            <div style={{
              ...typo.small,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              App {selectedApp + 1} of {realWorldApps.length} - {completedCount}/{realWorldApps.length} completed
            </div>

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
                  How Fan Laws Apply:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
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

              {/* Got It button */}
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  const nextUncompleted = completedApps.findIndex((c, i) => !c && i !== selectedApp);
                  if (nextUncompleted >= 0) {
                    setSelectedApp(nextUncompleted);
                    newCompleted[nextUncompleted] = true;
                    setCompletedApps(newCompleted);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${app.color}`,
                  background: `${app.color}22`,
                  color: app.color,
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Got It
              </button>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                The fan laws - airflow proportional to speed, pressure proportional to speed squared, and power proportional to speed cubed -
                are fundamental engineering principles used across every industry that moves air.
              </p>
            </div>

            {allAppsCompleted ? (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Test →
              </button>
            ) : (
              <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
                Review all {realWorldApps.length} applications to continue
              </p>
            )}
          </div>

          {renderNavDots()}
        </div>
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
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '48px',
            paddingBottom: '100px',
            padding: '24px',
            paddingTop: '80px',
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
                {passed ? 'You\'ve mastered the Fan Laws!' : 'Review the concepts and try again.'}
              </p>

              {passed ? (
                <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
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
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          padding: '24px',
          paddingTop: '80px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Q{currentQuestion + 1}: Question {currentQuestion + 1} of 10
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
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

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
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white',
                    cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    minHeight: '44px',
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
                    minHeight: '44px',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>

          {renderNavDots()}
        </div>
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
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '80px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Fan Laws Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the cubic relationship between fan speed and power, and can apply this knowledge to design efficient airflow systems.
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
                'Airflow is proportional to Speed (linear)',
                'Pressure is proportional to Speed squared',
                'Power is proportional to Speed cubed',
                'Multiple slow fans beat one fast fan',
                'VFDs unlock massive energy savings',
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
            <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}>
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

export default FanLawsRenderer;
