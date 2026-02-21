'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// ELON GAME #34: CAPITAL STACK - Complete 10-Phase Game
// Project finance capital structure — debt, equity, tax credits, revenue contracts
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

interface ELON_CapitalStackRendererProps {
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
    scenario: "A 500MW solar farm requires $750M in total capital. The developer proposes 75% senior debt at 5.5% interest, 15% tax equity at 8% target return, and 10% sponsor equity expecting 15% IRR.",
    question: "What is the approximate Weighted Average Cost of Capital (WACC) for this project?",
    options: [
      { id: 'a', label: "6.9% — weighted average of each tranche's cost times its share of the capital stack", correct: true },
      { id: 'b', label: "9.5% — the simple average of all three return requirements" },
      { id: 'c', label: "5.5% — WACC equals the cost of the cheapest capital source" },
      { id: 'd', label: "15% — WACC equals the cost of the most expensive capital source" }
    ],
    explanation: "WACC = (75% x 5.5%) + (15% x 8%) + (10% x 15%) = 4.125% + 1.2% + 1.5% = 6.825%, approximately 6.9%. Each component is weighted by its proportion of total capital."
  },
  {
    scenario: "A wind project has annual revenue of $45M, operating expenses of $12M, and annual debt service (principal + interest) of $25M.",
    question: "What is the Debt Service Coverage Ratio (DSCR) and what does it indicate?",
    options: [
      { id: 'a', label: "1.32x — the project generates 32% more cash flow than needed to service debt, indicating adequate but not strong coverage", correct: true },
      { id: 'b', label: "1.80x — divide total revenue by debt service" },
      { id: 'c', label: "0.76x — the project cannot cover its debt obligations" },
      { id: 'd', label: "3.60x — divide revenue by operating expenses" }
    ],
    explanation: "DSCR = (Revenue - OpEx) / Debt Service = ($45M - $12M) / $25M = $33M / $25M = 1.32x. Lenders typically require minimum 1.2-1.4x DSCR for renewable energy projects."
  },
  {
    scenario: "A project developer can structure a 400MW offshore wind farm with either 60% debt / 40% equity or 80% debt / 20% equity. Debt costs 6% and equity requires 14% return.",
    question: "How does increasing leverage from 60% to 80% debt affect the equity IRR?",
    options: [
      { id: 'a', label: "Equity IRR increases because the smaller equity base captures the spread between project returns and debt cost — the leverage effect", correct: true },
      { id: 'b', label: "Equity IRR decreases because more debt means more risk" },
      { id: 'c', label: "Equity IRR stays the same — leverage does not affect returns" },
      { id: 'd', label: "Equity IRR becomes negative due to excessive debt burden" }
    ],
    explanation: "When project returns exceed debt cost, leverage amplifies equity returns. With 80% debt, the 20% equity slice captures all residual cash flow after cheaper debt service, boosting IRR. However, this also increases bankruptcy risk if revenues decline."
  },
  {
    scenario: "A tax equity investor provides $200M for a solar project in exchange for 99% of tax benefits (ITC + depreciation) for the first 5 years, then flips to 5% ownership.",
    question: "Why do tax equity investors use partnership flip structures?",
    options: [
      { id: 'a', label: "To capture federal tax credits and accelerated depreciation that the project developer cannot use directly, then exit once tax benefits are exhausted", correct: true },
      { id: 'b', label: "To gain permanent majority ownership of the project" },
      { id: 'c', label: "To avoid all project-related financial risks" },
      { id: 'd', label: "To charge higher interest rates than traditional lenders" }
    ],
    explanation: "Tax equity structures allow investors with large tax liabilities (banks, insurance companies) to monetize ITCs and MACRS depreciation. After the flip (typically year 5-7), the developer regains majority ownership."
  },
  {
    scenario: "An offshore wind developer signs a 20-year Contract for Difference (CfD) with a strike price of $85/MWh. The wholesale electricity market price is currently $65/MWh.",
    question: "How does the CfD function as a revenue certainty mechanism in the capital stack?",
    options: [
      { id: 'a', label: "The CfD guarantees the developer receives $85/MWh regardless of market price — if market is below, the counterparty pays the difference; if above, the developer pays back", correct: true },
      { id: 'b', label: "The CfD locks the developer into selling at $65/MWh forever" },
      { id: 'c', label: "The CfD only provides insurance against equipment failure" },
      { id: 'd', label: "The CfD eliminates the need for any debt financing" }
    ],
    explanation: "CfDs provide revenue certainty that enables higher leverage. Lenders are willing to provide 70-80% debt for projects with CfDs because cash flows are predictable, reducing the cost of capital significantly versus merchant risk exposure."
  },
  {
    scenario: "A solar+storage project initially financed at 4.5% fixed rate faces refinancing in 2025 when benchmark rates have risen by 300 basis points to 7.5%.",
    question: "What is the impact of this interest rate shock on the project?",
    options: [
      { id: 'a', label: "Annual debt service increases substantially, DSCR may fall below covenant minimums, potentially triggering technical default and requiring equity cure", correct: true },
      { id: 'b', label: "No impact — project finance loans always have fixed rates for the full term" },
      { id: 'c', label: "The project simply stops paying interest until rates decrease" },
      { id: 'd', label: "Revenue automatically increases to offset higher interest costs" }
    ],
    explanation: "A 300bps increase on a $500M loan adds ~$15M/year to debt service. If the project's DSCR drops below the 1.2x covenant, the lender can restrict distributions, require cash sweeps, or demand additional equity — the core refinancing risk in leveraged project finance."
  },
  {
    scenario: "SpaceX raises $2B in a Series N funding round at a $150B valuation while also holding $12B in NASA and DoD contracts.",
    question: "How do government contracts affect SpaceX's capital structure differently than traditional project finance?",
    options: [
      { id: 'a', label: "Government contracts provide revenue visibility that supports higher valuations and easier equity raises, but SpaceX uses corporate finance (equity) rather than project-level debt", correct: true },
      { id: 'b', label: "Government contracts have no effect on capital structure" },
      { id: 'c', label: "SpaceX finances each rocket launch as a separate project finance deal" },
      { id: 'd', label: "NASA directly provides equity investment to SpaceX" }
    ],
    explanation: "SpaceX uses corporate finance — raising equity at the company level rather than project-level debt. Long-term government contracts reduce revenue risk, supporting higher valuations. This contrasts with renewable energy where each project is separately financed with non-recourse debt."
  },
  {
    scenario: "Under the IRA, a solar project can claim a 30% Investment Tax Credit (ITC). The project costs $100M. The developer has minimal tax liability.",
    question: "How does the transferable ITC under the IRA change the capital stack?",
    options: [
      { id: 'a', label: "The developer can sell the $30M ITC to any taxpayer for ~$0.90-0.95 per dollar, receiving $27-28.5M in cash without needing a complex tax equity partnership", correct: true },
      { id: 'b', label: "The ITC reduces the project cost to $70M but cannot be monetized" },
      { id: 'c', label: "Only the project's lenders can claim the ITC" },
      { id: 'd', label: "The ITC must be spread over 30 years of project operation" }
    ],
    explanation: "IRA transferability is transformative — previously, developers needed tax equity partnerships (costly, complex, limited to ~20 large investors). Now any taxpayer can buy credits, expanding the buyer pool dramatically and reducing transaction costs from 5-8% to 2-3%."
  },
  {
    scenario: "A credit rating agency is evaluating a project bond for a toll road. The project has 80% leverage, a 15-year concession, and a 1.35x average DSCR.",
    question: "What credit rating factors most directly determine the project's borrowing cost?",
    options: [
      { id: 'a', label: "Revenue predictability, DSCR levels, leverage ratio, contract duration, and counterparty credit quality — these determine the spread over risk-free rates", correct: true },
      { id: 'b', label: "Only the total dollar amount of debt matters for credit rating" },
      { id: 'c', label: "Credit ratings depend solely on the sponsor's corporate credit rating" },
      { id: 'd', label: "Project bonds are not rated — only corporate bonds receive ratings" }
    ],
    explanation: "Project finance credit ratings assess the project's standalone cash flows and protections. A BBB-rated project bond might price at SOFR+200bps versus SOFR+400bps for a BB rating — the 200bps difference on $500M debt equals $10M/year in additional interest cost."
  },
  {
    scenario: "A developer is comparing two capital structures for a 200MW battery storage project: (A) 70% debt at 6% + 30% equity at 14%, or (B) 50% debt at 5% + 20% tax equity at 8% + 30% equity at 14%.",
    question: "Which structure has a lower WACC and why?",
    options: [
      { id: 'a', label: "Structure B has lower WACC (7.8% vs 8.4%) because tax equity at 8% is cheaper than the additional debt it replaces, even though debt rate is slightly lower in B", correct: true },
      { id: 'b', label: "Structure A has lower WACC because fewer capital sources means lower costs" },
      { id: 'c', label: "Both structures have identical WACC since total equity percentage is the same" },
      { id: 'd', label: "WACC cannot be calculated for structures with tax equity" }
    ],
    explanation: "Structure A WACC: (70%x6%)+(30%x14%) = 4.2%+4.2% = 8.4%. Structure B WACC: (50%x5%)+(20%x8%)+(30%x14%) = 2.5%+1.6%+4.2% = 8.3%. Tax equity's intermediate return requirement creates a blended cost between debt and equity, lowering overall WACC."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F3ED}',
    title: 'Tesla Gigafactory — $5B+ Equity & Incentives',
    short: 'Building the world\'s largest battery factory with equity and government incentives',
    tagline: 'Corporate equity meets state-level incentive stacking',
    description: 'Tesla\'s Gigafactory Nevada represents a capital structure unlike traditional project finance. Instead of non-recourse project debt, Tesla funded construction primarily through corporate equity raises, convertible bonds, and a $1.3B incentive package from Nevada (tax abatements, infrastructure). The $5B+ facility demonstrates how high-growth companies use corporate balance sheet strength rather than project-level leverage.',
    connection: 'The Gigafactory illustrates the difference between corporate finance and project finance. Tesla could not use traditional project debt because the factory\'s revenue depends on downstream vehicle sales — too uncertain for non-recourse lenders. Instead, the capital stack relies on equity (high cost but flexible) plus government incentives (essentially free capital).',
    howItWorks: 'Tesla raised equity through stock offerings and used convertible debt (lower coupon than straight debt due to conversion option). Nevada\'s incentive package included 20-year tax abatements worth $1.3B, effectively reducing the project cost. Panasonic co-invested as a strategic partner, sharing capital risk in exchange for a long-term supply agreement.',
    stats: [
      { value: '$5B+', label: 'Total Investment', icon: '\u{1F4B0}' },
      { value: '$1.3B', label: 'Nevada Incentives', icon: '\u{1F3DB}' },
      { value: '0%', label: 'Project-Level Debt', icon: '\u{1F4CA}' }
    ],
    examples: ['Corporate equity raises (stock offerings)', 'Convertible bond issuances', 'State tax abatement packages', 'Strategic co-investment (Panasonic)'],
    companies: ['Tesla', 'Panasonic', 'State of Nevada', 'Goldman Sachs'],
    futureImpact: 'IRA manufacturing credits (45X) now provide $35/kWh for US-made battery cells, fundamentally changing the capital stack for battery factories by adding a direct production subsidy layer.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F32C}\uFE0F',
    title: 'Offshore Wind — 70-80% Debt with CfD',
    short: 'Highly leveraged project finance enabled by government revenue contracts',
    tagline: 'Revenue certainty unlocks maximum leverage',
    description: 'Offshore wind projects like Hornsea (UK) and Vineyard Wind (US) use classic project finance with 70-80% non-recourse debt. This extreme leverage is possible because Contracts for Difference (CfDs) guarantee revenue for 15-20 years, making cash flows predictable enough for lenders to accept high leverage ratios. A typical 1.2GW project costs $4-5B with only $800M-1B of sponsor equity required.',
    connection: 'The capital stack demonstrates how revenue certainty (CfDs/PPAs) directly translates to leverage capacity. Without a CfD, offshore wind might only achieve 50-55% debt because merchant price risk makes cash flows unpredictable. The CfD compresses the risk premium, lowering WACC by 150-200bps.',
    howItWorks: 'Developers bid in CfD auctions for a guaranteed strike price. Once awarded, they approach project finance banks for non-recourse debt (the loan is secured only by project assets and cash flows, not the sponsor\'s balance sheet). Tax equity or export credit agencies often provide additional capital layers.',
    stats: [
      { value: '75%', label: 'Typical Leverage', icon: '\u{1F4C8}' },
      { value: '20yr', label: 'CfD Duration', icon: '\u{1F4C5}' },
      { value: '1.3x', label: 'Min DSCR Required', icon: '\u{1F6E1}\uFE0F' }
    ],
    examples: ['CfD auction bidding strategy', 'Non-recourse project debt', 'Export credit agency support', 'Construction risk guarantees'],
    companies: ['Orsted', 'Equinor', 'Iberdrola', 'Avangrid Renewables'],
    futureImpact: 'Floating offshore wind will require new capital structures — higher technology risk means lower initial leverage (55-65%) until track record is established, with potential for refinancing to higher leverage after construction completion.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX — Private Equity + NASA Contracts',
    short: 'Venture-style capital stack backed by government anchor contracts',
    tagline: 'Corporate equity powered by revenue visibility',
    description: 'SpaceX has raised over $9B in private equity at valuations exceeding $150B, making it the world\'s most valuable private company. Unlike renewable energy projects, SpaceX uses corporate-level equity financing rather than project-level debt. NASA and DoD contracts worth $12B+ provide revenue visibility that supports premium valuations, while Starlink\'s recurring revenue stream adds a second anchor.',
    connection: 'SpaceX\'s capital stack demonstrates corporate finance versus project finance. Each Falcon 9 launch is not separately financed — instead, SpaceX raises equity at the corporate level and deploys capital across programs. Government contracts function like PPAs in energy, providing the revenue certainty that reduces equity risk premiums.',
    howItWorks: 'SpaceX conducts periodic equity rounds with venture capital, sovereign wealth funds, and crossover investors. The valuation is supported by contracted revenue (NASA CRS, Crew Dragon, NSSL), Starlink subscriber growth, and Starship development potential. No traditional debt is used for launch operations — the capital structure is almost entirely equity.',
    stats: [
      { value: '$9B+', label: 'Total Equity Raised', icon: '\u{1F4B5}' },
      { value: '$150B+', label: 'Valuation', icon: '\u{1F4C8}' },
      { value: '$12B+', label: 'Gov Contract Backlog', icon: '\u{1F4DC}' }
    ],
    examples: ['Series equity rounds at rising valuations', 'NASA Commercial Crew fixed-price contracts', 'Starlink subscriber revenue model', 'Internal R&D capital allocation (Starship)'],
    companies: ['SpaceX', 'NASA', 'US Space Force', 'Founders Fund'],
    futureImpact: 'A potential Starlink IPO could unlock $50B+ in public equity value, fundamentally reshaping SpaceX\'s capital structure by creating a publicly-traded subsidiary with its own access to capital markets.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F3DB}\uFE0F',
    title: 'IRA Transferable 30% ITC',
    short: 'How transferable tax credits democratize clean energy finance',
    tagline: 'Unlocking capital by making tax credits liquid',
    description: 'The Inflation Reduction Act\'s transferability provision allows clean energy developers to sell their 30% Investment Tax Credits to any US taxpayer. Before IRA, developers needed complex tax equity partnerships with ~20 large financial institutions (banks, insurance companies). Now, any corporation with tax liability can buy credits at $0.90-0.95 per dollar, saving on taxes while funding clean energy. This has expanded the buyer pool from dozens to thousands.',
    connection: 'Transferable ITCs transform the capital stack by replacing expensive tax equity (8-12% return) with direct credit sales (5-10% discount). For a $100M project, the 30% ITC provides $30M. Selling at $0.92/dollar yields $27.6M in cash — reducing the equity needed and lowering WACC by replacing a high-cost capital layer with near-free capital.',
    howItWorks: 'A developer completes a qualifying project and claims the ITC on their tax return. They then sell the credit to a buyer (any US taxpayer) through a transfer election. The buyer pays $0.90-0.95 per dollar of credit and uses it to offset their own tax liability dollar-for-dollar. Brokers and platforms facilitate matching.',
    stats: [
      { value: '30%', label: 'ITC Rate', icon: '\u{2600}\uFE0F' },
      { value: '$0.92', label: 'Avg Transfer Price', icon: '\u{1F4B2}' },
      { value: '1000+', label: 'Potential Buyers', icon: '\u{1F465}' }
    ],
    examples: ['Direct pay for tax-exempt entities', 'Credit transfer marketplace platforms', 'Adder credits (energy community, domestic content)', 'Stacking ITC with MACRS depreciation'],
    companies: ['Crux Climate', 'Reunion Infrastructure', 'Basis Climate', 'Foss & Company'],
    futureImpact: 'Transferable credits could mobilize $50B+ annually in clean energy investment by lowering transaction costs, expanding the investor base beyond traditional tax equity, and enabling smaller developers to access tax incentives previously reserved for large sponsors.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_CapitalStackRenderer: React.FC<ELON_CapitalStackRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [debtToEquity, setDebtToEquity] = useState(60);
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase — interest rate shock
  const [rateShock, setRateShock] = useState(false);
  const [shockBps, setShockBps] = useState(300);

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
// Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Capital stack calculations
  const debtPct = debtToEquity;
  const mezzPct = Math.min(15, debtPct > 50 ? (debtPct - 50) * 0.5 : 0);
  const taxEquityPct = Math.min(20, Math.max(0, 30 - debtPct * 0.2));
  const equityPct = 100 - debtPct - mezzPct - taxEquityPct;
  const seniorDebtCost = 5.5;
  const mezzCost = 10.0;
  const taxEquityCost = 8.0;
  const equityCost = 15.0;

  const baseWACC = (debtPct / 100) * seniorDebtCost +
    (mezzPct / 100) * mezzCost +
    (taxEquityPct / 100) * taxEquityCost +
    (equityPct / 100) * equityCost;

  const projectRevenue = 50; // $50M annual
  const opex = 12;
  const netCashFlow = projectRevenue - opex;
  const debtService = (debtPct / 100) * 500 * (seniorDebtCost / 100) + (mezzPct / 100) * 500 * (mezzCost / 100);
  const dscr = debtService > 0 ? netCashFlow / debtService : 99;

  const equityShare = (equityPct / 100) * 500;
  const cashToEquity = netCashFlow - debtService;
  const equityIRR = equityShare > 0 ? (cashToEquity / equityShare) * 100 : 0;

  const bankruptcyRisk = debtPct > 70 ? (debtPct - 70) * 6.67 : debtPct > 50 ? (debtPct - 50) * 1.5 : 0;

  // Twist: interest rate shock
  const shockedDebtCost = seniorDebtCost + (rateShock ? shockBps / 100 : 0);
  const shockedMezzCost = mezzCost + (rateShock ? shockBps / 100 * 0.5 : 0);
  const shockedDebtService = (debtPct / 100) * 500 * (shockedDebtCost / 100) + (mezzPct / 100) * 500 * (shockedMezzCost / 100);
  const shockedDSCR = shockedDebtService > 0 ? netCashFlow / shockedDebtService : 99;
  const shockedWACC = (debtPct / 100) * shockedDebtCost +
    (mezzPct / 100) * shockedMezzCost +
    (taxEquityPct / 100) * taxEquityCost +
    (equityPct / 100) * equityCost;
  const shockedCashToEquity = netCashFlow - shockedDebtService;
  const shockedEquityIRR = equityShare > 0 ? (shockedCashToEquity / equityShare) * 100 : 0;

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
    seniorDebt: '#3B82F6',
    mezzDebt: '#8B5CF6',
    taxEquity: '#10B981',
    equity: '#EF4444',
    irr: '#F59E0B',
    revenue: '#06B6D4',
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
        gameType: 'capital-stack',
        gameTitle: 'Capital Stack',
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

  // Capital Stack Waterfall SVG Visualization
  const CapitalStackVisualization = ({ showShock, forceShock }: { showShock?: boolean; forceShock?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 440;
    const chartLeft = 55;
    const chartRight = width - 30;
    const chartW = chartRight - chartLeft;
    const stackTop = 50;
    const stackBot = 260;
    const stackH = stackBot - stackTop;
    const irrTop = 290;
    const irrBot = 400;

    const isShocked = forceShock || (showShock && rateShock);
    const effectiveDebtCost = isShocked ? shockedDebtCost : seniorDebtCost;
    const effectiveMezzCost = isShocked ? shockedMezzCost : mezzCost;
    const effectiveDSCR = isShocked ? shockedDSCR : dscr;
    const effectiveWACC = isShocked ? shockedWACC : baseWACC;
    const effectiveEquityIRR = isShocked ? shockedEquityIRR : equityIRR;

    // Stack layers from bottom (equity = highest risk) to top (senior debt = lowest risk)
    const layers = [
      { name: 'Equity', pct: equityPct, color: colors.equity, cost: equityCost, risk: 'Highest' },
      { name: 'Tax Equity', pct: taxEquityPct, color: colors.taxEquity, cost: taxEquityCost, risk: 'Medium' },
      { name: 'Mezz Debt', pct: mezzPct, color: colors.mezzDebt, cost: effectiveMezzCost, risk: 'Med-High' },
      { name: 'Senior Debt', pct: debtPct, color: colors.seniorDebt, cost: effectiveDebtCost, risk: 'Lowest' },
    ];

    let cumY = stackBot;
    const layerRects: { name: string; y: number; h: number; color: string; cost: number; pct: number; risk: string }[] = [];
    layers.forEach(layer => {
      if (layer.pct <= 0) return;
      const h = (layer.pct / 100) * stackH;
      cumY -= h;
      layerRects.push({ name: layer.name, y: cumY, h, color: layer.color, cost: layer.cost, pct: layer.pct, risk: layer.risk });
    });

    // Revenue projection line
    const revenuePoints: string[] = [];
    const sensitivityHigh: string[] = [];
    const sensitivityLow: string[] = [];
    for (let yr = 0; yr <= 20; yr++) {
      const x = chartLeft + (yr / 20) * chartW * 0.45;
      const baseRev = 50 + yr * 0.5 + Math.sin(yr * 0.8) * 2;
      const y = irrBot - ((baseRev / 80) * (irrBot - irrTop));
      revenuePoints.push(`${x},${y}`);
      sensitivityHigh.push(`${x},${y - 12 - Math.sin(yr * 0.5) * 5}`);
      sensitivityLow.push(`${x},${y + 12 + Math.sin(yr * 0.3) * 5}`);
    }

    // IRR per tranche bars
    const irrBarX = chartLeft + chartW * 0.55;
    const irrBarW = chartW * 0.4;
    const irrBars = [
      { name: 'Sr Debt', irr: effectiveDebtCost, color: colors.seniorDebt },
      { name: 'Mezz', irr: effectiveMezzCost, color: colors.mezzDebt },
      { name: 'Tax Eq', irr: taxEquityCost, color: colors.taxEquity },
      { name: 'Equity', irr: Math.max(0, effectiveEquityIRR), color: colors.equity },
    ];

    const pulseOffset = Math.sin(animFrame * 0.03) * 2;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Capital Stack visualization">
        <defs>
          <linearGradient id="stackEquityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.equity} />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <linearGradient id="stackDebtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.seniorDebt} />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="stackMezzGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.mezzDebt} />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="stackTaxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.taxEquity} />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="revenueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.revenue} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="irrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.irr} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.irr} stopOpacity="0.1" />
          </linearGradient>
          <filter id="stackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="stackSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Capital Stack — {debtPct}% Leverage | WACC: {effectiveWACC.toFixed(1)}%
        </text>
        <text x={width / 2} y={36} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          DSCR: {effectiveDSCR.toFixed(2)}x | Equity IRR: {effectiveEquityIRR.toFixed(1)}% | Bankruptcy Risk: {bankruptcyRisk.toFixed(0)}%
        </text>

        {/* Risk axis label */}
        <text x={12} y={(stackTop + stackBot) / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${(stackTop + stackBot) / 2})`}>Risk Level (Intensity)</text>
        <path d={`M 22 ${stackBot - 10} L 22 ${stackTop + 10}`} stroke={colors.textMuted} strokeWidth="1" fill="none" markerEnd="none" opacity="0.4" />
        <text x={22} y={stackTop + 5} fill={colors.textMuted} fontSize="11" textAnchor="middle">Low</text>
        <text x={22} y={stackBot + 14} fill={colors.textMuted} fontSize="11" textAnchor="middle">High</text>

        {/* Stack waterfall layers */}
        {layerRects.map((lr, idx) => {
          const barWidth = chartW * 0.4;
          const barX = chartLeft + 10;
          const gradId = lr.name === 'Equity' ? 'stackEquityGrad' : lr.name === 'Senior Debt' ? 'stackDebtGrad' : lr.name === 'Mezz Debt' ? 'stackMezzGrad' : 'stackTaxGrad';
          return (
            <g key={lr.name}>
              {/* Layer bar */}
              <rect
                x={barX}
                y={lr.y}
                width={barWidth}
                height={Math.max(lr.h - 2, 4)}
                rx="4"
                fill={`url(#${gradId})`}
                opacity="0.85"
                stroke={lr.color}
                strokeWidth="1"
              />
              {/* Label inside bar */}
              {lr.h > 18 && (
                <text
                  x={barX + barWidth / 2}
                  y={lr.y + lr.h / 2 + 4}
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {lr.name} ({lr.pct.toFixed(0)}%)
                </text>
              )}
              {/* Cost & risk label (combined for spacing) */}
              <text
                x={barX + barWidth + 8}
                y={lr.y + lr.h / 2 + 4}
                fill={lr.color}
                fontSize="11"
                fontWeight="600"
              >
                {lr.cost.toFixed(1)}% · {lr.risk}
              </text>
              {/* Connector dot */}
              <circle
                cx={barX + barWidth + 3}
                cy={lr.y + lr.h / 2}
                r="4"
                fill={lr.color}
                opacity="0.9"
              />
            </g>
          );
        })}

        {/* Waterfall connector lines */}
        {layerRects.map((lr, idx) => {
          if (idx === 0) return null;
          const prev = layerRects[idx - 1];
          const barX = chartLeft + 10;
          const barWidth = chartW * 0.4;
          return (
            <line
              key={`conn-${idx}`}
              x1={barX + barWidth / 2}
              y1={prev.y}
              x2={barX + barWidth / 2}
              y2={lr.y + lr.h}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.3"
            />
          );
        })}

        {/* WACC formula */}
        <text x={width - 15} y={stackBot + 8} fill={colors.textMuted} fontSize="11" textAnchor="end">
          WACC = {'\u03A3'}(w{'\u1D62'} {'\u00D7'} r{'\u1D62'})
        </text>

        {/* Section divider */}
        <line x1={chartLeft} y1={275} x2={chartRight} y2={275} stroke={colors.border} strokeWidth="1" />
        <text x={chartLeft + chartW * 0.2} y={288} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">Revenue Projection (Power)</text>
        <text x={chartLeft + chartW * 0.75} y={288} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">Rate of Return by Tranche</text>

        {/* Revenue projection lines */}
        <polyline points={sensitivityHigh.join(' ')} stroke={colors.revenue} fill="none" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
        <polyline points={sensitivityLow.join(' ')} stroke={colors.revenue} fill="none" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
        <polyline points={revenuePoints.join(' ')} stroke="url(#revenueGrad)" fill="none" strokeWidth="2" />

        {/* Revenue point markers */}
        {[0, 5, 10, 15, 20].map(yr => {
          const x = chartLeft + (yr / 20) * chartW * 0.45;
          const baseRev = 50 + yr * 0.5 + Math.sin(yr * 0.8) * 2;
          const y = irrBot - ((baseRev / 80) * (irrBot - irrTop));
          return (
            <g key={`rev-${yr}`}>
              <circle cx={x} cy={y} r="5" fill={colors.revenue} stroke="white" strokeWidth="1" />
              <text x={x} y={irrBot + 14} fill={colors.textMuted} fontSize="11" textAnchor="middle">Y{yr}</text>
            </g>
          );
        })}

        {/* IRR per tranche horizontal bars */}
        {irrBars.map((bar, idx) => {
          const barH = 18;
          const barY = irrTop + 10 + idx * (barH + 8);
          const maxIRR = 25;
          const barW = Math.min(irrBarW, (Math.max(0, bar.irr) / maxIRR) * irrBarW);
          return (
            <g key={`irr-${bar.name}`}>
              <rect x={irrBarX} y={barY} width={irrBarW} height={barH} rx="3" fill="rgba(255,255,255,0.03)" />
              <rect x={irrBarX} y={barY} width={Math.max(barW, 2)} height={barH} rx="3" fill={bar.color} opacity="0.7" />
              <text x={irrBarX - 4} y={barY + 12} fill={colors.textMuted} fontSize="11" textAnchor="end">{bar.name}</text>
              <text x={irrBarX + barW + 4} y={barY + 12} fill={bar.color} fontSize="11" fontWeight="600">{bar.irr.toFixed(1)}%</text>
              <circle cx={irrBarX + barW} cy={barY + barH / 2} r="5" fill={bar.color} opacity="0.8" />
            </g>
          );
        })}

        {/* WACC reference line in IRR section */}
        {(() => {
          const waccX = irrBarX + (effectiveWACC / 25) * irrBarW;
          return (
            <g>
              <line x1={waccX} y1={irrTop + 8} x2={waccX} y2={irrBot - 15} stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7" />
              <text x={waccX} y={irrBot - 5} fill={colors.accent} fontSize="11" fontWeight="700" textAnchor="middle">WACC {effectiveWACC.toFixed(1)}%</text>
            </g>
          );
        })()}

        {/* Shock indicator */}
        {isShocked && (
          <g>
            <rect x={width - 100} y={stackTop} width="90" height="28" rx="6" fill="rgba(239,68,68,0.2)" stroke={colors.error} strokeWidth="1.5" />
            <text x={width - 55} y={stackTop + 18} fill={colors.error} fontSize="11" fontWeight="700" textAnchor="middle">+{shockBps}bps SHOCK</text>
            <circle cx={width - 95} cy={stackTop + 14} r="5" fill={colors.error} />
          </g>
        )}

        {/* Interactive leverage marker — maps debt ratio to vertical position */}
        <circle
          cx={chartLeft + 5}
          cy={stackTop + (debtPct / 85) * stackH}
          r="8"
          fill={colors.accent}
          stroke="white"
          strokeWidth="2"
          filter="url(#stackGlow)"
        />

        {/* Animated pulse on equity layer */}
        {layerRects.length > 0 && (() => {
          const eqLayer = layerRects[0];
          const barX = chartLeft + 10;
          const barWidth = chartW * 0.4;
          return (
            <circle
              cx={barX + barWidth / 2}
              cy={eqLayer.y + eqLayer.h / 2 + pulseOffset}
              r="8"
              fill="none"
              stroke={colors.equity}
              strokeWidth="1.5"
              opacity={0.4 + Math.sin(animFrame * 0.05) * 0.3}
              filter="url(#stackGlow)"
            />
          );
        })()}

        {/* Legend */}
        <g>
          <circle cx={chartLeft} cy={height - 10} r="4" fill={colors.seniorDebt} />
          <text x={chartLeft + 8} y={height - 6} fill={colors.textMuted} fontSize="11">Sr Debt</text>
          <circle cx={chartLeft + 55} cy={height - 10} r="4" fill={colors.mezzDebt} />
          <text x={chartLeft + 63} y={height - 6} fill={colors.textMuted} fontSize="11">Mezz</text>
          <circle cx={chartLeft + 103} cy={height - 10} r="4" fill={colors.taxEquity} />
          <text x={chartLeft + 111} y={height - 6} fill={colors.textMuted} fontSize="11">Tax Eq</text>
          <circle cx={chartLeft + 155} cy={height - 10} r="4" fill={colors.equity} />
          <text x={chartLeft + 163} y={height - 6} fill={colors.textMuted} fontSize="11">Equity</text>
          <circle cx={chartLeft + 205} cy={height - 10} r="4" fill={colors.revenue} />
          <text x={chartLeft + 213} y={height - 6} fill={colors.textMuted} fontSize="11">Revenue</text>
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
            {'\u{1F3E6}\u{1F4B0}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Capital Stack
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"Every major energy project needs "}
            <span style={{ color: colors.accent }}>billions in financing</span>
            {". The capital stack determines who provides capital, who gets paid first, and who bears the most risk. Understanding how debt, equity, and tax credits stack together is the key to building the clean energy future."}
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
              "In project finance, the capital stack is everything. Senior debt sits at the top with first claim on cash flows — lowest risk, lowest return. Equity sits at the bottom — last to get paid, but captures all the upside. The art is finding the leverage ratio that maximizes returns without triggering default."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Infrastructure Finance Professional
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
      { id: 'a', text: 'Equity IRR stays the same regardless of how much debt is used' },
      { id: 'b', text: 'Higher leverage amplifies equity returns when project performs well — the leverage effect' },
      { id: 'c', text: 'Adding debt always reduces equity returns because of interest payments' },
      { id: 'd', text: 'Debt and equity returns are completely independent of each other' },
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
              A $500M solar project generates $38M in annual cash flow. What happens to equity investors&apos; returns when you increase debt from 30% to 70% of the capital stack?
            </h2>

            {/* Static SVG showing capital stack concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictDebtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.seniorDebt} />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="predictEquityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.equity} />
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
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">$500M Solar Project Capital Stack</text>

                {/* Low leverage stack */}
                <text x="110" y="45" textAnchor="middle" fill={colors.textMuted} fontSize="11">30% Debt</text>
                <rect x="60" y="50" width="100" height="35" rx="4" fill="url(#predictDebtGrad)" opacity="0.6" />
                <text x="110" y="72" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">$150M Debt</text>
                <rect x="60" y="87" width="100" height="80" rx="4" fill="url(#predictEquityGrad)" opacity="0.6" />
                <text x="110" y="130" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">$350M Equity</text>

                {/* Arrow */}
                <path d="M 180 110 L 220 110" stroke={colors.accent} strokeWidth="2" fill="none" />
                <path d="M 215 105 L 225 110 L 215 115" fill={colors.accent} />
                <text x="200" y="100" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="700">???</text>

                {/* High leverage stack */}
                <text x="290" y="45" textAnchor="middle" fill={colors.textMuted} fontSize="11">70% Debt</text>
                <rect x="240" y="50" width="100" height="80" rx="4" fill="url(#predictDebtGrad)" opacity="0.6" />
                <text x="290" y="93" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">$350M Debt</text>
                <rect x="240" y="132" width="100" height="35" rx="4" fill="url(#predictEquityGrad)" opacity="0.6" />
                <text x="290" y="154" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">$150M Equity</text>

                <text x="200" y="190" textAnchor="middle" fill={colors.textMuted} fontSize="11">Same $38M cash flow — different equity returns?</text>
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

  // PLAY PHASE - Capital Stack Simulator
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
              Capital Stack Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> The debt-to-equity ratio determines who bears risk, what returns investors earn, and whether a project can survive revenue downturns. Higher leverage magnifies returns but also magnifies losses — the fundamental trade-off in project finance.
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
                <strong style={{ color: colors.textPrimary }}>WACC (Weighted Average Cost of Capital)</strong> is the blended cost of all capital sources, weighted by their proportion of total financing.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>DSCR (Debt Service Coverage Ratio)</strong> measures how many times cash flow covers required debt payments. Lenders require minimums of 1.2-1.4x.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Leverage Effect</strong> describes how debt amplifies both gains and losses for equity holders. When project returns exceed debt cost, leverage boosts equity IRR.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              This visualization shows the capital stack as a waterfall chart: equity (bottom, highest risk) through senior debt (top, lowest risk). Adjust the debt concentration rate and watch how WACC, DSCR, equity IRR, and bankruptcy risk change.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px', fontFamily: 'monospace' }}>
              WACC = {'\u03A3'}(w{'\u1D62'} {'\u00D7'} r{'\u1D62'}) | DSCR = (Revenue {'\u2212'} OpEx) / Debt Service | Equity IRR = Cash to Equity / Equity{'\u00B2'}
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <CapitalStackVisualization />
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
                  {/* Debt-to-Equity Ratio slider — controls leverage concentration */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Debt Concentration Rate (Leverage Ratio)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {debtToEquity}% Debt
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      value={debtToEquity}
                      onChange={(e) => setDebtToEquity(parseInt(e.target.value))}
                      onInput={(e) => setDebtToEquity(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Debt Concentration Rate"
                      style={sliderStyle(colors.accent, debtToEquity, 0, 85)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0% (All Equity)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>42%</span>
                      <span style={{ ...typo.small, color: colors.error }}>85% (Max Leverage)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{baseWACC.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>WACC</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: dscr < 1.2 ? colors.error : colors.success }}>{dscr.toFixed(2)}x</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>DSCR</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.irr }}>{equityIRR.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Equity IRR</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: bankruptcyRisk > 50 ? colors.error : bankruptcyRisk > 20 ? colors.warning : colors.success }}>{bankruptcyRisk.toFixed(0)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Default Risk</div>
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
              Understand the Mechanics
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
              The Mechanics of the Capital Stack
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — higher leverage amplifies equity returns through the leverage effect. When the project earns more than the cost of debt, all the excess flows to a smaller equity base, boosting IRR.'
                : 'As you observed in the simulator, increasing debt from 30% to 70% dramatically changes equity returns. The leverage effect amplifies both gains and losses for equity investors.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Equity IRR = (Net Cash Flow - Debt Service) / Equity Investment</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The <span style={{ color: colors.accent }}>leverage effect</span> works because debt has a fixed cost. When a project earns 8% but debt costs only 5.5%, the <span style={{ color: colors.success }}>2.5% spread</span> on every dollar of debt flows entirely to equity holders. With 70% debt, a smaller equity base captures a larger absolute spread, <span style={{ color: colors.irr }}>amplifying equity IRR significantly</span>.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {'IRR_equity = IRR_project + (IRR_project - Cost_debt) * (D/E)'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  This is the Modigliani-Miller leverage formula. If project IRR exceeds debt cost, equity IRR increases with leverage. If project IRR falls below debt cost, leverage destroys equity value.
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
                The Capital Stack Hierarchy
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                In project finance, the capital stack determines the order of claims on cash flows. Senior debt is paid first (lowest risk, lowest return). Mezzanine debt is next. Tax equity captures tax benefits. Sponsor equity is last — residual cash flow after all other obligations. This waterfall structure is legally enforced through intercreditor agreements and security packages.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key Capital Stack Components
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Senior Debt', cost: '4-7%', desc: 'First lien, non-recourse' },
                  { name: 'Mezzanine', cost: '8-12%', desc: 'Subordinated, higher yield' },
                  { name: 'Tax Equity', cost: '7-10%', desc: 'ITC + depreciation capture' },
                  { name: 'Sponsor Equity', cost: '12-20%', desc: 'Residual cash flow' },
                  { name: 'PPA/CfD', cost: 'Revenue', desc: 'Contracted cash flow' },
                  { name: 'ITC/PTC', cost: 'Subsidy', desc: 'Federal tax incentive' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.cost}</div>
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
      { id: 'a', text: 'Highly leveraged projects easily absorb the rate increase with no impact' },
      { id: 'b', text: 'Interest rate shock increases debt service costs, potentially breaching DSCR covenants and triggering refinancing risk' },
      { id: 'c', text: 'Interest rates only affect new projects, not existing ones' },
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
                New Variable: Interest Rate Shock (+300bps)
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A project financed at 5.5% suddenly faces refinancing at 8.5% due to a +300bps rate shock. With 70% leverage, what happens?
            </h2>

            {/* Static SVG showing rate shock concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistRateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.seniorDebt} />
                    <stop offset="100%" stopColor={colors.error} />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Rate bars */}
                <rect x="40" y="25" width="120" height="35" rx="6" fill={colors.seniorDebt} opacity="0.4" />
                <text x="100" y="47" textAnchor="middle" fill={colors.seniorDebt} fontSize="11" fontWeight="700">5.5% Rate</text>
                <path d="M 175 42 L 215 42" stroke={colors.error} strokeWidth="3" fill="none" />
                <path d="M 210 35 L 220 42 L 210 49" fill={colors.error} />
                <text x="195" y="32" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="700">+300bps</text>
                <rect x="230" y="25" width="140" height="35" rx="6" fill={colors.error} opacity="0.3" />
                <text x="300" y="47" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="700">8.5% Rate</text>
                <text x="200" y="90" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">70% Leverage — DSCR under pressure?</text>
                <text x="200" y="115" textAnchor="middle" fill={colors.textMuted} fontSize="11">Debt service jumps by $10.5M/year on $350M debt</text>
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
                See Interest Rate Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Interest Rate Shock Simulator
  if (phase === 'twist_play') {
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
              Interest Rate Shock Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply a rate shock and see how leveraged projects face refinancing risk. Adjust leverage and shock magnitude.
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
                  {/* SVG Visualization with shock */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <CapitalStackVisualization showShock={true} forceShock={true} />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> The capital stack visualization now reflects an interest rate shock scenario, showing how rising rates cascade through each tranche of the financing structure and compress equity returns.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> As you increase the shock magnitude or leverage ratio, watch how DSCR drops toward covenant minimums and equity IRR compresses — demonstrating the refinancing risk that highly leveraged projects face in rising rate environments.</p>
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
                  {/* Rate shock toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => { playSound('click'); setRateShock(!rateShock); }}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${rateShock ? colors.error : colors.border}`,
                        background: rateShock ? `${colors.error}22` : colors.bgSecondary,
                        color: rateShock ? colors.error : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '16px',
                        minHeight: '44px',
                      }}
                    >
                      {rateShock ? '\u26A0\uFE0F Interest Rate Shock ACTIVE — Refinancing Crisis' : 'Click to Activate Interest Rate Shock'}
                    </button>
                  </div>

                  {/* Debt-to-Equity slider — controls leverage concentration */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Debt Concentration Rate (Leverage Ratio)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{debtToEquity}% Debt</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      value={debtToEquity}
                      onChange={(e) => setDebtToEquity(parseInt(e.target.value))}
                      onInput={(e) => setDebtToEquity(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Debt Concentration Rate"
                      style={sliderStyle(colors.accent, debtToEquity, 0, 85)}
                    />
                  </div>

                  {/* Shock magnitude slider — controls interest rate intensity */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Interest Rate Shock Intensity</span>
                      <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>+{shockBps} bps</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="25"
                      value={shockBps}
                      onChange={(e) => setShockBps(parseInt(e.target.value))}
                      onInput={(e) => setShockBps(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Interest Rate Shock Intensity"
                      style={sliderStyle(colors.error, shockBps, 50, 500)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>+50bps (Mild)</span>
                      <span style={{ ...typo.small, color: colors.error }}>+500bps (Severe)</span>
                    </div>
                  </div>

                  {/* Comparison Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Before Shock</div>
                      <div style={{ ...typo.h3, color: colors.seniorDebt }}>{baseWACC.toFixed(1)}% WACC</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>DSCR: {dscr.toFixed(2)}x | IRR: {equityIRR.toFixed(1)}%</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>After +{shockBps}bps Shock</div>
                      <div style={{ ...typo.h3, color: shockedDSCR < 1.2 ? colors.error : colors.warning }}>{shockedWACC.toFixed(1)}% WACC</div>
                      <div style={{ ...typo.small, color: shockedDSCR < 1.0 ? colors.error : colors.textMuted }}>DSCR: {shockedDSCR.toFixed(2)}x | IRR: {shockedEquityIRR.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Warning indicator */}
                  {rateShock && shockedDSCR < 1.2 && (
                    <div style={{
                      background: `${colors.error}22`,
                      border: `1px solid ${colors.error}`,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <p style={{ ...typo.body, color: colors.error, fontWeight: 700, margin: 0 }}>
                        {shockedDSCR < 1.0
                          ? 'CRITICAL: DSCR below 1.0x — project cannot service debt! Technical default triggered.'
                          : 'WARNING: DSCR below 1.2x covenant minimum — cash sweep activated, distributions locked.'}
                      </p>
                      <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                        Additional annual debt cost: ${((shockedDebtService - (debtPct / 100 * 500 * seniorDebtCost / 100 + mezzPct / 100 * 500 * mezzCost / 100))).toFixed(1)}M
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
              Understand Refinancing Risk
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
              Refinancing Risk: The Hidden Danger of Leverage
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>How Interest Rate Shocks Cascade</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Most project finance debt has a tenor of 7-10 years for a 25-30 year project. When mini-perm loans mature, the project must refinance at prevailing rates. A 300bps increase on $350M of debt adds $10.5M/year to debt service — this comes directly from equity cash flows. If DSCR drops below covenant minimums (typically 1.2x), lenders can trap cash, halt distributions, or demand additional equity injections.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Leverage Paradox</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The same leverage that amplified equity returns in good times becomes a trap in rising rate environments. A project that generated 18% equity IRR at 5.5% rates might deliver only 8% IRR at 8.5% rates — or even negative returns if revenue also declines. This is why credit rating agencies heavily penalize projects with floating-rate debt or near-term refinancing needs during rate hiking cycles.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Hedging and Mitigation Strategies</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Sophisticated sponsors manage refinancing risk through interest rate swaps (locking in fixed rates), cash reserve accounts (6-12 months of debt service), amortizing debt profiles (reducing principal over time), and diversified debt maturity schedules. The IRA&apos;s direct pay provisions also reduce the need for tax equity, simplifying capital structures and reducing overall refinancing exposure.
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
        conceptName="E L O N_ Capital Stack"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Finance Connection:</p>
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
                      // Auto-advance to next uncompleted app, or go to test if all done
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
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
                {passed ? 'You understand project finance capital structures and the interplay between debt, equity, and tax incentives!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Capital Stack
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of WACC, IRR, DSCR, tax equity structures, PPAs, project vs corporate finance, leverage effect, refinancing risk, credit ratings, and capital cost components to real-world project finance scenarios.
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
            Capital Stack Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how debt, equity, and tax credits stack together to finance major energy projects, how leverage amplifies returns and risk, and how interest rate shocks can destabilize highly leveraged structures.
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
                'WACC reflects the blended cost of all capital sources',
                'Leverage amplifies both equity returns and risk',
                'DSCR measures a project\'s ability to service debt',
                'Tax equity captures federal incentives for investors',
                'Interest rate shocks create refinancing risk for leveraged projects',
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

export default ELON_CapitalStackRenderer;
