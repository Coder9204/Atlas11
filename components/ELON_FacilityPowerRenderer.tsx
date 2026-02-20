'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// FACILITY POWER - Complete 10-Phase Game (ELON Game #9 of 36)
// Data center power architecture — power flow from utility through UPS, PDUs,
// servers. PUE matters.
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

interface ELON_FacilityPowerRendererProps {
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
    scenario: "A data center operator measures total facility power at 14MW, with IT equipment consuming 10MW.",
    question: "What is the Power Usage Effectiveness (PUE) of this facility?",
    options: [
      { id: 'a', label: "PUE = 1.4 — meaning 40% overhead", correct: true },
      { id: 'b', label: "PUE = 0.71 — inverted ratio" },
      { id: 'c', label: "PUE = 4.0 — extreme overhead" },
      { id: 'd', label: "PUE = 10.0 — nonsensically high" }
    ],
    explanation: "PUE = Total Facility Power / IT Equipment Power = 14MW / 10MW = 1.4. A PUE of 1.4 means 40% overhead for cooling, lighting, and power distribution."
  },
  {
    scenario: "An Uptime Institute Tier IV data center guarantees 99.995% uptime. It uses 2N redundancy for all power paths.",
    question: "What does 2N redundancy mean for power infrastructure?",
    options: [
      { id: 'a', label: "Two completely independent power paths, each capable of full load", correct: true },
      { id: 'b', label: "Two generators sharing the load equally" },
      { id: 'c', label: "Double the number of servers" },
      { id: 'd', label: "Two UPS units in series" }
    ],
    explanation: "2N redundancy means two fully independent, mirrored power distribution paths. If one entire path fails, the other can carry 100% of the load with zero interruption."
  },
  {
    scenario: "During a utility power failure, the data center must maintain operations. The sequence is: utility fails → ATS detects → generators start → generators online.",
    question: "What bridges the gap between utility failure and generator startup (typically 10-15 seconds)?",
    options: [
      { id: 'a', label: "UPS batteries provide instant, seamless power", correct: true },
      { id: 'b', label: "Servers have enough stored energy in capacitors" },
      { id: 'c', label: "The facility simply goes dark briefly" },
      { id: 'd', label: "Flywheel generators maintain power indefinitely" }
    ],
    explanation: "UPS (Uninterruptible Power Supply) systems use batteries or flywheels to provide immediate power when utility fails, bridging the 10-15 second gap until diesel generators reach full speed."
  },
  {
    scenario: "A hyperscale operator is choosing between N+1 and 2N redundancy for a new 50MW facility.",
    question: "Which statement about N+1 vs 2N is correct?",
    options: [
      { id: 'a', label: "N+1 adds one extra component; 2N duplicates everything", correct: true },
      { id: 'b', label: "N+1 is always more reliable than 2N" },
      { id: 'c', label: "2N uses half the power of N+1" },
      { id: 'd', label: "They provide identical levels of redundancy" }
    ],
    explanation: "N+1 means if you need N components, you have N+1 (one spare). 2N means everything is fully duplicated. 2N is more reliable but costs significantly more. Tier III requires N+1; Tier IV requires 2N."
  },
  {
    scenario: "A 10MW data center operates UPS systems at 30% load. The UPS efficiency at this load is 89%, compared to 96% at 75% load.",
    question: "Why is partial load UPS efficiency a significant concern?",
    options: [
      { id: 'a', label: "Lower efficiency wastes more power as heat, increasing cooling costs", correct: true },
      { id: 'b', label: "It doesn't matter because UPS systems are always efficient" },
      { id: 'c', label: "Partial load only affects battery life" },
      { id: 'd', label: "UPS efficiency is constant regardless of load" }
    ],
    explanation: "At 30% load with 89% efficiency, a 10MW UPS wastes 1.24MW as heat. At 75% load with 96% efficiency, waste drops to 0.42MW. The difference (0.82MW) adds directly to cooling load and electricity costs."
  },
  {
    scenario: "A PDU (Power Distribution Unit) receives 480V three-phase power and distributes it to server racks.",
    question: "What is the primary function of a PDU in a data center?",
    options: [
      { id: 'a', label: "Step down voltage and distribute power to individual racks with monitoring", correct: true },
      { id: 'b', label: "Store energy for backup power" },
      { id: 'c', label: "Cool the servers" },
      { id: 'd', label: "Convert AC to DC power" }
    ],
    explanation: "PDUs transform high-voltage facility power (typically 480V) down to rack-level voltages (208V/120V), distribute circuits to individual racks, and provide metering, monitoring, and circuit protection."
  },
  {
    scenario: "Google reports an average PUE of 1.10 across its global fleet of data centers, while the industry average is about 1.58.",
    question: "What is the annual energy savings for a 100MW Google facility vs. industry average?",
    options: [
      { id: 'a', label: "About 48MW continuous — roughly $35M/year", correct: true },
      { id: 'b', label: "About 5MW — negligible savings" },
      { id: 'c', label: "About 100MW — they use half the power" },
      { id: 'd', label: "No real savings — PUE doesn't affect costs" }
    ],
    explanation: "At PUE 1.58: total = 158MW. At PUE 1.10: total = 110MW. Difference = 48MW continuous. At $0.08/kWh: 48,000kW × 8,760hrs × $0.08 = ~$33.6M/year in energy savings."
  },
  {
    scenario: "The facility manager notices the chiller plant consuming 3MW for a 10MW IT load. They propose switching from air cooling to direct liquid cooling.",
    question: "How does liquid cooling improve PUE?",
    options: [
      { id: 'a', label: "Liquid removes heat 1000x more efficiently, dramatically reducing cooling energy", correct: true },
      { id: 'b', label: "Liquid cooling eliminates the need for any cooling" },
      { id: 'c', label: "It only improves PUE by reducing lighting costs" },
      { id: 'd', label: "Liquid cooling actually increases PUE" }
    ],
    explanation: "Water has ~1000x the volumetric heat capacity of air. Direct liquid cooling can reduce cooling energy from 30% of IT load to under 5%, dropping PUE from ~1.4 to ~1.05."
  },
  {
    scenario: "A Tier III data center must undergo planned maintenance on one power path without affecting operations.",
    question: "What feature of Tier III design makes this possible?",
    options: [
      { id: 'a', label: "Concurrently maintainable — every component has a redundant path", correct: true },
      { id: 'b', label: "Fault tolerant — automatic failover with zero impact" },
      { id: 'c', label: "It's not possible — maintenance requires downtime" },
      { id: 'd', label: "Servers automatically migrate to another facility" }
    ],
    explanation: "Tier III 'Concurrently Maintainable' means every power and cooling component can be removed for maintenance without impacting IT operations. This requires N+1 redundancy at minimum."
  },
  {
    scenario: "xAI's Colossus cluster in Memphis runs 100,000 H100 GPUs consuming approximately 150MW of power.",
    question: "What unique challenge does AI/GPU compute present for data center power?",
    options: [
      { id: 'a', label: "Extreme power density per rack — 40-100kW vs traditional 5-10kW", correct: true },
      { id: 'b', label: "GPUs use less power than CPUs" },
      { id: 'c', label: "AI workloads have constant, predictable power draw" },
      { id: 'd', label: "GPU clusters don't need cooling" }
    ],
    explanation: "Modern GPU racks draw 40-100kW each, 5-10x more than traditional servers. This extreme density requires liquid cooling, upgraded PDUs, and completely reimagined power distribution at every level."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F310}',
    title: 'Google Data Centers',
    short: 'Industry-leading PUE through innovation',
    tagline: 'Setting the global standard for efficiency',
    description: 'Google operates some of the most efficient data centers in the world, achieving an average PUE of 1.10. Their Hamina, Finland facility uses Baltic Sea water for cooling, while their AI-driven cooling optimization reduced cooling energy by 40%. Every fraction of PUE improvement saves millions annually.',
    connection: 'PUE = Total Facility Power / IT Load. Google\'s 1.10 means only 10% overhead — compared to the industry average of 58% overhead.',
    howItWorks: 'Custom-designed cooling systems, free air cooling in cold climates, and machine learning to optimize HVAC in real time.',
    stats: [
      { value: '1.10', label: 'PUE', icon: '\u{1F3AF}' },
      { value: 'Finland', label: 'Free cooling', icon: '\u{2744}\u{FE0F}' },
      { value: '100%', label: 'Renewable', icon: '\u{267B}\u{FE0F}' }
    ],
    examples: ['Hamina Finland', 'Council Bluffs Iowa', 'The Dalles Oregon', 'Changhua County Taiwan'],
    companies: ['Google Cloud', 'DeepMind AI Cooling', 'Custom server design', 'Tensor Processing Units'],
    futureImpact: 'AI-optimized cooling will push PUE below 1.05 in favorable climates.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F4F1}',
    title: 'Meta Lulea Data Center',
    short: 'Arctic location enables record efficiency',
    tagline: 'Where cold air meets hot compute',
    description: 'Meta\'s Lulea, Sweden data center sits just 70 miles from the Arctic Circle, using outside air for cooling nearly year-round. The facility achieves a PUE of 1.07 — among the lowest in the world. It runs entirely on renewable hydroelectric power from the nearby Lule River.',
    connection: 'By eliminating mechanical chillers through free air cooling, Meta removes the largest non-IT power consumer, pushing PUE toward the theoretical minimum of 1.0.',
    howItWorks: 'Cold Arctic air is drawn through the facility, absorbing server heat. No mechanical refrigeration needed for most of the year.',
    stats: [
      { value: '1.07', label: 'PUE', icon: '\u{1F3AF}' },
      { value: 'Arctic', label: 'Location', icon: '\u{2744}\u{FE0F}' },
      { value: '100%', label: 'Renewable', icon: '\u{1F4A7}' }
    ],
    examples: ['Lulea Sweden', 'Prineville Oregon', 'Fort Worth Texas', 'Clonee Ireland'],
    companies: ['Meta Platforms', 'Open Compute Project', 'Hydroelectric power', 'Custom networking'],
    futureImpact: 'Open Compute designs are driving industry-wide efficiency improvements.',
    color: '#10B981'
  },
  {
    icon: '\u{1F916}',
    title: 'xAI Memphis Colossus',
    short: '100K GPUs pushing power boundaries',
    tagline: 'The largest AI training cluster ever built',
    description: 'xAI\'s Colossus supercomputer in Memphis, Tennessee houses 100,000 NVIDIA H100 GPUs in a single cluster, consuming approximately 150MW of power. Built in record time, it represents a new paradigm in data center design where extreme GPU density demands revolutionary power and cooling approaches.',
    connection: 'At 700W per GPU plus networking and cooling, 100K H100s need ~150MW — equivalent to powering 100,000 homes. PUE optimization at this scale saves tens of millions annually.',
    howItWorks: 'Liquid cooling for GPU racks, dedicated substation infrastructure, and massive power distribution redesigned for 70-100kW per rack.',
    stats: [
      { value: '100K', label: 'H100s', icon: '\u{1F4BB}' },
      { value: '150MW', label: 'Power', icon: '\u{26A1}' },
      { value: 'Colossus', label: 'Cluster', icon: '\u{1F680}' }
    ],
    examples: ['Memphis Tennessee', 'H100 GPU clusters', 'AI training at scale', 'Liquid cooling infrastructure'],
    companies: ['xAI', 'NVIDIA', 'Memphis utility grid', 'Custom cooling solutions'],
    futureImpact: 'Next-gen AI clusters will exceed 500MW, requiring dedicated power plants.',
    color: '#F97316'
  },
  {
    icon: '\u{1F3E2}',
    title: 'Equinix IBX Data Centers',
    short: 'Global colocation with N+1 redundancy',
    tagline: 'The world\'s digital infrastructure backbone',
    description: 'Equinix operates 260+ International Business Exchange (IBX) data centers in 72 metros across 33 countries. Their facilities provide colocation services with Tier III/IV standards, offering N+1 or 2N redundancy. PUE ranges from 1.3 to 1.5 depending on location and age of facility.',
    connection: 'Colocation PUE tends higher (1.3-1.5) because facilities must support diverse, unpredictable customer loads, making cooling optimization harder than hyperscale single-tenant designs.',
    howItWorks: 'Standardized IBX designs with redundant power feeds, UPS systems, generators, and configurable cooling zones for different customer density requirements.',
    stats: [
      { value: '1.3-1.5', label: 'PUE', icon: '\u{1F50B}' },
      { value: '260+', label: 'Data centers', icon: '\u{1F30D}' },
      { value: 'N+1', label: 'Redundancy', icon: '\u{1F6E1}\u{FE0F}' }
    ],
    examples: ['Ashburn VA campus', 'Amsterdam Science Park', 'Singapore Jurong', 'Tokyo Otemachi'],
    companies: ['Equinix', 'Digital Realty', 'CyrusOne', 'QTS Realty'],
    futureImpact: 'Edge computing will drive smaller, more distributed colocation facilities closer to users.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_FacilityPowerRenderer: React.FC<ELON_FacilityPowerRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [itLoad, setItLoad] = useState(48);
  const [coolingMode, setCoolingMode] = useState<'air' | 'liquid'>('air');

  // Twist phase state
  const [twistItLoad, setTwistItLoad] = useState(48);

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

  // PUE calculations
  const airPUE = 1.4;
  const liquidPUE = 1.05;
  const currentPUE = coolingMode === 'air' ? airPUE : liquidPUE;
  const totalPower = itLoad * currentPUE;
  const coolingOverhead = totalPower - itLoad;
  const coolingPercent = ((currentPUE - 1) / currentPUE) * 100;

  // Power cost calculations
  const costPerKWh = 0.08;
  const annualHours = 8760;
  const annualCostTotal = totalPower * 1000 * annualHours * costPerKWh;
  const annualCostIT = itLoad * 1000 * annualHours * costPerKWh;
  const annualCostOverhead = annualCostTotal - annualCostIT;

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
        gameType: 'facility-power',
        gameTitle: 'Facility Power',
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

  // Format large numbers
  const formatMoney = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  // =========================================================================
  // POWER FLOW SVG VISUALIZATION
  // =========================================================================
  const PowerFlowVisualization = () => {
    const width = isMobile ? 350 : 540;
    const height = 380;
    const pue = currentPUE;
    const it = itLoad;
    const total = it * pue;
    const cooling = total - it;
    const upsLoss = total * 0.04;
    const pduLoss = total * 0.02;
    const utilityPower = total + upsLoss + pduLoss;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="utilityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="upsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="pduGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="serverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="coolGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="heatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="rgba(239,68,68,0.2)" />
          </linearGradient>
          <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="heatGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
        {/* Background grid */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="270" x2={width - 30} y2="270" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 4} y1="40" x2={width / 4} y2="340" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="340" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={(width * 3) / 4} y1="40" x2={(width * 3) / 4} y2="340" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        </g>

        {/* Title */}
        <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Data Center Power Flow — {coolingMode === 'air' ? 'Air Cooled' : 'Liquid Cooled'} (PUE {pue.toFixed(2)})
        </text>

        {/* UTILITY node */}
        <rect x={20} y={45} width={isMobile ? 70 : 90} height={36} rx="6" fill="url(#utilityGrad)" filter="url(#nodeGlow)" />
        <text x={20 + (isMobile ? 35 : 45)} y={60} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">UTILITY</text>
        <text x={20 + (isMobile ? 35 : 45)} y={74} fill="white" fontSize="11" textAnchor="middle">{utilityPower.toFixed(1)}MW</text>

        {/* Arrow: Utility → Switchgear */}
        <path d={`M ${20 + (isMobile ? 70 : 90)} 63 L ${isMobile ? 110 : 140} 63`} stroke="#F59E0B" strokeWidth="2" markerEnd="url(#arrowOrange)" />
        <defs><marker id="arrowOrange" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#F59E0B" /></marker></defs>

        {/* SWITCHGEAR node */}
        <rect x={isMobile ? 112 : 142} y={45} width={isMobile ? 70 : 90} height={36} rx="6" fill="#6b7280" stroke="#9ca3af" strokeWidth="1" />
        <text x={isMobile ? 147 : 187} y={60} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">SWITCH</text>
        <text x={isMobile ? 147 : 187} y={74} fill="white" fontSize="11" textAnchor="middle">{total.toFixed(1)}MW</text>

        {/* Arrow: Switchgear → UPS */}
        <path d={`M ${isMobile ? 147 : 187} 81 L ${isMobile ? 147 : 187} 110`} stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowBlue)" />
        <defs><marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#3B82F6" /></marker></defs>

        {/* UPS node */}
        <rect x={isMobile ? 112 : 142} y={112} width={isMobile ? 70 : 90} height={42} rx="6" fill="url(#upsGrad)" filter="url(#nodeGlow)" />
        <text x={isMobile ? 147 : 187} y={129} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">UPS</text>
        <text x={isMobile ? 147 : 187} y={143} fill="white" fontSize="11" textAnchor="middle">{(total - upsLoss).toFixed(1)}MW</text>

        {/* Battery bypass indicator */}
        <rect x={isMobile ? 200 : 250} y={118} width={isMobile ? 55 : 70} height={30} rx="4" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)" strokeWidth="1" />
        <text x={isMobile ? 227 : 285} y={131} fill="#60A5FA" fontSize="11" fontWeight="600" textAnchor="middle">BATTERY</text>
        <text x={isMobile ? 227 : 285} y={146} fill="#60A5FA" fontSize="11" textAnchor="middle">Bypass</text>
        <path d={`M ${isMobile ? 200 : 250} 133 L ${isMobile ? 182 : 232} 133`} stroke="rgba(59,130,246,0.5)" strokeWidth="1" strokeDasharray="3,3" />

        {/* Arrow: UPS → PDU */}
        <path d={`M ${isMobile ? 147 : 187} 154 L ${isMobile ? 147 : 187} 183`} stroke="#10B981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
        <defs><marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#10B981" /></marker></defs>

        {/* PDU node */}
        <rect x={isMobile ? 112 : 142} y={185} width={isMobile ? 70 : 90} height={42} rx="6" fill="url(#pduGrad)" filter="url(#nodeGlow)" />
        <text x={isMobile ? 147 : 187} y={202} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">PDU</text>
        <text x={isMobile ? 147 : 187} y={216} fill="white" fontSize="11" textAnchor="middle">{(total - upsLoss - pduLoss).toFixed(1)}MW</text>

        {/* Arrow: PDU → Server Racks */}
        <path d={`M ${isMobile ? 147 : 187} 227 L ${isMobile ? 147 : 187} 258`} stroke="#F97316" strokeWidth="2" markerEnd="url(#arrowOrangeV)" />
        <defs><marker id="arrowOrangeV" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#F97316" /></marker></defs>

        {/* SERVER RACKS node */}
        <rect x={isMobile ? 97 : 127} y={260} width={isMobile ? 100 : 120} height={42} rx="6" fill="url(#serverGrad)" filter="url(#nodeGlow)" />
        <text x={isMobile ? 147 : 187} y={277} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">SERVER RACKS</text>
        <text x={isMobile ? 147 : 187} y={291} fill="white" fontSize="11" textAnchor="middle">{it.toFixed(0)}MW IT Load</text>

        {/* COOLING SYSTEM - right side */}
        <rect x={isMobile ? 260 : 360} y={200} width={isMobile ? 75 : 90} height={42} rx="6" fill="url(#coolGrad)" filter="url(#nodeGlow)" />
        <text x={isMobile ? 297 : 405} y={217} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">{coolingMode === 'air' ? 'AIR COOL' : 'LIQUID COOL'}</text>
        <text x={isMobile ? 297 : 405} y={231} fill="white" fontSize="11" textAnchor="middle">{cooling.toFixed(1)}MW</text>

        {/* Arrow: Switchgear → Cooling */}
        <path d={`M ${isMobile ? 182 : 232} 63 L ${isMobile ? 297 : 405} 63 L ${isMobile ? 297 : 405} 200`} stroke="#06B6D4" strokeWidth="1.5" fill="none" strokeDasharray="4,3" />

        {/* WASTE HEAT arrows going up from servers */}
        <path d={`M ${isMobile ? 100 : 130} 270 L ${isMobile ? 50 : 60} 270 L ${isMobile ? 50 : 60} 340`} stroke="#EF4444" strokeWidth="1.5" fill="none" opacity="0.6" />
        <text x={isMobile ? 50 : 60} y={330} fill="#EF4444" fontSize="11" textAnchor="middle" fontWeight="600">HEAT</text>
        <text x={isMobile ? 50 : 60} y={345} fill="#EF4444" fontSize="11" textAnchor="middle">{it.toFixed(0)}MW</text>

        {/* Heat arrows from UPS/PDU losses */}
        <circle cx={isMobile ? 96 : 126} cy={133} r="5" fill="rgba(239,68,68,0.3)" />
        <text x={isMobile ? 80 : 110} y={136} fill="#EF4444" fontSize="11" textAnchor="middle">{upsLoss.toFixed(1)}MW</text>

        <circle cx={isMobile ? 96 : 126} cy={206} r="5" fill="rgba(239,68,68,0.3)" />
        <text x={isMobile ? 80 : 110} y={209} fill="#EF4444" fontSize="11" textAnchor="middle">{pduLoss.toFixed(1)}MW</text>

        {/* PUE indicator box */}
        <rect x={isMobile ? 260 : 370} y={280} width={isMobile ? 75 : 90} height={50} rx="8" fill="rgba(249,115,22,0.12)" stroke={colors.accent} strokeWidth="1.5" />
        <text x={isMobile ? 297 : 415} y={298} fill={colors.accent} fontSize="11" fontWeight="700" textAnchor="middle">PUE</text>
        <text x={isMobile ? 297 : 415} y={318} fill={colors.textPrimary} fontSize="16" fontWeight="800" textAnchor="middle">{pue.toFixed(2)}</text>

        {/* Power efficiency indicator */}
        <polyline
          points={`20,${340-(1.0/pue)*80} ${width/4},${340-(1.1/pue)*90} ${width/2},${340-(1.2/pue)*95} ${width-20},${340-(1.4/pue)*100}`}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          opacity="0.3"
        />

        <g>
        {/* Legend */}
        <rect x={20} y={height - 30} width="10" height="10" rx="2" fill="url(#utilityGrad)" />
        <text x={34} y={height - 22} fill="#94a3b8" fontSize="11">Utility</text>
        <rect x={80} y={height - 30} width="10" height="10" rx="2" fill="url(#upsGrad)" />
        <text x={94} y={height - 22} fill="#94a3b8" fontSize="11">UPS</text>
        <rect x={130} y={height - 30} width="10" height="10" rx="2" fill="url(#pduGrad)" />
        <text x={144} y={height - 22} fill="#94a3b8" fontSize="11">PDU</text>
        <rect x={180} y={height - 30} width="10" height="10" rx="2" fill="url(#serverGrad)" />
        <text x={194} y={height - 22} fill="#94a3b8" fontSize="11">IT</text>
        <rect x={220} y={height - 30} width="10" height="10" rx="2" fill="url(#coolGrad)" />
        <text x={234} y={height - 22} fill="#94a3b8" fontSize="11">Cooling</text>
        <circle cx={288} cy={height - 25} r="4" fill="#EF4444" opacity="0.6" />
        <text x={296} y={height - 22} fill="#94a3b8" fontSize="11">Waste Heat</text>
        </g>

        {/* Interactive power indicator */}
        <circle cx={isMobile ? 147 : 187} cy={280 - it * 2} r="8" fill={colors.accent} stroke="white" strokeWidth="2" />

        {/* Formula */}
        <text x={width - 20} y={38} fill={colors.accent} fontSize="12" fontWeight="600" textAnchor="end">P = PUE × IT Load</text>
      </svg>
    );
  };

  // =========================================================================
  // TWIST SVG - Liquid vs Air Cooling Comparison
  // =========================================================================
  const CoolingComparisonVisualization = () => {
    const width = isMobile ? 350 : 540;
    const height = 340;
    const itMW = twistItLoad;
    const airTotal = itMW * airPUE;
    const liquidTotal = itMW * liquidPUE;
    const airCooling = airTotal - itMW;
    const liquidCooling = liquidTotal - itMW;
    const savings = airTotal - liquidTotal;
    const annualSavings = savings * 1000 * annualHours * costPerKWh;

    const barMaxW = isMobile ? 240 : 380;
    const airBarW = barMaxW;
    const liquidBarW = barMaxW * (liquidTotal / airTotal);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="airCoolBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="liquidCoolBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="savingsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="savingsGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="190" x2={width - 30} y2="190" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="260" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Air Cooling (PUE 1.4) vs Liquid Cooling (PUE 1.05) — {itMW}MW IT
        </text>

        {/* Air cooling bar */}
        <text x={40} y={55} fill="#EF4444" fontSize="11" fontWeight="600">Air Cooled — PUE 1.40</text>
        <rect x={40} y={62} width={airBarW} height={28} rx="4" fill="url(#airCoolBar)" opacity="0.8" />
        <text x={40 + airBarW / 2} y={81} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">{airTotal.toFixed(1)}MW Total</text>
        <text x={40 + airBarW + 8} y={81} fill="#94a3b8" fontSize="11">+{airCooling.toFixed(1)}MW cooling</text>

        {/* Liquid cooling bar */}
        <text x={40} y={115} fill="#10B981" fontSize="11" fontWeight="600">Liquid Cooled — PUE 1.05</text>
        <rect x={40} y={122} width={liquidBarW} height={28} rx="4" fill="url(#liquidCoolBar)" filter="url(#twistGlow)" />
        <text x={40 + liquidBarW / 2} y={141} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">{liquidTotal.toFixed(1)}MW Total</text>
        <text x={40 + liquidBarW + 8} y={141} fill="#94a3b8" fontSize="11">+{liquidCooling.toFixed(1)}MW cooling</text>

        {/* Savings bracket */}
        <line x1={40 + liquidBarW} y1={155} x2={40 + liquidBarW} y2={178} stroke="#10B981" strokeWidth="1.5" />
        <line x1={40 + airBarW} y1={155} x2={40 + airBarW} y2={178} stroke="#10B981" strokeWidth="1.5" />
        <line x1={40 + liquidBarW} y1={178} x2={40 + airBarW} y2={178} stroke="#10B981" strokeWidth="1.5" />
        <path d={`M ${40 + (liquidBarW + airBarW) / 2} 178 L ${40 + (liquidBarW + airBarW) / 2} 195`} stroke="#10B981" strokeWidth="1.5" />

        {/* Savings box */}
        <rect x={width / 2 - 80} y={198} width="160" height="48" rx="8" fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth="1.5" filter="url(#savingsGlow)" />
        <text x={width / 2} y={218} fill="#10B981" fontSize="12" fontWeight="700" textAnchor="middle">{savings.toFixed(1)}MW Saved</text>
        <text x={width / 2} y={236} fill="#10B981" fontSize="11" textAnchor="middle">{formatMoney(annualSavings)}/year</text>

        {/* Efficiency comparison circles */}
        <circle cx={width / 4} cy={285} r="8" fill="#EF4444" opacity="0.4" filter="url(#twistGlow)" />
        <text x={width / 4 + 16} y={289} fill="#94a3b8" fontSize="11">Air: {((1 - 1 / airPUE) * 100).toFixed(0)}% overhead</text>

        <circle cx={width / 4} cy={310} r="8" fill="#10B981" filter="url(#twistGlow)" />
        <text x={width / 4 + 16} y={314} fill="#94a3b8" fontSize="11">Liquid: {((1 - 1 / liquidPUE) * 100).toFixed(0)}% overhead</text>

        {/* Power efficiency curve */}
        <polyline
          points={`${width/2+40},275 ${width/2+80},265 ${width/2+100},290 ${width/2+160},270`}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          opacity="0.3"
        />

        {/* Legend */}
        <rect x={30} y={height - 25} width="10" height="10" rx="2" fill="url(#airCoolBar)" />
        <text x={44} y={height - 17} fill="#94a3b8" fontSize="11">Air Cooled</text>
        <rect x={120} y={height - 25} width="10" height="10" rx="2" fill="url(#liquidCoolBar)" />
        <text x={134} y={height - 17} fill="#94a3b8" fontSize="11">Liquid Cooled</text>
        <circle cx={230} cy={height - 20} r="4" fill="#10B981" />
        <text x={238} y={height - 17} fill="#94a3b8" fontSize="11">Annual Savings</text>
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
            {'\u{1F5A5}\u{FE0F}\u{26A1}'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Facility Power
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            Every Google search uses <span style={{ color: colors.accent }}>0.3 watt-hours</span> of electricity. Multiply that by 8.5 billion searches per day, and you begin to see why data center power architecture is one of the most critical engineering challenges of our time.
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
              "Data centers consume about 2% of global electricity — roughly the same as the entire country of France. PUE determines how much of that power actually reaches the servers versus being wasted on cooling and distribution overhead."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Data Center Infrastructure Engineering
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '500px',
            width: '100%',
            marginBottom: '16px',
          }}>
            {[
              { val: '2%', label: 'Global electricity', color: colors.accent },
              { val: '1.58', label: 'Avg industry PUE', color: colors.warning },
              { val: '$10B+', label: 'Annual cooling cost', color: colors.error },
            ].map((s, i) => (
              <div key={i} style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ ...typo.h3, color: s.color }}>{s.val}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{s.label}</div>
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
      { id: 'a', text: '100MW — PUE only affects efficiency, not total draw' },
      { id: 'b', text: '120MW — 20% overhead for cooling and distribution' },
      { id: 'c', text: '140MW — 40% overhead means PUE multiplied by IT load' },
      { id: 'd', text: '200MW — double the IT load for infrastructure' },
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

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A data center with PUE of 1.4 uses 100MW for IT equipment. What is the TOTAL facility power draw?
            </h2>

            {/* Static SVG showing PUE concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictITGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                  <linearGradient id="predictTotalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">PUE = Total Facility Power / IT Equipment Power</text>
                <text x="200" y="55" textAnchor="middle" fill="#F97316" fontSize="12">IT Equipment Load: 100MW</text>
                <rect x="80" y="65" width="240" height="24" rx="4" fill="url(#predictITGrad)" opacity="0.7" />
                <text x="200" y="82" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">100MW IT Load</text>
                <text x="200" y="115" textAnchor="middle" fill="#6366F1" fontSize="12">PUE = 1.4 ... Total Power = ???</text>
                <rect x="60" y="125" width="280" height="30" rx="4" fill="url(#predictTotalGrad)" filter="url(#predictGlow)" />
                <text x="200" y="146" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">??? MW Total</text>
                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">How much total power does the facility need?</text>
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

  // PLAY PHASE - Interactive Power Flow Simulator
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
              Data Center Power Flow Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Power is the single largest operating expense for data centers, often exceeding $50M annually for a large facility. Understanding PUE and power flow is essential for infrastructure engineering.
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
                <strong style={{ color: colors.textPrimary }}>PUE (Power Usage Effectiveness)</strong> is defined as Total Facility Power divided by IT Equipment Power. A PUE of 1.0 means perfect efficiency; every watt goes to compute.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>IT Load</strong> refers to the power consumed by servers, storage, and networking equipment — the productive work.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Overhead</strong> describes power consumed by cooling, UPS losses, PDU losses, lighting, and other non-IT infrastructure.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows power flowing from the utility grid through switchgear, UPS, and PDUs to server racks. Adjust the IT load slider to see how cooling overhead scales. Watch the PUE indicator and waste heat values change in real time.
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
                    <PowerFlowVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Cooling mode selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Cooling Mode</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {coolingMode === 'air' ? 'Air Cooling (PUE 1.4)' : 'Liquid Cooling (PUE 1.05)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['air', 'liquid'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => { playSound('click'); setCoolingMode(mode); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: coolingMode === mode ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                            background: coolingMode === mode ? `${colors.accent}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                            flex: 1,
                          }}
                        >
                          {mode === 'air' ? 'Air Cooling' : 'Liquid Cooling'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* IT Load slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>IT Load Power</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {itLoad}MW
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={itLoad}
                      onChange={(e) => setItLoad(parseInt(e.target.value))}
                      onInput={(e) => setItLoad(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="IT Load"
                      style={sliderStyle(colors.accent, itLoad, 1, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1MW</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50MW</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>100MW</span>
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
                  <div style={{ ...typo.h3, color: colors.accent }}>{currentPUE.toFixed(2)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>PUE</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.error }}>{coolingOverhead.toFixed(1)}MW</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Overhead</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>
                    {formatMoney(annualCostOverhead)}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Annual Cost</div>
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
              Understand PUE
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
              Understanding Facility Power
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — PUE of 1.4 means total power = 1.4 x 100MW = 140MW. The extra 40MW goes to cooling, UPS losses, and power distribution.'
                : 'As you observed in the simulator, PUE directly multiplies IT load to give total facility power. With PUE 1.4: Total = 1.4 x 100MW = 140MW. That extra 40MW is pure overhead.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>PUE = Total Facility Power / IT Equipment Power</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is because the <span style={{ color: colors.accent }}>Power Usage Effectiveness</span> captures all facility overhead in a single number. A PUE of <span style={{ color: colors.error }}>1.4</span> means for every watt of IT compute, you need 0.4 watts of cooling, distribution, and other overhead. The <span style={{ color: colors.success }}>theoretical minimum is 1.0</span> — all power goes to compute.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  Total Power = PUE x IT Load = 1.4 x 100MW = <strong>140MW</strong>
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
                Where Does the Overhead Go?
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                For a typical PUE of 1.4, the 40% overhead breaks down roughly as: cooling systems (25-30%), UPS losses (4-8%), PDU/transformer losses (2-4%), lighting and building systems (1-3%). Cooling dominates because every watt of IT power becomes a watt of heat that must be removed.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                PUE Benchmarks by Tier
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Hyperscale', pue: '1.05-1.15', desc: 'Google, Meta' },
                  { name: 'Enterprise', pue: '1.4-1.6', desc: 'Corporate DCs' },
                  { name: 'Legacy', pue: '1.8-2.5', desc: 'Older facilities' },
                  { name: 'Colocation', pue: '1.3-1.5', desc: 'Equinix, DRT' },
                  { name: 'Edge', pue: '1.4-1.8', desc: 'Small, remote' },
                  { name: 'Ideal', pue: '1.0', desc: 'Theoretical min' },
                ].map(tier => (
                  <div key={tier.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{tier.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{tier.pue}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{tier.desc}</div>
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
      { id: 'a', text: 'About $1M annually — cooling is a small fraction of costs' },
      { id: 'b', text: 'About $25M annually — the PUE difference saves 35MW of overhead' },
      { id: 'c', text: 'No savings — liquid cooling costs more to operate than air cooling' },
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
                New Variable: Cooling Technology
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Switching from air cooling to liquid cooling reduces PUE from 1.4 to 1.05. For a 100MW data center, annual savings are...
            </h2>

            {/* Static SVG showing cooling change */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistAirGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                  <linearGradient id="twistLiquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">100MW IT Load: Air vs Liquid Cooling</text>
                <text x="50" y="48" fill="#EF4444" fontSize="11" fontWeight="600">Air: PUE 1.4</text>
                <rect x="50" y="55" width="300" height="22" rx="4" fill="url(#twistAirGrad)" opacity="0.7" />
                <text x="200" y="70" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">140MW Total</text>
                <text x="50" y="98" fill="#10B981" fontSize="11" fontWeight="600">Liquid: PUE 1.05</text>
                <rect x="50" y="105" width="225" height="22" rx="4" fill="url(#twistLiquidGrad)" />
                <text x="162" y="120" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">105MW Total</text>
                <text x="330" y="120" fill="#94a3b8" fontSize="11" fontWeight="600">??? saved</text>
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
                See the Impact
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Cooling Comparison
  if (phase === 'twist_play') {
    const airTotal = twistItLoad * airPUE;
    const liquidTotal = twistItLoad * liquidPUE;
    const savingsMW = airTotal - liquidTotal;
    const savingsAnnual = savingsMW * 1000 * annualHours * costPerKWh;

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
              Air vs Liquid Cooling Impact
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              See how cooling technology choice transforms data center economics
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
                    <CoolingComparisonVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The bar chart compares total facility power under air cooling (PUE 1.4) versus liquid cooling (PUE 1.05), revealing how much energy each approach wastes on cooling overhead.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> As you increase the IT load slider, the absolute megawatt savings from liquid cooling grow proportionally -- a small PUE difference at scale translates to millions of dollars in annual energy cost reduction.</p>
                  </div>

                  {/* IT Load slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>IT Load Power</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistItLoad}MW</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={twistItLoad}
                      onChange={(e) => setTwistItLoad(parseInt(e.target.value))}
                      onInput={(e) => setTwistItLoad(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="IT Load for comparison"
                      style={sliderStyle(colors.accent, twistItLoad, 1, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1MW</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50MW</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>100MW</span>
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
                  <div style={{ ...typo.h3, color: colors.success }}>{savingsMW.toFixed(1)}MW</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Power Saved</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{formatMoney(savingsAnnual)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Annual Savings</div>
                </div>
              </div>

              {/* Comparison details */}
              <div style={{
                background: `${colors.success}11`,
                border: `1px solid ${colors.success}33`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  Cooling overhead reduction:
                </p>
                <div style={{
                  ...typo.h2,
                  color: colors.success,
                }}>
                  {((airTotal - liquidTotal) / airTotal * 100).toFixed(1)}% less total power
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Air: {airTotal.toFixed(1)}MW total | Liquid: {liquidTotal.toFixed(1)}MW total
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
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Cooling Impact
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
              The Cooling Revolution
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why Liquid Cooling Wins</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
                  Water heat capacity: ~4,000x air per volume
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Water absorbs heat roughly 4,000 times more efficiently per unit volume than air. Direct liquid cooling places coolant in direct contact with heat-generating components, eliminating the inefficient air-to-liquid heat exchange step entirely. For a 100MW facility: savings = (1.4 - 1.05) x 100 = <strong>35MW = ~$24.5M/year</strong>.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The GPU Density Problem</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Modern AI GPU racks draw 40-100kW each — 5 to 10 times more than traditional servers. Air cooling physically cannot remove this much heat from a confined space. Liquid cooling is not just more efficient — for AI workloads, it is the only viable option. This is why every new hyperscale AI cluster uses liquid cooling.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Economics at Scale</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  At hyperscale (50-150MW), every 0.01 PUE improvement saves roughly $700K per year per 100MW. The industry is racing toward PUE 1.0, and the companies that get there first gain an enormous competitive advantage in AI training costs.
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
        conceptName="E L O N_ Facility Power"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Engineering Connection:</p>
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
                  Key tech: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      // Auto-advance to next uncompleted app, or go to test if all done
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c);
                      if (nextUncompleted !== -1) {
                        setSelectedApp(nextUncompleted);
                      } else {
                        setSelectedApp(idx);
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
                {passed ? 'You understand data center power architecture and PUE optimization!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Facility Power
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of PUE, redundancy, power distribution, and cooling technology to real-world data center engineering scenarios. Consider how power flows from utility through UPS and PDUs to servers, and how cooling technology choices affect total facility power consumption.
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
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Facility Power Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how data centers power the digital world — from utility grid to server rack, and why PUE optimization saves millions.
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
                'PUE = Total Facility Power / IT Load',
                'Power path: Utility > UPS > PDU > Servers',
                'Liquid cooling cuts PUE from 1.4 to 1.05',
                'N+1 and 2N redundancy for uptime',
                'GPU density demands new cooling paradigms',
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

export default ELON_FacilityPowerRenderer;
