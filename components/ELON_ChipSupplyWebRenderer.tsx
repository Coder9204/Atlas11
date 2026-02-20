'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON CHIP SUPPLY WEB - Complete 10-Phase Game (Game #19 of 36)
// Semiconductor supply chain mapping - the complex global web of suppliers
// required for a single advanced chip
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

interface ChipSupplyWebRendererProps {
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
    scenario: "Apple designs its own M-series chips but does not own any fabrication facilities.",
    question: "What business model does Apple use for its chip operations?",
    options: [
      { id: 'a', label: "Fabless - designs chips but outsources manufacturing", correct: true },
      { id: 'b', label: "IDM - designs and manufactures in-house" },
      { id: 'c', label: "Pure-play foundry - manufactures for others" },
      { id: 'd', label: "OSAT - packaging and testing only" }
    ],
    explanation: "Apple is a fabless chip company. It designs its own processors but relies entirely on TSMC to manufacture them. This model lets Apple focus on design innovation without the $20B+ cost of building fabs."
  },
  {
    scenario: "Synopsys and Cadence together control over 70% of the Electronic Design Automation (EDA) software market.",
    question: "Why is this EDA duopoly a critical chokepoint in the chip supply chain?",
    options: [
      { id: 'a', label: "Every advanced chip design requires EDA tools - no alternatives exist", correct: true },
      { id: 'b', label: "EDA tools are expensive but easily replaceable" },
      { id: 'c', label: "EDA companies also manufacture chips" },
      { id: 'd', label: "EDA tools are only used for simple chips" }
    ],
    explanation: "No advanced chip can be designed without EDA software. Synopsys and Cadence tools are irreplaceable for designing chips below 28nm. US export controls on EDA tools directly impact China's chip ambitions."
  },
  {
    scenario: "A single advanced photomask set for a 3nm chip process costs over $20 million to produce.",
    question: "Why are photomask costs so extreme at advanced nodes?",
    options: [
      { id: 'a', label: "Extreme UV patterns require defect-free masks at atomic precision", correct: true },
      { id: 'b', label: "The materials are rare earth elements" },
      { id: 'c', label: "Only one company makes photomasks" },
      { id: 'd', label: "Photomasks are made of gold" }
    ],
    explanation: "At 3nm, photomask patterns are so fine that a single atom-level defect can ruin the mask. Multi-patterning requires many more masks per layer, and each must be absolutely perfect."
  },
  {
    scenario: "A semiconductor fab maintains ISO Class 1 cleanroom conditions. The air has fewer than 10 particles per cubic meter.",
    question: "Why do chip fabs require such extreme cleanliness?",
    options: [
      { id: 'a', label: "A single dust particle is larger than the circuit features being printed", correct: true },
      { id: 'b', label: "Workers are allergic to dust" },
      { id: 'c', label: "It prevents static electricity" },
      { id: 'd', label: "Chips taste better when clean" }
    ],
    explanation: "At 3nm, transistor features are about 10,000x smaller than a human hair. A single dust particle (~1 micrometer) landing on a wafer would be like dropping a boulder on a city street, destroying thousands of transistors."
  },
  {
    scenario: "ASML's latest High-NA EUV lithography machine costs $350M and weighs 150 tons.",
    question: "What is the typical lead time to receive one of these machines after ordering?",
    options: [
      { id: 'a', label: "12-18 months, with components from hundreds of suppliers globally", correct: true },
      { id: 'b', label: "About 2 weeks with express shipping" },
      { id: 'c', label: "They are available off the shelf" },
      { id: 'd', label: "3-5 years because ASML only makes one per year" }
    ],
    explanation: "Each EUV machine contains over 100,000 parts from hundreds of specialized suppliers. Assembly alone takes months. ASML ships about 50+ EUV systems per year, but demand far outstrips supply."
  },
  {
    scenario: "Intel operates under the Integrated Device Manufacturer (IDM) model, both designing and manufacturing chips.",
    question: "What strategic advantage does the IDM model provide?",
    options: [
      { id: 'a', label: "Tighter integration between design and manufacturing optimization", correct: true },
      { id: 'b', label: "Lower costs than fabless companies" },
      { id: 'c', label: "No dependence on any external suppliers" },
      { id: 'd', label: "Faster time to market than fabless" }
    ],
    explanation: "IDMs can co-optimize chip design with their manufacturing process, potentially achieving better performance. However, they bear enormous capital costs ($20B+ per fab) and must keep fabs utilized."
  },
  {
    scenario: "Taiwan sits in the Pacific Ring of Fire earthquake zone and faces geopolitical tensions across the Taiwan Strait.",
    question: "Why does TSMC's geographic concentration create a global risk?",
    options: [
      { id: 'a', label: "TSMC makes 90% of the world's most advanced chips on a single island", correct: true },
      { id: 'b', label: "Taiwan has expensive electricity" },
      { id: 'c', label: "Shipping from Taiwan is slow" },
      { id: 'd', label: "Taiwan lacks skilled workers" }
    ],
    explanation: "TSMC manufactures over 90% of the world's sub-7nm chips. Any disruption to Taiwan - earthquake, conflict, or blockade - would halt global production of smartphones, AI chips, military systems, and more."
  },
  {
    scenario: "Huawei's Kirin 9000S chip was found to use SMIC's 7nm-class process, despite US export controls.",
    question: "How did SMIC achieve this without access to EUV lithography?",
    options: [
      { id: 'a', label: "Multi-patterning with older DUV lithography - slower and lower yield", correct: true },
      { id: 'b', label: "They secretly obtained EUV machines" },
      { id: 'c', label: "They used a completely different technology" },
      { id: 'd', label: "It was actually manufactured by TSMC" }
    ],
    explanation: "SMIC used multi-patterning DUV lithography, exposing each layer multiple times to achieve finer resolution. This is slower, more expensive, and has lower yields than EUV, but demonstrates resourceful workaround engineering."
  },
  {
    scenario: "The US CHIPS Act allocates $52 billion to boost domestic semiconductor manufacturing.",
    question: "What is the primary strategic goal of this investment?",
    options: [
      { id: 'a', label: "Reduce dependence on Asian fabs for national security and supply resilience", correct: true },
      { id: 'b', label: "Make chips cheaper for consumers" },
      { id: 'c', label: "Replace TSMC entirely" },
      { id: 'd', label: "Develop quantum computers" }
    ],
    explanation: "The CHIPS Act aims to bring advanced manufacturing back to US soil. Intel, TSMC, and Samsung are all building new fabs in Arizona, Ohio, and Texas, though full production won't start until 2025-2027."
  },
  {
    scenario: "Neon gas, critical for DUV lithography, was historically sourced ~50% from Ukraine. Palladium for chip packaging comes largely from Russia.",
    question: "What does this reveal about semiconductor supply chain risks?",
    options: [
      { id: 'a', label: "Even obscure raw materials can become critical chokepoints during geopolitical events", correct: true },
      { id: 'b', label: "Chip companies should stockpile everything" },
      { id: 'c', label: "These materials are easily substituted" },
      { id: 'd', label: "Only advanced chips use these materials" }
    ],
    explanation: "The Russia-Ukraine conflict exposed how deeply semiconductor supply chains depend on geographically concentrated raw materials. Neon prices spiked 10x before alternative sources ramped up."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F1F3}\u{1F1F1}',
    title: 'ASML EUV Monopoly',
    short: 'The single-source bottleneck for all advanced chipmaking',
    tagline: 'One company, one factory, zero substitutes',
    description: 'ASML in Veldhoven, Netherlands is the sole manufacturer of Extreme Ultraviolet lithography machines. No other company on Earth can produce EUV systems. Each machine costs $350M+, weighs 150 tons, contains 100,000+ parts from hundreds of suppliers, and requires multiple 747 cargo planes to ship. Without EUV, no chips below 7nm can be efficiently manufactured.',
    connection: 'The supply chain concept of single points of failure becomes existential when one factory in one city controls the entire future of computing advancement.',
    howItWorks: 'EUV uses 13.5nm wavelength light generated by hitting tin droplets with a high-power laser 50,000 times per second. The resulting plasma emits EUV light focused through multilayer mirrors with atomic-level precision.',
    stats: [
      { value: '$350M', label: 'Per machine cost', icon: '\u{1F4B0}' },
      { value: '1yr+', label: 'Lead time', icon: '\u{231B}' },
      { value: 'Sole', label: 'Source globally', icon: '\u{1F512}' }
    ],
    examples: ['TSMC N3/N2 process', 'Samsung 3nm GAA', 'Intel 18A', 'All future sub-7nm chips'],
    companies: ['ASML', 'Carl Zeiss (optics)', 'Trumpf (laser)', 'TSMC/Samsung/Intel (customers)'],
    futureImpact: 'High-NA EUV (next generation) will push resolution further, but at $400M+ per machine with even longer lead times.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F1F9}\u{1F1FC}',
    title: 'TSMC Geographic Concentration',
    short: 'The world\'s most advanced chip factory on a seismic island',
    tagline: '90% of advanced logic from a single island',
    description: 'Taiwan Semiconductor Manufacturing Company produces over 90% of the world\'s most advanced logic chips (sub-7nm). Nearly all cutting-edge processors for Apple, Nvidia, AMD, and Qualcomm are made on this one island. Taiwan sits in an active seismic zone and faces constant geopolitical pressure, making this concentration an enormous global risk.',
    connection: 'Supply chain concentration risk means that a single geographic disruption could halt production of virtually every advanced electronic device on Earth.',
    howItWorks: 'TSMC operates as a pure-play foundry, manufacturing chips designed by hundreds of fabless companies using the most advanced process nodes available.',
    stats: [
      { value: '90%', label: 'Advanced logic share', icon: '\u{1F4CA}' },
      { value: 'Seismic', label: 'Earthquake zone', icon: '\u{26A0}\u{FE0F}' },
      { value: 'Single', label: 'Island dependency', icon: '\u{1F3DD}\u{FE0F}' }
    ],
    examples: ['Apple M/A-series', 'Nvidia H100/B100', 'AMD Zen 5', 'Qualcomm Snapdragon'],
    companies: ['TSMC', 'Apple', 'Nvidia', 'AMD'],
    futureImpact: 'TSMC is building fabs in Arizona, Japan, and Germany to diversify, but advanced nodes will remain Taiwan-centric for years.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F1FA}\u{1F1F8}',
    title: 'US CHIPS Act',
    short: '$52 billion bet to reshore semiconductor manufacturing',
    tagline: 'Rebuilding domestic chip production capacity',
    description: 'The CHIPS and Science Act provides $52 billion in subsidies and incentives to build semiconductor manufacturing facilities in the United States. Intel is building fabs in Ohio and Arizona. TSMC is constructing advanced fabs in Phoenix. Samsung is expanding in Texas. The goal: reduce dangerous dependence on Asian manufacturing for both economic security and national defense.',
    connection: 'Government intervention in the supply chain aims to create redundancy at the most critical nodes, reducing single-point-of-failure risk.',
    howItWorks: 'Direct subsidies, tax credits, and R&D funding incentivize companies to build fabs domestically despite 30-50% higher costs than Asian locations.',
    stats: [
      { value: '$52B', label: 'Total investment', icon: '\u{1F4B5}' },
      { value: 'Intel/TSMC', label: 'New US fabs', icon: '\u{1F3ED}' },
      { value: 'AZ/OH', label: 'Key locations', icon: '\u{1F4CD}' }
    ],
    examples: ['Intel Ohio mega-site', 'TSMC Arizona fab', 'Samsung Taylor TX', 'Micron Boise expansion'],
    companies: ['Intel', 'TSMC', 'Samsung', 'Micron'],
    futureImpact: 'By 2030, the US aims to produce 20% of the world\'s leading-edge chips domestically, up from near 0% today.',
    color: '#10B981'
  },
  {
    icon: '\u{1F1E8}\u{1F1F3}',
    title: 'Huawei/SMIC Workaround',
    short: 'Achieving advanced chips despite export controls',
    tagline: 'Multi-patterning DUV as an EUV alternative',
    description: 'When US export controls cut Huawei and SMIC off from EUV lithography machines, they found a creative workaround. Using older DUV (Deep Ultraviolet) lithography with multi-patterning techniques, SMIC achieved a 7nm-class process for Huawei\'s Kirin 9000S chip. While slower and lower-yield than EUV, it demonstrated that determined actors can push older technology further than expected.',
    connection: 'Supply chain disruptions force innovation through constraints. Multi-patterning trades throughput and yield for resolution, showing that technology limits are softer than assumed.',
    howItWorks: 'Multi-patterning exposes each wafer layer multiple times with shifted masks, effectively doubling or quadrupling resolution of older 193nm DUV scanners.',
    stats: [
      { value: '7nm', label: 'DUV achievement', icon: '\u{1F52C}' },
      { value: 'Multi', label: 'Patterning passes', icon: '\u{1F504}' },
      { value: 'Export', label: 'Control bypass', icon: '\u{1F6AB}' }
    ],
    examples: ['Huawei Mate 60 Pro', 'Kirin 9000S chip', 'SMIC N+2 process', 'Chinese AI accelerators'],
    companies: ['Huawei', 'SMIC', 'HiSilicon', 'YMTC'],
    futureImpact: 'China is investing $150B+ in domestic chip self-sufficiency, but reaching 3nm without EUV remains an enormous technical challenge.',
    color: '#F59E0B'
  }
];

// Supply chain node data for simulation
interface SupplyNode {
  id: string;
  name: string;
  category: string;
  flag: string;
  x: number;
  y: number;
  description: string;
  substitutes: number; // how many alternative suppliers at advanced nodes
  color: string;
}

interface SupplyEdge {
  from: string;
  to: string;
}

const supplyNodes: SupplyNode[] = [
  { id: 'eda', name: 'EDA Tools', category: 'Design SW', flag: '\u{1F1FA}\u{1F1F8}', x: 60, y: 60, description: 'Synopsys/Cadence duopoly', substitutes: 2, color: '#8B5CF6' },
  { id: 'ipcore', name: 'IP Cores', category: 'Design IP', flag: '\u{1F1EC}\u{1F1E7}', x: 180, y: 40, description: 'ARM architecture licenses', substitutes: 3, color: '#6366F1' },
  { id: 'design', name: 'Chip Design', category: 'Design', flag: '\u{1F1FA}\u{1F1F8}', x: 300, y: 60, description: 'Apple/Nvidia/Qualcomm', substitutes: 10, color: '#3B82F6' },
  { id: 'photomask', name: 'Photomasks', category: 'Materials', flag: '\u{1F1EF}\u{1F1F5}', x: 420, y: 110, description: 'Dai Nippon/Toppan', substitutes: 3, color: '#0EA5E9' },
  { id: 'wafer', name: 'Silicon Wafers', category: 'Materials', flag: '\u{1F1EF}\u{1F1F5}', x: 60, y: 170, description: 'Shin-Etsu/SUMCO', substitutes: 5, color: '#14B8A6' },
  { id: 'chemicals', name: 'Chemicals', category: 'Materials', flag: '\u{1F1EF}\u{1F1F5}', x: 180, y: 200, description: 'Photoresists/gases', substitutes: 4, color: '#10B981' },
  { id: 'euv', name: 'EUV Litho', category: 'Equipment', flag: '\u{1F1F3}\u{1F1F1}', x: 120, y: 120, description: 'ASML only', substitutes: 1, color: '#EF4444' },
  { id: 'etch', name: 'Etch/Dep', category: 'Equipment', flag: '\u{1F1FA}\u{1F1F8}', x: 240, y: 140, description: 'Lam/Applied/TEL', substitutes: 3, color: '#F97316' },
  { id: 'fab', name: 'Fabrication', category: 'Manufacturing', flag: '\u{1F1F9}\u{1F1FC}', x: 340, y: 180, description: 'TSMC/Samsung/Intel', substitutes: 3, color: '#F59E0B' },
  { id: 'osat', name: 'OSAT Packaging', category: 'Assembly', flag: '\u{1F1F9}\u{1F1FC}', x: 460, y: 200, description: 'ASE/Amkor', substitutes: 5, color: '#84CC16' },
  { id: 'test', name: 'Testing', category: 'QA', flag: '\u{1F1FA}\u{1F1F8}', x: 460, y: 60, description: 'Teradyne/Advantest', substitutes: 2, color: '#A855F7' },
  { id: 'neon', name: 'Neon Gas', category: 'Raw Material', flag: '\u{1F1FA}\u{1F1E6}', x: 60, y: 240, description: 'Ukraine/Russia source', substitutes: 3, color: '#EC4899' },
];

const supplyEdges: SupplyEdge[] = [
  { from: 'eda', to: 'design' },
  { from: 'ipcore', to: 'design' },
  { from: 'design', to: 'photomask' },
  { from: 'design', to: 'fab' },
  { from: 'photomask', to: 'fab' },
  { from: 'wafer', to: 'fab' },
  { from: 'chemicals', to: 'fab' },
  { from: 'euv', to: 'fab' },
  { from: 'etch', to: 'fab' },
  { from: 'neon', to: 'euv' },
  { from: 'neon', to: 'fab' },
  { from: 'fab', to: 'osat' },
  { from: 'fab', to: 'test' },
  { from: 'osat', to: 'test' },
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_ChipSupplyWebRenderer: React.FC<ChipSupplyWebRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [techNode, setTechNode] = useState(28);
  const [disruptedNode, setDisruptedNode] = useState<string | null>(null);

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

  // Calculate supply chain concentration based on tech node
  const getConcentration = (node: number): { fabCount: number; label: string; risk: string; color: string } => {
    if (node <= 3) return { fabCount: 1, label: 'TSMC only', risk: 'EXTREME', color: '#EF4444' };
    if (node <= 5) return { fabCount: 2, label: 'TSMC + Samsung', risk: 'VERY HIGH', color: '#F97316' };
    if (node <= 7) return { fabCount: 3, label: 'TSMC + Samsung + Intel', risk: 'HIGH', color: '#F59E0B' };
    if (node <= 14) return { fabCount: 5, label: 'Multiple foundries', risk: 'MODERATE', color: '#10B981' };
    return { fabCount: 15, label: 'Many global fabs', risk: 'LOW', color: '#22C55E' };
  };

  // Calculate which nodes become critical at given tech level
  const getNodeCriticality = (nodeId: string, techNm: number): number => {
    if (nodeId === 'euv' && techNm <= 7) return 1;
    if (nodeId === 'euv' && techNm > 7) return 0;
    if (nodeId === 'fab' && techNm <= 3) return 0.95;
    if (nodeId === 'fab' && techNm <= 7) return 0.7;
    if (nodeId === 'fab') return 0.3;
    if (nodeId === 'eda') return 0.85;
    if (nodeId === 'photomask' && techNm <= 5) return 0.9;
    if (nodeId === 'photomask') return 0.5;
    const n = supplyNodes.find(sn => sn.id === nodeId);
    if (!n) return 0.3;
    return Math.max(0.1, 1 - (n.substitutes / 15));
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
    play: 'Explore',
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
        gameType: 'chip-supply-web',
        gameTitle: 'Chip Supply Web',
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

  const concentration = getConcentration(techNode);

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
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: '0',
            boxSizing: 'border-box' as const,
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

  // Supply Chain Network SVG Visualization
  const SupplyChainVisualization = ({ showDisruption }: { showDisruption?: boolean }) => {
    const width = isMobile ? 360 : 540;
    const height = 380;
    const scaleX = width / 540;
    const scaleY = height / 340;

    const getNodePos = (node: SupplyNode) => ({
      x: node.x * scaleX,
      y: (node.y + 20) * scaleY,
    });

    const isDisrupted = (nodeId: string) => showDisruption && disruptedNode === nodeId;
    const isAffected = (nodeId: string) => {
      if (!showDisruption || !disruptedNode) return false;
      return supplyEdges.some(e => e.from === disruptedNode && e.to === nodeId) ||
             supplyEdges.some(e => e.from === nodeId && e.to === disruptedNode);
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
          <linearGradient id="chainGradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="chainGradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="chainGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id="chainGradYellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="chainGradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="criticalGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="disruptGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <line x1="20" y1="80" x2={width - 20} y2="80" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="20" y1="160" x2={width - 20} y2="160" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="20" y1="240" x2={width - 20} y2="240" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width * 0.25} y1="20" x2={width * 0.25} y2={height - 20} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width * 0.5} y1="20" x2={width * 0.5} y2={height - 20} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width * 0.75} y1="20" x2={width * 0.75} y2={height - 20} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={18} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Semiconductor Supply Chain Network — {techNode}nm Node
        </text>

        {/* Draw edges */}
        {supplyEdges.map((edge, i) => {
          const fromNode = supplyNodes.find(n => n.id === edge.from);
          const toNode = supplyNodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          const from = getNodePos(fromNode);
          const to = getNodePos(toNode);
          const edgeDisrupted = isDisrupted(edge.from) || isDisrupted(edge.to);
          const edgeAffected = isAffected(edge.from) || isAffected(edge.to);
          const criticality = Math.max(
            getNodeCriticality(edge.from, techNode),
            getNodeCriticality(edge.to, techNode)
          );

          // Curved path using quadratic bezier
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - 15;

          return (
            <g key={`edge-${i}`}>
              <polyline
                points={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                stroke={edgeDisrupted ? colors.error : edgeAffected ? colors.warning : `rgba(255,255,255,${0.08 + criticality * 0.15})`}
                fill="none"
                strokeWidth={edgeDisrupted ? 3 : 1 + criticality * 1.5}
                strokeDasharray={edgeDisrupted ? '6,4' : 'none'}
                opacity={edgeDisrupted ? 0.9 : 0.6}
              />
              {/* Flow indicator */}
              <circle r="2" fill={edgeDisrupted ? colors.error : colors.accent} opacity={edgeDisrupted ? 0 : 0.5}>
                <animateMotion
                  dur={`${2 + i * 0.3}s`}
                  repeatCount="indefinite"
                  path={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                />
              </circle>
            </g>
          );
        })}

        {/* Draw nodes */}
        {supplyNodes.map(node => {
          const pos = getNodePos(node);
          const criticality = getNodeCriticality(node.id, techNode);
          const nodeRadius = 8 + criticality * 10;
          const disrupted = isDisrupted(node.id);
          const affected = isAffected(node.id);

          return (
            <g key={node.id}>
              {/* Outer glow for critical nodes */}
              {criticality > 0.7 && !disrupted && (
                <circle
                  cx={pos.x} cy={pos.y}
                  r={nodeRadius + 6}
                  fill="none"
                  stroke={node.color}
                  strokeWidth="1"
                  opacity={0.3}
                />
              )}
              {/* Disruption marker */}
              {disrupted && (
                <>
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={nodeRadius + 12}
                    fill="none"
                    stroke={colors.error}
                    strokeWidth="2"
                    opacity={0.6}
                  />
                  <line x1={pos.x - nodeRadius} y1={pos.y - nodeRadius} x2={pos.x + nodeRadius} y2={pos.y + nodeRadius} stroke={colors.error} strokeWidth="3" opacity="0.8" />
                  <line x1={pos.x + nodeRadius} y1={pos.y - nodeRadius} x2={pos.x - nodeRadius} y2={pos.y + nodeRadius} stroke={colors.error} strokeWidth="3" opacity="0.8" />
                </>
              )}
              {/* Main node circle */}
              <circle
                cx={pos.x} cy={pos.y}
                r={nodeRadius}
                fill={disrupted ? colors.error : affected ? colors.warning : node.color}
                stroke={disrupted ? colors.error : 'rgba(255,255,255,0.2)'}
                strokeWidth={disrupted ? 3 : 1.5}
                opacity={disrupted ? 0.4 : 0.8 + criticality * 0.2}
              />
              {/* Flag label */}
              <text x={pos.x} y={pos.y + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">
                {node.flag}
              </text>
              {/* Name label */}
              <text x={pos.x} y={pos.y + nodeRadius + 12} fill={disrupted ? colors.error : colors.textSecondary} fontSize="11" fontWeight="500" textAnchor="middle">
                {node.name}
              </text>
              {/* Substitutes indicator */}
              {techNode <= 7 && node.substitutes <= 2 && (
                <text x={pos.x + nodeRadius + 2} y={pos.y - nodeRadius + 2} fill={colors.error} fontSize="11" fontWeight="700">
                  !
                </text>
              )}
            </g>
          );
        })}

        {/* Axis label */}
        <text x={width / 2} y={32} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Concentration (suppliers per stage)
        </text>

        {/* Formula */}
        <text x={width - 20} y={46} fill={colors.textMuted} fontSize="11" textAnchor="end">
          Risk = 1 / N_suppliers
        </text>

        {/* Concentration bar at bottom */}
        <rect x={30} y={height - 60} width={width - 60} height={12} rx="6" fill={colors.border} />
        <rect x={30} y={height - 60} width={(width - 60) * (1 - (techNode / 28))} height={12} rx="6" fill="url(#riskGrad)" />
        <circle
          cx={30 + (width - 60) * (1 - (techNode / 28))}
          cy={height - 54}
          r="8"
          fill={concentration.color}
          stroke="white"
          strokeWidth="2"
          filter="url(#nodeGlow)"
        />

        {/* Concentration label */}
        <text x={width / 2} y={height - 30} fill={concentration.color} fontSize="11" fontWeight="600" textAnchor="middle">
          {techNode}nm: {concentration.label} — Risk: {concentration.risk} ({concentration.fabCount} fab{concentration.fabCount > 1 ? 's' : ''})
        </text>

        {/* Legend */}
        <g>
          <circle cx={30} cy={height - 15} r="4" fill="#8B5CF6" />
          <text x={40} y={height - 12} fill="#94a3b8" fontSize="11">Design</text>
          <circle cx={90} cy={height - 15} r="4" fill="#F97316" />
          <text x={100} y={height - 12} fill="#94a3b8" fontSize="11">Equip</text>
          <circle cx={155} cy={height - 15} r="4" fill="#10B981" />
          <text x={165} y={height - 12} fill="#94a3b8" fontSize="11">Materials</text>
          <circle cx={230} cy={height - 15} r="4" fill="#F59E0B" />
          <text x={240} y={height - 12} fill="#94a3b8" fontSize="11">Fab</text>
          <circle cx={275} cy={height - 15} r="4" fill="#EF4444" />
          <text x={285} y={height - 12} fill="#94a3b8" fontSize="11">Critical!</text>
        </g>
      </svg>
    );
  };

  // Disruption SVG for twist phases
  const DisruptionVisualization = () => {
    const width = isMobile ? 360 : 540;
    const height = 300;
    const scaleX = width / 540;

    // Nodes that have zero substitutes when ASML is disrupted
    const affectedChain = ['euv', 'fab', 'osat', 'test'];
    const noSubstitute = ['euv'];

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="disruptGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="cascadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="shockwaveGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.error} fontSize="13" fontWeight="700" textAnchor="middle">
          ASML Disruption Cascade — Single Point of Failure
        </text>

        {/* Grid */}
        <line x1="20" y1="60" x2={width - 20} y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="20" y1="140" x2={width - 20} y2="140" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="20" y1="220" x2={width - 20} y2="220" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Cascade chain visualization */}
        {['ASML\nVeldhoven', 'EUV\nMachines', 'Advanced\nFabs', 'Global\nChips', 'Every\nDevice'].map((label, i) => {
          const x = 60 + i * ((width - 120) / 4);
          const y = 90;
          const isSource = i === 0;
          const isNoSub = i <= 1;

          return (
            <g key={i}>
              {/* Connecting arrow */}
              {i > 0 && (
                <>
                  <path
                    d={`M ${60 + (i - 1) * ((width - 120) / 4) + 28} ${y} L ${x - 28} ${y}`}
                    stroke="url(#cascadeGrad)"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                  <circle r="3" fill={colors.error} opacity="0.7">
                    <animateMotion
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                      path={`M ${60 + (i - 1) * ((width - 120) / 4) + 28} ${y} L ${x - 28} ${y}`}
                    />
                  </circle>
                </>
              )}
              {/* Node */}
              <circle
                cx={x} cy={y} r={isSource ? 26 : 22}
                fill={isSource ? colors.error : isNoSub ? '#F97316' : colors.warning}
                opacity={isSource ? 0.9 : 0.7}
                filter={isSource ? 'url(#shockwaveGlow)' : 'url(#nodeGlow)'}
                stroke={isSource ? '#FF0000' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSource ? 3 : 1}
              />
              {isSource && (
                <>
                  <line x1={x - 14} y1={y - 14} x2={x + 14} y2={y + 14} stroke="white" strokeWidth="3" opacity="0.8" />
                  <line x1={x + 14} y1={y - 14} x2={x - 14} y2={y + 14} stroke="white" strokeWidth="3" opacity="0.8" />
                </>
              )}
              {/* Shockwave rings for source */}
              {isSource && (
                <>
                  <circle cx={x} cy={y} r="34" fill="none" stroke={colors.error} strokeWidth="1" opacity="0.4" />
                  <circle cx={x} cy={y} r="42" fill="none" stroke={colors.error} strokeWidth="0.5" opacity="0.2" />
                </>
              )}
              {/* Label */}
              {label.split('\n').map((line, li) => (
                <text key={li} x={x} y={y + 38 + li * 14} fill={isSource ? colors.error : colors.textSecondary} fontSize="11" fontWeight={isSource ? '700' : '500'} textAnchor="middle">
                  {line}
                </text>
              ))}
              {/* No substitute warning */}
              {isNoSub && (
                <text x={x} y={y - 30} fill={colors.error} fontSize="11" fontWeight="700" textAnchor="middle">
                  ZERO SUBSTITUTES
                </text>
              )}
            </g>
          );
        })}

        {/* Impact stats */}
        <rect x={30} y={180} width={width - 60} height="50" rx="8" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.3)" />
        <text x={width / 2} y={200} fill={colors.error} fontSize="12" fontWeight="700" textAnchor="middle">
          IMPACT: 100% of sub-7nm chip production halted globally
        </text>
        <text x={width / 2} y={218} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          No smartphones, AI chips, data center processors, or military systems
        </text>

        {/* Timeline */}
        <text x={width / 2} y={250} fill={colors.textSecondary} fontSize="11" fontWeight="600" textAnchor="middle">
          Recovery Timeline
        </text>
        {['Day 0', '3 mo', '6 mo', '12 mo', '24+ mo'].map((t, i) => {
          const x = 50 + i * ((width - 100) / 4);
          return (
            <g key={i}>
              <rect x={x - 20 * scaleX} y={260} width={40 * scaleX} height="18" rx="4" fill={i === 0 ? colors.error : i < 3 ? colors.warning : colors.success} opacity={0.3 + i * 0.15} />
              <text x={x} y={273} fill={colors.textSecondary} fontSize="11" fontWeight="500" textAnchor="middle">{t}</text>
            </g>
          );
        })}
        <text x={width / 2} y={295} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Building a new EUV facility from scratch: 5-7 years minimum
        </text>
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
            {'\u{1F310}\u{1F527}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Chip Supply Web
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            A single advanced chip requires <span style={{ color: colors.accent }}>thousands of steps, hundreds of suppliers, and dozens of countries</span> to manufacture. Explore the most complex supply chain ever built.
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
              "The semiconductor supply chain is the most complex, interdependent, and geographically concentrated industrial ecosystem in human history. A single disruption at any critical node can halt global production."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Chris Miller, "Chip War"
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '500px',
            width: '100%',
            marginBottom: '20px',
          }}>
            {[
              { value: '1,000+', label: 'Process steps' },
              { value: '300+', label: 'Unique suppliers' },
              { value: '16+', label: 'Countries involved' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px 8px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{stat.value}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
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
      { id: 'a', text: 'About 20 companies worldwide have this capability' },
      { id: 'b', text: 'About 5 companies compete at the leading edge' },
      { id: 'c', text: 'Only 1 - TSMC is the sole manufacturer at 3nm' },
      { id: 'd', text: 'Over 50 - chip manufacturing is widely distributed' },
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
              How many companies in the world can manufacture chips at the 3nm node?
            </h2>

            {/* Static SVG showing concentration concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 420 }}>
                <defs>
                  <linearGradient id="predictConcentration" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22C55E" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <filter id="predictGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="210" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Chip Manufacturing at Different Nodes</text>

                {/* 28nm - many fabs */}
                <text x="70" y="55" textAnchor="middle" fill="#22C55E" fontSize="11" fontWeight="600">28nm</text>
                {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => (
                  <circle key={`28-${i}`} cx={25 + (i % 5) * 22} cy={68 + Math.floor(i / 5) * 18} r="6" fill="#22C55E" opacity="0.7" filter="url(#predictGlow)" />
                ))}

                {/* 7nm - few fabs */}
                <text x="210" y="55" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">7nm</text>
                {[0,1,2].map(i => (
                  <circle key={`7-${i}`} cx={188 + i * 22} cy={75} r="8" fill="#F59E0B" opacity="0.8" filter="url(#predictGlow)" />
                ))}

                {/* 3nm - ??? */}
                <text x="350" y="55" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600">3nm</text>
                <circle cx="350" cy="80" r="20" fill="rgba(239,68,68,0.2)" stroke={colors.error} strokeWidth="2" strokeDasharray="4,4" />
                <text x="350" y="85" textAnchor="middle" fill={colors.error} fontSize="16" fontWeight="700">?</text>

                {/* Concentration bar */}
                <rect x="40" y="140" width="340" height="14" rx="7" fill="url(#predictConcentration)" opacity="0.6" />
                <text x="60" y="170" fill="#22C55E" fontSize="11">Many fabs</text>
                <text x="350" y="170" textAnchor="end" fill="#EF4444" fontSize="11">Few fabs</text>
                <text x="210" y="190" textAnchor="middle" fill={colors.textMuted} fontSize="11">How concentrated is advanced manufacturing?</text>
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

  // PLAY PHASE - Interactive Supply Chain Visualizer
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
              Supply Chain Network Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              This visualization shows how supply chain concentration varies with process node size.
              Observe how the network changes as you adjust the technology node slider below.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Concentration is defined as the ratio of capable suppliers to total demand. When you decrease the
              node size, fewer fabs can manufacture at that scale, which causes concentration risk to increase.
              The relationship between node size and power density follows: Risk = 1 / N_suppliers.
              Try moving the slider and notice how energy, time, and rate of production shift at each level.
            </p>

            {/* Main visualization — side-by-side on desktop */}
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
                  {/* SVG Visualization */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <SupplyChainVisualization />
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
                  {/* Technology node slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Technology Node</span>
                      <span style={{ ...typo.small, color: concentration.color, fontWeight: 600 }}>{techNode}nm</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="28"
                      step="1"
                      value={techNode}
                      onChange={(e) => setTechNode(parseInt(e.target.value))}
                      onInput={(e) => setTechNode(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Technology node in nanometers"
                      style={sliderStyle(concentration.color, techNode, 2, 28)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>2nm (cutting edge)</span>
                      <span style={{ ...typo.small, color: colors.success }}>28nm (mature)</span>
                    </div>
                  </div>

                  {/* Concentration stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: concentration.color }}>{concentration.fabCount}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Capable Fabs</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: concentration.color }}>{concentration.risk}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Risk Level</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: techNode <= 7 ? colors.error : colors.success }}>
                        {techNode <= 7 ? 'YES' : 'NO'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Requires EUV</div>
                    </div>
                  </div>

                  {/* Key insight */}
                  <div style={{
                    background: `${concentration.color}15`,
                    border: `1px solid ${concentration.color}44`,
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      {techNode <= 3 && (
                        <><strong style={{ color: colors.error }}>Extreme concentration:</strong> Only TSMC can manufacture at this node. A single point of failure for the entire global tech industry.</>
                      )}
                      {techNode > 3 && techNode <= 5 && (
                        <><strong style={{ color: '#F97316' }}>Very high concentration:</strong> Only TSMC and Samsung compete at this node. Both require ASML EUV machines that have zero substitutes.</>
                      )}
                      {techNode > 5 && techNode <= 7 && (
                        <><strong style={{ color: colors.warning }}>High concentration:</strong> Three companies (TSMC, Samsung, Intel) operate at this node. All depend on ASML for EUV lithography.</>
                      )}
                      {techNode > 7 && techNode <= 14 && (
                        <><strong style={{ color: colors.success }}>Moderate distribution:</strong> Multiple foundries can manufacture at this node using DUV lithography. Supply chain risk is manageable.</>
                      )}
                      {techNode > 14 && (
                        <><strong style={{ color: '#22C55E' }}>Low concentration:</strong> Many fabs worldwide produce at 28nm. This mature node has a robust, diversified supply chain with multiple alternatives at every stage.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Single points of failure */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Single Points of Failure at {techNode}nm
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {supplyNodes.filter(n => {
                  const crit = getNodeCriticality(n.id, techNode);
                  return crit > 0.6;
                }).sort((a, b) => getNodeCriticality(b.id, techNode) - getNodeCriticality(a.id, techNode)).map(node => {
                  const crit = getNodeCriticality(node.id, techNode);
                  return (
                    <div key={node.id} style={{
                      background: colors.bgSecondary,
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderLeft: `3px solid ${crit > 0.85 ? colors.error : colors.warning}`,
                    }}>
                      <span style={{ fontSize: '20px' }}>{node.flag}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{node.name}</div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>{node.description}</div>
                      </div>
                      <div style={{
                        ...typo.small,
                        color: crit > 0.85 ? colors.error : colors.warning,
                        fontWeight: 700,
                      }}>
                        {node.substitutes <= 1 ? 'SOLE SOURCE' : `${node.substitutes} suppliers`}
                      </div>
                    </div>
                  );
                })}
                {supplyNodes.filter(n => getNodeCriticality(n.id, techNode) > 0.6).length === 0 && (
                  <p style={{ ...typo.body, color: colors.success, textAlign: 'center' }}>
                    No critical single points of failure at this node!
                  </p>
                )}
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
              Review the Supply Chain
            </button>
          </div>
          {renderNavDots()}
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Answer: Extreme Concentration
            </h2>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>At 3nm, only TSMC can manufacture chips.</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The correct answer is <span style={{ color: colors.accent }}>C: Only 1 company (TSMC)</span>. Samsung has announced 3nm capability but yields remain low and most customers choose TSMC. Intel is racing to catch up with its 18A node but is not yet in volume production.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  28nm: ~15 fabs {'\u2192'} 7nm: 3 fabs {'\u2192'} 3nm: <strong>1 fab (TSMC)</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why So Few?
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Building a leading-edge fab costs $20-30 billion and takes 3-5 years. The equipment (especially EUV lithography from ASML) has 12-18 month lead times. Process development requires thousands of engineers and years of R&D. Only companies spending $10B+ annually on R&D can stay competitive.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                The Supply Chain Pyramid
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { stage: 'EDA Tools', companies: '2 (Synopsys, Cadence)', color: '#8B5CF6' },
                  { stage: 'EUV Litho', companies: '1 (ASML)', color: '#EF4444' },
                  { stage: 'Adv. Fabs', companies: '1-3 (TSMC+)', color: '#F97316' },
                  { stage: 'Wafers', companies: '5 (Shin-Etsu+)', color: '#14B8A6' },
                  { stage: 'OSAT', companies: '5+ (ASE+)', color: '#84CC16' },
                  { stage: 'Mature Fabs', companies: '15+ global', color: '#22C55E' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.small, color: item.color, fontWeight: 600 }}>{item.stage}</div>
                    <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>{item.companies}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Key Insight
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                As technology advances to smaller nodes, the supply chain becomes exponentially more concentrated. This creates a fragile web where single points of failure can disrupt the entire global technology ecosystem. What happens when one of those single points fails?
              </p>
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
      { id: 'a', text: 'Other companies could substitute EUV machines within months' },
      { id: 'b', text: 'No advanced chips could be manufactured globally - zero substitutes exist' },
      { id: 'c', text: 'Only minor delays - companies would use older DUV lithography' },
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
                New Variable: Single Point of Failure Removal
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              If ASML's single EUV factory in Veldhoven, Netherlands was disrupted, what happens to global chip production?
            </h2>

            {/* Static SVG showing ASML as single point */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 420 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 420 }}>
                <defs>
                  <filter id="twistPredictGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* ASML node */}
                <circle cx="210" cy="55" r="30" fill="rgba(239,68,68,0.2)" stroke={colors.error} strokeWidth="3" filter="url(#twistPredictGlow)" />
                <text x="210" y="50" textAnchor="middle" fill={colors.error} fontSize="14" fontWeight="700">{'\u{1F1F3}\u{1F1F1}'}</text>
                <text x="210" y="66" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">ASML</text>
                {/* Arrows to fabs */}
                {['TSMC', 'Samsung', 'Intel'].map((name, i) => {
                  const x = 100 + i * 110;
                  return (
                    <g key={name}>
                      <line x1="210" y1="85" x2={x} y2="110" stroke={colors.error} strokeWidth="2" strokeDasharray="4,3" opacity="0.6" />
                      <rect x={x - 35} y="105" width="70" height="25" rx="6" fill="rgba(239,68,68,0.15)" stroke={colors.error} strokeWidth="1" />
                      <text x={x} y="122" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">{name}</text>
                    </g>
                  );
                })}
                <text x="210" y="16" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">SOLE SOURCE - No Substitute Exists</text>
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
                See the Cascade
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Disruption Simulator
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
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Disruption Cascade Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Click a node to disrupt it and see the cascade effect through the supply chain
            </p>

            {/* Main visualization — side-by-side on desktop */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              {/* Left: SVG visualizations */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Disruption Cascade SVG */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', maxHeight: '50vh', overflow: 'hidden' }}>
                    <DisruptionVisualization />
                  </div>

                  {/* Network with disruption overlay */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <SupplyChainVisualization showDisruption={true} />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> This cascade visualization maps how a single disruption at ASML propagates through the entire semiconductor supply chain, halting all advanced chip production worldwide.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you select different nodes to disrupt, observe how the number of affected downstream stages and the severity of impact changes based on that node&apos;s substitutability.</p>
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
                  {/* Interactive disruption selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px', fontWeight: 600 }}>
                      Select a node to disrupt:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {supplyNodes.filter(n => ['euv', 'fab', 'eda', 'photomask', 'wafer', 'neon'].includes(n.id)).map(node => (
                        <button
                          key={node.id}
                          onClick={() => {
                            playSound('click');
                            setDisruptedNode(disruptedNode === node.id ? null : node.id);
                          }}
                          style={{
                            background: disruptedNode === node.id ? `${colors.error}33` : colors.bgSecondary,
                            border: `2px solid ${disruptedNode === node.id ? colors.error : colors.border}`,
                            borderRadius: '8px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            color: disruptedNode === node.id ? colors.error : colors.textSecondary,
                            fontSize: '13px',
                            fontWeight: disruptedNode === node.id ? 700 : 500,
                            minHeight: '44px',
                          }}
                        >
                          {node.flag} {node.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Disruption impact details */}
                  {disruptedNode && (
                    <div style={{
                      background: `${colors.error}15`,
                      border: `1px solid ${colors.error}44`,
                      borderRadius: '12px',
                      padding: '16px',
                    }}>
                      {(() => {
                        const node = supplyNodes.find(n => n.id === disruptedNode);
                        if (!node) return null;
                        const downstream = supplyEdges.filter(e => e.from === disruptedNode).map(e => supplyNodes.find(n => n.id === e.to)?.name).filter(Boolean);
                        return (
                          <>
                            <p style={{ ...typo.body, color: colors.error, fontWeight: 700, marginBottom: '8px' }}>
                              {node.flag} {node.name} Disrupted
                            </p>
                            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                              <strong>Substitutes available:</strong> {node.substitutes <= 1 ? 'NONE - sole source' : `${node.substitutes} (with significant ramp-up time)`}
                            </p>
                            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                              <strong>Directly affected:</strong> {downstream.join(', ') || 'End of chain'}
                            </p>
                            <p style={{ ...typo.small, color: colors.textMuted }}>
                              {disruptedNode === 'euv' && 'ASML is the SOLE manufacturer of EUV lithography. Zero alternatives exist. All sub-7nm chip production would halt globally within months as existing machines break down.'}
                              {disruptedNode === 'fab' && 'TSMC produces 90% of advanced logic chips. Loss would devastate every major tech company and military system worldwide.'}
                              {disruptedNode === 'eda' && 'Without EDA tools, no new chip designs can be completed. The Synopsys/Cadence duopoly means Chinese companies cut off from US EDA cannot design advanced chips.'}
                              {disruptedNode === 'photomask' && 'Photomask production is concentrated in Japan. Each advanced mask set costs $20M+ and takes weeks to produce.'}
                              {disruptedNode === 'wafer' && 'Japan controls 60%+ of silicon wafer production. Shin-Etsu and SUMCO dominate the market for 300mm wafers.'}
                              {disruptedNode === 'neon' && 'Neon gas is essential for DUV lithography. The Russia-Ukraine conflict spiked neon prices 10x before alternative sources ramped.'}
                            </p>
                          </>
                        );
                      })()}
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
              Understand the Vulnerability
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Fragile Web: No Substitutes
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The ASML Problem</h3>
                <p style={{ ...typo.body, color: colors.error, fontFamily: 'monospace', marginBottom: '12px' }}>1 company {'\u2192'} 1 factory {'\u2192'} 0 substitutes</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  ASML's EUV technology took 30 years and billions of dollars to develop. No other company is even attempting to build EUV machines. If ASML's Veldhoven facility were disrupted, there would be zero alternative sources. Building a replacement would take 5-10 years minimum.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Cascade Failure</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Without new EUV machines, existing fab capacity cannot expand. As machines wear out, production shrinks. Within 2-3 years, advanced chip production would decline catastrophically - affecting AI, smartphones, military systems, medical devices, and autonomous vehicles simultaneously.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The semiconductor supply chain is the most complex and fragile industrial system ever built. Its extreme concentration at critical nodes - EUV lithography, advanced fabrication, EDA tools - creates existential risks for the entire digital economy. This is why governments are spending hundreds of billions to diversify.
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
        conceptName="E L O N_ Chip Supply Web"
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
                      // Auto-advance to next uncompleted app, or go to test if all done
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted !== -1) {
                        setSelectedApp(nextUncompleted);
                      } else if (newCompleted.every(c => c)) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(idx);
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
                {passed ? 'You understand the semiconductor supply chain and its critical vulnerabilities!' : 'Review the supply chain concepts and try again.'}
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
              Knowledge Test: Chip Supply Web
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of semiconductor supply chains, single points of failure, business models, and geopolitical risks to real-world scenarios. Consider the extreme concentration at advanced nodes and the interdependence of global suppliers as you work through each question.
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
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Chip Supply Web Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the most complex supply chain ever built - from EDA design tools to fabrication, and why single points of failure create existential risks for global technology.
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
                'Advanced chip manufacturing is extremely concentrated',
                'ASML is the sole source for EUV lithography',
                'TSMC makes 90% of the world\'s most advanced chips',
                'Single points of failure can halt global production',
                'Governments are spending billions to diversify supply chains',
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

export default ELON_ChipSupplyWebRenderer;
