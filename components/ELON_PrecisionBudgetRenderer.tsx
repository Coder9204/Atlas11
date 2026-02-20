'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─── GameEvent Interface ───────────────────────────────────────────────────────
export interface GameEvent {
  eventType:
    | 'screen_change'
    | 'prediction_made'
    | 'answer_submitted'
    | 'slider_changed'
    | 'button_clicked'
    | 'game_started'
    | 'game_completed'
    | 'hint_requested'
    | 'correct_answer'
    | 'incorrect_answer'
    | 'phase_changed'
    | 'value_changed'
    | 'selection_made'
    | 'timer_expired'
    | 'achievement_unlocked'
    | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

// ─── Props Interface ───────────────────────────────────────────────────────────
interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─── Play Sound Utility ────────────────────────────────────────────────────────
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'click':
        osc.frequency.value = 600;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
        break;
      case 'success':
        osc.frequency.value = 523;
        gain.gain.value = 0.1;
        osc.start();
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.35);
        break;
      case 'failure':
        osc.frequency.value = 330;
        gain.gain.value = 0.1;
        osc.start();
        osc.frequency.setValueAtTime(277, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.3);
        break;
      case 'transition':
        osc.frequency.value = 440;
        gain.gain.value = 0.06;
        osc.start();
        osc.frequency.setValueAtTime(550, ctx.currentTime + 0.08);
        osc.stop(ctx.currentTime + 0.15);
        break;
      case 'complete':
        osc.frequency.value = 523;
        gain.gain.value = 0.12;
        osc.start();
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.36);
        osc.stop(ctx.currentTime + 0.5);
        break;
    }

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio not available
  }
};

// ─── Test Questions (10 items) ─────────────────────────────────────────────────
const testQuestions: {
  scenario: string;
  question: string;
  options: { id: string; label: string; correct?: boolean }[];
  explanation: string;
}[] = [
  {
    scenario: 'A Fermi estimation requires multiplying 5 independent guesses, each uncertain by a factor of 2x.',
    question: 'What is the approximate total uncertainty in the final answer?',
    options: [
      { id: 'a', label: 'About 10x (2 × 5)' },
      { id: 'b', label: 'About 32x (2^5)', correct: true },
      { id: 'c', label: 'About 2x (errors cancel)' },
      { id: 'd', label: 'Exactly 10x always' },
    ],
    explanation:
      'When you multiply estimates, their uncertainties multiply too. 2^5 = 32, so your final answer could be off by up to ~32x in either direction.',
  },
  {
    scenario: 'A Mars mission fuel calculation has 12 estimation steps, each with 5% uncertainty.',
    question: 'What is the approximate total uncertainty after all 12 steps?',
    options: [
      { id: 'a', label: 'About 10% (just 2 × 5%)' },
      { id: 'b', label: 'About 60% (add them up)' },
      { id: 'c', label: 'About 80% (they compound exponentially)', correct: true },
      { id: 'd', label: 'Exactly 5% (errors cancel out)' },
    ],
    explanation:
      'Errors compound multiplicatively: (1.05)^12 ≈ 1.80. That means ~80% total uncertainty, not the 60% you get from naive addition.',
  },
  {
    scenario: 'An engineer is choosing between two approaches: one uses 3 estimates with 20% error each, the other uses 6 estimates with 10% error each.',
    question: 'Which approach gives less total uncertainty?',
    options: [
      { id: 'a', label: 'The 3-step approach (fewer steps = less error)' },
      { id: 'b', label: 'The 6-step approach (smaller per-step error)', correct: true },
      { id: 'c', label: 'They are exactly the same' },
      { id: 'd', label: 'Cannot be determined without more info' },
    ],
    explanation:
      '3 steps × 20%: (1.20)^3 = 1.73 (73% error). 6 steps × 10%: (1.10)^6 = 1.77 (77% error). Actually very close! But the 6-step at 10% is slightly worse. The key insight is that per-step precision matters more than step count.',
  },
  {
    scenario: 'A semiconductor fabrication line has 200 process steps, each with 99.9% yield.',
    question: 'What is the approximate total yield for the full process?',
    options: [
      { id: 'a', label: 'About 99.9% (same as each step)' },
      { id: 'b', label: 'About 99% (barely affected)' },
      { id: 'c', label: 'About 82% (0.999^200)', correct: true },
      { id: 'd', label: 'About 50% (most fail)' },
    ],
    explanation:
      '0.999^200 ≈ 0.818, or about 82% yield. Even a tiny 0.1% defect rate per step compounds significantly over 200 steps.',
  },
  {
    scenario: 'You need to estimate the number of piano tuners in Chicago.',
    question: 'Which Fermi estimation approach introduces the least compounding error?',
    options: [
      { id: 'a', label: 'Break it into 10 sub-estimates for precision' },
      { id: 'b', label: 'Use 3-4 well-chosen sub-estimates', correct: true },
      { id: 'c', label: 'Make one big guess directly' },
      { id: 'd', label: 'Average 20 random guesses' },
    ],
    explanation:
      'Fewer chained estimates = less compounding. 3-4 well-chosen estimates balance precision against error propagation. Too many steps amplify uncertainty.',
  },
  {
    scenario: 'In a precision budget, you have a total tolerance of ±1mm split across 4 components.',
    question: 'If errors add in quadrature (RSS), how much tolerance can each component have?',
    options: [
      { id: 'a', label: '±0.25mm each (divide equally)' },
      { id: 'b', label: '±0.5mm each (RSS gives √4 = 2 advantage)', correct: true },
      { id: 'c', label: '±1mm each (they are independent)' },
      { id: 'd', label: '±0.1mm each (must be very tight)' },
    ],
    explanation:
      'For RSS (root sum of squares): √(4 × x²) = 1mm, so x = 0.5mm. RSS addition gives you more budget per component than worst-case addition.',
  },
  {
    scenario: 'An order-of-magnitude estimate says a quantity is "about 10,000" with typical Fermi precision.',
    question: 'What range should you consider reasonable?',
    options: [
      { id: 'a', label: '9,000 to 11,000 (±10%)' },
      { id: 'b', label: '1,000 to 100,000 (within one order of magnitude)', correct: true },
      { id: 'c', label: 'Exactly 10,000 (the estimate is precise)' },
      { id: 'd', label: '5,000 to 20,000 (±factor of 2)' },
    ],
    explanation:
      'An "order of magnitude" estimate is accurate to within about a factor of 10, meaning the true value is likely between 1,000 and 100,000.',
  },
  {
    scenario: 'A supply chain has 8 independent factors, each estimated with ±15% uncertainty.',
    question: 'What is the approximate range of the final estimate?',
    options: [
      { id: 'a', label: '±15% (same as each factor)' },
      { id: 'b', label: 'About ±120% (add them)' },
      { id: 'c', label: 'The estimate could be roughly 2x too high or too low', correct: true },
      { id: 'd', label: 'About ±45% (√8 × 15%)' },
    ],
    explanation:
      '(1.15)^8 ≈ 3.06, meaning the true value could be ~3x higher or ~1/3 of your estimate. Roughly a 2-3x range in either direction.',
  },
  {
    scenario: 'A rocket engine has 200+ precision-machined parts, each with ±0.001 inch tolerance.',
    question: 'Why is "tolerance stack-up" a critical concern?',
    options: [
      { id: 'a', label: 'Because individual tolerances are too large' },
      { id: 'b', label: 'Because small tolerances accumulate and can cause fit/function failures', correct: true },
      { id: 'c', label: 'Because tolerance is measured in the wrong units' },
      { id: 'd', label: 'Because only the largest tolerance matters' },
    ],
    explanation:
      'Even with tight individual tolerances, 200+ parts can accumulate errors. Worst case: 200 × 0.001 = 0.2 inches. RSS: √200 × 0.001 ≈ 0.014 inches. Both can be significant in precision assemblies.',
  },
  {
    scenario: 'You are comparing precision vs accuracy in estimation.',
    question: 'Which statement best describes the difference?',
    options: [
      { id: 'a', label: 'Precision means correct; accuracy means repeatable' },
      { id: 'b', label: 'Accuracy means close to truth; precision means tightly clustered', correct: true },
      { id: 'c', label: 'They are the same thing' },
      { id: 'd', label: 'Precision is for big numbers; accuracy is for small ones' },
    ],
    explanation:
      'Accuracy = how close to the true value (low bias). Precision = how tightly results cluster (low variance). You can be precise but inaccurate (consistently wrong) or accurate but imprecise (right on average but scattered).',
  },
];

// ─── Real World Applications (4 items) ─────────────────────────────────────────
const realWorldApps: {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string; icon: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}[] = [
  {
    icon: '🚀',
    title: 'Mars Mission Fuel Calculation',
    short: 'Mars Fuel',
    tagline: 'Every gram of error compounds across 300 million miles',
    description:
      'Interplanetary missions require calculating fuel needs through a long chain of estimates: atmospheric drag, gravitational assists, trajectory corrections, and more. Each estimate carries uncertainty that compounds through the chain.',
    connection:
      'Just like our precision budget simulator, NASA engineers must track how uncertainty in each estimation step propagates to the final fuel requirement. A small error early can mean the difference between landing safely and running out of fuel.',
    howItWorks:
      'Engineers assign error budgets to each calculation step and use Monte Carlo simulations to model total uncertainty. They add safety margins based on the compounded error, often carrying 15-20% extra fuel.',
    stats: [
      { value: '12', label: 'Estimation Steps', icon: '📐' },
      { value: '5%/step', label: 'Per-Step Uncertainty', icon: '📊' },
      { value: '~80%', label: 'Total Uncertainty', icon: '🎯' },
    ],
    examples: [
      'Delta-v calculations for orbital transfers',
      'Atmospheric entry heating estimates',
      'Landing site terrain uncertainty',
      'Communication delay error propagation',
    ],
    companies: ['NASA', 'SpaceX', 'ESA', 'Blue Origin'],
    futureImpact:
      'As missions extend to Jupiter and beyond, estimation chains grow longer. Better precision budgeting means lighter spacecraft, cheaper launches, and more ambitious destinations.',
    color: '#EF4444',
  },
  {
    icon: '💎',
    title: 'Semiconductor Yield Forecasting',
    short: 'Chip Yield',
    tagline: 'Hundreds of process steps, each must be near-perfect',
    description:
      'Modern chip fabrication involves 200+ process steps: deposition, lithography, etching, doping, and more. Each step has a small defect probability that compounds across the full process.',
    connection:
      'This is precision budgeting in its purest form. A 99.9% yield per step sounds excellent, but (0.999)^200 = 82% total yield. Improving each step by just 0.01% can dramatically improve final yield.',
    howItWorks:
      'Fab engineers track defect density per step and model yield using the Poisson yield model. They allocate "defect budgets" to each process step and focus improvement efforts where compounding has the most impact.',
    stats: [
      { value: '200+', label: 'Process Steps', icon: '🔬' },
      { value: '99.9%/step', label: 'Step Yield', icon: '✅' },
      { value: '~82%', label: 'Total Yield', icon: '📈' },
    ],
    examples: [
      'TSMC 3nm process yield optimization',
      'EUV lithography defect budgeting',
      'Wafer-level reliability testing',
      'Die-to-die variation analysis',
    ],
    companies: ['TSMC', 'Samsung Foundry', 'Intel', 'ASML'],
    futureImpact:
      'As chips shrink to 2nm and below, each step must improve to sub-99.99% defect rates. Precision budgeting drives the economics of the entire semiconductor industry.',
    color: '#8B5CF6',
  },
  {
    icon: '⚡',
    title: 'Power Grid Capacity Planning',
    short: 'Grid Planning',
    tagline: 'Multiple uncertain factors multiply into massive ranges',
    description:
      'Grid planners must estimate future demand by combining multiple uncertain factors: population growth, industrial load, renewable intermittency, EV adoption, weather patterns, and economic trends.',
    connection:
      'Each factor is an independent estimate with its own error margin. When 8 factors each have ±15% uncertainty, the combined estimate can vary by 2-3x in either direction — making infrastructure investment decisions extremely challenging.',
    howItWorks:
      'Utilities use probabilistic forecasting, combining multiple uncertain inputs through Monte Carlo simulation. They plan for percentile scenarios (P10, P50, P90) rather than single point estimates.',
    stats: [
      { value: '8', label: 'Key Factors', icon: '📋' },
      { value: '±15%', label: 'Per-Factor Error', icon: '📉' },
      { value: '2-3x', label: 'Total Range', icon: '↔️' },
    ],
    examples: [
      'Regional peak demand forecasting',
      'Renewable generation uncertainty',
      'EV charging load estimation',
      'Climate change impact on cooling demand',
    ],
    companies: ['PG&E', 'National Grid', 'ERCOT', 'EDF Energy'],
    futureImpact:
      'The energy transition multiplies uncertainty: solar/wind intermittency, battery storage degradation, and emerging loads like AI data centers all add estimation steps to the chain.',
    color: '#F59E0B',
  },
  {
    icon: '🔧',
    title: 'Rocket Engine Turbopump Design',
    short: 'Turbopump',
    tagline: 'Hundreds of parts, each tolerance stacks up',
    description:
      'Rocket turbopumps spin at 30,000+ RPM and must maintain precise clearances. With 200+ precision-machined parts, each with ±0.001 inch tolerance, the "tolerance stack-up" becomes a critical engineering challenge.',
    connection:
      'This is a physical manifestation of precision budgeting. Each part tolerance is like an estimation step — they accumulate. Engineers must decide how to allocate the total tolerance budget across hundreds of components.',
    howItWorks:
      'Engineers use RSS (root sum of squares) analysis for statistical tolerance stack-up, plus worst-case analysis for safety-critical dimensions. They allocate tighter tolerances to the most sensitive components.',
    stats: [
      { value: '200+', label: 'Precision Parts', icon: '⚙️' },
      { value: '±0.001in', label: 'Per-Part Tolerance', icon: '📏' },
      { value: 'Critical', label: 'Stack-Up Risk', icon: '⚠️' },
    ],
    examples: [
      'Turbopump bearing clearance budgets',
      'Injector plate orifice tolerance analysis',
      'Nozzle throat diameter stack-up',
      'Combustion chamber seal gap allocation',
    ],
    companies: ['SpaceX', 'Rocketdyne', 'Blue Origin', 'Relativity Space'],
    futureImpact:
      'Additive manufacturing enables tighter tolerances on complex geometries, but introduces new uncertainty sources. Precision budgeting evolves but never goes away.',
    color: '#3B82F6',
  },
];

// ─── Phase Type ────────────────────────────────────────────────────────────────
type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

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
  mastery: 'Mastery',
};

// ─── Component ─────────────────────────────────────────────────────────────────
const ELON_PrecisionBudgetRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const validPhases: Phase[] = ['hook','predict','play','review','twist_predict','twist_play','twist_review','transfer','test','mastery'];
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation values
  const [perStepErrorPct, setPerStepErrorPct] = useState(5); // integer 1-1000
  const [numSteps, setNumSteps] = useState(10);
  const perStepError = 1 + perStepErrorPct / 100;
  const [selectedMaterial, setSelectedMaterial] = useState<'multiplicative' | 'additive' | 'rss'>('multiplicative');

  // Twist simulation
  const [twistSteps, setTwistSteps] = useState(8);
  const [twistPerStepErrorPct, setTwistPerStepErrorPct] = useState(105); // integer 1-500

  const twistPerStepError = twistPerStepErrorPct / 100;

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState<number | null>(0);
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);

  const isNavigating = useRef(false);


  // ── Colors ─────────────────────────────────────────────────────────────────
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249,115,22,0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#2a2a3a',
    secondaryMuted: '#94a3b8',
  };

  // ── Typography ─────────────────────────────────────────────────────────────
  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // ── Mobile Detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Sync external gamePhase ────────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // ── Fire game_started on mount ─────────────────────────────────────────────
  useEffect(() => {
    onGameEvent?.({
      eventType: 'game_started',
      gameType: 'elon_precision_budget',
      gameTitle: 'Precision Budget',
      details: {},
      timestamp: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Emit event helper ──────────────────────────────────────────────────────
  const emitEvent = useCallback(
    (eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
      onGameEvent?.({
        eventType,
        gameType: 'elon_precision_budget',
        gameTitle: 'Precision Budget',
        details,
        timestamp: Date.now(),
      });
    },
    [onGameEvent]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToPhase = useCallback(
    (newPhase: Phase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      playSound('transition');
      emitEvent('phase_changed', { from: phase, to: newPhase });
      setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
      setTimeout(() => {
        isNavigating.current = false;
      }, 300);
    },
    [phase, emitEvent]
  );

  // ── Computed Values ────────────────────────────────────────────────────────
  const computeTotalError = (steps: number, errorPerStep: number) => {
    return Math.pow(errorPerStep, steps);
  };

  const computeRSSError = (steps: number, errorPerStep: number) => {
    const perStepPct = errorPerStep - 1;
    return 1 + Math.sqrt(steps) * perStepPct;
  };

  const computeAdditiveError = (steps: number, errorPerStep: number) => {
    return 1 + steps * (errorPerStep - 1);
  };

  const getErrorForMode = (steps: number, errPerStep: number, mode: string) => {
    switch (mode) {
      case 'multiplicative':
        return computeTotalError(steps, errPerStep);
      case 'additive':
        return computeAdditiveError(steps, errPerStep);
      case 'rss':
        return computeRSSError(steps, errPerStep);
      default:
        return computeTotalError(steps, errPerStep);
    }
  };

  const totalError = getErrorForMode(numSteps, perStepError, selectedMaterial);
  const twistTotalError = computeTotalError(twistSteps, twistPerStepError);

  // ── Step errors for visualization ──────────────────────────────────────────
  const getStepErrors = (steps: number, errPerStep: number) => {
    const result: number[] = [];
    for (let i = 1; i <= steps; i++) {
      result.push(Math.pow(errPerStep, i));
    }
    return result;
  };

  const stepErrors = getStepErrors(numSteps, perStepError);
  const twistStepErrors = getStepErrors(twistSteps, twistPerStepError);

  // ── Color for error level ──────────────────────────────────────────────────
  const getErrorColor = (error: number) => {
    if (error < 1.3) return colors.success;
    if (error < 2.0) return colors.warning;
    return colors.error;
  };

  // ── Slider style ───────────────────────────────────────────────────────────
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${colors.success}, ${colors.warning}, ${colors.error})`,
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: colors.accent,
    cursor: 'pointer',
  };

  // ── Render Progress Bar ────────────────────────────────────────────────────
  const renderProgressBar = () => {
    const idx = phaseOrder.indexOf(phase);
    const pct = ((idx + 1) / phaseOrder.length) * 100;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '4px',
          background: colors.bgSecondary,
          zIndex: 1100,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    );
  };

  // ── Render Nav Dots ────────────────────────────────────────────────────────
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
      {phaseOrder.map((p) => (
        <div
          key={p}
          role="button"
          tabIndex={0}
          data-navigation-dot="true"
          aria-label={phaseLabels[p]}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phase === p ? colors.accent : colors.border,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
          }}
        />
      ))}
    </div>
  );

  // ── Navigation Bar ─────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const NavigationBar = useMemo(() => ({
    onBack,
    onNext,
    backDisabled,
    nextDisabled,
    nextLabel,
  }: {
    onBack?: () => void;
    onNext?: () => void;
    backDisabled?: boolean;
    nextDisabled?: boolean;
    nextLabel?: string;
  }) => (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <button
        onClick={onBack}
        disabled={backDisabled}
        style={{
          padding: '10px 20px',
          minHeight: '44px',
          background: backDisabled ? colors.border : colors.bgCard,
          color: backDisabled ? colors.textMuted : colors.textPrimary,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          cursor: backDisabled ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '15px',
          opacity: backDisabled ? 0.5 : 1,
        }}
      >
        Back
      </button>
      {renderNavDots()}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          padding: '10px 20px',
          minHeight: '44px',
          background: nextDisabled ? colors.border : 'linear-gradient(135deg, ' + colors.accent + ', #fb923c)',
          color: nextDisabled ? colors.textMuted : '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '15px',
          opacity: nextDisabled ? 0.5 : 1,
          boxShadow: nextDisabled ? 'none' : `0 0 20px ${colors.accentGlow}`,
        }}
      >
        {nextLabel || 'Next'}
      </button>
    </div>
  ), []);

  // ── SVG: Error Propagation Visualization ───────────────────────────────────
  const renderErrorSVG = (
    errors: number[],
    stepsCount: number,
    errPerStep: number,
    mode: string,
    width = 600,
    height = 400
  ) => {
    const maxError = Math.max(...errors, 2);
    const barWidth = Math.min(40, (width - 120) / stepsCount - 8);
    const chartLeft = 60;
    const chartRight = width - 30;
    const chartTop = 40;
    const chartBottom = height - 60;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;

    // Scale error to chart height (1 = no error at bottom, maxError at top)
    const scaleY = (val: number) => chartBottom - ((val - 1) / (maxError - 1)) * chartHeight;
    const scaleX = (i: number) => chartLeft + (i + 0.5) * (chartWidth / stepsCount);

    // Confidence cone points
    const coneTop: string[] = [];
    const coneBottom: string[] = [];
    for (let i = 0; i < stepsCount; i++) {
      const x = scaleX(i);
      const err = errors[i];
      const yTop = scaleY(err);
      const yBottom = chartBottom - (chartBottom - scaleY(err)) * 0.15; // slight lower cone
      coneTop.push(`${x},${yTop}`);
      coneBottom.push(`${x},${yBottom}`);
    }
    const conePoints = [...coneTop, ...coneBottom.reverse()].join(' ');

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', maxWidth: `${width}px`, height: 'auto' }}
      >
        <defs>
          <linearGradient id="errorGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="50%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <linearGradient id="coneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} stopOpacity={0.15} />
            <stop offset="50%" stopColor={colors.warning} stopOpacity={0.2} />
            <stop offset="100%" stopColor={colors.error} stopOpacity={0.25} />
          </linearGradient>
          <linearGradient id="barGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="40%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="axisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.textMuted} stopOpacity={0.6} />
            <stop offset="100%" stopColor={colors.textMuted} stopOpacity={0.2} />
          </linearGradient>
        </defs>

        {/* Background grid lines */}
        {[1, 1.5, 2, 3, 5, 8].filter((v) => v <= maxError).map((v, i) => {
          const y = scaleY(v);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={chartLeft}
                y1={y}
                x2={chartRight}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
              <text
                x={chartLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill={colors.textMuted}
                fontSize="11"
              >
                {v < 2 ? `${((v - 1) * 100).toFixed(0)}%` : `${v.toFixed(1)}x`}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={colors.textMuted} strokeWidth={1.5} />
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.textMuted} strokeWidth={1.5} />

        {/* Axis labels */}
        <text x={width / 2} y={height - 5} textAnchor="middle" fill={colors.textPrimary} fontSize="12">Estimation Steps (Time)</text>
        <text x={-1} y={height / 2} textAnchor="middle" fill={colors.textPrimary} fontSize="11" transform={`rotate(-90, -1, ${height / 2})`}>Error Rate</text>

        {/* Confidence cone */}
        {stepsCount > 1 && (
          <polygon points={conePoints} fill="url(#coneGrad)" stroke="none" />
        )}

        {/* Stacked bars */}
        {errors.map((err, i) => {
          const x = scaleX(i) - barWidth / 2;
          const barHeight = ((err - 1) / (maxError - 1)) * chartHeight;
          const barY = chartBottom - barHeight;
          const errColor = getErrorColor(err);

          return (
            <g key={`bar-${i}`}>
              {/* Bar shadow */}
              <rect
                x={x + 2}
                y={barY + 2}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill="rgba(0,0,0,0.3)"
              />
              {/* Bar */}
              <rect
                x={x}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={errColor}
                opacity={0.85}
                filter="url(#barGlow)"
              />
              {/* Error label */}
              <text
                x={scaleX(i)}
                y={barY - 8}
                textAnchor="middle"
                fill={errColor}
                fontSize="11"
                fontWeight="bold"
              >
                {err < 2 ? `${((err - 1) * 100).toFixed(0)}%` : `${err.toFixed(1)}x`}
              </text>
              {/* Step label */}
              <text
                x={scaleX(i)}
                y={chartBottom + 16}
                textAnchor="middle"
                fill={colors.textMuted}
                fontSize="11"
              >
                Step {i + 1}
              </text>
            </g>
          );
        })}

        {/* Connecting line through bar tops */}
        {errors.length > 1 && (
          <polyline
            points={errors.map((err, i) => `${scaleX(i)},${scaleY(err)}`).join(' ')}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            filter="url(#glow)"
          />
        )}

        {/* Interactive dots on line */}
        {errors.map((err, i) => (
          <circle
            key={`dot-${i}`}
            cx={scaleX(i)}
            cy={scaleY(err)}
            r={6}
            fill={getErrorColor(err)}
            stroke={colors.textPrimary}
            strokeWidth={2}
            filter="url(#glow)"
          />
        ))}

        {/* Total error label */}
        <text
          x={width / 2}
          y={24}
          textAnchor="middle"
          fill={colors.textPrimary}
          fontSize="14"
          fontWeight="bold"
        >
          {mode === 'multiplicative'
            ? 'Multiplicative Error Compounding'
            : mode === 'additive'
            ? 'Additive Error (Linear)'
            : 'RSS Error (Root Sum Squares)'}
        </text>

        {/* Legend */}
        <rect x={chartRight - 130} y={chartTop} width={120} height={70} rx={6} fill={colors.bgCard} opacity={0.9} />
        <circle cx={chartRight - 115} cy={chartTop + 18} r={4} fill={colors.success} />
        <text x={chartRight - 106} y={chartTop + 22} fill={colors.textMuted} fontSize="11">&lt;30% error</text>
        <circle cx={chartRight - 115} cy={chartTop + 36} r={4} fill={colors.warning} />
        <text x={chartRight - 106} y={chartTop + 40} fill={colors.textMuted} fontSize="11">30-100% error</text>
        <circle cx={chartRight - 115} cy={chartTop + 54} r={4} fill={colors.error} />
        <text x={chartRight - 106} y={chartTop + 58} fill={colors.textMuted} fontSize="11">&gt;100% error</text>
      </svg>
    );
  };

  // ── Phase Wrapper ──────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const PhaseWrapper = useMemo(() => ({ children, nav }: { children: React.ReactNode; nav: React.ReactNode }) => (
    <div
      style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderProgressBar()}
      <div
        style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {children}
      </div>
      {nav}
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), []);

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: HOOK
  // ═════════════════════════════════════════════════════════════════════════════
  const renderHook = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          backDisabled
          onNext={() => goToPhase('predict')}
          nextLabel="Start Exploring"
        />
      }
    >
<div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: isMobile ? '56px' : '72px' }}>🎯📊</span>
        </div>

        <h1
          style={{
            ...typo.h1,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          Precision Budget
        </h1>

        <p
          style={{
            ...typo.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: '32px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          &ldquo;Give me an order of magnitude and I can change the world. Give me two wrong ones
          and I won&rsquo;t even find it.&rdquo;
        </p>

        <div
          style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: isMobile ? '20px' : '32px',
            border: `1px solid ${colors.border}`,
            marginBottom: '20px',
          }}
        >
          <h2 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
            The Fermi Estimation Challenge
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            Enrico Fermi was famous for making surprisingly accurate estimates from seemingly
            impossible questions. &ldquo;How many piano tuners are in Chicago?&rdquo; He would
            break the problem into smaller, estimable pieces.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            But here is the catch: <strong style={{ color: colors.warning }}>each estimation step
            carries uncertainty, and those uncertainties compound</strong>. A 5% error per step
            sounds tiny, but across 12 steps it grows to 80%.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            In this game, you will discover how to budget your precision wisely — because in
            engineering, knowing <em>how wrong you might be</em> is just as important as getting
            the right answer.
          </p>
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${colors.bgCard}, rgba(249,115,22,0.1))`,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.accent}33`,
            textAlign: 'center',
          }}
        >
          <p style={{ ...typo.small, color: colors.textMuted }}>
            ELON Game 2 of 36 — Error Propagation and Precision Budgeting</p><p style={{ ...typo.small, color: 'rgba(203, 213, 225, 0.7)' }}>Explore how errors compound through estimation chains
          </p>
        </div>
      </div>
    </PhaseWrapper>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: PREDICT
  // ═════════════════════════════════════════════════════════════════════════════
  const predictOptions = [
    { id: 'a', label: 'About 10% (just 2 x 5%)' },
    { id: 'b', label: 'About 60% (add them up)' },
    { id: 'c', label: 'About 80% (they compound exponentially)' },
    { id: 'd', label: 'Exactly 5% (errors cancel out)' },
  ];

  const renderPredict = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('hook')}
          onNext={() => {
            emitEvent('prediction_made', { prediction });
            goToPhase('play');
          }}
          nextDisabled={prediction === null}
          nextLabel="Test Your Prediction"
        />
      }
    >
<div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Make Your Prediction
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 2 of 10 — Predict
        </p>

        <div
          style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: isMobile ? '20px' : '32px',
            border: `1px solid ${colors.border}`,
            marginBottom: '20px',
          }}
        >
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
            The Scenario
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
            A Mars mission fuel calculation has <strong style={{ color: colors.warning }}>12 estimation steps</strong>,
            each with <strong style={{ color: colors.warning }}>5% uncertainty</strong>.
            What is the total uncertainty in the final answer?
          </p>

        </div>

        {/* Static preview SVG */}
        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
          {renderErrorSVG(
            Array.from({length: 12}, (_, i) => Math.pow(1.05, i + 1)),
            12, 1.05, 'multiplicative', 640, 400
          )}
        </div>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: isMobile ? '20px' : '32px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>What Do You Think?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  emitEvent('selection_made', { option: opt.id, label: opt.label });
                }}
                style={{
                  padding: '16px 20px',
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgSecondary,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: typo.body.fontSize,
                  fontWeight: prediction === opt.id ? 600 : 400,
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: colors.accent, fontWeight: 700, marginRight: '12px' }}>
                  {opt.id.toUpperCase()}.
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {prediction !== null && (
          <div
            style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '16px 20px',
              border: `1px solid ${colors.accent}33`,
              textAlign: 'center',
            }}
          >
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Interesting choice! Let us see how errors actually compound...
            </p>
          </div>
        )}
      </div>
    </PhaseWrapper>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: PLAY
  // ═════════════════════════════════════════════════════════════════════════════
  const renderPlay = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('predict')}
          onNext={() => goToPhase('review')}
          nextLabel="See Results"
        />
      }
    >
<div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Error Propagation Simulator
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 3 of 10 — Experiment
        </p>

        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
          This concept is important in real-world engineering and technology design. Try adjusting the sliders below to observe how errors compound through estimation chains. Notice how small per-step changes lead to dramatic differences in total uncertainty.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          {/* Left: SVG visualization */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            {/* SVG Visualization */}
            <div
              style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: isMobile ? '12px' : '16px',
                border: `1px solid ${colors.border}`,
                marginBottom: '20px',
                maxHeight: '50vh',
                overflow: 'hidden',
              }}
            >
              {renderErrorSVG(
                (() => {
                  const errs: number[] = [];
                  for (let i = 1; i <= numSteps; i++) {
                    errs.push(getErrorForMode(i, perStepError, selectedMaterial));
                  }
                  return errs;
                })(),
                numSteps,
                perStepError,
                selectedMaterial,
                isMobile ? 360 : 640,
                isMobile ? 280 : 400
              )}
            </div>

            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
              Equation: Total Error = (per-step error)^steps — varies as the number of estimation steps increases
            </p>

            {/* Total Error Display */}
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.bgCard}, ${getErrorColor(totalError)}11)`,
                borderRadius: '16px',
                padding: '16px',
                border: `1px solid ${getErrorColor(totalError)}44`,
                textAlign: 'center',
              }}
            >
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>
                Total Compounded Uncertainty
              </p>
              <p
                style={{
                  fontSize: isMobile ? '36px' : '48px',
                  fontWeight: 800,
                  color: getErrorColor(totalError),
                  marginBottom: '8px',
                }}
              >
                {totalError < 10
                  ? totalError < 2
                    ? `${((totalError - 1) * 100).toFixed(0)}%`
                    : `${totalError.toFixed(2)}x`
                  : `${totalError.toFixed(0)}x`}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                {selectedMaterial === 'multiplicative'
                  ? `(${perStepError.toFixed(2)})^${numSteps} = ${totalError.toFixed(3)}`
                  : selectedMaterial === 'additive'
                  ? `1 + ${numSteps} x ${(perStepError - 1).toFixed(2)} = ${totalError.toFixed(3)}`
                  : `1 + sqrt(${numSteps}) x ${(perStepError - 1).toFixed(2)} = ${totalError.toFixed(3)}`}
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                Your estimate could be off by a factor of{' '}
                <strong style={{ color: getErrorColor(totalError) }}>
                  {totalError.toFixed(1)}
                </strong>{' '}
                in either direction
              </p>
            </div>
          </div>

          {/* Right: Controls panel */}
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Estimation Precision Slider */}
            <div
              style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: isMobile ? '20px' : '28px',
                border: `1px solid ${colors.border}`,
                marginBottom: '20px',
              }}
            >
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>
                Estimation Precision
              </h3>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px' }}>
                How accurate is each estimation step?
              </p>

              <input type="range" min="0" max="100" value={perStepErrorPct}
                onChange={(e) => setPerStepErrorPct(parseInt(e.target.value))}
                onInput={(e) => setPerStepErrorPct(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span style={{ ...typo.small, color: colors.success }}>Precise (1.01x)</span>
                <span
                  style={{
                    ...typo.body,
                    color: getErrorColor(perStepError),
                    fontWeight: 700,
                  }}
                >
                  {perStepError < 2
                    ? `±${((perStepError - 1) * 100).toFixed(0)}% per step`
                    : `${perStepError.toFixed(1)}x per step`}
                </span>
                <span style={{ ...typo.small, color: colors.error }}>Rough (10x)</span>
              </div>
            </div>

            {/* Number of Steps Slider */}
            <div
              style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: isMobile ? '20px' : '28px',
                border: `1px solid ${colors.border}`,
                marginBottom: '20px',
              }}
            >
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>
                Estimation Chain Length
              </h3>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px' }}>
                How many chained estimates? ({numSteps} steps)
              </p>

              <input type="range" min="1" max="12" value={numSteps}
                onChange={(e) => setNumSteps(parseInt(e.target.value))}
                onInput={(e) => setNumSteps(parseInt((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                }}
              >
                <span style={{ ...typo.small, color: colors.success }}>1 step</span>
                <span style={{ ...typo.body, color: colors.accent, fontWeight: 700 }}>
                  {numSteps} steps
                </span>
                <span style={{ ...typo.small, color: colors.error }}>12 steps</span>
              </div>
            </div>

            {/* Error Model Selector */}
            <div
              style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: isMobile ? '20px' : '28px',
                border: `1px solid ${colors.border}`,
                marginBottom: '20px',
              }}
            >
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Error Propagation Model
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'multiplicative', label: 'Multiplicative', desc: 'Errors multiply (worst case)' },
                  { key: 'additive', label: 'Additive', desc: 'Errors add linearly' },
                  { key: 'rss', label: 'RSS', desc: 'Root sum of squares' },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => {
                      playSound('click');
                      setSelectedMaterial(m.key as typeof selectedMaterial);
                      emitEvent('selection_made', { model: m.key });
                    }}
                    style={{
                      flex: 1,
                      minWidth: isMobile ? '100%' : '150px',
                      padding: '12px 16px',
                      background: selectedMaterial === m.key ? `${colors.accent}22` : colors.bgSecondary,
                      border: `2px solid ${selectedMaterial === m.key ? colors.accent : colors.border}`,
                      borderRadius: '10px',
                      color: selectedMaterial === m.key ? colors.accent : colors.textSecondary,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textMuted }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: REVIEW
  // ═════════════════════════════════════════════════════════════════════════════
  const renderReview = () => {
    const correctAnswer = 'c';
    const isCorrect = prediction === correctAnswer;

    return (
      <PhaseWrapper
        nav={
          <NavigationBar
            onBack={() => goToPhase('play')}
            onNext={() => goToPhase('twist_predict')}
            nextLabel="Next Challenge"
          />
        }
      >
<div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
            Understanding Error Compounding
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
            Phase 4 of 10 — Review
          </p>

          {/* Prediction result */}
          <div
            style={{
              background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${isCorrect ? colors.success : colors.error}44`,
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '48px' }}>{isCorrect ? '✅' : '❌'}</span>
            <h3
              style={{
                ...typo.h3,
                color: isCorrect ? colors.success : colors.error,
                marginTop: '12px',
                marginBottom: '8px',
              }}
            >
              {isCorrect ? 'Excellent! You got it right!' : 'Not quite — but that is the point!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              {isCorrect
                ? 'You correctly identified that errors compound exponentially, not linearly.'
                : 'Your prediction helped reveal a common misconception. As you observed, most people underestimate how errors compound. That is exactly why precision budgeting matters.'}
            </p>
          </div>

          {/* Explanation */}
          <div
            style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: isMobile ? '20px' : '32px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}
          >
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              The Math Behind Error Compounding
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              When you multiply estimates, their uncertainties multiply too. For 12 steps,
              each with 5% uncertainty:
            </p>
            <div
              style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: isMobile ? '14px' : '16px',
                color: colors.accent,
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              (1.05)^12 = 1.796 ... approximately 80% total uncertainty
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This is <strong style={{ color: colors.warning }}>not</strong> the same as adding:
              12 x 5% = 60%. The compounding effect adds an extra ~20 percentage points.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              This exponential growth is why engineers use{' '}
              <strong style={{ color: colors.accent }}>precision budgets</strong> — allocating
              tighter tolerances to steps that have the most impact on the final result.
            </p>
          </div>

          {/* Key insights */}
          <div
            style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: isMobile ? '20px' : '28px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '16px' }}>
              Key Insights
            </h3>
            {[
              'Errors compound multiplicatively, not additively',
              'Fewer estimation steps means less compounding',
              'Improving the worst step gives the biggest payoff',
              'RSS (root sum of squares) gives tighter bounds for independent errors',
            ].map((insight, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: i < 3 ? '12px' : 0,
                }}
              >
                <span style={{ color: colors.success, fontSize: '18px', lineHeight: 1.6 }}>
                  ✓
                </span>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </PhaseWrapper>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: TWIST PREDICT
  // ═════════════════════════════════════════════════════════════════════════════
  const twistPredictOptions = [
    { id: 'a', label: 'Error grows a little more (maybe +10%)' },
    { id: 'b', label: 'Error roughly doubles' },
    { id: 'c', label: 'Error grows explosively — 10x or more', correct: true },
    { id: 'd', label: 'Error stays about the same (more steps cancel out)' },
  ];

  const renderTwistPredict = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('review')}
          onNext={() => {
            emitEvent('prediction_made', { twistPrediction });
            goToPhase('twist_play');
          }}
          nextDisabled={twistPrediction === null}
          nextLabel="Explore the Twist"
        />
      }
    >
<div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          New Variable: Chain Length
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 5 of 10 — Twist Prediction
        </p>

        <div
          style={{
            background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.warning}11)`,
            borderRadius: '16px',
            padding: isMobile ? '20px' : '32px',
            border: `1px solid ${colors.warning}44`,
            marginBottom: '20px',
          }}
        >
          <span style={{ fontSize: '36px' }}>🔄</span>
          <h3 style={{ ...typo.h3, color: colors.warning, marginTop: '12px', marginBottom: '16px' }}>
            The Twist: More Steps!
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            We saw 3-step chains before. Now imagine the estimation chain grows from{' '}
            <strong style={{ color: colors.success }}>3 steps</strong> to{' '}
            <strong style={{ color: colors.error }}>8 steps</strong>, each still with the same
            per-step uncertainty.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            What happens to the total error when the chain more than doubles in length?
          </p>
        </div>

        {/* Static preview SVG showing 3-step chain */}
        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
          {renderErrorSVG(
            Array.from({length: 3}, (_, i) => Math.pow(1.10, i + 1)),
            3, 1.10, 'multiplicative', 640, 300
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {twistPredictOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                playSound('click');
                setTwistPrediction(opt.id);
                emitEvent('selection_made', { option: opt.id, label: opt.label });
              }}
              style={{
                padding: '16px 20px',
                background: twistPrediction === opt.id ? `${colors.accent}22` : colors.bgSecondary,
                border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                borderRadius: '12px',
                color: colors.textPrimary,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: typo.body.fontSize,
                fontWeight: twistPrediction === opt.id ? 600 : 400,
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ color: colors.accent, fontWeight: 700, marginRight: '12px' }}>
                {opt.id.toUpperCase()}.
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </PhaseWrapper>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: TWIST PLAY
  // ═════════════════════════════════════════════════════════════════════════════
  const renderTwistPlay = () => {
    const shortChainErrors = getStepErrors(3, twistPerStepError);
    const longChainErrors = getStepErrors(twistSteps, twistPerStepError);
    const shortTotal = computeTotalError(3, twistPerStepError);
    const longTotal = computeTotalError(twistSteps, twistPerStepError);

    return (
      <PhaseWrapper
        nav={
          <NavigationBar
            onBack={() => goToPhase('twist_predict')}
            onNext={() => goToPhase('twist_review')}
            nextLabel="Understand the Twist"
          />
        }
      >
<div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
            Chain Length Comparison
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
            Phase 6 of 10 — Twist Exploration
          </p>

          {/* Educational panel */}
          <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> A side-by-side comparison of short versus long estimation chains, showing how dramatically total error grows as you add more steps to the calculation pipeline.</p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase the per-step error or chain length using the sliders below, watch how the long chain's total error explodes exponentially while the short chain remains relatively contained.</p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            {/* Left: SVG visualizations */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Side-by-side comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px', maxHeight: '50vh', overflow: 'hidden' }}>
                {/* Long chain */}
                <div
                  style={{
                    background: colors.bgCard,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.error}44`,
                  }}
                >
                  <h4 style={{ ...typo.h3, color: colors.error, marginBottom: '12px', textAlign: 'center' }}>
                    {twistSteps}-Step Chain
                  </h4>
                  {renderErrorSVG(longChainErrors, twistSteps, twistPerStepError, 'multiplicative', 280, 220)}
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: getErrorColor(longTotal) }}>
                      {longTotal < 2
                        ? `${((longTotal - 1) * 100).toFixed(0)}%`
                        : longTotal < 1000
                        ? `${longTotal.toFixed(1)}x`
                        : `${longTotal.toExponential(1)}`}
                    </span>
                  </div>
                </div>
                {/* Short chain */}
                <div
                  style={{
                    background: colors.bgCard,
                    borderRadius: '12px',
                    padding: '16px',
                    border: `1px solid ${colors.success}44`,
                  }}
                >
                  <h4 style={{ ...typo.h3, color: colors.success, marginBottom: '12px', textAlign: 'center' }}>
                    3-Step Chain
                  </h4>
                  {renderErrorSVG(shortChainErrors, 3, twistPerStepError, 'multiplicative', 280, 220)}
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: getErrorColor(shortTotal) }}>
                      {shortTotal < 2
                        ? `${((shortTotal - 1) * 100).toFixed(0)}%`
                        : `${shortTotal.toFixed(1)}x`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Growth ratio */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.warning}11)`,
                  borderRadius: '16px',
                  padding: '16px',
                  border: `1px solid ${colors.warning}44`,
                  textAlign: 'center',
                }}
              >
                <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>
                  Error Growth Ratio (long / short)
                </p>
                <p style={{ fontSize: '32px', fontWeight: 800, color: colors.warning }}>
                  {(longTotal / shortTotal).toFixed(1)}x more error
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                  Going from 3 to {twistSteps} steps multiplies the total error by{' '}
                  {(longTotal / shortTotal).toFixed(1)}
                </p>
              </div>
            </div>

            {/* Right: Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Per step error slider */}
              <div
                style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: isMobile ? '20px' : '28px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '20px',
                }}
              >
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>
                  Per-Step Error
                </h3>
                <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px' }}>
                  Same error rate for both chains
                </p>
                <input type="range" min="1" max="500" step="1" value={Math.round(twistPerStepError * 100)}
                  onChange={(e) => setTwistPerStepErrorPct(parseInt(e.target.value))}
                onInput={(e) => setTwistPerStepErrorPct(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>1.01x</span>
                  <span style={{ ...typo.body, fontWeight: 700, color: getErrorColor(twistPerStepError) }}>
                    {twistPerStepError < 2
                      ? `±${((twistPerStepError - 1) * 100).toFixed(0)}% each`
                      : `${twistPerStepError.toFixed(1)}x each`}
                  </span>
                  <span style={{ ...typo.small, color: colors.error }}>5x</span>
                </div>
              </div>

              {/* Long chain steps slider */}
              <div
                style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: isMobile ? '20px' : '28px',
                  border: `1px solid ${colors.border}`,
                  marginBottom: '20px',
                }}
              >
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '4px' }}>
                  Long Chain Length
                </h3>
                <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '16px' }}>
                  Comparing 3 steps vs {twistSteps} steps
                </p>
                <input type="range" min="4" max="20" step="1" value={twistSteps}
                  onChange={(e) => setTwistSteps(parseInt(e.target.value))}
                onInput={(e) => setTwistSteps(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>4 steps</span>
                  <span style={{ ...typo.body, fontWeight: 700, color: colors.accent }}>
                    {twistSteps} steps
                  </span>
                  <span style={{ ...typo.small, color: colors.error }}>20 steps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PhaseWrapper>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: TWIST REVIEW
  // ═════════════════════════════════════════════════════════════════════════════
  const renderTwistReview = () => {
    const isCorrect = twistPrediction === 'c';

    return (
      <PhaseWrapper
        nav={
          <NavigationBar
            onBack={() => goToPhase('twist_play')}
            onNext={() => goToPhase('transfer')}
            nextLabel="Real World Apps"
          />
        }
      >
<div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
            The Exponential Truth
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
            Phase 7 of 10 — Deep Insight
          </p>

          {/* Result */}
          <div
            style={{
              background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${isCorrect ? colors.success : colors.error}44`,
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '48px' }}>{isCorrect ? '✅' : '🔍'}</span>
            <h3
              style={{
                ...typo.h3,
                color: isCorrect ? colors.success : colors.warning,
                marginTop: '12px',
              }}
            >
              {isCorrect
                ? 'You nailed it! Error growth is explosive.'
                : 'The growth is more dramatic than most people expect.'}
            </h3>
          </div>

          {/* Deep insight */}
          <div
            style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: isMobile ? '20px' : '32px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}
          >
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              Why Chain Length Matters Exponentially
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Doubling the chain length does not double the error — it{' '}
              <strong style={{ color: colors.error }}>squares</strong> it. Going from 3 to 6
              steps:
            </p>
            <div
              style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                color: colors.accent,
                marginBottom: '16px',
                textAlign: 'center',
                fontSize: isMobile ? '13px' : '15px',
              }}
            >
              3 steps: (1.10)^3 = 1.33 (33% error)<br />
              6 steps: (1.10)^6 = 1.77 (77% error)<br />
              8 steps: (1.10)^8 = 2.14 (114% error)<br />
              12 steps: (1.10)^12 = 3.14 (214% error)
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This is the fundamental reason why{' '}
              <strong style={{ color: colors.accent }}>Fermi estimation</strong> works best with
              the fewest possible steps. Each additional step is not free — it costs you precision
              budget.
            </p>
          </div>

          {/* Strategic insight */}
          <div
            style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: isMobile ? '20px' : '28px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>
              The Precision Budget Strategy
            </h3>
            {[
              'Minimize chain length: fewer steps = less compounding',
              'Invest precision where it matters: tighten the most impactful steps',
              'Use RSS when errors are truly independent (gives ~sqrt(n) instead of n)',
              'Always quantify total uncertainty — never assume errors "cancel out"',
              'Add safety margins proportional to chain length, not step count',
            ].map((tip, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: i < 4 ? '12px' : 0,
                }}
              >
                <span style={{ color: colors.warning, fontSize: '16px', fontWeight: 700 }}>
                  {i + 1}.
                </span>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </PhaseWrapper>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: TRANSFER
  // ═════════════════════════════════════════════════════════════════════════════
  const allAppsCompleted = completedApps.every(Boolean);

  const renderTransfer = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('twist_review')}
          onNext={() => goToPhase('test')}
          nextDisabled={!allAppsCompleted}
          nextLabel="Take the Test"
        />
      }
    >
<div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 8 of 10 — Explore all 4 applications to continue
        </p>

        {selectedApp === null ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
              }}
            >
              {realWorldApps.map((app, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                    emitEvent('selection_made', { app: app.title });
                  }}
                  style={{
                    background: colors.bgCard,
                    borderRadius: '16px',
                    padding: '16px',
                    border: `2px solid ${completedApps[i] ? colors.success : app.color}44`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  {completedApps[i] && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        color: colors.success,
                        fontSize: '20px',
                      }}
                    >
                      ✓
                    </span>
                  )}
                  <span style={{ fontSize: '36px' }}>{app.icon}</span>
                  <h3 style={{ ...typo.h3, color: app.color, marginTop: '12px', marginBottom: '8px' }}>
                    {app.title}
                  </h3>
                  <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                    {app.tagline}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {app.stats.map((stat, j) => (
                      <span
                        key={j}
                        style={{
                          background: `${app.color}22`,
                          color: app.color,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {stat.icon} {stat.value}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {!allAppsCompleted && (
              <p
                style={{
                  ...typo.small,
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: '20px',
                }}
              >
                Explore all 4 applications to unlock the test ({completedApps.filter(Boolean).length}/4 completed)
              </p>
            )}
          </>
        ) : (
          (() => {
            const app = realWorldApps[selectedApp];
            return (
              <div>
                <button
                  onClick={() => setSelectedApp(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600,
                    marginBottom: '16px',
                    padding: 0,
                  }}
                >
                  ← Back to all applications
                </button>

                <div
                  style={{
                    background: colors.bgCard,
                    borderRadius: '16px',
                    padding: isMobile ? '20px' : '32px',
                    border: `1px solid ${app.color}44`,
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '48px' }}>{app.icon}</span>
                    <div>
                      <h3 style={{ ...typo.h2, color: app.color, marginBottom: '4px' }}>
                        {app.title}
                      </h3>
                      <p style={{ ...typo.small, color: colors.textMuted }}>{app.tagline}</p>
                    </div>
                  </div>

                  <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
                    {app.description}
                  </p>

                  {/* Stats row */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {app.stats.map((stat, j) => (
                      <div
                        key={j}
                        style={{
                          flex: 1,
                          minWidth: '100px',
                          background: `${app.color}11`,
                          borderRadius: '12px',
                          padding: '16px',
                          textAlign: 'center',
                          border: `1px solid ${app.color}33`,
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: app.color,
                            marginTop: '4px',
                          }}
                        >
                          {stat.value}
                        </div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Connection */}
                  <div
                    style={{
                      background: colors.bgSecondary,
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px',
                      borderLeft: `4px solid ${app.color}`,
                    }}
                  >
                    <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px', fontSize: '16px' }}>
                      Connection to Precision Budgeting
                    </h4>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      {app.connection}
                    </p>
                  </div>

                  {/* How it works */}
                  <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>
                    How It Works
                  </h4>
                  <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
                    {app.howItWorks}
                  </p>

                  {/* Examples */}
                  <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>
                    Real Examples
                  </h4>
                  <div style={{ marginBottom: '20px' }}>
                    {app.examples.map((ex, j) => (
                      <div
                        key={j}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ color: app.color }}>•</span>
                        <span style={{ ...typo.body, color: colors.textSecondary }}>{ex}</span>
                      </div>
                    ))}
                  </div>

                  {/* Companies */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {app.companies.map((co, j) => (
                      <span
                        key={j}
                        style={{
                          background: `${app.color}18`,
                          color: app.color,
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 600,
                          border: `1px solid ${app.color}33`,
                        }}
                      >
                        {co}
                      </span>
                    ))}
                  </div>

                  {/* Future impact */}
                  <div
                    style={{
                      background: `${app.color}11`,
                      borderRadius: '12px',
                      padding: '16px',
                      border: `1px solid ${app.color}22`,
                    }}
                  >
                    <h4 style={{ ...typo.h3, color: app.color, marginBottom: '8px', fontSize: '16px' }}>
                      Future Impact
                    </h4>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      {app.futureImpact}
                    </p>
                  </div>
                </div>

                {/* Got It button */}
                <button
                  onClick={() => {
                    playSound('success');
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                    emitEvent('button_clicked', { action: 'app_completed', app: app.title });
                    // Auto-advance to next uncompleted app, or to test if all done
                    const nextUncompleted = newCompleted.findIndex((c) => !c);
                    if (nextUncompleted === -1) {
                      setSelectedApp(null);
                      setTimeout(() => goToPhase('test'), 400);
                    } else {
                      setSelectedApp(nextUncompleted);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: app.color,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '17px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: `0 0 24px ${app.color}44`,
                  }}
                >
                  Got It!
                </button>
              </div>
            );
          })()
        )}
      </div>
    </PhaseWrapper>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: TEST
  // ═════════════════════════════════════════════════════════════════════════════
  const handleTestAnswer = (optionId: string) => {
    if (testSubmitted) return;
    playSound('click');
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = optionId;
    setTestAnswers(newAnswers);
    emitEvent('answer_submitted', {
      question: currentQuestion,
      answer: optionId,
    });
  };

  const handleTestSubmit = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const correct = q.options.find((o) => o.correct)?.id;
      if (testAnswers[i] === correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7) {
      playSound('success');
      emitEvent('achievement_unlocked', { achievement: 'test_passed', score });
    } else {
      playSound('failure');
    }
    emitEvent('game_completed', { testScore: score, totalQuestions: 10 });
  };

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const allAnswered = testAnswers.every((a) => a !== null);

    return (
      <PhaseWrapper
        nav={
          <NavigationBar
            onBack={() => goToPhase('transfer')}
            onNext={() => {
              if (testSubmitted) {
                goToPhase('mastery');
              }
            }}
            nextDisabled={!testSubmitted}
            nextLabel="See Results"
          />
        }
      >
<div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
            Knowledge Test
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
            Phase 9 of 10 — Answer all 10 questions. Test your understanding of error propagation, precision budgets, and how uncertainties compound across estimation chains in real engineering scenarios.
          </p>

          {/* Question navigation */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {testQuestions.map((_, i) => {
              const isAnswered = testAnswers[i] !== null;
              const isCurrent = i === currentQuestion;
              let bg = colors.bgSecondary;
              let borderColor = colors.border;

              if (testSubmitted) {
                const correct = testQuestions[i].options.find((o) => o.correct)?.id;
                bg = testAnswers[i] === correct ? `${colors.success}22` : `${colors.error}22`;
                borderColor = testAnswers[i] === correct ? colors.success : colors.error;
              } else if (isCurrent) {
                borderColor = colors.accent;
                bg = `${colors.accent}11`;
              } else if (isAnswered) {
                bg = `${colors.accent}22`;
                borderColor = `${colors.accent}66`;
              }

              return (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: bg,
                    border: `2px solid ${borderColor}`,
                    color: isCurrent ? colors.accent : colors.textSecondary,
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Current question */}
          <div
            style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: isMobile ? '20px' : '32px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}
          >
            <p style={{ ...typo.small, color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>
              Question {currentQuestion + 1} of 10
            </p>
            <div
              style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                borderLeft: `3px solid ${colors.accent}`,
              }}
            >
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                {q.scenario}
              </p>
            </div>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {q.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options.map((opt) => {
                let optBg = colors.bgSecondary;
                let optBorder = colors.border;
                let optColor = colors.textPrimary;

                if (testSubmitted) {
                  if (opt.correct) {
                    optBg = `${colors.success}22`;
                    optBorder = colors.success;
                    optColor = colors.success;
                  } else if (testAnswers[currentQuestion] === opt.id && !opt.correct) {
                    optBg = `${colors.error}22`;
                    optBorder = colors.error;
                    optColor = colors.error;
                  }
                } else if (testAnswers[currentQuestion] === opt.id) {
                  optBg = `${colors.accent}22`;
                  optBorder = colors.accent;
                  optColor = colors.accent;
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleTestAnswer(opt.id)}
                    disabled={testSubmitted}
                    style={{
                      padding: '14px 18px',
                      background: optBg,
                      border: `2px solid ${optBorder}`,
                      borderRadius: '10px',
                      color: optColor,
                      textAlign: 'left',
                      cursor: testSubmitted ? 'default' : 'pointer',
                      fontSize: typo.body.fontSize,
                      fontWeight: testAnswers[currentQuestion] === opt.id ? 600 : 400,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: '10px' }}>
                      {opt.id.toUpperCase()}.
                    </span>
                    {opt.label}
                    {testSubmitted && opt.correct && (
                      <span style={{ marginLeft: '8px', color: colors.success }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation after submit */}
            {testSubmitted && (
              <div
                style={{
                  marginTop: '16px',
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  borderLeft: `3px solid ${colors.accent}`,
                }}
              >
                <p style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '4px' }}>
                  Explanation
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  {q.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Question navigation arrows */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              style={{
                padding: '10px 20px',
                background: currentQuestion === 0 ? colors.border : colors.bgCard,
                color: currentQuestion === 0 ? colors.textMuted : colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: currentQuestion === 0 ? 0.5 : 1,
              }}
            >
              Previous
            </button>

            <span style={{ ...typo.small, color: colors.textMuted }}>
              {currentQuestion + 1} / 10
            </span>

            {currentQuestion < 9 ? (
              <button
                onClick={() => setCurrentQuestion(Math.min(9, currentQuestion + 1))}
                style={{
                  padding: '10px 20px',
                  background: colors.bgCard,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <div style={{ width: '80px' }} />
            )}
          </div>

          {/* Submit button */}
          {!testSubmitted && (
            <button
              onClick={handleTestSubmit}
              disabled={!allAnswered}
              style={{
                width: '100%',
                padding: '16px',
                background: allAnswered ? colors.accent : colors.border,
                color: allAnswered ? '#FFFFFF' : colors.textMuted,
                border: 'none',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: 700,
                cursor: allAnswered ? 'pointer' : 'not-allowed',
                opacity: allAnswered ? 1 : 0.5,
                boxShadow: allAnswered ? `0 0 24px ${colors.accentGlow}` : 'none',
              }}
            >
              {allAnswered ? 'Submit All Answers' : `Answer all questions (${testAnswers.filter(Boolean).length}/10)`}
            </button>
          )}

          {/* Score display */}
          {testSubmitted && (
            <div
              style={{
                background: testScore >= 7 ? `${colors.success}11` : `${colors.warning}11`,
                borderRadius: '16px',
                padding: '16px',
                border: `1px solid ${testScore >= 7 ? colors.success : colors.warning}44`,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '48px', fontWeight: 800, color: testScore >= 7 ? colors.success : colors.warning }}>
                {testScore}/10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                {testScore >= 9
                  ? 'Outstanding! You have mastered precision budgeting.'
                  : testScore >= 7
                  ? 'Great job! You understand error compounding well.'
                  : testScore >= 5
                  ? 'Good effort! Review the explanations to strengthen your understanding.'
                  : 'Keep studying! Error propagation is tricky but essential.'}
              </p>
            </div>
          )}
        </div>
      </PhaseWrapper>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // PHASE: MASTERY
  // ═════════════════════════════════════════════════════════════════════════════
  const renderMastery = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('test')}
          nextDisabled
          nextLabel="Complete"
        />
      }
    >
<div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontSize: isMobile ? '64px' : '80px' }}>🏆</span>
        <h1
          style={{
            ...typo.h1,
            color: colors.accent,
            marginTop: '16px',
            marginBottom: '8px',
          }}
        >
          Precision Budget Mastery
        </h1>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
          You have completed ELON Game #2. Here is your learning summary.
        </p>

        {/* Score summary */}
        <div
          style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            border: `1px solid ${colors.border}`,
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <p style={{ ...typo.small, color: colors.textMuted }}>Test Score</p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: testScore >= 7 ? colors.success : colors.warning }}>
                {testScore}/10
              </p>
            </div>
            <div>
              <p style={{ ...typo.small, color: colors.textMuted }}>Prediction</p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: prediction === 'c' ? colors.success : colors.error }}>
                {prediction === 'c' ? 'Correct' : 'Revised'}
              </p>
            </div>
            <div>
              <p style={{ ...typo.small, color: colors.textMuted }}>Applications</p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: colors.success }}>
                4/4
              </p>
            </div>
          </div>
        </div>

        {/* Learning summary */}
        <div
          style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: isMobile ? '20px' : '32px',
            border: `1px solid ${colors.border}`,
            textAlign: 'left',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '20px' }}>
            What You Learned
          </h3>
          {[
            'Errors compound multiplicatively through calculation chains, growing exponentially with chain length',
            'A 5% error per step across 12 steps yields ~80% total uncertainty, not 60%',
            'Fewer estimation steps always means less compounding — Fermi estimation works best with minimal chains',
            'RSS (root sum of squares) gives tighter bounds when errors are truly independent',
            'Precision budgets help allocate tolerance where it matters most in engineering',
            'Real-world applications span aerospace, semiconductors, energy, and manufacturing',
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <span style={{ color: colors.success, fontSize: '18px', lineHeight: 1.6, flexShrink: 0 }}>
                ✓
              </span>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>

        {/* Memorable takeaway */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.accent}11)`,
            borderRadius: '16px',
            padding: '16px',
            border: `1px solid ${colors.accent}33`,
          }}
        >
          <p style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
            The Core Insight
          </p>
          <p
            style={{
              ...typo.body,
              color: colors.textSecondary,
              fontStyle: 'italic',
            }}
          >
            &ldquo;In any chain of estimates, your total uncertainty is not the sum of the
            parts — it is the <em>product</em>. Knowing how wrong you might be is half the
            battle of being right.&rdquo;
          </p>
        </div>
      </div>
    </PhaseWrapper>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  switch (phase) {
    case 'hook':
      return renderHook();
    case 'predict':
      return renderPredict();
    case 'play':
      return renderPlay();
    case 'review':
      return renderReview();
    case 'twist_predict':
      return renderTwistPredict();
    case 'twist_play':
      return renderTwistPlay();
    case 'twist_review':
      return renderTwistReview();
    case 'transfer': return (
          <TransferPhaseView
          conceptName="E L O N_ Precision Budget"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
    case 'test':
      return renderTest();
    case 'mastery':
      return renderMastery();
    default:
      return renderHook();
  }
};

export default ELON_PrecisionBudgetRenderer;
