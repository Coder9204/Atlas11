'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Transformers - Complete 10-Phase Game
// Understanding electromagnetic induction and voltage transformation
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

interface TransformerRendererProps {
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
    scenario: "A student wraps two separate coils of wire around an iron ring and connects the primary coil to an AC power source. The secondary coil is not physically connected to the primary.",
    question: "What fundamental principle allows voltage to appear in the secondary coil?",
    options: [
      { id: 'a', label: "Electric current flows through the iron core from primary to secondary" },
      { id: 'b', label: "Electromagnetic induction - changing magnetic flux induces an EMF in the secondary", correct: true },
      { id: 'c', label: "Static electricity builds up and jumps across the gap" },
      { id: 'd', label: "The iron core acts as a conductor between the two coils" }
    ],
    explanation: "Electromagnetic induction is the core principle: AC current in the primary creates a changing magnetic field in the iron core. This changing magnetic flux passes through the secondary coil and, according to Faraday's Law, induces an electromotive force (EMF) - no physical connection needed!"
  },
  {
    scenario: "An engineer is designing a doorbell transformer. The wall outlet provides 120V AC, and the doorbell requires 12V AC to operate safely.",
    question: "If the primary coil has 500 turns, how many turns should the secondary coil have?",
    options: [
      { id: 'a', label: "5000 turns" },
      { id: 'b', label: "500 turns" },
      { id: 'c', label: "50 turns", correct: true },
      { id: 'd', label: "250 turns" }
    ],
    explanation: "Using the transformer equation V2/V1 = N2/N1, we get 12/120 = N2/500. Solving: N2 = 500 x (12/120) = 500 x 0.1 = 50 turns. The 10:1 voltage reduction requires a 10:1 turns ratio reduction."
  },
  {
    scenario: "A power plant generates electricity at 22,000V. Before transmission, the voltage is increased to 400,000V. At your neighborhood substation, it is reduced to 11,000V, then finally to 240V at the pole transformer.",
    question: "How many step-up and step-down transformers are used in this power delivery chain?",
    options: [
      { id: 'a', label: "1 step-up and 1 step-down transformer" },
      { id: 'b', label: "2 step-up and 1 step-down transformer" },
      { id: 'c', label: "1 step-up and 2 step-down transformers", correct: true },
      { id: 'd', label: "2 step-up and 2 step-down transformers" }
    ],
    explanation: "There is 1 step-up transformer (22kV to 400kV at the power plant) and 2 step-down transformers (400kV to 11kV at the substation, then 11kV to 240V at the pole). Step-up increases voltage; step-down decreases it."
  },
  {
    scenario: "A rural town is 50km from the nearest power plant. The transmission lines have a total resistance of 10 ohms. The town needs 1 MW of power. An engineer must choose between transmitting at 10,000V or 100,000V.",
    question: "Approximately how much power is lost as heat in the transmission lines at each voltage level?",
    options: [
      { id: 'a', label: "10,000V loses 100kW; 100,000V loses 10kW" },
      { id: 'b', label: "10,000V loses 1MW; 100,000V loses 10kW" },
      { id: 'c', label: "10,000V loses 100kW; 100,000V loses 1kW", correct: true },
      { id: 'd', label: "Both lose the same power because P = 1MW in both cases" }
    ],
    explanation: "Power loss = I^2 x R. At 10,000V: I = 1MW/10kV = 100A, so loss = 100^2 x 10 = 100kW. At 100,000V: I = 1MW/100kV = 10A, so loss = 10^2 x 10 = 1kW. Increasing voltage 10x reduces current 10x and losses 100x!"
  },
  {
    scenario: "A transformer manufacturer notices that their new high-frequency transformer runs much hotter than expected. The core is made from a solid block of iron instead of the usual laminated sheets.",
    question: "What is the primary cause of the excessive heat, and how do laminations help?",
    options: [
      { id: 'a', label: "Copper losses in the windings; laminations reduce wire resistance" },
      { id: 'b', label: "Eddy currents circulating in the solid core; laminations break up these current loops", correct: true },
      { id: 'c', label: "Air gaps in the core; laminations provide better magnetic contact" },
      { id: 'd', label: "Friction between magnetic domains; laminations act as lubricant layers" }
    ],
    explanation: "Eddy currents are loops of electric current induced within the core by the changing magnetic field. In a solid core, these currents flow freely and generate significant I^2R heat. Laminating the core (thin insulated sheets) forces eddy currents into smaller loops, dramatically reducing their magnitude and associated power loss."
  },
  {
    scenario: "Two identical 100kVA transformers are installed in parallel to share the load at a factory. Transformer A has 4% impedance and Transformer B has 6% impedance. The total load is 180kVA.",
    question: "How will the 180kVA load be shared between the two transformers?",
    options: [
      { id: 'a', label: "Each transformer carries 90kVA (equal sharing)" },
      { id: 'b', label: "Transformer A carries 108kVA, Transformer B carries 72kVA", correct: true },
      { id: 'c', label: "Transformer A carries 72kVA, Transformer B carries 108kVA" },
      { id: 'd', label: "All 180kVA flows through Transformer A because it has lower impedance" }
    ],
    explanation: "When transformers operate in parallel, they share load inversely proportional to their impedance. The ratio is 6:4 (or 3:2), so A carries 3/5 of load = 108kVA and B carries 2/5 = 72kVA. Lower impedance means the transformer 'accepts' more current - but not all of it."
  },
  {
    scenario: "A laboratory needs to reduce 240V to 220V for some imported European equipment. An engineer suggests using an auto-transformer instead of a conventional two-winding transformer rated at 5kVA.",
    question: "What is a key advantage of the auto-transformer in this application?",
    options: [
      { id: 'a', label: "It provides better electrical isolation between input and output" },
      { id: 'b', label: "It can handle the 5kVA load with much smaller and lighter construction", correct: true },
      { id: 'c', label: "It works with DC as well as AC power" },
      { id: 'd', label: "It completely eliminates core losses" }
    ],
    explanation: "An auto-transformer uses a single winding with a tap, so part of the power is conducted directly (not transformed). When the voltage ratio is close to 1:1 (like 240V to 220V), only a small fraction of power is actually transformed, allowing a much smaller core and winding. However, there is no electrical isolation between primary and secondary."
  },
  {
    scenario: "A factory receives three-phase power at 11kV and needs 400V for its machinery. The electrical contractor offers either a delta-wye or wye-wye transformer configuration.",
    question: "What is a significant advantage of the delta-wye configuration over wye-wye?",
    options: [
      { id: 'a', label: "Delta-wye uses less copper wire in the windings" },
      { id: 'b', label: "Delta-wye suppresses third harmonic currents and provides a neutral for single-phase loads", correct: true },
      { id: 'c', label: "Delta-wye allows the transformer to work with DC power" },
      { id: 'd', label: "Delta-wye eliminates the need for a grounding connection" }
    ],
    explanation: "Delta-wye is popular because the delta primary traps third harmonic currents (preventing them from distorting the supply), while the wye secondary provides a neutral point for supplying single-phase 230V loads alongside three-phase 400V loads."
  },
  {
    scenario: "A utility company is installing a 50MVA transformer at a major substation. The design team must choose between ONAN (oil natural, air natural) and OFAF (oil forced, air forced) cooling systems.",
    question: "Under what operating condition would OFAF cooling be essential?",
    options: [
      { id: 'a', label: "When the transformer operates at very light loads below 20% capacity" },
      { id: 'b', label: "When the transformer must handle sustained loads near or above rated capacity in hot climates", correct: true },
      { id: 'c', label: "When the transformer is only used for voltage regulation, not power transfer" },
      { id: 'd', label: "When the transformer is located underground with unlimited ventilation" }
    ],
    explanation: "OFAF (oil forced, air forced) uses pumps and fans to actively circulate cooling oil and air. This is essential when transformers operate at high loads for extended periods, especially in hot environments, because natural convection (ONAN) cannot remove heat fast enough."
  },
  {
    scenario: "A technician energizes a large distribution transformer by closing the circuit breaker. The protection relay detects a current spike of 8-12 times the rated current for about 100 milliseconds, but does not trip the breaker.",
    question: "What causes this temporary current spike, and why does the relay not trip?",
    options: [
      { id: 'a', label: "A short circuit in the secondary winding; the relay is faulty" },
      { id: 'b', label: "Magnetizing inrush current due to core saturation; relays are designed with time delays to allow for this", correct: true },
      { id: 'c', label: "Capacitor charging current from power factor correction; the relay ignores reactive current" },
      { id: 'd', label: "Eddy currents in the tank; the relay only monitors winding current" }
    ],
    explanation: "Magnetizing inrush current occurs when a transformer is energized and the core temporarily saturates due to residual magnetism and the point on the voltage wave at switching. This can cause currents 8-15x rated for a few cycles. Protection relays use harmonic restraint or time delays to distinguish inrush from actual faults."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '⚡',
    title: 'Power Grid Distribution',
    short: 'Delivering electricity across continents',
    tagline: 'The backbone of modern civilization',
    description: 'Transformers step voltage up to 400kV+ for long-distance transmission, then down through substations to 120/240V for homes. This system loses only 5% of energy over thousands of miles.',
    connection: 'The turns ratio determines voltage change: V2/V1 = N2/N1. Power companies use this to minimize I^2*R losses by transmitting at high voltage, low current.',
    howItWorks: 'Step-up transformers at power plants increase voltage 20x. High-voltage lines carry power with minimal current. Substations step down progressively until pole transformers deliver home voltage.',
    stats: [
      { value: '400kV', label: 'Transmission voltage', icon: '⚡' },
      { value: '5%', label: 'Grid power loss', icon: '📉' },
      { value: '$65B', label: 'US transformer market', icon: '💰' }
    ],
    examples: ['Grid substations', 'Pole transformers', 'Industrial power', 'HVDC converters'],
    companies: ['ABB', 'Siemens', 'GE', 'Hitachi Energy'],
    futureImpact: 'Smart transformers with solid-state power electronics will enable bidirectional flow for renewable integration.',
    color: '#F59E0B'
  },
  {
    icon: '📱',
    title: 'Device Chargers',
    short: 'Safely powering your electronics',
    tagline: 'From wall outlet to USB',
    description: 'Your phone charger contains a transformer or switching circuit that converts 120/240V AC to the 5-20V DC your devices need. Poor chargers can overheat or damage devices.',
    connection: 'The charger steps down voltage using the turns ratio, then rectifies AC to DC. USB-C PD chargers negotiate voltage with your device for optimal charging.',
    howItWorks: 'Switch-mode power supplies use high-frequency transformers that are much smaller than 60Hz versions. Feedback circuits regulate output voltage precisely.',
    stats: [
      { value: '5-240W', label: 'Charger power range', icon: '🔌' },
      { value: '90%+', label: 'Modern charger efficiency', icon: '📈' },
      { value: '100kHz+', label: 'Switching frequency', icon: '📊' }
    ],
    examples: ['Phone chargers', 'Laptop adapters', 'USB-C PD', 'Wireless chargers'],
    companies: ['Anker', 'Apple', 'Belkin', 'Samsung'],
    futureImpact: 'GaN transistors are enabling chargers half the size with better efficiency.',
    color: '#3B82F6'
  },
  {
    icon: '🔧',
    title: 'Welding Equipment',
    short: 'High current for melting metal',
    tagline: 'Voltage down, current up',
    description: 'Arc welders step down voltage to 20-40V while boosting current to 100-400A. The transformer inverts the power relationship, trading voltage for the current needed to melt steel.',
    connection: 'Conservation of power means V1*I1 = V2*I2. Stepping down voltage 6x multiplies current 6x, generating intense heat at the welding arc.',
    howItWorks: 'Heavy copper windings with few turns on the secondary carry massive current. Adjustable taps change the turns ratio for different welding settings. Modern inverter welders use high-frequency switching.',
    stats: [
      { value: '400A', label: 'Max welding current', icon: '⚡' },
      { value: '6000C', label: 'Arc temperature', icon: '🔥' },
      { value: '85%', label: 'Energy to heat', icon: '📊' }
    ],
    examples: ['Stick welding', 'MIG/MAG', 'TIG welding', 'Spot welding'],
    companies: ['Lincoln Electric', 'Miller', 'ESAB', 'Fronius'],
    futureImpact: 'AI-controlled welders will automatically adjust current based on real-time joint analysis.',
    color: '#EF4444'
  },
  {
    icon: '🎸',
    title: 'Audio Equipment',
    short: 'Powering sound with isolation',
    tagline: 'Clean power for pure audio',
    description: 'High-end audio uses transformers for power supply isolation and impedance matching. Tube amplifiers use output transformers to match high-impedance tubes to low-impedance speakers.',
    connection: 'Audio transformers block DC and common-mode noise while coupling the AC audio signal. Impedance transformation enables efficient power transfer.',
    howItWorks: 'Isolation transformers prevent ground loops that cause hum. Balanced audio uses transformers to reject interference. Output transformers in tube amps convert high-voltage/low-current to low-voltage/high-current for speakers.',
    stats: [
      { value: '600ohm', label: 'Pro audio impedance', icon: '🎤' },
      { value: '8ohm', label: 'Speaker impedance', icon: '🔊' },
      { value: '20Hz-20kHz', label: 'Audio bandwidth', icon: '🎵' }
    ],
    examples: ['Tube amplifiers', 'DI boxes', 'Microphone preamps', 'Isolation transformers'],
    companies: ['Jensen', 'Lundahl', 'Cinemag', 'Marshall'],
    futureImpact: 'Toroidal transformers with exotic core materials continue improving audio quality.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const TransformerRenderer: React.FC<TransformerRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [primaryTurns, setPrimaryTurns] = useState(100);
  const [secondaryTurns, setSecondaryTurns] = useState(200);
  const [inputVoltage, setInputVoltage] = useState(120);
  const [isAC, setIsAC] = useState(true);
  const [acPhase, setAcPhase] = useState(0);

  // Twist phase state
  const [twistMode, setTwistMode] = useState<'ac' | 'dc'>('ac');

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
// AC animation
  useEffect(() => {
    if (!isAC && phase !== 'twist_play') return;
    if (phase === 'twist_play' && twistMode === 'dc') return;

    const interval = setInterval(() => {
      setAcPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, [isAC, phase, twistMode]);

  // Calculated values
  const turnsRatio = secondaryTurns / primaryTurns;
  const outputVoltage = isAC ? inputVoltage * turnsRatio : 0;
  const inputCurrent = 1; // Assume 1A for display
  const outputCurrent = isAC ? inputCurrent / turnsRatio : 0;
  const transformerType = turnsRatio > 1 ? 'Step-Up' : turnsRatio < 1 ? 'Step-Down' : 'Isolation';

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
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
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
    twist_predict: 'Compare Variable',
    twist_play: 'Explore AC DC',
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
        gameType: 'transformer',
        gameTitle: 'Transformers',
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

  // Transformer Visualization
  const TransformerVisualization = ({ pTurns, sTurns, vIn, ac, animPhase: animP }: { pTurns: number; sTurns: number; vIn: number; ac: boolean; animPhase: number }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 320;
    const ratio = sTurns / pTurns;
    const vOut = ac ? vIn * ratio : 0;
    const currentIntensity = ac ? Math.abs(Math.sin(animP)) : 0;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ background: colors.bgCard, borderRadius: '12px' }} role="img" aria-label="Transformer visualization">
        <defs>
          <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="copperPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="copperSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <radialGradient id="fluxGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="activeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background spanning path - always visible, uses full height */}
        <path
          d={`M ${width * 0.42} ${height * 0.08} L ${width * 0.44} ${height * 0.92} L ${width * 0.46} ${height * 0.08} L ${width * 0.48} ${height * 0.92} L ${width * 0.50} ${height * 0.08} L ${width * 0.52} ${height * 0.92} L ${width * 0.54} ${height * 0.08} L ${width * 0.56} ${height * 0.92} L ${width * 0.58} ${height * 0.08} L ${width * 0.60} ${height * 0.5}`}
          fill="none"
          stroke={ac ? "#3b82f6" : "#374151"}
          strokeWidth="1"
          opacity="0.1"
        />

        {/* Title */}
        <text x={width/2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Transformer Circuit - {ac ? 'AC Input' : 'DC Input'}
        </text>

        {/* Axis labels and grid */}
        <text x="10" y="50" fill={colors.textSecondary} fontSize="11">Voltage (V)</text>
        <text x={width - 40} y={height - 10} fill={colors.textSecondary} fontSize="11">Time</text>
        <line x1="0" y1={height/2} x2={width} y2={height/2} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 2" opacity="0.3" />
        <line x1={width/2} y1="40" x2={width/2} y2={height - 70} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 2" opacity="0.3" />

        {/* Iron Core */}
        <rect x={width/2 - 80} y="45" width="160" height="140" rx="6" fill="url(#coreGrad)" stroke="#4b5563" strokeWidth="3" />
        <rect x={width/2 - 60} y="65" width="120" height="100" rx="4" fill={colors.bgPrimary} />
        <text x={width/2} y="42" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Iron Core</text>

        {/* Magnetic Flux (only when AC) */}
        {ac && (
          <g style={{ opacity: currentIntensity * 0.7 }}>
            <rect x={width/2 - 75} y="55" width="150" height="12" rx="2" fill="url(#fluxGlow)" />
            <rect x={width/2 - 75} y="163" width="150" height="12" rx="2" fill="url(#fluxGlow)" />
            <text x={width/2} y="115" textAnchor="middle" fill="#60a5fa" fontSize="11" opacity={currentIntensity}>
              Magnetic Flux
            </text>
          </g>
        )}

        {/* Primary Coil */}
        <g className="primary-coil">
          {[...Array(Math.min(Math.floor(pTurns / 15), 8))].map((_, i) => (
            <ellipse
              key={i}
              cx={width/2 - 55}
              cy={70 + i * 11}
              rx="18"
              ry="6"
              fill="none"
              stroke="url(#copperPrimary)"
              strokeWidth="4"
              style={{ opacity: ac ? 0.7 + currentIntensity * 0.3 : 0.4 }}
            />
          ))}
          <text x={width/2 - 55} y={170} textAnchor="middle" fill="#f87171" fontSize="11" fontWeight="600">Primary</text>
          <text x={width/2 - 55} y={184} textAnchor="middle" fill={colors.textSecondary} fontSize="11">{pTurns} turns</text>
        </g>

        {/* Secondary Coil */}
        <g className="secondary-coil">
          {[...Array(Math.min(Math.floor(sTurns / 15), 10))].map((_, i) => (
            <ellipse
              key={i}
              cx={width/2 + 55}
              cy={70 + i * 9}
              rx="18"
              ry="5"
              fill="none"
              stroke="url(#copperSecondary)"
              strokeWidth="3"
              style={{ opacity: ac && vOut > 0 ? 0.7 + currentIntensity * 0.3 : 0.4 }}
            />
          ))}
          <text x={width/2 + 55} y={170} textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="600">Secondary</text>
          <text x={width/2 + 55} y={184} textAnchor="middle" fill={colors.textSecondary} fontSize="11">{sTurns} turns</text>
        </g>

        {/* Input Panel */}
        <rect x="15" y="60" width="75" height="80" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
        <text x="52" y="75" textAnchor="middle" fill={colors.textSecondary} fontSize="11">INPUT</text>
        <text x="52" y="98" textAnchor="middle" fill="#f87171" fontSize="16" fontWeight="700" filter="url(#activeGlow)">{vIn}V</text>
        <text x="52" y="115" textAnchor="middle" fill={colors.textSecondary} fontSize="11">{ac ? 'AC ~' : 'DC ='}</text>
        <rect x="25" y="122" width="55" height="12" rx="3" fill={ac ? '#14532d' : '#450a0a'} />
        <text x="52" y="132" textAnchor="middle" fill={ac ? '#4ade80' : '#f87171'} fontSize="11" fontWeight="600">
          {ac ? 'ACTIVE' : 'DC MODE'}
        </text>

        {/* Output Panel */}
        <rect x={width - 90} y="60" width="75" height="80" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
        <text x={width - 52} y="75" textAnchor="middle" fill={colors.textSecondary} fontSize="11">OUTPUT</text>
        <text x={width - 52} y="98" textAnchor="middle" fill={vOut > 0 ? '#4ade80' : '#6b7280'} fontSize="16" fontWeight="700" filter={vOut > 0 ? "url(#activeGlow)" : undefined}>
          {vOut.toFixed(0)}V
        </text>
        <text x={width - 52} y="115" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          {vOut > 0 ? `${(inputCurrent / ratio).toFixed(2)}A` : 'No output'}
        </text>
        <rect x={width - 80} y="122" width="55" height="12" rx="3" fill={vOut > 0 ? '#14532d' : '#450a0a'} />
        <text x={width - 52} y="132" textAnchor="middle" fill={vOut > 0 ? '#4ade80' : '#f87171'} fontSize="11" fontWeight="600">
          {vOut > 0 ? 'ACTIVE' : 'NO OUTPUT'}
        </text>

        {/* Waveforms */}
        <rect x="15" y={height - 65} width="75" height="40" rx="4" fill={colors.bgPrimary} stroke={colors.border} strokeWidth="1" />
        <text x="52" y={height - 65 + 12} textAnchor="middle" fill={colors.textSecondary} fontSize="11">Input Wave</text>
        {ac ? (
          <polyline
            points={[...Array(10)].map((_, i) => `${23 + i * 6},${height - 40 + Math.sin(animP + i * 0.8) * 8}`).join(' ')}
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
          />
        ) : (
          <line x1="23" y1={height - 40} x2="83" y2={height - 40} stroke="#6b7280" strokeWidth="2" strokeDasharray="4 2" />
        )}

        <rect x={width - 90} y={height - 65} width="75" height="40" rx="4" fill={colors.bgPrimary} stroke={colors.border} strokeWidth="1" />
        <text x={width - 52} y={height - 65 + 12} textAnchor="middle" fill={colors.textSecondary} fontSize="11">Output Wave</text>
        {ac && vOut > 0 ? (
          <polyline
            points={[...Array(10)].map((_, i) => `${width - 82 + i * 6},${height - 40 + Math.sin(animP + i * 0.8) * 8 * Math.min(ratio, 1.5)}`).join(' ')}
            fill="none"
            stroke="#4ade80"
            strokeWidth="2"
          />
        ) : (
          <line x1={width - 82} y1={height - 40} x2={width - 22} y2={height - 40} stroke="#374151" strokeWidth="2" strokeDasharray="4 2" />
        )}

        {/* Transformer Type Badge */}
        <rect x={width/2 - 50} y={height - 60} width="100" height="42" rx="6" fill={colors.bgSecondary} stroke={ratio > 1 ? '#22c55e' : ratio < 1 ? '#f97316' : '#3b82f6'} strokeWidth="2" />
        <text x={width/2} y={height - 46} textAnchor="middle" fill={colors.textSecondary} fontSize="11">Type</text>
        <text x={width/2} y={height - 24} textAnchor="middle" fill={ratio > 1 ? '#4ade80' : ratio < 1 ? '#fb923c' : '#60a5fa'} fontSize="11" fontWeight="700">
          {ratio > 1 ? 'STEP-UP' : ratio < 1 ? 'STEP-DOWN' : 'ISOLATION'}
        </text>

        {/* Turns Ratio */}
        <text x={width/2} y={height - 8} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">
          Ratio: {ratio.toFixed(2)}:1
        </text>

        {/* AC waveform indicator (full height span) */}
        {ac && (
          <path
            d={`M ${width * 0.08} ${height * 0.5} L ${width * 0.12} ${height * 0.1} L ${width * 0.16} ${height * 0.9} L ${width * 0.20} ${height * 0.1} L ${width * 0.24} ${height * 0.9} L ${width * 0.28} ${height * 0.5}`}
            fill="none"
            stroke="#f87171"
            strokeWidth="1.5"
            opacity={0.15 + currentIntensity * 0.15}
          />
        )}
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Bottom navigation bar
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestActive = phase === 'test' && !testSubmitted;
    const isNextDisabled = currentIndex === phaseOrder.length - 1 || isTestActive;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        zIndex: 100,
      }}>
        <button
          onClick={() => { if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]); }}
          disabled={currentIndex === 0}
          aria-label="Back"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex === 0 ? colors.textMuted : colors.textSecondary,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: currentIndex === 0 ? 0.4 : 1,
            minHeight: '44px',
          }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                minHeight: '44px',
                width: phase === p ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => { if (!isNextDisabled) nextPhase(); }}
          disabled={isNextDisabled}
          aria-label="Next"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: isNextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #D97706)`,
            color: 'white',
            cursor: isNextDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isNextDisabled ? 0.4 : 1,
            minHeight: '44px',
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // Global styles for sliders
  const sliderStyles = `
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(90deg, ${colors.border}, ${colors.accent});
      outline: none;
      touch-action: pan-y;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${colors.accent};
      cursor: pointer;
      box-shadow: 0 2px 8px ${colors.accentGlow};
    }
    input[type="range"]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${colors.accent};
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 8px ${colors.accentGlow};
    }
  `;

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '60px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        <style>{sliderStyles}</style>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🔌
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Transformers
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do power lines carry <span style={{ color: colors.accent }}>400,000 volts</span> when your home only uses <span style={{ color: colors.success }}>120 volts</span>? The answer lies in one of the most important inventions of the electrical age."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "If you tried to send household current through long transmission lines, the wires would glow red hot! Transformers make modern power grids possible by trading voltage for current."
          </p>
          <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>
            - The War of Currents: Tesla vs Edison
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover How Transformers Work
        </button>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Output voltage is halved' },
      { id: 'b', text: 'Output voltage stays the same' },
      { id: 'c', text: 'Output voltage doubles', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
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
            A transformer has two coils wound around an iron core. If the secondary coil has TWICE as many turns as the primary, what happens to the output voltage?
          </h2>

          {/* Static SVG diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <svg width={isMobile ? 340 : 480} height={isMobile ? 200 : 240} viewBox="0 0 480 240" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="predictCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6b7280" />
                  <stop offset="50%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>
              </defs>

              {/* Title */}
              <text x="240" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
                Transformer with 100 → 200 Turns
              </text>

              {/* Axes labels */}
              <text x="10" y="50" fill={colors.textMuted} fontSize="11">Turns</text>
              <text x="450" y="230" fill={colors.textMuted} fontSize="11">Ratio</text>

              {/* Iron Core */}
              <rect x="190" y="80" width="100" height="100" rx="6" fill="url(#predictCoreGrad)" stroke="#4b5563" strokeWidth="2" />
              <rect x="205" y="95" width="70" height="70" rx="4" fill={colors.bgPrimary} />
              <text x="240" y="70" textAnchor="middle" fill={colors.textMuted} fontSize="11">Iron Core</text>

              {/* Primary Coil */}
              <g transform="translate(210, 100)">
                {[...Array(6)].map((_, i) => (
                  <ellipse key={i} cx="0" cy={i * 10} rx="14" ry="5" fill="none" stroke="#f87171" strokeWidth="3" />
                ))}
                <text x="0" y="75" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">Primary</text>
                <text x="0" y="88" textAnchor="middle" fill={colors.textMuted} fontSize="11">100 turns</text>
              </g>

              {/* Secondary Coil */}
              <g transform="translate(270, 100)">
                {[...Array(8)].map((_, i) => (
                  <ellipse key={i} cx="0" cy={i * 8} rx="14" ry="4" fill="none" stroke="#4ade80" strokeWidth="2.5" />
                ))}
                <text x="0" y="75" textAnchor="middle" fill="#4ade80" fontSize="12" fontWeight="600">Secondary</text>
                <text x="0" y="88" textAnchor="middle" fill={colors.textMuted} fontSize="11">200 turns</text>
              </g>

              {/* Input/Output labels */}
              <text x="120" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="12">V₁ →</text>
              <text x="360" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="12">→ V₂ = ?</text>

              {/* Ratio indicator */}
              <rect x="180" y="205" width="120" height="25" rx="6" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
              <text x="240" y="222" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">Ratio: 2:1</text>
            </svg>
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

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Transformer Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust the turns on each coil to see how voltage transforms.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <TransformerVisualization
                    pTurns={primaryTurns}
                    sTurns={secondaryTurns}
                    vIn={inputVoltage}
                    ac={isAC}
                    animPhase={acPhase}
                  />
                </div>

                {/* Formula display */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  border: `1px solid ${colors.accent}44`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Transformer Equation:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', color: colors.accent, fontWeight: 600 }}>
                    V₂/V₁ = N₂/N₁
                  </div>
                </div>

                {/* Stats display */}
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
                    filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{turnsRatio.toFixed(2)}:1</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Turns Ratio</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))',
                  }}>
                    <div style={{ ...typo.h3, color: colors.success }}>{outputVoltage.toFixed(0)}V</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Output Voltage</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: turnsRatio > 1 ? '#4ade80' : '#fb923c' }}>{transformerType}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Type</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Primary turns slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#f87171' }}>Primary Turns</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{primaryTurns}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={primaryTurns}
                    onChange={(e) => setPrimaryTurns(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', cursor: 'pointer', WebkitAppearance: 'none' as const, touchAction: 'pan-y', accentColor: '#3b82f6' }}
                  />
                </div>

                {/* Secondary turns slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#4ade80' }}>Secondary Turns</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{secondaryTurns}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="400"
                    step="10"
                    value={secondaryTurns}
                    onChange={(e) => setSecondaryTurns(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', cursor: 'pointer', WebkitAppearance: 'none' as const, touchAction: 'pan-y', accentColor: '#3b82f6' }}
                  />
                </div>

                {/* Input voltage slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Input Voltage</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{inputVoltage}V</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="240"
                    step="12"
                    value={inputVoltage}
                    onChange={(e) => setInputVoltage(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', cursor: 'pointer', WebkitAppearance: 'none' as const, touchAction: 'pan-y', accentColor: '#3b82f6' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px',
          }}>
            <div style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '4px' }}>
              What to observe:
            </div>
            <div style={{ ...typo.small, color: colors.textSecondary }}>
              Watch how changing the turns ratio affects output voltage. Notice the magnetic flux animation and how power is conserved (voltage up, current down).
            </div>
          </div>

          {/* Discovery prompt */}
          {turnsRatio > 1.5 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                ✓ More secondary turns = higher output voltage! This is a step-up transformer.
              </p>
            </div>
          )}

          {/* Why it matters */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>
              💡 Why This Matters
            </h3>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Power grids use step-up transformers to send electricity at 400,000V across continents with minimal losses, then step-down transformers bring it to 120V for your home. Without transformers, modern civilization wouldn't exist!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
          </div>
        </div>

        {renderBottomNav()}
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
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Transformers
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Faraday's Law of Electromagnetic Induction</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                AC current in the primary coil creates a <span style={{ color: '#60a5fa' }}>changing magnetic field</span> in the iron core. This changing flux passes through the secondary coil and induces a voltage!
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Transformer Equation:</strong>
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: '18px',
                color: colors.accent,
              }}>
                V2 / V1 = N2 / N1
              </div>
              <p style={{ marginTop: '16px', ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
                Output voltage / Input voltage = Secondary turns / Primary turns
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
              Key Insight: Power Conservation
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Power in = Power out (ideal transformer). If voltage goes UP, current goes DOWN:
            </p>
            <div style={{
              background: colors.bgSecondary,
              padding: '12px',
              borderRadius: '8px',
              marginTop: '12px',
              textAlign: 'center',
              fontFamily: 'monospace',
              color: colors.textPrimary,
            }}>
              V1 x I1 = V2 x I2
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
              You cannot create free energy - just trade voltage for current!
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h4 style={{ color: colors.success, marginBottom: '8px' }}>Step-Up</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                More secondary turns = Higher voltage, lower current. Used for power transmission.
              </p>
            </div>
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Step-Down</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Fewer secondary turns = Lower voltage, higher current. Used for chargers, doorbells.
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              As you observed in the experiment, your prediction was: <span style={{ color: prediction === 'c' ? colors.success : colors.warning, fontWeight: 600 }}>
                {prediction === 'c' ? '✓ Correct! Doubling secondary turns doubles output voltage.' : '✗ Doubling secondary turns doubles the output voltage (not halved or same).'}
              </span> The result confirms our experiment observations.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            But What About DC?
          </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The transformer works normally with DC' },
      { id: 'b', text: 'The output voltage is doubled' },
      { id: 'c', text: 'No output voltage - DC creates a static field with no induction', correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: AC vs DC
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens if you connect a battery (DC) to the primary coil of a transformer?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="320" height="160" viewBox="0 0 320 160" style={{ borderRadius: '8px', background: colors.bgPrimary }} preserveAspectRatio="xMidYMid meet">
              {/* Background spanning path for AC vs DC comparison */}
              <path
                d={`M 20 ${160 * 0.1} L 40 ${160 * 0.9} L 60 ${160 * 0.1} L 80 ${160 * 0.9} L 100 ${160 * 0.1} L 120 ${160 * 0.9} L 140 ${160 * 0.1} L 160 ${160 * 0.9} L 180 ${160 * 0.1} L 200 ${160 * 0.5}`}
                fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.15"
              />
              {/* AC waveform label */}
              <text x="160" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">AC vs DC Input</text>
              {/* AC wave */}
              <text x="30" y="50" textAnchor="middle" fill="#f87171" fontSize="11">AC</text>
              <path
                d={`M 60 ${80} L 80 ${40} L 100 ${80} L 120 ${120} L 140 ${80} L 160 ${40} L 180 ${80}`}
                fill="none" stroke="#f87171" strokeWidth="2"
              />
              <text x="200" y="84" fill="#f87171" fontSize="11">~oscillates</text>
              {/* DC line */}
              <text x="30" y="130" textAnchor="middle" fill="#60a5fa" fontSize="11">DC</text>
              <line x1="60" y1="130" x2="180" y2="130" stroke="#60a5fa" strokeWidth="2" />
              <text x="200" y="134" fill="#60a5fa" fontSize="11">=constant</text>
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
              See What Happens
            </button>
          )}
          </div>
        </div>

        {renderBottomNav()}
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
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            AC vs DC: The Critical Difference
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle between AC and DC to see why transformers need AC
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <TransformerVisualization
                    pTurns={100}
                    sTurns={200}
                    vIn={120}
                    ac={twistMode === 'ac'}
                    animPhase={acPhase}
                  />
                </div>

                {/* Formula display */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  border: `1px solid ${colors.accent}44`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Transformer Equation:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', color: colors.accent, fontWeight: 600 }}>
                    V₂/V₁ = N₂/N₁
                  </div>
                </div>

                {/* Explanation */}
                <div style={{
                  background: twistMode === 'ac' ? `${colors.success}22` : `${colors.error}22`,
                  border: `1px solid ${twistMode === 'ac' ? colors.success : colors.error}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  {twistMode === 'ac' ? (
                    <div style={{ color: colors.success }}>
                      <p style={{ fontWeight: 700, marginBottom: '8px' }}>AC: Constantly changing current = changing magnetic flux = induced EMF!</p>
                      <p style={{ ...typo.small }}>Output: 240V AC (step-up working perfectly)</p>
                    </div>
                  ) : (
                    <div style={{ color: colors.error }}>
                      <p style={{ fontWeight: 700, marginBottom: '8px' }}>DC: Constant current = STATIC magnetic flux = NO induction!</p>
                      <p style={{ ...typo.small }}>Output: 0V (nothing happens after the initial moment)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* AC/DC Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                  <button
                    onClick={() => { playSound('click'); setTwistMode('ac'); }}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '10px',
                      border: 'none',
                      background: twistMode === 'ac' ? colors.success : colors.bgSecondary,
                      color: twistMode === 'ac' ? 'white' : colors.textSecondary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    AC Input ~
                  </button>
                  <button
                    onClick={() => { playSound('click'); setTwistMode('dc'); }}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '10px',
                      border: 'none',
                      background: twistMode === 'dc' ? colors.error : colors.bgSecondary,
                      color: twistMode === 'dc' ? 'white' : colors.textSecondary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    DC Input =
                  </button>
                </div>

                {/* Observation guidance */}
                <div style={{
                  background: `${colors.accent}11`,
                  border: `1px solid ${colors.accent}33`,
                  borderRadius: '12px',
                  padding: '14px',
                }}>
                  <div style={{ ...typo.small, color: colors.accent, fontWeight: 600, marginBottom: '4px' }}>
                    What to observe:
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>
                    Toggle between AC and DC. Watch the magnetic flux animation appear/disappear and observe the output voltage change. DC creates static flux with no induction!
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Why This Matters
          </button>
          </div>
        </div>

        {renderBottomNav()}
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
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why AC Won the War of Currents
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Tesla vs Edison (1880s)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Edison promoted DC while Tesla/Westinghouse championed AC. <span style={{ color: colors.accent }}>AC won because transformers work!</span> You can step voltage up for efficient transmission, then down for safe use.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>P</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Power Loss = I^2 x R</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                If you step up voltage 1000x, current drops 1000x, and power loss drops by <span style={{ color: colors.success }}>1,000,000x</span>! This is why high-voltage transmission is so efficient.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Grid</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Modern Power Grid</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Power plants generate at ~22kV, step up to 400kV for transmission, then step down through substations (11kV) and pole transformers (240V) to your home. Only ~5% of power is lost over thousands of miles!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Transformer"
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

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
                How Transformers Connect:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>How It Works:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>Real-World Examples:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.examples.join(' • ')}</p>
            </div>

            <div style={{ background: `${app.color}11`, borderRadius: '8px', padding: '16px', marginBottom: '16px', border: `1px solid ${app.color}33` }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>Future Impact:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.futureImpact}</p>
            </div>

            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%', marginTop: '4px' }}
              >
                Got It - Continue
              </button>
            )}
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
          </div>
        </div>

        {renderBottomNav()}
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
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '16px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand transformers and electromagnetic induction!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
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
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
            </div>
          </div>
          {renderBottomNav()}
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
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '16px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
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
                Previous
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
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          </div>
        </div>

        {renderBottomNav()}
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
        textAlign: 'center',
      }}>
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
          Transformer Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand electromagnetic induction and how transformers make our power grid possible.
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
              'Voltage ratio = turns ratio (V2/V1 = N2/N1)',
              'Transformers require AC (changing flux)',
              'Power is conserved: V1 x I1 = V2 x I2',
              'High voltage transmission reduces losses',
              'Step-up vs step-down applications',
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default TransformerRenderer;
