'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// THROUGHPUT CADENCE - Complete 10-Phase Game
// Manufacturing throughput — cycle time, yield, capacity utilization determine
// output and unit economics. Why throughput is determined by the slowest station.
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

interface ELON_ThroughputCadenceRendererProps {
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
    scenario: "A production line has 5 sequential stations. Four run at 100 units/hr, but station 3 runs at 60 units/hr.",
    question: "What is the maximum throughput of the entire line?",
    options: [
      { id: 'a', label: "100 units/hr (fastest station)" },
      { id: 'b', label: "88 units/hr (weighted average)" },
      { id: 'c', label: "60 units/hr (limited by the bottleneck)", correct: true },
      { id: 'd', label: "500 units/hr (sum of all stations)" }
    ],
    explanation: "The Theory of Constraints tells us that throughput is limited by the bottleneck. No matter how fast other stations run, the line can never exceed the slowest station's rate of 60 units/hr."
  },
  {
    scenario: "A factory manager learns about Little's Law: WIP = Throughput x Cycle Time. The factory has 500 units of WIP and throughput of 50 units/hr.",
    question: "What is the average cycle time for a unit through the factory?",
    options: [
      { id: 'a', label: "10 hours", correct: true },
      { id: 'b', label: "50 hours" },
      { id: 'c', label: "500 hours" },
      { id: 'd', label: "25,000 hours" }
    ],
    explanation: "Little's Law: WIP = Throughput x Cycle Time, so Cycle Time = WIP / Throughput = 500 / 50 = 10 hours. This fundamental law applies to any stable system."
  },
  {
    scenario: "A wafer fab runs at 85% utilization with coefficient of variation (CV) = 0.5. The Kingman formula predicts queue time.",
    question: "What happens if utilization increases from 85% to 95%?",
    options: [
      { id: 'a', label: "Queue time increases linearly by ~12%" },
      { id: 'b', label: "Queue time roughly triples — the hockey stick effect", correct: true },
      { id: 'c', label: "Queue time stays the same" },
      { id: 'd', label: "Queue time decreases due to efficiency gains" }
    ],
    explanation: "The Kingman formula shows queue time proportional to u/(1-u). At 85%: 85/15 = 5.67. At 95%: 95/5 = 19. That's a 3.3x increase! This is the utilization 'hockey stick'."
  },
  {
    scenario: "Takt time is the rate at which a finished product must be completed to meet customer demand. Demand is 480 units per 8-hour shift.",
    question: "What is the takt time?",
    options: [
      { id: 'a', label: "1 minute per unit", correct: true },
      { id: 'b', label: "60 units per minute" },
      { id: 'c', label: "480 minutes" },
      { id: 'd', label: "8 hours per unit" }
    ],
    explanation: "Takt time = Available time / Demand = 480 min / 480 units = 1 min/unit. Every minute, one unit must roll off the line to meet demand."
  },
  {
    scenario: "Two identical production lines have average cycle time of 10 min/station. Line A has CV = 0.2 (low variability). Line B has CV = 1.0 (high variability).",
    question: "At 80% utilization, how do their queue times compare?",
    options: [
      { id: 'a', label: "Same — average cycle time is the same" },
      { id: 'b', label: "Line B has 25x longer queues than Line A", correct: true },
      { id: 'c', label: "Line A has longer queues (more consistent = more bunching)" },
      { id: 'd', label: "Line B has 2x longer queues" }
    ],
    explanation: "Kingman's formula: queue time is proportional to (Ca^2 + Cs^2)/2. Line A: (0.04+0.04)/2=0.04. Line B: (1+1)/2=1.0. That's a 25x difference! Variability is the hidden throughput killer."
  },
  {
    scenario: "A manager wants to increase throughput. She can either speed up the bottleneck station by 10% or speed up a non-bottleneck by 30%.",
    question: "Which investment yields better throughput improvement?",
    options: [
      { id: 'a', label: "Speed up the bottleneck by 10%", correct: true },
      { id: 'b', label: "Speed up the non-bottleneck by 30%" },
      { id: 'c', label: "Both yield the same improvement" },
      { id: 'd', label: "Speed up whichever is cheaper" }
    ],
    explanation: "Theory of Constraints: only improving the bottleneck improves throughput. Speeding up a non-bottleneck station by any amount does nothing for overall output — it just builds more WIP before the bottleneck."
  },
  {
    scenario: "A balanced line has 6 stations each with 10-minute cycle time. One station goes down for 30 minutes (unplanned downtime).",
    question: "How much total production time is lost?",
    options: [
      { id: 'a', label: "30 minutes (just the downtime)" },
      { id: 'b', label: "180 minutes (30 min x 6 stations)" },
      { id: 'c', label: "30 minutes of throughput, but downstream stations starve too", correct: true },
      { id: 'd', label: "No loss — buffers absorb it" }
    ],
    explanation: "If there are no buffers, the downtime propagates. The failed station loses 30 min of output (3 units), and downstream stations starve for the same period. Buffers between stations can mitigate this propagation."
  },
  {
    scenario: "A TSMC wafer fab has over 1,000 process steps and a cycle time of 2 months. Management wants to reduce cycle time.",
    question: "According to Little's Law, which approach reduces cycle time?",
    options: [
      { id: 'a', label: "Increase WIP to keep all machines busy" },
      { id: 'b', label: "Reduce WIP while maintaining throughput", correct: true },
      { id: 'c', label: "Add more process steps for quality" },
      { id: 'd', label: "Run machines at 100% utilization" }
    ],
    explanation: "Little's Law: CT = WIP / TH. To reduce cycle time, either reduce WIP or increase throughput. Running at 100% utilization actually increases CT because queues explode near full utilization."
  },
  {
    scenario: "Line balancing means distributing work evenly. A 4-station line has cycle times: 8, 12, 9, 11 minutes.",
    question: "What is the line efficiency?",
    options: [
      { id: 'a', label: "100% — all stations are busy" },
      { id: 'b', label: "83% — total work time / (stations x bottleneck time)", correct: true },
      { id: 'c', label: "75% — because one station is the bottleneck" },
      { id: 'd', label: "50% — half the stations are underutilized" }
    ],
    explanation: "Line efficiency = Sum of cycle times / (Stations x Bottleneck CT) = (8+12+9+11)/(4x12) = 40/48 = 83.3%. The 16.7% loss is pure waste from imbalance."
  },
  {
    scenario: "SpaceX wants to produce one Raptor engine per day. The current production takes 30 days per engine.",
    question: "What is the minimum number of parallel production flows needed?",
    options: [
      { id: 'a', label: "15 parallel flows" },
      { id: 'b', label: "30 parallel flows", correct: true },
      { id: 'c', label: "1 flow running faster" },
      { id: 'd', label: "60 parallel flows" }
    ],
    explanation: "To produce 1/day with a 30-day cycle time, you need 30 engines in production simultaneously (Little's Law: WIP = TH x CT = 1/day x 30 days = 30 units). Each at a different stage of completion."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F697}',
    title: 'Tesla Fremont vs Shanghai',
    short: 'How factory layout drives throughput per worker',
    tagline: 'Same cars, radically different throughput',
    description: 'Tesla Shanghai achieves roughly 2x the throughput per worker compared to Fremont. The key difference is not harder work but smarter layout — Shanghai was designed from scratch with optimized material flow, shorter transfer distances, and eliminated bottlenecks that plague the older Fremont facility.',
    connection: 'Theory of Constraints in action: Shanghai\'s layout eliminates the bottlenecks that constrain Fremont. Every meter of unnecessary material travel is wasted cycle time.',
    howItWorks: 'Shanghai uses a linear flow optimized for minimal WIP, while Fremont has legacy layout constraints from its GM/Toyota heritage.',
    stats: [
      { value: '2x', label: 'Throughput per worker', icon: '\u{1F4C8}' },
      { value: 'layout', label: 'Key optimization', icon: '\u{1F3ED}' },
      { value: 'Shanghai', label: 'Design-from-scratch', icon: '\u{1F30F}' }
    ],
    examples: ['Model 3 production ramp', 'Model Y casting innovation', 'Paint shop throughput', 'GA line balancing'],
    companies: ['Tesla', 'Toyota (TPS)', 'BYD', 'Rivian'],
    futureImpact: 'Gigafactories increasingly designed with throughput simulation before a single wall is built.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F48E}',
    title: 'TSMC Wafer Fab',
    short: 'Managing a 1000+ step process with months of WIP',
    tagline: 'The most complex manufacturing on Earth',
    description: 'A single TSMC wafer goes through over 1,000 process steps across 2+ months of cycle time. With wafers worth millions in aggregate, WIP inventory represents billions of dollars. Managing this flow requires extraordinary control of variability, queue management, and bottleneck scheduling.',
    connection: 'Little\'s Law governs the entire fab: WIP = Throughput x Cycle Time. Reducing cycle time by even 1 day frees up billions in WIP inventory.',
    howItWorks: 'Sophisticated scheduling algorithms route lots through shared tools, balancing utilization against queue time using queueing theory.',
    stats: [
      { value: '1000+', label: 'Process steps', icon: '\u{1F52C}' },
      { value: '2mo', label: 'Cycle time', icon: '\u{23F1}\u{FE0F}' },
      { value: '$B', label: 'WIP inventory', icon: '\u{1F4B0}' }
    ],
    examples: ['N3 node production', 'EUV lithography scheduling', 'Defect-driven rework loops', 'Metrology queue management'],
    companies: ['TSMC', 'Samsung Foundry', 'Intel Foundry', 'GlobalFoundries'],
    futureImpact: 'AI-driven dispatch systems will optimize tool scheduling in real-time across thousands of lots.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX Raptor Production',
    short: 'From one engine per month to one per day',
    tagline: 'Production cadence as competitive advantage',
    description: 'SpaceX targets producing one Raptor engine per day — a 30x improvement from early production rates of roughly one per month. This requires parallel production flows, standardized tooling, and relentless bottleneck elimination. Each Raptor has hundreds of components flowing through dozens of stations.',
    connection: 'Little\'s Law: to produce 1/day with a 30-day build cycle, you need 30 engines in various stages of production simultaneously. Production cadence is the heartbeat of the factory.',
    howItWorks: 'Parallel flows with staggered starts ensure one engine completes each day, even though each takes weeks to build.',
    stats: [
      { value: '1/day', label: 'Target rate', icon: '\u{1F680}' },
      { value: 'from 1/mo', label: 'Starting rate', icon: '\u{1F4C9}' },
      { value: 'cadence', label: 'Production rhythm', icon: '\u{1F3B5}' }
    ],
    examples: ['Raptor 2 simplification', 'Merlin mass production', 'Starship booster integration', 'McGregor test cadence'],
    companies: ['SpaceX', 'Rocket Lab', 'Relativity Space', 'Blue Origin'],
    futureImpact: 'Fully reusable rockets will shift the bottleneck from production to refurbishment cadence.',
    color: '#F59E0B'
  },
  {
    icon: '\u{2708}\u{FE0F}',
    title: 'Boeing 737 MAX Production',
    short: 'When bottlenecks and quality collide',
    tagline: 'Throughput without quality is negative throughput',
    description: 'Boeing targets 31 aircraft per month for the 737 MAX, but fuselage supply from Spirit AeroSystems has been a persistent bottleneck. Quality issues compound the problem — rework loops pull units backward through the line, destroying effective throughput and creating cascading delays.',
    connection: 'Rework is the hidden throughput killer. Each quality escape that requires rework effectively reduces capacity at the bottleneck by consuming time that should produce new units.',
    howItWorks: 'The final assembly line in Renton operates on pulse-line principles, but upstream supply variability creates feast-or-famine inventory swings.',
    stats: [
      { value: '31/mo', label: 'Target rate', icon: '\u{2708}\u{FE0F}' },
      { value: 'fuselage', label: 'Key bottleneck', icon: '\u{1F6E0}\u{FE0F}' },
      { value: 'quality', label: 'Compounding issue', icon: '\u{26A0}\u{FE0F}' }
    ],
    examples: ['Spirit AeroSystems supply chain', 'Renton final assembly', 'Engine supply constraints', 'FAA production limits'],
    companies: ['Boeing', 'Airbus', 'Spirit AeroSystems', 'Embraer'],
    futureImpact: 'Digital twin simulation of the entire supply chain will predict bottlenecks months in advance.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_ThroughputCadenceRenderer: React.FC<ELON_ThroughputCadenceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
// Simulation state — factory flow
  const [bottleneckSpeed, setBottleneckSpeed] = useState(50);
  const [stationSpeeds] = useState([100, 100, 50, 100, 100]); // Station 3 is bottleneck
  const [simTime, setSimTime] = useState(0);
  const [wipCounts, setWipCounts] = useState([0, 0, 0, 0, 0]);
  const [unitsProduced, setUnitsProduced] = useState(0);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Twist phase — variability scenario
  const [variabilityCV, setVariabilityCV] = useState(0.8);
  const [utilizationPct, setUtilizationPct] = useState(80);

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
// Factory simulation engine
  useEffect(() => {
    if (phase === 'play') {
      const effectiveSpeeds = stationSpeeds.map((s, i) => i === 2 ? bottleneckSpeed : s);
      const minSpeed = Math.min(...effectiveSpeeds);

      simRef.current = setInterval(() => {
        setSimTime(t => t + 1);
        setUnitsProduced(prev => prev + minSpeed / 3600);

        setWipCounts(prev => {
          const newWip = [...prev];
          for (let i = 0; i < 5; i++) {
            const stationSpeed = effectiveSpeeds[i];
            const inputRate = i === 0 ? 100 : effectiveSpeeds[i - 1];
            if (stationSpeed < inputRate) {
              newWip[i] = Math.min(50, newWip[i] + (inputRate - stationSpeed) / 3600);
            } else {
              newWip[i] = Math.max(0, newWip[i] - 0.5);
            }
          }
          return newWip;
        });
      }, 100);

      return () => {
        if (simRef.current) clearInterval(simRef.current);
      };
    }
  }, [phase, bottleneckSpeed, stationSpeeds]);

  // Kingman's formula approximation: Lq = (u/(1-u)) * ((Ca^2 + Cs^2)/2) * (service_time)
  const calculateQueueTime = (utilization: number, cv: number, serviceTime: number = 10) => {
    const u = utilization / 100;
    if (u >= 1) return 999;
    const rho_factor = u / (1 - u);
    const variability_factor = (cv * cv + cv * cv) / 2;
    return rho_factor * variability_factor * serviceTime;
  };

  // Little's Law: WIP = Throughput x Cycle Time
  const calculateLittlesLaw = (throughput: number, cycleTime: number) => {
    return throughput * cycleTime;
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
    warning: '#F97316',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'throughput-cadence',
        gameTitle: 'Throughput Cadence',
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
  const effectiveSpeeds = stationSpeeds.map((s, i) => i === 2 ? bottleneckSpeed : s);
  const lineThoughput = Math.min(...effectiveSpeeds);
  const totalWip = wipCounts.reduce((a, b) => a + b, 0);
  const avgCycleTime = lineThoughput > 0 ? (totalWip / lineThoughput) * 60 : 0;
  const queueTimeAtBottleneck = calculateQueueTime(utilizationPct, variabilityCV);

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
  // Factory Floor SVG Visualization (Play Phase)
  // -------------------------------------------------------------------------
  const FactoryFloorVisualization = () => {
    const width = isMobile ? 340 : 560;
    const height = 380;
    const stationWidth = 60;
    const stationHeight = 50;
    const gap = (width - 80 - stationWidth * 5) / 4;
    const startX = 40;
    const stationY = 100;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Throughput Cadence visualization">
        <defs>
          {/* Station gradients */}
          <linearGradient id="stationNormal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="stationBottleneck" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="conveyorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
          <linearGradient id="throughputMeter" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="queueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="floorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a24" />
            <stop offset="100%" stopColor="#12121a" />
          </linearGradient>
          <linearGradient id="unitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <filter id="stationGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bottleneckPulse" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="unitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="wipRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
          </radialGradient>
          <pattern id="floorPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" />
            <line x1="0" y1="20" x2="20" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            <line x1="20" y1="0" x2="20" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Factory floor background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#floorGrad)" />
        <rect x="0" y="0" width={width} height={height} fill="url(#floorPattern)" />

        {/* Grid reference lines */}
        <line x1={startX} y1={stationY - 10} x2={startX + 5 * (stationWidth + gap) - gap} y2={stationY - 10} stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />
        <line x1={startX} y1={stationY + stationHeight + 35} x2={startX + 5 * (stationWidth + gap) - gap} y2={stationY + stationHeight + 35} stroke="rgba(255,255,255,0.08)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Factory Floor — Top-Down View
        </text>

        {/* Input arrow */}
        <text x={startX - 5} y={stationY + stationHeight / 2 + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">
          IN
        </text>
        <line x1={startX - 2} y1={stationY + stationHeight / 2} x2={startX + 5} y2={stationY + stationHeight / 2} stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowHead)" />

        {/* Conveyor lines between stations */}
        {[0, 1, 2, 3].map(i => {
          const x1pos = startX + (i + 1) * (stationWidth + gap) - gap;
          const x2pos = startX + (i + 1) * (stationWidth + gap);
          return (
            <g key={`conv-${i}`}>
              <line
                x1={x1pos}
                y1={stationY + stationHeight / 2}
                x2={x2pos}
                y2={stationY + stationHeight / 2}
                stroke="url(#conveyorGrad)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Flow dots on conveyor */}
              {[0.25, 0.5, 0.75].map((frac, fi) => (
                <circle
                  key={fi}
                  cx={x1pos + (x2pos - x1pos) * frac}
                  cy={stationY + stationHeight / 2}
                  r="2"
                  fill={colors.accent}
                  opacity={0.4 + (simTime % 3 === fi ? 0.4 : 0)}
                />
              ))}
            </g>
          );
        })}

        {/* Stations */}
        {effectiveSpeeds.map((speed, i) => {
          const x = startX + i * (stationWidth + gap);
          const isBottleneck = i === 2;
          const utilization = (speed / 100) * 100;
          const queueHeight = Math.min(40, wipCounts[i] * 4);

          return (
            <g key={`station-${i}`}>
              {/* Queue buildup visualization (above station) */}
              {wipCounts[i] > 1 && (
                <g>
                  <rect
                    x={x}
                    y={stationY - queueHeight - 5}
                    width={stationWidth}
                    height={queueHeight}
                    rx="4"
                    fill="url(#queueGrad)"
                    opacity="0.7"
                  />
                  <text
                    x={x + stationWidth / 2}
                    y={stationY - queueHeight / 2 - 2}
                    fill={colors.warning}
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Q: {wipCounts[i].toFixed(0)}
                  </text>
                </g>
              )}

              {/* Station rectangle */}
              <rect
                x={x}
                y={stationY}
                width={stationWidth}
                height={stationHeight}
                rx="6"
                fill={isBottleneck ? 'url(#stationBottleneck)' : 'url(#stationNormal)'}
                filter={isBottleneck ? 'url(#bottleneckPulse)' : 'url(#stationGlow)'}
                stroke={isBottleneck ? '#FCA5A5' : '#60A5FA'}
                strokeWidth="1.5"
              />

              {/* Station label */}
              <text
                x={x + stationWidth / 2}
                y={stationY + 18}
                fill="white"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                S{i + 1}
              </text>

              {/* Speed label */}
              <text
                x={x + stationWidth / 2}
                y={stationY + 33}
                fill="rgba(255,255,255,0.8)"
                fontSize="11"
                textAnchor="middle"
              >
                {speed} u/hr
              </text>

              {/* Utilization bar below station */}
              <rect x={x + 5} y={stationY + stationHeight + 6} width={stationWidth - 10} height="4" rx="2" fill={colors.border} />
              <rect
                x={x + 5}
                y={stationY + stationHeight + 6}
                width={(stationWidth - 10) * (utilization / 100)}
                height="4"
                rx="2"
                fill={isBottleneck ? colors.error : colors.success}
              />

              {/* Bottleneck label */}
              {isBottleneck && (
                <text
                  x={x + stationWidth / 2}
                  y={stationY + stationHeight + 22}
                  fill={colors.error}
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  BOTTLENECK
                </text>
              )}
            </g>
          );
        })}

        {/* Output arrow */}
        <text
          x={startX + 5 * (stationWidth + gap) - gap + 5}
          y={stationY + stationHeight / 2 + 4}
          fill={colors.textMuted}
          fontSize="11"
        >
          OUT
        </text>

        {/* Throughput meter (right side) */}
        <g>
          <text x={width - 30} y={55} fill={colors.textMuted} fontSize="11" textAnchor="middle">TH</text>
          <rect x={width - 40} y={60} width="20" height="100" rx="4" fill={colors.border} />
          <rect
            x={width - 40}
            y={60 + 100 - (lineThoughput / 100) * 100}
            width="20"
            height={(lineThoughput / 100) * 100}
            rx="4"
            fill="url(#throughputMeter)"
          />
          <text x={width - 30} y={168} fill={colors.accent} fontSize="11" fontWeight="700" textAnchor="middle">
            {lineThoughput}
          </text>
          <text x={width - 30} y={184} fill={colors.textMuted} fontSize="11" textAnchor="middle">u/hr</text>
        </g>

        {/* Stats bar at bottom */}
        <rect x="20" y={height - 110} width={width - 40} height="100" rx="8" fill="rgba(26,26,36,0.8)" stroke={colors.border} strokeWidth="1" />

        {/* Throughput stat */}
        <text x={width * 0.17} y={height - 86} fill={colors.textMuted} fontSize="11" textAnchor="middle">Throughput</text>
        <text x={width * 0.17} y={height - 66} fill={colors.accent} fontSize="16" fontWeight="700" textAnchor="middle">
          {lineThoughput}
        </text>
        <text x={width * 0.17} y={height - 46} fill={colors.textMuted} fontSize="11" textAnchor="middle">units/hr</text>

        {/* Cycle Time stat */}
        <text x={width * 0.39} y={height - 86} fill={colors.textMuted} fontSize="11" textAnchor="middle">Cycle Time</text>
        <text x={width * 0.39} y={height - 66} fill={colors.cold} fontSize="16" fontWeight="700" textAnchor="middle">
          {(5 * 60 / lineThoughput).toFixed(1)}
        </text>
        <text x={width * 0.39} y={height - 46} fill={colors.textMuted} fontSize="11" textAnchor="middle">min/unit</text>

        {/* WIP stat */}
        <text x={width * 0.61} y={height - 86} fill={colors.textMuted} fontSize="11" textAnchor="middle">WIP</text>
        <text x={width * 0.61} y={height - 66} fill={colors.warning} fontSize="16" fontWeight="700" textAnchor="middle">
          {totalWip.toFixed(0)}
        </text>
        <text x={width * 0.61} y={height - 46} fill={colors.textMuted} fontSize="11" textAnchor="middle">units</text>

        {/* Units Produced stat */}
        <text x={width * 0.83} y={height - 86} fill={colors.textMuted} fontSize="11" textAnchor="middle">Produced</text>
        <text x={width * 0.83} y={height - 66} fill={colors.success} fontSize="16" fontWeight="700" textAnchor="middle">
          {unitsProduced.toFixed(0)}
        </text>
        <text x={width * 0.83} y={height - 46} fill={colors.textMuted} fontSize="11" textAnchor="middle">units</text>

        {/* Little's Law annotation */}
        <rect x={width / 2 - 110} y={height - 35} width="220" height="20" rx="4" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" />
        <text x={width / 2} y={height - 21} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Little's Law: WIP = TH x CT = {(lineThoughput * (5 * 60 / lineThoughput) / 60).toFixed(1)} units
        </text>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // Variability / Kingman SVG Visualization (Twist Play Phase)
  // -------------------------------------------------------------------------
  const VariabilityVisualization = () => {
    const width = isMobile ? 340 : 560;
    const height = 340;
    const chartLeft = 60;
    const chartRight = width - 40;
    const chartTop = 60;
    const chartBottom = 250;
    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    // Generate hockey stick curve for current CV
    const points: Array<{ x: number; y: number; util: number; qt: number }> = [];
    for (let u = 10; u <= 99; u += 2) {
      const qt = calculateQueueTime(u, variabilityCV);
      const clampedQt = Math.min(qt, 200);
      const x = chartLeft + ((u - 10) / 89) * chartWidth;
      const y = chartBottom - (clampedQt / 200) * chartHeight;
      points.push({ x, y, util: u, qt: clampedQt });
    }
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Low CV comparison curve
    const lowCVPoints: Array<{ x: number; y: number }> = [];
    for (let u = 10; u <= 99; u += 2) {
      const qt = calculateQueueTime(u, 0.2);
      const clampedQt = Math.min(qt, 200);
      const x = chartLeft + ((u - 10) / 89) * chartWidth;
      const y = chartBottom - (clampedQt / 200) * chartHeight;
      lowCVPoints.push({ x, y });
    }
    const lowPolyPoints = lowCVPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Current position marker
    const currentQt = Math.min(calculateQueueTime(utilizationPct, variabilityCV), 200);
    const markerX = chartLeft + ((utilizationPct - 10) / 89) * chartWidth;
    const markerY = chartBottom - (currentQt / 200) * chartHeight;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="hockeyGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="lowCVGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="dangerZone" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(239,68,68,0.15)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0)" />
          </linearGradient>
          <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lineGlow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Utilization vs Queue Time — The Hockey Stick
        </text>
        <text x={width / 2} y={42} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Kingman Formula: Lq ~ (u/(1-u)) x (CV^2)
        </text>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
          <g key={`grid-h-${i}`}>
            <line
              x1={chartLeft}
              y1={chartBottom - frac * chartHeight}
              x2={chartRight}
              y2={chartBottom - frac * chartHeight}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4,4"
            />
            <text
              x={chartLeft - 8}
              y={chartBottom - frac * chartHeight + 4}
              fill={colors.textMuted}
              fontSize="11"
              textAnchor="end"
            >
              {(frac * 200).toFixed(0)}
            </text>
          </g>
        ))}
        {[20, 40, 60, 80, 95].map((u, i) => (
          <g key={`grid-v-${i}`}>
            <line
              x1={chartLeft + ((u - 10) / 89) * chartWidth}
              y1={chartTop}
              x2={chartLeft + ((u - 10) / 89) * chartWidth}
              y2={chartBottom}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4,4"
            />
            <text
              x={chartLeft + ((u - 10) / 89) * chartWidth}
              y={chartBottom + 14}
              fill={colors.textMuted}
              fontSize="11"
              textAnchor="middle"
            >
              {u}%
            </text>
          </g>
        ))}

        {/* Danger zone (high utilization) */}
        <rect
          x={chartLeft + (70 / 89) * chartWidth}
          y={chartTop}
          width={(19 / 89) * chartWidth}
          height={chartHeight}
          fill="url(#dangerZone)"
        />

        {/* Low CV reference curve */}
        <polyline points={lowPolyPoints} stroke="url(#lowCVGrad)" fill="none" strokeWidth="2" opacity="0.5" strokeDasharray="6,3" />

        {/* Main hockey stick curve */}
        <path d={pathD} stroke="url(#hockeyGrad)" fill="none" strokeWidth="3" filter="url(#lineGlow)" />

        {/* Current position marker */}
        <circle cx={markerX} cy={markerY} r="10" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#markerGlow)" />
        <text x={markerX} y={markerY - 16} fill={colors.textPrimary} fontSize="11" fontWeight="700" textAnchor="middle">
          {currentQt.toFixed(1)} min
        </text>

        {/* Axis labels */}
        <text x={width / 2} y={chartBottom + 30} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Utilization (%)
        </text>
        <text x={15} y={(chartTop + chartBottom) / 2} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform={`rotate(-90, 15, ${(chartTop + chartBottom) / 2})`}>
          Queue Time (min)
        </text>

        {/* Legend */}
        <g>
          <line x1={chartLeft} y1={height - 25} x2={chartLeft + 20} y2={height - 25} stroke={colors.accent} strokeWidth="3" />
          <text x={chartLeft + 25} y={height - 21} fill={colors.textMuted} fontSize="11">CV = {variabilityCV.toFixed(1)}</text>
          <line x1={chartLeft + 100} y1={height - 25} x2={chartLeft + 120} y2={height - 25} stroke={colors.cold} strokeWidth="2" strokeDasharray="6,3" />
          <text x={chartLeft + 125} y={height - 21} fill={colors.textMuted} fontSize="11">CV = 0.2 (low)</text>
          <circle cx={chartLeft + 220} cy={height - 25} r="5" fill={colors.accent} stroke="white" strokeWidth="1" />
          <text x={chartLeft + 230} y={height - 21} fill={colors.textMuted} fontSize="11">Current</text>
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
            {'\u{1F3ED}\u26A1'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Throughput Cadence
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            "A factory is only as fast as its <span style={{ color: colors.error }}>slowest station</span>. Understanding why throughput is determined by the bottleneck — and why variability destroys it — is the key to manufacturing excellence."
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
              "The goal is not to improve one measurement in isolation. The goal is to reduce operational expense and reduce inventory while simultaneously increasing throughput."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Eliyahu Goldratt, The Goal
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
      { id: 'a', text: '100 units/hr — the line runs at the speed of the fastest stations' },
      { id: 'b', text: '80 units/hr — the average of all station speeds' },
      { id: 'c', text: '50 units/hr — limited by the bottleneck station' },
      { id: 'd', text: '500 units/hr — the sum of all stations combined' },
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
              A factory has 5 stations in sequence. Four run at 100 units/hr but one runs at 50 units/hr. What is the total throughput?
            </h2>

            {/* Static SVG showing factory concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="160" viewBox="0 0 440 160" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 440 }}>
                <defs>
                  <linearGradient id="predNormalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <linearGradient id="predBottleneckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#DC2626" />
                  </linearGradient>
                </defs>
                <text x="220" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">5 Sequential Stations</text>

                {/* Stations */}
                {[0, 1, 2, 3, 4].map(i => {
                  const x = 30 + i * 80;
                  const isBottleneck = i === 2;
                  return (
                    <g key={i}>
                      <rect x={x} y={40} width="60" height="45" rx="6" fill={isBottleneck ? 'url(#predBottleneckGrad)' : 'url(#predNormalGrad)'} />
                      <text x={x + 30} y={58} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">S{i + 1}</text>
                      <text x={x + 30} y={74} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11">{isBottleneck ? '50' : '100'} u/hr</text>
                      {i < 4 && <line x1={x + 60} y1={62} x2={x + 80} y2={62} stroke={colors.textMuted} strokeWidth="2" strokeDasharray="4,2" />}
                      {isBottleneck && <text x={x + 30} y={100} textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="700">BOTTLENECK</text>}
                    </g>
                  );
                })}

                <text x="220" y="130" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">Total throughput = ???</text>
                <text x="220" y="150" textAnchor="middle" fill={colors.textMuted} fontSize="11">What limits the entire line?</text>
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

  // PLAY PHASE - Interactive Factory Flow Simulator
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
              Factory Flow Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Manufacturing throughput determines unit economics, delivery timelines, and competitive advantage. Understanding bottleneck theory is essential for anyone building physical products at scale.
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
                <strong style={{ color: colors.textPrimary }}>Throughput</strong> is the rate at which finished goods exit the production system, measured in units per time period.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Bottleneck</strong> is the station or resource with the lowest capacity, which constrains the throughput of the entire line.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.warning }}>Little's Law</strong> states that WIP = Throughput x Cycle Time — the fundamental law of factory physics.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows a factory floor from above with 5 stations in sequence. Watch how units flow through and where queues build up. Adjust the bottleneck speed slider to see how it affects the entire line's throughput.
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
                    <FactoryFloorVisualization />
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
                  {/* Bottleneck speed slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Bottleneck Station Speed (S3)</span>
                      <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>
                        {bottleneckSpeed} units/hr
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={bottleneckSpeed}
                      onChange={(e) => {
                        setBottleneckSpeed(parseInt(e.target.value));
                        setWipCounts([0, 0, 0, 0, 0]);
                        setUnitsProduced(0);
                        setSimTime(0);
                      }}
                      onInput={(e) => {
                        setBottleneckSpeed(parseInt((e.target as HTMLInputElement).value));
                      }}
                      aria-label="Bottleneck Station Speed"
                      style={sliderStyle(colors.error, bottleneckSpeed, 10, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.error }}>10 u/hr (severe)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50 (default)</span>
                      <span style={{ ...typo.small, color: colors.success }}>100 u/hr (balanced)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{lineThoughput} u/hr</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Line Throughput</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.cold }}>
                        {bottleneckSpeed < 100 ? ((100 - bottleneckSpeed)).toFixed(0) : '0'}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Capacity Lost</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: bottleneckSpeed >= 100 ? colors.success : colors.error }}>
                        {bottleneckSpeed >= 100 ? 'Balanced' : 'Constrained'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Line Status</div>
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
              Understand the Theory
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
              The Theory of Constraints
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right -- as you observed in the simulator, throughput equals the bottleneck speed of 50 units/hr regardless of how fast other stations run.'
                : 'As you observed in the simulator, the line throughput is always limited by the slowest station. Even with four stations at 100 units/hr, the bottleneck at 50 units/hr constrains everything.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Throughput = min(Station Speeds)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The <span style={{ color: colors.accent }}>Theory of Constraints (TOC)</span> tells us that every system has exactly one constraint that determines its output. Improving anything other than the <span style={{ color: colors.error }}>bottleneck</span> yields zero improvement in throughput. All effort must focus on the constraint.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  TH = min(100, 100, 50, 100, 100) = <strong>50 units/hr</strong>
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
                Little's Law: The Fundamental Equation
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                WIP = Throughput x Cycle Time. This is the most important equation in factory physics. It connects three variables: how many items are in the system (WIP), how fast they exit (Throughput), and how long each takes (Cycle Time). Change one, and at least one other must change.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Key Throughput Concepts
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Takt Time', value: 'Demand pace', desc: 'Rate to match demand' },
                  { name: 'Cycle Time', value: 'Process time', desc: 'Time through system' },
                  { name: 'WIP', value: 'In-process', desc: 'Work in progress' },
                  { name: 'Bottleneck', value: 'Constraint', desc: 'Slowest resource' },
                  { name: 'Utilization', value: 'Busy %', desc: 'Resource usage' },
                  { name: 'Yield', value: 'Good %', desc: 'First-pass quality' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.value}</div>
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
      { id: 'a', text: 'Same throughput -- average cycle time is the same so output is identical' },
      { id: 'b', text: 'Much lower effective throughput -- queues explode at high utilization due to variability' },
      { id: 'c', text: 'Higher throughput -- variability creates flexibility that speeds things up' },
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
                New Variable: Process Variability
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Two factories have the same average cycle time, but one has high variability (random delays, inconsistent processing). What happens to the high-variability factory?
            </h2>

            {/* Static SVG showing variability concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 440 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 440 }}>
                <defs>
                  <linearGradient id="steadyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="variableGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <text x="220" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">Same Average, Different Variability</text>

                {/* Factory A - Steady */}
                <text x="60" y="42" textAnchor="middle" fill="#60A5FA" fontSize="11" fontWeight="600">Factory A: Low CV</text>
                {[0, 1, 2, 3, 4].map(i => (
                  <rect key={`a-${i}`} x={10 + i * 50} y={48} width="40" height={22} rx="4" fill="url(#steadyGrad)" opacity="0.7" />
                ))}
                <text x="130" y="63" textAnchor="middle" fill="white" fontSize="11">Consistent timing</text>

                {/* Factory B - Variable */}
                <text x="320" y="42" textAnchor="middle" fill="#F97316" fontSize="11" fontWeight="600">Factory B: High CV</text>
                {[0, 1, 2, 3, 4].map(i => {
                  const heights = [14, 32, 8, 28, 18];
                  return <rect key={`b-${i}`} x={250 + i * 50} y={48 + (32 - heights[i]) / 2} width="40" height={heights[i]} rx="4" fill="url(#variableGrad)" opacity="0.7" />;
                })}
                <text x="370" y="63" textAnchor="middle" fill="white" fontSize="11">Random delays</text>

                <text x="220" y="105" textAnchor="middle" fill={colors.textMuted} fontSize="11">Both average 10 min/station at 80% utilization</text>
                <text x="220" y="125" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="700">What happens to Factory B's throughput?</text>
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
                See Variability Effects
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Variability / Kingman Explorer
  if (phase === 'twist_play') {
    const lowCVQueueTime = calculateQueueTime(utilizationPct, 0.2);
    const highCVQueueTime = calculateQueueTime(utilizationPct, variabilityCV);
    const queueRatio = lowCVQueueTime > 0.01 ? highCVQueueTime / lowCVQueueTime : 1;

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
              Variability Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              See how variability and utilization interact to create the "hockey stick" queue explosion
            </p>

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
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <VariabilityVisualization />
                  </div>
                </div>

                {/* Educational panel */}
                <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px' }}>
                  <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The hockey stick curve shows how queue time explodes as utilization approaches 100%. Higher variability (CV) shifts the curve upward, meaning queues grow even faster.</p>
                  <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase utilization or CV with the sliders, watch the marker climb the curve -- small changes near 90%+ utilization cause massive queue time increases, revealing why factories must leave capacity slack.</p>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Utilization slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Utilization</span>
                      <span style={{ ...typo.small, color: utilizationPct > 85 ? colors.error : colors.accent, fontWeight: 600 }}>
                        {utilizationPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="98"
                      value={utilizationPct}
                      onChange={(e) => setUtilizationPct(parseInt(e.target.value))}
                      onInput={(e) => setUtilizationPct(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Utilization percentage"
                      style={sliderStyle(colors.accent, utilizationPct, 10, 98)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>10% (idle)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>~80% (typical)</span>
                      <span style={{ ...typo.small, color: colors.error }}>98% (overloaded)</span>
                    </div>
                  </div>

                  {/* Variability (CV) slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Coefficient of Variation (CV)</span>
                      <span style={{ ...typo.small, color: variabilityCV > 0.8 ? colors.error : colors.cold, fontWeight: 600 }}>
                        {variabilityCV.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      value={variabilityCV * 100}
                      onChange={(e) => setVariabilityCV(parseInt(e.target.value) / 100)}
                      onInput={(e) => setVariabilityCV(parseInt((e.target as HTMLInputElement).value) / 100)}
                      aria-label="Coefficient of variation"
                      style={sliderStyle(colors.cold, variabilityCV * 100, 5, 200)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>0.05 (robotic)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>0.50 (moderate)</span>
                      <span style={{ ...typo.small, color: colors.error }}>2.0 (chaotic)</span>
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
                      <div style={{ ...typo.h3, color: colors.accent }}>{Math.min(highCVQueueTime, 999).toFixed(1)} min</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Queue Time (current CV)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.cold }}>{lowCVQueueTime.toFixed(1)} min</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Queue Time (low CV=0.2)</div>
                    </div>
                  </div>

                  {/* Impact warning */}
                  <div style={{
                    background: highCVQueueTime > 50 ? `${colors.error}22` : `${colors.warning}22`,
                    border: `1px solid ${highCVQueueTime > 50 ? colors.error : colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      Variability multiplier at current settings:
                    </p>
                    <div style={{
                      ...typo.h2,
                      color: queueRatio > 5 ? colors.error : colors.warning
                    }}>
                      {queueRatio.toFixed(1)}x longer queues
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      vs. a low-variability (CV=0.2) factory at the same utilization
                      {queueRatio > 10 && ' -- VARIABILITY IS DESTROYING THROUGHPUT!'}
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
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Variability Effects
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
              The Hidden Throughput Killer: Variability
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Kingman's Formula</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>Lq = (u/(1-u)) x ((Ca^2 + Cs^2)/2) x te</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Queue length grows with utilization (u), arrival variability (Ca), service variability (Cs), and expected service time (te). The u/(1-u) term creates the hockey stick — at 90% utilization, it equals 9; at 95%, it equals 19. Variability compounds this exponentially.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Utilization Trap</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Managers naturally push for high utilization — "keep every machine busy!" But in systems with any variability, pushing past 85% utilization causes queue times to explode. The relationship is nonlinear — going from 80% to 90% might double queues, but going from 90% to 95% can triple them again.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Maximum throughput requires two things: eliminating bottlenecks (Theory of Constraints) AND reducing variability (Kingman's formula). A factory with perfect average speeds but high variability will have worse effective throughput than one with slightly slower but consistent processing.
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
        conceptName="E L O N_ Throughput Cadence"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Throughput Connection:</p>
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
                      // Auto-advance to next uncompleted app, or test phase if all done
                      const nextUncompleted = newCompleted.findIndex(c => !c);
                      if (nextUncompleted === -1) {
                        // All apps completed — auto-advance to test
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
                {passed ? 'You understand throughput, bottleneck theory, and the impact of variability on manufacturing!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Throughput Cadence
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of Little's Law, Theory of Constraints, line balancing, takt time, and Kingman's formula to real-world manufacturing scenarios. Consider bottleneck effects, variability impact, and the relationship between WIP, throughput, and cycle time.
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
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Throughput Cadence Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why factories are limited by their bottleneck, how variability destroys throughput, and why Little's Law governs all production systems.
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
                'Theory of Constraints: throughput = bottleneck speed',
                'Little\'s Law: WIP = Throughput x Cycle Time',
                'Kingman\'s formula: variability causes queue explosions',
                'The utilization hockey stick — never run at 100%',
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

export default ELON_ThroughputCadenceRenderer;
