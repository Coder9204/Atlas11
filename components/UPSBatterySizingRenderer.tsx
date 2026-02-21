'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// UPS Battery Sizing - Complete 10-Phase Game
// Why battery capacity drops dramatically at high discharge rates
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

interface UPSBatterySizingRendererProps {
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
    scenario: "A small business owner purchases a UPS rated at 100Ah for their server room. The vendor claims it can power their 2400W load for 2 hours based on simple math (100Ah x 48V = 4800Wh / 2400W = 2hr).",
    question: "What will the actual runtime likely be?",
    options: [
      { id: 'a', label: "Exactly 2 hours - the math is correct" },
      { id: 'b', label: "About 60-90 minutes due to Peukert effect at high discharge rates", correct: true },
      { id: 'c', label: "More than 2 hours because batteries have reserve capacity" },
      { id: 'd', label: "About 1.5 hours due to inverter inefficiency only" }
    ],
    explanation: "At high discharge rates (C/2 or faster), the Peukert effect significantly reduces effective battery capacity. A 100Ah battery rated at C/20 may only deliver 50-65Ah at C/1 rates. Combined with inverter losses, actual runtime is often 50-60% of theoretical calculations."
  },
  {
    scenario: "A data center engineer is comparing lead-acid batteries (Peukert exponent ~1.2) with lithium-ion batteries (Peukert exponent ~1.05) for a new UPS installation requiring 15-minute backup at high power.",
    question: "Why might lithium-ion be a better choice despite higher upfront cost?",
    options: [
      { id: 'a', label: "Lithium batteries are lighter and take less floor space" },
      { id: 'b', label: "Lower Peukert exponent means lithium maintains capacity better at high discharge rates", correct: true },
      { id: 'c', label: "Lithium batteries never need replacement" },
      { id: 'd', label: "Lead-acid batteries cannot deliver high current" }
    ],
    explanation: "With a Peukert exponent of 1.05 vs 1.2, lithium batteries lose only ~5% capacity at high C-rates while lead-acid loses 20-40%. For short, high-power UPS applications, this means lithium needs significantly less capacity to deliver the same runtime."
  },
  {
    scenario: "A hospital is designing a UPS system for critical life support equipment. The calculated load is 50kW with required backup time of 30 minutes. Initial battery sizing is 50kW x 0.5hr = 25kWh.",
    question: "What minimum battery capacity should actually be installed?",
    options: [
      { id: 'a', label: "25kWh - the calculation is sufficient" },
      { id: 'b', label: "30kWh - add 20% safety margin" },
      { id: 'c', label: "50-60kWh - account for Peukert effect, aging, temperature, and safety margins", correct: true },
      { id: 'd', label: "100kWh - always double for hospitals" }
    ],
    explanation: "Hospital UPS sizing must include: Peukert derating (1.3-1.5x), battery aging factor (1.25x for 80% end-of-life capacity), temperature derating, and safety margin. A 25kWh theoretical need typically requires 50-60kWh installed capacity for reliable 30-minute runtime."
  },
  {
    scenario: "An IT manager notices their UPS batteries that provided 15 minutes backup when new now only provide 8 minutes, despite the load remaining constant.",
    question: "What is the most likely cause of this capacity reduction?",
    options: [
      { id: 'a', label: "The batteries were defective from the factory" },
      { id: 'b', label: "Normal battery aging - capacity degrades 20-30% over 3-5 years of use", correct: true },
      { id: 'c', label: "The UPS inverter has become less efficient" },
      { id: 'd', label: "Power quality issues have damaged the batteries" }
    ],
    explanation: "Lead-acid UPS batteries typically have a 3-5 year lifespan with capacity gradually declining to 80% of original. High temperatures, deep discharges, and frequent cycling accelerate aging. Most manufacturers recommend replacement at 80% capacity to ensure adequate backup."
  },
  {
    scenario: "A data center in Phoenix, Arizona experiences summer temperatures reaching 40C (104F) in the battery room despite air conditioning.",
    question: "How does this affect UPS battery performance and lifespan?",
    options: [
      { id: 'a', label: "No significant effect - batteries are designed for high temperatures" },
      { id: 'b', label: "Immediate capacity increases but lifespan is cut roughly in half for every 10C above 25C", correct: true },
      { id: 'c', label: "Capacity decreases but lifespan increases due to slower chemical reactions" },
      { id: 'd', label: "Only affects charging time, not capacity or lifespan" }
    ],
    explanation: "The Arrhenius equation shows battery life halves for every 8-10C above 25C. At 40C, a 5-year battery might last only 2.5 years. While capacity temporarily increases at higher temperatures, the accelerated degradation is far more costly. Proper cooling is essential."
  },
  {
    scenario: "A UPS vendor recommends limiting depth of discharge (DoD) to 50% rather than using the full 100% battery capacity for maximum cycle life.",
    question: "How much longer can batteries last at 50% DoD compared to 100% DoD?",
    options: [
      { id: 'a', label: "About 10% longer - minor improvement" },
      { id: 'b', label: "About twice as long - linear relationship" },
      { id: 'c', label: "3-5 times longer - exponential relationship between DoD and cycle life", correct: true },
      { id: 'd', label: "No difference - DoD only affects runtime, not lifespan" }
    ],
    explanation: "Cycle life vs DoD follows an exponential curve. Lead-acid batteries might deliver 300 cycles at 100% DoD but 1,200+ cycles at 50% DoD. This is why many UPS systems are oversized - deeper capacity allows shallower cycling and longer battery life."
  },
  {
    scenario: "An engineer must design a 480V battery string using individual 12V 100Ah sealed lead-acid batteries.",
    question: "How many batteries are needed and what is the string capacity?",
    options: [
      { id: 'a', label: "40 batteries in series providing 4,000Ah" },
      { id: 'b', label: "40 batteries in series providing 100Ah at 480V", correct: true },
      { id: 'c', label: "4 batteries in series providing 100Ah at 48V" },
      { id: 'd', label: "40 batteries in parallel providing 100Ah at 12V" }
    ],
    explanation: "Series connections add voltage while maintaining the same Ah capacity: 480V / 12V = 40 batteries. The string capacity remains 100Ah at 480V (48kWh total). To increase capacity, you would add parallel strings - each string would be 40 batteries."
  },
  {
    scenario: "A cloud provider is evaluating UPS topology options for a new data center. They need zero transfer time and the highest reliability for their Tier IV facility.",
    question: "Which UPS topology should they choose?",
    options: [
      { id: 'a', label: "Standby (offline) UPS - most efficient" },
      { id: 'b', label: "Line-interactive UPS - good balance of features" },
      { id: 'c', label: "Online double-conversion UPS - zero transfer time, load always on inverter", correct: true },
      { id: 'd', label: "Any topology works for Tier IV requirements" }
    ],
    explanation: "Online double-conversion UPS continuously converts AC-DC-AC, so the load always runs from the inverter with zero transfer time. This provides complete isolation from grid issues. While less efficient (92-96% vs 97-99% for other types), it's required for critical facilities."
  },
  {
    scenario: "A telecom company is deploying remote cell sites with battery backup. Each site has 5kW load and requires 8 hours of backup for power outages.",
    question: "What makes this application particularly challenging for battery sizing?",
    options: [
      { id: 'a', label: "The low power level makes it simple" },
      { id: 'b', label: "Long duration discharge means C-rate is actually favorable, but temperature extremes and lack of climate control are major factors", correct: true },
      { id: 'c', label: "Remote sites always need double the calculated capacity" },
      { id: 'd', label: "Telecom loads are constant and predictable" }
    ],
    explanation: "Long-duration discharge (8 hours = C/8 rate) minimizes Peukert losses. However, remote sites face extreme temperatures (-30C to +50C), limited maintenance access, and often no climate control. These factors can reduce effective capacity by 50% or more, requiring significant oversizing."
  },
  {
    scenario: "A facility manager is comparing quotes for UPS battery replacements. Vendor A offers cheap batteries with 1-year warranty, while Vendor B offers premium batteries with 5-year warranty at 2.5x the price.",
    question: "Which is likely the better long-term value?",
    options: [
      { id: 'a', label: "Vendor A - lower cost is always better" },
      { id: 'b', label: "Vendor B - premium batteries typically last 4-5x longer and provide more reliable capacity", correct: true },
      { id: 'c', label: "No difference - all batteries are essentially the same" },
      { id: 'd', label: "Cannot determine without knowing the brand names" }
    ],
    explanation: "Premium UPS batteries use thicker plates, better separators, and higher-purity materials. They typically maintain capacity longer and have lower failure rates. Over 10 years, 2 sets of premium batteries at 2.5x cost ($5x total) beat 5+ sets of cheap batteries at 1x cost ($5x+ total) plus labor and risk."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏢',
    title: 'Data Center Backup Power',
    short: 'Enterprise UPS systems',
    tagline: 'Protecting billions in infrastructure',
    description: 'Data centers use UPS systems with hundreds of battery strings providing 10-15 minutes of backup. This bridges the gap until generators start. Undersized batteries mean downtime costing $100K+ per minute.',
    connection: 'Peukert effect means high-power discharge delivers less energy than rated. A 1000Ah battery might only provide 600Ah at data center discharge rates.',
    howItWorks: 'Parallel battery strings share the load. Monitoring systems track state of charge and health. Automatic transfer switches seamlessly transition from utility to battery to generator.',
    stats: [
      { value: '10-15min', label: 'Typical runtime', icon: '⏱️' },
      { value: '$100K/min', label: 'Downtime cost', icon: '💰' },
      { value: '99.999%', label: 'Target uptime', icon: '🎯' }
    ],
    examples: ['AWS data centers', 'Google Cloud', 'Microsoft Azure', 'Financial trading floors'],
    companies: ['Eaton', 'Vertiv', 'Schneider Electric', 'APC'],
    futureImpact: 'Lithium UPS batteries with lower Peukert exponents will halve required capacity.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Range',
    short: 'EV battery performance',
    tagline: 'Why your range varies so much',
    description: 'EV range estimates assume moderate driving. Aggressive acceleration or highway speeds dramatically increase discharge rate, triggering Peukert losses. A 300-mile rated range might only achieve 200 miles driven hard.',
    connection: 'Higher power draw means higher C-rate discharge. Lithium batteries have low Peukert exponents (~1.05) but the effect is still significant at extreme power levels.',
    howItWorks: 'Battery management systems track real-time consumption and adjust range estimates. Regenerative braking partially recovers energy. Preconditioning optimizes battery temperature.',
    stats: [
      { value: '30-40%', label: 'Range loss at high speed', icon: '📉' },
      { value: '1.05', label: 'Li-ion Peukert exponent', icon: '📊' },
      { value: '150kW', label: 'Peak motor power', icon: '⚡' }
    ],
    examples: ['Tesla Model 3', 'Rivian R1T', 'Ford Mustang Mach-E', 'Porsche Taycan'],
    companies: ['Tesla', 'BYD', 'CATL', 'LG Energy'],
    futureImpact: 'Solid-state batteries will further reduce Peukert losses and enable consistent performance.',
    color: '#10B981'
  },
  {
    icon: '☀️',
    title: 'Solar Battery Sizing',
    short: 'Home energy storage',
    tagline: 'Storing sunshine for the night',
    description: 'Home batteries like Tesla Powerwall are sized for overnight loads. Running high-power appliances during outages drains them faster than expected due to Peukert effect and inverter inefficiency.',
    connection: 'A 13.5kWh battery might only deliver 10kWh when powering AC units and refrigerators simultaneously at high C-rates.',
    howItWorks: 'Hybrid inverters manage solar, grid, and battery. Load prioritization extends runtime for critical circuits. State of health tracking adjusts available capacity over time.',
    stats: [
      { value: '13.5kWh', label: 'Powerwall capacity', icon: '🔋' },
      { value: '7kW', label: 'Peak power output', icon: '⚡' },
      { value: '10yr', label: 'Warranty period', icon: '📅' }
    ],
    examples: ['Tesla Powerwall', 'Enphase IQ', 'LG RESU', 'Generac PWRcell'],
    companies: ['Tesla', 'Enphase', 'SolarEdge', 'Generac'],
    futureImpact: 'Vehicle-to-home (V2H) will turn EV batteries into whole-home backup.',
    color: '#F59E0B'
  },
  {
    icon: '🏥',
    title: 'Medical Equipment Backup',
    short: 'Hospital critical power',
    tagline: 'Zero tolerance for failure',
    description: 'Hospital critical systems require precise UPS sizing with massive safety margins. Life support, surgical equipment, and medication refrigeration cannot tolerate even brief interruptions.',
    connection: 'Engineers apply 50%+ derating factors for Peukert effect, temperature, aging, and depth of discharge. Better to oversize than risk patient harm.',
    howItWorks: 'N+1 redundant UPS systems ensure no single point of failure. Weekly load bank testing verifies capacity. Real-time monitoring alerts staff to any degradation.',
    stats: [
      { value: '50%', label: 'Typical derating factor', icon: '📉' },
      { value: '2hr+', label: 'Critical system runtime', icon: '⏰' },
      { value: 'N+1', label: 'Redundancy level', icon: '🔄' }
    ],
    examples: ['ICU equipment', 'Operating rooms', 'Medication storage', 'Dialysis machines'],
    companies: ['Stryker', 'GE Healthcare', 'Philips', 'Siemens Healthineers'],
    futureImpact: 'AI-managed microgrids will provide multi-hour backup with renewable integration.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const UPSBatterySizingRenderer: React.FC<UPSBatterySizingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state
  const [batteryCapacity, setBatteryCapacity] = useState(100); // Ah
  const [loadPower, setLoadPower] = useState(2400); // Watts
  const [batteryVoltage] = useState(48); // Volts
  const [temperature, setTemperature] = useState(25); // Celsius
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - discharge rate scenario
  const [dischargeRate, setDischargeRate] = useState(1); // C-rate multiplier (1 = C/1, 0.5 = C/2, etc.)
  const [batteryAge, setBatteryAge] = useState(0); // years

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
// Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Peukert exponent (typical for lead-acid)
  const peukertExponent = 1.2;

  // Calculate ideal runtime (simple math)
  const calculateIdealRuntime = useCallback(() => {
    const current = loadPower / batteryVoltage;
    const hours = batteryCapacity / current;
    return hours * 60; // minutes
  }, [batteryCapacity, loadPower, batteryVoltage]);

  // Calculate actual runtime with Peukert effect
  const calculateActualRuntime = useCallback(() => {
    const current = loadPower / batteryVoltage;
    const ratedCurrent = batteryCapacity / 20; // C/20 rate (standard rating)
    const effectiveCapacity = batteryCapacity * Math.pow(ratedCurrent / current, peukertExponent - 1);

    // Apply temperature derating
    const tempFactor = temperature < 25 ? 1 - (25 - temperature) * 0.01 : 1;

    // Apply age derating (20% loss over 5 years)
    const ageFactor = 1 - (batteryAge * 0.04);

    const adjustedCapacity = effectiveCapacity * tempFactor * ageFactor;
    const hours = adjustedCapacity / current;
    return Math.max(0, hours * 60); // minutes
  }, [batteryCapacity, loadPower, batteryVoltage, temperature, batteryAge, peukertExponent]);

  // Calculate twist scenario runtime
  const calculateTwistRuntime = useCallback(() => {
    const ratedCapacity = 100; // Fixed 100Ah battery for twist
    const baseCurrent = ratedCapacity / 20; // C/20 current
    const actualCurrent = baseCurrent * dischargeRate * 20; // Actual current at given C-rate
    const effectiveCapacity = ratedCapacity * Math.pow(1 / dischargeRate, peukertExponent - 1);
    const hours = effectiveCapacity / actualCurrent;
    return Math.max(0, hours * 60); // minutes
  }, [dischargeRate, peukertExponent]);

  // Capacity loss percentage
  const capacityLossPercent = useCallback(() => {
    const ideal = calculateIdealRuntime();
    const actual = calculateActualRuntime();
    if (ideal === 0) return 0;
    return ((ideal - actual) / ideal) * 100;
  }, [calculateIdealRuntime, calculateActualRuntime]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981', // Emerald for battery/energy
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    battery: '#10B981',
    loss: '#EF4444',
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
    twist_play: 'Explore Twist',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'ups-battery-sizing',
        gameTitle: 'UPS Battery Sizing',
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

  // Battery Visualization SVG Component
  const BatteryVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 320 : 380;
    const idealMinutes = calculateIdealRuntime();
    const actualMinutes = calculateActualRuntime();
    const fillPercent = Math.min(100, (actualMinutes / Math.max(idealMinutes, 1)) * 100);
    const lossPercent = 100 - fillPercent;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="U P S Battery Sizing visualization">
        <defs>
          <linearGradient id="batteryFillGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="batteryLossGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
          </linearGradient>
          <filter id="batteryGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowEffect">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines spanning full width */}
        <line x1="40" y1="50" x2={width - 40} y2="50" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="130" x2={width - 40} y2="130" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="40" y1="210" x2={width - 40} y2="210" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 4" />
        {/* Left and right anchor marks for width utilization */}
        <rect x="20" y="48" width="4" height="4" fill={colors.textMuted} opacity="0.5"/>
        <rect x={width - 24} y="48" width="4" height="4" fill={colors.textMuted} opacity="0.5"/>

        {/* Title */}
        <text x={width/2} y="32" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Battery Capacity vs Actual Delivery
        </text>

        {/* Battery group */}
        <g id="battery-layer">
          {/* Battery casing - absolute coords */}
          <rect x="40" y="55" width="120" height="200" fill="#374151" rx="12" stroke="#4b5563" strokeWidth="3" />
          <rect x="75" y="40" width="50" height="16" fill="#4b5563" rx="4" />

          {/* Battery fill - actual capacity */}
          <rect
            x="50"
            y={245 - (fillPercent / 100) * 180}
            width="100"
            height={(fillPercent / 100) * 180}
            fill="url(#batteryFillGrad)"
            rx="6"
          />

          {/* Lost capacity indicator */}
          {lossPercent > 0 && (
            <rect x="50" y="65" width="100" height={(lossPercent / 100) * 180} fill="url(#batteryLossGrad)" rx="6" />
          )}

          {/* Capacity percentage */}
          <text x="100" y="160" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">
            {fillPercent.toFixed(0)}%
          </text>
          <text x="100" y="178" textAnchor="middle" fill="#94a3b8" fontSize="11">
            Effective
          </text>

          {/* Interactive highlight - current value marker */}
          <circle
            cx="100"
            cy={245 - (fillPercent / 100) * 180}
            r="8"
            fill={colors.accent}
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#glowEffect)"
          />
          {/* Discharge path curve */}
          <path
            d={`M 50 65 Q 70 ${100 + (1 - fillPercent/100) * 80} 100 ${245 - (fillPercent/100)*180} Q 130 ${245-(fillPercent/100)*80} 150 245`}
            fill="none"
            stroke={colors.accent}
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.5"
          />
        </g>

        {/* Animation layer */}
        <g id="animation-layer">
          {[...Array(5)].map((_, i) => (
            <circle
              key={i}
              cx={162 + Math.sin((animationFrame + i * 72) * Math.PI / 180) * 10}
              cy={105 + ((animationFrame + i * 50) % 150)}
              r="3"
              fill={colors.loss}
              opacity={0.4 + Math.sin((animationFrame + i * 30) * Math.PI / 180) * 0.3}
            />
          ))}
        </g>

        {/* Stats group - absolute coords */}
        <g id="stats-layer">
          <rect x={isMobile ? 180 : 200} y="55" width={isMobile ? 140 : 180} height="200" fill="#1f2937" rx="8" />

          <text x={isMobile ? 250 : 290} y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">IDEAL RUNTIME</text>
          <text x={isMobile ? 250 : 290} y="105" textAnchor="middle" fill="#22c55e" fontSize="18" fontWeight="bold">
            {idealMinutes.toFixed(1)} min
          </text>

          <text x={isMobile ? 250 : 290} y="135" textAnchor="middle" fill="#94a3b8" fontSize="11">ACTUAL RUNTIME</text>
          <text x={isMobile ? 250 : 290} y="160" textAnchor="middle" fill="#f59e0b" fontSize="18" fontWeight="bold">
            {actualMinutes.toFixed(1)} min
          </text>

          <text x={isMobile ? 250 : 290} y="190" textAnchor="middle" fill="#94a3b8" fontSize="11">CAPACITY LOSS</text>
          <text x={isMobile ? 250 : 290} y="215" textAnchor="middle" fill="#ef4444" fontSize="18" fontWeight="bold">
            {capacityLossPercent().toFixed(1)}%
          </text>

          <text x={isMobile ? 250 : 290} y="245" textAnchor="middle" fill="#94a3b8" fontSize="11">
            Peukert Effect
          </text>
          {/* Comparison path */}
          <path
            d={`M ${isMobile ? 180 : 200} 80 L ${isMobile ? 250 : 290} 95 L ${isMobile ? 320 : 380} 80`}
            fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.3"
          />
        </g>

        {/* Formula group - absolute coords */}
        <g id="formula-layer">
          <rect x="40" y={height - 80} width={width - 80} height="60" fill="rgba(16, 185, 129, 0.1)" rx="8" />
          <path d={`M 40 ${height - 80} L ${width - 40} ${height - 80}`} stroke={colors.accent} strokeWidth="1" opacity="0.5"/>
          <text x={width/2} y={height - 58} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">
            Peukert: t = H x (C / (I x H))^k
          </text>
          <text x={width/2} y={height - 40} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            k={peukertExponent} | I={(loadPower / batteryVoltage).toFixed(1)}A | T={temperature}°C
          </text>
          <text x={width/2} y={height - 24} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Age: {batteryAge} yrs | Cap: {batteryCapacity}Ah
          </text>
        </g>
      </svg>
    );
  };

  // Discharge Rate Visualization for twist phase
  const DischargeRateVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;

    // Calculate runtimes for different C-rates
    const cRates = [0.05, 0.1, 0.2, 0.5, 1, 2, 4];
    const runtimes = cRates.map(rate => {
      const ratedCapacity = 100;
      const baseCurrent = ratedCapacity / 20;
      const actualCurrent = baseCurrent * rate * 20;
      const effectiveCapacity = ratedCapacity * Math.pow(1 / rate, peukertExponent - 1);
      return {
        rate,
        cRate: rate <= 0.05 ? 'C/20' : rate <= 0.1 ? 'C/10' : rate <= 0.2 ? 'C/5' : rate <= 0.5 ? 'C/2' : rate <= 1 ? 'C/1' : rate <= 2 ? '2C' : '4C',
        runtime: Math.max(0, (effectiveCapacity / actualCurrent) * 60),
        efficiency: Math.min(100, (effectiveCapacity / ratedCapacity) * 100),
      };
    });

    const maxRuntime = Math.max(...runtimes.map(r => r.runtime));
    const barWidth = (width - 100) / runtimes.length - 8;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Runtime vs Discharge Rate (100Ah Battery)
        </text>

        {/* Chart area */}
        <g transform="translate(60, 50)">
          <rect x="0" y="0" width={width - 100} height="160" fill="#0f172a" rx="6" />

          {/* Bars */}
          {runtimes.map((r, i) => {
            const barHeight = (r.runtime / maxRuntime) * 140;
            const x = 8 + i * (barWidth + 8);
            const isSelected = Math.abs(r.rate - dischargeRate) < 0.01;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={150 - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill={isSelected ? '#f59e0b' : '#3b82f6'}
                  rx="4"
                  opacity={isSelected ? 1 : 0.7}
                />
                <text x={x + barWidth/2} y="175" textAnchor="middle" fill="#94a3b8" fontSize="11">
                  {r.cRate}
                </text>
                <text x={x + barWidth/2} y={145 - barHeight} textAnchor="middle" fill="#ffffff" fontSize="11">
                  {r.runtime.toFixed(0)}m
                </text>
                <text x={x + barWidth/2} y="190" textAnchor="middle" fill="#64748b" fontSize="11">
                  {r.efficiency.toFixed(0)}%
                </text>
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g transform={`translate(${width/2 - 60}, ${height - 50})`}>
          <text x="0" y="0" fill="#3b82f6" fontSize="11">Runtime (min)</text>
          <text x="0" y="15" fill="#64748b" fontSize="11">Efficiency (%)</text>
        </g>

        {/* Current selection indicator */}
        <g transform={`translate(${width/2 - 80}, ${height - 25})`}>
          <rect x="0" y="-10" width="160" height="25" fill="rgba(245, 158, 11, 0.2)" rx="4" />
          <text x="80" y="5" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
            Selected: {dischargeRate <= 0.05 ? 'C/20' : dischargeRate <= 0.1 ? 'C/10' : dischargeRate <= 0.5 ? 'C/2' : dischargeRate <= 1 ? 'C/1' : dischargeRate <= 2 ? '2C' : '4C'} rate
          </text>
        </g>
      </svg>
    );
  };

  // Progress bar component
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
            background: phase === p ? colors.accent : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '12px 20px', background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex', justifyContent: 'space-between', gap: '12px',
        zIndex: 200,
      }}>
        <button
          onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={isFirst}
          style={{
            padding: '10px 20px', borderRadius: '8px', minHeight: '44px',
            border: `1px solid ${isFirst ? colors.border : colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '14px', opacity: isFirst ? 0.4 : 1,
          }}
        >← Back</button>
        {!isLast && (
          <button
            onClick={() => !isTestActive && nextPhase()}
            disabled={isTestActive}
            style={{
              ...primaryButtonStyle,
              padding: '10px 24px', fontSize: '14px', minHeight: '44px', flex: 1, maxWidth: '240px',
              opacity: isTestActive ? 0.4 : 1,
              cursor: isTestActive ? 'not-allowed' : 'pointer',
            }}
          >Next →</button>
        )}
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>🔋⚡</div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
          UPS Battery Sizing
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px', textAlign: 'center' }}>
          "A 100Ah battery should power a 50A load for 2 hours, right? Simple math... <span style={{ color: colors.loss }}>but physics disagrees</span>. The faster you drain a battery, the less total energy you get."
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '500px', border: `1px solid ${colors.border}` }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "When power fails, UPS batteries must bridge the gap until generators start. Data centers size for 15-minute runtime, but Peukert's Law means a 'simple' calculation can leave you 40% short."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>- Data Center Power Engineering</p>
        </div>

        <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
          Explore Battery Physics
        </button>

        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Exactly 2 hours - the math is straightforward (100Ah x 48V = 4800Wh / 2400W = 2hr)' },
      { id: 'b', text: 'About 60-90 minutes - high discharge rates reduce effective capacity', correct: true },
      { id: 'c', text: 'More than 2 hours - batteries have reserve capacity beyond the rating' },
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
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
            A UPS has a 100Ah battery at 48V. The data center load is 2400W (50A). Simple math says runtime = 2 hours. What will actually happen?
          </h2>

          {/* Static SVG diagram */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <svg width="100%" height="160" viewBox="0 0 500 160" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="predictGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              {/* Battery block */}
              <rect x="30" y="40" width="100" height="80" rx="8" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2"/>
              <rect x="55" y="30" width="50" height="12" rx="3" fill={colors.success}/>
              <rect x="40" y="55" width="80" height="50" rx="4" fill={colors.success} fillOpacity="0.3"/>
              <text x="80" y="85" fontSize="11" fill={colors.success} textAnchor="middle" fontWeight="600">100Ah</text>
              <text x="80" y="100" fontSize="11" fill={colors.textSecondary} textAnchor="middle">@ 48V</text>
              {/* Arrow */}
              <line x1="135" y1="80" x2="195" y2="80" stroke={colors.textMuted} strokeWidth="2"/>
              <polygon points="195,75 205,80 195,85" fill={colors.textMuted}/>
              <text x="170" y="72" fontSize="11" fill={colors.textMuted} textAnchor="middle">50A</text>
              {/* Load block */}
              <rect x="210" y="45" width="110" height="70" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2"/>
              <text x="265" y="75" fontSize="11" fill={colors.accent} textAnchor="middle" fontWeight="700">2400W</text>
              <text x="265" y="92" fontSize="11" fill={colors.textSecondary} textAnchor="middle">Load</text>
              {/* Arrow */}
              <line x1="325" y1="80" x2="385" y2="80" stroke={colors.textMuted} strokeWidth="2"/>
              <polygon points="385,75 395,80 385,85" fill={colors.textMuted}/>
              <text x="360" y="72" fontSize="11" fill={colors.textMuted} textAnchor="middle">t=?</text>
              {/* Result block */}
              <rect x="395" y="45" width="90" height="70" rx="8" fill={colors.bgSecondary} stroke={colors.warning} strokeWidth="2" strokeDasharray="4 4"/>
              <text x="440" y="75" fontSize="13" fill={colors.warning} textAnchor="middle" fontWeight="700">???</text>
              <text x="440" y="93" fontSize="11" fill={colors.textSecondary} textAnchor="middle">Runtime</text>
              {/* Labels */}
              <text x="80" y="140" fontSize="11" fill={colors.textMuted} textAnchor="middle">Battery</text>
              <text x="265" y="140" fontSize="11" fill={colors.textMuted} textAnchor="middle">UPS Load</text>
              <text x="440" y="140" fontSize="11" fill={colors.textMuted} textAnchor="middle">Result</text>
            </svg>
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
              Test My Prediction
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Battery Simulator
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            UPS Battery Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust load power and see how Peukert effect reduces actual runtime. This directly matters for data center design — engineers must account for Peukert's Law when sizing UPS systems.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <BatteryVisualization />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Battery Capacity slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...typo.small, color: colors.textPrimary }}>Battery Capacity</label>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{batteryCapacity} Ah</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={batteryCapacity}
                    onChange={(e) => setBatteryCapacity(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Load Power slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...typo.small, color: colors.textPrimary }}>Load Power</label>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{loadPower} W ({(loadPower/batteryVoltage).toFixed(1)} A)</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="100"
                    value={loadPower}
                    onChange={(e) => setLoadPower(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Temperature slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...typo.small, color: colors.textPrimary }}>Temperature</label>
                    <span style={{ ...typo.small, color: '#f97316', fontWeight: 600 }}>{temperature}°C</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Battery Age slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...typo.small, color: colors.textPrimary }}>Battery Age</label>
                    <span style={{ ...typo.small, color: '#8b5cf6', fontWeight: 600 }}>{batteryAge} years</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={batteryAge}
                    onChange={(e) => setBatteryAge(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {capacityLossPercent() > 20 && (
            <div style={{
              background: `${colors.loss}22`,
              border: `1px solid ${colors.loss}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.loss, margin: 0 }}>
                Notice how high power draw causes {capacityLossPercent().toFixed(0)}% capacity loss! This is Peukert's Law in action.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Battery Discharge
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Peukert's Law: t = H x (C / (I x H))^k</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                As you observed in the experiment, battery capacity is NOT fixed. It depends on how fast you drain it. The faster you discharge, the less total energy you can extract — just as your prediction may have indicated.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Key Variables:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
                <li><strong>t</strong> = actual runtime (hours)</li>
                <li><strong>H</strong> = rated time (typically 20 hours for C/20 rating)</li>
                <li><strong>C</strong> = rated capacity (Ah)</li>
                <li><strong>I</strong> = actual discharge current</li>
                <li><strong>k</strong> = Peukert exponent (1.1-1.3 for lead-acid, ~1.05 for lithium)</li>
              </ul>
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
              Key Insight: C-Rate Matters
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Batteries are rated at C/20 (20-hour discharge). At faster rates:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li><strong>C/10:</strong> ~95% of rated capacity</li>
              <li><strong>C/5:</strong> ~85% of rated capacity</li>
              <li><strong>C/1:</strong> ~60% of rated capacity</li>
              <li><strong>2C:</strong> ~45% of rated capacity</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.loss, marginBottom: '12px' }}>
              Why This Matters for UPS Sizing
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Data centers typically need 10-15 minute backup (very fast discharge). At these rates, you might only get 50-60% of the battery's rated capacity. Engineers must account for this by installing 1.5-2x the calculated capacity!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover More Factors
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Capacity increases because shorter discharge means less time for internal losses' },
      { id: 'b', text: 'Capacity stays the same - Ah is Ah regardless of discharge rate' },
      { id: 'c', text: 'Capacity decreases dramatically - chemical reactions cannot keep up at high rates', correct: true },
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Discharge Rate
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Compare a battery discharged over 20 hours (C/20) vs 1 hour (C/1). What happens to effective capacity?
          </h2>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <svg width="100%" height="160" viewBox="0 0 500 160" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <filter id="twistPredGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              {/* Grid lines */}
              <line x1="40" y1="120" x2="460" y2="120" stroke={colors.textMuted} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4"/>
              <line x1="40" y1="90" x2="460" y2="90" stroke={colors.textMuted} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4"/>
              <line x1="40" y1="60" x2="460" y2="60" stroke={colors.textMuted} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4"/>
              {/* Slow discharge bar */}
              <rect x="80" y="40" width="120" height="80" rx="6" fill={colors.success} fillOpacity="0.3" stroke={colors.success} strokeWidth="2"/>
              <text x="140" y="75" fontSize="12" fill={colors.success} textAnchor="middle" fontWeight="700">100Ah</text>
              <text x="140" y="92" fontSize="11" fill={colors.success} textAnchor="middle">C/20 Rate</text>
              <text x="140" y="108" fontSize="11" fill={colors.textSecondary} textAnchor="middle">5A, 20 hours</text>
              {/* VS label */}
              <text x="250" y="85" fontSize="14" fill={colors.textMuted} textAnchor="middle" fontWeight="700">vs</text>
              {/* Fast discharge bar (unknown) */}
              <rect x="300" y="60" width="120" height="60" rx="6" fill={colors.warning} fillOpacity="0.2" stroke={colors.warning} strokeWidth="2" strokeDasharray="4 4"/>
              <text x="360" y="85" fontSize="14" fill={colors.warning} textAnchor="middle" fontWeight="700">??? Ah</text>
              <text x="360" y="100" fontSize="11" fill={colors.warning} textAnchor="middle">C/1 Rate</text>
              <text x="360" y="135" fontSize="11" fill={colors.textSecondary} textAnchor="middle">100A, 1 hour</text>
              <text x="140" y="140" fontSize="11" fill={colors.textSecondary} textAnchor="middle">Slow discharge</text>
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
              See the Data
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            C-Rate vs Effective Capacity
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how discharge rate affects the energy you can actually extract
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <DischargeRateVisualization />
                </div>

                {/* Stats display */}
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
                    <div style={{ ...typo.h3, color: colors.accent }}>{calculateTwistRuntime().toFixed(1)} min</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Actual Runtime</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.loss }}>
                      {(100 - (calculateTwistRuntime() / (100 / (100/20 * dischargeRate * 20) * 60)) * 100).toFixed(0)}%
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Capacity Lost</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Discharge rate selector */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Select Discharge Rate</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                      {dischargeRate <= 0.05 ? 'C/20 (20hr)' : dischargeRate <= 0.1 ? 'C/10 (10hr)' : dischargeRate <= 0.2 ? 'C/5 (5hr)' : dischargeRate <= 0.5 ? 'C/2 (2hr)' : dischargeRate <= 1 ? 'C/1 (1hr)' : dischargeRate <= 2 ? '2C (30min)' : '4C (15min)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="4"
                    step="0.05"
                    value={dischargeRate}
                    onChange={(e) => setDischargeRate(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>C/20 (Slow)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>4C (Very Fast)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {dischargeRate >= 2 && (
            <div style={{
              background: `${colors.loss}22`,
              border: `1px solid ${colors.loss}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.loss, margin: 0 }}>
                At {dischargeRate}C rate, you lose nearly half the battery's capacity! This is why UPS systems need significant oversizing.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Proper UPS Battery Sizing
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>1.</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Peukert Derating Factor</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                For 10-15 minute UPS runtime (C/4 to C/6 rate), apply <span style={{ color: colors.accent }}>1.3-1.5x derating</span>. A 50kWh theoretical need becomes 65-75kWh installed.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>2.</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>End-of-Life Capacity</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Batteries degrade to ~80% capacity over their life. Design for <span style={{ color: colors.accent }}>1.25x factor</span> to ensure adequate backup even with aged batteries.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>3.</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Temperature Derating</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Below 25C, capacity drops ~1% per degree. At 15C, apply <span style={{ color: colors.accent }}>10% additional derating</span>. Keep battery rooms climate-controlled.
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>4.</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Total Sizing Factor</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Combined: 1.4 (Peukert) x 1.25 (aging) x 1.1 (temp) x 1.1 (safety) = <span style={{ color: colors.accent, fontWeight: 'bold' }}>~2x theoretical capacity</span>. This is why real UPS installations are much larger than "simple math" suggests!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="U P S Battery Sizing"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            App {selectedApp + 1} of {realWorldApps.length}
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
                  {a.short}
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
                How Peukert Effect Applies:
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

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '8px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) setSelectedApp(selectedApp + 1);
              }}
              style={{ ...primaryButtonStyle, flex: 1 }}
            >
              Got It! {selectedApp < realWorldApps.length - 1 ? `Next App →` : ''}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '12px' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        {renderNavDots()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand UPS battery sizing and Peukert effect!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
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
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px' }}>
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
                Previous
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
        {renderBottomBar()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)` }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px 100px' }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          UPS Battery Sizing Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why battery capacity depends on discharge rate and how to properly size UPS systems for critical applications.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              "Peukert's Law: faster discharge = less capacity",
              'C/1 rate delivers only 50-60% of C/20 capacity',
              'Apply 1.5-2x derating for real-world sizing',
              'Temperature and aging further reduce capacity',
              'Lithium has lower Peukert exponent than lead-acid',
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
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default UPSBatterySizingRenderer;
