'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON GAME #6: POWER PLANT PICKER - Complete 10-Phase Game
// How capital cost, fuel cost, capacity factor, and lifetime determine $/MWh
// for each generation type — the hidden economics behind every light switch
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

interface ELON_PowerPlantPickerRendererProps {
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
    scenario: "A utility is comparing a new solar farm vs a new natural gas combined-cycle plant. The solar farm costs $1,000/kW to build but has zero fuel cost. The gas plant costs $700/kW but burns $3.50/MMBtu gas.",
    question: "What metric best captures the true lifetime cost comparison?",
    options: [
      { id: 'a', label: "Levelized Cost of Energy (LCOE) in $/MWh", correct: true },
      { id: 'b', label: "Upfront capital cost per kW" },
      { id: 'c', label: "Fuel cost per BTU" },
      { id: 'd', label: "Plant nameplate capacity in MW" }
    ],
    explanation: "LCOE captures ALL costs (capital, fuel, O&M, financing) divided by ALL energy produced over the plant's lifetime, giving a true apples-to-apples comparison in $/MWh."
  },
  {
    scenario: "A wind farm has a nameplate capacity of 200 MW but its capacity factor is 35%. A gas plant has 200 MW nameplate capacity with a 87% capacity factor.",
    question: "How much energy does each actually produce in a year?",
    options: [
      { id: 'a', label: "Wind: 613 GWh, Gas: 1,524 GWh", correct: true },
      { id: 'b', label: "Both produce 1,752 GWh (200MW × 8,760 hours)" },
      { id: 'c', label: "Wind: 200 GWh, Gas: 200 GWh" },
      { id: 'd', label: "Wind: 1,524 GWh, Gas: 613 GWh" }
    ],
    explanation: "Annual energy = Capacity × CF × 8,760 hours. Wind: 200 × 0.35 × 8,760 = 613,200 MWh. Gas: 200 × 0.87 × 8,760 = 1,524,240 MWh. Capacity factor is crucial!"
  },
  {
    scenario: "A nuclear plant costs $6,000/kW to build but runs for 60 years at 92% capacity factor. A solar farm costs $900/kW but lasts 30 years at 25% capacity factor.",
    question: "Which produces more total energy per dollar of capital invested?",
    options: [
      { id: 'a', label: "Nuclear — higher capacity factor and longer life overcome higher cost", correct: true },
      { id: 'b', label: "Solar — lower cost per kW always wins" },
      { id: 'c', label: "They produce exactly the same per dollar" },
      { id: 'd', label: "Cannot be determined without fuel costs" }
    ],
    explanation: "Nuclear: 1kW × 0.92 × 60yr × 8,760h = 483,552 kWh per $6,000 = 80.6 kWh/$. Solar: 1kW × 0.25 × 30yr × 8,760h = 65,700 kWh per $900 = 73.0 kWh/$. Nuclear edges out solar on energy per capital dollar."
  },
  {
    scenario: "Natural gas prices have historically ranged from $2/MMBtu to $15/MMBtu. A combined-cycle gas plant has a heat rate of 6,400 BTU/kWh.",
    question: "What is the fuel cost range per MWh for this plant?",
    options: [
      { id: 'a', label: "$12.80/MWh to $96/MWh", correct: true },
      { id: 'b', label: "$2/MWh to $15/MWh" },
      { id: 'c', label: "$64/MWh always" },
      { id: 'd', label: "$6.40/MWh to $6.40/MWh (fixed)" }
    ],
    explanation: "Fuel cost = gas price × heat rate / 1000. At $2: 2 × 6,400/1000 = $12.80/MWh. At $15: 15 × 6,400/1000 = $96/MWh. Gas price volatility is a major risk!"
  },
  {
    scenario: "A project developer can borrow money at 4% interest (low-risk utility) or 8% interest (risky merchant plant). The plant costs $2 billion.",
    question: "How does the discount rate affect LCOE?",
    options: [
      { id: 'a', label: "Higher discount rate increases LCOE because financing costs are higher", correct: true },
      { id: 'b', label: "Discount rate doesn't affect LCOE" },
      { id: 'c', label: "Higher discount rate decreases LCOE" },
      { id: 'd', label: "It only matters for fuel costs" }
    ],
    explanation: "LCOE is deeply sensitive to discount rate. For capital-intensive plants like nuclear or solar, doubling the discount rate can increase LCOE by 50-80%. This is why low-cost financing is critical for renewables."
  },
  {
    scenario: "Solar PV module prices have fallen from $76/W in 1977 to $0.20/W in 2024 — a 99.7% decline. This follows a 'learning rate' of ~24% cost reduction per doubling of cumulative capacity.",
    question: "What does this learning curve imply for future solar LCOE?",
    options: [
      { id: 'a', label: "Every doubling of installed solar will cut module costs by another ~24%", correct: true },
      { id: 'b', label: "Solar costs have hit bottom and cannot fall further" },
      { id: 'c', label: "Only government subsidies drove the decline" },
      { id: 'd', label: "The learning rate will accelerate to 50% per doubling" }
    ],
    explanation: "Technology learning curves show that costs decline predictably with cumulative production. Solar's ~24% learning rate means each doubling of global capacity still cuts module costs by nearly a quarter."
  },
  {
    scenario: "A coal plant emits 0.95 tons of CO2 per MWh. A gas combined-cycle emits 0.40 tons/MWh. A carbon price of $50/ton CO2 is imposed.",
    question: "How much does the carbon price add to each plant's LCOE?",
    options: [
      { id: 'a', label: "Coal: +$47.50/MWh, Gas: +$20/MWh", correct: true },
      { id: 'b', label: "Both increase by $50/MWh" },
      { id: 'c', label: "Coal: +$20/MWh, Gas: +$47.50/MWh" },
      { id: 'd', label: "Neither is affected — carbon price is separate" }
    ],
    explanation: "Carbon cost = emission rate × carbon price. Coal: 0.95 × $50 = $47.50/MWh. Gas: 0.40 × $50 = $20/MWh. Carbon pricing hits coal roughly 2.4× harder than gas."
  },
  {
    scenario: "Texas has abundant wind (capacity factor ~45%) and solar (CF ~28%). California has less wind (CF ~30%) but excellent solar (CF ~30%). New England has moderate wind (CF ~35%) and weak solar (CF ~18%).",
    question: "Why does LCOE for the same technology vary dramatically by location?",
    options: [
      { id: 'a', label: "Higher capacity factor spreads the same fixed costs over more MWh produced", correct: true },
      { id: 'b', label: "Construction costs vary by state" },
      { id: 'c', label: "Federal subsidies differ by region" },
      { id: 'd', label: "Wind turbines are more expensive in some states" }
    ],
    explanation: "LCOE = Total Cost / Total Energy. If a Texas wind farm produces 45% more energy than a New England one for the same cost, its LCOE is proportionally lower. Resource quality is destiny."
  },
  {
    scenario: "Solar and wind produce power only when the sun shines or wind blows (intermittent). Gas and nuclear can generate on demand (dispatchable).",
    question: "Why might LCOE alone be misleading when comparing intermittent vs dispatchable sources?",
    options: [
      { id: 'a', label: "Intermittent sources may need backup or storage, adding system costs not in LCOE", correct: true },
      { id: 'b', label: "LCOE already accounts for intermittency" },
      { id: 'c', label: "Dispatchable sources are always cheaper" },
      { id: 'd', label: "Intermittent sources have no additional system costs" }
    ],
    explanation: "LCOE measures the cost of generating a MWh, not delivering it when needed. Integration costs (storage, transmission, backup) can add $5-30/MWh for high-penetration renewables. 'LCOE + system costs' gives a fuller picture."
  },
  {
    scenario: "Offshore wind LCOE in UK auctions dropped from £155/MWh (2014) to £37/MWh (2023) — a 76% decline in 9 years.",
    question: "What primarily drove this dramatic cost reduction?",
    options: [
      { id: 'a', label: "Larger turbines, industrialized supply chains, and competitive auctions", correct: true },
      { id: 'b', label: "Government subsidies covering most of the cost" },
      { id: 'c', label: "Cheaper steel prices" },
      { id: 'd', label: "Offshore wind was always cheap but prices were artificially high" }
    ],
    explanation: "Turbine size grew from 3MW to 15MW+, capacity factors rose from ~35% to ~55%, manufacturing scaled up, and competitive auctions forced efficiency. This is technology learning in action."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u2622\uFE0F',
    title: 'Hinkley Point C Nuclear',
    short: 'The economics of new nuclear in a liberalized market',
    tagline: 'When guaranteed prices meet construction reality',
    description: 'Hinkley Point C in Somerset, England is the first new nuclear plant in the UK in a generation. Its strike price of £92.50/MWh (2012 prices) was controversial — critics said renewables would undercut it before completion. With costs ballooning and timelines slipping, HPC illustrates both nuclear\'s promise of reliable baseload and its Achilles heel of construction risk.',
    connection: 'LCOE for nuclear is dominated by capital costs — the £92.50/MWh strike price must cover a £33+ billion construction budget spread over 60 years of generation at 3.2GW capacity.',
    howItWorks: 'A Contract for Difference (CfD) guarantees EDF a fixed price per MWh for 35 years. If wholesale prices fall below the strike, consumers pay the difference. If prices rise above it, EDF pays back.',
    stats: [
      { value: '£92.50/MWh', label: 'Strike Price', icon: '\u26A1' },
      { value: '~£50/MWh', label: 'Current Market', icon: '\uD83D\uDCC9' },
      { value: '3.2GW', label: 'Capacity', icon: '\uD83C\uDFED' }
    ],
    examples: ['Hinkley Point C (UK)', 'Vogtle 3&4 (US)', 'Flamanville 3 (France)', 'Olkiluoto 3 (Finland)'],
    companies: ['EDF Energy', 'CGN', 'Framatome', 'Rolls-Royce SMR'],
    futureImpact: 'Small Modular Reactors (SMRs) aim to cut nuclear LCOE by 30-50% through factory construction and learning curves.',
    color: '#8B5CF6'
  },
  {
    icon: '\u2600\uFE0F',
    title: 'Al Dhafra Solar PV',
    short: 'Record-breaking solar economics in the Gulf',
    tagline: 'The world\'s cheapest electricity from sunlight',
    description: 'The Al Dhafra solar project in Abu Dhabi set a world record with a bid of just $0.0135/kWh (1.35 cents) when announced in 2020. At 2GW, it demonstrates that solar PV in high-irradiance locations can produce electricity cheaper than any fossil fuel, even without subsidies. The project illustrates how excellent solar resource, low-cost financing, and massive scale drive LCOE to historic lows.',
    connection: 'With zero fuel cost and a capacity factor above 28% in the Arabian desert, the LCOE is almost entirely capital cost amortized over huge energy production. Cheap government financing and scale economics push it below fossil fuels.',
    howItWorks: 'Bifacial solar panels capture reflected ground light, boosting output. Single-axis tracking follows the sun. A 25-year power purchase agreement provides revenue certainty, enabling low-cost debt financing.',
    stats: [
      { value: '$0.0135/kWh', label: 'Record Bid', icon: '\uD83C\uDFC6' },
      { value: '2GW', label: 'Capacity', icon: '\u2600\uFE0F' },
      { value: 'Abu Dhabi', label: 'Location', icon: '\uD83C\uDF0D' }
    ],
    examples: ['Al Dhafra (UAE)', 'Sudair (Saudi Arabia)', 'Bhadla (India)', 'Villanueva (Mexico)'],
    companies: ['TAQA', 'Masdar', 'Jinko Solar', 'EDF Renewables'],
    futureImpact: 'Perovskite-silicon tandem cells could push desert solar below $0.01/kWh by 2030.',
    color: '#F59E0B'
  },
  {
    icon: '\uD83D\uDD25',
    title: 'US Natural Gas Combined Cycle',
    short: 'The flexible workhorse of American electricity',
    tagline: 'Cheap gas made it king — but prices are volatile',
    description: 'Natural gas combined-cycle (NGCC) plants are the backbone of US electricity, providing about 40% of generation. At $2.50/MMBtu gas prices, LCOE can be as low as $35/MWh — beating most alternatives. But gas prices have spiked to $9+ in recent years, sending LCOE above $70/MWh. This price volatility is the hidden risk in gas-dependent grids.',
    connection: 'Unlike solar or wind, gas LCOE has a large variable fuel component. The LCOE formula splits roughly 25% capital, 50% fuel, 15% O&M, 10% financing — making it extremely sensitive to gas prices.',
    howItWorks: 'A combined-cycle plant burns gas in a turbine, then uses waste heat to make steam for a second turbine. This "combined" approach achieves 60%+ efficiency — the best of any thermal plant.',
    stats: [
      { value: '$2.50/MMBtu', label: 'Current Gas Price', icon: '\uD83D\uDD25' },
      { value: '$35/MWh', label: 'LCOE at Low Gas', icon: '\uD83D\uDCB0' },
      { value: '60%', label: 'Capacity Factor', icon: '\u2699\uFE0F' }
    ],
    examples: ['Riviera Beach NGCC (FL)', 'Deer Park Energy (TX)', 'Cricket Valley (NY)', 'Panda Patriot (PA)'],
    companies: ['GE Vernova', 'Siemens Energy', 'Mitsubishi Power', 'NextEra Energy'],
    futureImpact: 'Hydrogen-blending and carbon capture could keep gas plants relevant in a low-carbon future — at a cost.',
    color: '#EF4444'
  },
  {
    icon: '\uD83C\uDF0A',
    title: 'Offshore Wind Trajectory',
    short: 'From expensive niche to mainstream power source',
    tagline: 'The fastest cost decline in energy history',
    description: 'UK offshore wind auction prices plummeted from £155/MWh in 2014 to £37.35/MWh in 2023 — a 76% decline in under a decade. Turbines grew from 3MW to 15MW+, capacity factors rose from 35% to 55%, and an industrialized supply chain emerged. This trajectory shows how technology learning curves, competitive auctions, and scale economics can transform an expensive technology into a cheap one.',
    connection: 'Larger turbines capture more energy per foundation, spreading the huge fixed costs of offshore construction over far more MWh — directly lowering LCOE through higher capacity factor and economies of scale.',
    howItWorks: 'Monopile or jacket foundations are installed in the seabed, supporting turbines with 200m+ rotor diameters. Subsea cables carry power to shore. Vessels service turbines year-round.',
    stats: [
      { value: '£37.35/MWh', label: 'Latest UK Price', icon: '\uD83C\uDF0A' },
      { value: '70%', label: 'Cost Decline', icon: '\uD83D\uDCC9' },
      { value: '8 years', label: 'Decline Timeline', icon: '\u23F1\uFE0F' }
    ],
    examples: ['Hornsea Project (UK)', 'Dogger Bank (UK)', 'Vineyard Wind (US)', 'Borssele (Netherlands)'],
    companies: ['Orsted', 'Equinor', 'Vattenfall', 'SSE Renewables'],
    futureImpact: 'Floating offshore wind will unlock deep-water sites, potentially doubling the global addressable market.',
    color: '#3B82F6'
  }
];

// -----------------------------------------------------------------------------
// PLANT TYPE DATA for LCOE simulation
// -----------------------------------------------------------------------------
interface PlantType {
  name: string;
  shortName: string;
  capitalPerKw: number;        // $/kW installed
  fixedOmPerMwh: number;       // $/MWh fixed O&M
  fuelCostPerMwh: number;      // $/MWh base fuel cost (0 for renewables)
  capacityFactor: number;      // 0-1
  lifetimeYears: number;
  co2PerMwh: number;           // tons CO2 per MWh
  color: string;
  fuelSensitivity: number;     // how much fuel cost changes per $1 gas price change
  financingShare: number;      // fraction of capital as financing cost
}

const plantTypes: PlantType[] = [
  {
    name: 'Solar PV', shortName: 'Solar', capitalPerKw: 950, fixedOmPerMwh: 5,
    fuelCostPerMwh: 0, capacityFactor: 0.27, lifetimeYears: 30, co2PerMwh: 0,
    color: '#F59E0B', fuelSensitivity: 0, financingShare: 0.15
  },
  {
    name: 'Onshore Wind', shortName: 'Wind', capitalPerKw: 1300, fixedOmPerMwh: 7,
    fuelCostPerMwh: 0, capacityFactor: 0.35, lifetimeYears: 25, co2PerMwh: 0,
    color: '#10B981', fuelSensitivity: 0, financingShare: 0.14
  },
  {
    name: 'Gas CC', shortName: 'Gas CC', capitalPerKw: 1100, fixedOmPerMwh: 4,
    fuelCostPerMwh: 21, capacityFactor: 0.87, lifetimeYears: 30, co2PerMwh: 0.40,
    color: '#EF4444', fuelSensitivity: 6.4, financingShare: 0.08
  },
  {
    name: 'Coal', shortName: 'Coal', capitalPerKw: 3600, fixedOmPerMwh: 8,
    fuelCostPerMwh: 25, capacityFactor: 0.85, lifetimeYears: 40, co2PerMwh: 0.95,
    color: '#6B7280', fuelSensitivity: 0, financingShare: 0.12
  },
  {
    name: 'Nuclear', shortName: 'Nuclear', capitalPerKw: 6000, fixedOmPerMwh: 12,
    fuelCostPerMwh: 7, capacityFactor: 0.92, lifetimeYears: 60, co2PerMwh: 0,
    color: '#8B5CF6', fuelSensitivity: 0, financingShare: 0.22
  },
  {
    name: 'Offshore Wind', shortName: 'Offshore', capitalPerKw: 3200, fixedOmPerMwh: 16,
    fuelCostPerMwh: 0, capacityFactor: 0.45, lifetimeYears: 25, co2PerMwh: 0,
    color: '#3B82F6', fuelSensitivity: 0, financingShare: 0.18
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_PowerPlantPickerRenderer: React.FC<ELON_PowerPlantPickerRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [gasPrice, setGasPrice] = useState(3.5);

  // Twist phase — carbon price
  const [carbonPrice, setCarbonPrice] = useState(0);

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

  // Calculate LCOE for a plant type
  const calculateLCOE = (plant: PlantType, gasPriceVal: number, carbonPriceVal: number = 0) => {
    const annualMwh = plant.capacityFactor * 8760;
    const capitalPerMwh = (plant.capitalPerKw * 1000) / (annualMwh * plant.lifetimeYears);
    const fuelCost = plant.fuelSensitivity > 0
      ? gasPriceVal * plant.fuelSensitivity
      : plant.fuelCostPerMwh;
    const financing = capitalPerMwh * plant.financingShare;
    const carbonCost = plant.co2PerMwh * carbonPriceVal;
    return {
      capital: capitalPerMwh,
      fuel: fuelCost,
      om: plant.fixedOmPerMwh,
      financing: financing,
      carbon: carbonCost,
      total: capitalPerMwh + fuelCost + plant.fixedOmPerMwh + financing + carbonCost
    };
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
        gameType: 'power-plant-picker',
        gameTitle: 'Power Plant Picker',
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`,
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

  // ---------------------------------------------------------------------------
  // LCOE BAR CHART SVG VISUALIZATION (Play Phase)
  // ---------------------------------------------------------------------------
  const LCOEVisualization = ({ showCarbon }: { showCarbon: boolean }) => {
    const width = isMobile ? 350 : 560;
    const height = 380;
    const chartLeft = 55;
    const chartRight = width - 20;
    const chartTop = 50;
    const chartBottom = 280;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;
    const barCount = 6;
    const barGap = 10;
    const barWidth = (chartWidth - barGap * (barCount + 1)) / barCount;

    // Compute LCOE for all plants
    const lcoeData = plantTypes.map(plant =>
      calculateLCOE(plant, gasPrice, showCarbon ? carbonPrice : 0)
    );

    // Find max for scale
    const maxLCOE = Math.max(...lcoeData.map(d => d.total), 80);
    const scaleMax = Math.ceil(maxLCOE / 20) * 20;
    const yScale = (val: number) => chartBottom - (val / scaleMax) * chartHeight;

    // Market price line
    const marketPrice = 55;
    const marketY = yScale(marketPrice);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="capitalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="fuelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
          <linearGradient id="omGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="finGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient id="carbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <linearGradient id="marketLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
            <stop offset="20%" stopColor="#10B981" />
            <stop offset="80%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Levelized Cost of Energy (LCOE) — $/MWh
        </text>
        <text x={width / 2} y={36} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          {showCarbon ? `Gas: $${gasPrice.toFixed(1)}/MMBtu | Carbon: $${carbonPrice}/ton CO\u2082` : `Natural Gas Price: $${gasPrice.toFixed(1)}/MMBtu`}
        </text>

        {/* Y-axis grid lines */}
        {[0, 20, 40, 60, 80, 100, 120, 140, 160].filter(v => v <= scaleMax).map(val => (
          <g key={`grid-${val}`}>
            <line
              x1={chartLeft}
              y1={yScale(val)}
              x2={chartRight}
              y2={yScale(val)}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4,4"
            />
            <text
              x={chartLeft - 8}
              y={yScale(val) + 4}
              fill={colors.textMuted}
              fontSize="11"
              textAnchor="end"
            >
              ${val}
            </text>
          </g>
        ))}

        {/* Y-axis label */}
        <text
          x={8}
          y={chartTop + chartHeight / 2}
          fill={colors.textMuted}
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90, 8, ${chartTop + chartHeight / 2})`}
        >
          $/MWh
        </text>

        {/* Market price line */}
        <line
          x1={chartLeft}
          y1={marketY}
          x2={chartRight}
          y2={marketY}
          stroke="#10B981"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.7"
        />
        <text
          x={chartLeft + 4}
          y={marketY - 6}
          fill="#10B981"
          fontSize="11"
          fontWeight="600"
          textAnchor="start"
        >
          Market ~${marketPrice}/MWh
        </text>

        {/* Stacked bars for each plant */}
        {plantTypes.map((plant, idx) => {
          const lcoe = lcoeData[idx];
          const x = chartLeft + barGap + idx * (barWidth + barGap);

          // Stack order: capital (bottom), fuel, O&M, financing, carbon (top)
          const components = [
            { value: lcoe.capital, fill: 'url(#capitalGrad)', label: 'Capital' },
            { value: lcoe.fuel, fill: 'url(#fuelGrad)', label: 'Fuel' },
            { value: lcoe.om, fill: 'url(#omGrad)', label: 'O&M' },
            { value: lcoe.financing, fill: 'url(#finGrad)', label: 'Finance' },
          ];
          if (showCarbon && lcoe.carbon > 0) {
            components.push({ value: lcoe.carbon, fill: 'url(#carbonGrad)', label: 'Carbon' });
          }

          let currentY = chartBottom;
          const isProfitable = lcoe.total <= marketPrice;

          return (
            <g key={plant.shortName}>
              {/* Bar segments */}
              {components.map((comp, ci) => {
                if (comp.value <= 0) return null;
                const segH = (comp.value / scaleMax) * chartHeight;
                currentY -= segH;
                return (
                  <rect
                    key={ci}
                    x={x}
                    y={currentY}
                    width={barWidth}
                    height={segH}
                    fill={comp.fill}
                    rx="2"
                    opacity={0.9}
                  />
                );
              })}

              {/* Total LCOE label */}
              <text
                x={x + barWidth / 2}
                y={yScale(lcoe.total) - 6}
                fill={isProfitable ? colors.success : colors.error}
                fontSize={isMobile ? '9' : '11'}
                fontWeight="700"
                textAnchor="middle"
                filter="url(#textGlow)"
              >
                ${lcoe.total.toFixed(0)}
              </text>

              {/* Profit/Loss indicator circle */}
              <circle
                cx={x + barWidth / 2}
                cy={yScale(lcoe.total) - 28}
                r="6"
                fill={isProfitable ? colors.success : colors.error}
                opacity="0.7"
              />
              <text
                x={x + barWidth / 2}
                y={yScale(lcoe.total) - 25}
                fill="white"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {isProfitable ? '\u2713' : '\u2717'}
              </text>

              {/* Plant name label */}
              <text
                x={x + barWidth / 2}
                y={chartBottom + 14}
                fill={plant.color}
                fontSize={isMobile ? '9' : '11'}
                fontWeight="600"
                textAnchor="middle"
              >
                {plant.shortName}
              </text>

              {/* Capacity factor label */}
              <text
                x={x + barWidth / 2}
                y={chartBottom + 30}
                fill={colors.textMuted}
                fontSize="11"
                textAnchor="middle"
              >
                CF:{(plant.capacityFactor * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g>
          <rect x={chartLeft} y={height - 65} width="10" height="10" rx="2" fill="url(#capitalGrad)" />
          <text x={chartLeft + 14} y={height - 56} fill={colors.textMuted} fontSize="11">Capital</text>

          <rect x={chartLeft + 60} y={height - 65} width="10" height="10" rx="2" fill="url(#fuelGrad)" />
          <text x={chartLeft + 74} y={height - 56} fill={colors.textMuted} fontSize="11">Fuel</text>

          <rect x={chartLeft + 105} y={height - 65} width="10" height="10" rx="2" fill="url(#omGrad)" />
          <text x={chartLeft + 119} y={height - 56} fill={colors.textMuted} fontSize="11">O&M</text>

          <rect x={chartLeft + 155} y={height - 65} width="10" height="10" rx="2" fill="url(#finGrad)" />
          <text x={chartLeft + 169} y={height - 56} fill={colors.textMuted} fontSize="11">Finance</text>

          {showCarbon && (
            <>
              <rect x={chartLeft + 215} y={height - 65} width="10" height="10" rx="2" fill="url(#carbonGrad)" />
              <text x={chartLeft + 229} y={height - 56} fill={colors.textMuted} fontSize="11">Carbon</text>
            </>
          )}

          <circle cx={showCarbon ? chartLeft + 290 : chartLeft + 230} cy={height - 60} r="6" fill={colors.success} opacity="0.7" />
          <text x={(showCarbon ? chartLeft + 300 : chartLeft + 240)} y={height - 56} fill={colors.textMuted} fontSize="11">Profitable</text>

          <circle cx={showCarbon ? chartLeft + 360 : chartLeft + 305} cy={height - 60} r="6" fill={colors.error} opacity="0.7" />
          <text x={(showCarbon ? chartLeft + 370 : chartLeft + 315)} y={height - 56} fill={colors.textMuted} fontSize="11">Unprofitable</text>
        </g>

        {/* Decorative path: cost trend line connecting bar tops with interpolated points */}
        <path
          d={(() => {
            const pts = plantTypes.map((_, idx) => {
              const lcoe = lcoeData[idx];
              const x = chartLeft + barGap + idx * (barWidth + barGap) + barWidth / 2;
              const y = yScale(lcoe.total);
              return { x, y };
            });
            // Interpolate between each pair to get >= 10 points
            const segments: string[] = [];
            for (let i = 0; i < pts.length; i++) {
              if (i === 0) {
                segments.push(`M ${pts[i].x} ${pts[i].y}`);
              }
              if (i < pts.length - 1) {
                const mx = (pts[i].x + pts[i + 1].x) / 2;
                const my = (pts[i].y + pts[i + 1].y) / 2;
                segments.push(`L ${mx} ${my}`);
                segments.push(`L ${pts[i + 1].x} ${pts[i + 1].y}`);
              }
            }
            return segments.join(' ');
          })()}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="6,3"
          opacity="0.4"
        />

        {/* Interactive marker dots on trend line */}
        {plantTypes.map((plant, idx) => {
          const lcoe = lcoeData[idx];
          const x = chartLeft + barGap + idx * (barWidth + barGap) + barWidth / 2;
          const y = yScale(lcoe.total);
          return (
            <circle
              key={`dot-${idx}`}
              cx={x}
              cy={y}
              r="3"
              fill={plant.color}
              stroke="white"
              strokeWidth="1"
            />
          );
        })}

        {/* Bottom axis label */}
        <text x={width / 2} y={height - 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Power Generation Technology
        </text>

        {/* Decorative bottom border line */}
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.border} strokeWidth="1" />
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
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\uD83C\uDFED\uD83D\uDCB0'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Power Plant Picker
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            Every time you flip a light switch, hidden economics determine which power plant responds. <span style={{ color: colors.accent }}>Capital costs, fuel prices, capacity factors, and lifetimes</span> all combine into a single number — the Levelized Cost of Energy — that decides the future of electricity.
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
              "The cheapest energy is the energy you don't have to pay for twice — once to build the plant, and forever to feed it fuel. LCOE reveals which sources win that race."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Energy Economics Fundamentals
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
      { id: 'a', text: 'Nuclear — massive reliable baseload output' },
      { id: 'b', text: 'Natural gas — cheap fuel and high efficiency' },
      { id: 'c', text: 'Solar PV — dramatic cost declines have made it cheapest' },
      { id: 'd', text: 'Coal — still the global workhorse' },
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

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Which power source currently has the lowest cost per MWh in most of the world?
            </h2>

            {/* Static SVG showing cost comparison concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictSolarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                  <linearGradient id="predictGasGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <linearGradient id="predictNuclearGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                  <linearGradient id="predictCoalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6B7280" />
                    <stop offset="100%" stopColor="#9CA3AF" />
                  </linearGradient>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Cost Per MWh — Which is Cheapest?</text>

                <rect x="40" y="45" width="130" height="22" rx="4" fill="url(#predictNuclearGrad)" opacity="0.7" />
                <text x="105" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Nuclear</text>

                <rect x="40" y="75" width="100" height="22" rx="4" fill="url(#predictGasGrad)" opacity="0.7" />
                <text x="90" y="90" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Gas CC</text>

                <rect x="40" y="105" width="60" height="22" rx="4" fill="url(#predictSolarGrad)" opacity="0.7" />
                <text x="70" y="120" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Solar?</text>

                <rect x="40" y="135" width="140" height="22" rx="4" fill="url(#predictCoalGrad)" opacity="0.7" />
                <text x="110" y="150" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Coal</text>

                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">Which technology wins the cost race?</text>

                <text x="340" y="70" fill="#94a3b8" fontSize="24">?</text>
                <text x="355" y="100" fill="#94a3b8" fontSize="30">?</text>
                <text x="325" y="130" fill="#94a3b8" fontSize="20">?</text>
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

  // PLAY PHASE - Interactive LCOE Calculator
  if (phase === 'play') {
    const lcoeData = plantTypes.map(plant => calculateLCOE(plant, gasPrice, 0));

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
              LCOE Calculator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> LCOE determines which power plants get built and which get retired. Utilities, investors, and governments use it to shape the energy future. A few dollars per MWh can mean billions in investment decisions.
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
                <strong style={{ color: colors.textPrimary }}>LCOE (Levelized Cost of Energy)</strong> is the total lifetime cost of a power plant divided by its total lifetime energy output, expressed in $/MWh.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Capacity Factor</strong> is the fraction of time a plant actually generates power at its rated capacity — solar ~27%, nuclear ~92%.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.warning }}>Stacked Cost Components</strong> — each bar shows capital, fuel, O&M, and financing costs layered on top of each other.
              </p>
            </div>

            {/* LCOE Formula */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontFamily: 'monospace' }}>
                LCOE = (Capital + Fuel + O&M + Financing) / Total Energy Produced
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
                This formula describes how the relationship between fixed and variable costs determines the true price of electricity.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              The chart below is showing the LCOE breakdown for six power plant types. Observe how stacked cost components vary by source. Try moving the gas price slider and watch how fuel cost changes reshape the competitive landscape. Notice which plants remain profitable as prices shift.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
                <LCOEVisualization showCarbon={false} />
              </div>

              {/* Gas price slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Natural Gas Price</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    ${gasPrice.toFixed(1)}/MMBtu
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="0.5"
                  value={gasPrice}
                  onChange={(e) => setGasPrice(parseFloat(e.target.value))}
                  onInput={(e) => setGasPrice(parseFloat((e.target as HTMLInputElement).value))}
                  aria-label="Natural Gas Price"
                  style={sliderStyle(colors.accent, gasPrice, 2, 15)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>$2.00 (cheap)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>$8.50 (avg)</span>
                  <span style={{ ...typo.small, color: colors.error }}>$15.00 (crisis)</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                {(() => {
                  const cheapest = lcoeData.reduce((min, d, i) => d.total < min.total ? { ...d, i } : min, { ...lcoeData[0], i: 0 });
                  const gasLcoe = lcoeData[2];
                  return (
                    <>
                      <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ ...typo.h3, color: plantTypes[cheapest.i].color }}>
                          {plantTypes[cheapest.i].shortName}
                        </div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Cheapest Source</div>
                      </div>
                      <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ ...typo.h3, color: colors.accent }}>${cheapest.total.toFixed(0)}/MWh</div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Lowest LCOE</div>
                      </div>
                      <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ ...typo.h3, color: gasLcoe.total > 55 ? colors.error : colors.success }}>
                          ${gasLcoe.total.toFixed(0)}/MWh
                        </div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>Gas CC LCOE</div>
                      </div>
                    </>
                  );
                })()}
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
              Understand the Economics
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
              The Economics of Electricity Generation
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Your prediction was correct! As you saw in the experiment, Solar PV has become the cheapest source of new electricity in most of the world, with LCOE as low as $20-30/MWh in favorable locations.'
                : 'As you observed in the experiment, Solar PV has surprised many by becoming the cheapest source of new electricity in most of the world. Your prediction may have differed, but the result shows that LCOE has fallen 90% in the last decade, driven by manufacturing scale and technology learning curves.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>LCOE = Total Lifetime Costs / Total Lifetime Energy</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The levelized cost captures <span style={{ color: '#3B82F6' }}>capital construction costs</span>, <span style={{ color: colors.error }}>fuel costs over the plant's entire life</span>, <span style={{ color: colors.warning }}>operations and maintenance</span>, and <span style={{ color: '#8B5CF6' }}>financing costs</span>, all divided by the total MWh produced.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Solar LCOE: $950/kW capital, 0 fuel, 27% CF, 30yr = <strong>~$31/MWh</strong>
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
                Why Capacity Factor Matters So Much
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                A plant that runs 92% of the time (nuclear) spreads its capital cost over 3.4x more energy than one running 27% (solar). This is why capital-heavy plants need high capacity factors. Solar wins despite low CF because its capital cost per kW has fallen so dramatically.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                LCOE Breakdown by Source
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {plantTypes.map(plant => {
                  const lcoe = calculateLCOE(plant, 3.5, 0);
                  return (
                    <div key={plant.name} style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.body, color: plant.color, fontWeight: 600 }}>{plant.shortName}</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>${lcoe.total.toFixed(0)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>$/MWh</div>
                    </div>
                  );
                })}
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
      { id: 'a', text: 'Make all plants more expensive equally' },
      { id: 'b', text: 'Make coal ~3x more expensive while solar stays unchanged' },
      { id: 'c', text: 'Only affect gas plants, not coal' },
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
                New Variable: Carbon Pricing
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Adding a $100/ton carbon price would...
            </h2>

            {/* Static SVG showing carbon price concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="co2Grad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#6B7280" />
                    <stop offset="100%" stopColor="#374151" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">CO{'\u2082'} Emissions by Source (tons/MWh)</text>

                {/* Coal bar */}
                <rect x="50" y="40" width="60" height="90" rx="4" fill="#6B7280" opacity="0.8" />
                <text x="80" y="80" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">0.95</text>
                <text x="80" y="145" textAnchor="middle" fill="#6B7280" fontSize="11" fontWeight="600">Coal</text>

                {/* Gas bar */}
                <rect x="130" y="78" width="60" height="52" rx="4" fill="#EF4444" opacity="0.8" />
                <text x="160" y="108" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">0.40</text>
                <text x="160" y="145" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600">Gas</text>

                {/* Solar bar (zero) */}
                <rect x="210" y="127" width="60" height="3" rx="2" fill="#F59E0B" opacity="0.8" />
                <text x="240" y="122" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="700">0</text>
                <text x="240" y="145" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">Solar</text>

                {/* Wind bar (zero) */}
                <rect x="290" y="127" width="60" height="3" rx="2" fill="#10B981" opacity="0.8" />
                <text x="320" y="122" textAnchor="middle" fill="#10B981" fontSize="14" fontWeight="700">0</text>
                <text x="320" y="145" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">Wind</text>

                {/* Carbon price arrow */}
                <text x="80" y="38" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">+$95/MWh!</text>
                <text x="160" y="72" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">+$40/MWh</text>
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
                See Carbon Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Carbon Price Impact
  if (phase === 'twist_play') {
    const lcoeData = plantTypes.map(plant => calculateLCOE(plant, gasPrice, carbonPrice));
    const coalLcoe = lcoeData[3];
    const solarLcoe = lcoeData[0];

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
              Carbon Price Impact on LCOE
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Watch coal and gas bars grow dramatically as carbon costs are internalized
            </p>

            {/* Educational panel */}
            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The LCOE chart now includes a carbon cost component stacked on top of fossil fuel bars. Coal and gas bars grow taller as carbon pricing internalizes climate damage costs, while renewables remain unchanged.</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase the carbon price slider, fossil fuel LCOE rises proportionally to each source's CO2 emissions rate. Coal (0.95 tons/MWh) is hit hardest, making renewables increasingly dominant.</p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              {/* SVG Visualization */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
                <LCOEVisualization showCarbon={true} />
              </div>

              {/* Gas price slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Natural Gas Price</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    ${gasPrice.toFixed(1)}/MMBtu
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="0.5"
                  value={gasPrice}
                  onChange={(e) => setGasPrice(parseFloat(e.target.value))}
                  onInput={(e) => setGasPrice(parseFloat((e.target as HTMLInputElement).value))}
                  aria-label="Natural Gas Price"
                  style={sliderStyle(colors.accent, gasPrice, 2, 15)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>$2.00</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>$8.50</span>
                  <span style={{ ...typo.small, color: colors.error }}>$15.00</span>
                </div>
              </div>

              {/* Carbon price slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Carbon Price</span>
                  <span style={{ ...typo.small, color: carbonPrice > 50 ? colors.error : colors.warning, fontWeight: 600 }}>
                    ${carbonPrice}/ton CO{'\u2082'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={carbonPrice}
                  onChange={(e) => setCarbonPrice(parseInt(e.target.value))}
                  onInput={(e) => setCarbonPrice(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Carbon Price"
                  style={sliderStyle(colors.warning, carbonPrice, 0, 150)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>$0 (no price)</span>
                  <span style={{ ...typo.small, color: colors.warning }}>$75 (EU ETS)</span>
                  <span style={{ ...typo.small, color: colors.error }}>$150 (social cost)</span>
                </div>
              </div>

              {/* Impact stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: '#6B7280' }}>Coal: ${coalLcoe.total.toFixed(0)}/MWh</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>+${coalLcoe.carbon.toFixed(0)} carbon cost</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: '#F59E0B' }}>Solar: ${solarLcoe.total.toFixed(0)}/MWh</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>$0 carbon cost</div>
                </div>
              </div>

              {/* Carbon impact warning */}
              <div style={{
                background: carbonPrice > 50 ? `${colors.error}22` : `${colors.warning}22`,
                border: `1px solid ${carbonPrice > 50 ? colors.error : colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  At ${carbonPrice}/ton CO{'\u2082'}:
                </p>
                <div style={{
                  ...typo.h2,
                  color: carbonPrice > 50 ? colors.error : colors.warning
                }}>
                  Coal LCOE is {coalLcoe.total > 0 && solarLcoe.total > 0 ? (coalLcoe.total / solarLcoe.total).toFixed(1) : '0'}x Solar
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  {carbonPrice >= 100
                    ? 'At this carbon price, coal is economically impossible. Even gas struggles.'
                    : carbonPrice >= 50
                    ? 'Carbon pricing makes coal significantly more expensive than renewables.'
                    : 'Without carbon pricing, coal\'s climate costs are hidden — an implicit subsidy.'}
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
              Understand Carbon Economics
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
              The Carbon Price Revolution
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Carbon Cost Equation</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>Carbon Cost = Emissions Rate x Carbon Price</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Coal emits 0.95 tons CO{'\u2082'}/MWh. At $100/ton, that adds <strong>$95/MWh</strong> — nearly tripling coal's LCOE. Gas emits 0.40 tons, adding $40/MWh. Solar and wind add <strong>$0</strong>. This asymmetry is why carbon pricing is the single most powerful policy tool for energy transition.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Global Carbon Pricing Today</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The EU Emissions Trading System prices carbon at ~$75-90/ton. China launched its national ETS in 2021. Over 23% of global emissions are now covered by some form of carbon pricing. Economists estimate the "social cost of carbon" at $50-200/ton.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Without carbon pricing, fossil fuel plants externalize their climate costs onto society. LCOE without carbon cost is an incomplete picture — it gives coal and gas an implicit subsidy by ignoring the damage their emissions cause. Full-cost LCOE makes the renewable advantage even more overwhelming.
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>LCOE Connection:</p>
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
                      // Auto-advance to next uncompleted app, or to test if all done
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
                {passed ? 'You understand LCOE, capacity factors, carbon pricing, and the economics of electricity generation!' : 'Review the concepts of LCOE, capacity factors, and carbon pricing, then try again.'}
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
              Knowledge Test: Power Plant Economics
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of LCOE, capacity factors, learning curves, carbon pricing, and the economics of different generation technologies. Each question presents a real-world scenario where energy economics determines the outcome.
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
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Power Plant Picker Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the hidden economics behind every light switch — how capital costs, fuel prices, capacity factors, and carbon pricing shape the future of electricity.
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
                'LCOE = Total Costs / Total Energy over plant lifetime',
                'Capacity factor determines how much energy a plant actually produces',
                'Carbon pricing hits coal ~2.4x harder than gas, zero for renewables',
                'Learning curves have made solar the cheapest new electricity source',
                'Fuel price volatility is a hidden risk for gas-dependent grids',
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

export default ELON_PowerPlantPickerRenderer;
