'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Grid Frequency Control - Complete 10-Phase Game
// Why maintaining 50/60Hz is critical for grid stability
// ─────────────────────────────────────────────────────────────────────────────

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

interface GridFrequencyRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "At 6 PM on a hot summer day, millions of people arrive home and turn on their air conditioners simultaneously. Grid operators notice the frequency dropping from 60.00 Hz to 59.92 Hz within seconds.",
    question: "What does this frequency drop indicate about the grid?",
    options: [
      { id: 'a', label: "Power plants are generating too much electricity" },
      { id: 'b', label: "Demand suddenly exceeded supply, causing generators to slow down", correct: true },
      { id: 'c', label: "Transmission lines are overheating from excess current" },
      { id: 'd', label: "Frequency sensors are malfunctioning due to the heat" }
    ],
    explanation: "Grid frequency is a real-time indicator of supply-demand balance. When demand exceeds supply, the extra load acts as a brake on generators, causing them to slow down. Each 0.01 Hz drop represents a significant power imbalance that must be corrected immediately."
  },
  {
    scenario: "A natural gas power plant is about to connect to the grid. Operators carefully monitor oscilloscopes showing the generator's output voltage waveform compared to the grid waveform, waiting for the peaks to align perfectly.",
    question: "Why must generators synchronize before connecting to the grid?",
    options: [
      { id: 'a', label: "To ensure billing meters record power correctly" },
      { id: 'b', label: "Connecting out of phase would cause massive current surges and potential equipment damage", correct: true },
      { id: 'c', label: "Synchronization is only required for renewable energy sources" },
      { id: 'd', label: "It allows the generator cooling systems to stabilize" }
    ],
    explanation: "Generators must match the grid's frequency, voltage, and phase angle before connecting. An out-of-phase connection creates a near short-circuit condition, causing destructive current surges that can damage generator windings, trip protective breakers, and send destabilizing waves through the entire grid."
  },
  {
    scenario: "A large industrial facility unexpectedly shuts down, removing 500 MW of load from the grid. Within milliseconds, all generators across the region automatically begin reducing their power output without any human intervention.",
    question: "What mechanism causes generators to automatically reduce output when load drops?",
    options: [
      { id: 'a', label: "Smart meters send instant signals to all power plants" },
      { id: 'b', label: "Droop control - generators reduce output as frequency rises above the setpoint", correct: true },
      { id: 'c', label: "Generators physically cannot spin faster than their rated frequency" },
      { id: 'd', label: "Operators at each plant manually adjust output in real time" }
    ],
    explanation: "Droop control is a decentralized stability mechanism where each generator automatically adjusts its power output based on frequency deviation. A typical 5% droop setting means the generator reduces output by 100% if frequency rises 5% above nominal. This provides automatic load balancing without communication delays."
  },
  {
    scenario: "Two islands have identical peak demand. Island A uses diesel generators, while Island B replaced 80% of generation with solar panels and batteries. During a sudden 10% load increase, Island A's frequency drops to 59.5 Hz, but Island B's drops to 58.5 Hz.",
    question: "Why does Island B experience a larger frequency drop despite having modern equipment?",
    options: [
      { id: 'a', label: "Solar panels produce lower quality electricity than diesel generators" },
      { id: 'b', label: "Island B has less rotational inertia to resist frequency changes", correct: true },
      { id: 'c', label: "Batteries cannot respond to load changes as quickly as generators" },
      { id: 'd', label: "Diesel generators are inherently more efficient than solar systems" }
    ],
    explanation: "Rotational inertia from spinning generator masses acts as an energy buffer, resisting sudden frequency changes. Solar inverters provide no physical inertia. This is why high-renewable grids need synthetic inertia from batteries or must maintain some synchronous generators to prevent dangerous frequency swings."
  },
  {
    scenario: "After a major transmission line failure during peak demand, frequency drops to 58.8 Hz. Automated systems begin disconnecting neighborhoods from the grid in a predetermined sequence, prioritizing hospitals and emergency services.",
    question: "What is the purpose of under-frequency load shedding (UFLS)?",
    options: [
      { id: 'a', label: "To punish areas that use excessive electricity" },
      { id: 'b', label: "To prevent total grid collapse by sacrificing some loads to stabilize frequency", correct: true },
      { id: 'c', label: "To reduce electricity bills during emergency situations" },
      { id: 'd', label: "To test the grid's resilience during routine maintenance" }
    ],
    explanation: "UFLS is a last-resort protection mechanism. If frequency falls too low, generators can be damaged and trip offline, causing cascading failures. By automatically disconnecting predetermined loads in stages, UFLS restores supply-demand balance and prevents a total blackout that would affect everyone."
  },
  {
    scenario: "California's grid operator notices frequency volatility has increased significantly on days with high solar generation, especially during the 'duck curve' transition when solar output drops rapidly at sunset.",
    question: "Why do high levels of solar generation create frequency stability challenges?",
    options: [
      { id: 'a', label: "Solar panels generate electricity at a variable frequency" },
      { id: 'b', label: "Solar displaces synchronous generators, reducing system inertia and requiring faster ramping", correct: true },
      { id: 'c', label: "Solar electricity is fundamentally incompatible with AC grids" },
      { id: 'd', label: "Clouds cause solar panels to generate excessive power surges" }
    ],
    explanation: "Solar generation through inverters provides no rotational inertia. As solar displaces conventional generators during the day, system inertia decreases. When solar drops rapidly at sunset, remaining generators must ramp up quickly. Low inertia combined with fast ramps creates frequency volatility requiring careful management."
  },
  {
    scenario: "Engineers design a microgrid for a remote island that will operate independently. They debate using traditional 'grid-following' inverters versus newer 'grid-forming' inverters for the battery storage system.",
    question: "What is the key advantage of grid-forming inverters for this application?",
    options: [
      { id: 'a', label: "Grid-forming inverters are simply more efficient" },
      { id: 'b', label: "Grid-forming inverters can establish frequency independently without external reference", correct: true },
      { id: 'c', label: "Grid-following inverters are too expensive for island applications" },
      { id: 'd', label: "Grid-forming technology only works with wind turbines" }
    ],
    explanation: "Grid-following inverters synchronize to an existing frequency reference and cannot operate without one. Grid-forming inverters can create their own voltage and frequency reference, acting like a synchronous generator. For islanded microgrids or grids with 100% inverter-based resources, grid-forming capability is essential."
  },
  {
    scenario: "A power system engineer detects a 0.3 Hz oscillation in power flow between the Eastern and Western regions of a large interconnected grid. The oscillation grows larger over several minutes before damping controls activate.",
    question: "What causes these inter-area oscillations in large power grids?",
    options: [
      { id: 'a', label: "Faulty frequency sensors creating false oscillating readings" },
      { id: 'b', label: "Groups of generators in different regions swinging against each other through weak interconnections", correct: true },
      { id: 'c', label: "Synchronized switching of millions of household appliances" },
      { id: 'd', label: "Natural resonance in the transformer winding configurations" }
    ],
    explanation: "Inter-area oscillations occur when clusters of generators in different regions exchange power in an oscillatory pattern. Weak transmission ties between regions and insufficient damping allow these low-frequency (0.1-1 Hz) oscillations to develop. Without proper Power System Stabilizers, oscillations can grow and cause widespread outages."
  },
  {
    scenario: "After a complete regional blackout, operators begin restoration. They start a hydroelectric plant using its own auxiliary power, then carefully energize transmission lines section by section while monitoring frequency closely.",
    question: "Why is frequency control especially critical during black start recovery?",
    options: [
      { id: 'a', label: "Electricity costs more during blackout recovery operations" },
      { id: 'b', label: "The isolated system has minimal inertia; load pickup must be carefully balanced to prevent frequency collapse", correct: true },
      { id: 'c', label: "Frequency meters require recalibration after extended outages" },
      { id: 'd', label: "Black start generators operate at different frequencies than normal" }
    ],
    explanation: "During black start, the grid rebuilds from scratch with just one or a few generators. This tiny system has very little inertia, so any load-generation mismatch causes large frequency swings. Operators must carefully balance each load pickup with generation increases. Connecting too much load too quickly can collapse frequency and restart the blackout."
  },
  {
    scenario: "A hospital's backup power system includes a diesel generator and a battery system. During a grid outage, the generator starts but takes 15 seconds to reach stable output, while the battery instantly covers the hospital's critical loads.",
    question: "Why do batteries respond so much faster than diesel generators?",
    options: [
      { id: 'a', label: "Diesel fuel is slow to ignite and combust" },
      { id: 'b', label: "Batteries have no mechanical inertia to overcome; electronic power conversion is nearly instantaneous", correct: true },
      { id: 'c', label: "Batteries store higher quality electricity than generators produce" },
      { id: 'd', label: "Diesel generators are designed to start slowly for safety" }
    ],
    explanation: "Diesel generators must physically accelerate their rotating mass, build up combustion pressure, and synchronize before delivering power. Batteries use solid-state power electronics that can switch in milliseconds. This speed advantage makes batteries essential for frequency regulation, providing 'synthetic inertia' faster than any mechanical system."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🔋',
    title: 'Grid-Scale Battery Storage',
    short: 'Instant frequency response without spinning mass',
    tagline: 'Batteries react in milliseconds, not seconds',
    description: 'Battery storage systems like Tesla Megapack can inject or absorb power within milliseconds to stabilize grid frequency. Unlike generators that take seconds to respond, batteries provide instant frequency regulation through power electronics.',
    connection: 'The frequency droop you explored shows how generators slow under load. Batteries provide "synthetic inertia" by mimicking generator response curves electronically, but 10-100x faster than any spinning machine.',
    howItWorks: 'Grid-forming inverters measure frequency thousands of times per second. When frequency drops below 60 Hz, the battery instantly injects power. Smart algorithms predict frequency deviations and pre-emptively respond before problems develop.',
    stats: [
      { value: '<50 ms', label: 'Response time', icon: '⚡' },
      { value: '100 GW', label: 'Global capacity', icon: '🔋' },
      { value: '$15B/yr', label: 'Market value', icon: '💰' }
    ],
    examples: ['Hornsdale Power Reserve (Australia)', 'Moss Landing (California)', 'UK National Grid FFR', 'Germany frequency reserves'],
    companies: ['Tesla', 'Fluence', 'BYD', 'LG Energy Solution'],
    futureImpact: 'Long-duration storage using iron-air and flow batteries will provide not just frequency response but multi-day grid resilience during extreme weather events.',
    color: '#10B981'
  },
  {
    icon: '🌊',
    title: 'Renewable Integration',
    short: 'Managing frequency with variable wind and solar',
    tagline: 'When the sun sets, frequency management gets challenging',
    description: 'Solar and wind naturally provide no inertia like spinning generators. As renewables replace fossil plants, grids must find new sources of frequency stability or face more frequent blackouts and voltage instability.',
    connection: 'Traditional grids relied on kinetic energy in spinning generator rotors to resist frequency changes. Solar panels and basic wind turbines provide no equivalent - this is the core challenge of the energy transition.',
    howItWorks: 'Grid operators forecast renewable output, schedule conventional backup, deploy batteries for fast response, and use interconnections to import/export power. Advanced wind turbines now provide synthetic inertia by controlling rotor speed.',
    stats: [
      { value: '30%', label: 'Renewable share', icon: '☀️' },
      { value: '90%', label: '2050 target', icon: '🎯' },
      { value: '50%', label: 'Inertia reduction', icon: '📉' }
    ],
    examples: ['California duck curve', 'German Energiewende', 'Texas ERCOT challenges', 'Denmark 100% renewable days'],
    companies: ['Orsted', 'NextEra Energy', 'Iberdrola', 'Enel'],
    futureImpact: 'Grid-forming inverters will enable 100% renewable grids without any conventional generators, using software to create stable voltage and frequency.',
    color: '#3B82F6'
  },
  {
    icon: '🔄',
    title: 'Continental Interconnections',
    short: 'Synchronizing entire continents through massive links',
    tagline: 'One regions surplus is anothers salvation',
    description: 'AC interconnectors synchronize entire power grids - Europe operates as one synchronized system with over 500 GW capacity. HVDC links connect asynchronous grids, enabling power sharing across different frequency zones.',
    connection: 'Synchronized grids share inertia - when demand spikes in Germany, generators in Spain help stabilize frequency. The larger the synchronized system, the more stable the frequency response.',
    howItWorks: 'AC interconnectors require precise phase and frequency matching. HVDC converters decouple grids electrically while allowing controlled power flow. Back-to-back HVDC links connect different frequency systems (50 Hz Europe to 60 Hz UK).',
    stats: [
      { value: '500+ GW', label: 'European grid', icon: '⚡' },
      { value: '2 GW', label: 'UK-France link', icon: '🔗' },
      { value: '$100B', label: 'HVDC investment', icon: '💰' }
    ],
    examples: ['European continental grid', 'US Eastern/Western ties', 'Japan 50/60 Hz interface', 'Australia-Asia proposed link'],
    companies: ['Siemens Energy', 'ABB', 'Hitachi Energy', 'GE Grid Solutions'],
    futureImpact: 'Intercontinental supergrids will balance solar across time zones - morning sun in Asia powers evening demand in Europe, enabling 24/7 renewable energy.',
    color: '#8B5CF6'
  },
  {
    icon: '⏰',
    title: 'Electric Clocks & Time Standards',
    short: 'Why your oven clock drifts with grid frequency',
    tagline: 'Power grids are surprisingly accurate clocks',
    description: 'Many electrical clocks count AC cycles to keep time (60 cycles = 1 second at 60 Hz). Grid operators must ensure long-term frequency averages exactly 60 Hz, or millions of clocks gradually drift. This creates a fascinating link between power and time.',
    connection: 'The small frequency variations you observed - 59.95 Hz or 60.05 Hz - accumulate over hours. Grid operators track "time error" and deliberately run the grid slightly fast or slow to correct accumulated drift.',
    howItWorks: 'Synchronous clocks count zero-crossings of the AC waveform. At exactly 60 Hz, theyre perfectly accurate. If frequency averages 59.99 Hz for a day, clocks lose 14.4 seconds. Operators schedule time error corrections to compensate.',
    stats: [
      { value: '±30 sec', label: 'Max time error', icon: '⏱️' },
      { value: '3,600', label: 'Cycles/minute', icon: '🔄' },
      { value: 'Millions', label: 'Affected clocks', icon: '⏰' }
    ],
    examples: ['Kitchen oven clocks', 'Vintage alarm clocks', 'Industrial process timers', 'Traffic signal controllers'],
    companies: ['NERC', 'ENTSO-E', 'PJM', 'National Grid'],
    futureImpact: 'As synchronous motor clocks become rare, grid operators may eventually stop time error corrections, simplifying operations while ending a century-old tradition.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GridFrequencyRenderer: React.FC<GridFrequencyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [generationOutput, setGenerationOutput] = useState(50); // % of max
  const [loadDemand, setLoadDemand] = useState(40); // % of max
  const [systemInertia, setSystemInertia] = useState(50); // % - represents spinning mass
  const [frequency, setFrequency] = useState(60); // Hz
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - renewable scenario
  const [renewablePenetration, setRenewablePenetration] = useState(20); // %
  const [batteryResponse, setBatteryResponse] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Calculate frequency based on supply/demand/inertia
  useEffect(() => {
    const imbalance = generationOutput - loadDemand;
    // Higher inertia = slower frequency change
    const inertiaFactor = 0.5 + (systemInertia / 100) * 1.5; // 0.5 to 2.0
    // Battery compensation in twist phase
    let compensation = 0;
    if (batteryResponse && phase === 'twist_play') {
      compensation = -imbalance * 0.7; // Batteries compensate 70%
    }
    const effectiveImbalance = imbalance + compensation;
    // Frequency deviation: roughly 0.02 Hz per 1% imbalance, modulated by inertia
    const deviation = (effectiveImbalance * 0.02) / inertiaFactor;
    const newFreq = Math.max(57, Math.min(63, 60 + deviation));
    setFrequency(newFreq);
  }, [generationOutput, loadDemand, systemInertia, batteryResponse, phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6', // Electric blue
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
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
    twist_play: 'Twist Explore',
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
        gameType: 'grid-frequency',
        gameTitle: 'Grid Frequency Control',
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
  }, [phase, goToPhase, phaseOrder]);

  // Get frequency status
  const getFrequencyStatus = () => {
    if (frequency >= 59.95 && frequency <= 60.05) return { status: 'Normal', color: colors.success };
    if (frequency >= 59.5 && frequency <= 60.5) return { status: 'Warning', color: colors.warning };
    return { status: 'Critical', color: colors.error };
  };

  const freqStatus = getFrequencyStatus();

  // Grid Visualization SVG - render function (not sub-component)
  const renderGridVisualization = (isStatic = false, showRenewable = false) => {
    const width = 480;
    const height = 320;

    // Frequency wave parameters - use static 60Hz for predict phase
    const displayFreq = isStatic ? 60 : frequency;
    const wavelength = 60 / displayFreq * 40;
    const staticStatus = { status: 'Normal', color: colors.success };
    const displayStatus = isStatic ? staticStatus : freqStatus;

    // Wave center and amplitude - use >= 25% of SVG height for vertical space
    const waveCenter = 120;
    const waveAmplitude = 80; // 160px range = 50% of 320px height

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%', height: 'auto' }}
        role="img"
        aria-label="Grid frequency visualization"
       preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="freqWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={displayStatus.color} stopOpacity="0.8" />
            <stop offset="50%" stopColor={displayStatus.color} stopOpacity="1" />
            <stop offset="100%" stopColor={displayStatus.color} stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={`h-${frac}`}
            x1="50"
            y1={40 + frac * 200}
            x2={width - 20}
            y2={40 + frac * 200}
            stroke={colors.border}
            strokeDasharray="4 4"
            opacity="0.3"
          />
        ))}

        {/* Y-axis label */}
        <text x="12" y={waveCenter} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${waveCenter})`}>Frequency (Hz)</text>

        {/* X-axis label */}
        <text x={width / 2} y={height - 6} fill={colors.textMuted} fontSize="11" textAnchor="middle">Time (seconds)</text>

        {/* Frequency waveform */}
        <path
          d={(() => {
            let path = `M 50 ${waveCenter}`;
            for (let x = 0; x <= width - 70; x += 2) {
              const phaseVal = (x / wavelength + (isStatic ? 0 : animationFrame * 0.1)) * Math.PI * 2;
              const y = waveCenter + Math.sin(phaseVal) * waveAmplitude;
              path += ` L ${50 + x} ${y.toFixed(1)}`;
            }
            return path;
          })()}
          fill="none"
          stroke="url(#freqWaveGrad)"
          strokeWidth="3"
          filter="url(#glow)"
        />

        {/* 60 Hz reference line */}
        <line x1="50" y1={waveCenter} x2={width - 20} y2={waveCenter} stroke={colors.textMuted} strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
        <text x="120" y={waveCenter - 12} fill={colors.textMuted} fontSize="11">60 Hz Ref</text>

        {/* Interactive point showing frequency deviation */}
        <circle cx={width / 2} cy={waveCenter - ((displayFreq - 60) / 3) * waveAmplitude} r={8} fill={displayStatus.color} filter="url(#glow)" stroke="#fff" strokeWidth={2} />

        {/* Frequency display */}
        <rect x={width/2 - 60} y={height - 80} width="120" height="44" rx="8" fill={colors.bgSecondary} stroke={displayStatus.color} strokeWidth="2" />
        <text x={width/2} y={height - 52} textAnchor="middle" fill={displayStatus.color} fontSize="22" fontWeight="bold">
          {displayFreq.toFixed(2)} Hz
        </text>
        <text x={width/2} y={height - 38} textAnchor="middle" fill={displayStatus.color} fontSize="12">
          {displayStatus.status}
        </text>

        {/* Supply/Demand indicators */}
        <rect x="60" y={height - 26} width="80" height="18" rx="4" fill={colors.success + '33'} />
        <rect x="60" y={height - 26} width={generationOutput * 0.8} height="18" rx="4" fill={colors.success} />
        <text x="100" y={height - 13} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Gen: {generationOutput}%</text>
        <rect x={width - 140} y={height - 26} width="80" height="18" rx="4" fill={colors.error + '33'} />
        <rect x={width - 140} y={height - 26} width={loadDemand * 0.8} height="18" rx="4" fill={colors.error} />
        <text x={width - 100} y={height - 13} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Load: {loadDemand}%</text>

        {/* Inertia indicator (spinning generator icon) */}
        <g transform={`translate(${width - 55}, 55)`}>
          <circle cx="0" cy="0" r="22" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
          <circle cx="0" cy="0" r="17" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4,2" opacity="0.5" />
          <g style={{ transformOrigin: 'center', animation: `spin ${3 / (systemInertia / 50)}s linear infinite` }}>
            <line x1="-12" y1="0" x2="12" y2="0" stroke={colors.accent} strokeWidth="3" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke={colors.accent} strokeWidth="3" />
          </g>
          <text x="0" y="36" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Inertia: {systemInertia}%</text>
        </g>

        {/* Decorative power flow paths */}
        <path d="M 40 120 Q 45 110 50 120" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
        <path d={`M ${width - 30} 120 Q ${width - 25} 130 ${width - 20} 120`} fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.4" />

        {/* Formula annotation */}
        <text x="55" y={height - 90} fill={colors.textMuted} fontSize="11">f = P_gen / P_load × 60 Hz</text>

        {/* Renewable penetration indicator for twist phase */}
        {showRenewable && (
          <g>
            <text x={width - 55} y={height - 90} fill={colors.warning} fontSize="11" textAnchor="middle">Renewable: {renewablePenetration}%</text>
            <text x={width - 55} y={height - 106} fill={batteryResponse ? colors.success : colors.textMuted} fontSize="11" textAnchor="middle">{batteryResponse ? 'Battery: ON' : 'Battery: OFF'}</text>
          </g>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </svg>
    );
  };

  // Go to previous phase
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Navigation bar component - fixed top with z-index
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1000,
    }}>
      <button
        onClick={prevPhase}
        disabled={phase === 'hook'}
        style={{
          ...secondaryButtonStyle,
          opacity: phase === 'hook' ? 0.5 : 1,
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          padding: '8px 16px',
          minHeight: '44px',
        }}
      >
        ← Back
      </button>
      <span style={{ ...typo.small, color: '#e2e8f0' }}>Grid Frequency Control</span>
      <span style={{ ...typo.small, color: '#e2e8f0' }}>{phaseLabels[phase]}</span>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 999,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
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

  // Primary button style - 44px minimum touch target
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
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

  // Secondary button style - 44px minimum touch target
  const secondaryButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: '#e2e8f0',
    border: `1px solid ${colors.border}`,
    padding: isMobile ? '12px 20px' : '14px 24px',
    borderRadius: '10px',
    fontSize: isMobile ? '14px' : '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '80px',
          textAlign: 'center',
        }}>
          <p className="text-muted" style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Power Systems
          </p>

          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            ⚡🔌
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Grid Frequency Control
          </h1>

          <p style={{
            ...typo.body,
            color: '#e2e8f0',
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            When you flip on your AC, the entire power grid slows down by a tiny fraction. Why <span style={{ color: colors.accent }}>60 Hz matters</span> and how the grid keeps it stable is one of engineering&apos;s greatest achievements.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', fontStyle: 'italic' }}>
              The grid operates at exactly 60 Hz (or 50 Hz in Europe). Deviate too far, and blackouts cascade across entire regions. It&apos;s a constant balancing act happening millions of times per second.
            </p>
            <p style={{ ...typo.small, color: '#e2e8f0', marginTop: '8px' }}>
              — Power Systems Engineering
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore Grid Frequency →
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Frequency increases—more demand means faster spinning generators' },
      { id: 'b', text: 'Frequency decreases—the load acts like a brake on generators', correct: true },
      { id: 'c', text: 'Frequency stays exactly at 60 Hz—automatic controls prevent any change' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', paddingTop: '80px' }}>
          {/* Progress indicator */}
          <div style={{
            ...typo.small,
            color: '#e2e8f0',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            Step 1 of 2: Make your prediction
          </div>

          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            At 6 PM, millions of people arrive home and turn on their air conditioners simultaneously. What happens to grid frequency?
          </h2>

          {/* Static graphic visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderGridVisualization(true)}
          </div>

          {/* Options */}
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
                  color: prediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Grid Frequency Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Grid Frequency Simulator
          </h2>
          <p style={{ ...typo.body, color: '#e2e8f0', textAlign: 'center', marginBottom: '16px' }}>
            Balance generation and load to maintain 60 Hz. Adjust inertia to see its stabilizing effect.
            Grid frequency is defined as the rate of AC oscillation, calculated as f = P_generation / P_load × 60 Hz.
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              👀 <strong>Observe:</strong> Try adjusting the generation and load sliders. Watch how the frequency changes when supply and demand become unbalanced. Notice how higher inertia reduces the frequency swings.
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  {renderGridVisualization()}
                </div>

                {/* Status display */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: freqStatus.color }}>{frequency.toFixed(2)} Hz</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Frequency</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: generationOutput > loadDemand ? colors.success : generationOutput < loadDemand ? colors.error : colors.textPrimary
                    }}>
                      {generationOutput > loadDemand ? 'Surplus' : generationOutput < loadDemand ? 'Deficit' : 'Balanced'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Balance</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: freqStatus.color
                    }}>
                      {freqStatus.status}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
                  </div>
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Generation slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Generation Output</span>
                    <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{generationOutput}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={generationOutput}
                    onChange={(e) => setGenerationOutput(parseInt(e.target.value))}
                    onInput={(e) => setGenerationOutput(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, ${colors.success} ${((generationOutput - 20) / 60) * 100}%, ${colors.border} ${((generationOutput - 20) / 60) * 100}%)`,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Load slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Load Demand</span>
                    <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>{loadDemand}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={loadDemand}
                    onChange={(e) => setLoadDemand(parseInt(e.target.value))}
                    onInput={(e) => setLoadDemand(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, ${colors.error} ${((loadDemand - 20) / 60) * 100}%, ${colors.border} ${((loadDemand - 20) / 60) * 100}%)`,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Inertia slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>System Inertia</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{systemInertia}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={systemInertia}
                    onChange={(e) => setSystemInertia(parseInt(e.target.value))}
                    onInput={(e) => setSystemInertia(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, ${colors.accent} ${((systemInertia - 10) / 90) * 100}%, ${colors.border} ${((systemInertia - 10) / 90) * 100}%)`,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Low (Renewable)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>High (Fossil)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {Math.abs(generationOutput - loadDemand) <= 2 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🎯 Perfect balance! Notice how frequency stays near 60 Hz when generation matches load.
              </p>
            </div>
          )}

          {/* Real-world relevance */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Real-world relevance:</strong> Power grid operators monitor frequency 24/7 to maintain stability. In the real world, even a 0.5 Hz deviation can trigger emergency protocols affecting millions of homes and businesses.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
          >
            Understand the Physics →
          </button>
        </div>
        {renderNavDots()}
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionOptions: Record<string, string> = {
      'a': 'frequency increases',
      'b': 'frequency decreases (load acts as a brake)',
      'c': 'frequency stays exactly at 60 Hz',
    };
    const userPredictionText = prediction ? predictionOptions[prediction] : 'no prediction';
    const wasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', paddingTop: '80px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Frequency = Balance
          </h2>

          {/* Reference user's prediction */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect
                ? `Your prediction was correct! You predicted that ${userPredictionText}. When demand exceeds supply, generators slow down and frequency drops.`
                : `You predicted that ${userPredictionText}. Actually, when demand exceeds supply, the extra load acts as a brake on generators, causing frequency to decrease below 60 Hz.`
              }
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Generation = Load → 60 Hz Stable</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When <span style={{ color: colors.error }}>load exceeds generation</span>: Generators slow down, frequency drops below 60 Hz. This is dangerous—equipment malfunctions, motors run slower.
              </p>
              <p style={{ marginBottom: '16px' }}>
                When <span style={{ color: colors.success }}>generation exceeds load</span>: Generators speed up, frequency rises above 60 Hz. This can damage sensitive equipment.
              </p>
              <p>
                <span style={{ color: colors.accent, fontWeight: 600 }}>Inertia</span> from spinning generators resists sudden changes. More spinning mass = more stability. This is why renewable grids face new challenges.
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
              💡 Key Insight: Frequency Response Hierarchy
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Primary Response (0-30 sec):</strong> Generator inertia and droop control automatically stabilize frequency.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Secondary Response (30 sec - 10 min):</strong> Automatic Generation Control adjusts power plants.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong>Tertiary Response (10+ min):</strong> Operators dispatch additional generation or shed load.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Renewable Challenge →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Frequency becomes more stable—solar panels produce cleaner electricity' },
      { id: 'b', text: 'Frequency becomes less stable—solar provides no spinning inertia', correct: true },
      { id: 'c', text: 'No change—inverters perfectly replicate generator behavior' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', paddingTop: '80px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🌞 New Variable: Renewable Energy
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            As solar panels replace coal plants (80% renewable penetration), what happens to grid frequency stability?
          </h2>

          {/* Static graphic showing the scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderGridVisualization(true)}
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Renewable Grid →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            High-Renewable Grid Simulation
          </h2>
          <p style={{ ...typo.body, color: '#e2e8f0', textAlign: 'center', marginBottom: '16px' }}>
            See how battery storage provides synthetic inertia
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              👀 <strong>Observe:</strong> Increase renewable penetration and watch inertia drop. Toggle the battery to see how synthetic inertia stabilizes frequency even with high renewable penetration.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  {renderGridVisualization(false, true)}
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{systemInertia}%</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>System Inertia</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: freqStatus.color }}>{frequency.toFixed(2)} Hz</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Frequency</div>
                  </div>
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Renewable penetration slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Renewable Penetration</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{renewablePenetration}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={renewablePenetration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setRenewablePenetration(val);
                      setSystemInertia(Math.max(10, 100 - val));
                    }}
                    onInput={(e) => {
                      const val = parseInt((e.target as HTMLInputElement).value);
                      setRenewablePenetration(val);
                      setSystemInertia(Math.max(10, 100 - val));
                    }}
                    style={{
                      width: '100%',
                      height: '20px',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Load variation slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Sudden Load Change</span>
                    <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>{loadDemand}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={loadDemand}
                    onChange={(e) => setLoadDemand(parseInt(e.target.value))}
                    onInput={(e) => setLoadDemand(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      accentColor: '#3b82f6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Battery toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>No Battery</span>
                  <button
                    onClick={() => setBatteryResponse(!batteryResponse)}
                    style={{
                      width: '60px',
                      height: '30px',
                      borderRadius: '15px',
                      border: 'none',
                      background: batteryResponse ? colors.success : colors.border,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.3s',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: batteryResponse ? '33px' : '3px',
                      transition: 'left 0.3s',
                    }} />
                  </button>
                  <span style={{ ...typo.small, color: batteryResponse ? colors.success : colors.textSecondary, fontWeight: batteryResponse ? 600 : 400 }}>
                    Battery FFR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {batteryResponse && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🔋 Battery responds in milliseconds, providing synthetic inertia to stabilize frequency!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution →
          </button>
        </div>
        {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistPredictionOptions: Record<string, string> = {
      'a': 'frequency becomes more stable with solar',
      'b': 'frequency becomes less stable (no spinning inertia)',
      'c': 'no change with inverters',
    };
    const userTwistPredictionText = twistPrediction ? twistPredictionOptions[twistPrediction] : 'no prediction';
    const wasTwistCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', paddingTop: '80px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Future of Grid Stability
          </h2>

          {/* Reference user's twist prediction */}
          <div style={{
            background: wasTwistCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasTwistCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: wasTwistCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasTwistCorrect
                ? `Your prediction was correct! You predicted that ${userTwistPredictionText}. Solar panels provide no spinning mass, so high-renewable grids need synthetic inertia from batteries.`
                : `You predicted that ${userTwistPredictionText}. Actually, solar panels provide no spinning inertia, making the grid less stable without additional measures like battery storage.`
              }
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Synthetic Inertia</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Batteries and inverters can mimic spinning mass through fast power injection. Response time: <span style={{ color: colors.success }}>20-50 milliseconds</span> vs 2-10 seconds for gas turbines.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔌</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Grid-Forming Inverters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                New inverter technology can establish grid frequency independently, not just follow it. This enables <span style={{ color: colors.accent }}>100% inverter-based grids</span> without any synchronous generators.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Under-Frequency Load Shedding</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                As a last resort, automated systems disconnect non-critical loads when frequency drops below 59 Hz. This prevents total grid collapse by sacrificing some consumers to save the rest.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Grid Frequency"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', paddingTop: '80px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.small, color: '#e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Frequency Control Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for within-phase navigation - hidden when all apps completed */}
            {!allAppsCompleted && (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  if (selectedApp < realWorldApps.length - 1) {
                    setSelectedApp(selectedApp + 1);
                  }
                }}
                style={{ ...secondaryButtonStyle, width: '100%', marginTop: '16px' }}
              >
                Got It{selectedApp < realWorldApps.length - 1 ? ' - Next Application' : ''}
              </button>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}
        </div>

        {renderNavDots()}
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
          overflowY: 'auto',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', paddingTop: '80px', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand grid frequency control!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                style={primaryButtonStyle}
              >
                Review & Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', paddingTop: '80px' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} / 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
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

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
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
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next →
              </button>
            ) : showSubmitConfirm ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ ...typo.small, color: colors.warning, textAlign: 'center', margin: 0 }}>
                  Are you sure you want to submit your answers?
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Review Answers
                  </button>
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
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: colors.success,
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600,
                      minHeight: '44px',
                    }}
                  >
                    Confirm Submit
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (testAnswers.every(a => a !== null)) {
                    setShowSubmitConfirm(true);
                  }
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
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
        </div>

        {renderNavDots()}
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Grid Frequency Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how power grids maintain precise frequency and why it matters for modern electricity systems.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Frequency reflects real-time supply/demand balance',
              'Inertia from spinning generators resists changes',
              'Primary, secondary, and tertiary frequency response',
              'Why renewables create stability challenges',
              'How batteries provide synthetic inertia',
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default GridFrequencyRenderer;
