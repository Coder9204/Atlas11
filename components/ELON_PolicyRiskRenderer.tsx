'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON POLICY RISK - Complete 10-Phase Game
// Regulatory and policy risk — government policies create uncertainty
// affecting project viability, stranded assets, and investment decisions
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

interface Props {
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
    setTimeout(() => audioContext.close(), 1000);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions: {
  scenario: string;
  question: string;
  options: { id: string; label: string; correct?: boolean }[];
  explanation: string;
}[] = [
  {
    scenario: 'A utility invests $2B in a coal plant with a 40-year design life. Five years later, a new government introduces a carbon tax of $50/ton.',
    question: 'What is the primary financial risk the utility faces?',
    options: [
      { id: 'a', label: 'Stranded asset risk — the plant becomes uneconomic before capital is recovered', correct: true },
      { id: 'b', label: 'No risk — grandfathering provisions always protect existing assets' },
      { id: 'c', label: 'The carbon tax will be repealed immediately' },
      { id: 'd', label: 'Fuel costs increase but profitability is unchanged' }
    ],
    explanation: 'A $50/ton carbon tax adds roughly $100M/year to operating costs for a large coal plant. If the plant cannot pass costs to customers, it becomes a stranded asset — billions in unrecoverable capital.'
  },
  {
    scenario: 'A solar developer models a 30-year project assuming the Investment Tax Credit (ITC) will be available. The ITC currently provides a 30% federal tax credit.',
    question: 'How should the developer account for policy risk in financial models?',
    options: [
      { id: 'a', label: 'Ignore policy risk — tax credits are permanent' },
      { id: 'b', label: 'Apply a higher discount rate to cash flows dependent on policy continuation', correct: true },
      { id: 'c', label: 'Assume the credit doubles over time' },
      { id: 'd', label: 'Only model the first 5 years' }
    ],
    explanation: 'Policy-dependent cash flows carry additional uncertainty. A risk premium of 2-5% is typically added to the discount rate for revenues contingent on policy continuation, reflecting the probability of adverse policy changes.'
  },
  {
    scenario: 'An oil company lobbies against renewable energy mandates. The lobbying costs $20M per year but potentially delays regulations that would cost $500M annually.',
    question: 'What is the "lobbying ROI" concept illustrated here?',
    options: [
      { id: 'a', label: 'Lobbying always has negative returns' },
      { id: 'b', label: 'The expected return on lobbying expenditure — delaying $500M cost at $20M spend is a 25:1 ratio', correct: true },
      { id: 'c', label: 'Lobbying has no measurable financial impact' },
      { id: 'd', label: 'The $20M is a sunk cost with no return' }
    ],
    explanation: 'Studies show lobbying can deliver extraordinary ROI. If $20M delays $500M in costs by even one year, the return is 2,400%. This creates powerful incentives for regulatory capture, where industries shape the rules meant to govern them.'
  },
  {
    scenario: 'The EU introduces the Carbon Border Adjustment Mechanism (CBAM), taxing imports based on their embedded carbon content.',
    question: 'What is the primary purpose of CBAM?',
    options: [
      { id: 'a', label: 'To raise government revenue' },
      { id: 'b', label: 'To prevent carbon leakage — stopping companies from relocating to avoid carbon costs', correct: true },
      { id: 'c', label: 'To subsidize European manufacturers' },
      { id: 'd', label: 'To ban all imported goods' }
    ],
    explanation: 'CBAM prevents "carbon leakage" where producers move to jurisdictions without carbon pricing. By taxing imports based on carbon content, it levels the playing field between domestic producers paying carbon costs and foreign competitors who do not.'
  },
  {
    scenario: 'A wind farm receives permits under the National Environmental Policy Act (NEPA). The review process takes 4.5 years.',
    question: 'Why does NEPA review create policy risk for energy projects?',
    options: [
      { id: 'a', label: 'NEPA reviews are always completed quickly' },
      { id: 'b', label: 'Extended review timelines increase costs, allow policy changes during approval, and create litigation risk', correct: true },
      { id: 'c', label: 'NEPA only applies to fossil fuel projects' },
      { id: 'd', label: 'The environmental review guarantees project approval' }
    ],
    explanation: 'NEPA reviews averaging 4.5 years create compounding risks: construction costs escalate, market conditions shift, and policies can change mid-review. Each year of delay can add 5-10% to project costs through inflation, interest, and opportunity cost.'
  },
  {
    scenario: 'A state implements a Renewable Portfolio Standard (RPS) requiring 50% renewable electricity by 2030. A new governor who opposes the mandate takes office in 2026.',
    question: 'What protection do "grandfathering" provisions offer existing projects?',
    options: [
      { id: 'a', label: 'No protection — all projects are immediately affected' },
      { id: 'b', label: 'Existing contracts and projects completed under the old policy retain their benefits, but new investment freezes', correct: true },
      { id: 'c', label: 'The new governor cannot change any energy policy' },
      { id: 'd', label: 'Grandfathering doubles existing subsidies' }
    ],
    explanation: 'Grandfathering protects vested interests — signed PPAs and operating projects typically retain benefits. However, new investment freezes because developers cannot secure financing without policy certainty, creating a "cliff" effect at the grandfathering boundary.'
  },
  {
    scenario: 'SpaceX needs FAA launch licenses for Starship testing at Boca Chica, Texas. Environmental reviews and license modifications take 6+ months each.',
    question: 'How does regulatory delay affect innovation timelines?',
    options: [
      { id: 'a', label: 'Delays have no impact on innovation' },
      { id: 'b', label: 'Each licensing delay pushes back iterative testing cycles, compounding development timelines and increasing burn rate', correct: true },
      { id: 'c', label: 'Regulatory delays improve safety without any cost' },
      { id: 'd', label: 'Companies can ignore licensing requirements' }
    ],
    explanation: 'SpaceX iterative "test, fail, fix, retest" approach requires rapid turnaround. A 6-month licensing delay between each test flight transforms a 2-year development timeline into 5+ years, increasing capital costs by billions while competitors advance.'
  },
  {
    scenario: 'Tesla earned $1.7 billion in 2023 from selling Zero Emission Vehicle (ZEV) regulatory credits to other automakers.',
    question: 'What risk does Tesla face from ZEV credit revenue?',
    options: [
      { id: 'a', label: 'ZEV credits will always be available at current prices' },
      { id: 'b', label: 'As competitors produce their own EVs, credit supply increases and prices drop — revenue is policy-dependent and self-defeating', correct: true },
      { id: 'c', label: 'ZEV credit revenue will increase indefinitely' },
      { id: 'd', label: 'Only Tesla can earn ZEV credits' }
    ],
    explanation: 'ZEV credits are a self-defeating revenue source: they incentivize competitors to build EVs, which increases credit supply and collapses prices. Tesla credit revenue has already declined as legacy automakers ramp EV production. The revenue depends entirely on state-level mandates that vary politically.'
  },
  {
    scenario: 'A developing nation offers a 20-year tax holiday to attract foreign direct investment in a $5B LNG terminal. After 8 years, a new administration revokes the tax holiday.',
    question: 'What concept describes the risk of government promise reversal?',
    options: [
      { id: 'a', label: 'Market risk' },
      { id: 'b', label: 'Sovereign policy risk or political risk — the government reneges on commitments made by a prior administration', correct: true },
      { id: 'c', label: 'Currency risk' },
      { id: 'd', label: 'Technology risk' }
    ],
    explanation: 'Sovereign policy risk is the risk that a government reverses commitments. No government can legally bind its successors, so long-horizon investments face inherent risk of policy reversal. Political risk insurance and bilateral investment treaties partially mitigate this, but at significant cost.'
  },
  {
    scenario: 'An industry group argues that proposed emissions regulations will cost $100B and destroy 500,000 jobs. Independent analysis shows the cost is $15B with net job creation.',
    question: 'What is "regulatory capture" in this context?',
    options: [
      { id: 'a', label: 'When regulators enforce rules too strictly' },
      { id: 'b', label: 'When industry influences the regulatory process to shape rules in its favor, including inflating compliance cost estimates', correct: true },
      { id: 'c', label: 'When government nationalizes an industry' },
      { id: 'd', label: 'When regulations work perfectly as intended' }
    ],
    explanation: 'Regulatory capture occurs when regulated industries dominate the regulatory process. Inflating compliance costs is a common tactic — industry estimates average 3-10x higher than actual costs. The Clean Air Act was projected to cost $25B but actual costs were $8B while benefits exceeded $1.3T.'
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F1FA}\u{1F1F8}',
    title: 'IRA $369B Energy Incentives',
    short: 'Inflation Reduction Act — largest US climate investment',
    tagline: 'America bets $369 billion on clean energy',
    description: 'The Inflation Reduction Act of 2022 allocated $369B for energy security and climate change programs over 10 years. It includes production tax credits, investment tax credits, and direct-pay provisions for clean energy. However, as the largest single piece of energy legislation, it faces ongoing political contestation — future administrations may attempt partial repeal, creating policy uncertainty for projects with 20-30 year lifespans.',
    connection: 'Policy risk is directly quantifiable: if the IRA tax credits were repealed, solar project returns would drop 30-40%, stranding billions in capital currently under construction.',
    howItWorks: 'Tax credits reduce the effective cost of clean energy installations, making projects financially viable that would otherwise not meet return thresholds.',
    stats: [
      { value: '$369B', label: 'Total allocation', icon: '\u{1F4B5}' },
      { value: '10yr', label: 'Policy horizon', icon: '\u{1F4C5}' },
      { value: 'Contested', label: 'Political status', icon: '\u{2696}\u{FE0F}' }
    ],
    examples: ['Solar ITC', 'Wind PTC', 'EV credits', 'Battery manufacturing'],
    companies: ['NextEra Energy', 'First Solar', 'Tesla', 'Rivian'],
    futureImpact: 'Bipartisan lock-in may occur as red-state jobs depend on IRA investments.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F1EA}\u{1F1FA}',
    title: 'EU Carbon Border Adjustment',
    short: 'CBAM — preventing carbon leakage through border taxes',
    tagline: 'The EU prices carbon at the border',
    description: 'The EU Carbon Border Adjustment Mechanism (CBAM) imposes a carbon price on imported goods based on their embedded emissions. It targets steel, aluminum, cement, fertilizers, electricity, and hydrogen. Phased in from 2023-2026, it prevents "carbon leakage" where production moves to jurisdictions without carbon pricing. CBAM creates policy risk for trading partners who must now internalize carbon costs or face tariffs.',
    connection: 'CBAM illustrates how one jurisdiction policy change cascades globally — EU policy forces carbon accounting on every exporting nation.',
    howItWorks: 'Importers must purchase CBAM certificates matching the carbon price difference between the EU ETS and the origin country carbon price.',
    stats: [
      { value: 'Carbon', label: 'Border tax type', icon: '\u{1F30D}' },
      { value: 'Phased', label: 'Implementation', icon: '\u{1F4CA}' },
      { value: 'Trade', label: 'Global impact', icon: '\u{1F6A2}' }
    ],
    examples: ['Steel imports', 'Cement imports', 'Aluminum trade', 'Fertilizer supply chains'],
    companies: ['ArcelorMittal', 'HeidelbergCement', 'Norsk Hydro', 'Yara International'],
    futureImpact: 'Other nations may adopt similar mechanisms, creating a global carbon price floor.',
    color: '#10B981'
  },
  {
    icon: '\u{1F697}',
    title: 'Tesla Regulatory Credits',
    short: 'Revenue dependent on ZEV mandate policies',
    tagline: '$1.7B/year from selling compliance to competitors',
    description: 'Tesla earns revenue by selling Zero Emission Vehicle (ZEV) regulatory credits to automakers that cannot meet state-level EV mandates. In 2023, this contributed $1.7B in near-pure-profit revenue. However, this revenue stream is doubly policy-dependent: it requires ZEV mandates to exist AND competitors to need credits. As legacy automakers build their own EVs, credit demand drops — making Tesla credit revenue a wasting asset tied entirely to regulatory architecture.',
    connection: 'Tesla credit revenue demonstrates how policy creates and destroys value: mandates created the market, but competitor compliance will collapse it.',
    howItWorks: 'States with ZEV mandates require automakers to earn credits proportional to sales. Those who cannot meet quotas buy credits from those who exceed them.',
    stats: [
      { value: '$1.7B/yr', label: 'Credit revenue', icon: '\u{1F4B0}' },
      { value: 'ZEV', label: 'Mandate type', icon: '\u{26A1}' },
      { value: 'State', label: 'Jurisdiction', icon: '\u{1F3DB}\u{FE0F}' }
    ],
    examples: ['California ZEV mandate', 'Section 177 states', 'EU CO2 fleet targets', 'China NEV credits'],
    companies: ['Tesla', 'Stellantis', 'Toyota', 'General Motors'],
    futureImpact: 'Credit prices will approach zero as all automakers achieve compliance independently.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX FAA Licensing',
    short: 'Launch licensing delays throttle innovation velocity',
    tagline: 'Bureaucracy at the speed of rockets',
    description: 'SpaceX Starship development at Boca Chica, Texas requires FAA launch licenses and environmental assessments for each test campaign. License modifications and environmental reviews routinely take 6+ months, while SpaceX iterative development methodology requires rapid test-fail-fix cycles. The mismatch between regulatory cadence and innovation velocity adds billions in delays and opportunity cost. Environmental review under NEPA adds further uncertainty as court challenges can freeze operations.',
    connection: 'FAA licensing illustrates the tension between precautionary regulation and innovation speed — each delay compounds through the development timeline.',
    howItWorks: 'Each launch attempt requires FAA authorization. Major vehicle changes require license modifications with new environmental review.',
    stats: [
      { value: '6mo+', label: 'Review delays', icon: '\u{23F3}' },
      { value: 'NEPA', label: 'Environmental law', icon: '\u{1F4DC}' },
      { value: 'Boca Chica', label: 'Test site', icon: '\u{1F4CD}' }
    ],
    examples: ['Starship testing', 'Falcon 9 cadence', 'Crew Dragon certification', 'Starlink constellation'],
    companies: ['SpaceX', 'Blue Origin', 'Rocket Lab', 'ULA'],
    futureImpact: 'Streamlined licensing may move launches to less regulated international sites.',
    color: '#EF4444'
  }
];

// Policy scenario data for simulation
interface PolicyScenario {
  name: string;
  probability: number;
  npvMultiplier: number;
  color: string;
  label: string;
}

const baseScenarios: PolicyScenario[] = [
  { name: 'Favorable', probability: 0.30, npvMultiplier: 1.25, color: '#10B981', label: 'Supportive policy' },
  { name: 'Neutral', probability: 0.40, npvMultiplier: 1.00, color: '#F59E0B', label: 'Status quo' },
  { name: 'Hostile', probability: 0.20, npvMultiplier: 0.60, color: '#EF4444', label: 'Adverse policy' },
  { name: 'Reversal', probability: 0.10, npvMultiplier: 0.30, color: '#7C3AED', label: 'Full reversal' }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_PolicyRiskRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state — Policy Stability Index
  const [stabilityIndex, setStabilityIndex] = useState(50);
  const [baseProjectNPV] = useState(100); // $100M base NPV
  const [projectHorizon] = useState(30); // 30-year project

  // Election twist state
  const [electionTriggered, setElectionTriggered] = useState(false);
  const [priorGovernment] = useState<'supportive' | 'neutral' | 'hostile'>('supportive');
  const [newGovernment, setNewGovernment] = useState<'supportive' | 'neutral' | 'hostile'>('hostile');

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

  // Calculate policy-adjusted NPV
  const calculateAdjustedNPV = (stability: number) => {
    const reversalProb = Math.max(0.05, 0.50 - (stability / 100) * 0.45);
    const discountPremium = (1 - stability / 100) * 0.05;
    const baseDiscount = 0.08;
    const totalDiscount = baseDiscount + discountPremium;
    let npv = 0;
    for (let yr = 1; yr <= projectHorizon; yr++) {
      const survivalProb = Math.pow(1 - reversalProb / projectHorizon, yr);
      npv += (baseProjectNPV / projectHorizon) * survivalProb / Math.pow(1 + totalDiscount, yr);
    }
    return npv;
  };

  // Get scenario probabilities adjusted by stability
  const getAdjustedScenarios = (stability: number): PolicyScenario[] => {
    const favorableBias = stability / 100;
    return baseScenarios.map(s => {
      let adjProb = s.probability;
      if (s.name === 'Favorable') adjProb = s.probability * (0.5 + favorableBias);
      if (s.name === 'Neutral') adjProb = s.probability;
      if (s.name === 'Hostile') adjProb = s.probability * (1.5 - favorableBias);
      if (s.name === 'Reversal') adjProb = s.probability * (2 - favorableBias * 1.8);
      return { ...s, probability: Math.max(0.02, adjProb) };
    });
  };

  // Normalize probabilities
  const normalizeScenarios = (scenarios: PolicyScenario[]): PolicyScenario[] => {
    const total = scenarios.reduce((s, sc) => s + sc.probability, 0);
    return scenarios.map(s => ({ ...s, probability: s.probability / total }));
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#b0bec5',
    border: '#2a2a3a',
    favorable: '#10B981',
    hostile: '#EF4444',
    policy: '#8B5CF6',
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
        gameType: 'elon-policy-risk',
        gameTitle: 'Policy Risk',
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

  // Computed values
  const adjustedNPV = calculateAdjustedNPV(stabilityIndex);
  const scenarios = normalizeScenarios(getAdjustedScenarios(stabilityIndex));
  const expectedValue = scenarios.reduce((sum, s) => sum + s.probability * s.npvMultiplier * baseProjectNPV, 0);
  const discountPremium = ((1 - stabilityIndex / 100) * 5).toFixed(1);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.policy})`,
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
            padding: '4px 0',
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.policy})`,
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

  // ---------------------------------------------------------------------------
  // DECISION TREE SVG VISUALIZATION
  // ---------------------------------------------------------------------------
  const DecisionTreeVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 410;
    const stabilityNorm = stabilityIndex / 100;

    const s = normalizeScenarios(getAdjustedScenarios(stabilityIndex));
    const npvValues = s.map(sc => sc.npvMultiplier * baseProjectNPV);
    const ev = s.reduce((sum, sc) => sum + sc.probability * sc.npvMultiplier * baseProjectNPV, 0);

    const cx = width / 2;
    const rootY = 50;
    const midY = 140;
    const leafY = 260;
    const branchXs = s.map((_, i) => 40 + (i * (width - 80)) / (s.length - 1));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="policyGradFav" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="policyGradNeu" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="policyGradHos" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <linearGradient id="policyGradRev" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="treeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          <linearGradient id="evBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
          </filter>
          <radialGradient id="rootGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.4)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </radialGradient>
          <filter id="textShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.8)" />
          </filter>
          <linearGradient id="stabilityBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <clipPath id="barClip">
            <rect x={40} y={345} width={(width - 80) * stabilityNorm} height={14} rx="7" />
          </clipPath>
          <filter id="branchGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Background grid pattern */}
        <rect width={width} height={height} fill="url(#gridPattern)" />

        {/* Grid lines */}
        <line x1="30" y1={rootY} x2={width - 30} y2={rootY} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1={midY} x2={width - 30} y2={midY} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1={leafY} x2={width - 30} y2={leafY} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={cx} y1="20" x2={cx} y2={leafY + 40} stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={cx} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle" filter="url(#textShadow)">
          Policy Decision Tree &#x2014; Stability: {stabilityIndex}%
        </text>

        {/* Axis labels */}
        <text x={14} y={200} fill={colors.textMuted} fontSize="11" fontWeight="500" textAnchor="middle">Concentration of Probability</text>
        <text x={cx} y={leafY + 64} fill={colors.textMuted} fontSize="11" fontWeight="500" textAnchor="middle">Policy Scenario Intensity</text>

        {/* Root glow */}
        <circle cx={cx} cy={rootY} r="30" fill="url(#rootGlow)" />

        {/* Root node */}
        <circle cx={cx} cy={rootY} r="16" fill="url(#treeGrad)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <text x={cx} y={rootY + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">NOW</text>

        {/* Branches from root to scenario nodes */}
        {s.map((scenario, i) => {
          const branchX = branchXs[i];
          const gradIds = ['policyGradFav', 'policyGradNeu', 'policyGradHos', 'policyGradRev'];
          const lineWidth = Math.max(1.5, scenario.probability * 8);

          return (
            <g key={scenario.name}>
              {/* Branch line root to mid */}
              <line
                x1={cx} y1={rootY + 16}
                x2={branchX} y2={midY - 14}
                stroke={scenario.color}
                strokeWidth={lineWidth}
                opacity={0.7}
                filter="url(#branchGlow)"
              />

              {/* Mid node — probability */}
              <rect
                x={branchX - 22} y={midY - 16}
                width="44" height="34" rx="6"
                fill={colors.bgSecondary}
                stroke={scenario.color}
                strokeWidth="1.5"
              />
              <text x={branchX} y={midY - 1} fill={scenario.color} fontSize="11" fontWeight="700" textAnchor="middle">
                {(scenario.probability * 100).toFixed(0)}%
              </text>
              <text x={branchX} y={midY + 14} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                prob
              </text>

              {/* Branch line mid to leaf */}
              <line
                x1={branchX} y1={midY + 18}
                x2={branchX} y2={leafY - 24}
                stroke={scenario.color}
                strokeWidth={lineWidth}
                opacity={0.5}
                strokeDasharray="4,3"
              />

              {/* Leaf node — NPV outcome */}
              <rect
                x={branchX - 30} y={leafY - 24}
                width="60" height="56" rx="8"
                fill={colors.bgSecondary}
                stroke={scenario.color}
                strokeWidth="1.5"
                filter="url(#shadowFilter)"
              />
              <text x={branchX} y={leafY - 7} fill={scenario.color} fontSize="11" fontWeight="600" textAnchor="middle">
                {scenario.name}
              </text>
              <text x={branchX} y={leafY + 8} fill={colors.textPrimary} fontSize="11" fontWeight="700" textAnchor="middle">
                ${npvValues[i].toFixed(0)}M
              </text>
              <text x={branchX} y={leafY + 24} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                NPV
              </text>
            </g>
          );
        })}

        {/* Expected Value bar */}
        <text x={cx} y={leafY + 50} fill={colors.textPrimary} fontSize="12" fontWeight="700" textAnchor="middle">
          Expected Value: ${ev.toFixed(1)}M | Risk Premium: +{discountPremium}%
        </text>

        {/* Stability bar */}
        <rect x={40} y={345} width={width - 80} height={14} rx="7" fill={colors.border} />
        <rect x={40} y={345} width={(width - 80) * stabilityNorm} height={14} rx="7" fill="url(#stabilityBar)" clipPath="url(#barClip)" />
        <circle
          cx={40 + (width - 80) * stabilityNorm}
          cy={352}
          r="6"
          fill={stabilityNorm > 0.6 ? colors.favorable : stabilityNorm > 0.3 ? colors.warning : colors.hostile}
          stroke="white"
          strokeWidth="1.5"
          filter="url(#nodeGlow)"
        />

        {/* Stability labels */}
        <text x={40} y={375} fill={colors.hostile} fontSize="11" fontWeight="500">Volatile</text>
        <text x={cx} y={375} fill={colors.warning} fontSize="11" fontWeight="500" textAnchor="middle">Policy Stability</text>
        <text x={width - 40} y={375} fill={colors.favorable} fontSize="11" fontWeight="500" textAnchor="end">Stable</text>

        {/* Legend */}
        <g>
          <circle cx={40} cy={height - 2} r="4" fill="#10B981" />
          <text x={50} y={height + 2} fill="#a8b8c8" fontSize="11">Favorable</text>
          <circle cx={115} cy={height - 2} r="4" fill="#F59E0B" />
          <text x={125} y={height + 2} fill="#a8b8c8" fontSize="11">Neutral</text>
          <circle cx={180} cy={height - 2} r="4" fill="#EF4444" />
          <text x={190} y={height + 2} fill="#a8b8c8" fontSize="11">Hostile</text>
          <circle cx={240} cy={height - 2} r="4" fill="#7C3AED" />
          <text x={250} y={height + 2} fill="#a8b8c8" fontSize="11">Reversal</text>
        </g>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // ELECTION EVENT SVG VISUALIZATION
  // ---------------------------------------------------------------------------
  const ElectionEventVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 360;
    const govColors: Record<string, string> = { supportive: '#10B981', neutral: '#F59E0B', hostile: '#EF4444' };

    const beforeScenarios = normalizeScenarios(getAdjustedScenarios(80));
    const afterScenarios = normalizeScenarios(getAdjustedScenarios(newGovernment === 'hostile' ? 20 : newGovernment === 'neutral' ? 50 : 80));

    const beforeEV = beforeScenarios.reduce((s, sc) => s + sc.probability * sc.npvMultiplier * baseProjectNPV, 0);
    const afterEV = afterScenarios.reduce((s, sc) => s + sc.probability * sc.npvMultiplier * baseProjectNPV, 0);
    const evDelta = afterEV - beforeEV;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="elecGradBefore" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={govColors[priorGovernment]} />
            <stop offset="100%" stopColor={govColors[priorGovernment]} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="elecGradAfter" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={govColors[newGovernment]} />
            <stop offset="100%" stopColor={govColors[newGovernment]} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="elecTimeline" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={govColors[priorGovernment]} />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor={govColors[newGovernment]} />
          </linearGradient>
          <filter id="elecGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="elecShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.4)" />
          </filter>
          <radialGradient id="electionFlash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(249,115,22,0.5)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </radialGradient>
          <pattern id="elecGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#elecGrid)" />

        {/* Title */}
        <text x={cx()} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Election Event &#x2014; Policy Regime Change
        </text>

        {/* Timeline bar */}
        <rect x={40} y={42} width={width - 80} height={8} rx="4" fill="url(#elecTimeline)" />
        <circle cx={cx()} cy={46} r="12" fill="url(#electionFlash)" />
        <circle cx={cx()} cy={46} r="6" fill="#F59E0B" stroke="white" strokeWidth="1.5" filter="url(#elecGlow)" />
        <text x={cx()} y={68} fill="#F59E0B" fontSize="11" fontWeight="700" textAnchor="middle">ELECTION</text>

        {/* Before column */}
        <rect x={30} y={80} width={cx() - 50} height={130} rx="10" fill={colors.bgSecondary} stroke={govColors[priorGovernment]} strokeWidth="1" filter="url(#elecShadow)" />
        <text x={30 + (cx() - 50) / 2} y={100} fill={govColors[priorGovernment]} fontSize="11" fontWeight="700" textAnchor="middle">
          BEFORE: {priorGovernment.toUpperCase()}
        </text>
        {beforeScenarios.map((sc, i) => {
          const bw = Math.max(10, sc.probability * (cx() - 80));
          return (
            <g key={`before-${i}`}>
              <rect x={40} y={110 + i * 22} width={bw} height={14} rx="4" fill={sc.color} opacity="0.7" />
              <text x={45 + bw} y={121 + i * 22} fill={colors.textMuted} fontSize="11">{sc.name}: {(sc.probability * 100).toFixed(0)}%</text>
            </g>
          );
        })}
        <text x={30 + (cx() - 50) / 2} y={205} fill={colors.textPrimary} fontSize="12" fontWeight="700" textAnchor="middle">
          EV: ${beforeEV.toFixed(0)}M
        </text>

        {/* After column */}
        <rect x={cx() + 20} y={80} width={cx() - 50} height={130} rx="10" fill={colors.bgSecondary} stroke={govColors[newGovernment]} strokeWidth="1" filter="url(#elecShadow)" />
        <text x={cx() + 20 + (cx() - 50) / 2} y={100} fill={govColors[newGovernment]} fontSize="11" fontWeight="700" textAnchor="middle">
          AFTER: {newGovernment.toUpperCase()}
        </text>
        {afterScenarios.map((sc, i) => {
          const bw = Math.max(10, sc.probability * (cx() - 80));
          return (
            <g key={`after-${i}`}>
              <rect x={cx() + 30} y={110 + i * 22} width={bw} height={14} rx="4" fill={sc.color} opacity="0.7" />
              <text x={cx() + 35 + bw} y={121 + i * 22} fill={colors.textMuted} fontSize="11">{sc.name}: {(sc.probability * 100).toFixed(0)}%</text>
            </g>
          );
        })}
        <text x={cx() + 20 + (cx() - 50) / 2} y={205} fill={colors.textPrimary} fontSize="12" fontWeight="700" textAnchor="middle">
          EV: ${afterEV.toFixed(0)}M
        </text>

        {/* Delta indicator */}
        <rect x={cx() - 60} y={225} width={120} height={30} rx="8" fill={evDelta < 0 ? `${colors.error}33` : `${colors.success}33`} stroke={evDelta < 0 ? colors.error : colors.success} strokeWidth="1" />
        <text x={cx()} y={245} fill={evDelta < 0 ? colors.error : colors.success} fontSize="13" fontWeight="700" textAnchor="middle">
          {evDelta >= 0 ? '+' : ''}${evDelta.toFixed(0)}M Impact
        </text>

        {/* Project status indicators */}
        <text x={cx()} y={280} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
          Project Impact Assessment
        </text>

        {[
          { label: 'Grandfathered projects', status: 'Protected', color: colors.favorable, x: 50 },
          { label: 'Under construction', status: evDelta < -10 ? 'At Risk' : 'Uncertain', color: evDelta < -10 ? colors.error : colors.warning, x: cx() - 20 },
          { label: 'New investment', status: evDelta < -5 ? 'Frozen' : 'Caution', color: evDelta < -5 ? colors.error : colors.warning, x: width - 150 },
        ].map((item, i) => (
          <g key={i}>
            <circle cx={item.x} cy={300} r="5" fill={item.color} />
            <text x={item.x + 10} y={297} fill={colors.textSecondary} fontSize="11">{item.label}</text>
            <text x={item.x + 10} y={310} fill={item.color} fontSize="11" fontWeight="600">{item.status}</text>
          </g>
        ))}

        {/* Legend */}
        <rect x={30} y={height - 30} width="10" height="10" rx="2" fill={govColors[priorGovernment]} />
        <text x={45} y={height - 22} fill="#94a3b8" fontSize="11">Prior Gov</text>
        <rect x={110} y={height - 30} width="10" height="10" rx="2" fill={govColors[newGovernment]} />
        <text x={125} y={height - 22} fill="#94a3b8" fontSize="11">New Gov</text>
        <circle cx={195} cy={height - 25} r="4" fill="#F59E0B" />
        <text x={205} y={height - 22} fill="#94a3b8" fontSize="11">Election</text>
      </svg>
    );

    function cx() { return width / 2; }
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
            {'\u{1F4DC}\u{2696}\u{FE0F}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Policy Risk
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;A single election can <span style={{ color: colors.hostile }}>strand billions in assets</span> or <span style={{ color: colors.favorable }}>unlock trillions in investment</span>. How do you build a 30-year project when the rules change every 4?&quot;
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
              &quot;The greatest risk to a 30-year energy project is not technology, not markets, not weather &#x2014; it is the stroke of a pen in a legislature. A change in government can strand billions in assets overnight.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              &#x2014; Energy Policy Risk Assessment
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
      { id: 'a', text: 'Unaffected — the solar farm generates power regardless of tax policy' },
      { id: 'b', text: 'NPV drops 30-40% — policy uncertainty requires a higher discount rate and tax credit loss reduces revenue' },
      { id: 'c', text: 'NPV increases — uncertainty creates opportunity for savvy investors' },
      { id: 'd', text: 'Only affects year 11+ — the first 10 years are locked in' },
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
              A 30-year solar farm depends on a tax credit that expires in 10 years. If not renewed, project NPV...
            </h2>

            {/* Static SVG showing policy timeline concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictSecure" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="predictUncertain" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                {/* Timeline */}
                <rect x="30" y="55" width="340" height="6" rx="3" fill={colors.border} />
                <rect x="30" y="55" width="113" height="6" rx="3" fill="url(#predictSecure)" />
                <rect x="143" y="55" width="227" height="6" rx="3" fill="url(#predictUncertain)" opacity="0.5" />

                {/* Year markers */}
                <text x="30" y="45" fill="#94a3b8" fontSize="11" textAnchor="middle">Yr 0</text>
                <text x="143" y="45" fill="#F59E0B" fontSize="11" fontWeight="700" textAnchor="middle">Yr 10</text>
                <text x="370" y="45" fill="#EF4444" fontSize="11" textAnchor="middle">Yr 30</text>

                {/* Tax credit expiry marker */}
                <line x1="143" y1="35" x2="143" y2="75" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3,3" />
                <text x="143" y="90" fill="#F59E0B" fontSize="11" fontWeight="600" textAnchor="middle">Tax Credit Expires</text>

                {/* Labels */}
                <text x="85" y="110" fill="#10B981" fontSize="11" fontWeight="600" textAnchor="middle">Secured Revenue</text>
                <text x="260" y="110" fill="#EF4444" fontSize="11" fontWeight="600" textAnchor="middle">Policy Uncertain?</text>

                {/* Question mark */}
                <text x="260" y="140" fill="#F59E0B" fontSize="28" fontWeight="800" textAnchor="middle">?</text>
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
              &#x2190; Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Policy Calculator
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE — Policy Risk Calculator
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
              Policy Risk Calculator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              The visualization below illustrates how policy stability affects project economics. When you increase the Policy Stability Rate, the reversal probability decreases and NPV rises because investors apply a lower risk premium. This is important in real-world energy investment decisions where policy uncertainty is calculated as the discount rate adjustment coefficient. The relationship is proportional: higher stability leads to higher expected value.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  {/* SVG Decision Tree */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <DecisionTreeVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Policy Stability Index slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Policy Stability Rate (Reversal Frequency Coefficient)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{stabilityIndex}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={stabilityIndex}
                      onChange={(e) => setStabilityIndex(parseInt(e.target.value))}
                      onInput={(e) => setStabilityIndex(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Policy Stability Index"
                      style={sliderStyle(colors.accent, stabilityIndex, 0, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.hostile }}>Volatile (50% reversal)</span>
                      <span style={{ ...typo.small, color: colors.favorable }}>Stable (bipartisan)</span>
                    </div>
                  </div>

                  {/* Results grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>${adjustedNPV.toFixed(1)}M</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Risk-Adjusted NPV</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>${expectedValue.toFixed(1)}M</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Scenario Expected Value</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.hostile }}>+{discountPremium}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Policy Risk Premium</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.favorable }}>{(100 - (adjustedNPV / baseProjectNPV) * 100).toFixed(0)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>NPV Reduction</div>
                    </div>
                  </div>

                  {/* Formula */}
                  <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>NPV Equation:</p>
                    <p style={{ ...typo.small, color: colors.textPrimary }}>
                      NPV = Sum[CF x Survival] / (1+r+rho)^n = {adjustedNPV.toFixed(1)}M
                    </p>
                    <p style={{ ...typo.small, color: colors.textMuted }}>
                      r=8% base rate, premium={discountPremium}%, reversal rate = {((1-stabilityIndex/100)*50).toFixed(1)}%/yr
                    </p>
                  </div>
                  {/* Scenario breakdown table */}
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Scenario Breakdown</h3>
                    {scenarios.map(sc => (
                      <div key={sc.name} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: `1px solid ${colors.border}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sc.color }} />
                          <span style={{ ...typo.small, color: colors.textPrimary }}>{sc.name}</span>
                        </div>
                        <span style={{ ...typo.small, color: sc.color, fontWeight: 600 }}>
                          {(sc.probability * 100).toFixed(0)}% &#x2192; ${(sc.npvMultiplier * baseProjectNPV).toFixed(0)}M
                        </span>
                      </div>
                    ))}
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
              &#x2190; Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Policy Risk
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
              How Policy Risk Destroys Value
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>NPV = &#x2211; [Cash Flow &#xD7; Survival Probability] / (1 + r + &#x3C1;)&#x207F;</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Policy risk enters the NPV equation two ways: (1) a <span style={{ color: colors.hostile }}>policy risk premium (&#x3C1;)</span> added to the discount rate, and (2) a <span style={{ color: colors.warning }}>survival probability</span> applied to each year&#x2019;s cash flow, reflecting the chance of adverse policy change. As you predicted, the correct observation is: <span style={{ color: colors.accent, fontWeight: 600 }}>NPV drops 30-40%</span> when a critical tax credit faces expiration uncertainty.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  30yr solar farm, ITC uncertain after yr 10: NPV drops from $100M &#x2192; <strong>~$62M</strong>
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
                Why Policy Risk Is Unique
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Unlike market risk (diversifiable) or technology risk (reducible through R&amp;D), policy risk is <strong>binary and correlated</strong>. A single policy change affects every project in the sector simultaneously. You cannot diversify away a legislative repeal. This is why policy risk commands the highest risk premiums in energy project finance.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Policy Risk Drivers
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Election Cycles', value: '2-4yr', desc: 'Government changes' },
                  { name: 'Sunset Clauses', value: '5-10yr', desc: 'Policy expiration' },
                  { name: 'Judicial Review', value: '1-3yr', desc: 'Court challenges' },
                  { name: 'Lobbying Pressure', value: 'Ongoing', desc: 'Industry influence' },
                  { name: 'Budget Constraints', value: 'Cyclical', desc: 'Fiscal pressure' },
                  { name: 'Public Sentiment', value: 'Variable', desc: 'Voter opinion' },
                ].map(driver => (
                  <div key={driver.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{driver.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{driver.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{driver.desc}</div>
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
              &#x2190; Back
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
      { id: 'a', text: 'Existing projects are safe — contracts and permits protect all assets regardless of policy change' },
      { id: 'b', text: 'Grandfathered projects survive but new investment freezes — stranded asset risk for assets under construction' },
      { id: 'c', text: 'All projects are cancelled immediately — hostile governments revoke all permits' },
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
                New Variable: Election Event
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              An election changes the government&#x2019;s energy policy from supportive to hostile. What happens to existing and planned renewable projects?
            </h2>

            {/* Static SVG showing election regime change */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="130" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistBefore" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="twistAfter" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                </defs>
                <rect x="30" y="40" width="150" height="30" rx="6" fill="url(#twistBefore)" />
                <text x="105" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">SUPPORTIVE GOV</text>
                <rect x="220" y="40" width="150" height="30" rx="6" fill="url(#twistAfter)" />
                <text x="295" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">HOSTILE GOV</text>
                <text x="200" y="60" textAnchor="middle" fill="#F59E0B" fontSize="20" fontWeight="800">&#x2192;</text>
                <text x="200" y="90" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">ELECTION</text>
                <text x="200" y="115" textAnchor="middle" fill="#94a3b8" fontSize="11">What happens to your $500M wind farm?</text>
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
              &#x2190; Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Election Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE — Election Event Simulator
  if (phase === 'twist_play') {
    const govOptions: { value: 'supportive' | 'neutral' | 'hostile'; label: string; color: string }[] = [
      { value: 'supportive', label: 'Supportive', color: colors.favorable },
      { value: 'neutral', label: 'Neutral', color: colors.warning },
      { value: 'hostile', label: 'Hostile', color: colors.hostile },
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
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Election Event Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Select the incoming government stance and see how existing policies are reassessed
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  {/* Election SVG */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <ElectionEventVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Educational panel */}
              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> The visualization compares policy scenario probabilities and expected project values before and after an election event, showing how a regime change redistributes risk across favorable, neutral, hostile, and reversal outcomes.</p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you select a different incoming government stance below, the &quot;After&quot; column shifts scenario probabilities -- a hostile government increases reversal and hostile probabilities, collapsing expected value and freezing new investment.</p>
              </div>

              {/* New government selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Incoming Government Stance</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {govOptions.map(gov => (
                    <button
                      key={gov.value}
                      onClick={() => {
                        playSound('click');
                        setNewGovernment(gov.value);
                        setElectionTriggered(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${newGovernment === gov.value ? gov.color : colors.border}`,
                        background: newGovernment === gov.value ? `${gov.color}22` : colors.bgSecondary,
                        color: newGovernment === gov.value ? gov.color : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        minHeight: '44px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {gov.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Impact summary */}
              {electionTriggered && (
                <div style={{
                  background: newGovernment === 'hostile' ? `${colors.error}15` : newGovernment === 'neutral' ? `${colors.warning}15` : `${colors.success}15`,
                  border: `1px solid ${newGovernment === 'hostile' ? colors.error : newGovernment === 'neutral' ? colors.warning : colors.success}`,
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                    Election Impact Assessment
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Completed Projects</div>
                      <div style={{ ...typo.h3, color: colors.favorable }}>Protected</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Grandfathered</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Under Construction</div>
                      <div style={{ ...typo.h3, color: newGovernment === 'hostile' ? colors.error : colors.warning }}>
                        {newGovernment === 'hostile' ? 'At Risk' : 'Uncertain'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>May be stranded</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>New Investment</div>
                      <div style={{ ...typo.h3, color: newGovernment === 'hostile' ? colors.error : newGovernment === 'neutral' ? colors.warning : colors.favorable }}>
                        {newGovernment === 'hostile' ? 'Frozen' : newGovernment === 'neutral' ? 'Cautious' : 'Active'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Pipeline halted</div>
                    </div>
                  </div>
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
              &#x2190; Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Election Risk
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
              The Election Effect: Regime Change Risk
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Grandfathering &#x2014; The Safety Net</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When governments change policy, existing projects with signed contracts and operating permits are typically &quot;grandfathered&quot; &#x2014; allowed to continue under the rules they were built under. This protects completed investments but creates a sharp boundary: projects that finished before the election survive; those caught mid-construction face stranded asset risk.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Investment Freeze</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Even before hostile policy is enacted, the mere <em>possibility</em> of policy reversal freezes new investment. Banks cannot underwrite 20-year project finance when the policy supporting returns might vanish in 2-4 years. This &quot;chilling effect&quot; can be more damaging than the policy change itself &#x2014; billions in potential investment never materializes.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Bipartisan Lock-In</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The most durable policies create economic constituencies in both parties. When red-state districts host wind farms and battery factories, even hostile politicians face pressure from their own voters to protect clean energy jobs. This &quot;lock-in&quot; effect &#x2014; where policy creates its own political support &#x2014; is the ultimate defense against reversal risk.
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
              &#x2190; Back
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
        conceptName="E L O N_ Policy Risk"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Policy Connection:</p>
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
                      // Auto-advance to next uncompleted app or to test if all done
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
                        // All apps completed - auto advance to test
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
              &#x2190; Back
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
                {passed ? 'You understand how policy risk reshapes project economics and investment decisions!' : 'Review the concepts about policy risk, stranded assets, and regulatory uncertainty.'}
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
              Knowledge Test: Policy Risk
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of policy risk to real-world regulatory and investment scenarios. Consider how policy uncertainty, election cycles, grandfathering provisions, and regulatory capture affect project economics and investment decisions as you work through each problem.
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
                &#x2190; Previous
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
            Policy Risk Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how government policies create uncertainty, how elections reshape investment landscapes, and why policy risk commands the highest premiums in project finance.
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
                'Policy risk premium: higher discount rates for uncertain policy',
                'Stranded assets: billions lost when policy shifts mid-project',
                'Grandfathering protects existing projects but freezes new investment',
                'Election cycles create binary, correlated risk across sectors',
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

export default ELON_PolicyRiskRenderer;
