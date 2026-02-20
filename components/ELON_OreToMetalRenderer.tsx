'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ORE TO METAL - Complete 10-Phase Game (ELON Game #15 of 36)
// Raw ore to refined metal through energy-intensive multi-stage processes
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

interface ELON_OreToMetalRendererProps {
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
    scenario: "A copper mine reports that its ore grade has declined from 1.0% to 0.5% over the past decade.",
    question: "How does this affect the amount of ore that must be processed to produce 1 ton of copper?",
    options: [
      { id: 'a', label: "It doubles from ~100t to ~200t of ore per ton of copper", correct: true },
      { id: 'b', label: "It stays the same — technology compensates" },
      { id: 'c', label: "It increases by 10%" },
      { id: 'd', label: "It decreases because lower-grade ore is softer" }
    ],
    explanation: "At 1.0% grade, ~100t of ore yields 1t Cu. At 0.5%, you need ~200t. The relationship is inverse: halving the grade doubles the ore requirement and associated energy/waste."
  },
  {
    scenario: "A concentrator plant uses massive SAG mills and ball mills to grind copper ore from fist-sized rocks to fine powder (80 microns).",
    question: "What fraction of a mine's total energy consumption typically goes to comminution (crushing and grinding)?",
    options: [
      { id: 'a', label: "About 5-10%" },
      { id: 'b', label: "About 30-50% — comminution dominates energy use", correct: true },
      { id: 'c', label: "About 80-90%" },
      { id: 'd', label: "Less than 1%" }
    ],
    explanation: "Comminution (crushing and grinding) accounts for 30-50% of a mine's total energy consumption. It is the single largest energy cost in mineral processing, consuming about 3% of all electricity generated worldwide."
  },
  {
    scenario: "A gold mine is evaluating two processing routes: heap leaching and conventional flotation-CIL (carbon-in-leach).",
    question: "When is heap leaching preferred over flotation?",
    options: [
      { id: 'a', label: "For high-grade ores that need maximum recovery" },
      { id: 'b', label: "For low-grade ores where lower recovery is acceptable due to lower capital cost", correct: true },
      { id: 'c', label: "When the ore contains sulfide minerals" },
      { id: 'd', label: "When the mine is in a cold climate" }
    ],
    explanation: "Heap leaching has lower capital costs ($3-5k/daily tonne vs $15-30k for CIL) but achieves only 60-75% recovery vs 90-95% for CIL. It is preferred for low-grade ores where the economics don't justify a full plant."
  },
  {
    scenario: "A copper smelter uses flash smelting to convert concentrate (30% Cu) into blister copper (98.5% Cu).",
    question: "What is the key advantage of flash smelting over older reverberatory furnaces?",
    options: [
      { id: 'a', label: "It uses the sulfur in the ore as fuel, making it nearly energy-self-sufficient", correct: true },
      { id: 'b', label: "It produces higher-purity copper" },
      { id: 'c', label: "It is cheaper to build" },
      { id: 'd', label: "It eliminates the need for refining" }
    ],
    explanation: "Flash smelting (developed by Outokumpu) suspends finely ground concentrate in an oxygen-enriched blast. The exothermic oxidation of iron sulfides generates most of the heat needed, reducing external fuel consumption by 50-70%."
  },
  {
    scenario: "An electrorefining tankhouse produces 99.99% pure copper cathodes from 98.5% blister copper anodes.",
    question: "What happens to the impurities like gold and silver during electrorefining?",
    options: [
      { id: 'a', label: "They dissolve in the electrolyte and are lost" },
      { id: 'b', label: "They fall to the bottom as 'anode slime' — a valuable byproduct", correct: true },
      { id: 'c', label: "They plate onto the cathode with the copper" },
      { id: 'd', label: "They evaporate as gas" }
    ],
    explanation: "Noble metals (Au, Ag, Pt, Pd) don't dissolve at the anode potential. They fall as 'anode slime' and are recovered separately. This slime can be worth $500-2000 per tonne of copper produced."
  },
  {
    scenario: "A mine produces 100,000 tonnes of tailings per day. These are pumped to a tailings storage facility (TSF).",
    question: "Why are tailings dams one of the biggest environmental risks in mining?",
    options: [
      { id: 'a', label: "They contain radioactive material" },
      { id: 'b', label: "They store billions of tonnes of chemically-active fine particles behind earthen dams that can fail catastrophically", correct: true },
      { id: 'c', label: "They attract wildlife" },
      { id: 'd', label: "They consume too much land" }
    ],
    explanation: "Tailings dam failures (Brumadinho 2019, Samarco 2015, Mt. Polley 2014) have caused hundreds of deaths and massive environmental damage. The industry is now moving toward dry-stack tailings and paste technology to reduce risk."
  },
  {
    scenario: "A copper concentrator uses about 2-3 cubic meters of water per tonne of ore processed.",
    question: "For a mine processing 100,000 tonnes per day, how much water is needed daily?",
    options: [
      { id: 'a', label: "About 1,000 cubic meters" },
      { id: 'b', label: "About 200,000-300,000 cubic meters — equivalent to a small city's daily supply", correct: true },
      { id: 'c', label: "About 10 cubic meters" },
      { id: 'd', label: "About 5 million cubic meters" }
    ],
    explanation: "At 2-3 m3/t, processing 100,000 t/day requires 200,000-300,000 m3/day. This is why mines in arid regions (Chile, Australia) increasingly use desalinated seawater, sometimes pumped 150km and 3000m uphill."
  },
  {
    scenario: "Global average copper ore grades have declined from ~2% in the 1900s to ~0.6% today.",
    question: "What is the primary consequence for the industry's carbon footprint?",
    options: [
      { id: 'a', label: "No change — mining technology has improved proportionally" },
      { id: 'b', label: "Energy per tonne of metal has roughly tripled, increasing CO2 emissions per unit of production", correct: true },
      { id: 'c', label: "Carbon footprint has decreased due to electrification" },
      { id: 'd', label: "Only transportation costs have increased" }
    ],
    explanation: "Lower grades mean more ore must be moved, crushed, ground, and processed per tonne of metal. Energy intensity scales roughly as 1/grade. This creates a tension: the energy transition needs copper, but producing it generates increasing CO2."
  },
  {
    scenario: "A lithium-ion battery requires approximately 8-12 kg of lithium carbonate equivalent (LCE) per kWh of capacity.",
    question: "What is the main challenge with lithium extraction from spodumene (hard rock) compared to brine?",
    options: [
      { id: 'a', label: "Spodumene doesn't contain lithium" },
      { id: 'b', label: "Hard rock processing requires roasting at 1050C and acid leaching, using 3-5x more energy than brine evaporation", correct: true },
      { id: 'c', label: "Brine produces higher-purity lithium" },
      { id: 'd', label: "Spodumene mining is illegal in most countries" }
    ],
    explanation: "Spodumene processing requires crushing, roasting at 1050C to convert alpha to beta phase, then sulfuric acid leaching. This uses ~15-20 GJ/t LCE vs ~4-5 GJ/t from brine evaporation. However, hard rock has faster production ramp-up (months vs years)."
  },
  {
    scenario: "Nickel laterite ores cover large areas but have grades of only 1-2% Ni. They require different processing than nickel sulfide ores.",
    question: "Why can't laterite ores be concentrated by flotation like sulfide ores?",
    options: [
      { id: 'a', label: "They are too hard to grind" },
      { id: 'b', label: "The nickel is chemically bound in oxide/silicate minerals that don't respond to conventional flotation", correct: true },
      { id: 'c', label: "Flotation chemicals are too expensive" },
      { id: 'd', label: "Laterite ores are always found underwater" }
    ],
    explanation: "In laterites, nickel substitutes into the crystal structure of oxide and silicate minerals (goethite, limonite, garnierite). Unlike sulfides, these minerals are hydrophilic and cannot be separated by froth flotation, requiring energy-intensive HPAL or smelting."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u26CF\uFE0F',
    title: 'Escondida Copper Mine',
    short: 'The largest copper mine on Earth processes 1.2 million tonnes of ore daily',
    tagline: 'Where 5% of global copper begins its journey',
    description: 'BHP\'s Escondida mine in Chile\'s Atacama Desert is the world\'s largest copper producer. Operating at just 0.6% grade, it moves mountains of rock to extract copper essential for electrical wiring, motors, and the energy transition. The operation uses seawater desalination to supply its massive water needs in one of Earth\'s driest places.',
    connection: 'The ore-to-metal ratio at Escondida illustrates the fundamental challenge: at 0.6% grade, producing 1 million tonnes of copper requires processing ~170 million tonnes of ore annually — a mass balance problem of staggering scale.',
    howItWorks: 'Ore is drilled, blasted, loaded by massive shovels into 400-tonne trucks, crushed, ground in SAG/ball mills, concentrated by flotation to 30% Cu, then shipped to smelters in Japan and China.',
    stats: [
      { value: '1.2Mt/day', label: 'Ore processed', icon: '\u26CF\uFE0F' },
      { value: '0.6%', label: 'Copper grade', icon: '\uD83D\uDCCA' },
      { value: "World's largest", label: 'Copper mine', icon: '\uD83C\uDF0D' }
    ],
    examples: ['SAG mill grinding', 'Flotation concentration', 'Desalination plant', 'Autonomous haul trucks'],
    companies: ['BHP', 'Rio Tinto (partial)', 'JECO (Japan)', 'Mitsubishi'],
    futureImpact: 'Autonomous mining and AI-optimized processing will squeeze more copper from declining grades while reducing energy and water consumption.',
    color: '#F59E0B'
  },
  {
    icon: '\uD83D\uDD73\uFE0F',
    title: 'Bingham Canyon Mine',
    short: 'A century-old open pit visible from space still produces copper',
    tagline: 'The deepest open-pit mine in the world',
    description: 'Rio Tinto\'s Bingham Canyon mine in Utah has been operating for over 150 years, producing more copper than any other mine in history. The pit is 4.5km wide and 1.2km deep — large enough to be seen from the International Space Station. Despite declining grades, it remains economic through massive scale and byproduct credits from gold, silver, and molybdenum.',
    connection: 'Bingham Canyon demonstrates how ore grade decline forces ever-larger operations. Starting at 2%+ Cu in the early 1900s, it now processes 0.5% ore — requiring 4x more rock per tonne of copper than a century ago.',
    howItWorks: 'The pit expands in concentric benches. Ore is trucked to concentrators, while waste rock is placed on dumps. A massive landslide in 2013 moved 70 million cubic meters of rock but caused no injuries due to monitoring systems.',
    stats: [
      { value: '0.5%', label: 'Cu grade', icon: '\uD83D\uDCCA' },
      { value: '150yr', label: 'Mining history', icon: '\u23F3' },
      { value: 'Visible', label: 'From space', icon: '\uD83D\uDE80' }
    ],
    examples: ['Open-pit mining', 'Byproduct recovery', 'Landslide monitoring', 'Copper-gold porphyry'],
    companies: ['Rio Tinto', 'Kennecott (historic)', 'USGS monitoring', 'Caterpillar equipment'],
    futureImpact: 'Underground block caving beneath the open pit will extend the mine\'s life by decades, accessing higher-grade ore below.',
    color: '#6B7280'
  },
  {
    icon: '\u26A1',
    title: 'Tesla Lithium Refinery',
    short: 'Battery-grade lithium hydroxide production for EVs',
    tagline: 'Closing the loop from mine to battery',
    description: 'Tesla\'s lithium refinery in Texas will process spodumene concentrate into battery-grade lithium hydroxide (LiOH). This represents a strategic push to control the critical mineral supply chain. The refinery aims to produce enough LiOH for ~1 million EVs per year, using a proprietary acid-free extraction process that reduces waste and energy use.',
    connection: 'The spodumene-to-LiOH process exemplifies the multi-stage ore-to-metal journey: mining raw rock (1.5% Li2O), concentrating to 6% via dense media separation and flotation, then chemical conversion through roasting and leaching to 99.5% pure LiOH.',
    howItWorks: 'Spodumene concentrate is calcined at 1050C to convert crystal structure, then mixed with sulfuric acid at 250C, water-leached, purified through multiple precipitation and ion exchange steps, and crystallized as battery-grade LiOH monohydrate.',
    stats: [
      { value: 'Battery grade', label: 'LiOH purity', icon: '\uD83D\uDD0B' },
      { value: 'Texas', label: 'Refinery location', icon: '\uD83C\uDFED' },
      { value: 'Spodumene', label: 'Feed mineral', icon: '\u26CF\uFE0F' }
    ],
    examples: ['Spodumene roasting', 'Acid leaching', 'Ion exchange purification', 'Crystallization'],
    companies: ['Tesla', 'Albemarle', 'Piedmont Lithium', 'Ganfeng Lithium'],
    futureImpact: 'Direct lithium extraction (DLE) technologies may bypass traditional evaporation and roasting, cutting processing time from 18 months to hours.',
    color: '#10B981'
  },
  {
    icon: '\uD83C\uDDF7\uD83C\uDDFA',
    title: 'Norilsk Nickel',
    short: 'The world\'s largest nickel and palladium producer in extreme Siberia',
    tagline: 'Critical metals from the edge of the habitable world',
    description: 'Nornickel operates the world\'s largest nickel-copper-palladium mining and smelting complex above the Arctic Circle in Siberia. It produces ~40% of global palladium (essential for catalytic converters) and ~15% of nickel (critical for EV batteries). The extreme environment (-50C winters) and Soviet-era infrastructure create unique challenges.',
    connection: 'Norilsk\'s sulfide ores allow flotation concentration, unlike laterite nickel deposits. The high-grade massive sulfide lenses (3-5% Ni) demonstrate how geology determines processing route and economics.',
    howItWorks: 'Underground mining extracts massive sulfide ore, concentrated by flotation, then smelted in flash furnaces. The matte is processed through converting, slow cooling (to segregate PGMs), and electrorefining to produce separate Ni, Cu, Co, and PGM products.',
    stats: [
      { value: '40%', label: 'Global Pd supply', icon: '\uD83C\uDF0D' },
      { value: 'Extreme', label: 'Environment (-50C)', icon: '\u2744\uFE0F' },
      { value: 'Geopolitical', label: 'Supply risk', icon: '\u26A0\uFE0F' }
    ],
    examples: ['Sulfide flotation', 'Flash smelting', 'PGM recovery', 'Arctic mining'],
    companies: ['Nornickel', 'Russian government', 'BASF (offtake)', 'Johnson Matthey'],
    futureImpact: 'Geopolitical tensions and ESG concerns are driving Western automakers to seek alternative PGM and nickel sources, accelerating Indonesian laterite development.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_OreToMetalRenderer: React.FC<ELON_OreToMetalRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state — ore grade slider
  const [oreGrade, setOreGrade] = useState(0.8); // percent Cu

  // Twist phase — bioleaching vs smelting
  const [bioleachProgress, setBioleachProgress] = useState(30); // percent completion timeline

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

  // Ore processing calculations
  const calculateOreRequired = (grade: number) => {
    // tonnes of ore per tonne of copper (with ~85% recovery)
    return 100 / (grade * 0.85);
  };

  const calculateEnergyPerTonne = (grade: number) => {
    // GJ per tonne of copper — increases as grade declines
    // Base: ~30 GJ/t at 2% grade, scales roughly as 1/grade
    return 30 * (2 / grade);
  };

  const calculateWasteRatio = (grade: number) => {
    // tonnes waste per tonne of copper
    return (100 / grade) - 1;
  };

  const calculateCostPerTonne = (grade: number) => {
    // USD/t copper — base $3000 at 2% grade
    return 3000 * Math.pow(2 / grade, 0.7);
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
        gameType: 'ore-to-metal',
        gameTitle: 'Ore to Metal',
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

  // Current simulation values
  const oreRequired = calculateOreRequired(oreGrade);
  const energyPerTonne = calculateEnergyPerTonne(oreGrade);
  const wasteRatio = calculateWasteRatio(oreGrade);
  const costPerTonne = calculateCostPerTonne(oreGrade);

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
  // ORE PROCESSING SVG VISUALIZATION
  // Process flow: ore -> crushing -> grinding -> flotation -> smelting -> refining -> pure metal
  // -------------------------------------------------------------------------
  const OreProcessVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 380;
    const gradeNorm = (oreGrade - 0.2) / 1.8; // 0 to 1
    const massAtCrush = 100 / oreGrade; // tonnes ore per tonne Cu
    const massAtConc = massAtCrush * 0.03; // concentrate is ~3% of ore mass
    const massAtSmelt = massAtConc * 0.5;
    const massAtRefine = 1.0; // 1 tonne copper

    // Widths proportional to mass flow (log scale for visibility)
    const flowWidths = [
      Math.min(120, 20 + Math.log10(massAtCrush) * 30),   // ore
      Math.min(100, 18 + Math.log10(massAtCrush * 0.8) * 28), // crushed
      Math.min(80, 16 + Math.log10(massAtCrush * 0.6) * 25),  // ground
      Math.min(40, 10 + Math.log10(massAtConc + 1) * 15),     // concentrate
      Math.min(25, 8 + Math.log10(massAtSmelt + 1) * 12),     // matte
      8,                                                        // pure metal
    ];

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="oreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#a8a29e" />
          </linearGradient>
          <linearGradient id="crushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="concGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="smeltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="energyArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
          </linearGradient>
          <filter id="oreGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="metalShine" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="heatGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <g data-layer="grid">
          <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1="30" y1="190" x2={width - 30} y2="190" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1="30" y1="260" x2={width - 30} y2="260" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
          <line x1={width / 2} y1="30" x2={width / 2} y2="340" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        </g>

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Ore Processing Flow at {oreGrade.toFixed(1)}% Grade
        </text>

        {/* Processing stages group */}
        <g data-layer="stages">
        {/* Stage 1: Raw Ore */}
        <rect x={(width - flowWidths[0]) / 2} y={38} width={flowWidths[0]} height={20} rx="3" fill="url(#oreGrad)" filter="url(#oreGlow)" />
        <text x={width / 2} y={52} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          Raw Ore: {massAtCrush.toFixed(0)}t
        </text>
        <text x={width / 2} y={68} fill="#94a3b8" fontSize="11" textAnchor="middle">CRUSHING</text>

        {/* Connecting flow line 1 */}
        <line x1={width / 2} y1={60} x2={width / 2} y2={78} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Stage 2: Crushed */}
        <rect x={(width - flowWidths[1]) / 2} y={78} width={flowWidths[1]} height={18} rx="3" fill="url(#crushGrad)" />
        <text x={width / 2} y={91} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          Crushed: {(massAtCrush * 0.95).toFixed(0)}t
        </text>
        <text x={width / 2} y={107} fill="#94a3b8" fontSize="11" textAnchor="middle">GRINDING (30-50% energy)</text>

        {/* Connecting flow line 2 */}
        <line x1={width / 2} y1={98} x2={width / 2} y2={116} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Stage 3: Ground */}
        <rect x={(width - flowWidths[2]) / 2} y={116} width={flowWidths[2]} height={16} rx="3" fill="url(#crushGrad)" opacity="0.7" />
        <text x={width / 2} y={128} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          Ground to 80um
        </text>
        <text x={width / 2} y={144} fill="#94a3b8" fontSize="11" textAnchor="middle">FLOTATION / LEACHING</text>

        {/* Connecting flow line 3 */}
        <line x1={width / 2} y1={136} x2={width / 2} y2={154} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Waste/tailings arrows */}
        <line x1={(width + flowWidths[2]) / 2 + 5} y1={124} x2={(width + flowWidths[2]) / 2 + 40} y2={140} stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
        <text x={(width + flowWidths[2]) / 2 + 45} y={145} fill="#94a3b8" fontSize="11" opacity="0.5">Tailings: {(massAtCrush * 0.97).toFixed(0)}t</text>

        {/* Stage 4: Concentrate */}
        <rect x={(width - flowWidths[3]) / 2} y={154} width={flowWidths[3]} height={16} rx="3" fill="url(#concGrad)" />
        <text x={width / 2} y={166} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          Conc: {massAtConc.toFixed(1)}t (30% Cu)
        </text>
        <text x={width / 2} y={182} fill="#94a3b8" fontSize="11" textAnchor="middle">SMELTING (1250C)</text>

        {/* Energy arrows — heat glow effect */}
        <circle cx={width / 2 - 50} cy={192} r="5" fill="#ef4444" opacity="0.6" filter="url(#heatGlow)" />
        <circle cx={width / 2 + 50} cy={192} r="5" fill="#ef4444" opacity="0.6" filter="url(#heatGlow)" />

        {/* Connecting flow line 4 */}
        <line x1={width / 2} y1={172} x2={width / 2} y2={200} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Stage 5: Matte/Blister */}
        <rect x={(width - flowWidths[4]) / 2} y={200} width={flowWidths[4]} height={14} rx="3" fill="url(#smeltGrad)" filter="url(#oreGlow)" />
        <text x={width / 2} y={211} fill="white" fontSize="11" fontWeight="600" textAnchor="middle">
          Blister: {massAtSmelt.toFixed(1)}t
        </text>
        <text x={width / 2} y={226} fill="#94a3b8" fontSize="11" textAnchor="middle">ELECTROREFINING</text>

        {/* SO2 emissions arrow */}
        <line x1={(width + flowWidths[4]) / 2 + 5} y1={207} x2={(width + flowWidths[4]) / 2 + 35} y2={195} stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
        <text x={(width + flowWidths[4]) / 2 + 38} y={197} fill="#94a3b8" fontSize="11" opacity="0.5">SO2 to acid</text>

        {/* Connecting flow line 5 */}
        <line x1={width / 2} y1={216} x2={width / 2} y2={238} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Stage 6: Pure Metal */}
        <rect x={(width - flowWidths[5] * 3) / 2} y={238} width={flowWidths[5] * 3} height={16} rx="3" fill="url(#metalGrad)" filter="url(#metalShine)" />
        <text x={width / 2} y={250} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">
          Pure Cu: {massAtRefine.toFixed(1)}t (99.99%)
        </text>

        </g>

        {/* Mass reduction arrow */}
        <g data-layer="indicators">
        <polyline
          points={`30,275 ${width / 2 - 30},275 ${width / 2},268`}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <text x={width / 2} y={285} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          {massAtCrush.toFixed(0)}t ore ➜ {massAtRefine.toFixed(1)}t copper
        </text>

        {/* Energy cost curve (bottom section) */}
        <text x={width / 2} y={305} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Energy: {energyPerTonne.toFixed(0)} GJ/t Cu | Waste: {wasteRatio.toFixed(0)}:1
        </text>

        {/* Grade indicator dot on energy cost curve — uses significant vertical space */}
        <path
          d={`M 40 ${350} Q 100 ${340 - 160 * (1 - gradeNorm)} ${width / 4} ${330 - 180 * (1 - gradeNorm)} T ${width / 2} ${320 - 140 * (1 - gradeNorm)} T ${width * 3 / 4} ${330 - 100 * (1 - gradeNorm)} T ${width - 40} ${340 - 60 * (1 - gradeNorm)}`}
          stroke={colors.warning}
          fill="none"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <circle
          cx={40 + gradeNorm * (width - 80)}
          cy={350 - gradeNorm * 150}
          r="8"
          fill={colors.accent}
          stroke="white"
          strokeWidth="2"
          filter="url(#oreGlow)"
        />
        </g>

        {/* Cost label */}
        <rect x={width / 2 - 100} y={height - 38} width="200" height="20" rx="4" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.3)" />
        <text x={width / 2} y={height - 24} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Cost: ${costPerTonne.toFixed(0)}/t Cu at {oreGrade.toFixed(1)}% grade
        </text>

        {/* Legend */}
        <g>
          <rect x={30} y={height - 15} width="10" height="10" rx="2" fill="url(#oreGrad)" />
          <text x={44} y={height - 7} fill="#94a3b8" fontSize="11">Ore</text>
          <rect x={80} y={height - 15} width="10" height="10" rx="2" fill="url(#concGrad)" />
          <text x={94} y={height - 7} fill="#94a3b8" fontSize="11">Conc</text>
          <rect x={130} y={height - 15} width="10" height="10" rx="2" fill="url(#smeltGrad)" />
          <text x={144} y={height - 7} fill="#94a3b8" fontSize="11">Smelt</text>
          <rect x={185} y={height - 15} width="10" height="10" rx="2" fill="url(#metalGrad)" />
          <text x={199} y={height - 7} fill="#94a3b8" fontSize="11">Metal</text>
          <circle cx={245} cy={height - 10} r="4" fill={colors.accent} />
          <text x={253} y={height - 7} fill="#94a3b8" fontSize="11">Grade</text>
        </g>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // BIOLEACHING vs SMELTING SVG VISUALIZATION
  // -------------------------------------------------------------------------
  const BioleachVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const progressNorm = bioleachProgress / 100;

    // Smelting: fast (hours), high energy
    const smeltEnergy = 100; // relative
    const smeltTime = 4; // hours
    // Bioleach: slow (months), low energy
    const bioleachEnergy = 10; // relative
    const bioleachTime = 180 * 24; // hours (6 months)

    const blendEnergy = smeltEnergy * (1 - progressNorm) + bioleachEnergy * progressNorm;
    const blendTimeHours = smeltTime * (1 - progressNorm) + bioleachTime * progressNorm;
    const blendTimeDays = blendTimeHours / 24;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="smeltBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="bioBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="blendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset={`${(1 - progressNorm) * 100}%`} stopColor="#f97316" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="bioGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="30" y1="55" x2={width - 30} y2="55" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="35" x2={width / 2} y2="260" stroke="rgba(255,255,255,0.05)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Smelting vs Bioleaching Tradeoff
        </text>

        {/* Smelting diagram */}
        <g>
          <text x={width / 4} y={48} fill="#ef4444" fontSize="11" fontWeight="600" textAnchor="middle">
            Conventional Smelting
          </text>
          <rect x={width / 4 - 60} y={55} width="120" height="45" rx="6" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1" />
          <text x={width / 4} y={72} fill="#ef4444" fontSize="11" textAnchor="middle">1250C Furnace</text>
          <text x={width / 4} y={86} fill="#94a3b8" fontSize="11" textAnchor="middle">~4 hours processing</text>
          {/* Heat particles */}
          <circle cx={width / 4 - 30} cy={65} r="5" fill="#ef4444" opacity="0.4" filter="url(#bioGlow)" />
          <circle cx={width / 4 + 25} cy={75} r="5" fill="#f97316" opacity="0.3" filter="url(#bioGlow)" />
          <circle cx={width / 4 - 10} cy={90} r="5" fill="#ef4444" opacity="0.5" filter="url(#bioGlow)" />
        </g>

        {/* Bioleaching diagram */}
        <g>
          <text x={width * 3 / 4} y={48} fill="#10B981" fontSize="11" fontWeight="600" textAnchor="middle">
            Bioleaching
          </text>
          <rect x={width * 3 / 4 - 60} y={55} width="120" height="45" rx="6" fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth="1" />
          <text x={width * 3 / 4} y={72} fill="#10B981" fontSize="11" textAnchor="middle">Bacteria + Acid</text>
          <text x={width * 3 / 4} y={86} fill="#94a3b8" fontSize="11" textAnchor="middle">~6 months processing</text>
          {/* Bacteria dots */}
          <circle cx={width * 3 / 4 - 25} cy={68} r="5" fill="#10B981" opacity="0.5" filter="url(#bioGlow)" />
          <circle cx={width * 3 / 4 + 20} cy={78} r="5" fill="#059669" opacity="0.4" filter="url(#bioGlow)" />
          <circle cx={width * 3 / 4 - 5} cy={85} r="5" fill="#10B981" opacity="0.3" filter="url(#bioGlow)" />
        </g>

        {/* Energy comparison bars */}
        <text x={width / 2} y={118} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Energy Comparison (relative)
        </text>
        <text x={45} y={140} fill="#ef4444" fontSize="11">Smelt</text>
        <rect x={80} y={130} width={(width - 120) * (smeltEnergy / 100)} height={14} rx="3" fill="url(#smeltBarGrad)" />
        <text x={80 + (width - 120) * (smeltEnergy / 100) + 5} y={141} fill="#ef4444" fontSize="11">100%</text>

        <text x={45} y={160} fill="#10B981" fontSize="11">Bio</text>
        <rect x={80} y={150} width={(width - 120) * (bioleachEnergy / 100)} height={14} rx="3" fill="url(#bioBarGrad)" />
        <text x={80 + (width - 120) * (bioleachEnergy / 100) + 5} y={161} fill="#10B981" fontSize="11">10%</text>

        {/* Time comparison bars */}
        <text x={width / 2} y={185} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Processing Time
        </text>
        <text x={45} y={205} fill="#ef4444" fontSize="11">Smelt</text>
        <rect x={80} y={195} width={20} height={14} rx="3" fill="url(#smeltBarGrad)" />
        <text x={105} y={206} fill="#ef4444" fontSize="11">4 hrs</text>

        <text x={45} y={225} fill="#10B981" fontSize="11">Bio</text>
        <rect x={80} y={215} width={(width - 120)} height={14} rx="3" fill="url(#bioBarGrad)" />
        <text x={80 + (width - 120) + 5} y={226} fill="#10B981" fontSize="11">6 mo</text>

        {/* Current blend indicator */}
        <text x={width / 2} y={250} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
          Your Mix: {Math.round(blendEnergy)}% energy, {blendTimeDays < 2 ? `${blendTimeHours.toFixed(0)} hrs` : `${blendTimeDays.toFixed(0)} days`}
        </text>

        {/* Blend progress bar */}
        <rect x={50} y={258} width={width - 100} height={12} rx="6" fill={colors.border} />
        <rect x={50} y={258} width={(width - 100) * progressNorm} height={12} rx="6" fill="url(#blendGrad)" />
        <circle
          cx={50 + (width - 100) * progressNorm}
          cy={264}
          r="8"
          fill={progressNorm > 0.5 ? '#10B981' : '#ef4444'}
          stroke="white"
          strokeWidth="2"
          filter="url(#bioGlow)"
        />

        {/* Tradeoff curve — expanded vertical range for visibility */}
        <path
          d={`M 50 ${300} Q ${width / 4} ${280 - progressNorm * 120} ${width / 2} ${240 - progressNorm * 100} T ${width - 50} ${280 - progressNorm * 80}`}
          stroke={colors.warning}
          fill="none"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Legend */}
        <g>
          <rect x={40} y={height - 18} width="10" height="10" rx="2" fill="url(#smeltBarGrad)" />
          <text x={54} y={height - 10} fill="#94a3b8" fontSize="11">Smelting</text>
          <rect x={120} y={height - 18} width="10" height="10" rx="2" fill="url(#bioBarGrad)" />
          <text x={134} y={height - 10} fill="#94a3b8" fontSize="11">Bioleaching</text>
          <circle cx={220} cy={height - 13} r="4" fill={colors.warning} />
          <text x={228} y={height - 10} fill="#94a3b8" fontSize="11">Tradeoff</text>
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
            {'\u26CF\uFE0F\uD83D\uDD25'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Ore to Metal
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            Every copper wire, every steel beam, every lithium battery began as <span style={{ color: colors.accent }}>ordinary rock buried deep in the Earth</span>. The journey from ore to pure metal is one of the most energy-intensive processes in human civilization.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "To make a single penny's worth of copper, we move a ton of rock, consume a bathtub of water, and burn enough energy to power a house for a day. The modern world is built on a hidden mountain of processed earth."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Mining Engineering Principles
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
      { id: 'a', text: 'About 5 tons — copper is relatively concentrated in ore' },
      { id: 'b', text: 'About 50 tons — a truckload of rock per ton of metal' },
      { id: 'c', text: 'About 200 tons — massive amounts of rock must be processed' },
      { id: 'd', text: 'About 1,000 tons — almost incomprehensible scale' },
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
              To produce 1 ton of copper, how much ore must be processed?
            </h2>

            {/* Static SVG showing scale concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictOreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#78716c" />
                    <stop offset="100%" stopColor="#a8a29e" />
                  </linearGradient>
                  <linearGradient id="predictMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">How much ore for 1 tonne of copper?</text>

                {/* Ore mountain */}
                <path d="M 30 160 L 100 50 L 170 80 L 240 40 L 310 70 L 370 160 Z" fill="url(#predictOreGrad)" opacity="0.6" />
                <text x="200" y="120" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">??? tonnes of ore</text>
                <text x="200" y="140" textAnchor="middle" fill="#94a3b8" fontSize="11">At typical 0.5% copper grade</text>

                {/* Small copper bar */}
                <rect x="170" y="170" width="60" height="12" rx="3" fill="url(#predictMetalGrad)" filter="url(#predictGlow)" />
                <text x="200" y="195" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">1 tonne pure Cu</text>
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

  // PLAY PHASE - Interactive Ore Processing Simulator
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
              Ore Processing Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> As the world electrifies, demand for copper, lithium, and nickel is surging. But ore grades are declining — meaning more energy, water, and waste per tonne of metal. Understanding this mass balance is critical for the energy transition.
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
                <strong style={{ color: colors.textPrimary }}>Ore Grade</strong> is the percentage of valuable metal in the rock. Copper grades have fallen from 2%+ to below 0.5% over 100 years.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Comminution</strong> is the crushing and grinding of ore to liberate mineral grains — it consumes 30-50% of a mine's total energy.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.warning }}>Tailings</strong> are the waste rock and water left after extracting the valuable minerals — typically 97-99% of the ore mass.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows the mass flow through each processing stage. When ore grade decreases, more rock must be processed because the metal concentration is lower — this leads to higher energy use and more waste. The ore-to-metal ratio is calculated as 100 / (grade x recovery). Observe how the flow widths and cost numbers change as you try adjusting the slider to different grade values.
            </p>

            {/* Side-by-side layout */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <OreProcessVisualization />
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
                  {/* Ore Grade slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Ore Grade</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {oreGrade.toFixed(1)}% Cu
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={oreGrade}
                      onChange={(e) => setOreGrade(parseFloat(e.target.value))}
                      onInput={(e) => setOreGrade(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Ore Grade"
                      style={sliderStyle(colors.accent, oreGrade, 0.2, 2.0)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>0.2% (future)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1.0% (typical)</span>
                      <span style={{ ...typo.small, color: colors.success }}>2.0% (high)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{oreRequired.toFixed(0)}t</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Ore per t Cu</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{energyPerTonne.toFixed(0)} GJ</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Energy per t Cu</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>{wasteRatio.toFixed(0)}:1</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Waste Ratio</div>
                    </div>
                  </div>

                  {/* Additional stats row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>${costPerTonne.toFixed(0)}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Cost per t Cu</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#3B82F6' }}>{(oreRequired * 2.5).toFixed(0)} m{'\u00B3'}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Water per t Cu</div>
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
              Understand the Process
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
              The Scale of Ore Processing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — at typical grades of 0.5%, about 200 tonnes of ore must be crushed, ground, and processed to yield just 1 tonne of copper.'
                : 'As you explored in the experiment, the result confirms that about 200 tonnes of ore are needed. Your observation from the simulator shows that at typical modern grades of 0.5% Cu, with 85% recovery, approximately 200 tonnes of rock must be processed for every tonne of copper produced.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Mass Balance: Ore Required = 100 / (Grade% x Recovery)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The fundamental equation is simple: the <span style={{ color: colors.accent }}>ore grade</span> determines how much rock you need. At <span style={{ color: colors.success }}>0.5% grade with 85% recovery</span>, you need <span style={{ color: colors.warning }}>~235 tonnes of ore per tonne of metal</span>. As grades decline globally, this number keeps growing.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  At 0.5% grade: 100 / (0.5 x 0.85) = <strong>~235 tonnes ore per tonne Cu</strong>
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
                The Processing Stages
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Each stage progressively concentrates the metal: Raw ore (0.5%) is crushed and ground to liberate mineral grains, then concentrated by flotation to 25-30% Cu, smelted to 98.5% blister copper, and finally electrorefined to 99.99% pure cathode copper. At each stage, massive amounts of waste are separated — totaling 99.5% of the original ore mass.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Energy Breakdown by Stage
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Mining', pct: '15-20%', color: '#78716c' },
                  { name: 'Grinding', pct: '30-50%', color: '#b45309' },
                  { name: 'Flotation', pct: '5-10%', color: '#059669' },
                  { name: 'Smelting', pct: '15-20%', color: '#ef4444' },
                  { name: 'Refining', pct: '5-10%', color: '#f59e0b' },
                  { name: 'Support', pct: '5-10%', color: '#94a3b8' },
                ].map(stage => (
                  <div key={stage.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{stage.name}</div>
                    <div style={{ ...typo.h3, color: stage.color }}>{stage.pct}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>of total energy</div>
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
      { id: 'a', text: 'Higher cost — bacteria are expensive to maintain and control' },
      { id: 'b', text: '90% less energy but months instead of hours to process' },
      { id: 'c', text: 'Lower purity — bacteria leave biological contaminants in the metal' },
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
                New Variable: Bioleaching
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Bioleaching uses bacteria instead of smelting to extract copper from ore. The tradeoff is...
            </h2>

            {/* Static SVG showing bioleach concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistSmeltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                  <linearGradient id="twistBioGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Smelting side */}
                <rect x="30" y="30" width="150" height="40" rx="6" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1" />
                <text x="105" y="45" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="600">Smelting: 1250C</text>
                <text x="105" y="62" textAnchor="middle" fill="#94a3b8" fontSize="11">Hours, high energy</text>
                <circle cx="60" cy="45" r="6" fill="#ef4444" opacity="0.5" filter="url(#twistGlow)" />
                <circle cx="140" cy="50" r="6" fill="#f97316" opacity="0.4" filter="url(#twistGlow)" />

                {/* VS */}
                <text x="200" y="55" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="800">VS</text>

                {/* Bioleach side */}
                <rect x="220" y="30" width="150" height="40" rx="6" fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth="1" />
                <text x="295" y="45" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">Bioleaching: 25C</text>
                <text x="295" y="62" textAnchor="middle" fill="#94a3b8" fontSize="11">Months, low energy</text>
                <circle cx="250" cy="48" r="6" fill="#10B981" opacity="0.5" filter="url(#twistGlow)" />
                <circle cx="330" cy="42" r="6" fill="#059669" opacity="0.4" filter="url(#twistGlow)" />

                <text x="200" y="100" textAnchor="middle" fill="#94a3b8" fontSize="11">What is the key tradeoff?</text>
                <text x="200" y="125" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">Bacteria dissolve copper from ore naturally...</text>
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
                See the Tradeoff
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Bioleaching vs Smelting Explorer
  if (phase === 'twist_play') {
    const smeltEnergy = 100;
    const bioleachEnergy = 10;
    const progressNorm = bioleachProgress / 100;
    const blendEnergy = smeltEnergy * (1 - progressNorm) + bioleachEnergy * progressNorm;
    const blendTimeDays = (4 / 24) * (1 - progressNorm) + 180 * progressNorm;

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
              Bioleaching vs Smelting Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Explore the tradeoff between energy use and processing time
            </p>

            {/* Educational panel */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                <strong style={{ color: colors.accent }}>What you're seeing:</strong> The visualization compares conventional smelting at 1250C against bioleaching, where bacteria dissolve copper from ore at ambient temperature over months rather than hours.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> As you shift the slider toward bioleaching, energy consumption drops dramatically (up to 90%) but processing time extends from hours to months — revealing the fundamental speed-vs-efficiency tradeoff in metallurgy.
              </p>
            </div>

            {/* Side-by-side layout */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <BioleachVisualization />
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
                  {/* Bioleach proportion slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Processing Method</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {bioleachProgress}% Bioleaching / {100 - bioleachProgress}% Smelting
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={bioleachProgress}
                      onChange={(e) => setBioleachProgress(parseInt(e.target.value))}
                      onInput={(e) => setBioleachProgress(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Bioleaching proportion"
                      style={sliderStyle(colors.success, bioleachProgress, 0, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>100% Smelting</span>
                      <span style={{ ...typo.small, color: colors.success }}>100% Bioleaching</span>
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
                      <div style={{ ...typo.h3, color: colors.accent }}>{Math.round(blendEnergy)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Relative Energy Use</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>
                        {blendTimeDays < 1 ? `${(blendTimeDays * 24).toFixed(0)} hrs` : `${blendTimeDays.toFixed(0)} days`}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Processing Time</div>
                    </div>
                  </div>

                  {/* Tradeoff insight */}
                  <div style={{
                    background: bioleachProgress > 50 ? `${colors.success}22` : `${colors.warning}22`,
                    border: `1px solid ${bioleachProgress > 50 ? colors.success : colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      The Fundamental Tradeoff:
                    </p>
                    <div style={{
                      ...typo.body,
                      color: bioleachProgress > 50 ? colors.success : colors.warning,
                      fontWeight: 600,
                    }}>
                      {bioleachProgress === 0 && 'Maximum speed (4 hours) but maximum energy consumption'}
                      {bioleachProgress > 0 && bioleachProgress <= 25 && 'Mostly smelting — fast but energy-intensive'}
                      {bioleachProgress > 25 && bioleachProgress <= 50 && 'Mixed approach — moderate time and energy savings'}
                      {bioleachProgress > 50 && bioleachProgress <= 75 && 'Bioleach-dominated — significant energy savings but weeks of processing'}
                      {bioleachProgress > 75 && bioleachProgress < 100 && 'Mostly bioleaching — 90%+ energy reduction but months-long processing'}
                      {bioleachProgress === 100 && '90% less energy but 6+ months — bacteria work slowly but cheaply'}
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
              Understand the Tradeoff
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
              The Bioleaching Revolution
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>How Bioleaching Works</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Acidithiobacillus ferrooxidans and related bacteria oxidize sulfide minerals, dissolving copper into solution. The pregnant leach solution (PLS) is then processed by solvent extraction and electrowinning (SX-EW) to produce pure copper cathodes. This replaces the entire smelting/converting/refining chain.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Speed-Energy Tradeoff</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
                  Smelting: 4 hrs, 100% energy | Bioleach: 6 months, 10% energy
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  {twistPrediction === 'b'
                    ? 'Correct! Bioleaching uses ~90% less energy because bacteria do the chemical work at ambient temperature. But biological reactions are inherently slow — heap leach cycles take 3-18 months vs hours in a smelter.'
                    : 'Bioleaching uses ~90% less energy because bacteria work at ambient temperature. The tradeoff is time: biological reactions take months where pyrometallurgy takes hours. This makes bioleaching ideal for low-grade ores where the economics of smelting don\'t work.'}
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  As ore grades decline, bioleaching becomes increasingly attractive. Low-grade ores that can't economically support the capital cost of a smelter can be piled in heaps and leached over months. About 20% of the world's copper is now produced by SX-EW from leach solutions — and growing.
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
        conceptName="E L O N_ Ore To Metal"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Process Connection:</p>
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
                {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand the ore-to-metal process and its massive energy, water, and waste implications!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Ore to Metal
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of ore processing, comminution energy, flotation vs leaching, electrorefining, tailings management, and water intensity. Consider the mass balance relationships and the impact of declining ore grades as you work through each scenario.
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
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Ore to Metal Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the massive scale of ore processing — how declining grades multiply energy, water, and waste, and why bioleaching offers a revolutionary alternative.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Mass balance: ore required = 100 / (grade x recovery)',
                'Comminution consumes 30-50% of mine energy',
                'Declining grades multiply all environmental impacts',
                'Bioleaching trades speed for 90% energy reduction',
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

export default ELON_OreToMetalRenderer;
