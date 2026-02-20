'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON RECURSIVE BOT - Complete 10-Phase Game
// Robots building robots — manufacturing recursion and scaling humanoid production
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

interface ELON_RecursiveBotRendererProps {
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
    scenario: "A factory producing humanoid robots at 100 units/year has a cost of $150,000 per unit. Management wants to scale to 10,000 units/year.",
    question: "According to Wright's law (85% learning curve), what would you expect the cost per unit to approach at 10,000 units?",
    options: [
      { id: 'a', label: "About $50,000-$60,000 per unit", correct: true },
      { id: 'b', label: "About $140,000 — costs barely change" },
      { id: 'c', label: "About $1,000 — costs drop to almost nothing" },
      { id: 'd', label: "About $100,000 — exactly proportional" }
    ],
    explanation: "Wright's law states that for every doubling of cumulative production, cost drops by a fixed percentage (typically 15-20%). Going from 100 to 10,000 is ~6.6 doublings: $150K × 0.85^6.6 ≈ $52K."
  },
  {
    scenario: "A robot assembly cell costs $2M to automate. It replaces 5 workers at $60K/year each, but only runs at 70% uptime initially.",
    question: "What is the approximate payback period for this automation investment?",
    options: [
      { id: 'a', label: "About 2-3 years" },
      { id: 'b', label: "About 7-10 years" },
      { id: 'c', label: "About 9-10 years, accounting for uptime and maintenance", correct: true },
      { id: 'd', label: "It never pays back" }
    ],
    explanation: "Net savings per year = 5 × $60K × 0.7 - maintenance costs ≈ $210K - ~$50K = $160K/year. Payback = $2M / $160K ≈ 12.5 years at low volume. But at high volume with 95% uptime, it drops to ~4 years."
  },
  {
    scenario: "Tesla's Optimus robot has 28 structural actuators. Each actuator requires precise torque control, position sensing, and thermal management.",
    question: "What is the minimum batch size that typically justifies custom actuator tooling ($5M investment) vs. buying off-the-shelf actuators ($800 vs $200 each)?",
    options: [
      { id: 'a', label: "About 100 robots" },
      { id: 'b', label: "About 8,000-9,000 robots", correct: true },
      { id: 'c', label: "About 1 million robots" },
      { id: 'd', label: "Custom tooling always pays off immediately" }
    ],
    explanation: "Break-even: $5M / ($800 - $200) / 28 actuators per robot ≈ 8,300 robots. Below this, off-the-shelf is cheaper despite higher per-unit cost."
  },
  {
    scenario: "A humanoid robot must thread a needle, requiring sub-millimeter dexterous manipulation. Current robotic grippers achieve ~2mm precision reliably.",
    question: "What is the primary challenge in achieving human-level dexterity?",
    options: [
      { id: 'a', label: "Motor precision — we need smaller motors" },
      { id: 'b', label: "Tactile sensing and real-time control loops — the hand needs to feel and adapt", correct: true },
      { id: 'c', label: "The gripper material — we need softer fingers" },
      { id: 'd', label: "Processing power — we need faster CPUs" }
    ],
    explanation: "Human dexterity relies on ~17,000 mechanoreceptors per hand providing real-time tactile feedback at 1000Hz. The challenge is sensing, not actuation."
  },
  {
    scenario: "A robot factory runs 24/7 with automated quality control. The QC system uses vision inspection with 99.5% accuracy on each of 200 checkpoints per robot.",
    question: "What percentage of robots pass all 200 checkpoints without a false rejection?",
    options: [
      { id: 'a', label: "About 99% — almost all pass" },
      { id: 'b', label: "About 37% — roughly 1 in 3 pass", correct: true },
      { id: 'c', label: "About 90% — most pass" },
      { id: 'd', label: "About 5% — almost none pass" }
    ],
    explanation: "P(all pass) = 0.995^200 = 0.368 ≈ 37%. This is why multi-checkpoint QC systems need extremely high per-checkpoint accuracy, or intelligent re-inspection workflows."
  },
  {
    scenario: "FANUC's robot factory in Oshino, Japan operates with robots building robots. The factory produces 80 robots per shift with minimal human oversight.",
    question: "What is the key advantage of robots-building-robots over human assembly?",
    options: [
      { id: 'a', label: "Robots are cheaper than humans" },
      { id: 'b', label: "Consistency and the ability to run 24/7 without fatigue or variation", correct: true },
      { id: 'c', label: "Robots are faster at every individual task" },
      { id: 'd', label: "Robots don't need floor space" }
    ],
    explanation: "The primary advantage is consistency. Robots perform the same operation identically every time, and can run 24/7. Humans are actually faster at novel or complex tasks."
  },
  {
    scenario: "Foxconn aims to automate 30% of its iPhone assembly. The remaining 70% involves flexible cable routing, connector insertion, and quality inspection.",
    question: "Why can't the remaining 70% be easily automated with current technology?",
    options: [
      { id: 'a', label: "The tasks require dexterous manipulation with compliant, deformable materials", correct: true },
      { id: 'b', label: "The factory is too small for more robots" },
      { id: 'c', label: "Robots can't work with electronics" },
      { id: 'd', label: "The cost would be too high" }
    ],
    explanation: "Flexible cable routing and connector insertion require handling deformable objects with force feedback — one of the hardest unsolved problems in robotics."
  },
  {
    scenario: "A Tesla Gigafactory uses 'Giga Press' machines to cast the entire rear underbody of a car in one piece, replacing 70+ stamped and welded parts.",
    question: "How does this relate to recursive manufacturing efficiency?",
    options: [
      { id: 'a', label: "It doesn't — casting is unrelated to automation" },
      { id: 'b', label: "Reducing part count simplifies downstream automation, enabling more robotic assembly", correct: true },
      { id: 'c', label: "The Giga Press is itself a robot" },
      { id: 'd', label: "It only saves material costs" }
    ],
    explanation: "Fewer parts mean fewer assembly steps, fewer weld points, and fewer QC checks — making the remaining assembly much more amenable to full robotic automation."
  },
  {
    scenario: "Wright's law predicts cost declines based on cumulative production doublings. Solar panels followed an 80% learning curve (20% cost drop per doubling).",
    question: "If humanoid robots follow a similar curve, what cost reduction would you expect after 10 doublings (from 1,000 to ~1,000,000 cumulative units)?",
    options: [
      { id: 'a', label: "About 50% cost reduction" },
      { id: 'b', label: "About 90% cost reduction — roughly 10% of original cost", correct: true },
      { id: 'c', label: "About 99% cost reduction" },
      { id: 'd', label: "About 20% cost reduction" }
    ],
    explanation: "With an 80% learning curve: 0.80^10 = 0.107, meaning costs drop to ~10.7% of the original — about a 90% reduction. This is exactly what happened with solar panels."
  },
  {
    scenario: "A humanoid robot production line has 6 major assembly stages: frame, actuators, wiring, sensors, software flash, and QC. Each stage has a different cycle time.",
    question: "If frame assembly takes 45 min, actuators 60 min, wiring 90 min, sensors 30 min, software 15 min, and QC 40 min, what determines the line's throughput?",
    options: [
      { id: 'a', label: "The average time across all stages (46.7 min)" },
      { id: 'b', label: "The bottleneck stage — wiring at 90 minutes", correct: true },
      { id: 'c', label: "The fastest stage — software at 15 min" },
      { id: 'd', label: "The total time — 280 min per robot" }
    ],
    explanation: "In a production line, throughput is limited by the slowest (bottleneck) station. The line produces one robot every 90 minutes regardless of how fast other stations are."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🤖',
    title: 'Tesla Optimus Manufacturing',
    short: 'Mass-producing humanoid robots at automotive scale',
    tagline: 'The ultimate manufacturing recursion',
    description: 'Tesla aims to produce Optimus humanoid robots at a target cost under $20,000, leveraging Gigafactory mass production techniques developed for vehicles. The goal is to apply Wright\'s law aggressively — using the same automation playbook that drove EV costs down by 50% over five years.',
    connection: 'Wright\'s law predicts that every doubling of cumulative Optimus production will reduce cost by ~15-20%, making the <$20K target achievable at 100K+ annual volume.',
    howItWorks: 'Shared Gigafactory floor with vehicle production, common actuator designs across models, and software-defined manufacturing enable rapid iteration.',
    stats: [
      { value: '<$20K', label: 'Target cost', icon: '💰' },
      { value: 'Gigafactory', label: 'Production site', icon: '🏭' },
      { value: 'mass', label: 'Scale ambition', icon: '📈' }
    ],
    examples: ['Optimus Gen 1', 'Optimus Gen 2', 'Factory bot variants', 'Home assistant variants'],
    companies: ['Tesla', 'Boston Dynamics', 'Figure AI', 'Agility Robotics'],
    futureImpact: 'Self-replicating robot factories could make humanoid robots as affordable as appliances within a decade.',
    color: '#EF4444'
  },
  {
    icon: '🚗',
    title: 'Tesla Vehicle Recursion',
    short: 'Robots building cars that fund robots building robots',
    tagline: 'The recursive loop that funds the future',
    description: 'Tesla\'s vehicle factories use the Giga Press to cast entire car underbodies in one piece, replacing 70+ stamped parts. Battery module assembly is fully robotic, and Body-in-White (BIW) welding achieves >95% automation. Each manufacturing innovation feeds back into Optimus production capabilities.',
    connection: 'The same robotic welding, casting, and assembly techniques used for vehicles directly transfer to humanoid robot manufacturing.',
    howItWorks: 'Giga Press die casting, automated battery pack assembly, and robotic BIW welding create a foundation for humanoid robot mass production.',
    stats: [
      { value: 'Giga Press', label: 'Casting innovation', icon: '🔧' },
      { value: 'battery', label: 'Robot assembly', icon: '🔋' },
      { value: 'BIW', label: 'Automation level', icon: '⚡' }
    ],
    examples: ['Model Y Giga casting', 'Cybertruck exoskeleton', '4680 battery line', 'Paint shop robots'],
    companies: ['Tesla', 'IDRA Group', 'KUKA', 'ABB Robotics'],
    futureImpact: 'Unboxed assembly process could cut factory footprint by 40% and enable robot-assembled robots.',
    color: '#3B82F6'
  },
  {
    icon: '🏭',
    title: 'FANUC Robot Factory',
    short: 'The original robots-building-robots facility',
    tagline: 'Where the recursion began',
    description: 'FANUC\'s Oshino facility in Japan is the world\'s most famous example of robots building robots. Operating largely lights-out, the factory produces industrial robots using industrial robots. With 24/7 production and minimal human intervention, it demonstrates that manufacturing recursion is not science fiction — it\'s operational reality.',
    connection: 'FANUC proves that recursive manufacturing works: their robots achieve consistent quality and throughput that exceeds human-assembled alternatives.',
    howItWorks: 'Yellow FANUC robots perform welding, assembly, painting, and testing of new FANUC robots on automated production lines running around the clock.',
    stats: [
      { value: 'Oshino', label: 'Facility location', icon: '🗾' },
      { value: 'robots make', label: 'Robots recursion', icon: '🔄' },
      { value: '24/7', label: 'Production schedule', icon: '⏰' }
    ],
    examples: ['FANUC M-series assembly', 'CRX collaborative robots', 'SCARA line', 'Controller manufacturing'],
    companies: ['FANUC', 'Yaskawa', 'Kawasaki', 'Nachi-Fujikoshi'],
    futureImpact: 'AI-driven adaptive assembly will let robot factories self-optimize production parameters in real time.',
    color: '#F59E0B'
  },
  {
    icon: '📱',
    title: 'Foxconn Automation',
    short: 'The challenge of automating consumer electronics assembly',
    tagline: 'Where robots meet their limits — for now',
    description: 'Foxconn has automated roughly 30% of iPhone assembly, focusing on repetitive tasks like screw driving and screen placement. The remaining 70% — flexible cable routing, tiny connector insertion, and cosmetic inspection — remains stubbornly human. This boundary illuminates what robots can and cannot do today.',
    connection: 'Foxconn\'s automation ceiling shows that Wright\'s law applies to automation capability itself — each generation of robots handles more tasks, pushing the boundary further.',
    howItWorks: 'Foxworx robots handle structured tasks while human workers manage deformable materials, quality judgment calls, and exception handling.',
    stats: [
      { value: '~30%', label: 'Automated tasks', icon: '🤖' },
      { value: 'iPhone', label: 'Primary assembly', icon: '📱' },
      { value: 'replacing', label: 'Human workers', icon: '👷' }
    ],
    examples: ['iPhone assembly', 'iPad manufacturing', 'Server rack assembly', 'Connector insertion R&D'],
    companies: ['Foxconn', 'Pegatron', 'Wistron', 'Luxshare'],
    futureImpact: 'Soft robotics and advanced tactile sensing may push automation past the 80% threshold within five years.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_RecursiveBotRenderer: React.FC<ELON_RecursiveBotRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state — Robot Factory Simulator
  const [automationLevel, setAutomationLevel] = useState(30);
  const [annualVolume, setAnnualVolume] = useState(100);

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

  // Calculate cost per unit using Wright's law: C(n) = C(1) * n^(log2(learningRate))
  const calculateUnitCost = (volume: number, automation: number) => {
    const baseCost = 150000; // $150K base cost at unit 1
    const learningRate = 0.85; // 85% learning curve
    const exponent = Math.log2(learningRate);
    const volumeCost = baseCost * Math.pow(Math.max(1, volume), exponent);
    // Higher automation reduces labor cost but adds fixed overhead amortized over volume
    const automationFixedCost = (automation / 100) * 50000000; // $50M at 100% automation
    const automationPerUnit = automationFixedCost / Math.max(1, volume);
    const laborSavings = (automation / 100) * 0.4 * volumeCost; // 40% of cost is labor
    return Math.max(5000, volumeCost - laborSavings + automationPerUnit);
  };

  // Calculate throughput (units per day)
  const calculateThroughput = (volume: number, automation: number) => {
    const baseRate = volume / 365;
    const automationBoost = 1 + (automation / 100) * 1.5;
    return baseRate * automationBoost;
  };

  // Calculate break-even volume for automation investment
  const calculateBreakEven = (automation: number) => {
    const fixedCost = (automation / 100) * 50000000;
    const savingsPerUnit = (automation / 100) * 0.4 * 80000; // savings vs manual
    return savingsPerUnit > 0 ? Math.ceil(fixedCost / savingsPerUnit) : Infinity;
  };

  // Setup cost (automation investment)
  const calculateSetupCost = (automation: number) => {
    return (automation / 100) * 50000000;
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
    robot: '#8B5CF6',
    factory: '#3B82F6',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'recursive-bot',
        gameTitle: 'Recursive Bot',
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

  // Derived values
  const unitCost = calculateUnitCost(annualVolume, automationLevel);
  const throughput = calculateThroughput(annualVolume, automationLevel);
  const breakEven = calculateBreakEven(automationLevel);
  const setupCost = calculateSetupCost(automationLevel);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.robot})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.robot})`,
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

  // Assembly Line SVG Visualization
  const AssemblyLineVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 360;
    const autoNorm = (automationLevel - 30) / 65; // 0 to 1
    const stageNames = ['Frame', 'Actuator', 'Wiring', 'Sensor', 'Software', 'QC'];
    const stageTimes = [45, 60, 90, 30, 15, 40]; // minutes
    const bottleneckIdx = stageTimes.indexOf(Math.max(...stageTimes));
    const stageWidth = (width - 80) / 6;
    const recursionDepth = automationLevel > 80 ? 3 : automationLevel > 60 ? 2 : automationLevel > 40 ? 1 : 0;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="robotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="factoryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="conveyorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
          <linearGradient id="costCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="throughputGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="framePartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B7280" />
            <stop offset="100%" stopColor="#9CA3AF" />
          </linearGradient>
          <linearGradient id="sensorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="wiringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="armGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="stageGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="conveyorShadow" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          <filter id="counterGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="spotlightGrad" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="rgba(249,115,22,0.15)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </radialGradient>
          <clipPath id="conveyorClip">
            <rect x="30" y="110" width={width - 60} height="30" rx="4" />
          </clipPath>
        </defs>

        {/* Background spotlight effect */}
        <rect x="0" y="0" width={width} height={height} fill="url(#spotlightGrad)" opacity="0.5" />

        {/* Grid lines */}
        <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="140" x2={width - 30} y2="140" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="230" x2={width - 30} y2="230" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="330" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={22} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Robot Assembly Line — {automationLevel}% Automation
        </text>

        {/* Automation level indicator on conveyor */}
        <circle
          cx={30 + ((automationLevel - 30) / 65) * (width - 60)}
          cy={130}
          r="8"
          fill={colors.accent}
          stroke="white"
          strokeWidth="2"
          filter="url(#robotGlow)"
        />

        {/* Conveyor belt */}
        <rect x={30} y={120} width={width - 60} height={20} rx="4" fill="url(#conveyorGrad)" filter="url(#conveyorShadow)" />
        {/* Conveyor belt segments */}
        {Array.from({ length: Math.floor((width - 60) / 15) }).map((_, i) => (
          <rect key={`belt-${i}`} x={30 + i * 15} y={125} width="2" height={10} fill="rgba(255,255,255,0.1)" rx="1" />
        ))}

        {/* Assembly stages */}
        {stageNames.map((name, idx) => {
          const sx = 40 + idx * stageWidth;
          const isBottleneck = idx === bottleneckIdx;
          const stageAuto = Math.min(100, automationLevel + (idx === 4 ? 20 : 0) - (idx === 2 ? 15 : 0));
          const stageColor = stageAuto > 70 ? '#10B981' : stageAuto > 50 ? '#F59E0B' : '#EF4444';

          return (
            <g key={name}>
              {/* Stage platform */}
              <rect
                x={sx}
                y={85}
                width={stageWidth - 8}
                height={32}
                rx="4"
                fill={isBottleneck ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.1)'}
                stroke={isBottleneck ? colors.error : 'rgba(59,130,246,0.3)'}
                strokeWidth="1"
                filter={isBottleneck ? 'url(#stageGlow)' : undefined}
              />

              {/* Robot arm (if automated) */}
              {stageAuto > 40 && (
                <g filter="url(#armGlow)">
                  {/* Arm base */}
                  <rect x={sx + stageWidth / 2 - 6} y={55} width="4" height="30" rx="2" fill="url(#armGrad)" />
                  {/* Arm joint */}
                  <circle cx={sx + stageWidth / 2 - 4} cy={58} r="5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
                  {/* Arm extension */}
                  <rect
                    x={sx + stageWidth / 2 - 4}
                    y={52}
                    width={stageWidth / 3}
                    height="3"
                    rx="1.5"
                    fill="url(#armGrad)"
                    transform={`rotate(${-15 + autoNorm * 10}, ${sx + stageWidth / 2 - 4}, ${53})`}
                  />
                  {/* Gripper */}
                  <circle
                    cx={sx + stageWidth / 2 + stageWidth / 4}
                    cy={50}
                    r="3"
                    fill="#FBBF24"
                    stroke="#F59E0B"
                    strokeWidth="1"
                  />
                </g>
              )}

              {/* Human worker icon (if not fully automated) */}
              {stageAuto <= 40 && (
                <g>
                  <circle cx={sx + stageWidth / 2 - 4} cy={60} r="5" fill="#94a3b8" />
                  <rect x={sx + stageWidth / 2 - 7} y={66} width="6" height="12" rx="2" fill="#94a3b8" />
                </g>
              )}

              {/* Stage label */}
              <text x={sx + (stageWidth - 8) / 2} y={103} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
                {name}
              </text>

              {/* Cycle time */}
              <text x={sx + (stageWidth - 8) / 2} y={156} fill={isBottleneck ? colors.error : colors.textMuted} fontSize="11" textAnchor="middle">
                {stageTimes[idx]}min
              </text>

              {/* Automation indicator bar */}
              <rect x={sx + 2} y={162} width={stageWidth - 12} height="4" rx="2" fill={colors.border} />
              <rect x={sx + 2} y={162} width={(stageWidth - 12) * (stageAuto / 100)} height="4" rx="2" fill={stageColor} />
            </g>
          );
        })}

        {/* Product being assembled - simplified robot icon */}
        <g transform={`translate(${width / 2 - 15}, 38)`}>
          {/* Robot head */}
          <rect x="4" y="0" width="12" height="10" rx="3" fill="url(#robotGrad)" filter="url(#robotGlow)" />
          {/* Eyes */}
          <circle cx="8" cy="5" r="1.5" fill="#FBBF24" />
          <circle cx="12" cy="5" r="1.5" fill="#FBBF24" />
          {/* Body outline */}
          <rect x="2" y="12" width="16" height="14" rx="2" fill="url(#factoryGrad)" opacity="0.6" />
        </g>

        {/* Recursion depth counter */}
        <g>
          <rect x={width - 120} y={28} width="90" height="22" rx="8" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)" strokeWidth="1" filter="url(#counterGlow)" />
          <text x={width - 75} y={44} fill={colors.robot} fontSize="11" fontWeight="700" textAnchor="middle">
            Depth {recursionDepth}
          </text>
        </g>

        {/* Cost curve (Wright's law) */}
        <g>
          <text x={width / 2} y={185} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="500">
            C(n) = C(1) × n^(log₂(r))  — Wright&#39;s Law
          </text>
          {/* Cost curve path */}
          {(() => {
            const cx1 = 40, cx2 = width - 40;
            const cy1 = 290, cy2 = 175;
            const fixedMax = 200000;
            const fixedMin = 5000;
            const fixedRange = fixedMax - fixedMin;
            const points = [];
            for (let i = 0; i <= 10; i++) {
              const t = i / 10;
              const vol = Math.pow(10, 2 + t * 3);
              const cost = calculateUnitCost(vol, automationLevel);
              const x = cx1 + t * (cx2 - cx1);
              const norm = Math.max(0, Math.min(1, (cost - fixedMin) / fixedRange));
              const y = cy2 + norm * (cy1 - cy2);
              points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${Math.max(cy2, Math.min(cy1, y)).toFixed(1)}`);
            }
            const t = (Math.log10(Math.max(100, annualVolume)) - 2) / 3;
            const px = cx1 + Math.min(1, Math.max(0, t)) * (cx2 - cx1);
            const pnorm = Math.max(0, Math.min(1, (unitCost - fixedMin) / fixedRange));
            const py = cy2 + pnorm * (cy1 - cy2);
            return (
              <>
                <path
                  d={points.join(' ')}
                  stroke="url(#costCurveGrad)"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle
                  cx={px}
                  cy={Math.max(cy2, Math.min(cy1, py))}
                  r="7"
                  fill={colors.accent}
                  stroke="white"
                  strokeWidth="2"
                  filter="url(#robotGlow)"
                />
              </>
            );
          })()}
          {/* Axis labels */}
          <text x={40} y={305} fill={colors.textSecondary} fontSize="11" textAnchor="start">100/yr</text>
          <text x={width - 40} y={305} fill={colors.textSecondary} fontSize="11" textAnchor="end">100K/yr</text>
        </g>

        {/* Unit cost display */}
        <rect x={width / 2 - 80} y={312} width="160" height="20" rx="4" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" />
        <text x={width / 2} y={326} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Cost: ${unitCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} / unit
        </text>

        {/* Legend */}
        <g>
          <circle cx={40} cy={height - 12} r="4" fill="url(#armGrad)" />
          <text x={50} y={height - 8} fill={colors.textSecondary} fontSize="11">Robot Arm</text>
          <circle cx={120} cy={height - 12} r="4" fill="#CBD5E1" />
          <text x={130} y={height - 8} fill={colors.textSecondary} fontSize="11">Human</text>
          <rect x={190} y={height - 16} width="12" height="8" rx="2" fill="url(#costCurveGrad)" />
          <text x={207} y={height - 8} fill={colors.textSecondary} fontSize="11">Cost Curve</text>
          <circle cx={290} cy={height - 12} r="4" fill={colors.accent} />
          <text x={300} y={height - 8} fill={colors.textSecondary} fontSize="11">Current</text>
        </g>
      </svg>
    );
  };

  // Twist Visualization — Volume Impact SVG
  const VolumeImpactVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const volumes = [100, 500, 1000, 5000, 10000, 50000, 100000];
    const barWidth = (width - 100) / volumes.length;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="volLowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="volMidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="volHighGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="barHighlight" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="breakEvenLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="50" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="50" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="50" y1="190" x2={width - 30} y2="190" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Volume vs. Cost per Unit — Automation at {automationLevel}%
        </text>

        {/* Bars for each volume */}
        {volumes.map((vol, idx) => {
          const cost = calculateUnitCost(vol, automationLevel);
          const maxCost = 150000;
          const barH = Math.max(5, (cost / maxCost) * 200);
          const bx = 55 + idx * barWidth;
          const by = 255 - barH;
          const isActive = Math.abs(vol - annualVolume) < vol * 0.3;
          const gradId = cost > 80000 ? 'url(#volLowGrad)' : cost > 30000 ? 'url(#volMidGrad)' : 'url(#volHighGrad)';

          return (
            <g key={vol}>
              <rect
                x={bx + 4}
                y={by}
                width={barWidth - 10}
                height={barH}
                rx="3"
                fill={gradId}
                filter={isActive ? 'url(#barHighlight)' : undefined}
                opacity={isActive ? 1 : 0.7}
              />
              {/* Cost label */}
              <text x={bx + barWidth / 2 - 1} y={by - 5} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
                ${(cost / 1000).toFixed(0)}K
              </text>
              {/* Volume label */}
              <text x={bx + barWidth / 2 - 1} y={270} fill={colors.textMuted} fontSize="7" textAnchor="middle">
                {vol >= 1000 ? `${vol / 1000}K` : vol}
              </text>
            </g>
          );
        })}

        {/* Break-even line */}
        {breakEven < 100000 && (() => {
          const t = (Math.log10(breakEven) - 2) / 3;
          const lineX = 55 + t * (width - 100);
          return (
            <g>
              <line x1={lineX} y1={40} x2={lineX} y2={260} stroke="url(#breakEvenLine)" strokeWidth="2" strokeDasharray="6,3" />
              <text x={lineX} y={290} fill={colors.robot} fontSize="11" fontWeight="600" textAnchor="middle">
                Break-even: {breakEven.toLocaleString()}
              </text>
            </g>
          );
        })()}

        {/* Axis labels */}
        <text x={width / 2} y={height - 8} fill={colors.textMuted} fontSize="11" textAnchor="middle" fontWeight="400">
          Annual Production Volume
        </text>
        <text x={20} y={150} fill={colors.textMuted} fontSize="11" fontWeight="400" textAnchor="middle" transform={`rotate(-90, 20, 150)`}>
          Cost/Unit
        </text>

        {/* Legend */}
        <g>
          <rect x={40} y={height - 28} width="10" height="10" rx="2" fill="url(#volLowGrad)" />
          <text x={55} y={height - 19} fill={colors.textMuted} fontSize="11">High cost</text>
          <rect x={130} y={height - 28} width="10" height="10" rx="2" fill="url(#volMidGrad)" />
          <text x={145} y={height - 19} fill={colors.textMuted} fontSize="11">Mid cost</text>
          <rect x={210} y={height - 28} width="10" height="10" rx="2" fill="url(#volHighGrad)" />
          <text x={225} y={height - 19} fill={colors.textMuted} fontSize="11">Low cost</text>
          <line x1={300} y1={height - 22} x2={330} y2={height - 22} stroke={colors.robot} strokeWidth="2" strokeDasharray="4,2" />
          <text x={335} y={height - 19} fill={colors.textMuted} fontSize="11">Break-even</text>
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
            🤖🏭
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Recursive Bot
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;What happens when <span style={{ color: colors.robot }}>robots build robots</span>? Let&apos;s explore the ultimate manufacturing recursion — where each generation of automation makes the next one cheaper and faster.&quot;
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
              &quot;The factory is the product. When robots build the robots that build the robots, you get exponential manufacturing capability. That is the real revolution.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Elon Musk, on Tesla Optimus production vision
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>What You Will Explore</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Wright\'s law: how production volume drives cost down',
                'The automation investment trade-off',
                'Assembly line bottlenecks and throughput',
                'When robots-building-robots becomes viable',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.accent }}>→</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
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
      { id: 'a', text: '$250,000 — similar to current industrial robots' },
      { id: 'b', text: '$100,000 — like a luxury car' },
      { id: 'c', text: 'Less than $20,000 — cheaper than most cars' },
      { id: 'd', text: '$1 million — these are highly complex machines' },
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
              What is the target cost for Tesla&apos;s Optimus humanoid robot at scale production?
            </h2>

            {/* Static SVG showing robot cost concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictRobotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                  <linearGradient id="predictCostGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Optimus Robot: Target Cost at Scale?</text>
                {/* Robot silhouette */}
                <rect x="165" y="45" width="70" height="20" rx="6" fill="url(#predictRobotGrad)" />
                <rect x="155" y="70" width="90" height="50" rx="4" fill="url(#predictRobotGrad)" opacity="0.7" />
                <rect x="160" y="125" width="15" height="40" rx="3" fill="url(#predictRobotGrad)" opacity="0.5" />
                <rect x="225" y="125" width="15" height="40" rx="3" fill="url(#predictRobotGrad)" opacity="0.5" />
                {/* Eyes */}
                <circle cx="185" cy="55" r="4" fill="#FBBF24" />
                <circle cx="215" cy="55" r="4" fill="#FBBF24" />
                {/* Cost arrow */}
                <line x1="80" y1="180" x2="320" y2="180" stroke="url(#predictCostGrad)" strokeWidth="3" markerEnd="url(#arrowhead)" />
                <text x="80" y="195" fill="#EF4444" fontSize="11">$$$</text>
                <text x="300" y="195" fill="#10B981" fontSize="11">$</text>
                <text x="200" y="195" fill={colors.textMuted} fontSize="11" textAnchor="middle">??? target price</text>
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

  // PLAY PHASE — Robot Factory Simulator
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
              Robot Factory Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Manufacturing recursion — robots building robots — is the key to making humanoid robots affordable. Wright&apos;s law shows that each doubling of cumulative production cuts costs by 15-20%. The question is: at what volume does heavy automation pay off?
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
                <strong style={{ color: colors.textPrimary }}>Wright&apos;s Law:</strong> C(n) = C(1) × n^(log₂(r)), where r is the learning rate. For every cumulative doubling of units produced, cost per unit falls by a constant percentage (typically 15-20%).
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Automation Level</strong> refers to the percentage of assembly tasks performed by robots rather than humans, from 30% (mostly manual) to 95% (robots build robots).
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.robot }}>Recursion Depth</strong> describes how many levels of robots-building-robots exist — depth 0 means humans build robots, depth 3 means robots build the robots that build the robots.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Try adjusting the automation slider and observe how robot arms replace human workers on the assembly line. Notice how when you increase the automation level, the cost curve shifts downward at high volumes. When you increase annual volume, Wright&apos;s law leads to lower per-unit costs because each doubling of production yields a 15% cost reduction.
            </p>

            {/* Main visualization - side by side on desktop */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <AssemblyLineVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Automation Level slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Automation Rate</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {automationLevel}% {automationLevel > 80 ? '(Robots Build Robots)' : automationLevel > 50 ? '(Hybrid)' : '(Human Assembly)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="95"
                      value={automationLevel}
                      onChange={(e) => setAutomationLevel(parseInt(e.target.value))}
                      onInput={(e) => setAutomationLevel(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Automation Level"
                      style={sliderStyle(colors.accent, automationLevel, 30, 95)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>30% Human</span>
                      <span style={{ ...typo.small, color: colors.success }}>95% Recursive</span>
                    </div>
                  </div>

                  {/* Annual Volume slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Annual Production Volume</span>
                      <span style={{ ...typo.small, color: colors.factory, fontWeight: 600 }}>
                        {annualVolume.toLocaleString()} units/year
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="100000"
                      step="100"
                      value={annualVolume}
                      onChange={(e) => setAnnualVolume(parseInt(e.target.value))}
                      onInput={(e) => setAnnualVolume(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Annual Volume"
                      style={sliderStyle(colors.factory, annualVolume, 100, 100000)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>100/yr</span>
                      <span style={{ ...typo.small, color: colors.success }}>100K/yr</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>${unitCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Cost / Unit</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>${(setupCost / 1000000).toFixed(1)}M</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Setup Cost</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: unitCost < 20000 ? colors.success : colors.warning }}>
                        {breakEven > 999999 ? '∞' : breakEven.toLocaleString()}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Break-even Vol</div>
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
              The Economics of Recursive Manufacturing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Tesla\'s target for Optimus is indeed less than $20,000 at scale — and as you saw in the simulator, Wright\'s law makes this achievable at high volumes.'
                : 'As you observed in the simulator, the target cost for Tesla\'s Optimus at scale is less than $20,000. Wright\'s law and automation investment make this achievable — but only at very high production volumes.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Wright&apos;s Law: C(n) = C(1) × n^(log₂(learning_rate))</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is because cost follows a <span style={{ color: colors.accent }}>power law</span> — each doubling of cumulative production reduces cost by a fixed percentage. For an <span style={{ color: colors.success }}>85% learning curve</span>, costs drop 15% per doubling. After 10 doublings (1,000× volume), costs reach <span style={{ color: colors.robot }}>~20% of the original</span>.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  At 100K units: $150K × (100,000)^(log₂(0.85)) ≈ <strong>&lt;$20,000</strong>
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
                Why Automation Investment Has a Threshold
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Heavy automation requires massive upfront capital ($10M-$50M+). This only pays off when amortized across enough units. At 100 robots/year, a $20M automation investment adds $200K per unit. At 100,000 robots/year, the same investment adds only $200 per unit. Volume is the key that unlocks recursive manufacturing.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                The Assembly Line Bottleneck
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Frame', time: '45 min', auto: 'High' },
                  { name: 'Actuator', time: '60 min', auto: 'Medium' },
                  { name: 'Wiring', time: '90 min', auto: 'Low' },
                  { name: 'Sensor', time: '30 min', auto: 'High' },
                  { name: 'Software', time: '15 min', auto: 'Full' },
                  { name: 'QC', time: '40 min', auto: 'High' },
                ].map(stage => (
                  <div key={stage.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{stage.name}</div>
                    <div style={{ ...typo.h3, color: stage.name === 'Wiring' ? colors.error : colors.accent }}>{stage.time}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stage.auto} automate</div>
                  </div>
                ))}
              </div>
              <p style={{ ...typo.small, color: colors.error, marginTop: '12px', textAlign: 'center' }}>
                Wiring at 90 min is the bottleneck — the entire line can only produce 1 robot every 90 minutes regardless of other stages.
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
      { id: 'a', text: 'Linear cost reduction — each additional unit saves the same amount' },
      { id: 'b', text: 'Enables high-automation investments that were not viable at low volume' },
      { id: 'c', text: 'No change in approach — the same methods work at any scale' },
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
                New Variable: Volume Changes Everything
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Going from 100 to 100,000 units per year — what fundamentally changes about the manufacturing approach?
            </h2>

            {/* Static SVG showing volume scaling concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="lowVolGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <linearGradient id="highVolGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                {/* Low volume */}
                <rect x="30" y="30" width="150" height="35" rx="6" fill="url(#lowVolGrad)" opacity="0.7" />
                <text x="105" y="52" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">100 units/yr</text>
                <text x="105" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="11">Human assembly, off-the-shelf parts</text>
                {/* Arrow */}
                <text x="200" y="55" textAnchor="middle" fill={colors.accent} fontSize="20" fontWeight="700">→</text>
                {/* High volume */}
                <rect x="220" y="30" width="150" height="35" rx="6" fill="url(#highVolGrad)" opacity="0.7" />
                <text x="295" y="52" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">100,000 units/yr</text>
                <text x="295" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="11">??? What changes?</text>
                <text x="200" y="120" textAnchor="middle" fill={colors.warning} fontSize="11" fontWeight="600">1000× volume increase</text>
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
                See the Volume Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE — Volume Impact Explorer
  if (phase === 'twist_play') {
    const costAt100 = calculateUnitCost(100, automationLevel);
    const costAt100K = calculateUnitCost(100000, automationLevel);
    const costReduction = ((costAt100 - costAt100K) / costAt100 * 100);
    const setupPerUnitAt100 = setupCost / 100;
    const setupPerUnitAt100K = setupCost / 100000;

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
              Volume Impact Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              See how going from 100 to 100,000 units/year transforms which automation investments become viable
            </p>

            {/* Twist visualization - side by side on desktop */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <VolumeImpactVisualization />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you are seeing:</strong> This bar chart shows how the cost per robot unit drops dramatically as annual production volume increases, following Wright's law. Higher volumes spread fixed automation costs across more units.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase the automation level slider, the break-even volume shifts and per-unit costs change at each volume tier, revealing when heavy automation investment becomes worthwhile.</p>
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Automation level slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Automation Level</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{automationLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="95"
                      value={automationLevel}
                      onChange={(e) => setAutomationLevel(parseInt(e.target.value))}
                      onInput={(e) => setAutomationLevel(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Automation level"
                      style={sliderStyle(colors.accent, automationLevel, 30, 95)}
                    />
                  </div>

                  {/* Comparison grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ background: `${colors.error}11`, borderRadius: '12px', padding: '12px', textAlign: 'center', border: `1px solid ${colors.error}33` }}>
                      <div style={{ ...typo.small, color: colors.error, marginBottom: '4px', fontWeight: 600 }}>At 100 units/yr</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>${costAt100.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/unit</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Setup adds ${setupPerUnitAt100.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/unit</div>
                    </div>
                    <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '12px', textAlign: 'center', border: `1px solid ${colors.success}33` }}>
                      <div style={{ ...typo.small, color: colors.success, marginBottom: '4px', fontWeight: 600 }}>At 100,000 units/yr</div>
                      <div style={{ ...typo.h3, color: colors.textPrimary }}>${costAt100K.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/unit</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Setup adds ${setupPerUnitAt100K.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/unit</div>
                    </div>
                  </div>

                  {/* Cost reduction highlight */}
                  <div style={{
                    background: costReduction > 70 ? `${colors.success}22` : `${colors.warning}22`,
                    border: `1px solid ${costReduction > 70 ? colors.success : colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      Cost reduction from volume scaling:
                    </p>
                    <div style={{
                      ...typo.h2,
                      color: costReduction > 70 ? colors.success : colors.warning
                    }}>
                      {costReduction.toFixed(0)}% cheaper
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      {annualVolume >= breakEven
                        ? 'Automation investment has paid off at this volume!'
                        : `Need ${breakEven.toLocaleString()} units to break even on automation.`}
                    </p>
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
              Understand the Twist
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
              Volume Unlocks the Recursion
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Volume Threshold</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>Break-even = FixedCost / (ManualCost - AutomatedCost)</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  At 100 units/year, a $20M automation line adds $200,000 per robot — making it absurd. At 100,000 units/year, the same line adds only $200 per robot — making it essential. <strong>Volume does not just reduce cost linearly; it enables entirely different manufacturing strategies.</strong>
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Recursion Cascade</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When volume justifies automation, you can invest in robots that build robot parts. Those robots produce components cheaper, enabling more robots, driving volume higher. This is the recursive loop: <strong>volume → automation → cheaper robots → more volume → deeper automation</strong>. Each cycle makes the next one more viable.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The transition from 100 to 100,000 units is not a smooth scale-up — it is a phase transition. Different automation investments become viable at different thresholds, fundamentally changing the manufacturing approach. This is why Tesla builds Gigafactories, not bigger workshops.
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
        conceptName="E L O N_ Recursive Bot"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Manufacturing Connection:</p>
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
                      // Auto-advance to next uncompleted app, or to test if all done
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
                {passed ? 'You understand recursive manufacturing, Wright\'s law, and automation economics!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Recursive Manufacturing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of Wright&apos;s law, automation ROI, production bottlenecks, and recursive manufacturing to real-world scenarios. Consider the economics of scale, the break-even thresholds for automation investment, and the unique challenges of humanoid robot assembly.
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
            Recursive Manufacturing Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why robots building robots is the key to making humanoid robots as affordable as cars — and why volume is the unlock.
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
                'Wright\'s law: cost drops ~15% per production doubling',
                'Break-even analysis for automation investment',
                'Bottleneck stations limit assembly line throughput',
                'Volume enables recursive manufacturing strategies',
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

export default ELON_RecursiveBotRenderer;
