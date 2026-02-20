'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON GAME #11: UPTIME ARCHITECT - Complete 10-Phase Game
// Reliability engineering — designing for "five nines" (99.999%) uptime through
// redundancy, failover, and maintenance windows
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

interface ELON_UptimeArchitectRendererProps {
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
    scenario: "A cloud provider advertises 99.99% uptime for their compute service. A customer runs a critical payment processing system on a single instance in one availability zone.",
    question: "What is the maximum expected downtime per year at 99.99% availability?",
    options: [
      { id: 'a', label: "52.6 minutes per year — about 4.4 minutes per month", correct: true },
      { id: 'b', label: "5.26 minutes per year — less than one minute per month" },
      { id: 'c', label: "8.76 hours per year — about 43 minutes per month" },
      { id: 'd', label: "3.65 days per year — about 7 hours per month" }
    ],
    explanation: "99.99% uptime means 0.01% downtime. 0.0001 x 525,600 minutes/year = 52.56 minutes of allowed downtime per year. This is sometimes called 'four nines' availability."
  },
  {
    scenario: "An engineer designs a system with two identical servers in parallel. Each server has an individual reliability of 99% (failure rate of 1%).",
    question: "What is the combined availability of the parallel system?",
    options: [
      { id: 'a', label: "99.99% — parallel redundancy multiplies the nines", correct: true },
      { id: 'b', label: "99% — same as a single server" },
      { id: 'c', label: "98% — adding components reduces reliability" },
      { id: 'd', label: "100% — two servers can never both fail" }
    ],
    explanation: "For parallel components: A_system = 1 - (1 - A_1)(1 - A_2) = 1 - (0.01)(0.01) = 1 - 0.0001 = 99.99%. Each added parallel path multiplies the reliability by reducing the probability of simultaneous failure."
  },
  {
    scenario: "A microservices architecture has Service A (99.9%), a load balancer (99.99%), and Service B (99.9%) all connected in series — every component must work for the system to function.",
    question: "What is the overall system availability?",
    options: [
      { id: 'a', label: "99.80% — series components multiply their availabilities together", correct: true },
      { id: 'b', label: "99.9% — it equals the weakest component" },
      { id: 'c', label: "99.99% — the load balancer improves overall reliability" },
      { id: 'd', label: "99.93% — you average the three availabilities" }
    ],
    explanation: "Series reliability: A_total = A_1 x A_2 x A_3 = 0.999 x 0.9999 x 0.999 = 0.9980. A chain is only as strong as its weakest link — and in series, every component's failure probability compounds."
  },
  {
    scenario: "A data center operator calculates that their server has an MTBF (Mean Time Between Failures) of 2,000 hours and an MTTR (Mean Time To Repair) of 4 hours.",
    question: "What is the steady-state availability of this server?",
    options: [
      { id: 'a', label: "99.8% — calculated as MTBF / (MTBF + MTTR)", correct: true },
      { id: 'b', label: "99.998% — calculated as 1 - (MTTR / MTBF)" },
      { id: 'c', label: "50% — the server is equally likely to be up or down" },
      { id: 'd', label: "Cannot be determined from MTBF and MTTR alone" }
    ],
    explanation: "Availability = MTBF / (MTBF + MTTR) = 2000 / (2000 + 4) = 2000/2004 = 0.998 or 99.8%. This shows that reducing repair time (MTTR) is as important as increasing reliability (MTBF) for improving uptime."
  },
  {
    scenario: "A financial trading platform uses three identical servers with a majority voting system — the system works as long as at least 2 of 3 servers agree on the output.",
    question: "Why is this 2-of-3 voting architecture used instead of simple duplication?",
    options: [
      { id: 'a', label: "It detects and masks single faults — the majority overrules a faulty component without any downtime", correct: true },
      { id: 'b', label: "It is cheaper than running two servers" },
      { id: 'c', label: "It triples the processing speed" },
      { id: 'd', label: "It eliminates all possible failures" }
    ],
    explanation: "Triple Modular Redundancy (TMR) with voting allows the system to identify which component has failed (the one that disagrees) and continue operating using the majority output. Simple duplication cannot determine which copy is correct when they disagree."
  },
  {
    scenario: "During the AWS us-east-1 outage in December 2021, a network configuration change caused internal services to lose connectivity. The cascading failure lasted approximately 7 hours.",
    question: "What reliability concept does this outage best illustrate?",
    options: [
      { id: 'a', label: "Common-mode failure — a single root cause defeated multiple layers of redundancy simultaneously", correct: true },
      { id: 'b', label: "Random hardware failure — components wore out independently" },
      { id: 'c', label: "Planned maintenance gone wrong" },
      { id: 'd', label: "Insufficient server capacity for peak demand" }
    ],
    explanation: "Common-mode failure (CMF) occurs when a single cause defeats multiple redundant systems. The network configuration change affected all redundant paths because they shared the same control plane — redundancy only helps against independent failures."
  },
  {
    scenario: "A hospital designs its power system with two independent utility feeds, a diesel generator, and a UPS battery system. Each backup activates if the previous level fails.",
    question: "What Uptime Institute tier does this design approach?",
    options: [
      { id: 'a', label: "Tier IV — fault tolerant with 2N redundancy and concurrent maintainability", correct: true },
      { id: 'b', label: "Tier I — basic infrastructure with no redundancy" },
      { id: 'c', label: "Tier II — redundant capacity components only" },
      { id: 'd', label: "Tier III — concurrently maintainable but not fault tolerant" }
    ],
    explanation: "Tier IV requires 2N redundancy (fully duplicated infrastructure) where any single failure or maintenance action cannot cause downtime. Multiple independent utility feeds plus generator plus UPS provides this level of fault tolerance."
  },
  {
    scenario: "Tesla's Autopilot system uses dual redundant computers (main and backup) and dual power supplies, but relies on a single set of cameras for perception.",
    question: "How does the single camera set affect overall system reliability?",
    options: [
      { id: 'a', label: "It creates a series element — camera failure defeats all compute redundancy, limiting overall reliability", correct: true },
      { id: 'b', label: "It has no effect because cameras are extremely reliable" },
      { id: 'c', label: "The dual computers compensate for camera limitations" },
      { id: 'd', label: "Software redundancy eliminates hardware single points of failure" }
    ],
    explanation: "In a reliability block diagram, the cameras are a series element — the system cannot function without them regardless of compute redundancy. A_system = A_cameras x A_compute. The single camera set becomes the reliability bottleneck."
  },
  {
    scenario: "SpaceX Falcon 9 uses triple-redundant flight computers with a voting system. Each computer runs independently-developed software on the same sensor inputs.",
    question: "Why does SpaceX use independently-developed software on each computer?",
    options: [
      { id: 'a', label: "To protect against common-mode software bugs — a bug in one version is unlikely to exist in the others", correct: true },
      { id: 'b', label: "To increase processing speed through parallel computation" },
      { id: 'c', label: "Because each computer uses a different processor architecture" },
      { id: 'd', label: "To reduce development costs through independent teams" }
    ],
    explanation: "Design diversity (N-version programming) protects against common-mode software failures. If all three computers ran identical software, a single bug could crash all three simultaneously, defeating the purpose of triple redundancy."
  },
  {
    scenario: "A site reliability engineer must design a system for 99.999% uptime (five nines). The system uses components that each have 99.9% individual availability.",
    question: "What is the minimum number of parallel redundant components needed to achieve five nines?",
    options: [
      { id: 'a', label: "Two parallel components — giving 1 - (0.001)^2 = 99.9999% which exceeds five nines", correct: true },
      { id: 'b', label: "Five components — one for each nine" },
      { id: 'c', label: "Ten components — to ensure sufficient margin" },
      { id: 'd', label: "It is impossible to achieve five nines with 99.9% components" }
    ],
    explanation: "Two 99.9% components in parallel yield: 1 - (1-0.999)^2 = 1 - (0.001)^2 = 1 - 0.000001 = 99.9999% (six nines). This exceeds the five nines target. However, this assumes truly independent failures — common-mode failures can reduce the effective redundancy."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u2601\uFE0F',
    title: 'AWS us-east-1 Outage 2021',
    short: 'When cascading failure brought down the internet backbone',
    tagline: 'Seven hours that shook cloud computing',
    description: 'On December 7, 2021, a network configuration change in AWS us-east-1 triggered a cascading failure that lasted approximately 7 hours. The change caused internal network congestion that overwhelmed the monitoring and control plane services. Disney+, Netflix, Slack, Venmo, and thousands of other services went down. The internal tools AWS engineers needed to diagnose and fix the problem were themselves hosted on the failing infrastructure.',
    connection: 'This outage demonstrates common-mode failure — the network control plane was a series element shared by all redundant components. When it failed, no amount of server redundancy could compensate. It also shows the danger of depending on the system you are trying to repair (circular dependency).',
    howItWorks: 'AWS implemented automated network configuration safeguards, improved blast radius containment through cell-based architecture, and ensured recovery tools operate independently of the production control plane.',
    stats: [
      { value: '7 hrs', label: 'Outage Duration', icon: '\u23F1' },
      { value: '1000s', label: 'Services Affected', icon: '\u{1F4C9}' },
      { value: '$66M+', label: 'Estimated Revenue Loss', icon: '\u{1F4B0}' }
    ],
    examples: ['Cascading network failure', 'Control plane dependency', 'Blast radius containment', 'Cell-based architecture'],
    companies: ['Amazon Web Services', 'Disney+', 'Netflix', 'Slack'],
    futureImpact: 'AWS and other cloud providers are moving toward cell-based architectures that contain failures to small blast radii, preventing regional cascading events.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F3E2}',
    title: 'Uptime Institute Tier IV',
    short: 'The gold standard for data center reliability — 99.995% uptime',
    tagline: 'Concurrent maintainability meets fault tolerance',
    description: 'The Uptime Institute Tier IV certification represents the highest level of data center reliability: 99.995% uptime with no single point of failure. Tier IV requires 2N redundancy for all infrastructure systems — meaning every power path, cooling system, and network connection is fully duplicated. Any component can be taken offline for maintenance without affecting operations, and the system survives any single fault without human intervention.',
    connection: 'Tier IV embodies the parallel redundancy principle — by duplicating every infrastructure path (2N), the probability of both paths failing simultaneously becomes vanishingly small. The requirement for concurrent maintainability ensures that planned maintenance does not reduce redundancy below N.',
    howItWorks: 'Tier IV data centers use dual independent utility feeds, multiple diesel generators with automatic transfer switches, redundant UPS systems, dual cooling loops, and completely separate distribution paths. Each path can handle the full load independently.',
    stats: [
      { value: '99.995%', label: 'Uptime Guarantee', icon: '\u{1F3AF}' },
      { value: '2N', label: 'Redundancy Level', icon: '\u{1F504}' },
      { value: '26 min', label: 'Max Annual Downtime', icon: '\u23F0' }
    ],
    examples: ['Dual utility power feeds', '2N cooling redundancy', 'Automatic failover systems', 'Concurrent maintainability'],
    companies: ['Equinix', 'Digital Realty', 'CyrusOne', 'Switch'],
    futureImpact: 'Next-generation designs push beyond Tier IV with distributed micro data centers, edge computing, and active-active multi-region architectures that eliminate geographic single points of failure.',
    color: '#10B981'
  },
  {
    icon: '\u{1F697}',
    title: 'Tesla Autopilot Redundancy',
    short: 'Dual compute, dual power — but single camera creates a series bottleneck',
    tagline: 'Where redundancy meets its limits',
    description: 'Tesla Hardware 3+ features dual redundant Full Self-Driving computers: if the primary fails, the backup seamlessly takes over. Power supplies are also dual-redundant. However, the vehicle relies on a single set of eight cameras for perception. While cameras are solid-state and highly reliable, they represent a series element in the reliability block diagram — if cameras are obscured by mud, ice, or glare, no amount of compute redundancy helps.',
    connection: 'Tesla Autopilot perfectly illustrates the series-parallel reliability principle. Dual computers (parallel) dramatically improve compute reliability, but the single camera system (series) becomes the reliability bottleneck. The system availability equals A_cameras multiplied by A_compute_parallel — the weakest series element dominates.',
    howItWorks: 'The dual compute system uses a hot standby architecture where the backup computer processes the same inputs simultaneously. If the primary fails, switchover occurs in milliseconds. Camera redundancy comes from overlapping fields of view (partial redundancy) rather than full duplication.',
    stats: [
      { value: '2x', label: 'Compute Redundancy', icon: '\u{1F4BB}' },
      { value: '8', label: 'Camera Sensors', icon: '\u{1F4F7}' },
      { value: '<10ms', label: 'Failover Time', icon: '\u26A1' }
    ],
    examples: ['Hot standby compute failover', 'Overlapping camera coverage', 'Series reliability bottleneck', 'Environmental vulnerability'],
    companies: ['Tesla', 'NVIDIA', 'Samsung', 'Sony'],
    futureImpact: 'Future autonomous vehicles may add radar and LiDAR as diverse sensor redundancy, eliminating the camera-only series dependency and protecting against environmental common-mode failures like weather.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX Mission-Critical Avionics',
    short: 'Triple-redundant flight computers with majority voting logic',
    tagline: 'When failure is not an option, triple everything',
    description: 'SpaceX Falcon 9 and Dragon spacecraft use triple modular redundancy (TMR) for flight-critical avionics. Three independent flight computers process the same sensor data simultaneously, and a hardware voter selects the majority output. Each computer runs independently-developed software to protect against common-mode software bugs. This design philosophy enabled Dragon to become the first commercial vehicle to carry NASA astronauts to the ISS.',
    connection: 'SpaceX TMR demonstrates the principle that redundancy must protect against both hardware and software common-mode failures. Triple hardware with voting masks single failures, while design diversity (different software implementations) reduces the probability that a bug exists in 2 of 3 systems simultaneously.',
    howItWorks: 'Three flight computers each run independently-developed software processing identical sensor inputs. A hardware voting circuit compares outputs and selects the majority (2-of-3). If one computer fails, it is automatically isolated. The system continues operating on the remaining two with degraded but still functional voting capability.',
    stats: [
      { value: '3x', label: 'Flight Computers', icon: '\u{1F4BB}' },
      { value: '2/3', label: 'Voting Threshold', icon: '\u2705' },
      { value: '100%', label: 'Mission Success Rate', icon: '\u{1F680}' }
    ],
    examples: ['Triple modular redundancy', 'Majority voting logic', 'N-version programming', 'Design diversity'],
    companies: ['SpaceX', 'NASA', 'Boeing', 'Lockheed Martin'],
    futureImpact: 'Starship will push reliability engineering further with rapid reusability requirements, demanding avionics that maintain reliability across hundreds of flights rather than single-use missions.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_UptimeArchitectRenderer: React.FC<ELON_UptimeArchitectRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [redundancyLevel, setRedundancyLevel] = useState(1);
  const [componentReliability, setComponentReliability] = useState(99);
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase - maintenance windows
  const [maintenanceInterval, setMaintenanceInterval] = useState(0);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

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

  // Animation loop for component pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Reliability calculations
  const calculateSeriesReliability = (componentR: number, count: number) => {
    const r = componentR / 100;
    return Math.pow(r, count) * 100;
  };

  const calculateParallelReliability = (componentR: number, count: number) => {
    const failProb = 1 - (componentR / 100);
    return (1 - Math.pow(failProb, count)) * 100;
  };

  const calculateSystemUptime = (componentR: number, redLevel: number, maintHours: number) => {
    const parallelR = calculateParallelReliability(componentR, redLevel);
    const seriesElements = 3;
    const baseR = calculateSeriesReliability(parallelR, seriesElements);
    const maintFraction = maintHours > 0 ? (maintHours / (365 * 24)) * 100 : 0;
    return Math.max(0, baseR - maintFraction);
  };

  const getUptimeClass = (uptime: number): string => {
    if (uptime >= 99.999) return 'Five Nines';
    if (uptime >= 99.99) return 'Four Nines';
    if (uptime >= 99.9) return 'Three Nines';
    if (uptime >= 99) return 'Two Nines';
    return 'Below Two Nines';
  };

  const getDowntimePerYear = (uptime: number): string => {
    const downPct = 100 - uptime;
    const minutesPerYear = 525600;
    const downMinutes = (downPct / 100) * minutesPerYear;
    if (downMinutes < 1) return `${(downMinutes * 60).toFixed(1)}s`;
    if (downMinutes < 60) return `${downMinutes.toFixed(1)}min`;
    if (downMinutes < 1440) return `${(downMinutes / 60).toFixed(1)}hr`;
    return `${(downMinutes / 1440).toFixed(1)}days`;
  };

  const currentUptime = calculateSystemUptime(componentReliability, redundancyLevel, maintenanceActive ? maintenanceInterval : 0);
  const currentClass = getUptimeClass(currentUptime);
  const currentDowntime = getDowntimePerYear(currentUptime);

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
    parallel: '#10B981',
    series: '#EF4444',
    component: '#3B82F6',
    redundant: '#8B5CF6',
    maintenance: '#F59E0B',
    active: '#06B6D4',
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
        gameType: 'uptime-architect',
        gameTitle: 'Uptime Architect',
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

  // Reliability Block Diagram SVG Visualization
  const ReliabilityVisualization = ({ showMaintenance }: { showMaintenance?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 400;
    const centerY = 120;
    const stageWidth = (width - 80) / 3;
    const startX = 40;

    // Determine which components are "failed" based on animation
    const failedComponents: boolean[][] = [];
    for (let s = 0; s < 3; s++) {
      const stageFailures: boolean[] = [];
      for (let r = 0; r < redundancyLevel; r++) {
        const seed = (s * 7 + r * 13 + Math.floor(animFrame / 60)) * 17;
        const failProb = 1 - (componentReliability / 100);
        const pseudoRandom = Math.abs(Math.sin(seed)) ;
        const isFailed = pseudoRandom < failProb * 3;
        stageFailures.push(isFailed);
      }
      failedComponents.push(stageFailures);
    }

    // Check if maintenance is taking a component offline
    const maintenanceStage = showMaintenance && maintenanceActive ? Math.floor(animFrame / 90) % 3 : -1;
    const maintenanceSlot = showMaintenance && maintenanceActive ? 0 : -1;

    // Calculate stage spacing
    const stageGap = 20;
    const componentHeight = 32;
    const componentGap = 8;
    const totalComponentHeight = redundancyLevel * componentHeight + (redundancyLevel - 1) * componentGap;
    const componentStartY = centerY - totalComponentHeight / 2;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id="failedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.error} />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <linearGradient id="redundantGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.redundant} />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <linearGradient id="maintGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.maintenance} />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="uptimeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.error} stopOpacity="0.3" />
            <stop offset="50%" stopColor={colors.warning} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.active} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="failPulse" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Reliability Block Diagram — {redundancyLevel === 1 ? 'N (No Redundancy)' : redundancyLevel === 2 ? 'N+1 Redundancy' : redundancyLevel === 3 ? '2N Redundancy' : '2N+1 Full Redundancy'}
        </text>

        {/* Input node */}
        <circle cx={startX - 10} cy={centerY} r="5" fill={colors.active} />
        <text x={startX - 10} y={centerY + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">IN</text>

        {/* Three stages in series */}
        {[0, 1, 2].map(stage => {
          const stageX = startX + stage * (stageWidth + stageGap);
          const stageLabel = ['Compute', 'Network', 'Storage'][stage];
          const lambda = [0.001, 0.0005, 0.0008][stage];

          return (
            <g key={`stage-${stage}`}>
              {/* Stage label */}
              <text x={stageX + stageWidth / 2} y={componentStartY - 12} fill={colors.textMuted} fontSize="11" fontWeight="600" textAnchor="middle">
                {stageLabel} ({'\u03BB'}={lambda})
              </text>

              {/* Parallel branch lines */}
              <line x1={stageX} y1={centerY} x2={stageX + 8} y2={centerY} stroke={colors.active} strokeWidth="2" opacity="0.5" />
              <line x1={stageX + stageWidth - 8} y1={centerY} x2={stageX + stageWidth} y2={centerY} stroke={colors.active} strokeWidth="2" opacity="0.5" />

              {/* Split and merge lines for parallel paths */}
              {redundancyLevel > 1 && (
                <g>
                  {Array.from({ length: redundancyLevel }).map((_, r) => {
                    const compY = componentStartY + r * (componentHeight + componentGap) + componentHeight / 2;
                    return (
                      <g key={`path-${stage}-${r}`}>
                        <path
                          d={`M ${stageX + 8} ${centerY} L ${stageX + 20} ${compY}`}
                          stroke={colors.active}
                          strokeWidth="1.5"
                          fill="none"
                          opacity="0.4"
                        />
                        <path
                          d={`M ${stageX + stageWidth - 20} ${compY} L ${stageX + stageWidth - 8} ${centerY}`}
                          stroke={colors.active}
                          strokeWidth="1.5"
                          fill="none"
                          opacity="0.4"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Components */}
              {Array.from({ length: redundancyLevel }).map((_, r) => {
                const compY = redundancyLevel === 1
                  ? centerY - componentHeight / 2
                  : componentStartY + r * (componentHeight + componentGap);
                const isFailed = failedComponents[stage]?.[r] || false;
                const isMaint = stage === maintenanceStage && r === maintenanceSlot;
                const compColor = isMaint ? 'url(#maintGrad)' : isFailed ? 'url(#failedGrad)' : r === 0 ? 'url(#activeGrad)' : 'url(#redundantGrad)';
                const pulseOpacity = isFailed ? 0.4 + 0.3 * Math.sin(animFrame * 0.15) : 1;

                return (
                  <g key={`comp-${stage}-${r}`} opacity={pulseOpacity}>
                    <rect
                      x={stageX + 20}
                      y={compY}
                      width={stageWidth - 40}
                      height={componentHeight}
                      rx="6"
                      fill={compColor}
                      stroke={isFailed ? colors.error : isMaint ? colors.maintenance : r === 0 ? colors.success : colors.redundant}
                      strokeWidth={isFailed ? 2 : 1}
                      filter={isFailed ? 'url(#failPulse)' : undefined}
                    />
                    <text
                      x={stageX + stageWidth / 2}
                      y={compY + componentHeight / 2 + 4}
                      fill="white"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {isMaint ? 'MAINT' : isFailed ? 'FAILED' : r === 0 ? `${stageLabel}-P` : `${stageLabel}-${r}`}
                    </text>
                    {/* Small data flow arrow through active components */}
                    {!isFailed && !isMaint && (
                      <circle
                        cx={stageX + 20 + ((animFrame * 2 + stage * 40 + r * 20) % (stageWidth - 40))}
                        cy={compY + componentHeight / 2}
                        r="2"
                        fill="white"
                        opacity="0.6"
                      />
                    )}
                  </g>
                );
              })}

              {/* Inter-stage connection line */}
              {stage < 2 && (
                <line
                  x1={stageX + stageWidth}
                  y1={centerY}
                  x2={stageX + stageWidth + stageGap}
                  y2={centerY}
                  stroke={colors.active}
                  strokeWidth="2"
                  opacity="0.5"
                  strokeDasharray="4,2"
                />
              )}
            </g>
          );
        })}

        {/* Output node */}
        <circle cx={width - startX + 10} cy={centerY} r="5" fill={currentUptime >= 99.9 ? colors.success : colors.error} />
        <text x={width - startX + 10} y={centerY + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">OUT</text>

        {/* Connection from last stage to output */}
        <line
          x1={startX + 2 * (stageWidth + stageGap) + stageWidth}
          y1={centerY}
          x2={width - startX + 2}
          y2={centerY}
          stroke={colors.active}
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Uptime bar chart at bottom */}
        <text x={width / 2} y={220} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
          System Uptime Analysis
        </text>

        {/* Uptime levels reference bars */}
        {[
          { label: '99%', value: 99, y: 240 },
          { label: '99.9%', value: 99.9, y: 260 },
          { label: '99.99%', value: 99.99, y: 280 },
          { label: '99.999%', value: 99.999, y: 300 },
        ].map(level => {
          const barWidth = (level.value / 100) * (width - 120);
          const isAchieved = currentUptime >= level.value;
          return (
            <g key={`level-${level.label}`}>
              <rect
                x={60}
                y={level.y}
                width={barWidth}
                height="14"
                rx="3"
                fill={isAchieved ? colors.success : colors.border}
                opacity={isAchieved ? 0.6 : 0.2}
              />
              <text x={55} y={level.y + 11} fill={colors.textMuted} fontSize="11" textAnchor="end">{level.label}</text>
              <text x={62 + barWidth + 4} y={level.y + 11} fill={isAchieved ? colors.success : colors.textMuted} fontSize="11">
                {isAchieved ? '\u2713' : ''}
              </text>
            </g>
          );
        })}

        {/* Current uptime indicator */}
        {(() => {
          const uptimePct = Math.min(currentUptime, 100);
          const indicatorX = 60 + (uptimePct / 100) * (width - 120);
          return (
            <g>
              <line x1={indicatorX} y1={235} x2={indicatorX} y2={318} stroke={colors.accent} strokeWidth="2" strokeDasharray="3,2" />
              <circle cx={indicatorX} cy={325} r="7" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#softGlow)" />
              <text x={indicatorX} y={340} fill={colors.accent} fontSize="11" fontWeight="700" textAnchor="middle">
                {currentUptime.toFixed(4)}%
              </text>
            </g>
          );
        })()}

        {/* Maintenance window indicator */}
        {showMaintenance && (
          <g>
            <rect x={60} y={355} width={width - 120} height="20" rx="4" fill={maintenanceActive && maintenanceInterval > 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(100, 100, 100, 0.05)"} stroke={maintenanceActive ? colors.maintenance : colors.border} strokeWidth="1" strokeDasharray="4,4" />
            <text x={width / 2} y={369} fill={maintenanceActive ? colors.maintenance : colors.textMuted} fontSize="11" fontWeight="600" textAnchor="middle">
              {maintenanceActive ? `Maintenance: ${maintenanceInterval}hr/year planned downtime` : `Scheduled: ${maintenanceInterval}hr/year (inactive)`}
            </text>
          </g>
        )}

        {/* Legend */}
        <g>
          <rect x={60} y={height - 25} width="10" height="10" rx="2" fill={colors.success} />
          <text x={74} y={height - 16} fill={colors.textMuted} fontSize="11">Active</text>
          <rect x={115} y={height - 25} width="10" height="10" rx="2" fill={colors.redundant} />
          <text x={129} y={height - 16} fill={colors.textMuted} fontSize="11">Redundant</text>
          <rect x={185} y={height - 25} width="10" height="10" rx="2" fill={colors.error} />
          <text x={199} y={height - 16} fill={colors.textMuted} fontSize="11">Failed</text>
          <circle cx={245} cy={height - 20} r="4" fill={colors.maintenance} />
          <text x={253} y={height - 16} fill={colors.textMuted} fontSize="11">Maint</text>
          <circle cx={295} cy={height - 20} r="4" fill={colors.active} />
          <text x={303} y={height - 16} fill={colors.textMuted} fontSize="11">Signal</text>
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
            {'\u{1F6E1}\uFE0F\u{1F504}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Uptime Architect
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"In the world of reliability engineering, the difference between "}
            <span style={{ color: colors.accent }}>99.9% and 99.999% uptime</span>
            {" is the difference between 8.7 hours and 5.3 minutes of downtime per year. Learn how to architect systems that never fail — through redundancy, failover, and blast radius containment."}
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
              "Everything fails, all the time. The question is not whether a component will fail, but whether the system can survive the failure. Design for failure, and you design for success."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Werner Vogels, CTO of Amazon
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
      { id: 'a', text: 'Availability doubles — two servers give 198% reliability' },
      { id: 'b', text: 'Availability barely changes — redundancy adds complexity that causes new failures' },
      { id: 'c', text: 'Availability improves dramatically — both must fail simultaneously for downtime' },
      { id: 'd', text: 'Availability depends entirely on the network connecting them, not the servers' },
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
              A single server has 99% uptime (down ~3.6 days/year). What happens when you add an identical backup server in parallel?
            </h2>

            {/* Static SVG showing redundancy concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictActive" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.success} />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="predictBackup" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.redundant} />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Single Server vs Parallel Redundancy</text>
                {/* Single server */}
                <text x="100" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11">Single: 99% uptime</text>
                <rect x="50" y="55" width="100" height="30" rx="6" fill="url(#predictActive)" opacity="0.7" />
                <text x="100" y="75" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Server A</text>
                <text x="100" y="105" textAnchor="middle" fill={colors.error} fontSize="11">Down ~3.6 days/yr</text>
                {/* Parallel servers */}
                <text x="300" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11">Parallel: ???</text>
                <rect x="250" y="55" width="100" height="30" rx="6" fill="url(#predictActive)" opacity="0.7" />
                <text x="300" y="75" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Server A</text>
                <rect x="250" y="95" width="100" height="30" rx="6" fill="url(#predictBackup)" opacity="0.7" />
                <text x="300" y="115" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Server B</text>
                {/* Parallel lines */}
                <line x1="240" y1="70" x2="250" y2="70" stroke={colors.active} strokeWidth="2" />
                <line x1="240" y1="110" x2="250" y2="110" stroke={colors.active} strokeWidth="2" />
                <line x1="240" y1="70" x2="240" y2="110" stroke={colors.active} strokeWidth="2" />
                <line x1="350" y1="70" x2="360" y2="70" stroke={colors.active} strokeWidth="2" />
                <line x1="350" y1="110" x2="360" y2="110" stroke={colors.active} strokeWidth="2" />
                <line x1="360" y1="70" x2="360" y2="110" stroke={colors.active} strokeWidth="2" />
                <text x="300" y="150" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">Both must fail = ???</text>
                {/* Arrow */}
                <path d="M 170 80 L 220 80 L 215 75 M 220 80 L 215 85" stroke={colors.accent} strokeWidth="2" fill="none" />
                <text x="200" y="175" textAnchor="middle" fill={colors.textMuted} fontSize="11">How much does adding a backup improve uptime?</text>
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

  // PLAY PHASE - Uptime Architect Simulator
  if (phase === 'play') {
    const redundancyLabels = ['', 'N (No Redundancy)', 'N+1 Redundancy', '2N Redundancy', '2N+1 Full Redundancy'];

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
              Reliability Block Diagram Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Reliability engineers use block diagrams to model how component failures propagate through a system. Series elements are single points of failure; parallel elements provide redundancy. The architecture determines whether you achieve two nines or five nines of availability.
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
                <strong style={{ color: colors.textPrimary }}>Series Reliability</strong> — components in series ALL must work. Multiply availabilities: A_total = A1 x A2 x A3. One failure kills the system.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Parallel Redundancy</strong> — components in parallel need only ONE to work. A_parallel = 1 - (1-A1)(1-A2). Both must fail simultaneously.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Failure Rate ({'\u03BB'})</strong> — the probability of failure per unit time. MTBF = 1/{'\u03BB'}. Lower {'\u03BB'} means more reliable components.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Try moving the redundancy slider and observe how the block diagram changes. When you increase redundancy, notice how parallel paths appear and the system uptime jumps dramatically. Higher redundancy causes the failure probability to shrink exponentially because both parallel components must fail simultaneously.
            </p>

            {/* Main visualization - side by side on desktop */}
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
                    <ReliabilityVisualization />
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
                  {/* Redundancy level slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Redundancy Level</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {redundancyLabels[redundancyLevel]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={redundancyLevel}
                      onChange={(e) => setRedundancyLevel(parseInt(e.target.value))}
                      onInput={(e) => setRedundancyLevel(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Redundancy Level"
                      style={sliderStyle(colors.accent, redundancyLevel, 1, 4)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>N (None)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>N+1</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>2N</span>
                      <span style={{ ...typo.small, color: colors.success }}>2N+1</span>
                    </div>
                  </div>

                  {/* Component reliability slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Component Reliability</span>
                      <span style={{ ...typo.small, color: colors.component, fontWeight: 600 }}>
                        {componentReliability}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="90"
                      max="100"
                      step="0.1"
                      value={componentReliability}
                      onChange={(e) => setComponentReliability(parseFloat(e.target.value))}
                      onInput={(e) => setComponentReliability(parseFloat((e.target as HTMLInputElement).value))}
                      aria-label="Component Reliability Percentage"
                      style={sliderStyle(colors.component, componentReliability, 90, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>90% (Low)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>95%</span>
                      <span style={{ ...typo.small, color: colors.success }}>100% (Perfect)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: currentUptime >= 99.99 ? colors.success : currentUptime >= 99 ? colors.warning : colors.error }}>
                        {currentUptime.toFixed(4)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>System Uptime</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{currentClass}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Availability Class</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{currentDowntime}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Annual Downtime</div>
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
              Understand the Math
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
              The Mathematics of Redundancy
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — parallel redundancy dramatically improves availability because BOTH components must fail simultaneously for downtime. Two 99% servers in parallel yield 99.99% uptime.'
                : 'As you observed in the experiment, adding parallel redundancy dramatically improves system availability. Two 99% servers in parallel give 99.99% uptime because both must fail at the same time.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Parallel: A_system = 1 - (1 - A)^n</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  With <span style={{ color: colors.accent }}>parallel redundancy</span>, the system only fails when ALL redundant components fail simultaneously. For two 99% servers: A = 1 - (0.01)^2 = <span style={{ color: colors.success }}>99.99%</span>. Each additional parallel path adds another "nine" to your availability.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Series: A_system = A_1 x A_2 x ... x A_n</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  With <span style={{ color: colors.error }}>series components</span>, ANY single failure brings down the system. Every component's failure probability compounds: three 99.9% components in series give only <span style={{ color: colors.error }}>99.7%</span> system availability.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {'Availability = MTBF / (MTBF + MTTR)'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Where MTBF is Mean Time Between Failures and MTTR is Mean Time To Repair. Improving either one improves availability.
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
                The Nines of Availability
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Each additional "nine" of availability represents a 10x reduction in downtime. Going from 99% (3.6 days) to 99.9% (8.7 hours) to 99.99% (52 minutes) to 99.999% (5.3 minutes) requires exponentially more engineering effort. The cost of each additional nine typically increases by an order of magnitude.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Availability Tiers
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: '99%', time: '3.65 days', desc: 'Two nines' },
                  { name: '99.9%', time: '8.76 hours', desc: 'Three nines' },
                  { name: '99.99%', time: '52.6 min', desc: 'Four nines' },
                  { name: '99.999%', time: '5.26 min', desc: 'Five nines' },
                  { name: '99.9999%', time: '31.5 sec', desc: 'Six nines' },
                  { name: 'MTBF/MTTR', time: 'Key ratio', desc: 'Availability formula' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.time}</div>
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
      { id: 'a', text: 'Maintenance has no effect — components are serviced without downtime' },
      { id: 'b', text: 'Maintenance reduces effective redundancy — taking a component offline temporarily lowers availability' },
      { id: 'c', text: 'Maintenance always improves uptime because it prevents failures' },
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
                New Variable: Maintenance Windows
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Real systems need periodic maintenance — firmware updates, hardware replacements, software patches. During maintenance, a component goes offline...
            </h2>

            {/* Static SVG showing maintenance concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistActiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.success} />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* 2N system */}
                <rect x="30" y="15" width="150" height="30" rx="6" fill="url(#twistActiveGrad)" opacity="0.7" />
                <text x="105" y="35" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Server A (Active)</text>
                <rect x="30" y="55" width="150" height="30" rx="6" fill={colors.maintenance} opacity="0.5" />
                <text x="105" y="75" textAnchor="middle" fill={colors.maintenance} fontSize="11" fontWeight="600">Server B (Maintenance)</text>
                {/* Arrow */}
                <path d="M 200 50 L 220 50" stroke={colors.accent} strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                <text x="210" y="45" textAnchor="middle" fill={colors.accent} fontSize="11">During</text>
                <text x="210" y="65" textAnchor="middle" fill={colors.accent} fontSize="11">maint</text>
                {/* Reduced system */}
                <rect x="230" y="35" width="150" height="30" rx="6" fill="url(#twistActiveGrad)" opacity="0.7" />
                <text x="305" y="55" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Server A (Alone)</text>
                <text x="200" y="110" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="700">Redundancy reduced: 2N becomes N during maintenance</text>
                <text x="200" y="130" textAnchor="middle" fill={colors.textMuted} fontSize="11">What happens to availability during the maintenance window?</text>
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
                See Maintenance Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Maintenance Windows Simulator
  if (phase === 'twist_play') {
    const uptimeWithout = calculateSystemUptime(componentReliability, redundancyLevel, 0);
    const uptimeWith = calculateSystemUptime(componentReliability, redundancyLevel, maintenanceInterval);

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
              Maintenance Windows vs Uptime
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Components need periodic service — firmware updates, hardware swaps, security patches. How do maintenance windows affect your availability target?
            </p>

            {/* Educational panel */}
            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The reliability block diagram now includes maintenance windows. When maintenance is active, one component in a redundancy group goes offline, visually highlighted in yellow, reducing effective parallel paths.</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Increasing maintenance hours directly subtracts from system uptime. Raising redundancy level compensates by ensuring spare capacity remains even during service windows.</p>
            </div>

            {/* Side-by-side layout on desktop */}
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
                    <ReliabilityVisualization showMaintenance={true} />
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
                  {/* Maintenance toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => { playSound('click'); setMaintenanceActive(!maintenanceActive); }}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${maintenanceActive ? colors.maintenance : colors.border}`,
                        background: maintenanceActive ? `${colors.maintenance}22` : colors.bgSecondary,
                        color: maintenanceActive ? colors.maintenance : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '16px',
                        minHeight: '44px',
                      }}
                    >
                      {maintenanceActive ? '\u{1F527} Maintenance Windows ACTIVE — Planned Downtime Enabled' : 'Click to Enable Maintenance Windows'}
                    </button>
                  </div>

                  {/* Maintenance hours slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Annual Maintenance Hours</span>
                      <span style={{ ...typo.small, color: colors.maintenance, fontWeight: 600 }}>{maintenanceInterval} hours/year</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="168"
                      step="1"
                      value={maintenanceInterval}
                      onChange={(e) => setMaintenanceInterval(parseInt(e.target.value))}
                      onInput={(e) => setMaintenanceInterval(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Annual Maintenance Hours"
                      style={sliderStyle(colors.maintenance, maintenanceInterval, 0, 168)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0hr (No Maintenance)</span>
                      <span style={{ ...typo.small, color: colors.maintenance }}>168hr (1 week)</span>
                    </div>
                  </div>

                  {/* Redundancy slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Redundancy Level</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {['', 'N', 'N+1', '2N', '2N+1'][redundancyLevel]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={redundancyLevel}
                      onChange={(e) => setRedundancyLevel(parseInt(e.target.value))}
                      onInput={(e) => setRedundancyLevel(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Redundancy Level"
                      style={sliderStyle(colors.accent, redundancyLevel, 1, 4)}
                    />
                  </div>

                  {/* Comparison Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Without Maintenance</div>
                      <div style={{ ...typo.h3, color: uptimeWithout >= 99.99 ? colors.success : colors.warning }}>
                        {uptimeWithout.toFixed(4)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>
                        Downtime: {getDowntimePerYear(uptimeWithout)}/yr
                      </div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>With {maintenanceInterval}hr Maintenance</div>
                      <div style={{ ...typo.h3, color: uptimeWith >= 99.99 ? colors.success : maintenanceActive ? colors.maintenance : colors.warning }}>
                        {maintenanceActive ? uptimeWith.toFixed(4) : uptimeWithout.toFixed(4)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>
                        Downtime: {getDowntimePerYear(maintenanceActive ? uptimeWith : uptimeWithout)}/yr
                      </div>
                    </div>
                  </div>

                  {/* Impact indicator */}
                  {maintenanceActive && maintenanceInterval > 0 && (
                    <div style={{
                      background: `${colors.warning}22`,
                      border: `1px solid ${colors.warning}`,
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}>
                      <p style={{ ...typo.body, color: colors.warning, fontWeight: 700, margin: 0 }}>
                        Maintenance reduces uptime by {(uptimeWithout - uptimeWith).toFixed(4)} percentage points
                      </p>
                      <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                        This is why Tier IV requires "concurrent maintainability" — the ability to service any component without reducing redundancy below N
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
              Understand Maintenance Impact
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
              Maintenance, Common-Mode Failure, and Blast Radius
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Concurrent Maintainability</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Tier III and IV data centers require "concurrent maintainability" — the ability to take any component offline for service while maintaining full N redundancy for the remaining system. This means a 2N+1 design: during maintenance on one component, you still have N+1 redundancy. Without concurrent maintainability, every maintenance window becomes a period of reduced resilience where a single additional failure could cause downtime.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Common-Mode Failure</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Parallel redundancy only protects against independent failures. A common-mode failure — such as a software bug, network misconfiguration, or environmental event — can defeat all redundant copies simultaneously. The AWS us-east-1 outage is a perfect example: the network control plane was a shared dependency that, when it failed, brought down all services regardless of their individual redundancy. Design diversity (different software, different vendors, different data centers) is the countermeasure.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>Blast Radius Containment</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The most important reliability concept beyond redundancy is blast radius containment: limiting the scope of any single failure. Cell-based architectures partition systems into independent "cells" where a failure in one cell cannot propagate to others. If each cell serves 1% of users, even a total cell failure only affects 1% of traffic. Combined with automated failover, this provides high availability without requiring perfect components — because nothing is perfect.
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
        conceptName="E L O N_ Uptime Architect"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Reliability Connection:</p>
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
                {passed ? 'You understand reliability engineering, redundancy architectures, and how to design for five nines of uptime!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Uptime Architect
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of series and parallel reliability, MTBF/MTTR calculations, common-mode failure, and blast radius containment to real-world reliability engineering scenarios. Consider how redundancy, maintenance, and design diversity interact as you work through each problem.
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
            Uptime Architect Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how to design systems for five nines of availability through redundancy, failover, concurrent maintainability, and blast radius containment. You can analyze reliability block diagrams and identify single points of failure.
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
                'Series vs parallel reliability calculations',
                'MTBF/MTTR determines steady-state availability',
                'Common-mode failure defeats naive redundancy',
                'Maintenance windows reduce effective redundancy',
                'Blast radius containment limits failure scope',
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

export default ELON_UptimeArchitectRenderer;
