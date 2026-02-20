'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON MINING BOTTLENECK - Complete 10-Phase Game (#16 of 36)
// Mine development timeline — 15-20 year timelines create supply crunches
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

interface ELON_MiningBottleneckRendererProps {
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
    scenario: "A junior mining company announces a significant copper discovery in a remote region. Investors are excited about the find.",
    question: "Before any ore can be extracted, what is the typical timeline from discovery to first production?",
    options: [
      { id: 'a', label: "1-2 years with modern technology" },
      { id: 'b', label: "5-7 years if fast-tracked" },
      { id: 'c', label: "15-20 years through the full development pipeline", correct: true },
      { id: 'd', label: "It depends entirely on the company's budget" }
    ],
    explanation: "The mine development pipeline includes exploration (3-5yr), resource estimation (1-2yr), feasibility studies (2-3yr), permitting (3-7yr), construction (2-4yr), and ramp-up (1-2yr). This typically totals 15-20 years from discovery to production."
  },
  {
    scenario: "A geological survey team has completed initial drilling and found promising mineralization at depth. The project is entering the resource estimation phase.",
    question: "What is the purpose of an NI 43-101 compliant resource estimate?",
    options: [
      { id: 'a', label: "It guarantees profitable mining operations" },
      { id: 'b', label: "It provides a standardized, independently verified estimate of mineral resources and reserves", correct: true },
      { id: 'c', label: "It is only required for gold mines" },
      { id: 'd', label: "It replaces the need for a feasibility study" }
    ],
    explanation: "NI 43-101 is a Canadian securities regulation that sets standards for public disclosure of scientific and technical information about mineral projects. It requires a Qualified Person to verify all claims, protecting investors from exaggerated resource estimates."
  },
  {
    scenario: "A mining company has completed a Preliminary Economic Assessment (PEA) and now needs to decide whether to proceed to a full Bankable Feasibility Study (BFS).",
    question: "Why is the BFS considered the most critical decision gate?",
    options: [
      { id: 'a', label: "It is the cheapest study to complete" },
      { id: 'b', label: "It provides the detailed engineering, cost estimates, and risk analysis needed to secure project financing", correct: true },
      { id: 'c', label: "It is only needed for underground mines" },
      { id: 'd', label: "It replaces environmental permitting requirements" }
    ],
    explanation: "A Bankable Feasibility Study costs $20-100M+ and provides the level of detail (±15% cost accuracy) that banks and investors require before committing billions in project financing. It is literally 'bankable' — sufficient for a bank to lend against."
  },
  {
    scenario: "A lithium mine project has all technical approvals but the local community has voiced strong opposition. The company has not conducted meaningful community engagement.",
    question: "What concept describes the community acceptance needed for mining operations?",
    options: [
      { id: 'a', label: "Eminent domain" },
      { id: 'b', label: "Social license to operate", correct: true },
      { id: 'c', label: "Government subsidy" },
      { id: 'd', label: "Environmental impact offset" }
    ],
    explanation: "Social license to operate refers to the ongoing acceptance and approval of a mining project by the local community and stakeholders. Without it, projects face protests, legal challenges, and government intervention — regardless of having formal permits."
  },
  {
    scenario: "A copper mine is nearing the end of its economic life after 25 years of operation. The company is planning for closure.",
    question: "What financial instrument ensures environmental rehabilitation after mine closure?",
    options: [
      { id: 'a', label: "Mine closure bonds and financial assurance mechanisms", correct: true },
      { id: 'b', label: "Corporate stock buybacks" },
      { id: 'c', label: "Government bailout funds" },
      { id: 'd', label: "Insurance policies against natural disasters" }
    ],
    explanation: "Mine closure bonds are financial guarantees (often held in trust) that ensure funds are available for environmental rehabilitation even if the mining company becomes insolvent. Modern regulations require these bonds before operations begin, covering land reclamation, water treatment, and long-term monitoring."
  },
  {
    scenario: "An EV manufacturer needs to secure lithium supply for its next-generation batteries. Current demand projections show a 300% increase in lithium demand by 2030.",
    question: "Why can't the mining industry simply ramp up production to meet this demand?",
    options: [
      { id: 'a', label: "There isn't enough lithium in the Earth's crust" },
      { id: 'b', label: "The 15-20 year mine development timeline means supply cannot respond quickly to demand signals", correct: true },
      { id: 'c', label: "Mining companies don't want higher prices" },
      { id: 'd', label: "Lithium extraction technology doesn't exist yet" }
    ],
    explanation: "The mining bottleneck is fundamentally a timing problem. Even with high prices and strong demand, a mine discovered today won't produce ore for 15-20 years. This creates structural supply deficits that cannot be solved by market price signals alone."
  },
  {
    scenario: "A mining project in British Columbia is entering the environmental assessment phase. The project area overlaps with First Nations traditional territory.",
    question: "What additional process is legally required in many jurisdictions when indigenous lands are affected?",
    options: [
      { id: 'a', label: "Nothing additional — standard permits apply" },
      { id: 'b', label: "Free, Prior, and Informed Consent (FPIC) and/or duty to consult with indigenous peoples", correct: true },
      { id: 'c', label: "Only a financial payment to the community" },
      { id: 'd', label: "Automatic project approval if minerals are deemed critical" }
    ],
    explanation: "FPIC, enshrined in the UN Declaration on the Rights of Indigenous Peoples, requires meaningful consultation and consent from indigenous communities. In Canada, the Crown has a constitutional duty to consult. Failure to do so can result in project injunctions and cancellations."
  },
  {
    scenario: "A geological survey identifies a massive nickel-cobalt deposit. Initial drilling shows grades of 1.5% nickel and 0.15% cobalt at 400m depth.",
    question: "What factor most determines whether this deposit is economically viable?",
    options: [
      { id: 'a', label: "Only the metal grade matters" },
      { id: 'b', label: "The strip ratio, metallurgical recovery, infrastructure proximity, and commodity prices together determine viability", correct: true },
      { id: 'c', label: "Depth is the only important factor" },
      { id: 'd', label: "The country where it's located doesn't matter" }
    ],
    explanation: "Economic viability is a complex calculation involving grade, tonnage, strip ratio (waste-to-ore), metallurgical recovery rates, distance to infrastructure (roads, power, water), commodity price forecasts, operating costs, and political risk. High grade alone doesn't guarantee a viable project."
  },
  {
    scenario: "The permitting process for a new gold mine has taken 7 years and involved 15 different government agencies across federal, state, and local levels.",
    question: "What is the primary reason permitting takes so long for mining projects?",
    options: [
      { id: 'a', label: "Government bureaucrats are intentionally slow" },
      { id: 'b', label: "Multiple overlapping jurisdictions, environmental reviews, public comment periods, and legal challenges create compounding delays", correct: true },
      { id: 'c', label: "Mining companies delay on purpose to manipulate commodity prices" },
      { id: 'd', label: "Technology limitations prevent faster processing" }
    ],
    explanation: "Permitting involves environmental impact assessments (EIA/EIS), endangered species reviews, water rights, air quality permits, archaeological surveys, indigenous consultation, public comment periods, and potential legal challenges at each step. Each agency operates independently with its own timeline."
  },
  {
    scenario: "A rare earth elements mine has been approved and construction is beginning. The total capital expenditure is estimated at $2.5 billion.",
    question: "How does the mine's cash flow typically behave during the first decade of the project?",
    options: [
      { id: 'a', label: "Profits begin immediately once construction starts" },
      { id: 'b', label: "Cash flow remains deeply negative for 10+ years as capital is deployed before any revenue is generated", correct: true },
      { id: 'c', label: "Government subsidies cover all costs until production begins" },
      { id: 'd', label: "Revenue from selling exploration data offsets construction costs" }
    ],
    explanation: "Mine development requires enormous upfront capital (exploration, studies, permitting, construction) over 10-15 years before the first dollar of revenue. The cash flow curve is deeply negative, creating a 'valley of death' that requires patient capital and strong balance sheets."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed case studies
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏜️',
    title: 'Resolution Copper — Arizona',
    short: 'Sacred Apache land blocks one of the world\'s largest copper deposits',
    tagline: 'Where geology meets indigenous rights',
    description: 'Resolution Copper, a joint venture between Rio Tinto and BHP, sits atop one of the largest undeveloped copper deposits in the world — 1.8 billion tonnes. But the deposit lies beneath Oak Flat (Chi\'chil Bildagoteel), a sacred Apache site. Despite decades of effort, the project remains blocked by legal challenges and congressional action.',
    connection: 'The mining bottleneck is not just about geology or engineering — social and cultural factors can delay or kill projects regardless of their economic merit.',
    howItWorks: 'Block caving would collapse the surface, destroying the sacred site. No alternative mining method can access the deep deposit without surface impact.',
    stats: [
      { value: '30yr+', label: 'Project delay', icon: '⏳' },
      { value: 'Sacred', label: 'Apache land', icon: '🏜️' },
      { value: 'Arizona', label: 'Location', icon: '📍' }
    ],
    examples: ['Block cave mining', 'Land exchange legislation', 'NEPA environmental review', 'Tribal sovereignty'],
    companies: ['Rio Tinto', 'BHP', 'Apache Stronghold', 'Earthjustice'],
    futureImpact: 'Sets precedent for how sacred sites are weighed against critical mineral needs in US policy.',
    color: '#EF4444'
  },
  {
    icon: '⚖️',
    title: 'Thacker Pass Lithium — Nevada',
    short: 'America\'s largest lithium mine faces tribal opposition and legal battles',
    tagline: 'The legal gauntlet for domestic lithium',
    description: 'Lithium Americas\' Thacker Pass project in northern Nevada would be the largest lithium mine in the US, producing enough lithium for 1.5 million EVs annually. However, the project has faced prolonged legal challenges from environmental groups and tribal nations who consider the area a massacre site. Court battles lasted over 2 years before construction began.',
    connection: 'Even when permitting is granted, legal challenges can add years of delay and billions in cost — demonstrating why the mining bottleneck persists even with strong economic incentives.',
    howItWorks: 'Open-pit mining of lithium-bearing clay (sedimentary lithium) processed via sulfuric acid leaching.',
    stats: [
      { value: '2yr', label: 'Court battle', icon: '⚖️' },
      { value: 'Nevada', label: 'US lithium', icon: '📍' },
      { value: 'Tribal', label: 'Opposition', icon: '🏛️' }
    ],
    examples: ['Sedimentary lithium', 'BLM permitting', 'NEPA lawsuits', 'Peehee Mu\'huh massacre site'],
    companies: ['Lithium Americas', 'General Motors', 'Bureau of Land Management', 'Atsa koodakuh wyh Nuwu'],
    futureImpact: 'Tests whether the US can fast-track critical mineral projects while respecting indigenous rights.',
    color: '#8B5CF6'
  },
  {
    icon: '🇬🇳',
    title: 'Simandou Iron Ore — Guinea',
    short: 'The world\'s best undeveloped iron ore deposit — stuck for 25+ years',
    tagline: 'Political risk as the ultimate bottleneck',
    description: 'Simandou in Guinea holds the world\'s largest untapped high-grade iron ore deposit — 2.4 billion tonnes at 65%+ Fe grade. Despite being discovered in the 1990s, the project has been stalled by political instability, corruption allegations, license disputes, coups, and infrastructure challenges. The $15B+ project requires 650km of rail and a deep-water port.',
    connection: 'Political risk and infrastructure requirements can create bottlenecks that no amount of engineering or capital can easily solve — demonstrating why geography matters as much as geology.',
    howItWorks: 'Open-pit mining of high-grade hematite requiring massive rail and port infrastructure through challenging terrain.',
    stats: [
      { value: '25yr+', label: 'Project delay', icon: '⏳' },
      { value: 'Political', label: 'Instability', icon: '🏛️' },
      { value: 'Guinea', label: 'West Africa', icon: '🌍' }
    ],
    examples: ['BSGR license scandal', '2021 military coup', 'Rio Tinto divestiture', 'China-backed consortium'],
    companies: ['Rio Tinto', 'Winning Consortium', 'Chinalco', 'Government of Guinea'],
    futureImpact: 'If developed, would reshape global iron ore markets and reduce dependence on Australian/Brazilian supply.',
    color: '#F59E0B'
  },
  {
    icon: '🇷🇸',
    title: 'Jadar Lithium — Serbia',
    short: 'Rio Tinto\'s lithium project blocked by public protests and government reversal',
    tagline: 'When democracy stops a mine',
    description: 'Rio Tinto discovered jadarite, a new lithium-boron mineral, near the Jadar Valley in Serbia. The $2.4B project would have made Serbia one of Europe\'s largest lithium producers. However, massive public protests by farmers and environmentalists led the Serbian government to revoke permits in 2022, citing environmental concerns. The project\'s fate remains uncertain amid political shifts.',
    connection: 'Social license to operate can override all technical and economic feasibility — demonstrating that the mining bottleneck is fundamentally a human problem, not just a geological one.',
    howItWorks: 'Underground mining of jadarite ore processed to extract lithium carbonate and boric acid.',
    stats: [
      { value: 'Rio Tinto', label: 'Developer', icon: '🏢' },
      { value: 'Public', label: 'Protests', icon: '📢' },
      { value: 'Government', label: 'Blocked', icon: '🚫' }
    ],
    examples: ['Jadarite discovery', 'Environmental protests', 'Permit revocation', 'EU critical minerals push'],
    companies: ['Rio Tinto', 'Serbian Government', 'Environmental NGOs', 'EU Commission'],
    futureImpact: 'Highlights tension between Europe\'s green transition goals and local environmental opposition to mining.',
    color: '#3B82F6'
  }
];

// Mine development phases for the Gantt chart
interface MinePhase {
  name: string;
  minYears: number;
  maxYears: number;
  color: string;
  description: string;
}

const minePhases: MinePhase[] = [
  { name: 'Exploration', minYears: 3, maxYears: 5, color: '#3B82F6', description: 'Geological surveys, drilling, sampling' },
  { name: 'Resource Est.', minYears: 1, maxYears: 2, color: '#8B5CF6', description: 'NI 43-101, resource modeling' },
  { name: 'Feasibility', minYears: 2, maxYears: 3, color: '#10B981', description: 'PEA, PFS, BFS engineering studies' },
  { name: 'Permitting', minYears: 3, maxYears: 7, color: '#F59E0B', description: 'EIA, permits, public consultation' },
  { name: 'Construction', minYears: 2, maxYears: 4, color: '#EF4444', description: 'Build mine, mill, infrastructure' },
  { name: 'Ramp-up', minYears: 1, maxYears: 2, color: '#EC4899', description: 'Commission, optimize, first ore' }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_MiningBottleneckRenderer: React.FC<ELON_MiningBottleneckRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [permittingSpeed, setPermittingSpeed] = useState(5); // years, 5 = slow, 1 = fast
  const [showCashFlow, setShowCashFlow] = useState(true);

  // Twist phase state
  const [sensitiveArea, setSensitiveArea] = useState(true);
  const [consultationYears, setConsultationYears] = useState(3);
  const [courtChallengeYears, setCourtChallengeYears] = useState(3);

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

  // Calculate total timeline
  const calculateTimeline = (permitYears: number, extraYears: number = 0) => {
    const exploration = 4; // midpoint
    const resourceEst = 1.5;
    const feasibility = 2.5;
    const construction = 3;
    const rampUp = 1.5;
    return exploration + resourceEst + feasibility + permitYears + construction + rampUp + extraYears;
  };

  // Calculate cumulative cash flow (negative during development, turns positive after ramp-up)
  const calculateCashFlow = (year: number, totalDevYears: number, capex: number = 2500) => {
    if (year <= totalDevYears) {
      // Spending phase: ramp up spending, peak during construction
      const fraction = year / totalDevYears;
      const spendRate = fraction < 0.5 ? fraction * 0.4 : (fraction < 0.8 ? 0.8 : 1.0);
      return -capex * spendRate;
    } else {
      // Revenue phase: ramp up revenue
      const prodYears = year - totalDevYears;
      const annualRevenue = 400; // $M per year
      return -capex + (prodYears * annualRevenue);
    }
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
        gameType: 'elon-mining-bottleneck',
        gameTitle: 'Mining Bottleneck',
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

  // Current timeline calculation
  const totalTimeline = calculateTimeline(permittingSpeed);
  const twistedTimeline = calculateTimeline(permittingSpeed, sensitiveArea ? consultationYears + courtChallengeYears : 0);

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

  // ============================================================================
  // GANTT CHART SVG VISUALIZATION
  // ============================================================================
  const GanttChartVisualization = ({ permitOverride, extraYears, showTwist }: { permitOverride?: number; extraYears?: number; showTwist?: boolean }) => {
    const width = isMobile ? 340 : 560;
    const height = 380;
    const leftMargin = 80;
    const rightMargin = 30;
    const topMargin = 45;
    const barHeight = 28;
    const barGap = 10;
    const chartWidth = width - leftMargin - rightMargin;

    const actualPermit = permitOverride ?? permittingSpeed;
    const extra = extraYears ?? 0;

    // Build phase data with actual durations
    const phases = [
      { name: 'Exploration', duration: 4, color: '#3B82F6' },
      { name: 'Resource Est.', duration: 1.5, color: '#8B5CF6' },
      { name: 'Feasibility', duration: 2.5, color: '#10B981' },
      { name: 'Permitting', duration: actualPermit, color: '#F59E0B' },
      { name: 'Construction', duration: 3, color: '#EF4444' },
      { name: 'Ramp-up', duration: 1.5, color: '#EC4899' },
    ];

    if (showTwist && extra > 0) {
      // Insert consultation and court phases after permitting
      phases.splice(4, 0, { name: 'Consultation', duration: consultationYears, color: '#DC2626' });
      phases.splice(5, 0, { name: 'Court Battles', duration: courtChallengeYears, color: '#991B1B' });
    }

    const totalYears = phases.reduce((sum, p) => sum + p.duration, 0);
    const maxYears = Math.max(totalYears, 25);
    const yearScale = chartWidth / maxYears;

    // Cash flow curve points
    const cashFlowPoints: string[] = [];
    const cfBaseline = height - 50;
    const cfScale = 0.12;
    const cfTopClamp = topMargin + phases.length * (barHeight + barGap) + 5;
    for (let yr = 0; yr <= maxYears; yr += 0.5) {
      const cf = calculateCashFlow(yr, totalYears);
      const x = leftMargin + yr * yearScale;
      const y = cfBaseline - cf * cfScale;
      cashFlowPoints.push(`${x} ${Math.max(cfTopClamp, Math.min(height - 5, y))}`);
    }

    let cumStart = 0;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="ganttExploreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="ganttResourceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="ganttFeasGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="ganttPermitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="ganttConstructGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <linearGradient id="ganttRampGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
          <linearGradient id="cashFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="ganttGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="barShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Mine Development Timeline — {totalYears.toFixed(1)} Years to First Ore
        </text>

        {/* Year axis gridlines */}
        {Array.from({ length: Math.ceil(maxYears / 5) + 1 }, (_, i) => i * 5).map(yr => (
          <g key={`grid-${yr}`}>
            <line
              x1={leftMargin + yr * yearScale}
              y1={topMargin - 5}
              x2={leftMargin + yr * yearScale}
              y2={height - 15}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4,4"
            />
            <text
              x={leftMargin + yr * yearScale}
              y={topMargin - 10}
              fill={colors.textMuted}
              fontSize="11"
              textAnchor="middle"
            >
              Yr {yr}
            </text>
          </g>
        ))}

        {/* Gantt bars */}
        {phases.map((p, i) => {
          const x = leftMargin + cumStart * yearScale;
          const barW = p.duration * yearScale;
          const y = topMargin + i * (barHeight + barGap);
          cumStart += p.duration;
          return (
            <g key={`phase-${i}`}>
              {/* Phase label */}
              <text
                x={leftMargin - 5}
                y={y + barHeight / 2 + 4}
                fill={colors.textSecondary}
                fontSize="11"
                textAnchor="end"
                fontWeight="500"
              >
                {p.name}
              </text>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={Math.max(barW, 2)}
                height={barHeight}
                rx="4"
                fill={p.color}
                opacity={0.85}
                filter="url(#barShadow)"
              />
              {/* Duration label on bar */}
              {barW > 25 && (
                <text
                  x={x + barW / 2}
                  y={y + barHeight / 2 + 4}
                  fill="white"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {p.duration}yr
                </text>
              )}
              {/* End marker circle */}
              <circle
                cx={x + barW}
                cy={y + barHeight / 2}
                r="5"
                fill={p.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {/* Cash flow curve */}
        {showCashFlow && (
          <g>
            <text
              x={width / 2}
              y={topMargin + phases.length * (barHeight + barGap) + 15}
              fill={colors.textMuted}
              fontSize="11"
              textAnchor="middle"
            >
              Cumulative Cash Flow ($M)
            </text>
            {/* Zero line */}
            <line
              x1={leftMargin}
              y1={cfBaseline}
              x2={width - rightMargin}
              y2={cfBaseline}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="3,3"
            />
            <text x={leftMargin - 5} y={cfBaseline + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">$0</text>
            {/* Cash flow path */}
            <path
              d={`M ${cashFlowPoints.join(' L ')}`}
              stroke="url(#cashFlowGrad)"
              fill="none"
              strokeWidth="2.5"
              opacity="0.8"
            />
            {/* Break-even marker */}
            {(() => {
              const beYear = totalYears + (2500 / 400); // approximate break-even
              if (beYear <= maxYears) {
                const beX = leftMargin + beYear * yearScale;
                return (
                  <g>
                    <circle cx={beX} cy={cfBaseline} r="7" fill={colors.success} stroke="white" strokeWidth="2" filter="url(#ganttGlow)" />
                    <text x={beX} y={cfBaseline - 12} fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="600">
                      Break-even ~Yr {beYear.toFixed(0)}
                    </text>
                  </g>
                );
              }
              return null;
            })()}
            {/* Negative cash flow label */}
            <text
              x={leftMargin + totalYears * yearScale * 0.4}
              y={cfBaseline + 20}
              fill={colors.error}
              fontSize="11"
              textAnchor="middle"
              fontWeight="500"
            >
              -$2.5B invested
            </text>
          </g>
        )}

        {/* Timeline total arrow */}
        <line x1={leftMargin} y1={height - 8} x2={leftMargin + totalYears * yearScale} y2={height - 8} stroke={colors.accent} strokeWidth="2" />
        <circle cx={leftMargin} cy={height - 8} r="3" fill={colors.accent} />
        <circle cx={leftMargin + totalYears * yearScale} cy={height - 8} r="6" fill={colors.accent} stroke="white" strokeWidth="1.5" />
        <text x={leftMargin + totalYears * yearScale + 10} y={height - 4} fill={colors.accent} fontSize="11" fontWeight="700">
          {totalYears.toFixed(1)}yr
        </text>
      </svg>
    );
  };

  // ============================================================================
  // TWIST VISUALIZATION - Environmental sensitivity overlay
  // ============================================================================
  const TwistVisualization = () => {
    const width = isMobile ? 340 : 560;
    const height = 320;
    const leftMargin = 60;
    const rightMargin = 30;
    const chartWidth = width - leftMargin - rightMargin;

    const normalTimeline = calculateTimeline(permittingSpeed);
    const twistedTotal = calculateTimeline(permittingSpeed, consultationYears + courtChallengeYears);
    const maxYears = Math.max(twistedTotal + 5, 35);
    const yearScale = chartWidth / maxYears;

    const delayAdded = consultationYears + courtChallengeYears;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="twistNormalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="twistDelayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="twistConsultGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="twistCourtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
          <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Environmentally Sensitive Area Impact
        </text>

        {/* Grid */}
        {Array.from({ length: Math.ceil(maxYears / 5) + 1 }, (_, i) => i * 5).map(yr => (
          <g key={`tgrid-${yr}`}>
            <line x1={leftMargin + yr * yearScale} y1={40} x2={leftMargin + yr * yearScale} y2={height - 30} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
            <text x={leftMargin + yr * yearScale} y={38} fill={colors.textMuted} fontSize="11" textAnchor="middle">Yr {yr}</text>
          </g>
        ))}

        {/* Normal timeline bar */}
        <text x={leftMargin - 5} y={68} fill={colors.textSecondary} fontSize="11" textAnchor="end" fontWeight="500">Normal</text>
        <rect x={leftMargin} y={55} width={normalTimeline * yearScale} height={24} rx="4" fill="url(#twistNormalGrad)" opacity="0.8" />
        <text x={leftMargin + normalTimeline * yearScale / 2} y={71} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">{normalTimeline.toFixed(1)} years</text>
        <circle cx={leftMargin + normalTimeline * yearScale} cy={67} r="7" fill={colors.success} stroke="white" strokeWidth="2" filter="url(#twistGlow)" />

        {/* Twisted timeline bar */}
        <text x={leftMargin - 5} y={118} fill={colors.textSecondary} fontSize="11" textAnchor="end" fontWeight="500">Sensitive</text>
        {/* Base portion */}
        <rect x={leftMargin} y={105} width={normalTimeline * yearScale} height={24} rx="4" fill="url(#twistNormalGrad)" opacity="0.5" />
        {/* Consultation delay */}
        <rect
          x={leftMargin + normalTimeline * yearScale}
          y={105}
          width={consultationYears * yearScale}
          height={24}
          rx="0"
          fill="url(#twistConsultGrad)"
          opacity="0.85"
        />
        <text
          x={leftMargin + normalTimeline * yearScale + consultationYears * yearScale / 2}
          y={121}
          fill="white"
          fontSize="11"
          textAnchor="middle"
          fontWeight="600"
        >
          +{consultationYears}yr consult
        </text>
        {/* Court delay */}
        <rect
          x={leftMargin + (normalTimeline + consultationYears) * yearScale}
          y={105}
          width={courtChallengeYears * yearScale}
          height={24}
          rx="4"
          fill="url(#twistCourtGrad)"
          opacity="0.85"
        />
        <text
          x={leftMargin + (normalTimeline + consultationYears) * yearScale + courtChallengeYears * yearScale / 2}
          y={121}
          fill="white"
          fontSize="11"
          textAnchor="middle"
          fontWeight="600"
        >
          +{courtChallengeYears}yr court
        </text>
        <circle cx={leftMargin + twistedTotal * yearScale} cy={117} r="7" fill={colors.error} stroke="white" strokeWidth="2" filter="url(#twistGlow)" />

        {/* Delay annotation */}
        <line x1={leftMargin + normalTimeline * yearScale} y1={90} x2={leftMargin + normalTimeline * yearScale} y2={140} stroke={colors.error} strokeDasharray="3,3" opacity="0.6" />
        <text x={leftMargin + (normalTimeline + delayAdded / 2) * yearScale} y={155} fill={colors.error} fontSize="11" textAnchor="middle" fontWeight="700">
          +{delayAdded} years delay
        </text>

        {/* Cost impact */}
        <text x={width / 2} y={185} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">
          Additional Cost: ~${(delayAdded * 150).toFixed(0)}M in delays
        </text>

        {/* Risk meter */}
        <text x={width / 2} y={210} fill={colors.textMuted} fontSize="11" textAnchor="middle">Project Cancellation Risk</text>
        <rect x={leftMargin + 20} y={220} width={chartWidth - 40} height={14} rx="7" fill={colors.border} />
        <rect
          x={leftMargin + 20}
          y={220}
          width={(chartWidth - 40) * Math.min(1, (delayAdded / 15))}
          height={14}
          rx="7"
          fill={delayAdded > 10 ? colors.error : delayAdded > 5 ? colors.warning : colors.success}
          filter={delayAdded > 8 ? 'url(#twistGlow)' : undefined}
        />
        <circle
          cx={leftMargin + 20 + (chartWidth - 40) * Math.min(1, (delayAdded / 15))}
          cy={227}
          r="6"
          fill={delayAdded > 10 ? colors.error : colors.warning}
          stroke="white"
          strokeWidth="1.5"
        />
        <text
          x={width / 2}
          y={250}
          fill={delayAdded > 10 ? colors.error : delayAdded > 5 ? colors.warning : colors.success}
          fontSize="11"
          textAnchor="middle"
          fontWeight="700"
        >
          {delayAdded > 10 ? 'VERY HIGH — Project likely cancelled' : delayAdded > 5 ? 'HIGH — Significant risk of cancellation' : 'MODERATE — Delays manageable'}
        </text>

        {/* Legend */}
        <g>
          <rect x={leftMargin} y={height - 25} width="12" height="12" rx="2" fill="url(#twistNormalGrad)" />
          <text x={leftMargin + 16} y={height - 15} fill={colors.textMuted} fontSize="11">Normal timeline</text>
          <rect x={leftMargin + 110} y={height - 25} width="12" height="12" rx="2" fill="url(#twistConsultGrad)" />
          <text x={leftMargin + 126} y={height - 15} fill={colors.textMuted} fontSize="11">Consultation</text>
          <rect x={leftMargin + 210} y={height - 25} width="12" height="12" rx="2" fill="url(#twistCourtGrad)" />
          <text x={leftMargin + 226} y={height - 15} fill={colors.textMuted} fontSize="11">Court challenges</text>
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
            ⏳⛏️
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Mining Bottleneck
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            "The world wants <span style={{ color: colors.accent }}>electric vehicles tomorrow</span>, but the mines needed to supply them take <span style={{ color: colors.hot }}>15-20 years</span> to build. This is the bottleneck that nobody talks about."
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
              "You can't just snap your fingers and produce a mine. From initial discovery to first production is typically 15 to 20 years. The permitting process alone can take a decade. The green energy transition requires minerals that simply cannot be produced on the timeline politicians promise."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Mining Industry Analysis
            </p>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '500px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
              In this game, you'll discover why the time between finding minerals and mining them creates one of the most critical supply chain bottlenecks in the global economy.
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
      { id: 'a', text: '2-3 years — modern technology makes it fast' },
      { id: 'b', text: '5-7 years — about the same as building a factory' },
      { id: 'c', text: '15-20 years — a generation-long pipeline of studies, permits, and construction' },
      { id: 'd', text: 'Less than 1 year — just start digging' },
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
              From discovery to first ore production, how long does an average mine take?
            </h2>

            {/* Static SVG showing mine timeline concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictTimeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Mine Development Pipeline</text>
                <text x="40" y="55" fill="#3B82F6" fontSize="11">Discovery</text>
                <circle cx="40" cy="80" r="8" fill="#3B82F6" filter="url(#predictGlow)" />
                <line x1="48" y1="80" x2="352" y2="80" stroke="url(#predictTimeGrad)" strokeWidth="3" strokeDasharray="8,4" />
                <text x="360" y="55" fill="#10B981" fontSize="11" textAnchor="end">First Ore</text>
                <circle cx="360" cy="80" r="8" fill="#10B981" filter="url(#predictGlow)" />
                <text x="200" y="75" textAnchor="middle" fill={colors.accent} fontSize="24" fontWeight="800">??? years</text>
                <text x="200" y="120" textAnchor="middle" fill={colors.textMuted} fontSize="11">Exploration → Studies → Permits → Build → Produce</text>
                <text x="200" y="145" textAnchor="middle" fill={colors.textMuted} fontSize="11">Billions of dollars spent before any revenue</text>
                <rect x="60" y="155" width="280" height="12" rx="6" fill={colors.border} />
                <rect x="60" y="155" width="50" height="12" rx="6" fill="#EF4444" opacity="0.7" />
                <text x="200" y="164" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Cash flow deeply negative for years</text>
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

  // PLAY PHASE - Mine Timeline Simulator
  if (phase === 'play') {
    const breakEvenYear = totalTimeline + (2500 / 400);

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
              Mine Timeline Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> The mining bottleneck is the hidden constraint behind every critical mineral supply chain. When demand for lithium, copper, or rare earths surges, the 15-20 year development pipeline means supply cannot respond — creating price spikes, geopolitical competition, and project delays across the entire green energy transition.
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
                <strong style={{ color: colors.textPrimary }}>Mining Bottleneck</strong> is the structural delay between mineral discovery and production, typically 15-20 years, that prevents supply from responding quickly to demand signals.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Permitting Timeline</strong> refers to the multi-year process of environmental assessments, government approvals, public consultations, and legal reviews required before construction can begin.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.hot }}>Cash Flow Valley</strong> describes the period of 10+ years where a mining project consumes billions in capital before generating any revenue.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows the complete mine development Gantt chart and cash flow curve. Adjust the permitting speed slider to see how regulatory timelines impact the total supply response time. Notice how the cash flow remains deeply negative for over a decade.
            </p>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '4px' }}>Timeline equation:</p>
              <p style={{ ...typo.body, color: colors.accent, fontWeight: 600, margin: 0 }}>
                T_total = T_explore + T_estimate + T_feasibility + T_permit + T_construct + T_rampup = {totalTimeline.toFixed(1)} years
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '4px' }}>
                Break-even year = T_total + CAPEX ÷ Annual Revenue = {(totalTimeline + 2500/400).toFixed(1)} years
              </p>
            </div>

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
                    <GanttChartVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Permitting Speed slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Permitting Speed</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {permittingSpeed} years ({permittingSpeed <= 2 ? 'Fast-tracked' : permittingSpeed <= 4 ? 'Average' : 'Slow bureaucracy'})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={permittingSpeed}
                      onChange={(e) => setPermittingSpeed(parseFloat(e.target.value))}
                      onInput={(e) => setPermittingSpeed(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Permitting Speed"
                      style={sliderStyle(colors.accent, permittingSpeed, 1, 5)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>1yr (fast-track)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>3yr (typical)</span>
                      <span style={{ ...typo.small, color: colors.error }}>5yr (complex)</span>
                    </div>
                  </div>

                  {/* Toggle cash flow */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => setShowCashFlow(!showCashFlow)}
                      style={{
                        background: showCashFlow ? `${colors.accent}22` : colors.bgSecondary,
                        border: `1px solid ${showCashFlow ? colors.accent : colors.border}`,
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        minHeight: '44px',
                      }}
                    >
                      {showCashFlow ? 'Hide' : 'Show'} Cash Flow Curve
                    </button>
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
                  <div style={{ ...typo.h3, color: colors.accent }}>{totalTimeline.toFixed(1)}yr</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Total Timeline</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.error }}>-$2.5B</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Peak Negative CF</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>Yr {breakEvenYear.toFixed(0)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Break-even</div>
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
              Why Mines Take 15-20 Years
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — as you saw in the experiment, the mine development pipeline takes 15-20 years from discovery to first ore production.'
                : 'As you saw in the experiment, the full mine development pipeline stretches across 15-20 years. Your prediction may have underestimated the result — each phase must be completed before the next can begin, and there are no shortcuts.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The 6-Stage Pipeline:</strong>
                </p>
                {minePhases.map((mp, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: mp.color,
                      flexShrink: 0,
                    }} />
                    <div>
                      <span style={{ color: mp.color, fontWeight: 600 }}>{mp.name}</span>
                      <span style={{ color: colors.textMuted }}> ({mp.minYears}-{mp.maxYears} years) — {mp.description}</span>
                    </div>
                  </div>
                ))}
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
                The Supply Response Problem
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                When commodity prices spike, the mining industry cannot respond quickly. A mine discovered today in response to high lithium prices will not produce its first ore until the late 2040s. This creates structural supply deficits that market forces alone cannot solve — the bottleneck is time itself.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                The Cash Flow Valley of Death
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Mining projects consume billions in capital for 10-15 years before generating a single dollar of revenue. This "valley of death" requires patient investors willing to tie up enormous capital with no near-term returns. Most projects fail to cross this valley — not because of geology, but because of financing.
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
      { id: 'a', text: 'Mining proceeds normally — critical minerals override environmental concerns' },
      { id: 'b', text: 'Permitting timeline extends by 10+ years or the project dies entirely due to consultation requirements and court challenges' },
      { id: 'c', text: 'Only a 6-month delay — environmental reviews are just paperwork' },
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
                New Variable: Environmentally Sensitive Area
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              When a lithium deposit is found on sacred indigenous land near an ecologically sensitive watershed, what happens to the mining timeline?
            </h2>

            {/* Static SVG showing sensitive area */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="sensitiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#DC2626" />
                  </linearGradient>
                  <filter id="sensitiveGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Critical Mineral vs. Sacred Land</text>
                {/* Mountain/land */}
                <path d="M 50 100 L 120 40 L 160 70 L 220 30 L 280 65 L 350 100 Z" fill="#2a4a2a" stroke="#4ade80" strokeWidth="1" opacity="0.6" />
                {/* Sacred marker */}
                <circle cx="200" cy="55" r="12" fill="url(#sensitiveGrad)" filter="url(#sensitiveGlow)" />
                <text x="200" y="60" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">!</text>
                {/* Labels */}
                <text x="120" y="120" textAnchor="middle" fill="#4ade80" fontSize="11">Sacred Indigenous Land</text>
                <text x="300" y="120" textAnchor="middle" fill="#EF4444" fontSize="11">Lithium Deposit</text>
                <text x="200" y="135" textAnchor="middle" fill={colors.textMuted} fontSize="11">Environmental and cultural protections apply</text>
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
                See the Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Sensitive Area Impact Simulator
  if (phase === 'twist_play') {
    const totalDelay = consultationYears + courtChallengeYears;
    const additionalCost = totalDelay * 150; // $M per year of delay

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
              Sensitive Area Impact Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Explore how indigenous consultation and court challenges extend the mining timeline
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
                    <TwistVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> The comparison chart shows how a normal mine timeline stretches dramatically when the deposit sits on environmentally sensitive or indigenous land, adding years of mandatory consultation and potential court battles.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> As you increase the consultation period and court challenge duration with the sliders below, watch how the total project timeline and cancellation risk escalate — revealing why many sensitive-area mining projects are ultimately abandoned.</p>
                  </div>

                  {/* Consultation years slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Indigenous Consultation Period</span>
                      <span style={{ ...typo.small, color: '#DC2626', fontWeight: 600 }}>{consultationYears} years</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={consultationYears}
                      onChange={(e) => setConsultationYears(parseInt(e.target.value))}
                      onInput={(e) => setConsultationYears(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Consultation period"
                      style={sliderStyle('#DC2626', consultationYears, 1, 10)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>1yr (cooperative)</span>
                      <span style={{ ...typo.small, color: colors.error }}>10yr (contested)</span>
                    </div>
                  </div>

                  {/* Court challenge years slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Court Challenge Duration</span>
                      <span style={{ ...typo.small, color: '#991B1B', fontWeight: 600 }}>{courtChallengeYears} years</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={courtChallengeYears}
                      onChange={(e) => setCourtChallengeYears(parseInt(e.target.value))}
                      onInput={(e) => setCourtChallengeYears(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Court challenge duration"
                      style={sliderStyle('#991B1B', courtChallengeYears, 0, 8)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0yr (no challenge)</span>
                      <span style={{ ...typo.small, color: colors.error }}>8yr (Supreme Court)</span>
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
                  <div style={{ ...typo.h3, color: colors.error }}>+{totalDelay} years</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Additional Delay</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{twistedTimeline.toFixed(1)}yr</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>New Total Timeline</div>
                </div>
              </div>

              {/* Impact warning */}
              <div style={{
                background: totalDelay > 8 ? `${colors.error}22` : `${colors.warning}22`,
                border: `1px solid ${totalDelay > 8 ? colors.error : colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  Impact of environmental sensitivity:
                </p>
                <div style={{
                  ...typo.h2,
                  color: totalDelay > 8 ? colors.error : colors.warning
                }}>
                  +${additionalCost}M in delay costs
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  {totalDelay > 10 ? 'Project will almost certainly be abandoned — investors will not wait this long.' :
                   totalDelay > 6 ? 'High risk of project cancellation — financing becomes extremely difficult.' :
                   'Manageable delays but significantly impacts project economics.'}
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
              Understand the Full Picture
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
              The Human Dimension of Mining Bottlenecks
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Social License to Operate</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Technical permits are only half the equation. A mine also needs "social license" — the acceptance and trust of local communities, indigenous peoples, and the broader public. Without it, even fully permitted projects can be stopped by protests, legal challenges, and political pressure. Resolution Copper (Arizona) and Jadar (Serbia) both had technical approvals but were blocked by social opposition.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Free, Prior, and Informed Consent (FPIC)</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Under the UN Declaration on the Rights of Indigenous Peoples, projects on or near indigenous lands require FPIC — meaningful consultation with the right to say no. This is not just a regulatory checkbox; it represents a fundamental right of indigenous communities to control their traditional territories. Many of the world's richest mineral deposits sit on indigenous lands.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Unsolvable Tension</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The green energy transition requires massive amounts of lithium, cobalt, copper, nickel, and rare earths. But extracting these minerals often means disturbing pristine environments and sacred lands. There is no easy answer — both the climate crisis and indigenous rights are urgent moral imperatives. This tension is at the heart of the mining bottleneck.
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
              See Real-World Cases
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
        conceptName="E L O N_ Mining Bottleneck"
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
              Real-World Mining Bottlenecks
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each case study to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Case Study {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Connection to Mining Bottleneck:</p>
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
                      // Auto-advance to next uncompleted app or test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > idx);
                      const anyUncompleted = newCompleted.findIndex((c) => !c);
                      if (nextUncompleted !== -1) {
                        setSelectedApp(nextUncompleted);
                      } else if (anyUncompleted !== -1) {
                        setSelectedApp(anyUncompleted);
                      } else {
                        // All apps completed — auto-advance to test
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
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand the mining bottleneck and its impact on critical mineral supply chains!' : 'Review the mine development pipeline concepts and try again.'}
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
              Knowledge Test: Mining Bottleneck
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of the mine development pipeline, permitting challenges, and the structural constraints that create critical mineral supply bottlenecks. Consider the full timeline from discovery to production, the role of social license, and the financial realities of mine development.
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
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Mining Bottleneck Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why new mines take 15-20 years, how permitting and social license create bottlenecks, and why the green energy transition faces fundamental supply constraints.
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
                'Mine development takes 15-20 years from discovery to production',
                'Permitting alone can take 3-7+ years across multiple agencies',
                'Social license and FPIC can delay or kill projects',
                'Cash flow stays negative for 10+ years before break-even',
                'The bottleneck creates structural supply deficits that price signals alone cannot solve',
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

export default ELON_MiningBottleneckRenderer;
