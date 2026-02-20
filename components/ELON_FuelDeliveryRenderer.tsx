'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// FUEL DELIVERY - Complete 10-Phase Game (ELON Game #7 of 36)
// Hidden infrastructure feeding power plants — supply chain logistics
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

interface FuelDeliveryRendererProps {
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
    scenario: "A coal-fired power plant burns 10,000 tons of coal per day. The nearest mine is 800 miles away by rail.",
    question: "What is the primary logistical challenge of fueling this plant?",
    options: [
      { id: 'a', label: "A unit train of 100+ cars must arrive every single day, 365 days a year", correct: true },
      { id: 'b', label: "Coal is too expensive to transport by rail" },
      { id: 'c', label: "Coal loses energy during transport" },
      { id: 'd', label: "Trains cannot carry enough weight" }
    ],
    explanation: "A typical 1GW coal plant burns 10,000+ tons/day. Each unit train carries ~10,000 tons, so a train must arrive daily. Any disruption means blackouts within days."
  },
  {
    scenario: "Natural gas travels through a 1,000-mile pipeline at 15 mph. A compressor station boosts pressure every 50-100 miles.",
    question: "What percentage of the gas energy is consumed just to push the gas through the pipeline?",
    options: [
      { id: 'a', label: "Less than 1%" },
      { id: 'b', label: "About 3-5% of throughput energy", correct: true },
      { id: 'c', label: "About 25%" },
      { id: 'd', label: "Over 50%" }
    ],
    explanation: "Pipeline compressor stations consume about 3-5% of throughput energy. Over 1,000 miles with 10-20 compressor stations, this adds up but is still far more efficient than trucking."
  },
  {
    scenario: "The US Strategic Petroleum Reserve holds 714 million barrels of crude oil in underground salt caverns along the Gulf Coast.",
    question: "At maximum drawdown rate, how long could the SPR replace all US oil imports?",
    options: [
      { id: 'a', label: "About 2 weeks" },
      { id: 'b', label: "About 3 months at maximum drawdown", correct: true },
      { id: 'c', label: "About 2 years" },
      { id: 'd', label: "About 10 years" }
    ],
    explanation: "The SPR can release ~4.4 million barrels/day maximum. With US net imports around 6-7 million bbl/day, it could partially offset imports for roughly 3-5 months."
  },
  {
    scenario: "Uranium fuel has an energy density of 80,000,000 MJ/kg compared to coal at 24 MJ/kg — over 3 million times more energy per kilogram.",
    question: "How does this extreme energy density affect nuclear fuel logistics?",
    options: [
      { id: 'a', label: "A single truckload of fuel runs a reactor for 18-24 months", correct: true },
      { id: 'b', label: "Nuclear plants need daily fuel deliveries like coal" },
      { id: 'c', label: "It has no effect on logistics" },
      { id: 'd', label: "Uranium must be transported by pipeline" }
    ],
    explanation: "A 1GW nuclear plant uses only ~25 tons of enriched uranium per year. One truck can deliver 18-24 months of fuel. Compare this to 3.6 million tons of coal annually for an equivalent coal plant."
  },
  {
    scenario: "In 2022, Russia cut natural gas supplies to Europe through the Nord Stream pipeline system, which carried 150 billion cubic meters per year.",
    question: "Why couldn't Europe simply replace Russian gas with LNG imports?",
    options: [
      { id: 'a', label: "LNG terminal capacity was limited to a fraction of pipeline volume", correct: true },
      { id: 'b', label: "LNG is more expensive than pipeline gas" },
      { id: 'c', label: "There aren't enough LNG tankers in the world" },
      { id: 'd', label: "LNG has lower energy content" }
    ],
    explanation: "Europe's LNG import capacity was ~150 bcm/yr but was already partially utilized. Building new terminals takes 3-5 years. Pipeline infrastructure cannot be replaced overnight."
  },
  {
    scenario: "A typical LNG tanker carries 170,000 cubic meters of liquefied gas. The gas must be cooled to -162C and occupies 1/600th of its gaseous volume.",
    question: "What makes LNG shipping fundamentally different from oil tanker transport?",
    options: [
      { id: 'a', label: "The cryogenic cooling requirement means 10-15% of cargo energy is consumed in liquefaction", correct: true },
      { id: 'b', label: "LNG tankers are smaller than oil tankers" },
      { id: 'c', label: "LNG is lighter than oil" },
      { id: 'd', label: "There is no significant difference" }
    ],
    explanation: "Liquefying natural gas at -162C requires enormous energy — about 10-15% of the gas energy content. Plus specialized ships and regasification terminals are needed at both ends."
  },
  {
    scenario: "The Colonial Pipeline carries 2.5 million barrels of refined fuel per day from Houston to New York — 45% of East Coast fuel supply.",
    question: "When it was shut down for 6 days in 2021 (ransomware attack), what happened?",
    options: [
      { id: 'a', label: "Gas stations ran dry across the Southeast within 3 days", correct: true },
      { id: 'b', label: "Nothing — reserves covered the shortfall" },
      { id: 'c', label: "Prices dropped due to reduced demand" },
      { id: 'd', label: "Ships rerouted fuel immediately" }
    ],
    explanation: "The 6-day shutdown caused panic buying, fuel shortages across the Southeast, and price spikes. It demonstrated how just-in-time fuel delivery has zero margin for disruption."
  },
  {
    scenario: "Solar panel supply chains span 4 continents: polysilicon (China), wafers (China/SE Asia), cells (China), modules (assembled globally).",
    question: "What is the key supply chain vulnerability for solar deployment?",
    options: [
      { id: 'a', label: "Over 80% of manufacturing is concentrated in China, creating single-point-of-failure risk", correct: true },
      { id: 'b', label: "Solar panels are too heavy to ship" },
      { id: 'c', label: "Raw silicon is rare" },
      { id: 'd', label: "Panels expire during shipping" }
    ],
    explanation: "China controls 80%+ of polysilicon, 95% of wafer, and 75% of cell production. Trade disputes, tariffs, or supply disruptions can halt global solar deployment."
  },
  {
    scenario: "A coal unit train is 1.5 miles long, weighs 15,000 tons loaded, and travels at 25 mph average speed including stops.",
    question: "How does coal-by-rail affect other rail traffic in the US?",
    options: [
      { id: 'a', label: "Coal trains consume ~40% of US rail capacity, crowding out other freight", correct: true },
      { id: 'b', label: "Coal uses less than 5% of rail capacity" },
      { id: 'c', label: "Coal trains run on dedicated tracks" },
      { id: 'd', label: "Coal is mostly transported by truck" }
    ],
    explanation: "Coal has historically consumed about 40% of US Class I railroad tonnage. These slow, heavy trains tie up mainline capacity, affecting intermodal, grain, and chemical shipments."
  },
  {
    scenario: "The uranium fuel cycle involves mining, milling, conversion, enrichment (from 0.7% to 4.5% U-235), and fuel fabrication — taking 18+ months from start to finish.",
    question: "Why does this long lead time matter for energy security?",
    options: [
      { id: 'a', label: "Nations must maintain strategic uranium reserves and long-term enrichment contracts", correct: true },
      { id: 'b', label: "It doesn't matter because nuclear plants rarely need refueling" },
      { id: 'c', label: "Enrichment can be done in days if needed" },
      { id: 'd', label: "Only military reactors need enrichment" }
    ],
    explanation: "The 18-month fuel cycle means a disruption today affects fuel supply 1.5-2 years later. Countries must plan years ahead and maintain strategic inventories of enriched uranium."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F1EA}\u{1F1FA}',
    title: 'European Gas Crisis 2022',
    short: 'Pipeline dependency exposed by geopolitical conflict',
    tagline: 'When a continent\'s energy lifeline was severed',
    description: 'Europe depended on Russia for ~40% of its natural gas, delivered through massive pipeline networks including Nord Stream. When Russia cut supplies during the Ukraine conflict, gas prices spiked 10x, industries shut down, and governments scrambled for alternatives. The crisis exposed decades of underinvestment in supply chain diversification.',
    connection: 'The gas crisis demonstrates how concentrated supply chains create catastrophic single points of failure — the same principle applies to all fuel delivery networks.',
    howItWorks: 'Pipeline gas at 200+ bcm/yr cannot be quickly replaced by LNG (limited terminals), alternative pipelines (years to build), or demand reduction (economic pain).',
    stats: [
      { value: '10x', label: 'Price spike', icon: '\u{1F4C8}' },
      { value: '150bcm/yr', label: 'Lost supply', icon: '\u{1F6E2}\u{FE0F}' },
      { value: '\u{20AC}1T+', label: 'Economic cost', icon: '\u{1F4B6}' }
    ],
    examples: ['Nord Stream shutdown', 'German industrial curtailment', 'LNG terminal rush', 'Coal plant restarts'],
    companies: ['Gazprom', 'TotalEnergies', 'Shell LNG', 'Cheniere Energy'],
    futureImpact: 'Europe is building 20+ new LNG terminals and accelerating renewable deployment to eliminate pipeline dependency.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F682}',
    title: 'US Coal-by-Rail Network',
    short: 'The hidden railroad empire powering American electricity',
    tagline: '40% of all US rail traffic hauls a single commodity',
    description: 'Coal is the heaviest, bulkiest commodity shipped by US railroads. Unit trains of 100+ cars travel from Wyoming\'s Powder River Basin to power plants across the nation, covering 1,000+ miles. This massive logistics operation consumed ~40% of US rail freight tonnage at its peak, shaping railroad economics and infrastructure investment.',
    connection: 'Coal-by-rail demonstrates how low energy density fuels require massive transport infrastructure — the opposite of nuclear\'s compact fuel cycle.',
    howItWorks: 'Dedicated unit trains cycle continuously between mine and plant. Each 100-car train carries ~10,000 tons. Major plants need one train daily.',
    stats: [
      { value: '40%', label: 'Of rail traffic', icon: '\u{1F682}' },
      { value: '1.2Bt/yr', label: 'Coal shipped', icon: '\u{26CF}\u{FE0F}' },
      { value: '1000mi', label: 'Avg haul distance', icon: '\u{1F6E4}\u{FE0F}' }
    ],
    examples: ['Powder River Basin mines', 'BNSF coal corridors', 'Unit train operations', 'Port coal export terminals'],
    companies: ['BNSF Railway', 'Union Pacific', 'CSX Transportation', 'Norfolk Southern'],
    futureImpact: 'As coal plants retire, freed rail capacity is being repurposed for intermodal containers, grain, and industrial freight.',
    color: '#6B7280'
  },
  {
    icon: '\u{2622}\u{FE0F}',
    title: 'Uranium Enrichment Chain',
    short: 'The most complex fuel supply chain in energy',
    tagline: 'From yellowcake to fuel rod — 18 months of precision',
    description: 'Nuclear fuel requires mining uranium ore, milling to yellowcake (U3O8), converting to UF6 gas, enriching from 0.7% to 4.5% U-235 in massive centrifuge cascades, reconverting to UO2 powder, pressing into pellets, and assembling into fuel rods. This 18-month, multi-continent process is the most technically demanding fuel supply chain in existence.',
    connection: 'Nuclear\'s extreme energy density (3 million x coal) means tiny fuel volumes but extraordinary processing complexity — a fascinating logistics tradeoff.',
    howItWorks: 'Centrifuge enrichment separates U-235 from U-238 using mass differences. Thousands of centrifuges spin at 50,000+ RPM in cascades.',
    stats: [
      { value: '18mo', label: 'Lead time', icon: '\u{23F3}' },
      { value: '4.5%', label: 'Enrichment level', icon: '\u{269B}\u{FE0F}' },
      { value: '25t', label: 'Per GW-year', icon: '\u{2696}\u{FE0F}' }
    ],
    examples: ['URENCO enrichment plants', 'Westinghouse fuel fabrication', 'Cameco uranium mines', 'Orano conversion facilities'],
    companies: ['URENCO', 'Orano', 'Westinghouse', 'Cameco'],
    futureImpact: 'HALEU (high-assay LEU at 20% enrichment) for advanced reactors is creating new supply chain requirements and geopolitical competition.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{2600}\u{FE0F}',
    title: 'Tesla Solar Supply Chain',
    short: 'Global manufacturing networks for distributed energy',
    tagline: 'From Chinese polysilicon to American rooftops',
    description: 'Solar panel production spans the globe: polysilicon refining in China\'s Xinjiang region, wafer slicing in Southeast Asia, cell manufacturing across China, and module assembly worldwide. A typical residential installation requires panels, inverters, racking, wiring — all sourced from different countries with 6-month lead times and complex trade regulations.',
    connection: 'Solar supply chains show how even "free fuel" energy sources face delivery logistics challenges — the fuel is free but the equipment supply chain is not.',
    howItWorks: 'Silicon is purified to 99.9999% purity, sliced into wafers, doped to create P-N junctions, assembled with glass and backsheet into weather-resistant modules.',
    stats: [
      { value: '80%+', label: 'From China', icon: '\u{1F1E8}\u{1F1F3}' },
      { value: '6mo', label: 'Lead time', icon: '\u{1F4E6}' },
      { value: '$0.20/W', label: 'Module cost', icon: '\u{1F4B2}' }
    ],
    examples: ['LONGi Green Energy', 'First Solar (US-made CdTe)', 'SunPower maxeon cells', 'Tesla Solar Roof tiles'],
    companies: ['LONGi', 'JA Solar', 'First Solar', 'Tesla Energy'],
    futureImpact: 'US and EU industrial policy (IRA, REPowerEU) is driving domestic manufacturing to reduce China dependency.',
    color: '#F59E0B'
  }
];

// Fuel types for simulation
interface FuelType {
  name: string;
  energyDensity: number; // MJ/kg
  color: string;
  transportMode: string;
  lossPerMile: number; // % per 100 miles
  costPerTonMile: number; // cents
  description: string;
}

const fuelTypes: FuelType[] = [
  { name: 'Coal', energyDensity: 24, color: '#6B7280', transportMode: 'Rail', lossPerMile: 0.01, costPerTonMile: 2.5, description: 'Bulk solid, rail-dependent' },
  { name: 'Natural Gas', energyDensity: 55, color: '#3B82F6', transportMode: 'Pipeline', lossPerMile: 0.005, costPerTonMile: 0.5, description: 'Compressed gas, pipeline network' },
  { name: 'Uranium', energyDensity: 80000000, color: '#8B5CF6', transportMode: 'Truck', lossPerMile: 0, costPerTonMile: 50, description: 'Extreme density, minimal volume' },
  { name: 'Solar Panels', energyDensity: 0, color: '#F59E0B', transportMode: 'Ship+Truck', lossPerMile: 0, costPerTonMile: 8, description: 'Equipment, not fuel — one-time delivery' },
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_FuelDeliveryRenderer: React.FC<FuelDeliveryRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [transportDistance, setTransportDistance] = useState(500);
  const [selectedFuel, setSelectedFuel] = useState(0);

  // Twist phase - supply disruption scenario
  const [disruptionSeverity, setDisruptionSeverity] = useState(30);
  const [reserveDays, setReserveDays] = useState(30);

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

  // Calculate transport cost
  const calculateTransportCost = (distance: number, fuel: FuelType) => {
    const tons = fuel.name === 'Uranium' ? 0.025 : fuel.name === 'Coal' ? 10000 : fuel.name === 'Natural Gas' ? 5000 : 200;
    return (fuel.costPerTonMile * tons * distance) / 100;
  };

  // Calculate energy loss during transport
  const calculateTransportLoss = (distance: number, fuel: FuelType) => {
    return Math.min(25, fuel.lossPerMile * (distance / 100));
  };

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
        gameType: 'fuel-delivery',
        gameTitle: 'Fuel Delivery',
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

  // Current fuel
  const currentFuel = fuelTypes[selectedFuel];
  const transportCost = calculateTransportCost(transportDistance, currentFuel);
  const transportLoss = calculateTransportLoss(transportDistance, currentFuel);

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

  // Sankey-style Fuel Flow SVG Visualization
  const FuelFlowVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 340;
    const distNorm = (transportDistance - 50) / 4950; // 0 to 1
    const lossWidth = Math.max(2, distNorm * 40);

    // Flow widths represent BTU content — coal has large volume, uranium is tiny
    const coalFlow = 60;
    const gasFlow = 45;
    const uraniumFlow = 8;
    const solarFlow = 30;

    // Losses proportional to distance — minimum visual width for visibility
    const coalLoss = Math.max(8, coalFlow * (transportLoss / 100) * 3);
    const gasLoss = Math.max(6, gasFlow * (transportLoss / 100) * 2);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="coalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
          <linearGradient id="gasGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="uraniumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
          </linearGradient>
          <filter id="flowGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Distance indicator — interactive marker (must be first filtered+white-stroke circle) */}
        <circle cx={40 + distNorm * (width - 80)} cy={height - 30} r="7" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#flowGlow)" />

        {/* Grid lines group */}
        <g className="grid-lines">
          <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1="30" y1="270" x2={width - 30} y2="270" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1={width * 0.25} y1="40" x2={width * 0.25} y2="310" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1={width * 0.5} y1="40" x2={width * 0.5} y2="310" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1={width * 0.75} y1="40" x2={width * 0.75} y2="310" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        </g>

        {/* Labels group */}
        <g className="labels">
          {/* Title */}
          <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
            Fuel Supply Chain Flow — {transportDistance} mi
          </text>

          {/* Stage labels */}
          <text x={35} y={45} fill="#94a3b8" fontSize="11" fontWeight="400">Extraction</text>
          <text x={width * 0.3} y={45} fill="#94a3b8" fontSize="11" fontWeight="400" textAnchor="middle">Processing</text>
          <text x={width * 0.6} y={45} fill="#94a3b8" fontSize="11" fontWeight="400" textAnchor="middle">Transport</text>
          <text x={width - 55} y={45} fill="#94a3b8" fontSize="11" fontWeight="400">Power Plant</text>
        </g>

        {/* Flow paths group */}
        <g className="flow-paths">
          {/* Cost curve — multi-segment L-path for data points */}
          {(() => {
            const steps = 14;
            const stepW = (width - 60) / steps;
            const plotTop = 60;
            const plotBottom = height - 60;
            const plotH = plotBottom - plotTop;
            const maxDist = 5000;
            let costPath = `M 30 ${plotBottom}`;
            for (let i = 1; i <= steps; i++) {
              const d = (maxDist * i) / steps;
              const costVal = calculateTransportCost(d, currentFuel);
              const maxCost = calculateTransportCost(maxDist, currentFuel);
              const yVal = plotBottom - ((costVal / Math.max(maxCost, 1)) * plotH);
              costPath += ` L ${30 + i * stepW} ${yVal}`;
            }
            return (
              <path
                d={costPath}
                stroke={currentFuel.color}
                fill="none"
                strokeWidth="2.5"
                opacity="0.8"
              />
            );
          })()}

          {/* Coal flow — Sankey band showing volume transported */}
          <rect x={30} y={55} width={width - 60} height={coalFlow - Math.min(coalLoss, coalFlow - 4)} rx="4" fill="url(#coalGrad)" opacity="0.35" />
          <text x={30} y={55 + coalFlow / 2 + 2} fill="#9CA3AF" fontSize="11" fontWeight="600">Coal</text>

          {/* Gas flow — Sankey band */}
          <rect x={30} y={130} width={width - 60} height={gasFlow - Math.min(gasLoss, gasFlow - 4)} rx="4" fill="url(#gasGrad)" opacity="0.35" />
          <text x={30} y={130 + gasFlow / 2 + 2} fill="#60A5FA" fontSize="11" fontWeight="600">Gas</text>

          {/* Uranium flow — thin line showing enrichment processing stages */}
          <path
            d={`M 30 ${250} C ${width * 0.15} ${145}, ${width * 0.25} ${240}, ${width * 0.35} ${155} L ${width * 0.45} ${245} C ${width * 0.55} ${150}, ${width * 0.7} ${235}, ${width * 0.85} ${155} L ${width - 30} ${248}`}
            stroke="url(#uraniumGrad)"
            fill="none"
            strokeWidth={uraniumFlow}
            opacity="0.8"
            strokeLinecap="round"
          />
          <text x={30} y={258} fill="#A78BFA" fontSize="11" fontWeight="600">Uranium</text>

          {/* Solar panel flow — one-time equipment delivery */}
          <path
            d={`M 30 ${295} C ${width * 0.2} ${195}, ${width * 0.3} ${285}, ${width * 0.5} ${200} L ${width * 0.65} ${290} C ${width * 0.75} ${200}, ${width * 0.85} ${285}, ${width - 30} ${295}`}
            stroke="url(#solarGrad)"
            fill="none"
            strokeWidth={solarFlow}
            opacity="0.6"
            strokeLinecap="round"
            strokeDasharray="8,4"
          />
          <text x={30} y={303} fill="#FBBF24" fontSize="11" fontWeight="600">Solar</text>
        </g>

        {/* Nodes group */}
        <g className="nodes">
          {/* Source nodes */}
          <circle cx={25} cy={70} r="8" fill="#6B7280" stroke="#9CA3AF" strokeWidth="1.5" filter="url(#nodeGlow)" />
          <circle cx={25} cy={150} r="8" fill="#3B82F6" stroke="#60A5FA" strokeWidth="1.5" filter="url(#nodeGlow)" />
          <circle cx={25} cy={225} r="7" fill="#8B5CF6" stroke="#A78BFA" strokeWidth="1.5" filter="url(#nodeGlow)" />
          <circle cx={25} cy={280} r="7" fill="#F59E0B" stroke="#FBBF24" strokeWidth="1.5" filter="url(#nodeGlow)" />

          {/* Destination node — power plant */}
          <circle cx={width - 25} cy={75} r="10" fill={colors.accent} stroke="#FCD34D" strokeWidth="2" filter="url(#flowGlow)" />
          <circle cx={width - 25} cy={155} r="10" fill={colors.accent} stroke="#FCD34D" strokeWidth="2" filter="url(#flowGlow)" />
          <circle cx={width - 25} cy={226} r="8" fill={colors.accent} stroke="#FCD34D" strokeWidth="1.5" filter="url(#flowGlow)" />
          <circle cx={width - 25} cy={280} r="8" fill={colors.accent} stroke="#FCD34D" strokeWidth="1.5" filter="url(#flowGlow)" />
        </g>

        {/* Distance indicator line */}
        <line x1={40} y1={height - 30} x2={40 + distNorm * (width - 80)} y2={height - 30} stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />

        {/* Legend */}
        <rect x={30} y={height - 18} width="10" height="10" rx="2" fill="url(#coalGrad)" />
        <text x={44} y={height - 9} fill="#94a3b8" fontSize="11">Coal</text>
        <rect x={80} y={height - 18} width="10" height="10" rx="2" fill="url(#gasGrad)" />
        <text x={94} y={height - 9} fill="#94a3b8" fontSize="11">Gas</text>
        <rect x={125} y={height - 18} width="10" height="10" rx="2" fill="url(#uraniumGrad)" />
        <text x={139} y={height - 9} fill="#94a3b8" fontSize="11">Uranium</text>
        <rect x={185} y={height - 18} width="10" height="10" rx="2" fill="url(#solarGrad)" />
        <text x={199} y={height - 9} fill="#94a3b8" fontSize="11">Solar</text>
        <rect x={240} y={height - 18} width="10" height="10" rx="2" fill="url(#lossGrad)" />
        <text x={254} y={height - 9} fill="#94a3b8" fontSize="11">Transport Loss</text>

        {/* Formula */}
        <rect x={width / 2 - 130} y={height - 52} width="260" height="20" rx="4" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" />
        <text x={width / 2} y={height - 38} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Transport Cost: ${transportCost.toLocaleString()} | Loss: {transportLoss.toFixed(1)}%
        </text>
      </svg>
    );
  };

  // Supply Disruption Visualization for twist_play
  const DisruptionVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 300;
    const severityNorm = disruptionSeverity / 100;
    const reserveNorm = reserveDays / 90;
    const daysUntilBlackout = Math.max(0, reserveDays - (disruptionSeverity * 0.8));
    const priceMultiplier = 1 + (severityNorm * 10 * (1 - reserveNorm * 0.5));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="reserveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="pipelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="disruptGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <filter id="disruptGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="180" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Supply Disruption Impact Analysis
        </text>

        {/* Pipeline diagram */}
        <g>
          {/* Supply source */}
          <rect x={40} y={55} width="20" height="40" rx="3" fill="#3B82F6" />
          <text x={50} y={108} fill="#60A5FA" fontSize="11" textAnchor="middle">Source</text>
          {/* Pipeline */}
          <rect x={60} y={68} width={width - 120} height={14} rx="7" fill="url(#pipelineGrad)" opacity={1 - severityNorm * 0.8} />
          {/* Disruption X */}
          {severityNorm > 0.1 && (
            <g>
              <circle cx={width / 2} cy={75} r={12 + severityNorm * 8} fill="#EF4444" opacity={severityNorm * 0.6} filter="url(#disruptGlow)" />
              <text x={width / 2} y={79} fill="white" fontSize="14" fontWeight="800" textAnchor="middle">X</text>
            </g>
          )}
          {/* Destination */}
          <rect x={width - 60} y={55} width="20" height="40" rx="3" fill={colors.accent} />
          <text x={width - 50} y={108} fill={colors.accent} fontSize="11" textAnchor="middle">Plant</text>
        </g>

        {/* Reserve level bar */}
        <g>
          <text x={width / 2} y={135} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
            Strategic Reserve: {reserveDays} days | Disruption: {disruptionSeverity}%
          </text>
          <rect x={50} y={142} width={width - 100} height={16} rx="8" fill={colors.border} />
          <rect
            x={50}
            y={142}
            width={(width - 100) * (Math.max(0, reserveNorm - severityNorm * 0.5))}
            height={16}
            rx="8"
            fill="url(#reserveGrad)"
            filter={daysUntilBlackout < 10 ? 'url(#disruptGlow)' : undefined}
          />
          <circle
            cx={50 + (width - 100) * Math.max(0, reserveNorm - severityNorm * 0.5)}
            cy={150}
            r="6"
            fill={daysUntilBlackout < 10 ? colors.error : colors.warning}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#disruptGlow)"
          />
        </g>

        {/* Price impact curve — scaled to use full vertical plot area */}
        {(() => {
          const pTop = 165;
          const pBottom = 265;
          const pH = pBottom - pTop;
          const maxMult = 11; // max price multiplier at 100% severity + 0 reserves
          const steps = 12;
          const stepW = (width - 100) / steps;
          let pricePath = `M 50 ${pBottom}`;
          for (let i = 1; i <= steps; i++) {
            const frac = i / steps;
            const pMul = 1 + (frac * 10 * (1 - reserveNorm * 0.5));
            const yVal = pBottom - ((pMul / maxMult) * pH);
            pricePath += ` L ${50 + i * stepW} ${yVal}`;
          }
          return (
            <path
              d={pricePath}
              stroke={colors.error}
              fill="none"
              strokeWidth="2"
              opacity="0.6"
            />
          );
        })()}
        <circle
          cx={50 + severityNorm * (width - 100)}
          cy={265 - ((priceMultiplier / 12) * 95)}
          r="7"
          fill={colors.error}
          stroke="white"
          strokeWidth="1.5"
          filter="url(#disruptGlow)"
        />

        {/* Results */}
        <text x={width / 2} y={190} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">
          Days Until Blackout: {daysUntilBlackout.toFixed(0)} | Price: {priceMultiplier.toFixed(1)}x
        </text>

        {/* Status */}
        <text x={width / 2} y={210} fill={daysUntilBlackout < 10 ? colors.error : daysUntilBlackout < 30 ? colors.warning : colors.success} fontSize="12" textAnchor="middle" fontWeight="700">
          {daysUntilBlackout < 5 ? 'CRITICAL - Grid failure imminent!' : daysUntilBlackout < 15 ? 'WARNING - Reserves depleting rapidly' : daysUntilBlackout < 30 ? 'CAUTION - Monitor reserves closely' : 'STABLE - Adequate reserves available'}
        </text>

        {/* Axis */}
        <text x={width / 2} y={height - 25} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Disruption Severity / Reserve Buffer
        </text>

        {/* Legend */}
        <g>
          <rect x={40} y={height - 15} width="12" height="10" rx="2" fill="url(#pipelineGrad)" />
          <text x={57} y={height - 7} fill="#94a3b8" fontSize="11">Pipeline</text>
          <circle cx={115} cy={height - 10} r="4" fill="#EF4444" />
          <text x={124} y={height - 7} fill="#94a3b8" fontSize="11">Disruption</text>
          <rect x={190} y={height - 15} width="12" height="10" rx="2" fill="url(#reserveGrad)" />
          <text x={207} y={height - 7} fill="#94a3b8" fontSize="11">Reserve</text>
          <circle cx={265} cy={height - 10} r="4" fill={colors.error} />
          <text x={274} y={height - 7} fill="#94a3b8" fontSize="11">Price Impact</text>
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
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F682}\u{26FD}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Fuel Delivery
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;Every time you flip a light switch, a <span style={{ color: colors.accent }}>hidden logistics empire</span> has already delivered millions of tons of fuel across thousands of miles — and you never see any of it.&quot;
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
              &quot;The most critical infrastructure in America is invisible. Pipelines, unit trains, and enrichment cascades form a supply chain so vast and so reliable that we forget it exists — until it breaks.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Energy Infrastructure Analysis
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
      { id: 'a', text: 'About 5% — coal is a minor rail commodity' },
      { id: 'b', text: 'About 15% — significant but not dominant' },
      { id: 'c', text: 'About 40% — coal dominates US rail freight' },
      { id: 'd', text: 'Less than 1% — coal moves by truck or barge' },
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
              How much of US rail traffic is dedicated to hauling coal to power plants?
            </h2>

            {/* Static SVG showing rail network concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictRailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6B7280" />
                    <stop offset="100%" stopColor="#9CA3AF" />
                  </linearGradient>
                  <linearGradient id="predictCoalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#6B7280" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">US Rail Freight: What Fraction is Coal?</text>
                {/* Rail track representation */}
                <rect x="30" y="50" width="340" height="30" rx="4" fill="url(#predictRailGrad)" opacity="0.3" />
                <text x="200" y="70" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Total US Rail Freight Capacity</text>
                {/* Coal portion — unknown */}
                <rect x="30" y="100" width="340" height="35" rx="4" fill="url(#predictCoalGrad)" opacity="0.5" />
                <text x="200" y="122" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">??? % is Coal</text>
                {/* Train icons */}
                <circle cx="60" cy="160" r="8" fill="#6B7280" filter="url(#predictGlow)" />
                <circle cx="100" cy="160" r="8" fill="#6B7280" filter="url(#predictGlow)" />
                <circle cx="140" cy="160" r="8" fill="#6B7280" filter="url(#predictGlow)" />
                <circle cx="180" cy="160" r="8" fill={colors.accent} filter="url(#predictGlow)" />
                <circle cx="220" cy="160" r="8" fill={colors.accent} filter="url(#predictGlow)" />
                <circle cx="260" cy="160" r="8" fill="#6B7280" filter="url(#predictGlow)" />
                <circle cx="300" cy="160" r="8" fill="#6B7280" filter="url(#predictGlow)" />
                <circle cx="340" cy="160" r="8" fill="#6B7280" filter="url(#predictGlow)" />
                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">Each dot = a train on the US rail network</text>
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

  // PLAY PHASE - Interactive Fuel Supply Chain Visualizer
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
              Fuel Supply Chain Visualizer
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Every power source requires a supply chain. Coal needs trains. Gas needs pipelines. Uranium needs enrichment plants. Understanding these logistics reveals hidden costs and vulnerabilities in our energy system.
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
                <strong style={{ color: colors.textPrimary }}>Energy Density</strong> determines how much fuel must be transported — coal at 24 MJ/kg vs uranium at 80,000,000 MJ/kg.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Transport Mode</strong> refers to how fuel reaches the plant: rail (coal), pipeline (gas), truck (uranium), or ship (solar panels).
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Supply Chain Vulnerability</strong> describes single points of failure — a pipeline explosion, rail blockage, or trade embargo can halt fuel delivery.
              </p>
            </div>

            {/* Formula */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              fontFamily: 'monospace',
            }}>
              <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
                E = density × mass | Cost = rate × tons × distance | P = E / t
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This Sankey-style flow diagram shows parallel fuel supply chains from extraction to power plant. The width of each flow represents relative volume needed. Try adjusting the transport distance slider and observe how logistics costs and energy losses change — notice how coal and gas losses increase with distance while uranium remains nearly constant.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              {/* Side by side layout: SVG left, controls right on desktop */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <FuelFlowVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Fuel type selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Selected Fuel</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {currentFuel.name} — {currentFuel.transportMode}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {fuelTypes.map((fuel, i) => (
                        <button
                          key={fuel.name}
                          onClick={() => { playSound('click'); setSelectedFuel(i); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: selectedFuel === i ? `2px solid ${fuel.color}` : `1px solid ${colors.border}`,
                            background: selectedFuel === i ? `${fuel.color}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                          }}
                        >
                          {fuel.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transport Distance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Transport Distance</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {transportDistance} miles
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="5000"
                      step="50"
                      value={transportDistance}
                      onChange={(e) => setTransportDistance(parseInt(e.target.value))}
                      onInput={(e) => setTransportDistance(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Transport Distance"
                      style={sliderStyle(colors.accent, transportDistance, 50, 5000)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50 mi</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>2500 mi</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>5000 mi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{transportDistance} mi</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Distance</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>${(transportCost / 1000).toFixed(0)}k</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Daily Cost</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: transportLoss > 5 ? colors.error : colors.warning }}>
                    {transportLoss.toFixed(1)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Energy Loss</div>
                </div>
              </div>
            </div>

            {/* Fuel comparison table */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Supply Chain Comparison at {transportDistance} miles
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'left', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Fuel</th>
                      <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'right', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Mode</th>
                      <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'right', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Loss</th>
                      <th style={{ ...typo.small, color: colors.textMuted, textAlign: 'right', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Cost/day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelTypes.map((fuel) => (
                      <tr key={fuel.name}>
                        <td style={{ ...typo.small, color: fuel.color, padding: '8px', fontWeight: 600 }}>{fuel.name}</td>
                        <td style={{ ...typo.small, color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>{fuel.transportMode}</td>
                        <td style={{ ...typo.small, color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>{calculateTransportLoss(transportDistance, fuel).toFixed(1)}%</td>
                        <td style={{ ...typo.small, color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>${(calculateTransportCost(transportDistance, fuel) / 1000).toFixed(0)}k</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              Understand the Logistics
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
              The Hidden Logistics of Power
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — coal has historically consumed about 40% of US Class I railroad tonnage, making it by far the dominant rail commodity.'
                : 'Your prediction revealed a key insight — coal dominates US rail traffic at roughly 40% of tonnage. This massive, invisible logistics operation powers a third of US electricity.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Energy Density Determines Logistics</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The fundamental principle is that <span style={{ color: colors.accent }}>energy density</span> determines how much infrastructure is needed to deliver fuel. <span style={{ color: '#6B7280' }}>Coal at 24 MJ/kg</span> requires massive trains. <span style={{ color: '#8B5CF6' }}>Uranium at 80,000,000 MJ/kg</span> fits in a single truck.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Coal: 3,600,000 tons/yr per GW vs Uranium: <strong>25 tons/yr per GW</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Transport Mode Matters
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Each fuel has a natural transport mode determined by its physical state and energy density. Coal is solid and bulky (rail). Natural gas is compressible (pipeline). Oil is liquid (pipeline + tanker). Uranium is extremely dense (truck). These constraints shape entire industries and infrastructure investments worth trillions of dollars.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Fuel Supply Chain Comparison
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {fuelTypes.map(fuel => (
                  <div key={fuel.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    borderLeft: `3px solid ${fuel.color}`,
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{fuel.name}</div>
                    <div style={{ ...typo.small, color: fuel.color }}>{fuel.transportMode}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{fuel.description}</div>
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
      { id: 'a', text: 'Rose slightly by 10-20% — markets adjusted smoothly' },
      { id: 'b', text: 'Spiked 10x as alternatives couldn\'t replace pipeline volume' },
      { id: 'c', text: 'Didn\'t change due to strategic reserves covering the gap' },
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
                New Variable: Supply Disruption
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              When the Nord Stream pipeline was disrupted, European gas prices...
            </h2>

            {/* Static SVG showing pipeline disruption */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistPipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="45%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#EF4444" />
                    <stop offset="55%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#1E3A5F" stopOpacity="0.3" />
                  </linearGradient>
                  <filter id="twistExplosion" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Pipeline */}
                <rect x="30" y="45" width="340" height="20" rx="10" fill="url(#twistPipeGrad)" />
                {/* Explosion marker */}
                <circle cx="200" cy="55" r="25" fill="#EF4444" opacity="0.3" filter="url(#twistExplosion)" />
                <text x="200" y="60" textAnchor="middle" fill="white" fontSize="16" fontWeight="800">{'\u{1F4A5}'}</text>
                {/* Labels */}
                <text x="50" y="85" fill="#60A5FA" fontSize="11" fontWeight="600">Russia</text>
                <text x="200" y="95" textAnchor="middle" fill="#EF4444" fontSize="12" fontWeight="700">DISRUPTED</text>
                <text x="350" y="85" fill="#94a3b8" fontSize="11" fontWeight="600" textAnchor="end">Europe</text>
                <text x="200" y="125" textAnchor="middle" fill="#94a3b8" fontSize="11">Nord Stream: 150 bcm/yr capacity — severed</text>
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
                See What Happened
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Supply Disruption Simulator
  if (phase === 'twist_play') {
    const daysUntilBlackout = Math.max(0, reserveDays - (disruptionSeverity * 0.8));
    const severityNorm = disruptionSeverity / 100;
    const reserveNorm = reserveDays / 90;
    const priceMultiplier = 1 + (severityNorm * 10 * (1 - reserveNorm * 0.5));

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
              Supply Disruption Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Model a pipeline explosion or embargo — see how reserves buffer the shock
            </p>

            {/* Educational panel */}
            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The disruption visualization models a real supply chain shock — a pipeline cut or embargo reduces fuel flow while strategic reserves deplete over time.</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Increasing disruption severity raises energy prices exponentially, while higher strategic reserves extend the time before grid failure occurs.</p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              {/* Side by side layout: SVG left, controls right on desktop */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <DisruptionVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Disruption severity slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Disruption Severity</span>
                      <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>{disruptionSeverity}% supply cut</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={disruptionSeverity}
                      onChange={(e) => setDisruptionSeverity(parseInt(e.target.value))}
                      onInput={(e) => setDisruptionSeverity(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Disruption severity"
                      style={sliderStyle(colors.error, disruptionSeverity, 0, 100)}
                    />
                  </div>

                  {/* Reserve days slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Strategic Reserve (days)</span>
                      <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{reserveDays} days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={reserveDays}
                      onChange={(e) => setReserveDays(parseInt(e.target.value))}
                      onInput={(e) => setReserveDays(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Strategic reserve days"
                      style={sliderStyle(colors.success, reserveDays, 0, 90)}
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: daysUntilBlackout < 10 ? colors.error : colors.warning }}>{daysUntilBlackout.toFixed(0)} days</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Until Grid Failure</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: priceMultiplier > 5 ? colors.error : colors.warning }}>{priceMultiplier.toFixed(1)}x</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Price Multiplier</div>
                </div>
              </div>

              {/* Strategic insight */}
              <div style={{
                background: daysUntilBlackout < 10 ? `${colors.error}22` : `${colors.warning}22`,
                border: `1px solid ${daysUntilBlackout < 10 ? colors.error : colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  Just-in-time vs strategic reserves:
                </p>
                <div style={{
                  ...typo.h2,
                  color: daysUntilBlackout < 10 ? colors.error : colors.warning
                }}>
                  {reserveDays < 10 ? 'JUST-IN-TIME: No buffer!' : `${reserveDays}-day buffer`}
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  {daysUntilBlackout < 5 ? 'System would collapse — cascading blackouts' : daysUntilBlackout < 20 ? 'Barely surviving — rationing required' : 'Reserve provides time to find alternatives'}
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
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Supply Security
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
              The Fragility of Just-in-Time Energy
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Pipeline vs Reserve</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>Buffer = Reserve Days - (Disruption% x Demand)</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Modern energy systems operate on just-in-time delivery. When the Colonial Pipeline shut down for 6 days, gas stations ran dry in 3. When Nord Stream was severed, European gas prices spiked 10x. The lesson: supply chains with zero buffer are catastrophically fragile.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Strategic Reserves</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The US Strategic Petroleum Reserve (714M barrels), European gas storage mandates, and nuclear fuel stockpiles exist precisely because markets fail during supply shocks. These reserves buy time — days to weeks — for alternatives to mobilize.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Energy Security Tradeoff</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Diversification costs money but prevents catastrophe. Maintaining multiple fuel sources, transport routes, and strategic reserves is expensive — but the cost of a grid collapse is orders of magnitude higher. Energy security is not about efficiency; it is about resilience.
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
        conceptName="E L O N_ Fuel Delivery"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Supply Chain Connection:</p>
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
                  Key players: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      // Auto-advance: find next uncompleted app, or go to test if all done
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1 && newCompleted.every(c => c)) {
                        setTimeout(() => goToPhase('test'), 400);
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
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand fuel delivery logistics and energy supply chain vulnerabilities!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Fuel Delivery
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of energy supply chains to real-world logistics scenarios. Each question presents a practical situation where fuel delivery infrastructure, energy density, transport economics, or supply chain vulnerability determines the outcome.
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
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Fuel Delivery Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the hidden logistics empire behind every power plant — from coal trains to pipeline networks to uranium enrichment chains.
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
                'Energy density determines transport infrastructure',
                'Coal consumes ~40% of US rail freight capacity',
                'Pipeline disruptions cause 10x price spikes',
                'Strategic reserves buffer supply shocks',
                'Supply chain concentration creates vulnerability',
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

export default ELON_FuelDeliveryRenderer;
