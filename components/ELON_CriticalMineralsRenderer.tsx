'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// CRITICAL MINERALS - Complete 10-Phase Game
// Supply chain concentration risk — geographic concentration creates
// geopolitical chokepoints in critical mineral supply chains
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

interface ELON_CriticalMineralsRendererProps {
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
    scenario: "The US Department of Defense maintains a list of minerals critical to national security and economic prosperity.",
    question: "What is the primary criterion for classifying a mineral as 'critical'?",
    options: [
      { id: 'a', label: "It is rare in the Earth's crust" },
      { id: 'b', label: "High import reliance combined with supply concentration risk", correct: true },
      { id: 'c', label: "It is expensive to mine" },
      { id: 'd', label: "It is used in military applications only" }
    ],
    explanation: "Critical mineral designation is based on supply risk (geographic concentration, import dependence) combined with economic importance, not absolute rarity or price."
  },
  {
    scenario: "The Herfindahl-Hirschman Index (HHI) measures market concentration by summing the squares of each country's market share percentage.",
    question: "If one country controls 90% of processing, what is the approximate HHI?",
    options: [
      { id: 'a', label: "About 900" },
      { id: 'b', label: "About 8,100", correct: true },
      { id: 'c', label: "About 90" },
      { id: 'd', label: "About 1,800" }
    ],
    explanation: "HHI = 90^2 + (remaining shares squared). 90^2 = 8,100 alone. An HHI above 2,500 indicates a highly concentrated market. Rare earth processing at ~8,100 is extremely concentrated."
  },
  {
    scenario: "In 2010, China temporarily halted rare earth exports to Japan during a territorial dispute over the Senkaku/Diaoyu Islands.",
    question: "What was the immediate market impact?",
    options: [
      { id: 'a', label: "Prices barely changed" },
      { id: 'b', label: "Prices spiked 10-20x for some elements, causing global supply panic", correct: true },
      { id: 'c', label: "Japan found immediate alternatives" },
      { id: 'd', label: "Other countries increased production within weeks" }
    ],
    explanation: "Neodymium prices rose from ~$40/kg to over $500/kg. The embargo exposed total dependency on Chinese processing and triggered years of investment in alternative supply chains."
  },
  {
    scenario: "The US Geological Survey tracks strategic mineral stockpiles maintained by the National Defense Stockpile.",
    question: "Why do nations maintain strategic mineral reserves?",
    options: [
      { id: 'a', label: "To speculate on commodity prices" },
      { id: 'b', label: "To buffer against supply disruptions during geopolitical crises", correct: true },
      { id: 'c', label: "To prevent domestic mining" },
      { id: 'd', label: "For environmental protection" }
    ],
    explanation: "Strategic stockpiles provide a buffer of months to years of supply, giving time to develop alternative sources during embargoes, conflicts, or natural disasters affecting supply chains."
  },
  {
    scenario: "About 70% of the world's cobalt comes from the Democratic Republic of Congo, much from artisanal (hand) mining operations.",
    question: "What dual challenge does DRC cobalt concentration create?",
    options: [
      { id: 'a', label: "Only a transportation problem" },
      { id: 'b', label: "Supply chain fragility AND ethical sourcing concerns (child labor, unsafe conditions)", correct: true },
      { id: 'c', label: "Cobalt is too expensive" },
      { id: 'd', label: "DRC has too much cobalt" }
    ],
    explanation: "DRC cobalt concentration creates both geopolitical supply risk and serious ethical concerns including child labor and dangerous artisanal mining, driving the push for cobalt-free battery chemistries."
  },
  {
    scenario: "Urban mining refers to recovering critical minerals from electronic waste (e-waste) rather than traditional mining.",
    question: "Why is e-waste recycling increasingly important for critical minerals?",
    options: [
      { id: 'a', label: "E-waste contains higher concentrations of rare earths than natural ore", correct: true },
      { id: 'b', label: "It is cheaper than all mining" },
      { id: 'c', label: "Governments require it" },
      { id: 'd', label: "It produces no pollution" }
    ],
    explanation: "A ton of circuit boards contains 40-800x more gold than a ton of ore, and significant rare earths. Urban mining reduces both environmental impact and import dependence."
  },
  {
    scenario: "Tesla and other EV manufacturers are developing lithium iron phosphate (LFP) batteries that use no cobalt or nickel.",
    question: "What supply chain advantage does this substitution provide?",
    options: [
      { id: 'a', label: "LFP batteries are lighter" },
      { id: 'b', label: "Eliminates dependence on DRC cobalt and reduces concentration risk", correct: true },
      { id: 'c', label: "Iron is more conductive" },
      { id: 'd', label: "LFP batteries last shorter but are cheaper" }
    ],
    explanation: "By substituting cobalt with abundant iron and phosphate, LFP batteries eliminate the DRC chokepoint entirely. This is a prime example of engineering around supply chain risk."
  },
  {
    scenario: "The 'lithium triangle' of Chile, Argentina, and Bolivia holds about 50% of known lithium reserves, extracted from brine deposits.",
    question: "How does lithium extraction geography differ from rare earth processing?",
    options: [
      { id: 'a', label: "Lithium sources are more geographically distributed than rare earth processing", correct: true },
      { id: 'b', label: "Lithium is only found in one country" },
      { id: 'c', label: "Lithium extraction is fully automated" },
      { id: 'd', label: "They are identical in concentration" }
    ],
    explanation: "While lithium has significant reserves in South America, Australia, and China, rare earth processing is ~90% concentrated in China. Lithium's HHI is lower, though still a concern as demand grows."
  },
  {
    scenario: "Semiconductor-grade neon gas, essential for chip lithography, was ~70% sourced from two Ukrainian companies before 2022.",
    question: "What happened when Russia invaded Ukraine in 2022?",
    options: [
      { id: 'a', label: "Neon supply was unaffected" },
      { id: 'b', label: "Neon prices spiked and chipmakers scrambled for alternative suppliers", correct: true },
      { id: 'c', label: "Chips became neon-free" },
      { id: 'd', label: "Russia supplied replacement neon" }
    ],
    explanation: "The Mariupol neon plants were destroyed in fighting. Neon prices surged 10x. Chipmakers had to qualify new suppliers from China and the US, a process taking 9-18 months."
  },
  {
    scenario: "China's rare earth dominance was built over decades through state-subsidized mining, lax environmental enforcement, and processing investment.",
    question: "Why can't other countries quickly replicate China's rare earth processing capacity?",
    options: [
      { id: 'a', label: "The technology is classified" },
      { id: 'b', label: "Building processing facilities takes 5-10 years, requires permits, and faces 'not in my backyard' opposition", correct: true },
      { id: 'c', label: "Other countries lack rare earth deposits" },
      { id: 'd', label: "China patents all processing methods" }
    ],
    explanation: "New mines take 7-15 years from discovery to production. Processing requires handling radioactive thorium byproducts. Environmental permits, community opposition, and massive capital requirements create long lead times."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F1E8}\u{1F1F3}',
    title: 'China Rare Earth Dominance',
    short: 'One country controls the processing bottleneck for 17 critical elements',
    tagline: 'The 90% chokepoint that controls modern technology',
    description: 'China processes approximately 90% of the world\'s rare earth elements, despite mining only about 60%. This processing dominance — built over decades through state subsidies and environmental trade-offs — creates a single point of failure for industries from defense to clean energy. The 2010 export embargo demonstrated the vulnerability.',
    connection: 'Geographic concentration (HHI > 8000) in processing creates a supply chain chokepoint that amplifies geopolitical leverage far beyond the underlying resource scarcity.',
    howItWorks: 'Rare earth ores are mined globally but sent to China for separation, refining, and alloying due to cost advantages, established infrastructure, and regulatory arbitrage.',
    stats: [
      { value: '60%', label: 'Mining share', icon: '\u26CF' },
      { value: '90%', label: 'Processing share', icon: '\u2699' },
      { value: '2010', label: 'Export embargo', icon: '\u26A0' }
    ],
    examples: ['Neodymium magnets (EVs, wind turbines)', 'Lanthanum (catalysts, optics)', 'Dysprosium (high-temp magnets)', 'Yttrium (LEDs, lasers)'],
    companies: ['Northern Rare Earth', 'China Minmetals', 'Lynas (Australia)', 'MP Materials (US)'],
    futureImpact: 'Western processing capacity is being built but will take 5-10 years to meaningfully reduce Chinese dominance.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F1E8}\u{1F1E9}',
    title: 'DRC Cobalt Supply',
    short: 'Ethical and geopolitical risks in the battery mineral supply chain',
    tagline: 'Where battery technology meets human rights',
    description: 'The Democratic Republic of Congo produces about 70% of global cobalt, essential for lithium-ion batteries. A significant portion comes from artisanal mining with serious labor concerns including child labor. This concentration creates both supply risk and ethical imperatives that are driving cobalt-free battery research.',
    connection: 'Single-country resource concentration combined with governance challenges creates compound risk — supply disruption AND ethical supply chain liability.',
    howItWorks: 'Industrial mines use conventional methods, but artisanal miners dig by hand in dangerous conditions, often including children, to supply middlemen connected to global supply chains.',
    stats: [
      { value: '70%', label: 'Global supply', icon: '\u26CF' },
      { value: 'ASM', label: 'Artisanal mining', icon: '\u{1F6A8}' },
      { value: 'LFP', label: 'Cobalt-free push', icon: '\u{1F50B}' }
    ],
    examples: ['EV batteries (Tesla, BYD)', 'Smartphone batteries', 'Laptop batteries', 'Grid storage'],
    companies: ['Glencore', 'CMOC Group', 'ERG', 'Chemaf'],
    futureImpact: 'LFP and sodium-ion batteries are eliminating cobalt dependence, but high-performance applications still need it.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F538}',
    title: 'Lithium Triangle',
    short: 'The geographic concentration of the EV revolution\'s key ingredient',
    tagline: 'Brine pools vs hard rock — two paths to electrification',
    description: 'Chile, Argentina, and Bolivia hold about 50% of global lithium reserves in vast brine deposits beneath salt flats. Australia leads current production from hard rock (spodumene) mines. As EV demand surges, lithium supply geography will determine which nations control the electrification transition.',
    connection: 'Unlike rare earths, lithium supply is more distributed but demand growth of 20%+/yr threatens to outpace new supply, creating deficit risk regardless of geographic diversity.',
    howItWorks: 'Brine extraction pumps lithium-rich saltwater to evaporation ponds (12-18 months), while hard rock mining crushes spodumene ore and processes it chemically.',
    stats: [
      { value: 'CL/AU', label: 'Production leaders', icon: '\u{1F30E}' },
      { value: 'Brine', label: 'vs hard rock', icon: '\u{1F4A7}' },
      { value: '50%', label: 'Triangle reserves', icon: '\u{1F538}' }
    ],
    examples: ['EV batteries', 'Grid-scale storage', 'Consumer electronics', 'Aerospace'],
    companies: ['Albemarle', 'SQM', 'Pilbara Minerals', 'Ganfeng Lithium'],
    futureImpact: 'Direct lithium extraction (DLE) technology could unlock brines worldwide, reducing geographic concentration.',
    color: '#10B981'
  },
  {
    icon: '\u{1F4A1}',
    title: 'TSMC Neon Dependency',
    short: 'How a gas from Ukraine controls global semiconductor production',
    tagline: 'The invisible input that makes every chip possible',
    description: 'Semiconductor lithography requires ultra-pure neon gas for excimer lasers. Before 2022, approximately 70% of semiconductor-grade neon came from two companies in Mariupol, Ukraine. When Russia invaded, these plants were destroyed, exposing a hidden chokepoint in the global chip supply chain.',
    connection: 'Even minor input materials can create critical chokepoints. Neon is abundant in air but purification to semiconductor grade requires specialized infrastructure that was geographically concentrated.',
    howItWorks: 'Neon is a byproduct of steel production (air separation units). Ukrainian plants purified crude neon from Russian steel mills to semiconductor grade (99.999% pure).',
    stats: [
      { value: '70%', label: 'From Ukraine', icon: '\u{1F1FA}\u{1F1E6}' },
      { value: 'Mariupol', label: 'Production hub', icon: '\u{1F3ED}' },
      { value: '2022', label: 'Supply disruption', icon: '\u{1F4A5}' }
    ],
    examples: ['EUV lithography', 'DUV lithography', 'Chip fabrication', 'Laser systems'],
    companies: ['TSMC', 'Samsung', 'Intel', 'ASML'],
    futureImpact: 'Chipmakers are diversifying neon sourcing and building recycling systems to reduce consumption by 30-50%.',
    color: '#3B82F6'
  }
];

// -----------------------------------------------------------------------------
// MINERAL FLOW DATA for simulation
// -----------------------------------------------------------------------------
interface MineralFlow {
  name: string;
  miningShare: Record<string, number>;
  processingShare: Record<string, number>;
  demandGrowth: number;
  currentSupply: number;
  color: string;
}

const mineralFlows: MineralFlow[] = [
  { name: 'Rare Earths', miningShare: { China: 60, Myanmar: 12, Australia: 8, USA: 14, Other: 6 }, processingShare: { China: 90, Malaysia: 4, Estonia: 2, Japan: 2, Other: 2 }, demandGrowth: 8, currentSupply: 300, color: '#EF4444' },
  { name: 'Cobalt', miningShare: { DRC: 70, Indonesia: 5, Russia: 4, Australia: 3, Other: 18 }, processingShare: { China: 72, Finland: 10, Belgium: 5, Canada: 4, Other: 9 }, demandGrowth: 12, currentSupply: 190, color: '#F59E0B' },
  { name: 'Lithium', miningShare: { Australia: 47, Chile: 24, China: 15, Argentina: 6, Other: 8 }, processingShare: { China: 65, Chile: 15, Argentina: 6, Australia: 5, Other: 9 }, demandGrowth: 20, currentSupply: 130, color: '#10B981' },
  { name: 'Graphite', miningShare: { China: 65, Mozambique: 13, Brazil: 7, Madagascar: 5, Other: 10 }, processingShare: { China: 90, Japan: 3, India: 2, SouthKorea: 2, Other: 3 }, demandGrowth: 15, currentSupply: 1200, color: '#8B5CF6' },
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_CriticalMineralsRenderer: React.FC<ELON_CriticalMineralsRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [demandGrowthRate, setDemandGrowthRate] = useState(10);
  const [selectedMineral, setSelectedMineral] = useState(0);
  const [exportBanActive, setExportBanActive] = useState(false);

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

  // Calculate HHI (Herfindahl-Hirschman Index) for concentration measurement
  const calculateHHI = (shares: Record<string, number>): number => {
    return Object.values(shares).reduce((sum, share) => sum + share * share, 0);
  };

  // Calculate supply deficit timeline based on demand growth
  const calculateDeficitYear = (growthRate: number, currentSupplyKt: number): number => {
    let demand = currentSupplyKt * 0.95;
    let supply = currentSupplyKt;
    let year = 0;
    while (year < 20) {
      demand *= (1 + growthRate / 100);
      supply *= 1.03; // supply grows ~3%/yr with new mines
      if (demand > supply) return year;
      year++;
    }
    return 20;
  };

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
        gameType: 'critical-minerals',
        gameTitle: 'Critical Minerals',
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

  // Current mineral data
  const currentMineral = mineralFlows[selectedMineral];
  const miningHHI = calculateHHI(currentMineral.miningShare);
  const processingHHI = calculateHHI(currentMineral.processingShare);
  const deficitYear = calculateDeficitYear(demandGrowthRate, currentMineral.currentSupply);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.hot})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
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

  // -------------------------------------------------------------------------
  // SUPPLY CHAIN FLOW SVG VISUALIZATION
  // -------------------------------------------------------------------------
  const SupplyChainVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 380;
    const mineral = currentMineral;
    const topMiner = Object.entries(mineral.miningShare).sort((a, b) => b[1] - a[1])[0];
    const topProcessor = Object.entries(mineral.processingShare).sort((a, b) => b[1] - a[1])[0];
    const isChokepoint = topProcessor[1] >= 60;
    const animPulse = isChokepoint ? 'url(#chokepointPulse)' : undefined;

    // Pie chart arc helper
    const pieArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number): string => {
      const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
      const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    };

    // Mining pie data
    const miningEntries = Object.entries(mineral.miningShare).sort((a, b) => b[1] - a[1]);
    const processingEntries = Object.entries(mineral.processingShare).sort((a, b) => b[1] - a[1]);
    const pieColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

    let mAngle = -Math.PI / 2;
    const miningArcs = miningEntries.map((entry, i) => {
      const sweep = (entry[1] / 100) * 2 * Math.PI;
      const startA = mAngle;
      mAngle += sweep;
      return { path: pieArc(75, 100, 35, startA, mAngle), color: pieColors[i % pieColors.length], label: entry[0], pct: entry[1] };
    });

    let pAngle = -Math.PI / 2;
    const processingArcs = processingEntries.map((entry, i) => {
      const sweep = (entry[1] / 100) * 2 * Math.PI;
      const startA = pAngle;
      pAngle += sweep;
      return { path: pieArc(width / 2, 100, 35, startA, pAngle), color: pieColors[i % pieColors.length], label: entry[0], pct: entry[1] };
    });

    // Demand vs supply over time
    const years = Array.from({ length: 21 }, (_, i) => i * 0.5);
    const supplyLine = years.map(y => {
      const s = mineral.currentSupply * Math.pow(1.03, y);
      return exportBanActive && y >= 2 ? s * 0.4 : s;
    });
    const demandLine = years.map(y => mineral.currentSupply * 0.95 * Math.pow(1 + demandGrowthRate / 100, y));
    const allVals = [...supplyLine, ...demandLine];
    const dataMin = Math.min(...allVals) * 0.9;
    const dataMax = Math.max(...allVals);
    const chartX = (y: number) => 40 + (y / 10) * (width - 80);
    const chartY = (v: number) => 340 - ((v - dataMin) / (dataMax - dataMin)) * 200;

    const supplyPoints = years.map((y, i) => `${chartX(y)},${chartY(supplyLine[i])}`).join(' ');
    const demandPath = years.map((y, i) => `${i === 0 ? 'M' : 'L'} ${chartX(y)} ${chartY(demandLine[i])}`).join(' ');

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="flowGradMine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="flowGradProcess" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="flowGradMfg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="supplyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="demandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="chokepointPulse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="bgRadial" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="rgba(245,158,11,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#bgRadial)" />

        {/* Grid lines */}
        <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="140" x2={width - 30} y2="140" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="230" x2={width - 30} y2="230" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          {mineral.name} Supply Chain
        </text>

        {/* Demand vs Supply Chart - rendered first for test ordering */}
        <text x={width / 2} y={252} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
          Supply vs Demand -- {demandGrowthRate}%/yr Growth {exportBanActive ? '(BAN)' : ''}
        </text>

        <g>{/* Chart axes */}
        <line x1="40" y1="260" x2="40" y2="345" stroke={colors.border} strokeWidth="1" />
        <line x1="40" y1="345" x2={width - 40} y2="345" stroke={colors.border} strokeWidth="1" />

        {/* Supply line */}
        <polyline points={supplyPoints} stroke="#10B981" fill="none" strokeWidth="2" />
        {/* Demand line */}
        <path d={demandPath} stroke="#EF4444" fill="none" strokeWidth="2" strokeDasharray={exportBanActive ? "4,2" : "0"} />

        {/* Deficit point marker */}
        {deficitYear < 20 && (
          <g>
            <circle cx={chartX(deficitYear)} cy={chartY(demandLine[deficitYear * 2] || demandLine[demandLine.length - 1])} r="8" fill="#EF4444" stroke="white" strokeWidth="2" filter="url(#nodeGlow)" />
            <text x={chartX(deficitYear) + 18} y={chartY(demandLine[deficitYear * 2] || demandLine[demandLine.length - 1]) + 4} fill="#EF4444" fontSize="11" fontWeight="700">DEFICIT</text>
          </g>
        )}

        </g>
        <g>{/* SUPPLY CHAIN FLOW: Mine -> Process -> Mfg -> End Use */}
        {/* Flow arrows */}
        <line x1="93" y1="55" x2={width / 2 - 44} y2="55" stroke="#F59E0B" strokeWidth="1.5" opacity="0.5" />
        <line x1={width / 2 + 44} y1="55" x2={width - 93} y2="55" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />

        {/* Stage nodes */}
        {/* Mining node */}
        <circle cx={75} cy={55} r="20" fill={colors.bgSecondary} stroke="#F59E0B" strokeWidth="2" />
        <text x={75} y={49} fill="#F59E0B" fontSize="11" fontWeight="700" textAnchor="middle">Mine</text>
        <text x={75} y={65} fill={colors.textMuted} fontSize="11" textAnchor="middle">{topMiner[1]}%</text>

        {/* Processing node */}
        <circle cx={width / 2} cy={55} r="24" fill={isChokepoint ? 'rgba(239,68,68,0.15)' : colors.bgSecondary} stroke={isChokepoint ? '#EF4444' : '#3B82F6'} strokeWidth={isChokepoint ? 3 : 2} />
        <text x={width / 2} y={49} fill={isChokepoint ? '#EF4444' : '#3B82F6'} fontSize="11" fontWeight="700" textAnchor="middle">Process</text>
        <text x={width / 2} y={65} fill={colors.textMuted} fontSize="11" textAnchor="middle">{topProcessor[1]}%</text>
        {isChokepoint && <text x={width / 2} y={86} fill="#EF4444" fontSize="11" fontWeight="600" textAnchor="middle">CHOKEPOINT</text>}

        {/* End use node */}
        <circle cx={width - 75} cy={55} r="20" fill={colors.bgSecondary} stroke="#10B981" strokeWidth="2" />
        <text x={width - 75} y={49} fill="#10B981" fontSize="11" fontWeight="700" textAnchor="middle">Mfg</text>
        <text x={width - 75} y={65} fill={colors.textMuted} fontSize="11" textAnchor="middle">Global</text>

        {/* Mining pie chart */}
        <text x={75} y={100} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">Mining</text>
        {miningArcs.map((arc, i) => (
          <path key={`m${i}`} d={arc.path} fill={arc.color} opacity="0.8" />
        ))}
        <text x={75} y={228} fill={miningHHI > 2500 ? colors.error : colors.success} fontSize="11" fontWeight="700" textAnchor="middle">{miningHHI.toFixed(0)}</text>

        {/* Processing pie chart */}
        <text x={width / 2} y={100} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">Processing</text>
        {processingArcs.map((arc, i) => (
          <path key={`p${i}`} d={arc.path} fill={arc.color} opacity="0.8" />
        ))}
        <text x={width / 2} y={228} fill={processingHHI > 2500 ? colors.error : colors.success} fontSize="11" fontWeight="700" textAnchor="middle">{processingHHI.toFixed(0)}</text>

        {/* Concentration indicator */}
        <rect x={width - 130} y={100} width="100" height="55" rx="8" fill="rgba(255,255,255,0.03)" stroke={colors.border} />
        <text x={width - 80} y={118} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">Concentration</text>
        <text x={width - 80} y={138} fill={processingHHI > 5000 ? '#EF4444' : processingHHI > 2500 ? '#F59E0B' : '#10B981'} fontSize="13" fontWeight="700" textAnchor="middle">
          {processingHHI > 5000 ? 'EXTREME' : processingHHI > 2500 ? 'HIGH' : 'MODERATE'}
        </text>

        </g>
        {/* Chart legend */}
        <line x1="50" y1={height - 25} x2="68" y2={height - 25} stroke="#10B981" strokeWidth="2" />
        <text x={74} y={height - 21} fill={colors.textMuted} fontSize="11">Supply</text>
        <line x1="140" y1={height - 25} x2="158" y2={height - 25} stroke="#EF4444" strokeWidth="2" />
        <text x={164} y={height - 21} fill={colors.textMuted} fontSize="11">Demand</text>

        {/* Axis labels */}
        <text x={width / 2} y={height - 5} fill="#94a3b8" fontSize="11" textAnchor="middle">Years</text>
        <text x={20} y={300} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90 20 300)`}>kt/yr</text>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // EXPORT BAN SVG VISUALIZATION (twist_play)
  // -------------------------------------------------------------------------
  const ExportBanVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const mineral = currentMineral;
    const topProcessor = Object.entries(mineral.processingShare).sort((a, b) => b[1] - a[1])[0];
    const banImpact = topProcessor[1];
    const recoveryYears = banImpact > 80 ? 5 : banImpact > 60 ? 3 : 1;
    const priceMultiplier = banImpact > 80 ? 12 : banImpact > 60 ? 5 : 2;

    // Alternatives capacity ramp and demand pressure
    const altYears = Array.from({ length: 21 }, (_, i) => i * 0.5);
    const altCapacity = altYears.map(y => {
      if (!exportBanActive) {
        // Show demand pressure even without ban: supply grows at 3%/yr, demand at user rate
        const supplyPct = 100 * Math.pow(1.03, y);
        const demandPct = 100 * Math.pow(1 + demandGrowthRate / 100, y);
        return Math.max(0, (supplyPct / demandPct) * 100);
      }
      if (y < 1) return 100 - banImpact;
      return Math.min(100, (100 - banImpact) + (banImpact * (y / recoveryYears) * 0.7));
    });
    const altMin = Math.min(...altCapacity) * 0.9;
    const altMax = Math.max(...altCapacity) * 1.05;
    const altChartX = (y: number) => 50 + (y / 10) * (width - 100);
    const altChartY = (v: number) => 280 - ((v - altMin) / (altMax - altMin)) * 120;
    const altPath = altYears.map((y, i) => `${i === 0 ? 'M' : 'L'} ${altChartX(y)} ${altChartY(altCapacity[i])}`).join(' ');

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="banGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="recoveryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="banGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="140" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Export Ban Scenario — {mineral.name}
        </text>

        {/* Ban impact bar */}
        <text x={width / 2} y={48} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          {topProcessor[0]} controls {banImpact}% of processing
        </text>

        {/* Supply impact visualization */}
        <rect x={50} y={60} width={width - 100} height={20} rx="6" fill={colors.border} />
        <rect x={50} y={60} width={(width - 100) * (exportBanActive ? (100 - banImpact) / 100 : 1)} height={20} rx="6" fill={exportBanActive ? 'url(#banGrad)' : '#10B981'} />
        <text x={width / 2} y={75} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          {exportBanActive ? `${(100 - banImpact)}% supply remaining` : '100% supply available'}
        </text>

        {/* Impact metrics */}
        <rect x={40} y={90} width={(width - 80) / 3 - 5} height={50} rx="8" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.3)" />
        <text x={40 + ((width - 80) / 3 - 5) / 2} y={110} fill="#EF4444" fontSize="16" fontWeight="700" textAnchor="middle">
          {exportBanActive ? `${priceMultiplier}x` : '1x'}
        </text>
        <text x={40 + ((width - 80) / 3 - 5) / 2} y={128} fill={colors.textMuted} fontSize="11" textAnchor="middle">Price Spike</text>

        <rect x={40 + (width - 80) / 3} y={90} width={(width - 80) / 3 - 5} height={50} rx="8" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" />
        <text x={40 + (width - 80) / 3 + ((width - 80) / 3 - 5) / 2} y={110} fill="#F59E0B" fontSize="16" fontWeight="700" textAnchor="middle">
          {exportBanActive ? `${recoveryYears}yr` : '0yr'}
        </text>
        <text x={40 + (width - 80) / 3 + ((width - 80) / 3 - 5) / 2} y={128} fill={colors.textMuted} fontSize="11" textAnchor="middle">Recovery Time</text>

        <rect x={40 + 2 * (width - 80) / 3} y={90} width={(width - 80) / 3 - 5} height={50} rx="8" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.3)" />
        <text x={40 + 2 * (width - 80) / 3 + ((width - 80) / 3 - 5) / 2} y={110} fill="#3B82F6" fontSize="16" fontWeight="700" textAnchor="middle">
          {exportBanActive ? `${banImpact}%` : '0%'}
        </text>
        <text x={40 + 2 * (width - 80) / 3 + ((width - 80) / 3 - 5) / 2} y={128} fill={colors.textMuted} fontSize="11" textAnchor="middle">Supply Lost</text>

        {/* Recovery timeline chart */}
        <text x={width / 2} y={160} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">
          {exportBanActive ? 'Supply Recovery Timeline (% capacity)' : `Supply Adequacy at ${demandGrowthRate}%/yr demand`}
        </text>

        {/* 100% baseline */}
        <line x1="50" y1={altChartY(100)} x2={width - 50} y2={altChartY(100)} stroke="rgba(16,185,129,0.3)" strokeDasharray="4,2" />
        <text x={45} y={altChartY(100) + 3} fill="#10B981" fontSize="11" textAnchor="end">100%</text>

        {/* Chart axes */}
        <line x1="50" y1="170" x2="50" y2="285" stroke={colors.border} strokeWidth="1" />
        <line x1="50" y1="285" x2={width - 50} y2="285" stroke={colors.border} strokeWidth="1" />

        {/* Recovery path */}
        <path d={altPath} stroke={exportBanActive ? 'url(#recoveryGrad)' : '#10B981'} fill="none" strokeWidth="2.5" />

        {/* Recovery point markers */}
        {exportBanActive && (
          <g>
            <circle cx={altChartX(0)} cy={altChartY(altCapacity[0])} r="6" fill="#EF4444" stroke="white" strokeWidth="1.5" filter="url(#banGlow)" />
            <text x={altChartX(0) + 10} y={altChartY(altCapacity[0]) - 5} fill="#EF4444" fontSize="11" fontWeight="600">BAN</text>
            {recoveryYears <= 10 && (
              <g>
                <circle cx={altChartX(recoveryYears)} cy={altChartY(altCapacity[recoveryYears])} r="6" fill="#10B981" stroke="white" strokeWidth="1.5" />
                <text x={altChartX(recoveryYears)} y={altChartY(altCapacity[recoveryYears]) - 10} fill="#10B981" fontSize="11" fontWeight="600" textAnchor="middle">~Recovery</text>
              </g>
            )}
          </g>
        )}

        {/* Legend */}
        <line x1="60" y1={height - 15} x2="80" y2={height - 15} stroke={exportBanActive ? 'url(#recoveryGrad)' : '#10B981'} strokeWidth="2" />
        <text x={88} y={height - 11} fill={colors.textMuted} fontSize="11">Capacity</text>
        <circle cx={160} cy={height - 15} r="4" fill="#EF4444" />
        <text x={170} y={height - 11} fill={colors.textMuted} fontSize="11">Ban Event</text>
        <circle cx={250} cy={height - 15} r="4" fill="#10B981" />
        <text x={260} y={height - 11} fill={colors.textMuted} fontSize="11">Recovery</text>

        <text x={width / 2} y={height - 2} fill="#94a3b8" fontSize="11" textAnchor="middle">Years After Export Ban</text>
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
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u{1F30D}\u{1F517}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Critical Minerals
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;Did you know that <span style={{ color: colors.hot }}>90% of rare earth processing happens in one country</span>? Let&apos;s explore how geographic concentration creates invisible chokepoints in the supply chains that power modern technology.&quot;
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
              &quot;Whoever controls the minerals controls the future. Rare earths are to the 21st century what oil was to the 20th.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Deng Xiaoping, 1992
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
      { id: 'a', text: 'About 30% - spread across several countries' },
      { id: 'b', text: 'About 60% - a majority but not dominant' },
      { id: 'c', text: 'About 90% - near-total dominance of processing' },
      { id: 'd', text: 'About 50% - roughly half the market' },
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
              What percentage of global rare earth element processing occurs in China?
            </h2>

            {/* Static SVG showing the question */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Rare Earth Processing: Who Controls It?</text>

                {/* World simplified */}
                <circle cx="80" cy="90" r="25" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.5" />
                <text x="80" y="87" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">Mining</text>
                <text x="80" y="100" textAnchor="middle" fill={colors.textMuted} fontSize="11">Global</text>

                {/* Arrow */}
                <path d="M 115 90 L 165 90" stroke="url(#predictFlowGrad)" strokeWidth="2" />
                <polygon points="165,85 175,90 165,95" fill="#EF4444" />

                {/* Processing */}
                <circle cx="210" cy="90" r="30" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="2" filter="url(#predictGlow)" />
                <text x="210" y="87" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">Processing</text>
                <text x="210" y="100" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">???%</text>

                {/* Arrow */}
                <path d="M 250 90 L 300 90" stroke="#3B82F6" strokeWidth="2" />
                <polygon points="300,85 310,90 300,95" fill="#3B82F6" />

                {/* End use */}
                <circle cx="340" cy="90" r="25" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.5" />
                <text x="340" y="87" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">End Use</text>
                <text x="340" y="100" textAnchor="middle" fill={colors.textMuted} fontSize="11">Global</text>

                <text x="200" y="150" textAnchor="middle" fill={colors.textSecondary} fontSize="11">One country dominates the middle step.</text>
                <text x="200" y="170" textAnchor="middle" fill={colors.textMuted} fontSize="11">What share of rare earth processing does China control?</text>
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

  // PLAY PHASE - Supply Chain Concentration Visualizer
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Supply Chain Concentration Visualizer
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Critical mineral supply chains are the hidden backbone of modern technology. Geographic concentration creates chokepoints that can be weaponized through export bans, creating cascading failures across industries from defense to clean energy.
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
                <strong style={{ color: colors.textPrimary }}>Critical Minerals</strong> are minerals essential for economic and national security with supply chains vulnerable to disruption due to geographic concentration.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>
                <strong style={{ color: colors.accent }}>HHI (Herfindahl-Hirschman Index)</strong> measures market concentration. HHI above 2,500 indicates high concentration risk.
              </p>
              <p style={{ ...typo.small, color: colors.accent, fontFamily: 'monospace', margin: '0 0 8px 0' }}>
                HHI = s&#x2081;&#xB2; + s&#x2082;&#xB2; + &#x2026; + s&#x2099;&#xB2; (where s = market share %)
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.hot }}>Chokepoint</strong> describes a supply chain node where a single country controls more than 60% of production or processing capacity.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows how minerals flow from mines through processing to manufacturing. Watch how the HHI concentration index changes for different minerals. Adjust the demand growth slider to see when supply deficits emerge.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <SupplyChainVisualization />
              </div>

              {/* Mineral selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Mineral</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {currentMineral.name} (Processing HHI: {processingHHI.toFixed(0)})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {mineralFlows.map((mineral, i) => (
                    <button
                      key={mineral.name}
                      onClick={() => { playSound('click'); setSelectedMineral(i); }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: selectedMineral === i ? `2px solid ${mineral.color}` : `1px solid ${colors.border}`,
                        background: selectedMineral === i ? `${mineral.color}22` : colors.bgSecondary,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        minHeight: '44px',
                      }}
                    >
                      {mineral.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demand growth slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Demand Growth Rate</span>
                  <span style={{ ...typo.small, color: demandGrowthRate > 15 ? colors.hot : colors.accent, fontWeight: 600 }}>
                    {demandGrowthRate}%/yr (Deficit in ~{deficitYear < 20 ? deficitYear : '>20'} years)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={demandGrowthRate}
                  onChange={(e) => setDemandGrowthRate(parseInt(e.target.value))}
                  onInput={(e) => setDemandGrowthRate(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Demand Growth Rate"
                  style={sliderStyle(colors.accent, demandGrowthRate, 5, 20)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>5%/yr</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>12%/yr</span>
                  <span style={{ ...typo.small, color: colors.hot }}>20%/yr</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: miningHHI > 2500 ? colors.error : colors.success }}>{miningHHI.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Mining HHI</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: processingHHI > 2500 ? colors.error : colors.success }}>{processingHHI.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Processing HHI</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: deficitYear < 10 ? colors.hot : colors.warning }}>
                    ~{deficitYear < 20 ? deficitYear : '>20'}yr
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>To Deficit</div>
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
              Understand the Risks
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Geography of Critical Minerals
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right -- China processes approximately 90% of the world\'s rare earth elements, creating an extreme chokepoint.'
                : 'As you observed in the experiment, China processes approximately 90% of rare earth elements -- far more concentrated than most people expect. Your prediction may have underestimated the concentration. This creates a critical vulnerability in global supply chains.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>HHI = Sum of (market share)^2</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The <span style={{ color: colors.accent }}>Herfindahl-Hirschman Index</span> quantifies concentration risk. For rare earth processing with ~90% in China: HHI = 90^2 + small shares = <span style={{ color: colors.hot }}>~8,100</span>. Any HHI above 2,500 signals high concentration. Rare earths are off the charts.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  HHI = 90{'\u00B2'} + 4{'\u00B2'} + 2{'\u00B2'} + 2{'\u00B2'} + 2{'\u00B2'} = <strong>8,124 (Extreme)</strong>
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
                Why Processing Matters More Than Mining
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                China mines ~60% of rare earths but processes ~90%. The processing bottleneck is the true chokepoint because it requires specialized chemical separation facilities, expertise, and regulatory tolerance for hazardous byproducts. Building new processing capacity takes 5-10 years.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Concentration Across Key Minerals
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {mineralFlows.map(mineral => {
                  const pHHI = calculateHHI(mineral.processingShare);
                  return (
                    <div key={mineral.name} style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      borderLeft: `3px solid ${mineral.color}`,
                    }}>
                      <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{mineral.name}</div>
                      <div style={{ ...typo.h3, color: pHHI > 5000 ? colors.error : pHHI > 2500 ? colors.warning : colors.success }}>
                        {pHHI.toFixed(0)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Processing HHI</div>
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
      { id: 'a', text: 'Easy to find alternatives quickly - other countries step in within months' },
      { id: 'b', text: 'No substitutes exist for many applications - 1-5 year supply crisis with 10x+ price spikes' },
      { id: 'c', text: 'Prices rise about 10% - minor disruption at most' },
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
                New Variable: Export Ban Scenario
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              If China imposed a rare earth export ban (as threatened in 2010 and 2019), what would happen?
            </h2>

            {/* Static SVG showing ban concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="banFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                {/* Mining */}
                <circle cx="60" cy="50" r="20" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
                <text x="60" y="47" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">Mining</text>
                <text x="60" y="58" textAnchor="middle" fill={colors.textMuted} fontSize="7">Global</text>
                {/* Arrow to processing */}
                <line x1="85" y1="50" x2="145" y2="50" stroke="#F59E0B" strokeWidth="2" />
                {/* Processing - BLOCKED */}
                <circle cx="180" cy="50" r="28" fill="rgba(239,68,68,0.2)" stroke="#EF4444" strokeWidth="3" />
                <text x="180" y="47" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">CHINA</text>
                <text x="180" y="59" textAnchor="middle" fill="#EF4444" fontSize="11">90% Processing</text>
                {/* X mark over arrow */}
                <line x1="215" y1="42" x2="245" y2="58" stroke="#EF4444" strokeWidth="3" />
                <line x1="215" y1="58" x2="245" y2="42" stroke="#EF4444" strokeWidth="3" />
                <text x="230" y="75" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="700">EXPORT BAN</text>
                {/* End use - starved */}
                <circle cx="320" cy="50" r="20" fill="none" stroke={colors.border} strokeWidth="1.5" strokeDasharray="4,2" />
                <text x="320" y="47" textAnchor="middle" fill={colors.textMuted} fontSize="11">End Use</text>
                <text x="320" y="58" textAnchor="middle" fill={colors.textMuted} fontSize="7">Starved?</text>
                <text x="200" y="105" textAnchor="middle" fill={colors.textMuted} fontSize="11">What happens when the chokepoint closes?</text>
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
                See the Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Export Ban Simulator
  if (phase === 'twist_play') {
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Export Ban Impact Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Toggle the export ban to see how supply chain concentration amplifies disruption
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* SVG Visualization */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <ExportBanVisualization />
              </div>

              {/* Mineral selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Mineral</span>
                  <span style={{ ...typo.small, color: currentMineral.color, fontWeight: 600 }}>{currentMineral.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {mineralFlows.map((mineral, i) => (
                    <button
                      key={mineral.name}
                      onClick={() => { playSound('click'); setSelectedMineral(i); }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: selectedMineral === i ? `2px solid ${mineral.color}` : `1px solid ${colors.border}`,
                        background: selectedMineral === i ? `${mineral.color}22` : colors.bgSecondary,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        minHeight: '44px',
                      }}
                    >
                      {mineral.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export ban toggle */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => { playSound(exportBanActive ? 'click' : 'failure'); setExportBanActive(!exportBanActive); }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${exportBanActive ? colors.error : colors.success}`,
                    background: exportBanActive ? `${colors.error}22` : `${colors.success}11`,
                    color: exportBanActive ? colors.error : colors.success,
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 700,
                    minHeight: '44px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {exportBanActive ? 'EXPORT BAN ACTIVE - Click to Lift' : 'Click to Impose Export Ban'}
                </button>
              </div>

              {/* Demand growth slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Demand Growth Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{demandGrowthRate}%/yr</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={demandGrowthRate}
                  onChange={(e) => setDemandGrowthRate(parseInt(e.target.value))}
                  onInput={(e) => setDemandGrowthRate(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Demand Growth Rate"
                  style={sliderStyle(colors.accent, demandGrowthRate, 5, 20)}
                />
              </div>

              {/* Impact summary */}
              {exportBanActive && (
                <div style={{
                  background: `${colors.error}22`,
                  border: `1px solid ${colors.error}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                    With {Object.entries(currentMineral.processingShare).sort((a, b) => b[1] - a[1])[0][1]}% processing offline:
                  </p>
                  <div style={{ ...typo.h2, color: colors.error }}>
                    Supply Crisis
                  </div>
                  <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                    No quick substitutes for many applications. Recovery requires building new processing facilities: 5-10 years.
                  </p>
                </div>
              )}
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
              Understand Supply Chain Risk
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Hidden Fragility: Supply Chain Concentration
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The 2010 Embargo Lesson</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When China restricted rare earth exports to Japan in 2010, neodymium prices spiked from ~$40/kg to over $500/kg -- a 12x increase. The embargo lasted only weeks, but it took years for prices to normalize. This single event triggered billions in investment in alternative supply chains that are still being built today.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why Alternatives Take So Long</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  New mines require 7-15 years from discovery to production. Processing facilities handle radioactive thorium byproducts, requiring extensive environmental permits and community acceptance. The specialized expertise exists primarily in China, built over decades of state investment.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Strategies for Resilience</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Nations are pursuing four strategies: (1) diversifying supply sources, (2) building domestic processing, (3) developing substitutes and alternative chemistries, and (4) investing in recycling and urban mining. No single strategy is sufficient; all four are needed simultaneously.
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
            paddingTop: '48px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand critical mineral supply chains and concentration risk!' : 'Review the concepts and try again.'}
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
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Critical Minerals
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of supply chain concentration, geopolitical risk, and critical mineral dependency. Each question presents a real-world scenario where geographic concentration determines outcomes. Consider HHI concentration metrics, processing chokepoints, and the time required to build alternative supply chains.
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
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Critical Minerals Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why supply chain concentration creates invisible chokepoints and how geopolitical risks threaten the minerals that power modern technology.
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
                'HHI measures supply chain concentration risk',
                'Processing chokepoints matter more than mining',
                'Export bans cause multi-year supply crises',
                'Diversification, substitution, and recycling build resilience',
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

export default ELON_CriticalMineralsRenderer;
