'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// ELON GAME #3: GRID BALANCE - Complete 10-Phase Game
// Real-time grid frequency balancing — generation must match load every second
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

interface ELON_GridBalanceRendererProps {
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
    scenario: "The North American grid operates at a nominal frequency of 60Hz. A large coal plant (1GW) trips offline unexpectedly during peak demand.",
    question: "What happens to grid frequency immediately after the plant trips?",
    options: [
      { id: 'a', label: "Frequency drops below 60Hz because demand now exceeds supply", correct: true },
      { id: 'b', label: "Frequency increases because less power means less resistance" },
      { id: 'c', label: "Frequency stays exactly at 60Hz — the grid self-corrects instantly" },
      { id: 'd', label: "Frequency oscillates randomly" }
    ],
    explanation: "When a generator trips, supply instantly falls below demand. The deficit is drawn from the rotational kinetic energy of remaining generators, slowing them down and reducing frequency."
  },
  {
    scenario: "A grid operator observes frequency rising to 60.05Hz at 2 PM on a mild spring day with high solar generation.",
    question: "What does this frequency rise indicate?",
    options: [
      { id: 'a', label: "Generation is exceeding demand — there is surplus power on the grid", correct: true },
      { id: 'b', label: "Demand is exceeding generation" },
      { id: 'c', label: "The measurement equipment is faulty" },
      { id: 'd', label: "A transmission line has been disconnected" }
    ],
    explanation: "Frequency above 60Hz means generators are producing more power than loads are consuming. The excess energy accelerates generator rotors, increasing frequency."
  },
  {
    scenario: "Traditional grids relied on large synchronous generators (coal, gas, nuclear) with massive spinning turbines. These provide 'inertia' to the grid.",
    question: "Why is rotational inertia important for grid stability?",
    options: [
      { id: 'a', label: "It resists sudden frequency changes, buying time for other generators to respond", correct: true },
      { id: 'b', label: "It generates extra electricity during emergencies" },
      { id: 'c', label: "It stores energy for nighttime use" },
      { id: 'd', label: "It reduces transmission losses" }
    ],
    explanation: "Inertia from spinning masses acts like a buffer — when supply/demand mismatch occurs, the kinetic energy in rotors absorbs the shock, slowing frequency change and giving automatic controls time to respond."
  },
  {
    scenario: "A governor on a steam turbine detects that grid frequency has dropped to 59.95Hz. The governor's 'droop' setting is 5%.",
    question: "How does droop control work?",
    options: [
      { id: 'a', label: "The generator automatically increases output proportionally to the frequency drop", correct: true },
      { id: 'b', label: "The generator shuts down to protect itself" },
      { id: 'c', label: "The generator maintains constant output regardless of frequency" },
      { id: 'd', label: "The generator switches to backup fuel" }
    ],
    explanation: "Droop control means a generator increases its output proportionally to frequency deviation. A 5% droop means the generator goes from 0% to 100% output over a 5% frequency change (3Hz for a 60Hz system)."
  },
  {
    scenario: "California's grid sees a phenomenon called the 'duck curve' — net load (demand minus solar) creates a deep midday valley and steep evening ramp.",
    question: "What causes the steep evening ramp on the duck curve?",
    options: [
      { id: 'a', label: "Solar generation drops rapidly at sunset while evening demand rises", correct: true },
      { id: 'b', label: "Wind generation always peaks at night" },
      { id: 'c', label: "People turn off their lights at sunset" },
      { id: 'd', label: "Power plants intentionally reduce output" }
    ],
    explanation: "As the sun sets, solar output drops from its peak to zero in about 3 hours. Simultaneously, people return home and turn on appliances, creating a 14GW ramp that must be met by dispatchable generators."
  },
  {
    scenario: "A grid with 60% renewable penetration experiences a sudden cloud cover event, reducing solar output by 5GW in 10 minutes.",
    question: "Why is this more problematic than losing a 5GW coal plant on a conventional grid?",
    options: [
      { id: 'a', label: "Renewables provide less rotational inertia, so frequency drops faster", correct: true },
      { id: 'b', label: "Renewable energy is lower quality than coal energy" },
      { id: 'c', label: "Solar panels cannot be restarted once they stop" },
      { id: 'd', label: "It isn't more problematic — both are equivalent" }
    ],
    explanation: "Solar inverters don't provide rotational inertia like synchronous generators. With less inertia, the same power loss causes a faster rate of frequency change (higher df/dt), giving less time for response."
  },
  {
    scenario: "Texas (ERCOT) sometimes curtails wind generation — telling wind farms to reduce output even when wind is blowing.",
    question: "Why would a grid operator curtail free, zero-emission wind energy?",
    options: [
      { id: 'a', label: "Excess generation would push frequency too high, risking equipment damage", correct: true },
      { id: 'b', label: "Wind turbines need regular rest periods" },
      { id: 'c', label: "The electricity market price is always negative at night" },
      { id: 'd', label: "Transmission lines cannot carry wind energy" }
    ],
    explanation: "When generation exceeds demand (often at night with high wind and low load), frequency rises. Curtailment reduces supply to match demand, keeping frequency within safe bounds."
  },
  {
    scenario: "A grid operator is planning for a region with 80% renewable energy. They need to maintain frequency stability.",
    question: "What is the capacity factor and why does it matter for grid planning?",
    options: [
      { id: 'a', label: "The ratio of actual output to maximum possible output — renewables average 20-35%, so more capacity is needed", correct: true },
      { id: 'b', label: "The maximum number of customers a plant can serve" },
      { id: 'c', label: "The percentage of time a plant operates at full power" },
      { id: 'd', label: "The efficiency of converting fuel to electricity" }
    ],
    explanation: "Capacity factor = actual energy / (nameplate capacity x time). Solar averages ~25%, wind ~35%, nuclear ~92%. Low capacity factors mean you need 3-4x nameplate capacity to reliably meet demand."
  },
  {
    scenario: "Battery storage systems can respond to frequency deviations in milliseconds, much faster than traditional generators (seconds).",
    question: "How do batteries help maintain grid frequency?",
    options: [
      { id: 'a', label: "They absorb excess energy when frequency is high and inject energy when frequency is low", correct: true },
      { id: 'b', label: "They only store solar energy for nighttime use" },
      { id: 'c', label: "They replace all need for spinning generators" },
      { id: 'd', label: "They only work during blackouts" }
    ],
    explanation: "Grid-scale batteries provide synthetic inertia and frequency regulation by rapidly charging (absorbing surplus) or discharging (supplying deficit), responding 10-100x faster than thermal plants."
  },
  {
    scenario: "The European grid operates at 50Hz. During a system split event in 2021, Turkey's grid separated and frequency in Southeast Europe dropped to 49.74Hz.",
    question: "Why is maintaining frequency within tight tolerances (±0.2Hz) so critical?",
    options: [
      { id: 'a', label: "Equipment is designed for specific frequencies — deviation causes damage, and cascading failures can cause blackouts", correct: true },
      { id: 'b', label: "Consumer electronics work better at exactly 50Hz" },
      { id: 'c', label: "It's only important for clocks that use grid frequency" },
      { id: 'd', label: "Frequency tolerance is mainly a regulatory requirement with no physical basis" }
    ],
    explanation: "Generator protection relays trip at ~±2Hz to prevent damage. Large deviations cause cascading trips — each generator that disconnects worsens the imbalance, potentially collapsing the entire grid in seconds."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F976}',
    title: 'Texas ERCOT 2021 Freeze',
    short: 'When extreme cold collapsed the Texas grid',
    tagline: 'Four minutes from total grid collapse',
    description: 'In February 2021, Winter Storm Uri brought record cold to Texas. Natural gas wells froze, wind turbines iced over, and demand for heating surged. ERCOT lost 48.6GW of generation capacity. At 1:55 AM on February 15, grid frequency dropped to 59.4Hz — just 4 minutes and 37 seconds from triggering a total, uncontrolled blackout that could have taken months to recover from.',
    connection: 'The fundamental supply-demand balance failed catastrophically: 48.6GW of generation went offline while heating demand spiked to record levels, demonstrating that grid frequency is the vital sign of power system health.',
    howItWorks: 'ERCOT was forced to shed 20GW of load (rolling blackouts affecting 4.5 million homes) to arrest the frequency decline. The isolated Texas grid had no interconnections to import emergency power from neighboring systems.',
    stats: [
      { value: '4.5GW', label: 'Generation Lost in Minutes', icon: '\u26A1' },
      { value: '59.4Hz', label: 'Minimum Frequency', icon: '\u{1F4C9}' },
      { value: '4 min', label: 'From Total Collapse', icon: '\u23F1' }
    ],
    examples: ['Frozen natural gas infrastructure', 'Iced wind turbines', 'Overwhelmed demand response', 'Cascading generator trips'],
    companies: ['ERCOT', 'Vistra Energy', 'NRG Energy', 'CenterPoint Energy'],
    futureImpact: 'Texas is now mandating weatherization, building battery storage, and considering limited grid interconnections to prevent a repeat event.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F986}',
    title: 'California Duck Curve',
    short: 'Managing the solar generation midday surplus and evening ramp',
    tagline: 'The shape that is reshaping the grid',
    description: 'California\'s massive solar buildout has created the "duck curve" — net load (total demand minus solar) that dips deeply at midday and ramps steeply at sunset. The belly of the duck represents periods where solar exceeds local demand, risking over-generation. The neck represents a 14GW ramp in just 3 hours as solar disappears and evening demand rises.',
    connection: 'The duck curve illustrates the grid balance challenge: surplus energy at midday pushes frequency up (requiring curtailment), while the rapid evening ramp can drop frequency if generators cannot start fast enough.',
    howItWorks: 'CAISO manages this with flexible gas plants, battery storage (now 10GW+), demand response, and exporting surplus solar to neighboring states via WECC interconnections.',
    stats: [
      { value: '14GW', label: 'Evening Ramp Rate', icon: '\u{1F4C8}' },
      { value: '3 hours', label: 'Ramp Window', icon: '\u23F0' },
      { value: '30%', label: 'Solar Penetration', icon: '\u2600\uFE0F' }
    ],
    examples: ['Midday solar curtailment', 'Evening gas peaker dispatch', 'Battery charging strategies', 'Demand response programs'],
    companies: ['CAISO', 'PG&E', 'SCE', 'Tesla Megapack'],
    futureImpact: 'As battery costs fall, 4-8 hour storage will flatten the duck curve, storing midday solar for evening peaks and reducing the need for gas peakers.',
    color: '#F59E0B'
  },
  {
    icon: '\u2600\uFE0F',
    title: 'Australian Rooftop Solar',
    short: 'When distributed solar creates minimum demand challenges',
    tagline: 'Too much of a good thing',
    description: 'Australia has the world\'s highest rooftop solar penetration — over 30% of homes have panels. On sunny weekends with low commercial demand, the grid faces a new problem: operational demand drops to near zero or goes negative. AEMO must keep minimum synchronous generators online for system strength (inertia and fault current), creating a floor that solar pushes against.',
    connection: 'When distributed solar pushes net demand below the minimum generation threshold, frequency rises dangerously. Grid operators must curtail solar or risk losing the synchronous machines needed for stability.',
    howItWorks: 'AEMO uses emergency solar curtailment via inverter standards (AS/NZS 4777.2), minimum demand forecasting, and synchronous condenser installations to maintain system strength even at very low demand.',
    stats: [
      { value: '30%', label: 'Rooftop Penetration', icon: '\u{1F3E0}' },
      { value: '0GW', label: 'Minimum Net Demand', icon: '\u{1F4C9}' },
      { value: '15GW', label: 'Rooftop Capacity', icon: '\u2600\uFE0F' }
    ],
    examples: ['Emergency solar curtailment', 'Synchronous condensers', 'Grid-forming inverters', 'Virtual power plants'],
    companies: ['AEMO', 'Ausgrid', 'Tesla Virtual Power Plant', 'SA Power Networks'],
    futureImpact: 'Grid-forming inverters will allow solar and batteries to provide system strength services, eliminating the need for minimum synchronous generation.',
    color: '#10B981'
  },
  {
    icon: '\u{1F1E9}\u{1F1EA}',
    title: 'Germany Energiewende',
    short: 'Balancing 65% renewable peaks on a 50Hz grid',
    tagline: 'The world\'s most ambitious energy transition',
    description: 'Germany\'s Energiewende (energy transition) has pushed renewable penetration to record levels — 65% of demand met by renewables at peak times. The 50Hz grid must maintain ±0.2Hz tolerance despite massive variability from North Sea wind and distributed solar. Cross-border flows with neighbors create additional balancing challenges across the synchronized European grid.',
    connection: 'Germany demonstrates that high renewable grids can maintain frequency stability through advanced forecasting, market mechanisms (15-minute trading intervals), and strong interconnections — but require fundamentally different operating practices.',
    howItWorks: 'German TSOs (TenneT, 50Hertz, Amprion, TransnetBW) use day-ahead and intraday markets, redispatch, cross-border balancing, and increasingly battery storage to maintain the 50Hz target within ±0.2Hz.',
    stats: [
      { value: '65%', label: 'Renewable Peak', icon: '\u{1F33F}' },
      { value: '50Hz', label: 'Grid Target', icon: '\u{1F50C}' },
      { value: '\u00B10.2Hz', label: 'Tolerance Band', icon: '\u{1F3AF}' }
    ],
    examples: ['North Sea offshore wind', 'Bavarian solar farms', 'Cross-border balancing', 'Hydrogen electrolysis flexibility'],
    companies: ['TenneT', '50Hertz', 'Amprion', 'TransnetBW'],
    futureImpact: 'Germany aims for 80% renewable electricity by 2030, requiring massive expansion of storage, grid infrastructure, and demand-side flexibility.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_GridBalanceRenderer: React.FC<ELON_GridBalanceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [renewablePct, setRenewablePct] = useState(30);
  const [timeOfDay, setTimeOfDay] = useState(14);
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase - battery storage scenario
  const [batteryCapacity, setBatteryCapacity] = useState(2);
  const [loadSpike, setLoadSpike] = useState(false);

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
// Animation loop for frequency oscillation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Grid simulation calculations
  const calculateSupply = (hour: number, renewPct: number) => {
    const thermalBase = 40 * (1 - renewPct / 100) * 0.85;
    const solarPeak = 30 * (renewPct / 100);
    const solarOutput = hour >= 6 && hour <= 18
      ? solarPeak * Math.sin(((hour - 6) / 12) * Math.PI)
      : 0;
    const windOutput = 15 * (renewPct / 100) * (0.5 + 0.3 * Math.sin(hour * 0.5));
    return thermalBase + solarOutput + windOutput;
  };

  const calculateDemand = (hour: number) => {
    const baseLoad = 25;
    const morningPeak = 12 * Math.exp(-0.5 * Math.pow((hour - 8) / 2, 2));
    const eveningPeak = 18 * Math.exp(-0.5 * Math.pow((hour - 19) / 2.5, 2));
    const dayActivity = 8 * (hour >= 7 && hour <= 22 ? 1 : 0);
    return baseLoad + morningPeak + eveningPeak + dayActivity;
  };

  const getFrequency = (hour: number, renewPct: number, battGW: number, spike: boolean) => {
    const supply = calculateSupply(hour, renewPct);
    let demand = calculateDemand(hour);
    if (spike) demand += 2;
    const batteryResponse = battGW > 0 ? Math.min(battGW, Math.abs(demand - supply) * 0.7) * Math.sign(demand - supply) : 0;
    const effectiveSupply = supply + batteryResponse;
    const mismatch = (effectiveSupply - demand) / demand;
    const inertiaFactor = 1 - (renewPct / 100) * 0.6;
    const freqDeviation = mismatch * 4.0 / Math.max(0.3, inertiaFactor);
    return 60 + freqDeviation + Math.sin(animFrame * 0.1) * 0.01;
  };

  const currentSupply = calculateSupply(timeOfDay, renewablePct);
  const currentDemand = calculateDemand(timeOfDay) + (loadSpike ? 2 : 0);
  const currentFreq = getFrequency(timeOfDay, renewablePct, batteryCapacity, loadSpike);

  // Premium design colors
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
    supply: '#10B981',
    demand: '#EF4444',
    frequency: '#3B82F6',
    solar: '#F59E0B',
    wind: '#06B6D4',
    thermal: '#6b7280',
    battery: '#8B5CF6',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'grid-balance',
        gameTitle: 'Grid Balance',
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

  // Grid Balance SVG Visualization — supply/demand curves + frequency
  const GridVisualization = ({ showBattery }: { showBattery?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 380;
    const chartLeft = 45;
    const chartRight = width - 20;
    const chartW = chartRight - chartLeft;
    const topChartTop = 40;
    const topChartBot = 180;
    const botChartTop = 220;
    const botChartBot = 350;

    // Build supply & demand paths over 24h
    const supplyPoints: string[] = [];
    const demandPoints: string[] = [];
    const solarPoints: string[] = [];
    const windPoints: string[] = [];
    const thermalPoints: string[] = [];
    const freqPoints: string[] = [];
    const mismatchPolygon: string[] = [];

    for (let h = 0; h <= 24; h += 0.5) {
      const x = chartLeft + (h / 24) * chartW;
      const supply = calculateSupply(h, renewablePct);
      const demand = calculateDemand(h) + (loadSpike && showBattery ? 2 : 0);
      const sy = topChartBot - ((supply / 70) * (topChartBot - topChartTop));
      const dy = topChartBot - ((demand / 70) * (topChartBot - topChartTop));

      supplyPoints.push(`${x},${sy}`);
      demandPoints.push(`${x},${dy}`);

      // Breakdown
      const thermalBase = 40 * (1 - renewablePct / 100) * 0.85;
      const solarPeak = 30 * (renewablePct / 100);
      const solarOut = h >= 6 && h <= 18 ? solarPeak * Math.sin(((h - 6) / 12) * Math.PI) : 0;
      const windOut = 15 * (renewablePct / 100) * (0.5 + 0.3 * Math.sin(h * 0.5));

      const ty = topChartBot - ((thermalBase / 70) * (topChartBot - topChartTop));
      const soly = topChartBot - (((thermalBase + solarOut) / 70) * (topChartBot - topChartTop));
      const wy = topChartBot - (((thermalBase + solarOut + windOut) / 70) * (topChartBot - topChartTop));

      thermalPoints.push(`${x},${ty}`);
      solarPoints.push(`${x},${soly}`);
      windPoints.push(`${x},${wy}`);

      // Frequency
      const freq = getFrequency(h, renewablePct, showBattery ? batteryCapacity : 0, loadSpike && !!showBattery);
      const freqY = botChartBot - (((freq - 59.5) / 1.0) * (botChartBot - botChartTop));
      const clampedFreqY = Math.max(botChartTop, Math.min(botChartBot, freqY));
      freqPoints.push(`${x},${clampedFreqY}`);
    }

    // Mismatch fill polygon
    for (let h = 0; h <= 24; h += 0.5) {
      const x = chartLeft + (h / 24) * chartW;
      const supply = calculateSupply(h, renewablePct);
      const sy = topChartBot - ((supply / 70) * (topChartBot - topChartTop));
      mismatchPolygon.push(`${x},${sy}`);
    }
    for (let h = 24; h >= 0; h -= 0.5) {
      const x = chartLeft + (h / 24) * chartW;
      const demand = calculateDemand(h) + (loadSpike && showBattery ? 2 : 0);
      const dy = topChartBot - ((demand / 70) * (topChartBot - topChartTop));
      mismatchPolygon.push(`${x},${dy}`);
    }

    // Current time marker
    const timeX = chartLeft + (timeOfDay / 24) * chartW;
    const freqNominalY = botChartBot - (((60 - 59.5) / 1.0) * (botChartBot - botChartTop));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Grid Balance visualization">
        <defs>
          <linearGradient id="supplyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="demandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.error} />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <linearGradient id="freqGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.frequency} />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="solarFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.solar} stopOpacity="0.4" />
            <stop offset="100%" stopColor={colors.solar} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="windFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.wind} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.wind} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.battery} />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Grid Supply vs Demand — {renewablePct}% Renewable
        </text>

        {/* Top chart grid lines */}
        {[20, 40, 60].map(gw => {
          const y = topChartBot - ((gw / 70) * (topChartBot - topChartTop));
          return (
            <g key={`grid-${gw}`}>
              <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
              <text x={chartLeft - 5} y={y + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">{gw}</text>
            </g>
          );
        })}
        <text x={10} y={(topChartTop + topChartBot) / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform={`rotate(-90, 10, ${(topChartTop + topChartBot) / 2})`}>GW</text>

        {/* Mismatch shading */}
        <polygon
          points={mismatchPolygon.join(' ')}
          fill="rgba(239, 68, 68, 0.08)"
          stroke="none"
        />

        {/* Supply area fills */}
        <polygon
          points={`${chartLeft},${topChartBot} ${thermalPoints.join(' ')} ${chartRight},${topChartBot}`}
          fill="rgba(107, 114, 128, 0.2)"
          stroke="none"
        />
        <polygon
          points={`${thermalPoints.join(' ')} ${[...solarPoints].reverse().join(' ')}`}
          fill="url(#solarFill)"
          stroke="none"
        />
        <polygon
          points={`${solarPoints.join(' ')} ${[...windPoints].reverse().join(' ')}`}
          fill="url(#windFill)"
          stroke="none"
        />

        {/* Supply line */}
        <polyline
          points={supplyPoints.join(' ')}
          stroke="url(#supplyGrad)"
          fill="none"
          strokeWidth="2.5"
        />

        {/* Demand line */}
        <polyline
          points={demandPoints.join(' ')}
          stroke="url(#demandGrad)"
          fill="none"
          strokeWidth="2.5"
          strokeDasharray="6,3"
        />

        {/* Power flow arrows at current time */}
        {[topChartTop + 30, topChartTop + 55, topChartTop + 80].map((y, i) => {
          const arrowX = timeX + Math.sin((animFrame + i * 40) * 0.05) * 10;
          const direction = currentSupply > currentDemand ? 1 : -1;
          return (
            <g key={`arrow-${i}`} opacity={0.5 + i * 0.15}>
              <polygon
                points={`${arrowX - 6 * direction},${y - 3} ${arrowX + 6 * direction},${y} ${arrowX - 6 * direction},${y + 3}`}
                fill={currentSupply > currentDemand ? colors.success : colors.error}
              />
            </g>
          );
        })}

        {/* Time marker - top chart */}
        <line x1={timeX} y1={topChartTop} x2={timeX} y2={topChartBot} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7" />

        {/* Interactive supply point */}
        <circle
          cx={timeX}
          cy={topChartBot - ((currentSupply / 70) * (topChartBot - topChartTop))}
          r="5"
          fill={colors.success}
          stroke="white"
          strokeWidth="2"
          filter="url(#softGlow)"
        />

        {/* Interactive demand point */}
        <circle
          cx={timeX}
          cy={topChartBot - ((currentDemand / 70) * (topChartBot - topChartTop))}
          r="5"
          fill={colors.error}
          stroke="white"
          strokeWidth="2"
          filter="url(#softGlow)"
        />

        {/* Time labels */}
        {[0, 6, 12, 18, 24].map(h => (
          <text key={`t-${h}`} x={chartLeft + (h / 24) * chartW} y={topChartBot + 16} fill={colors.textMuted} fontSize="11" textAnchor="middle">{h === 0 ? '0:00' : `${h}:00`}</text>
        ))}

        {/* Section divider */}
        <line x1={chartLeft} y1={200} x2={chartRight} y2={200} stroke={colors.border} strokeWidth="1" />
        <text x={chartLeft + 2} y={209} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="start">Grid Frequency (Hz)</text>

        {/* Bottom chart — frequency */}
        {/* 60Hz reference line */}
        <line x1={chartLeft} y1={freqNominalY} x2={chartRight} y2={freqNominalY} stroke={colors.frequency} strokeWidth="1" strokeDasharray="8,4" opacity="0.4" />
        <text x={chartRight + 2} y={freqNominalY + 3} fill={colors.frequency} fontSize="11" opacity="0.6">60Hz</text>

        {/* Tolerance band */}
        {(() => {
          const highY = botChartBot - (((60.2 - 59.5) / 1.0) * (botChartBot - botChartTop));
          const lowY = botChartBot - (((59.8 - 59.5) / 1.0) * (botChartBot - botChartTop));
          return (
            <rect x={chartLeft} y={highY} width={chartW} height={lowY - highY} fill="rgba(59, 130, 246, 0.05)" stroke="rgba(59, 130, 246, 0.15)" strokeDasharray="4,4" />
          );
        })()}

        {/* Frequency line */}
        <polyline
          points={freqPoints.join(' ')}
          stroke="url(#freqGrad)"
          fill="none"
          strokeWidth="2"
        />

        {/* Frequency axis labels */}
        {[59.5, 59.8, 60.0, 60.2, 60.5].map(f => {
          const y = botChartBot - (((f - 59.5) / 1.0) * (botChartBot - botChartTop));
          return (
            <g key={`f-${f}`}>
              <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2,4" />
              <text x={chartLeft - 5} y={y + 3} fill={colors.textMuted} fontSize="11" textAnchor="end">{f.toFixed(1)}</text>
            </g>
          );
        })}

        {/* Time marker - bottom chart */}
        <line x1={timeX} y1={botChartTop} x2={timeX} y2={botChartBot} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7" />

        {/* Interactive frequency point */}
        <circle
          cx={timeX}
          cy={Math.max(botChartTop, Math.min(botChartBot, botChartBot - (((currentFreq - 59.5) / 1.0) * (botChartBot - botChartTop))))}
          r="8"
          fill={Math.abs(currentFreq - 60) > 0.2 ? colors.error : colors.frequency}
          stroke="white"
          strokeWidth="2"
          filter="url(#glowFilter)"
        />

        {/* Frequency value label */}
        <text
          x={timeX}
          y={botChartTop - 5}
          fill={Math.abs(currentFreq - 60) > 0.2 ? colors.error : colors.frequency}
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          {currentFreq.toFixed(3)} Hz
        </text>

        {/* Battery indicator */}
        {showBattery && batteryCapacity > 0 && (
          <g>
            <rect x={chartRight - 60} y={topChartTop} width="55" height="20" rx="4" fill="rgba(139, 92, 246, 0.2)" stroke={colors.battery} strokeWidth="1" />
            <text x={chartRight - 33} y={topChartTop + 14} fill={colors.battery} fontSize="11" fontWeight="600" textAnchor="middle">{batteryCapacity}GW Batt</text>
          </g>
        )}

        {/* Legend */}
        <g>
          <rect x={chartLeft} y={height - 25} width="10" height="10" rx="2" fill={colors.success} />
          <text x={chartLeft + 14} y={height - 16} fill={colors.textMuted} fontSize="11">Supply</text>
          <rect x={chartLeft + 55} y={height - 25} width="10" height="10" rx="2" fill={colors.error} opacity="0.7" />
          <text x={chartLeft + 69} y={height - 16} fill={colors.textMuted} fontSize="11">Demand</text>
          <circle cx={chartLeft + 125} cy={height - 20} r="4" fill={colors.solar} />
          <text x={chartLeft + 133} y={height - 16} fill={colors.textMuted} fontSize="11">Solar</text>
          <circle cx={chartLeft + 173} cy={height - 20} r="4" fill={colors.wind} />
          <text x={chartLeft + 181} y={height - 16} fill={colors.textMuted} fontSize="11">Wind</text>
          <circle cx={chartLeft + 217} cy={height - 20} r="4" fill={colors.frequency} />
          <text x={chartLeft + 225} y={height - 16} fill={colors.textMuted} fontSize="11">Freq</text>
        </g>
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
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u26A1\uD83D\uDD0C'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Grid Balance
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"The electric grid must balance supply and demand "}
            <span style={{ color: colors.accent }}>every single second</span>
            {". If generation doesn't match load, the frequency deviates from 60Hz — and the entire system can collapse in minutes."}
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
              "The grid is the largest machine ever built by humanity, and it has no storage — every electron consumed must be generated at that exact instant. Frequency is the heartbeat that tells us if supply and demand are in balance."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Power Systems Engineering
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
      { id: 'a', text: 'Nothing — the grid adjusts automatically' },
      { id: 'b', text: 'Frequency drops because demand exceeds supply' },
      { id: 'c', text: 'Frequency increases due to the extra load' },
      { id: 'd', text: 'Only voltage changes, not frequency' },
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
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens to grid frequency when a 2GW data center suddenly comes online without warning?
            </h2>

            {/* Static SVG showing supply/demand concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictSupply" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.success} />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="predictDemand" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.error} />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Supply vs Demand Balance</text>
                <text x="200" y="50" textAnchor="middle" fill={colors.success} fontSize="12">Generation: 45 GW (balanced)</text>
                <rect x="60" y="60" width="280" height="22" rx="4" fill="url(#predictSupply)" opacity="0.7" />
                <text x="200" y="76" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">45 GW Supply</text>
                <text x="200" y="105" textAnchor="middle" fill={colors.error} fontSize="12">Demand: 45 GW + 2 GW data center = ???</text>
                <rect x="60" y="115" width="280" height="22" rx="4" fill="url(#predictDemand)" opacity="0.5" />
                <rect x="340" y="115" width="30" height="22" rx="4" fill={colors.warning} />
                <text x="200" y="131" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">45 GW + 2 GW</text>
                <text x="200" y="160" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">60.000 Hz → ???</text>
                <text x="200" y="185" textAnchor="middle" fill={colors.textMuted} fontSize="11">What happens to grid frequency?</text>
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
              {'\u2190'} Back
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

  // PLAY PHASE - Grid Balance Simulator
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
              Grid Balance Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Grid operators must balance generation and demand in real-time. As renewable penetration increases, the variability of solar and wind creates new challenges for maintaining the 60Hz frequency that powers everything from hospitals to data centers.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Grid Frequency (60Hz)</strong> is the speed at which generators rotate. When supply matches demand, frequency stays at exactly 60Hz.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Renewable Penetration</strong> refers to the percentage of electricity generated from variable sources like solar and wind.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Supply-Demand Mismatch</strong> describes when generation does not equal load, causing frequency to deviate from 60Hz.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows supply (solar + wind + thermal) versus demand over 24 hours, and the resulting grid frequency. Adjust the renewable penetration slider and observe how higher renewables create periods of surplus and deficit. Watch the frequency oscillate around 60Hz.
            </p>

            {/* Key equation */}
            <div style={{
              background: `${colors.frequency}11`,
              border: `1px solid ${colors.frequency}33`,
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <span style={{ fontFamily: 'monospace', color: colors.accent, fontSize: '15px' }}>
                {'f = 60 + (P_supply \u2212 P_demand) \u00D7 K_sensitivity'}
              </span>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '4px 0 0 0' }}>
                df/dt = (P_gen \u2212 P_load) / (2H \u00D7 S_base)
              </p>
            </div>

            {/* Main visualization - side by side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <GridVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Renewable penetration slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Renewable Penetration</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {renewablePct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={renewablePct}
                      onChange={(e) => setRenewablePct(parseInt(e.target.value))}
                      onInput={(e) => setRenewablePct(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Renewable Penetration Percentage"
                      style={sliderStyle(colors.accent, renewablePct, 0, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0% (All Fossil)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50%</span>
                      <span style={{ ...typo.small, color: colors.success }}>100% (All Renewable)</span>
                    </div>
                  </div>

                  {/* Time of day slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Time of Day</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                        {timeOfDay}:00
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(parseInt(e.target.value))}
                      onInput={(e) => setTimeOfDay(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Time of Day"
                      style={sliderStyle(colors.warning, timeOfDay, 0, 24)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Midnight</span>
                      <span style={{ ...typo.small, color: colors.solar }}>Noon</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Midnight</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{currentSupply.toFixed(1)} GW</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Supply</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{currentDemand.toFixed(1)} GW</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Demand</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: Math.abs(currentFreq - 60) > 0.2 ? colors.error : colors.frequency }}>
                        {currentFreq.toFixed(3)} Hz
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Frequency</div>
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
              {'\u2190'} Back
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
              The Physics of Grid Balance
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — when demand suddenly exceeds supply, the deficit energy is drawn from the rotational inertia of spinning generators, which slows them down and drops the frequency below 60Hz.'
                : 'As you observed in the experiment, when demand exceeds supply the frequency drops. This is because the energy deficit is drawn from the kinetic energy of spinning generators, slowing their rotation.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>P_generation = P_demand + P_losses</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is because the grid operates on an <span style={{ color: colors.accent }}>instantaneous power balance</span>. When a 2GW data center connects, demand jumps by 2GW. If generators cannot increase output instantly, the <span style={{ color: colors.frequency }}>kinetic energy</span> stored in spinning turbines is converted to electrical energy, <span style={{ color: colors.error }}>slowing the rotors and dropping frequency</span>.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {'df/dt = (P_gen - P_load) / (2H * S_base)'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Where H is the system inertia constant and S_base is the system rating. Higher inertia means slower frequency change.
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
                Why Frequency Equals Balance
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Grid frequency is determined by the rotational speed of synchronous generators. When supply exceeds demand, excess energy accelerates the rotors (frequency rises). When demand exceeds supply, the deficit decelerates rotors (frequency drops). The grid operates like a giant flywheel — frequency is the vital sign showing the health of the power balance.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Response Hierarchy
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Inertia', time: '0-5s', desc: 'Kinetic energy' },
                  { name: 'Primary', time: '5-30s', desc: 'Governor droop' },
                  { name: 'Secondary', time: '30s-10min', desc: 'AGC dispatch' },
                  { name: 'Tertiary', time: '10-30min', desc: 'Reserve units' },
                  { name: 'Scheduling', time: '30min+', desc: 'Market dispatch' },
                  { name: 'Planning', time: 'Years', desc: 'New capacity' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.time}</div>
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
              {'\u2190'} Back
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
      { id: 'a', text: 'Eliminates all frequency problems completely' },
      { id: 'b', text: 'Reduces frequency deviations by absorbing and releasing energy as needed' },
      { id: 'c', text: 'Makes the grid less stable due to added complexity' },
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
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Battery Storage + Load Spike
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Adding 4GW of battery storage to a 50% renewable grid when a 2GW data center suddenly comes online...
            </h2>

            {/* Static SVG showing battery concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistBattGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.battery} />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Grid line */}
                <rect x="30" y="35" width="340" height="4" rx="2" fill={colors.accent} opacity="0.3" />
                {/* Supply */}
                <rect x="40" y="15" width="80" height="45" rx="6" fill={colors.success} opacity="0.3" />
                <text x="80" y="42" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">50% Renew</text>
                {/* Battery */}
                <rect x="160" y="15" width="80" height="45" rx="6" fill="url(#twistBattGrad)" opacity="0.4" />
                <text x="200" y="42" textAnchor="middle" fill={colors.battery} fontSize="11" fontWeight="600">4GW Battery</text>
                {/* Demand + spike */}
                <rect x="280" y="15" width="80" height="45" rx="6" fill={colors.error} opacity="0.3" />
                <text x="320" y="35" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">Load</text>
                <text x="320" y="50" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="700">+2GW SPIKE</text>
                {/* Frequency indicator */}
                <text x="200" y="90" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="700">60.000 Hz — can battery save the grid?</text>
                <text x="200" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Batteries respond in milliseconds vs seconds for gas turbines</text>
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
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Battery Storage Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Battery Storage + Load Spike Simulator
  if (phase === 'twist_play') {
    const freqWithout = getFrequency(timeOfDay, 50, 0, true);
    const freqWith = getFrequency(timeOfDay, 50, batteryCapacity, true);

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
              Battery Storage vs Load Spike
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              A 2GW data center just came online. Can battery storage keep the grid stable at 50% renewables?
            </p>

            {/* Educational Explanation */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> The chart now includes battery storage (purple) that charges when supply exceeds demand and discharges during shortfalls. Watch the frequency line &mdash; batteries smooth out the dangerous oscillations.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', marginBottom: 0 }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> Increase battery capacity to see frequency stabilize. Trigger a load spike to see how quickly batteries respond vs. thermal plants. More battery GW means tighter frequency control.
              </p>
            </div>

            {/* Side-by-side layout on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualization */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <GridVisualization showBattery={true} />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Load spike toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => { playSound('click'); setLoadSpike(!loadSpike); }}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${loadSpike ? colors.error : colors.border}`,
                        background: loadSpike ? `${colors.error}22` : colors.bgSecondary,
                        color: loadSpike ? colors.error : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '16px',
                        minHeight: '44px',
                      }}
                    >
                      {loadSpike ? '\u26A1 2GW Load Spike ACTIVE — Data Center Online' : 'Click to Activate 2GW Load Spike'}
                    </button>
                  </div>

                  {/* Battery capacity slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Battery Storage Capacity</span>
                      <span style={{ ...typo.small, color: colors.battery, fontWeight: 600 }}>{batteryCapacity} GW</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.5"
                      value={batteryCapacity}
                      onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                      onInput={(e) => setBatteryCapacity(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Battery Storage Capacity"
                      style={sliderStyle(colors.battery, batteryCapacity, 0, 8)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0 GW (No Storage)</span>
                      <span style={{ ...typo.small, color: colors.battery }}>8 GW</span>
                    </div>
                  </div>

                  {/* Time of day slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Time of Day</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{timeOfDay}:00</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={timeOfDay}
                      onChange={(e) => setTimeOfDay(parseInt(e.target.value))}
                      onInput={(e) => setTimeOfDay(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Time of Day"
                      style={sliderStyle(colors.warning, timeOfDay, 0, 24)}
                    />
                  </div>

                  {/* Comparison Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Without Battery</div>
                      <div style={{ ...typo.h3, color: Math.abs(freqWithout - 60) > 0.2 ? colors.error : colors.frequency }}>
                        {freqWithout.toFixed(3)} Hz
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>
                        {'\u0394'}f = {(freqWithout - 60).toFixed(3)} Hz
                      </div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>With {batteryCapacity}GW Battery</div>
                      <div style={{ ...typo.h3, color: Math.abs(freqWith - 60) > 0.2 ? colors.error : colors.battery }}>
                        {freqWith.toFixed(3)} Hz
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>
                        {'\u0394'}f = {(freqWith - 60).toFixed(3)} Hz
                      </div>
                    </div>
                  </div>

                  {/* Improvement indicator */}
                  {loadSpike && batteryCapacity > 0 && (
                    <div style={{
                      background: `${colors.success}22`,
                      border: `1px solid ${colors.success}`,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <p style={{ ...typo.body, color: colors.success, fontWeight: 700, margin: 0 }}>
                        Battery reduces frequency deviation by {Math.abs(((Math.abs(freqWith - 60) - Math.abs(freqWithout - 60)) / Math.abs(freqWithout - 60)) * 100).toFixed(0)}%
                      </p>
                      <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                        Batteries respond in milliseconds, injecting stored energy to compensate for the sudden load increase
                      </p>
                    </div>
                  )}
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
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Battery Impact
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Battery Storage: The Grid's Shock Absorber
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>How Batteries Balance the Grid</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Battery energy storage systems (BESS) act as bidirectional buffers. When frequency drops (demand {'>'} supply), batteries discharge in milliseconds to fill the gap. When frequency rises (supply {'>'} demand), they absorb excess energy by charging. This is 10-100x faster than ramping gas turbines, providing synthetic inertia that replaces the rotational inertia lost as synchronous generators retire.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Inertia Challenge</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Solar panels and wind turbines connect through power electronics (inverters), not spinning masses. They provide no natural rotational inertia. As renewables replace synchronous generators, the system becomes more sensitive to disturbances — frequency changes faster for the same imbalance. Grid-forming inverters and batteries with fast frequency response are essential to compensate.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Path Forward</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  A combination of battery storage, demand response, grid-forming inverters, and improved forecasting enables high-renewable grids to maintain stability. The key insight is that storage does not eliminate frequency deviations — it reduces them by absorbing and releasing energy. Duration (how many hours of storage) and power rating (how many GW) both matter.
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
              {'\u2190'} Back
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
        conceptName="E L O N_ Grid Balance"
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
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
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
                      const nextIdx = newCompleted.findIndex(c => !c);
                      if (nextIdx === -1) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextIdx);
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
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
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
                {passed ? 'You understand grid frequency balance and its critical role in power system stability!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Grid Balance
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of grid frequency, supply-demand balance, inertia, and renewable integration to real-world power system scenarios. Consider the relationship between generation, load, frequency response, and the role of storage as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
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
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Grid Balance Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why grid frequency must be maintained every second, how supply-demand imbalances affect stability, and how battery storage is transforming the modern grid.
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
                'Grid frequency reflects supply-demand balance',
                'Rotational inertia resists sudden frequency changes',
                'Renewables reduce inertia but batteries compensate',
                'The duck curve shapes modern grid operations',
                'Storage absorbs surplus and fills deficits in milliseconds',
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

export default ELON_GridBalanceRenderer;
