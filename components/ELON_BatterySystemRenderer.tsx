'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// BATTERY ENERGY STORAGE SYSTEM (BESS) - Complete 10-Phase Game
// Cell chemistry, pack architecture, degradation management
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

interface ELON_BatterySystemRendererProps {
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
    scenario: "A utility needs a battery system that can provide 100MW for 4 hours to cover evening peak demand after solar generation drops off.",
    question: "What C-rate would this 400MWh battery operate at?",
    options: [
      { id: 'a', label: "0.25C — the battery discharges over 4 hours", correct: true },
      { id: 'b', label: "1C — the battery discharges in 1 hour" },
      { id: 'c', label: "4C — the battery discharges in 15 minutes" },
      { id: 'd', label: "C-rate depends on chemistry, not power/energy ratio" }
    ],
    explanation: "C-rate = Power / Energy = 100MW / 400MWh = 0.25C. At 0.25C, it takes 1/0.25 = 4 hours to fully discharge. This is typical for energy-shifting applications."
  },
  {
    scenario: "An engineer is comparing NMC (nickel-manganese-cobalt) and LFP (lithium iron phosphate) batteries for a 20-year grid storage project.",
    question: "Why might LFP be preferred despite lower energy density?",
    options: [
      { id: 'a', label: "LFP offers 2x cycle life, better thermal stability, and no cobalt dependency", correct: true },
      { id: 'b', label: "LFP has higher energy density than NMC" },
      { id: 'c', label: "LFP is always cheaper per kWh of capacity" },
      { id: 'd', label: "LFP charges faster than NMC" }
    ],
    explanation: "LFP typically achieves 4,000-10,000 cycles vs NMC's 1,500-3,000 cycles. Its olivine crystal structure resists thermal runaway, and it avoids expensive, ethically problematic cobalt."
  },
  {
    scenario: "A battery management system (BMS) detects that cell #47 in a 96-cell series string has reached 3.65V while most cells are at 3.3V.",
    question: "What should the BMS do?",
    options: [
      { id: 'a', label: "Activate cell balancing to equalize voltages across the string", correct: true },
      { id: 'b', label: "Increase charging current to bring other cells up faster" },
      { id: 'c', label: "Shut down the entire system permanently" },
      { id: 'd', label: "Ignore it — small voltage differences are normal" }
    ],
    explanation: "Cell balancing (passive or active) bleeds energy from high cells or transfers it to low cells. Without balancing, capacity is limited by the weakest cell and overcharging risks thermal runaway."
  },
  {
    scenario: "A BESS operator notices round-trip efficiency has dropped from 92% to 85% over 3 years of operation at high C-rates.",
    question: "What is the most likely cause of this efficiency loss?",
    options: [
      { id: 'a', label: "Increased internal resistance from SEI layer growth and lithium plating", correct: true },
      { id: 'b', label: "The inverter software needs updating" },
      { id: 'c', label: "Ambient temperature changes" },
      { id: 'd', label: "The AC grid frequency has shifted" }
    ],
    explanation: "As batteries age, the solid-electrolyte interphase (SEI) layer thickens and lithium plating occurs, increasing internal resistance. Higher resistance means more I²R losses, reducing round-trip efficiency."
  },
  {
    scenario: "A 100MWh BESS is cycling between 10% and 90% state of charge (SOC) daily. The operator considers expanding the range to 0-100%.",
    question: "What is the primary risk of using full depth of discharge (DOD)?",
    options: [
      { id: 'a', label: "Dramatically accelerated degradation — full DOD can halve cycle life", correct: true },
      { id: 'b', label: "The battery will deliver less power" },
      { id: 'c', label: "Round-trip efficiency improves but at safety cost" },
      { id: 'd', label: "No risk — batteries are designed for full DOD" }
    ],
    explanation: "Operating at voltage extremes (fully charged or fully depleted) stresses the electrode materials. Limiting DOD to 80% (10-90% SOC) can double or triple cycle life compared to 100% DOD."
  },
  {
    scenario: "During a hot summer day (45°C ambient), a BESS container's cooling system fails. Internal cell temperatures reach 60°C.",
    question: "What is the immediate danger?",
    options: [
      { id: 'a', label: "Thermal runaway cascade — one cell overheating can trigger adjacent cells", correct: true },
      { id: 'b', label: "The battery will simply stop working until cooled" },
      { id: 'c', label: "Efficiency drops slightly but operation continues safely" },
      { id: 'd', label: "Only the coolant needs replacing" }
    ],
    explanation: "Above ~60°C, exothermic reactions can begin in lithium-ion cells. If one cell enters thermal runaway (~150°C+), it can heat neighboring cells past their thermal runaway threshold, creating a dangerous cascade."
  },
  {
    scenario: "A frequency regulation market requires batteries to respond within 4 seconds and cycle thousands of times per year with shallow discharges.",
    question: "Which battery characteristic matters most for this application?",
    options: [
      { id: 'a', label: "High power capability (high C-rate) and excellent cycle life at shallow DOD", correct: true },
      { id: 'b', label: "Maximum energy capacity (MWh)" },
      { id: 'c', label: "Lowest possible cost per kWh" },
      { id: 'd', label: "Highest possible voltage" }
    ],
    explanation: "Frequency regulation needs fast power response (high C-rate) and tolerates thousands of shallow cycles. Energy capacity matters less since each cycle uses only 2-5% of capacity."
  },
  {
    scenario: "A battery pack uses cells rated at 3.2V nominal and 50Ah. The pack configuration is 16 cells in series, 4 strings in parallel (16s4p).",
    question: "What are the pack's nominal voltage and total energy?",
    options: [
      { id: 'a', label: "51.2V nominal, 10.24 kWh total energy", correct: true },
      { id: 'b', label: "12.8V nominal, 2.56 kWh total energy" },
      { id: 'c', label: "51.2V nominal, 2.56 kWh total energy" },
      { id: 'd', label: "204.8V nominal, 40.96 kWh total energy" }
    ],
    explanation: "Series adds voltage: 16 × 3.2V = 51.2V. Parallel adds capacity: 4 × 50Ah = 200Ah. Energy = V × Ah = 51.2V × 200Ah = 10,240Wh = 10.24 kWh."
  },
  {
    scenario: "Tesla's Megapack uses LFP chemistry and is rated for a 20-year operational life with daily cycling.",
    question: "Approximately how many full cycles must the cells survive?",
    options: [
      { id: 'a', label: "About 7,300 cycles (365 days × 20 years)", correct: true },
      { id: 'b', label: "About 1,000 cycles" },
      { id: 'c', label: "About 100,000 cycles" },
      { id: 'd', label: "About 500 cycles" }
    ],
    explanation: "20 years × 365 days/year = 7,300 cycles. LFP cells rated at 4,000-10,000+ cycles can achieve this, especially with controlled DOD and temperature management."
  },
  {
    scenario: "A new BESS project is evaluating augmentation strategy — adding new cells as old ones degrade rather than oversizing the initial system.",
    question: "What is the key advantage of augmentation over initial oversizing?",
    options: [
      { id: 'a', label: "Lower upfront cost and ability to use future cheaper, better cells", correct: true },
      { id: 'b', label: "Augmentation eliminates the need for a BMS" },
      { id: 'c', label: "New cells always perfectly match old cell characteristics" },
      { id: 'd', label: "Augmentation requires less physical space" }
    ],
    explanation: "Battery costs drop ~15% per year. By deferring some capacity purchases, you benefit from future cost reductions and technology improvements. However, mixing old and new cells requires careful BMS management."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔋',
    title: 'Tesla Megapack — Moss Landing',
    short: 'World\'s largest battery energy storage system',
    tagline: 'LFP chemistry powering California\'s grid',
    description: 'The Moss Landing BESS in Monterey County, California is one of the world\'s largest battery installations. Using Tesla Megapacks with LFP chemistry, it provides critical grid services including peak shaving, renewable energy time-shifting, and emergency backup power for millions of homes.',
    connection: 'LFP chemistry delivers the 7,000+ cycle life needed for 20-year daily cycling while eliminating cobalt supply chain risks.',
    howItWorks: 'Megapacks are pre-assembled containerized units with integrated inverters, thermal management, and BMS. They connect to the grid via medium-voltage transformers.',
    stats: [
      { value: '400MWh', label: 'LFP energy capacity', icon: '🔋' },
      { value: "World's largest", label: 'Scale achievement', icon: '🌍' },
      { value: 'Moss Landing', label: 'California location', icon: '📍' }
    ],
    examples: ['Peak demand shaving', 'Solar energy shifting', 'Emergency backup', 'Frequency regulation'],
    companies: ['Tesla Energy', 'Pacific Gas & Electric', 'Vistra Energy'],
    futureImpact: 'Next-generation Megapacks will push to 4-hour+ duration with sodium-ion augmentation.',
    color: '#10B981'
  },
  {
    icon: '⚡',
    title: 'Hornsdale Power Reserve',
    short: 'The battery that changed the energy industry',
    tagline: 'Proving grid-scale batteries can replace gas peakers',
    description: 'Built in South Australia in just 100 days after a famous Elon Musk bet, Hornsdale demonstrated that batteries could provide grid stability services faster and cheaper than gas turbines. It saved consumers $150M in its first two years by preventing price spikes.',
    connection: 'High C-rate capability allows the battery to inject power within milliseconds for frequency control — far faster than any thermal generator.',
    howItWorks: 'The system monitors grid frequency 4,000 times per second and automatically injects or absorbs power to maintain stability.',
    stats: [
      { value: '150MW', label: 'Power capacity', icon: '⚡' },
      { value: '194MWh', label: 'Energy storage', icon: '🔋' },
      { value: 'Frequency', label: 'Primary service', icon: '📊' }
    ],
    examples: ['Frequency control', 'Arbitrage trading', 'Emergency reserve', 'Renewable firming'],
    companies: ['Neoen', 'Tesla', 'ElectraNet', 'AEMO'],
    futureImpact: 'Hornsdale\'s success has inspired 100+ GWh of global BESS deployments.',
    color: '#3B82F6'
  },
  {
    icon: '🧪',
    title: 'CATL Sodium-Ion Batteries',
    short: 'Beyond lithium — abundant element chemistry',
    tagline: 'No lithium, no cobalt, no nickel required',
    description: 'CATL\'s sodium-ion battery technology eliminates dependence on lithium, using the earth\'s most abundant metal salt. While energy density is lower than lithium-ion, the dramatic cost reduction and supply chain security make it ideal for stationary storage.',
    connection: 'Sodium-ion operates on the same intercalation principle as lithium-ion but uses Na+ ions, which are 1,000× more abundant in Earth\'s crust.',
    howItWorks: 'Prussian blue analogue cathodes and hard carbon anodes shuttle sodium ions during charge/discharge, similar to lithium-ion but with different host materials.',
    stats: [
      { value: 'No lithium', label: 'Resource independence', icon: '🧪' },
      { value: '$40/kWh', label: 'Cost target', icon: '💰' },
      { value: 'Stationary', label: 'Primary application', icon: '🏭' }
    ],
    examples: ['Grid-scale storage', 'Telecom backup', 'Industrial UPS', 'Developing world electrification'],
    companies: ['CATL', 'HiNa Battery', 'Faradion', 'Natron Energy'],
    futureImpact: 'Sodium-ion could capture 20%+ of the stationary storage market by 2030.',
    color: '#F59E0B'
  },
  {
    icon: '🔩',
    title: 'Form Energy Iron-Air Batteries',
    short: '100-hour duration at unprecedented low cost',
    tagline: 'Reversible rusting for multi-day storage',
    description: 'Form Energy\'s iron-air battery technology uses the simple chemistry of rusting (iron oxidation) and un-rusting (reduction) to store energy for up to 100 hours. At a target cost of $20/kWh, it could solve the multi-day storage problem that lithium-ion cannot economically address.',
    connection: 'Iron-air batteries trade power density and efficiency for extreme duration and low cost — the opposite design point from lithium-ion peaker batteries.',
    howItWorks: 'During discharge, iron anodes oxidize (rust) by absorbing oxygen from air. During charge, electricity reverses the reaction, regenerating metallic iron and releasing oxygen.',
    stats: [
      { value: '100hr', label: 'Discharge duration', icon: '⏱️' },
      { value: '$20/kWh', label: 'Cost target', icon: '💰' },
      { value: 'Iron', label: 'Earth-abundant chemistry', icon: '🔩' }
    ],
    examples: ['Multi-day renewable backup', 'Seasonal shifting', 'Grid resilience', 'Dunkelflaute coverage'],
    companies: ['Form Energy', 'ESS Inc.', 'Ambri', 'Malta Inc.'],
    futureImpact: 'Multi-day storage could eliminate the last barrier to 100% renewable grids.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_BatterySystemRenderer: React.FC<ELON_BatterySystemRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state — C-rate slider
  const [cRate, setCRate] = useState(1.0);

  // Chemistry state
  const [chemistry, setChemistry] = useState<'NMC' | 'LFP'>('NMC');

  // Twist phase state
  const [twistCRate, setTwistCRate] = useState(1.0);

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

  // Calculate BESS metrics based on C-rate
  const calculateEfficiency = (cr: number): number => {
    // Round-trip efficiency decreases with higher C-rate due to I²R losses
    // 0.25C -> ~92%, 1C -> ~89%, 2C -> ~86%, 4C -> ~82%
    return 92 - (cr * 2.5);
  };

  const calculateDegradation = (cr: number, chem: 'NMC' | 'LFP'): number => {
    // Annual capacity fade percentage
    // NMC: higher degradation, LFP: lower degradation
    const base = chem === 'NMC' ? 2.5 : 1.2;
    return base * (0.5 + cr * 0.5);
  };

  const calculateTemperature = (cr: number): number => {
    // Operating temperature increases with C-rate
    return 25 + (cr * 10);
  };

  const calculateCycleLife = (cr: number, chem: 'NMC' | 'LFP'): number => {
    // Cycle life at 80% DOD
    const base = chem === 'NMC' ? 3000 : 6000;
    return Math.round(base / (0.5 + cr * 0.5));
  };

  const calculateDischargeTime = (cr: number): number => {
    return 60 / cr; // minutes
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
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
        gameType: 'battery-system',
        gameTitle: 'Battery System',
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

  // Current metrics
  const efficiency = calculateEfficiency(cRate);
  const degradation = calculateDegradation(cRate, chemistry);
  const cellTemp = calculateTemperature(cRate);
  const cycleLife = calculateCycleLife(cRate, chemistry);
  const dischargeMinutes = calculateDischargeTime(cRate);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.cold})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.cold})`,
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

  // Battery Pack SVG Visualization
  const BatteryVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 440;
    const socNorm = Math.max(0, Math.min(1, 1 - (cRate - 0.25) / 3.75)); // SOC decreases as C-rate empties faster
    const effNorm = (efficiency - 80) / 12; // 0 to 1 for 80-92%
    const tempNorm = (cellTemp - 25) / 40; // 0 to 1 for 25-65°C
    const cellCount = 12;
    const cellWidth = isMobile ? 18 : 24;
    const cellHeight = 50;
    const cellGap = isMobile ? 3 : 4;
    const moduleStartX = (width - (cellCount * (cellWidth + cellGap))) / 2;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          {/* Cell gradient - charge level */}
          <linearGradient id="cellChargeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset={`${socNorm * 100}%`} stopColor="#10B981" />
            <stop offset={`${socNorm * 100}%`} stopColor="#1a1a24" />
            <stop offset="100%" stopColor="#1a1a24" />
          </linearGradient>
          {/* Discharge flow gradient */}
          <linearGradient id="dischargeFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
          </linearGradient>
          {/* Temperature heatmap gradient */}
          <linearGradient id="tempHeatGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="33%" stopColor="#10B981" />
            <stop offset="66%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* SOC meter gradient */}
          <linearGradient id="socMeterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="30%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          {/* Container gradient */}
          <linearGradient id="containerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          {/* Module bus bar */}
          <linearGradient id="busBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          {/* Efficiency curve gradient */}
          <linearGradient id="effCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="cellGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Pulse filter for active discharge */}
          <filter id="pulseGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Shadow for container */}
          <filter id="containerShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
          </filter>
          {/* Degradation curve gradient */}
          <linearGradient id="degradeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          {/* Animated charge flow */}
          <linearGradient id="chargeFlowAnim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="50%" stopColor="rgba(16,185,129,0.8)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
          {/* Inner cell pattern */}
          <pattern id="cellPattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="rgba(255,255,255,0.02)" />
            <rect width="2" height="2" fill="rgba(255,255,255,0.04)" />
          </pattern>
          {/* Radial glow for temperature */}
          <radialGradient id="tempRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={cellTemp > 45 ? 'rgba(239,68,68,0.3)' : cellTemp > 35 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.1)'} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="30" x2={width - 30} y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="100" x2={width - 30} y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="170" x2={width - 30} y2="170" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="240" x2={width - 30} y2="240" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="20" x2={width / 2} y2="360" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          BESS Cutaway — {chemistry} Pack at {cRate}C
        </text>

        {/* Container outline */}
        <rect
          x={20} y={30} width={width - 40} height={130}
          rx="8" fill="url(#containerGrad)" stroke="#4B5563" strokeWidth="1.5"
          filter="url(#containerShadow)"
        />
        <text x={35} y={48} fill="#9CA3AF" fontSize="11" fontWeight="600">CONTAINER</text>

        {/* Temperature radial overlay */}
        <ellipse cx={width / 2} cy={95} rx={width / 3} ry="50" fill="url(#tempRadial)" />

        {/* Bus bars (top and bottom of cells) */}
        <rect x={moduleStartX - 5} y={52} width={cellCount * (cellWidth + cellGap) + 5} height={4} rx="2" fill="url(#busBarGrad)" />
        <rect x={moduleStartX - 5} y={114} width={cellCount * (cellWidth + cellGap) + 5} height={4} rx="2" fill="url(#busBarGrad)" />

        {/* Individual cells with charge level */}
        {Array.from({ length: cellCount }).map((_, i) => {
          const cx = moduleStartX + i * (cellWidth + cellGap);
          const cy = 58;
          const cellSoc = Math.max(0.05, socNorm - (i * 0.01));
          const cellTempOffset = Math.sin(i * 0.8) * 3;
          const thisCellTemp = cellTemp + cellTempOffset;
          return (
            <g key={`cell-${i}`}>
              {/* Cell body */}
              <rect
                x={cx} y={cy} width={cellWidth} height={cellHeight}
                rx="2" fill="#1a1a24" stroke={thisCellTemp > 50 ? '#EF4444' : thisCellTemp > 40 ? '#F59E0B' : '#374151'}
                strokeWidth="1"
              />
              {/* Cell charge fill */}
              <rect
                x={cx + 1} y={cy + cellHeight * (1 - cellSoc)}
                width={cellWidth - 2} height={cellHeight * cellSoc}
                rx="1"
                fill={chemistry === 'NMC' ? '#3B82F6' : '#10B981'}
                opacity={0.7 + cellSoc * 0.3}
              />
              {/* Cell terminal */}
              <rect x={cx + cellWidth / 2 - 3} y={cy - 3} width={6} height={4} rx="1" fill="#D97706" />
              {/* Cell pattern overlay */}
              <rect x={cx} y={cy} width={cellWidth} height={cellHeight} rx="2" fill="url(#cellPattern)" />
            </g>
          );
        })}

        {/* Module label */}
        <text x={width / 2} y={130} fill="#9CA3AF" fontSize="11" textAnchor="middle" fontWeight="500">
          MODULE — {cellCount} cells in series ({chemistry})
        </text>

        {/* Rack outline */}
        <rect x={15} y={25} width={width - 30} height={140} rx="10" fill="none" stroke="#6B7280" strokeWidth="1" strokeDasharray="6,3" />
        <text x={width - 35} y={48} fill="#6B7280" fontSize="11" fontWeight="500" textAnchor="end">RACK</text>

        {/* SOC Meter */}
        <g>
          <text x={width - 50} y={75} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="500">SOC</text>
          <rect x={width - 60} y={80} width={20} height={60} rx="3" fill="#1a1a24" stroke="#374151" strokeWidth="1" />
          <rect
            x={width - 58} y={80 + 58 * (1 - socNorm)}
            width={16} height={58 * socNorm}
            rx="2" fill="url(#socMeterGrad)"
            filter={socNorm < 0.3 ? 'url(#pulseGlow)' : undefined}
          />
          <text x={width - 50} y={148} fill={socNorm > 0.5 ? '#10B981' : socNorm > 0.2 ? '#F59E0B' : '#EF4444'} fontSize="11" textAnchor="middle" fontWeight="700">
            {Math.round(socNorm * 100)}%
          </text>
        </g>

        {/* Charge/Discharge flow arrows */}
        <g>
          <text x={width / 2} y={178} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="500">
            Discharge Flow at {cRate}C — {dischargeMinutes.toFixed(0)} min full discharge
          </text>
          <rect x={40} y={183} width={width - 80} height={6} rx="3" fill="url(#dischargeFlowGrad)" opacity="0.5" />
          {/* Animated flow indicator */}
          <circle cx={40 + ((Date.now() / 20) % (width - 80))} cy={186} r="4" fill="#10B981" filter="url(#cellGlow)" opacity="0.8" />
        </g>

        {/* Temperature heatmap bar */}
        <g>
          <text x={40} y={210} fill="#94a3b8" fontSize="11" fontWeight="500">Cell Temperature</text>
          <text x={width - 40} y={210} fill={cellTemp > 45 ? colors.hot : cellTemp > 35 ? colors.warning : colors.success} fontSize="11" fontWeight="700" textAnchor="end">
            {cellTemp.toFixed(1)}°C
          </text>
          <rect x={40} y={215} width={width - 80} height={10} rx="5" fill={colors.border} />
          <rect x={40} y={215} width={(width - 80) * tempNorm} height={10} rx="5" fill="url(#tempHeatGrad)"
            filter={cellTemp > 50 ? 'url(#pulseGlow)' : undefined}
          />
          <circle cx={40 + (width - 80) * tempNorm} cy={220} r="6" fill={cellTemp > 45 ? '#EF4444' : cellTemp > 35 ? '#F59E0B' : '#10B981'} stroke="white" strokeWidth="1.5" />
        </g>

        {/* Efficiency curve */}
        <g>
          <text x={40} y={248} fill="#94a3b8" fontSize="11" fontWeight="500">Round-Trip Efficiency</text>
          <text x={width - 40} y={248} fill={efficiency > 88 ? colors.success : efficiency > 84 ? colors.warning : colors.hot} fontSize="11" fontWeight="700" textAnchor="end">
            {efficiency.toFixed(1)}%
          </text>
          {/* Efficiency curve path */}
          <path
            d={`M 40 260 Q ${width * 0.25} ${260 - 60} ${width * 0.4} ${260 - 40} Q ${width * 0.55} ${260 - 20} ${width * 0.7} ${260 + 10} Q ${width * 0.85} ${260 + 40} ${width - 40} ${260 + 60}`}
            stroke="url(#effCurveGrad)" fill="none" strokeWidth="2" opacity="0.6"
          />
          {/* Current point on curve */}
          <circle
            cx={40 + (width - 80) * ((cRate - 0.25) / 3.75)}
            cy={260 - 60 + ((cRate - 0.25) / 3.75) * 120}
            r="7" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#cellGlow)"
          />
          {/* Axis labels */}
          <text x={40} y={340} fill="#6B7280" fontSize="11">0.25C</text>
          <text x={width - 50} y={340} fill="#6B7280" fontSize="11">4C</text>
        </g>

        {/* Degradation curve */}
        <g>
          <text x={40} y={358} fill="#94a3b8" fontSize="11" fontWeight="500">Degradation Rate</text>
          <text x={width - 40} y={358} fill={degradation > 3 ? colors.hot : degradation > 2 ? colors.warning : colors.success} fontSize="11" fontWeight="700" textAnchor="end">
            {degradation.toFixed(1)}%/yr
          </text>
          <rect x={40} y={365} width={width - 80} height={8} rx="4" fill={colors.border} />
          <rect x={40} y={365} width={(width - 80) * Math.min(1, degradation / 5)} height={8} rx="4" fill="url(#degradeGrad)" />
        </g>

        {/* Legend */}
        <g>
          <rect x={40} y={height - 22} width="10" height="10" rx="2" fill={chemistry === 'NMC' ? '#3B82F6' : '#10B981'} />
          <text x={55} y={height - 14} fill="#94a3b8" fontSize="11">{chemistry} Cells</text>
          <rect x={130} y={height - 22} width="10" height="10" rx="2" fill="url(#tempHeatGrad)" />
          <text x={145} y={height - 14} fill="#94a3b8" fontSize="11">Temp Map</text>
          <circle cx={225} cy={height - 17} r="4" fill={colors.accent} />
          <text x={234} y={height - 14} fill="#94a3b8" fontSize="11">Efficiency Pt</text>
          <rect x={320} y={height - 22} width="10" height="10" rx="2" fill="url(#degradeGrad)" />
          <text x={335} y={height - 14} fill="#94a3b8" fontSize="11">Degradation</text>
        </g>

        {/* Formula bar */}
        <rect x={width / 2 - 130} y={height - 40} width="260" height="16" rx="4" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.3)" />
        <text x={width / 2} y={height - 29} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Discharge Time = 1/C-rate = 1/{cRate} = {dischargeMinutes.toFixed(0)} min | η = {efficiency.toFixed(1)}%
        </text>
      </svg>
    );
  };

  // Chemistry Comparison SVG for twist_play
  const ChemistryComparisonVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const twistEff = calculateEfficiency(twistCRate);
    const nmcDeg = calculateDegradation(twistCRate, 'NMC');
    const lfpDeg = calculateDegradation(twistCRate, 'LFP');
    const nmcCycles = calculateCycleLife(twistCRate, 'NMC');
    const lfpCycles = calculateCycleLife(twistCRate, 'LFP');
    const nmcPackSize = 100; // normalized
    const lfpPackSize = 130; // 30% larger

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="nmcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="lfpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="lifetimeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1a1a24" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="compGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="30" y1="45" x2={width - 30} y2="45" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="290" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          NMC vs LFP Chemistry Comparison at {twistCRate}C
        </text>

        {/* Pack size comparison */}
        <text x={width / 4} y={45} fill="#60A5FA" fontSize="11" textAnchor="middle" fontWeight="600">NMC Pack</text>
        <text x={3 * width / 4} y={45} fill="#34D399" fontSize="11" textAnchor="middle" fontWeight="600">LFP Pack (+30% size)</text>

        {/* NMC pack representation */}
        <rect x={width / 4 - 40} y={55} width={80} height={50} rx="4" fill="url(#nmcGrad)" opacity="0.8" />
        <text x={width / 4} y={84} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">{nmcPackSize}%</text>

        {/* LFP pack representation (30% larger) */}
        <rect x={3 * width / 4 - 52} y={50} width={104} height={60} rx="4" fill="url(#lfpGrad)" opacity="0.8" />
        <text x={3 * width / 4} y={84} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">{lfpPackSize}%</text>

        {/* Cycle life bars */}
        <text x={width / 2} y={130} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="500">Cycle Life (80% DOD)</text>

        {/* NMC bar */}
        <rect x={40} y={140} width={(width - 80) * (nmcCycles / 12000)} height={16} rx="4" fill="url(#nmcGrad)" />
        <text x={45 + (width - 80) * (nmcCycles / 12000)} y={153} fill="#60A5FA" fontSize="11" fontWeight="600">
          NMC: {nmcCycles.toLocaleString()}
        </text>

        {/* LFP bar */}
        <rect x={40} y={162} width={(width - 80) * (lfpCycles / 12000)} height={16} rx="4" fill="url(#lfpGrad)" />
        <text x={45 + (width - 80) * (lfpCycles / 12000)} y={175} fill="#34D399" fontSize="11" fontWeight="600">
          LFP: {lfpCycles.toLocaleString()}
        </text>

        {/* Degradation comparison */}
        <text x={width / 2} y={200} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="500">Annual Degradation Rate</text>

        <rect x={40} y={210} width={(width - 80) * (nmcDeg / 5)} height={14} rx="3" fill="#3B82F6" opacity="0.7" />
        <text x={45 + (width - 80) * (nmcDeg / 5)} y={222} fill="#60A5FA" fontSize="11" fontWeight="600">
          NMC: {nmcDeg.toFixed(1)}%/yr
        </text>

        <rect x={40} y={228} width={(width - 80) * (lfpDeg / 5)} height={14} rx="3" fill="#10B981" opacity="0.7" />
        <text x={45 + (width - 80) * (lfpDeg / 5)} y={240} fill="#34D399" fontSize="11" fontWeight="600">
          LFP: {lfpDeg.toFixed(1)}%/yr
        </text>

        {/* Safety comparison */}
        <text x={width / 2} y={265} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="500">Thermal Runaway Onset</text>
        <text x={width / 4} y={285} fill="#60A5FA" fontSize="11" textAnchor="middle" fontWeight="600">NMC: ~150°C</text>
        <text x={3 * width / 4} y={285} fill="#34D399" fontSize="11" textAnchor="middle" fontWeight="600">LFP: ~270°C</text>
        <text x={3 * width / 4} y={298} fill="#34D399" fontSize="11" textAnchor="middle">(much safer)</text>

        {/* Legend */}
        <rect x={40} y={height - 18} width="10" height="10" rx="2" fill="url(#nmcGrad)" />
        <text x={55} y={height - 10} fill="#94a3b8" fontSize="11">NMC (Ni-Mn-Co)</text>
        <rect x={180} y={height - 18} width="10" height="10" rx="2" fill="url(#lfpGrad)" />
        <text x={195} y={height - 10} fill="#94a3b8" fontSize="11">LFP (Iron Phosphate)</text>
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
          paddingTop: '44px',
          paddingBottom: '80px',
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
            🔋⚡
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Battery System
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;The grid-scale battery revolution is not coming — it is here. Let&apos;s explore how <span style={{ color: colors.accent }}>massive battery systems</span> are transforming our energy infrastructure, from cell chemistry to container-scale architecture.&quot;
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
              &quot;Storage is the killer app for renewables. A world with cheap, abundant batteries is a world that can run on sunshine and wind — even when the sun isn&apos;t shining and the wind isn&apos;t blowing.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Grid Energy Storage Principles
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
      { id: 'a', text: '1 minute — C-rate measures speed, and 1C is fast' },
      { id: 'b', text: '1 hour — 1C means the battery delivers its full energy in 1 hour' },
      { id: 'c', text: '10 hours — grid batteries are designed for slow discharge' },
      { id: 'd', text: '1 day — large batteries must discharge slowly for safety' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
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
          paddingBottom: '80px',
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
              A 100MWh battery rated at 1C can deliver its full energy in...
            </h2>

            {/* Static SVG showing battery concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictBattGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="predictEmptyGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#4B5563" />
                  </linearGradient>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">100MWh Battery at 1C Rate</text>

                {/* Full battery */}
                <rect x="60" y="45" width="120" height="80" rx="6" fill="url(#predictBattGrad)" />
                <rect x="100" y="38" width="40" height="10" rx="3" fill="#10B981" />
                <text x="120" y="90" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">100%</text>
                <text x="120" y="145" textAnchor="middle" fill="#94a3b8" fontSize="11">FULL — 100MWh</text>

                {/* Arrow */}
                <text x="200" y="85" textAnchor="middle" fill={colors.accent} fontSize="20">→</text>
                <text x="200" y="105" textAnchor="middle" fill="#94a3b8" fontSize="11">1C discharge</text>

                {/* Empty battery */}
                <rect x="220" y="45" width="120" height="80" rx="6" fill="url(#predictEmptyGrad)" />
                <rect x="260" y="38" width="40" height="10" rx="3" fill="#4B5563" />
                <text x="280" y="90" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="700">0%</text>
                <text x="280" y="145" textAnchor="middle" fill="#94a3b8" fontSize="11">EMPTY — How long?</text>

                <text x="200" y="180" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">Power = C-rate × Energy = 1 × 100MWh = ???MW</text>
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

  // PLAY PHASE - Interactive BESS Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
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
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              BESS Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Battery energy storage systems are the backbone of the renewable energy transition. Understanding C-rate, efficiency, degradation, and thermal management is essential for designing systems that last 20+ years while delivering reliable power.
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
                <strong style={{ color: colors.textPrimary }}>C-Rate</strong> is the rate at which a battery is discharged relative to its capacity. 1C means full discharge in 1 hour; 0.25C means 4 hours; 4C means 15 minutes.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Round-Trip Efficiency</strong> is the percentage of energy recovered from a charge-discharge cycle. Losses come from internal resistance (I²R heating).
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.hot }}>Degradation Rate</strong> describes how quickly a battery loses capacity over time, measured in percentage of original capacity lost per year.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows a cutaway of a battery pack — from individual cells to modules to the container. Adjust the C-rate slider to see how faster discharge affects efficiency, temperature, and degradation. Watch the SOC meter and temperature heatmap respond in real time.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
                <BatteryVisualization />
              </div>

              {/* Chemistry selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Cell Chemistry</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {chemistry === 'NMC' ? 'NMC (Nickel-Manganese-Cobalt)' : 'LFP (Lithium Iron Phosphate)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['NMC', 'LFP'] as const).map((chem) => (
                    <button
                      key={chem}
                      onClick={() => { playSound('click'); setChemistry(chem); }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: chemistry === chem ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        background: chemistry === chem ? `${colors.accent}22` : colors.bgSecondary,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        minHeight: '44px',
                        flex: 1,
                      }}
                    >
                      {chem}
                    </button>
                  ))}
                </div>
              </div>

              {/* C-rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>C-Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {cRate.toFixed(2)}C ({dischargeMinutes.toFixed(0)} min discharge)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.05"
                  value={cRate}
                  onChange={(e) => setCRate(parseFloat(e.target.value))}
                  onInput={(e) => setCRate(parseFloat((e.target as HTMLInputElement).value))}
                  aria-label="C-Rate"
                  style={sliderStyle(colors.accent, cRate, 0.25, 4)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>0.25C (4hr)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>1C (1hr)</span>
                  <span style={{ ...typo.small, color: colors.hot }}>4C (15min)</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: efficiency > 88 ? colors.success : efficiency > 84 ? colors.warning : colors.hot }}>{efficiency.toFixed(1)}%</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Round-Trip Eff.</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: cellTemp > 45 ? colors.hot : cellTemp > 35 ? colors.warning : colors.success }}>{cellTemp.toFixed(0)}°C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cell Temp</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: degradation > 3 ? colors.hot : degradation > 2 ? colors.warning : colors.success }}>
                    {cycleLife.toLocaleString()}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cycle Life</div>
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
        minHeight: '100vh',
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
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Battery Storage
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — at 1C, a 100MWh battery delivers 100MW for exactly 1 hour. C-rate is simply the ratio of power to energy capacity.'
                : 'As you observed in the experiment, at 1C a battery delivers its full energy capacity in exactly 1 hour. A 100MWh battery at 1C delivers 100MW power.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Discharge Time = 1 / C-rate</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The <span style={{ color: colors.accent }}>C-rate</span> defines how fast energy is extracted. At <span style={{ color: colors.success }}>0.25C</span>, it takes 4 hours (ideal for solar time-shifting). At <span style={{ color: colors.hot }}>4C</span>, it takes just 15 minutes (for frequency regulation peakers). The tradeoff: higher C-rates mean more <span style={{ color: colors.warning }}>heat losses</span> and faster <span style={{ color: colors.hot }}>degradation</span>.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Power = C-rate × Energy = 1C × 100MWh = <strong>100MW for 1 hour</strong>
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
                Why Efficiency Drops at Higher C-Rates
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Internal resistance (R) causes I²R heating losses. At higher C-rates, current (I) increases, and since losses scale with I², doubling the C-rate quadruples the heat losses. This is why a 0.25C battery achieves 92% round-trip efficiency while a 4C battery may only reach 82%.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key BESS Metrics
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: '0.25C', value: '4 hr', desc: 'Energy shifting' },
                  { name: '1C', value: '1 hr', desc: 'Peak shaving' },
                  { name: '2C', value: '30 min', desc: 'Fast response' },
                  { name: '4C', value: '15 min', desc: 'Frequency reg' },
                  { name: 'RTE', value: '85-92%', desc: 'Round-trip eff' },
                  { name: 'Life', value: '3-10k', desc: 'Cycles at 80% DOD' },
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
      { id: 'a', text: 'Higher energy density — you can fit more energy in less space' },
      { id: 'b', text: '30% larger pack but 2x cycle life and better safety' },
      { id: 'c', text: 'More expensive — LFP uses rare earth elements' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
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
          paddingBottom: '80px',
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
                New Variable: Chemistry Change
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Switching from NMC to LFP chemistry means...
            </h2>

            {/* Static SVG showing chemistry comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistNmcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="twistLfpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
                <text x="100" y="25" textAnchor="middle" fill="#60A5FA" fontSize="12" fontWeight="700">NMC Battery</text>
                <rect x="40" y="35" width="120" height="55" rx="4" fill="url(#twistNmcGrad)" />
                <text x="100" y="67" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Compact</text>
                <text x="100" y="110" textAnchor="middle" fill="#94a3b8" fontSize="11">Higher density, shorter life</text>

                <text x="200" y="67" textAnchor="middle" fill="#F59E0B" fontSize="18">→</text>

                <text x="300" y="25" textAnchor="middle" fill="#34D399" fontSize="12" fontWeight="700">LFP Battery</text>
                <rect x="225" y="30" width="150" height="65" rx="4" fill="url(#twistLfpGrad)" />
                <text x="300" y="67" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">30% Larger</text>
                <text x="300" y="110" textAnchor="middle" fill="#94a3b8" fontSize="11">Lower density, but how much longer life?</text>
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
                See Chemistry Comparison
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Chemistry Comparison
  if (phase === 'twist_play') {
    const twistNmcCycles = calculateCycleLife(twistCRate, 'NMC');
    const twistLfpCycles = calculateCycleLife(twistCRate, 'LFP');
    const twistNmcDeg = calculateDegradation(twistCRate, 'NMC');
    const twistLfpDeg = calculateDegradation(twistCRate, 'LFP');

    return (
      <div style={{
        minHeight: '100vh',
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
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              NMC vs LFP Chemistry Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Adjust C-rate to see how each chemistry responds differently to stress
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              {/* SVG Visualization */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
                <ChemistryComparisonVisualization />
              </div>

              {/* Educational panel */}
              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                  <strong style={{ color: colors.accent }}>What you're seeing:</strong> The side-by-side comparison shows how NMC and LFP chemistries respond differently to the same C-rate stress, revealing dramatic differences in cycle life, degradation rate, and thermal runaway thresholds.
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                  <strong style={{ color: colors.success }}>Cause and Effect:</strong> As you increase the C-rate slider, watch how LFP maintains a much longer cycle life and lower degradation rate than NMC — the gap widens at higher stress levels, showing why LFP dominates grid storage despite its larger physical footprint.
                </p>
              </div>

              {/* C-rate slider for twist */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>C-Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistCRate.toFixed(2)}C</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.05"
                  value={twistCRate}
                  onChange={(e) => setTwistCRate(parseFloat(e.target.value))}
                  onInput={(e) => setTwistCRate(parseFloat((e.target as HTMLInputElement).value))}
                  aria-label="C-Rate for chemistry comparison"
                  style={sliderStyle(colors.accent, twistCRate, 0.25, 4)}
                />
              </div>

              {/* Comparison results */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ ...typo.h3, color: '#60A5FA' }}>NMC</div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>{twistNmcCycles.toLocaleString()} cycles</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{twistNmcDeg.toFixed(1)}%/yr degradation</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Runaway: ~150°C</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ ...typo.h3, color: '#34D399' }}>LFP</div>
                  <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>{twistLfpCycles.toLocaleString()} cycles</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{twistLfpDeg.toFixed(1)}%/yr degradation</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Runaway: ~270°C</div>
                </div>
              </div>

              {/* Key insight */}
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  LFP pack is 30% larger for the same energy, but:
                </p>
                <div style={{
                  ...typo.h3,
                  color: colors.success,
                }}>
                  {Math.round(twistLfpCycles / twistNmcCycles * 10) / 10}x longer cycle life
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  LFP total lifetime energy throughput is {Math.round((twistLfpCycles / twistNmcCycles) / 1.3 * 100)}% of NMC per unit volume — often better economics over 20 years
                </p>
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
              Understand the Chemistry
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
        minHeight: '100vh',
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
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              The Chemistry Tradeoff: NMC vs LFP
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Energy Density vs Longevity Tradeoff</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  NMC cells pack ~250 Wh/kg while LFP achieves ~170 Wh/kg — a 30% size penalty. But LFP&apos;s olivine crystal structure is far more stable. The iron-phosphate bond resists oxygen release even at extreme temperatures, making thermal runaway nearly impossible under normal conditions.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why the Industry Is Shifting to LFP</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  For stationary storage where weight and volume matter less, LFP&apos;s advantages dominate: 2x cycle life means half the replacement cost, no cobalt means stable supply chains, and inherent safety means simpler fire suppression systems. Tesla switched its Megapack line entirely to LFP.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Battery chemistry selection is not about finding the &quot;best&quot; chemistry — it is about matching chemistry to application. EVs may prefer NMC for range, but grid storage overwhelmingly favors LFP for its unbeatable combination of safety, longevity, and cost-effectiveness.
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
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
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
          paddingBottom: '80px',
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
                      // Auto-advance to next uncompleted app or to test phase
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
                        // All apps completed, auto-advance to test
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
          minHeight: '100vh',
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
            paddingBottom: '80px',
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
                {passed ? 'You understand battery energy storage systems and their engineering tradeoffs!' : 'Review the concepts and try again.'}
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
                  Review &amp; Try Again
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
        minHeight: '100vh',
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
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Battery Systems
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of BESS design, chemistry, C-rates, degradation, and thermal management to real-world engineering scenarios. Consider the relationships between power, energy, efficiency, and cycle life as you work through each problem.
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
          paddingTop: '44px',
          paddingBottom: '80px',
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
            Battery System Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how grid-scale batteries work — from cell chemistry to pack architecture, degradation management to real-world deployment.
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
                'C-rate defines power/energy ratio and discharge time',
                'Higher C-rates reduce efficiency and accelerate degradation',
                'LFP offers 2x cycle life vs NMC with better safety',
                'BMS, thermal management, and DOD are critical for longevity',
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

export default ELON_BatterySystemRenderer;
