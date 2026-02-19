'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// ELON INTERCONNECT QUEUE - Complete 10-Phase Game (#5 of 36)
// The interconnection queue bottleneck — why 2,600GW of projects wait
// while only ~25GW/year get built
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

interface ELON_InterconnectQueueRendererProps {
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
    scenario: "A developer submits a 200MW solar project to the interconnection queue. The grid operator tells them they are position #1,847 in line.",
    question: "What is the first formal study the project must pass before interconnection?",
    options: [
      { id: 'a', label: "Feasibility Study — a preliminary screen of grid impact", correct: true },
      { id: 'b', label: "Environmental Impact Assessment" },
      { id: 'c', label: "Financial Viability Review" },
      { id: 'd', label: "Construction Permit Inspection" }
    ],
    explanation: "The Feasibility Study is the first step in the interconnection process. It evaluates whether the grid can physically accommodate the project at its proposed point of connection, identifying potential issues early."
  },
  {
    scenario: "FERC Order 2023 was issued to reform the interconnection process across the United States. Before the reform, projects waited an average of 5 years.",
    question: "What is the primary mechanism FERC Order 2023 uses to speed up the queue?",
    options: [
      { id: 'a', label: "Cluster-based study approach instead of serial, first-come-first-served", correct: true },
      { id: 'b', label: "Eliminating all environmental reviews" },
      { id: 'c', label: "Requiring projects to self-fund all grid upgrades" },
      { id: 'd', label: "Limiting queue entry to government projects only" }
    ],
    explanation: "FERC Order 2023 shifts from serial, first-come-first-served studies to a cluster-based approach. By studying groups of nearby projects together, grid operators can evaluate cumulative impacts once rather than repeating similar analysis for each project."
  },
  {
    scenario: "A wind farm developer receives results from their System Impact Study showing $45 million in required network upgrades — mostly a new transmission line segment.",
    question: "Who typically bears the cost of these network upgrades?",
    options: [
      { id: 'a', label: "The interconnecting generator, initially, with some costs later socialized", correct: true },
      { id: 'b', label: "The federal government covers all costs" },
      { id: 'c', label: "Existing ratepayers pay 100% automatically" },
      { id: 'd', label: "No one — upgrades are optional" }
    ],
    explanation: "Under most rules, the interconnecting generator funds network upgrades upfront. Some costs may later be refunded or shared through regional cost allocation. This is a major barrier — upgrade costs can exceed the project's entire budget."
  },
  {
    scenario: "In MISO's interconnection queue, approximately 80% of projects that enter the queue ultimately withdraw before completing the process.",
    question: "What is the primary reason so many projects drop out?",
    options: [
      { id: 'a', label: "Speculative entries and unexpectedly high network upgrade costs", correct: true },
      { id: 'b', label: "Projects find better locations in other regions" },
      { id: 'c', label: "Technology becomes obsolete during the wait" },
      { id: 'd', label: "Developers lose their construction permits" }
    ],
    explanation: "Many developers submit speculative applications to 'hold their place' in line. When they finally receive cost estimates showing millions in required network upgrades — often after years of waiting — many find the project uneconomic and withdraw."
  },
  {
    scenario: "A 500MW battery storage project is studying two options: (1) interconnect to the high-voltage transmission grid at 345kV, or (2) connect 'behind the meter' at an existing industrial facility.",
    question: "What is the key advantage of the behind-the-meter approach?",
    options: [
      { id: 'a', label: "Bypasses the interconnection queue entirely", correct: true },
      { id: 'b', label: "Gets a higher electricity price" },
      { id: 'c', label: "Avoids all permitting requirements" },
      { id: 'd', label: "Battery technology works better at lower voltage" }
    ],
    explanation: "Behind-the-meter (BTM) installations connect to the distribution system at an existing customer site, bypassing the lengthy transmission interconnection queue. Tesla Megapack deployments often use this strategy to avoid 3-5 year queue waits."
  },
  {
    scenario: "The UK's grid connection queue has approximately 400GW of projects waiting, while the country's peak electricity demand is only 76GW.",
    question: "What does this 5:1 ratio of queued capacity to peak demand indicate?",
    options: [
      { id: 'a', label: "Massive speculative overbooking — most projects will never be built", correct: true },
      { id: 'b', label: "The UK needs 5x its current grid capacity" },
      { id: 'c', label: "All projects are needed for electrification" },
      { id: 'd', label: "The ratio is normal for any power system" }
    ],
    explanation: "A 5:1 queue-to-demand ratio signals that the queue is clogged with speculative projects. No system needs 5x its peak demand in new generation. This overbooking delays viable projects and wastes grid operator study resources."
  },
  {
    scenario: "CAISO (California's grid operator) reformed its interconnection process from serial study to cluster-based study. Study times dropped from 48 months to 18 months.",
    question: "Why does cluster-based study dramatically reduce timelines?",
    options: [
      { id: 'a', label: "One study covers all projects in an area — avoiding redundant repeated analysis", correct: true },
      { id: 'b', label: "Clusters have fewer environmental requirements" },
      { id: 'c', label: "Smaller projects in clusters need less study" },
      { id: 'd', label: "Cluster studies skip the facilities study phase" }
    ],
    explanation: "In serial study, each project is analyzed individually, often repeating nearly identical grid modeling for nearby projects. Cluster study models all projects in a zone simultaneously, determining cumulative impact once and allocating upgrade costs across the group."
  },
  {
    scenario: "A developer's project has been in the interconnection queue for 4 years. They just received notice that a project ahead of them in the queue has withdrawn.",
    question: "What typically happens to the remaining projects when an earlier-queued project withdraws?",
    options: [
      { id: 'a', label: "Studies may need to be redone — the withdrawal changes grid conditions", correct: true },
      { id: 'b', label: "Everyone moves up one position with no delays" },
      { id: 'c', label: "Nothing changes — each project is independent" },
      { id: 'd', label: "All downstream projects are also cancelled" }
    ],
    explanation: "In serial queue processing, each project's study assumptions depend on earlier-queued projects. When one withdraws, the grid conditions change, often requiring restudies of later projects. This cascading restudy problem is a major reason queues move so slowly."
  },
  {
    scenario: "The Facilities Study is the final interconnection study phase. It produces a detailed engineering plan and cost estimate for physically connecting the project.",
    question: "What does the Facilities Study determine that earlier studies do not?",
    options: [
      { id: 'a', label: "Exact equipment specifications, construction timeline, and binding cost estimates", correct: true },
      { id: 'b', label: "Whether the project should be solar or wind" },
      { id: 'c', label: "The project's electricity sale price" },
      { id: 'd', label: "Environmental mitigation requirements" }
    ],
    explanation: "The Facilities Study produces the detailed engineering design: exact transformer specs, protection equipment, metering, the construction schedule, and a binding cost estimate for interconnection facilities. It is the final step before the Interconnection Agreement."
  },
  {
    scenario: "As of 2024, approximately 2,600GW of energy projects are waiting in U.S. interconnection queues, while only about 25GW per year actually gets built and connected.",
    question: "At the current pace, how long would it take to clear the entire queue?",
    options: [
      { id: 'a', label: "Over 100 years — demonstrating the queue is fundamentally broken", correct: true },
      { id: 'b', label: "About 10 years — a manageable timeline" },
      { id: 'c', label: "About 3 years with reform" },
      { id: 'd', label: "The queue clears itself annually" }
    ],
    explanation: "2,600GW / 25GW per year = 104 years. Even accounting for the ~80% that will withdraw, the remaining 520GW would take over 20 years. This mathematical reality proves the interconnection queue is the single biggest bottleneck in the energy transition."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F4CB}',
    title: 'MISO Interconnection Queue',
    short: 'The largest U.S. grid operator struggles with a massive project backlog',
    tagline: 'Where 171GW of clean energy projects wait in line',
    description: 'MISO (Midcontinent Independent System Operator) manages the grid across 15 U.S. states and one Canadian province. Their interconnection queue has become the defining bottleneck for Midwest wind and solar development. With 171GW of projects waiting and an 80% withdrawal rate, the queue system is overwhelmed by speculative applications that crowd out viable projects.',
    connection: 'The queue throughput problem mirrors any bottleneck system: input rate far exceeds processing capacity, creating an ever-growing backlog that delays everyone.',
    howItWorks: 'Projects submit applications with a deposit, enter a queue position, and proceed through sequential feasibility, system impact, and facilities studies. Each study can take 1-2 years, with total timelines averaging 5 years.',
    stats: [
      { value: '171GW', label: 'Queue backlog', icon: '\u{1F4CA}' },
      { value: '5yr', label: 'Average wait time', icon: '\u{23F3}' },
      { value: '80%', label: 'Withdrawal rate', icon: '\u{1F6AA}' }
    ],
    examples: ['Midwest wind farms', 'Iowa solar projects', 'Illinois battery storage', 'Indiana hybrid facilities'],
    companies: ['MISO', 'Invenergy', 'NextEra Energy', 'Apex Clean Energy'],
    futureImpact: 'MISO Tranche process is breaking the queue into manageable batches with $10B+ in planned transmission upgrades.',
    color: '#3B82F6'
  },
  {
    icon: '\u{26A1}',
    title: 'CAISO Queue Reform',
    short: 'California pioneered cluster-based study to slash wait times',
    tagline: 'From 4-year waits to 18-month fast track',
    description: 'CAISO (California Independent System Operator) was among the first to implement cluster-based interconnection study, grouping nearby projects for simultaneous evaluation. This reform cut average study times from 48 months to 18 months and increased throughput 3x. The cluster approach studies cumulative grid impact once for an entire zone rather than repeating analysis for each individual project.',
    connection: 'Cluster study is the grid equivalent of batch processing vs. serial processing — studying N projects together is far more efficient than studying them one at a time.',
    howItWorks: 'Projects in a geographic zone are grouped into clusters. One comprehensive power flow study evaluates all projects simultaneously, allocating network upgrade costs proportionally across the cluster.',
    stats: [
      { value: '48\u219218mo', label: 'Study time reduction', icon: '\u{1F4C9}' },
      { value: 'cluster', label: 'Study approach', icon: '\u{1F300}' },
      { value: '3x', label: 'Faster throughput', icon: '\u{1F680}' }
    ],
    examples: ['Mojave Desert solar cluster', 'Central Valley wind+storage', 'Tehachapi wind corridor', 'Imperial Valley geothermal'],
    companies: ['CAISO', 'AES Clean Energy', 'Recurrent Energy', 'Terra-Gen'],
    futureImpact: 'CAISO model becoming the national template under FERC Order 2023 for all U.S. grid operators.',
    color: '#10B981'
  },
  {
    icon: '\u{1F1EC}\u{1F1E7}',
    title: 'UK Grid Connection Queue',
    short: 'Britain faces a 400GW queue against 76GW peak demand',
    tagline: 'A 5:1 queue-to-demand ratio signals systemic breakdown',
    description: 'The UK National Grid ESO manages an interconnection queue with approximately 400GW of projects — over 5 times the country peak electricity demand of 76GW. This extreme overbooking means even high-quality, fully-funded projects face decade-long waits. The UK government has launched urgent reforms including a "first-ready, first-connected" approach to prioritize viable projects over speculative ones.',
    connection: 'The UK queue demonstrates what happens when there are no penalties for speculative applications — the system drowns in phantom projects that will never be built.',
    howItWorks: 'Projects apply for a grid connection agreement, enter a queue based on application date, and proceed through assessment milestones. Recent reforms introduce readiness gates that remove stalled projects.',
    stats: [
      { value: '400GW', label: 'Queue backlog', icon: '\u{1F4CA}' },
      { value: '76GW', label: 'Peak demand', icon: '\u{26A1}' },
      { value: '5:1', label: 'Queue-to-demand ratio', icon: '\u{1F4C8}' }
    ],
    examples: ['Scottish offshore wind', 'East Anglia wind farms', 'Welsh solar parks', 'English battery storage'],
    companies: ['National Grid ESO', 'SSE Renewables', 'Orsted', 'ScottishPower'],
    futureImpact: 'UK "first-ready, first-connected" reform could clear 300GW of speculative projects by 2026.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F50B}',
    title: 'Tesla Megapack Strategy',
    short: 'Bypassing the queue with behind-the-meter battery deployments',
    tagline: 'When you cannot wait 5 years, go behind the meter',
    description: 'Tesla Megapack deployments increasingly use a behind-the-meter (BTM) strategy to bypass the interconnection queue entirely. By installing at existing industrial or utility customer sites, Megapack systems connect to the distribution grid without needing transmission-level interconnection studies. At 400MWh per project and $1.2M per unit, Tesla has created a queue-avoidance business model that delivers grid storage years faster than traditional development.',
    connection: 'The BTM bypass strategy shows that when a bottleneck is severe enough, innovators find ways to route around it entirely — a lesson in systems thinking.',
    howItWorks: 'Megapacks install at sites with existing grid connections. The host facility metering is modified to allow charging from and discharging to the grid through the existing point of interconnection.',
    stats: [
      { value: '400MWh', label: 'Per project capacity', icon: '\u{1F50B}' },
      { value: '$1.2M', label: 'Per Megapack unit', icon: '\u{1F4B0}' },
      { value: 'BTM', label: 'Queue bypass option', icon: '\u{1F6E4}\u{FE0F}' }
    ],
    examples: ['Lathrop Megafactory', 'Moss Landing expansion', 'Hornsdale Power Reserve', 'Victorian Big Battery'],
    companies: ['Tesla Energy', 'Vistra Energy', 'AES Corporation', 'Neoen'],
    futureImpact: 'BTM battery deployments could deliver 50GW+ of storage while bypassing transmission queue entirely by 2030.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_InterconnectQueueRenderer: React.FC<ELON_InterconnectQueueRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [approvalRate, setApprovalRate] = useState(24); // months average (2 years)
  const [queueInflow] = useState(300); // GW per year entering queue
  const [withdrawalRate] = useState(80); // percent that withdraw

  // Twist phase - cluster vs serial
  const [clusterSize, setClusterSize] = useState(1); // 1 = serial, up to 20 = large cluster
  const [studyComplexity] = useState(12); // months per study in serial mode

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

  // Calculate queue throughput
  const calculateThroughput = (approvalMonths: number) => {
    // At 42-month average, ~25GW/yr gets through
    // At 6-month fast-track, ~175GW/yr could get through
    return Math.round((25 * 42) / approvalMonths);
  };

  // Calculate years to clear queue
  const calculateYearsToClear = (throughputGW: number) => {
    const viableGW = 2600 * (1 - withdrawalRate / 100); // only non-speculative
    return viableGW / throughputGW;
  };

  // Calculate cluster throughput multiplier
  const calculateClusterMultiplier = (clusterN: number) => {
    // Serial = 1x. Cluster of 10 = ~3.5x. Cluster of 20 = ~4x (diminishing returns)
    if (clusterN <= 1) return 1;
    return Math.min(4, 1 + Math.log2(clusterN) * 0.7);
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
    solar: '#EAB308',
    wind: '#3B82F6',
    storage: '#8B5CF6',
    gas: '#F97316',
    queue: '#EF4444',
    approved: '#10B981',
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
        gameType: 'interconnect-queue',
        gameTitle: 'Interconnect Queue',
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

  // Current calculations
  const throughput = calculateThroughput(approvalRate);
  const yearsToClear = calculateYearsToClear(throughput);
  const clusterMultiplier = calculateClusterMultiplier(clusterSize);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.queue})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.queue})`,
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
  // Queue Pipeline SVG Visualization (Play Phase)
  // -------------------------------------------------------------------------
  const QueuePipelineVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 360;
    const rateNorm = (approvalRate - 6) / (60 - 6); // 0 (fast) to 1 (slow)
    const funnelNarrow = 40 + (1 - rateNorm) * 30; // wider output when faster
    const projectsInQueue = Math.round(2600 * rateNorm + 200);
    const builtPerYear = throughput;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          {/* Solar gradient */}
          <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>
          {/* Wind gradient */}
          <linearGradient id="windGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          {/* Storage gradient */}
          <linearGradient id="storageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          {/* Gas gradient */}
          <linearGradient id="gasGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
          {/* Funnel gradient */}
          <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#F59E0B" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
          </linearGradient>
          {/* Approved glow */}
          <linearGradient id="approvedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="queueGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Pulse filter */}
          <filter id="pulseGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="140" x2={width - 30} y2="140" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="220" x2={width - 30} y2="220" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="280" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Interconnection Queue Pipeline
        </text>

        {/* Stage labels */}
        <text x={50} y={48} fill="#94a3b8" fontSize="11" textAnchor="middle">Application</text>
        <text x={width * 0.25} y={48} fill="#94a3b8" fontSize="11" textAnchor="middle">Feasibility</text>
        <text x={width * 0.45} y={48} fill="#94a3b8" fontSize="11" textAnchor="middle">System Impact</text>
        <text x={width * 0.65} y={48} fill="#94a3b8" fontSize="11" textAnchor="middle">Facilities</text>
        <text x={width * 0.85} y={48} fill="#94a3b8" fontSize="11" textAnchor="middle">Built</text>

        {/* Funnel shape - wide on left, narrow on right */}
        <polygon
          points={`20,${70} ${width - 40},${140 - funnelNarrow / 2} ${width - 20},${140 - funnelNarrow / 3} ${width - 20},${140 + funnelNarrow / 3} ${width - 40},${140 + funnelNarrow / 2} 20,${210}`}
          fill="url(#funnelGrad)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* Project dots entering (left side - solar) */}
        <circle cx={35} cy={85} r="5" fill="url(#solarGrad)" filter="url(#queueGlow)" />
        <circle cx={55} cy={95} r="6" fill="url(#solarGrad)" opacity="0.8" />
        <circle cx={40} cy={110} r="6" fill="url(#solarGrad)" opacity="0.7" />
        <circle cx={60} cy={125} r="6" fill="url(#solarGrad)" opacity="0.6" />

        {/* Project dots (wind) */}
        <circle cx={30} cy={140} r="5" fill="url(#windGrad)" filter="url(#queueGlow)" />
        <circle cx={50} cy={150} r="6" fill="url(#windGrad)" opacity="0.8" />
        <circle cx={35} cy={165} r="6" fill="url(#windGrad)" opacity="0.7" />

        {/* Project dots (storage) */}
        <circle cx={45} cy={180} r="5" fill="url(#storageGrad)" filter="url(#queueGlow)" />
        <circle cx={30} cy={195} r="6" fill="url(#storageGrad)" opacity="0.7" />

        {/* Project dots (gas) */}
        <circle cx={55} cy={175} r="6" fill="url(#gasGrad)" opacity="0.8" />

        {/* Mid-funnel projects (fewer, moving through) */}
        <circle cx={width * 0.3} cy={120} r="6" fill="url(#solarGrad)" opacity="0.5" />
        <circle cx={width * 0.35} cy={145} r="6" fill="url(#windGrad)" opacity="0.5" />
        <circle cx={width * 0.32} cy={160} r="6" fill="url(#storageGrad)" opacity="0.4" />

        {/* Feasibility stage */}
        <circle cx={width * 0.45} cy={130} r="6" fill="url(#solarGrad)" opacity="0.4" />
        <circle cx={width * 0.48} cy={150} r="6" fill="url(#windGrad)" opacity="0.4" />

        {/* Facilities stage */}
        <circle cx={width * 0.65} cy={135} r="6" fill="url(#solarGrad)" opacity="0.3" />

        {/* Built/approved (right side - few make it) */}
        <circle cx={width - 35} cy={138} r="5" fill="url(#approvedGrad)" filter="url(#pulseGlow)" />

        {/* Withdrawal arrows (projects dropping out) */}
        <path d={`M ${width * 0.25} ${175} L ${width * 0.25} ${195}`} stroke="#EF4444" strokeWidth="1.5" opacity="0.5" markerEnd="url(#arrowRed)" />
        <path d={`M ${width * 0.45} ${170} L ${width * 0.45} ${195}`} stroke="#EF4444" strokeWidth="1.5" opacity="0.5" />
        <text x={width * 0.35} y={210} fill="#EF4444" fontSize="11" textAnchor="middle" opacity="0.7">~80% withdraw</text>

        {/* Throughput meter */}
        <g>
          <rect x={30} y={235} width={width - 60} height={20} rx="10" fill={colors.border} />
          <rect
            x={30}
            y={235}
            width={Math.min((width - 60), (width - 60) * (builtPerYear / 200))}
            height={20}
            rx="10"
            fill="url(#approvedGrad)"
            filter="url(#queueGlow)"
          />
          <circle
            cx={30 + Math.min((width - 60), (width - 60) * (builtPerYear / 200))}
            cy={245}
            r="7"
            fill={colors.approved}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#queueGlow)"
          />
          <text x={width / 2} y={248} fill={colors.textPrimary} fontSize="11" fontWeight="700" textAnchor="middle">
            {builtPerYear} GW/yr throughput
          </text>
        </g>

        {/* Stats bar */}
        <text x={width / 2} y={278} fill={colors.textPrimary} fontSize="12" fontWeight="600" textAnchor="middle">
          Queue: ~{projectsInQueue}GW waiting | {approvalRate}mo avg | {yearsToClear.toFixed(1)} yrs to clear
        </text>

        {/* Axis labels */}
        <text x={15} y={140} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, 15, 140)`}>
          Energy (GW)
        </text>
        <text x={width / 2} y={height - 2} fill="#94a3b8" fontSize="11" textAnchor="middle">
          Time (years)
        </text>

        {/* Bottom curve showing throughput vs time with many data points */}
        <path
          d={(() => {
            const botY = 330;
            const amplitude = 100 + builtPerYear * 0.5;
            const pts: string[] = [];
            for (let i = 0; i <= 12; i++) {
              const t = i / 12;
              const x = 30 + t * (width - 60);
              const curve = 0.5 + 0.5 * Math.sin(Math.PI * t - Math.PI / 2);
              const y = botY - curve * amplitude;
              pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
            }
            return pts.join(' ');
          })()}
          stroke={colors.accent}
          fill="none"
          strokeWidth="2"
          opacity="0.7"
        />
        {/* Interactive marker on throughput curve */}
        {(() => {
          const botY = 330;
          const amplitude = 100 + builtPerYear * 0.5;
          const tSlider = (approvalRate - 6) / (60 - 6);
          const curve = 0.5 + 0.5 * Math.sin(Math.PI * tSlider - Math.PI / 2);
          const markerY = botY - curve * amplitude;
          const markerX = 30 + tSlider * (width - 60);
          return (
            <circle
              cx={markerX}
              cy={markerY}
              r="7"
              fill={colors.accent}
              stroke="white"
              strokeWidth="1.5"
              filter="url(#queueGlow)"
            />
          );
        })()}

        {/* Legend */}
        <g>
          <circle cx={40} cy={height - 22} r="4" fill="url(#solarGrad)" />
          <text x={50} y={height - 18} fill="#94a3b8" fontSize="11">Solar</text>
          <circle cx={100} cy={height - 22} r="4" fill="url(#windGrad)" />
          <text x={110} y={height - 18} fill="#94a3b8" fontSize="11">Wind</text>
          <circle cx={155} cy={height - 22} r="4" fill="url(#storageGrad)" />
          <text x={165} y={height - 18} fill="#94a3b8" fontSize="11">Storage</text>
          <circle cx={225} cy={height - 22} r="4" fill="url(#gasGrad)" />
          <text x={235} y={height - 18} fill="#94a3b8" fontSize="11">Gas</text>
          <circle cx={280} cy={height - 22} r="4" fill="url(#approvedGrad)" />
          <text x={290} y={height - 18} fill="#94a3b8" fontSize="11">Built</text>
        </g>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // Cluster Study SVG Visualization (Twist Play Phase)
  // -------------------------------------------------------------------------
  const ClusterStudyVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const multiplier = clusterMultiplier;
    const serialTime = studyComplexity; // months per project
    const clusterTime = serialTime / multiplier; // effective months per project
    const serialProjects = 12; // projects per year in serial
    const clusterProjects = Math.round(serialProjects * multiplier);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="serialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="clusterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="throughputGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <filter id="clusterGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="200" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Serial vs Cluster Study Comparison
        </text>

        {/* Serial processing visualization */}
        <g>
          <text x={30} y={55} fill="#EF4444" fontSize="12" fontWeight="600">Serial (One-by-One)</text>
          {/* Individual project bars in sequence */}
          {Array.from({ length: Math.min(8, serialProjects) }).map((_, i) => (
            <rect
              key={`serial-${i}`}
              x={30 + i * ((width - 60) / 8)}
              y={65}
              width={((width - 60) / 8) - 4}
              height={18}
              rx="3"
              fill="url(#serialGrad)"
              opacity={0.4 + (i * 0.07)}
            />
          ))}
          <text x={width / 2} y={98} fill="#94a3b8" fontSize="11" textAnchor="middle">
            {serialProjects} projects/yr | {serialTime}mo each
          </text>
        </g>

        {/* Cluster processing visualization */}
        <g>
          <text x={30} y={125} fill="#10B981" fontSize="12" fontWeight="600">Cluster (Batched Study)</text>
          {/* Clustered project blocks */}
          {Array.from({ length: Math.min(4, Math.ceil(clusterSize / 5) + 1) }).map((_, i) => {
            const blockWidth = ((width - 60) / 4) - 8;
            return (
              <g key={`cluster-${i}`}>
                <rect
                  x={30 + i * ((width - 60) / 4)}
                  y={135}
                  width={blockWidth}
                  height={28}
                  rx="6"
                  fill="url(#clusterGrad)"
                  opacity={0.5 + (i * 0.1)}
                  filter="url(#clusterGlow)"
                />
                <text
                  x={30 + i * ((width - 60) / 4) + blockWidth / 2}
                  y={153}
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {clusterSize}
                </text>
              </g>
            );
          })}
          <text x={width / 2} y={180} fill="#94a3b8" fontSize="11" textAnchor="middle">
            {clusterProjects} projects/yr | {clusterTime.toFixed(1)}mo effective each
          </text>
        </g>

        {/* Throughput comparison bar */}
        <g>
          <text x={width / 2} y={205} fill={colors.textPrimary} fontSize="12" fontWeight="600" textAnchor="middle">
            Throughput Multiplier
          </text>
          <rect x={50} y={215} width={width - 100} height={20} rx="10" fill={colors.border} />
          <rect
            x={50}
            y={215}
            width={(width - 100) * Math.min(1, multiplier / 4)}
            height={20}
            rx="10"
            fill="url(#throughputGrad)"
            filter="url(#clusterGlow)"
          />
          <circle
            cx={50 + (width - 100) * Math.min(1, multiplier / 4)}
            cy={225}
            r="7"
            fill="#8B5CF6"
            stroke="white"
            strokeWidth="1.5"
            filter="url(#clusterGlow)"
          />
          <text x={width / 2} y={228} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">
            {multiplier.toFixed(1)}x throughput
          </text>
        </g>

        {/* Improvement curve showing efficiency gain */}
        <path
          d={(() => {
            const baseY = 295;
            const amplitude = 85 + multiplier * 5;
            const pts: string[] = [];
            for (let i = 0; i <= 12; i++) {
              const t = i / 12;
              const x = 50 + t * (width - 100);
              const curve = 0.5 + 0.5 * Math.sin(Math.PI * t - Math.PI / 2);
              const y = baseY - curve * amplitude;
              pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
            }
            return pts.join(' ');
          })()}
          stroke={colors.accent}
          fill="none"
          strokeWidth="2"
          opacity="0.7"
        />
        {(() => {
          const baseY = 295;
          const amplitude = 85 + multiplier * 5;
          const tSlider = clusterSize / 20;
          const curve = 0.5 + 0.5 * Math.sin(Math.PI * tSlider - Math.PI / 2);
          return (
            <circle cx={50 + tSlider * (width - 100)} cy={baseY - curve * amplitude} r="6" fill={colors.accent} stroke="white" strokeWidth="1.5" filter="url(#clusterGlow)" />
          );
        })()}

        {/* Results text */}
        <text x={width / 2} y={278} fill={colors.textPrimary} fontSize="12" fontWeight="600" textAnchor="middle">
          Cluster of {clusterSize}: {multiplier.toFixed(1)}x faster | ~{clusterProjects} projects/year
        </text>

        {/* Legend */}
        <g>
          <rect x={40} y={height - 22} width="12" height="12" rx="2" fill="url(#serialGrad)" />
          <text x={57} y={height - 13} fill="#94a3b8" fontSize="11">Serial</text>
          <rect x={120} y={height - 22} width="12" height="12" rx="2" fill="url(#clusterGrad)" />
          <text x={137} y={height - 13} fill="#94a3b8" fontSize="11">Cluster</text>
          <circle cx={210} cy={height - 16} r="4" fill="#8B5CF6" />
          <text x={220} y={height - 13} fill="#94a3b8" fontSize="11">Throughput</text>
          <circle cx={300} cy={height - 16} r="4" fill={colors.accent} />
          <text x={310} y={height - 13} fill="#94a3b8" fontSize="11">Efficiency</text>
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
            {'\u{1F3D7}\u{FE0F}'}{'\u{23F3}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Interconnect Queue
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            "There are <span style={{ color: colors.queue }}>2,600 gigawatts</span> of energy projects waiting to connect to America's grid — but only <span style={{ color: colors.approved }}>~25GW per year</span> actually gets built. The interconnection queue is the single biggest bottleneck in the energy transition."
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
              "The interconnection queue has become the graveyard of clean energy projects. For every project that makes it through, four die waiting. At this rate, it would take over 100 years to process what's already in line."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Lawrence Berkeley National Laboratory, 2024
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '500px',
            width: '100%',
          }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.queue }}>2,600GW</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>In Queue</div>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.accent }}>25GW/yr</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Built</div>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ ...typo.h3, color: colors.approved }}>~5yrs</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Avg Wait</div>
            </div>
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
      { id: 'a', text: '3-6 months — about the same as a building permit' },
      { id: 'b', text: '1-2 years — a significant but manageable delay' },
      { id: 'c', text: '3-5 years — longer than most project financing terms' },
      { id: 'd', text: 'Less than 1 month — it is mostly automated' },
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
              How long does the average energy project wait in the interconnection queue before it can connect to the grid?
            </h2>

            {/* Static SVG showing queue concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictQueueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                  <linearGradient id="predictBuiltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Projects Entering vs Getting Built</text>
                {/* Queue bar - large */}
                <text x="200" y="55" textAnchor="middle" fill="#EF4444" fontSize="12">Projects Waiting (2,600 GW)</text>
                <rect x="30" y="65" width="340" height="30" rx="6" fill="url(#predictQueueGrad)" opacity="0.7" />
                <text x="200" y="85" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">2,600 GW in queue</text>
                {/* Built bar - tiny */}
                <text x="200" y="120" textAnchor="middle" fill="#10B981" fontSize="12">Projects Actually Built Per Year</text>
                <rect x="30" y="130" width="33" height="24" rx="4" fill="url(#predictBuiltGrad)" />
                <text x="70" y="147" fill="white" fontSize="11" fontWeight="600">~25 GW/yr</text>
                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">How long does each project wait in this line?</text>
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

  // PLAY PHASE - Interactive Queue Pipeline Visualizer
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
              Queue Pipeline Visualizer
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> The interconnection queue is the primary bottleneck preventing clean energy deployment. Every solar farm, wind farm, and battery storage project must pass through this process before connecting to the grid. Understanding the queue is essential for anyone working in energy.
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
                <strong style={{ color: colors.textPrimary }}>Interconnection Queue</strong> is defined as the formal process by which new power plants apply to connect to the electric transmission grid. Projects must complete a series of engineering studies.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Feasibility Study</strong> refers to the first screen — a preliminary evaluation of whether the grid can accommodate the project at its proposed connection point.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.queue }}>Network Upgrades</strong> refers to the grid infrastructure improvements (transmission lines, transformers, substations) required to safely connect a new project. Costs can reach hundreds of millions of dollars.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Queue Throughput Formula:</strong>{' '}
                <span style={{ fontFamily: 'monospace', color: colors.accent }}>
                  T = (25 × 42) / approval_months — where T is calculated in GW/year
                </span>
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows how projects flow through the interconnection queue: from application through feasibility study, system impact study, facilities study, and finally construction. Watch how adjusting the approval processing rate changes throughput. Notice the funnel narrowing as most projects withdraw.
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
                    <QueuePipelineVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Approval Rate slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Approval Processing Rate</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {approvalRate} months avg ({(approvalRate / 12).toFixed(1)} years)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="60"
                      step="1"
                      value={approvalRate}
                      onChange={(e) => setApprovalRate(parseInt(e.target.value))}
                      onInput={(e) => setApprovalRate(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Approval Processing Rate"
                      style={sliderStyle(colors.accent, approvalRate, 6, 60)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.approved }}>6mo (fast-track)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>3yr (current avg)</span>
                      <span style={{ ...typo.small, color: colors.queue }}>5yr (slow)</span>
                    </div>
                  </div>

                  {/* Queue stages pipeline */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
                      Queue Process Stages
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {['Application', 'Feasibility', 'System Impact', 'Facilities', 'Construction'].map((stage, i) => (
                        <React.Fragment key={stage}>
                          <div style={{
                            flex: 1,
                            background: `${[colors.queue, '#F97316', colors.accent, '#3B82F6', colors.approved][i]}22`,
                            border: `1px solid ${[colors.queue, '#F97316', colors.accent, '#3B82F6', colors.approved][i]}44`,
                            borderRadius: '8px',
                            padding: '8px 4px',
                            textAlign: 'center',
                            minWidth: '45px',
                          }}>
                            <div style={{ ...typo.small, color: [colors.queue, '#F97316', colors.accent, '#3B82F6', colors.approved][i], fontWeight: 600, fontSize: '11px' }}>
                              {stage}
                            </div>
                            <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>
                              ~{Math.round(approvalRate / 5 * (i === 0 ? 0.5 : i === 4 ? 2 : 1))}mo
                            </div>
                          </div>
                          {i < 4 && <span style={{ color: colors.textMuted, fontSize: '16px' }}>{'\u2192'}</span>}
                        </React.Fragment>
                      ))}
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
                  <div style={{ ...typo.h3, color: colors.accent }}>{throughput} GW</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Built/Year</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.queue }}>{yearsToClear.toFixed(1)} yrs</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>To Clear Queue</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.approved }}>
                    {Math.round((1 - withdrawalRate / 100) * queueInflow)} GW
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Viable/Year</div>
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
              Understand the Bottleneck
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
              Why the Queue is Broken
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — the average energy project waits 3-5 years in the interconnection queue, far longer than most project financing terms allow.'
                : 'As you saw in the experiment, the average wait is a staggering 3-5 years. This delay is the primary reason clean energy deployment is slower than it could be.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Queue Math: 2,600GW / 25GW per year = 104 years</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The key insight is that the interconnection queue is a <span style={{ color: colors.queue }}>first-come, first-served</span> system where each project must complete sequential engineering studies. This demonstrates why the bottleneck exists: because each project must pass through the <span style={{ color: colors.accent }}>feasibility study</span> (basic grid compatibility), the <span style={{ color: colors.approved }}>system impact study</span> (grid stability modeling), and the <span style={{ color: colors.wind }}>facilities study</span> (detailed engineering designs and cost estimates) — all in serial order.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Average timeline: Application {'\u2192'} 12mo {'\u2192'} Feasibility {'\u2192'} 12mo {'\u2192'} System Impact {'\u2192'} 12mo {'\u2192'} Facilities {'\u2192'} Build = <strong>3-5 years total</strong>
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
                Why So Many Projects Withdraw
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Approximately 80% of projects that enter the queue ultimately withdraw. Many are speculative — developers place applications to "hold a spot" without firm financing. Others withdraw when they receive network upgrade cost estimates of tens or hundreds of millions of dollars. Each withdrawal can trigger restudies of downstream projects, further slowing the entire queue.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                The Serial Study Problem
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Serial Processing', desc: 'Each project studied individually, one at a time', color: colors.queue },
                  { label: 'Cascading Restudies', desc: 'When one project drops, all behind it must be re-evaluated', color: '#F97316' },
                  { label: 'Speculative Clogging', desc: 'No penalty for phantom applications that waste study resources', color: colors.accent },
                  { label: 'Upgrade Cost Shock', desc: 'Projects discover $100M+ upgrade bills only after years of waiting', color: colors.wind },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: item.color, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>{item.desc}</div>
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
      { id: 'a', text: 'Takes longer due to increased complexity of studying multiple projects simultaneously' },
      { id: 'b', text: '4x throughput improvement — study the area once instead of repeating for each project' },
      { id: 'c', text: 'No difference — the bottleneck is construction, not studies' },
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
                New Variable: Cluster-Based Study
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              What if instead of studying projects one-by-one, we batch nearby projects into clusters?
            </h2>

            {/* Static SVG showing cluster concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistSerialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <linearGradient id="twistClusterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Serial: One study per project</text>
                {/* Serial boxes */}
                {[0, 1, 2, 3, 4].map(i => (
                  <rect key={`s-${i}`} x={30 + i * 72} y={30} width="65" height="24" rx="4" fill="url(#twistSerialGrad)" opacity={0.5 + i * 0.1} />
                ))}
                <text x="200" y="72" textAnchor="middle" fill="#94a3b8" fontSize="11">5 separate studies = 5x the time</text>

                <text x="200" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Cluster: One study for all nearby projects</text>
                {/* Cluster box */}
                <rect x="30" y="105" width="340" height="30" rx="8" fill="url(#twistClusterGrad)" opacity="0.7" />
                <text x="200" y="125" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">5 projects studied together in 1 batch</text>
                <text x="200" y="155" textAnchor="middle" fill="#94a3b8" fontSize="11">1 comprehensive study = dramatically faster</text>
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
                See Cluster Results
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Cluster Study Simulator
  if (phase === 'twist_play') {
    const serialProjectsPerYear = 12;
    const clusterProjectsPerYear = Math.round(serialProjectsPerYear * clusterMultiplier);
    const effectiveMonths = studyComplexity / clusterMultiplier;

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
              Cluster vs Serial Study Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Adjust the cluster size to see how batching nearby projects improves throughput
            </p>

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
                    <ClusterStudyVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The visualization compares serial study (processing projects one-by-one) with cluster study (batching nearby projects together). As you increase the cluster size, the throughput multiplier grows logarithmically.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase the cluster size slider, more projects are studied simultaneously in each batch, reducing the effective months per project and increasing the annual throughput — but with diminishing returns beyond cluster sizes of 10-15.</p>
                  </div>

                  {/* Cluster size slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Cluster Size (projects per batch)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {clusterSize} {clusterSize === 1 ? '(serial)' : 'projects'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={clusterSize}
                      onChange={(e) => setClusterSize(parseInt(e.target.value))}
                      onInput={(e) => setClusterSize(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Cluster size"
                      style={sliderStyle(colors.accent, clusterSize, 1, 20)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.queue }}>1 (serial)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>10 (medium cluster)</span>
                      <span style={{ ...typo.small, color: colors.approved }}>20 (large cluster)</span>
                    </div>
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
                  <div style={{ ...typo.h3, color: colors.accent }}>{clusterMultiplier.toFixed(1)}x</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Throughput Multiplier</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.approved }}>{effectiveMonths.toFixed(1)} mo</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Effective Time/Project</div>
                </div>
              </div>

              {/* Comparison table */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, fontWeight: 600 }}>Metric</div>
                  <div style={{ ...typo.small, color: colors.queue, fontWeight: 600 }}>Serial</div>
                  <div style={{ ...typo.small, color: colors.approved, fontWeight: 600 }}>Cluster of {clusterSize}</div>

                  <div style={{ ...typo.small, color: colors.textSecondary }}>Projects/Year</div>
                  <div style={{ ...typo.small, color: colors.queue }}>{serialProjectsPerYear}</div>
                  <div style={{ ...typo.small, color: colors.approved }}>{clusterProjectsPerYear}</div>

                  <div style={{ ...typo.small, color: colors.textSecondary }}>Months/Project</div>
                  <div style={{ ...typo.small, color: colors.queue }}>{studyComplexity}</div>
                  <div style={{ ...typo.small, color: colors.approved }}>{effectiveMonths.toFixed(1)}</div>

                  <div style={{ ...typo.small, color: colors.textSecondary }}>Improvement</div>
                  <div style={{ ...typo.small, color: colors.queue }}>1x (baseline)</div>
                  <div style={{ ...typo.small, color: colors.approved }}>{clusterMultiplier.toFixed(1)}x faster</div>
                </div>
              </div>

              {/* Insight callout */}
              <div style={{
                background: clusterSize >= 10 ? `${colors.success}22` : `${colors.accent}22`,
                border: `1px solid ${clusterSize >= 10 ? colors.success : colors.accent}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                marginTop: '16px',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>
                  {clusterSize >= 10
                    ? 'Near-optimal cluster size! Diminishing returns beyond this point.'
                    : clusterSize >= 5
                      ? 'Good improvement! Larger clusters yield even more efficiency.'
                      : clusterSize > 1
                        ? 'Even small clusters help. Try increasing to 10+ for maximum impact.'
                        : 'This is the current serial approach. Try increasing the cluster size!'}
                </p>
                <div style={{ ...typo.h3, color: clusterSize >= 10 ? colors.success : colors.accent }}>
                  {clusterSize === 1 ? 'Baseline: Serial Processing' : `${clusterMultiplier.toFixed(1)}x throughput improvement`}
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
              Understand Cluster Reform
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
              The Cluster Revolution: FERC Order 2023
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Core Reform</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
                  Serial (1 at a time) {'\u2192'} Cluster (N at a time) = ~4x throughput
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  FERC Order 2023 mandates that all U.S. grid operators transition from serial, first-come-first-served interconnection studies to cluster-based processing. By batching nearby projects into geographic clusters, one comprehensive power flow study replaces dozens of redundant individual analyses. CAISO proved this can cut study times from 48 months to 18 months.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Financial Commitment Gates</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The reform also introduces escalating financial deposits at each study phase. Speculative projects that are not willing to put money down are flushed from the queue early, freeing study resources for viable projects. This addresses the 80% withdrawal rate problem by requiring "skin in the game" before consuming grid operator resources.
                </p>
              </div>

              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The interconnection queue bottleneck is not a technology problem — it is a process problem. The same grid that took decades to build is being asked to absorb decades of new generation in a few years. Cluster study, financial gates, and proactive transmission planning are the three pillars of reform needed to unclog the queue and accelerate the energy transition.
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Connection to Queue Concepts:</p>
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
                      // Auto-advance to next uncompleted app or to test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > idx);
                      const anyUncompleted = newCompleted.findIndex((c) => !c);
                      if (nextUncompleted !== -1) {
                        setSelectedApp(nextUncompleted);
                      } else if (anyUncompleted !== -1) {
                        setSelectedApp(anyUncompleted);
                      } else {
                        // All apps completed, auto-advance to test
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
                {passed ? 'You understand the interconnection queue bottleneck and its solutions!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Interconnect Queue
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of the interconnection queue process, FERC Order 2023 reforms, speculative project impacts, network upgrade costs, and cluster-based study approaches to real-world energy infrastructure scenarios.
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
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Interconnect Queue Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why 2,600GW of projects wait, why 80% withdraw, and how cluster-based reform can 4x queue throughput.
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
                'The queue processes ~25GW/yr against 2,600GW backlog',
                'Serial study creates cascading restudy bottlenecks',
                'FERC Order 2023 mandates cluster-based processing',
                'Financial gates filter out speculative applications',
                'Behind-the-meter bypasses the queue entirely',
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

export default ELON_InterconnectQueueRenderer;
