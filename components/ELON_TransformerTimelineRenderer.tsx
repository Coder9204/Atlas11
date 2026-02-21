'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// TRANSFORMER TIMELINE - Complete 10-Phase Game (#4 of 36)
// Voltage transformation across the grid — why we step up to 765kV for
// transmission and down to 120V for homes
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

interface ELON_TransformerTimelineRendererProps {
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
    scenario: "A power plant generates electricity at 13.8kV. Engineers need to transmit 1000MW of power over 500 miles to a distant city.",
    question: "Why do they step up the voltage to 765kV before transmission?",
    options: [
      { id: 'a', label: "Higher voltage means lower current, so I\u00B2R losses drop dramatically", correct: true },
      { id: 'b', label: "Higher voltage makes the electrons move faster" },
      { id: 'c', label: "It is a legal requirement set by the government" },
      { id: 'd', label: "Higher voltage makes the wires thinner" }
    ],
    explanation: "P = IV, so raising V lowers I for the same power. Since losses = I\u00B2R, halving the current cuts losses to one quarter. At 765kV vs 13.8kV, current drops ~55x, and losses drop ~3000x."
  },
  {
    scenario: "A transformer has 100 turns on the primary coil and 1000 turns on the secondary coil. The input voltage is 120V AC.",
    question: "What is the output voltage?",
    options: [
      { id: 'a', label: "1,200V — the turns ratio multiplies the voltage", correct: true },
      { id: 'b', label: "12V — the turns ratio divides the voltage" },
      { id: 'c', label: "120V — transformers don't change voltage" },
      { id: 'd', label: "12,000V — voltage is squared" }
    ],
    explanation: "V_out/V_in = N_out/N_in. So V_out = 120V x (1000/100) = 1,200V. This is a step-up transformer with a 10:1 turns ratio."
  },
  {
    scenario: "Two identical transmission lines carry the same 500MW of power. Line A operates at 345kV and Line B at 765kV.",
    question: "How do the I\u00B2R losses compare?",
    options: [
      { id: 'a', label: "Line B loses about 1/5 the power of Line A", correct: true },
      { id: 'b', label: "Both lines lose the same power" },
      { id: 'c', label: "Line A loses less because lower voltage is safer" },
      { id: 'd', label: "Line B loses twice as much" }
    ],
    explanation: "I = P/V. Line A: I = 500MW/345kV = 1449A. Line B: I = 500MW/765kV = 654A. Loss ratio = (654/1449)\u00B2 = 0.204, so Line B loses about 1/5 as much."
  },
  {
    scenario: "At very high voltages (above ~500kV), the electric field around conductors becomes strong enough to ionize the surrounding air.",
    question: "What is this phenomenon called and what does it cause?",
    options: [
      { id: 'a', label: "Corona discharge — it wastes energy as light, heat, and radio noise", correct: true },
      { id: 'b', label: "Lightning — it creates dangerous bolts" },
      { id: 'c', label: "Induction — it creates magnetic fields" },
      { id: 'd', label: "Resistance — it heats the wire" }
    ],
    explanation: "Corona discharge creates a violet glow, audible hum, and ozone. It's a real power loss mechanism at UHV. Bundle conductors (multiple wires per phase) reduce the surface electric field to minimize corona."
  },
  {
    scenario: "AC current tends to flow near the surface of conductors rather than through the entire cross-section.",
    question: "What is this called and how does it affect transmission?",
    options: [
      { id: 'a', label: "Skin effect — it increases effective resistance at high frequencies", correct: true },
      { id: 'b', label: "Surface tension — it makes wires stronger" },
      { id: 'c', label: "Ohm's law — it reduces current" },
      { id: 'd', label: "Capacitance — it stores energy" }
    ],
    explanation: "At 60Hz, the skin depth in aluminum is about 11mm. For large conductors, the center carries almost no current. This is why ACSR conductors have a steel core (for strength) with aluminum strands on the outside (for current)."
  },
  {
    scenario: "China's Three Gorges Dam sends power 2,080km to Shanghai using 800kV UHVDC (Ultra-High Voltage DC) instead of AC.",
    question: "Why is DC preferred over AC for very long distances?",
    options: [
      { id: 'a', label: "DC has no reactive power losses, no skin effect, and needs only 2 conductors", correct: true },
      { id: 'b', label: "DC is cheaper to generate" },
      { id: 'c', label: "DC travels faster through wires" },
      { id: 'd', label: "DC is safer than AC" }
    ],
    explanation: "AC lines have capacitive and inductive reactive losses that increase with distance. Beyond ~600km, HVDC is more economical despite the expensive converter stations at each end. DC also uses 2 wires vs 3 for AC."
  },
  {
    scenario: "A pole-mounted distribution transformer serves a residential neighborhood. It steps down 13,200V to 240/120V.",
    question: "What is the approximate turns ratio of this transformer?",
    options: [
      { id: 'a', label: "About 55:1 for the 240V output (110:1 for 120V)", correct: true },
      { id: 'b', label: "About 10:1" },
      { id: 'c', label: "About 1000:1" },
      { id: 'd', label: "About 5:1" }
    ],
    explanation: "Turns ratio = V_primary/V_secondary = 13,200/240 = 55. The secondary has a center tap, giving two 120V legs (or 240V across both). This is a split-phase system used in North American homes."
  },
  {
    scenario: "Submarine power cables connecting offshore wind farms to shore face unique challenges compared to overhead lines.",
    question: "What limits the practical length of AC submarine cables?",
    options: [
      { id: 'a', label: "Capacitive charging current — the cable acts like a huge capacitor", correct: true },
      { id: 'b', label: "Water pressure crushes the cable" },
      { id: 'c', label: "Sharks bite through the insulation" },
      { id: 'd', label: "Salt water conducts and shorts the cable" }
    ],
    explanation: "Submarine cables have insulation between the conductor and seawater sheath, creating enormous capacitance. The charging current (I_c = 2\u03C0fCV) can consume the entire cable capacity at ~80km for AC. HVDC eliminates this, enabling 600km+ links."
  },
  {
    scenario: "A Tesla Supercharger station converts grid AC power to high-voltage DC to charge vehicle batteries rapidly at up to 250kW.",
    question: "Why does fast charging use high voltage DC (up to 900V) rather than AC?",
    options: [
      { id: 'a', label: "DC goes directly into the battery; higher V means lower I and less cable heating", correct: true },
      { id: 'b', label: "DC charges batteries faster because it pushes harder" },
      { id: 'c', label: "AC would damage the battery chemistry" },
      { id: 'd', label: "DC is always more efficient than AC" }
    ],
    explanation: "Batteries store DC. At 250kW and 400V, current = 625A (enormous cables needed). At 900V, current = 278A — much more manageable. The charger contains a powerful AC-DC converter (rectifier) and DC-DC converter."
  },
  {
    scenario: "The US power grid operates at 60Hz AC, while most of Europe and Asia use 50Hz. Some regions interconnect using HVDC ties.",
    question: "Why can't two grids at different frequencies simply be connected with AC?",
    options: [
      { id: 'a', label: "Different frequencies would cause destructive interference and equipment damage", correct: true },
      { id: 'b', label: "They can — frequency doesn't matter" },
      { id: 'c', label: "The wires would melt from excess current" },
      { id: 'd', label: "Different frequencies cancel each other out completely" }
    ],
    explanation: "Connecting unsynchronized AC grids creates enormous circulating currents as the voltage waveforms fight each other. HVDC back-to-back converters solve this by converting AC\u2192DC\u2192AC, acting as a frequency-independent bridge."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F3D7}\uFE0F',
    title: 'Three Gorges Dam 800kV UHVDC',
    short: 'World\'s longest UHVDC transmission line',
    tagline: 'Powering Shanghai from 2,080km away',
    description: 'The Three Gorges-Shanghai UHVDC line transmits 6,400MW at 800kV DC over 2,080km with less than 3.5% loss. This single line replaces what would require five 500kV AC lines, saving billions in infrastructure and land use. The converter stations at each end use thousands of thyristors to convert between AC and DC.',
    connection: 'P_loss = I\u00B2R = P\u00B2R/V\u00B2. By using 800kV DC, current drops to 8,000A (vs 40,000A+ at lower voltages), cutting I\u00B2R losses by over 25x.',
    howItWorks: 'Mercury-arc valves (original) or thyristor valves convert AC to DC at the dam, transmit via 2 conductors, then convert back to AC at Shanghai.',
    stats: [
      { value: '800kV', label: 'DC voltage', icon: '\u26A1' },
      { value: '2,080km', label: 'Line length', icon: '\u{1F4CF}' },
      { value: '<3.5%', label: 'Total loss', icon: '\u{1F4C9}' }
    ],
    examples: ['Three Gorges to Shanghai', 'Xiangjiaba to Shanghai', 'Belo Monte to Rio (Brazil)', 'NorNed cable (Norway-Netherlands)'],
    companies: ['State Grid Corporation of China', 'ABB', 'Siemens Energy', 'NARI Group'],
    futureImpact: 'UHVDC at 1,100kV is now operational in China, enabling transcontinental renewable energy corridors.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F30A}',
    title: 'Submarine Cable to Offshore Wind',
    short: 'Connecting sea-based wind farms to land grids',
    tagline: 'Harvesting wind power from deep water',
    description: 'Offshore wind farms use submarine cables to deliver power to shore. AC cables work up to about 80km, beyond which capacitive charging current consumes the cable\'s capacity. For longer distances, HVDC submarine cables at 525kV can span 600km+ with 96% efficiency. The Dogger Bank wind farm in the North Sea will use 320kV HVDC export cables.',
    connection: 'Submarine cables have enormous capacitance (insulation between conductor and seawater). Charging current I_c = 2\u03C0fCV grows with frequency and length, making DC essential for long runs.',
    howItWorks: 'Offshore converter platforms convert wind turbine AC to HVDC, transmit via submarine cable, then convert back to grid AC onshore.',
    stats: [
      { value: '~80km', label: 'AC cable limit', icon: '\u{1F4CF}' },
      { value: '525kV', label: 'HVDC rating', icon: '\u26A1' },
      { value: '96%', label: 'Efficiency', icon: '\u{1F4CA}' }
    ],
    examples: ['Dogger Bank (UK)', 'Hornsea 2 (UK)', 'BorWin clusters (Germany)', 'Vineyard Wind (USA)'],
    companies: ['Prysmian Group', 'Nexans', 'NKT', 'Sumitomo Electric'],
    futureImpact: 'Superconducting submarine cables could eliminate losses entirely, enabling floating wind farms hundreds of km offshore.',
    color: '#06B6D4'
  },
  {
    icon: '\u26A1',
    title: 'Tesla Supercharger Network',
    short: 'Ultra-fast EV charging via voltage transformation',
    tagline: 'From grid AC to battery DC in milliseconds',
    description: 'Tesla Superchargers convert medium-voltage grid AC (typically 480V three-phase) to high-voltage DC (up to 900V) for rapid battery charging at 250kW per stall. V3 Superchargers use liquid-cooled cables to handle the enormous currents. The voltage must be carefully matched to the battery pack voltage, which varies from 350V to 900V depending on state of charge.',
    connection: 'P = IV. At 250kW: 400V needs 625A (thick cables, lots of heat), but 900V needs only 278A. Higher voltage means thinner cables and less I\u00B2R loss in the charging cable itself.',
    howItWorks: 'Grid AC \u2192 rectifier \u2192 DC bus \u2192 DC-DC converter \u2192 battery. The DC-DC converter precisely controls voltage and current for safe, fast charging.',
    stats: [
      { value: '480\u2192900V', label: 'Voltage conversion', icon: '\u{1F50C}' },
      { value: '250kW', label: 'Per stall', icon: '\u26A1' },
      { value: '15min', label: '0\u201380% charge', icon: '\u23F1\uFE0F' }
    ],
    examples: ['Tesla V3 Supercharger', 'Tesla V4 Supercharger', 'Tesla Megacharger (Semi)', 'Destination chargers'],
    companies: ['Tesla', 'ABB E-mobility', 'ChargePoint', 'Tritium'],
    futureImpact: 'Megawatt-level charging (3MW+) for electric trucks and aircraft will require even higher voltages (up to 1500V DC).',
    color: '#10B981'
  },
  {
    icon: '\u{1F4E1}',
    title: 'SpaceX Starlink Ground Station',
    short: 'Powering satellite internet infrastructure',
    tagline: 'Precision power for global connectivity',
    description: 'Each Starlink ground station consumes about 100kW to power phased-array antennas, cooling systems, and compute hardware. The station converts grid AC to a 48V DC bus that distributes power internally. Uninterruptible power supplies (UPS) with battery backup ensure 99.9% uptime. The 48V bus standard minimizes I\u00B2R losses while staying below the 60V safety threshold.',
    connection: '48V DC is the sweet spot: low enough to be safe (below 60V touch-safe threshold), high enough that I = P/V keeps currents manageable for the ~100kW load.',
    howItWorks: 'Grid AC \u2192 UPS \u2192 rectifier \u2192 48V DC bus \u2192 point-of-load converters step down to 12V, 5V, 3.3V for individual subsystems.',
    stats: [
      { value: '100kW', label: 'Per station', icon: '\u{1F50B}' },
      { value: '48V', label: 'DC bus voltage', icon: '\u26A1' },
      { value: '99.9%', label: 'Uptime', icon: '\u{1F4F6}' }
    ],
    examples: ['Starlink gateways', 'Telecom base stations', 'Data center power', 'Cell tower power systems'],
    companies: ['SpaceX', 'Delta Electronics', 'Vertiv', 'Eltek'],
    futureImpact: 'Solar-powered ground stations with on-site battery storage will make Starlink infrastructure fully energy-independent.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_TransformerTimelineRenderer: React.FC<ELON_TransformerTimelineRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [transmissionVoltage, setTransmissionVoltage] = useState(345);
  const [distance, setDistance] = useState(100);
  const [selectedStage, setSelectedStage] = useState(0);

  // Twist phase state
  const [twistDistance, setTwistDistance] = useState(500);
  const [twistVoltage, setTwistVoltage] = useState(765);
  const [useHVDC, setUseHVDC] = useState(false);

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
// Grid stages for visualization
  const gridStages = [
    { name: 'Generator', voltage: 13.8, unit: 'kV', color: '#22c55e' },
    { name: 'Step-Up Transformer', voltage: 345, unit: 'kV', color: '#F97316' },
    { name: 'HV Transmission', voltage: 345, unit: 'kV', color: '#EF4444' },
    { name: 'Step-Down Substation', voltage: 69, unit: 'kV', color: '#F59E0B' },
    { name: 'Distribution', voltage: 13.2, unit: 'kV', color: '#3B82F6' },
    { name: 'Pole Transformer', voltage: 0.24, unit: 'kV', color: '#8B5CF6' },
    { name: 'Home', voltage: 0.12, unit: 'kV', color: '#10B981' },
  ];

  // Calculate transmission losses: P_loss = P^2 * R / V^2
  // R = resistivity * distance / area; simplified model
  const calculateLossPercent = (voltageKV: number, distanceMi: number, powerMW: number = 1000) => {
    // Simplified model: resistance per mile ~ 0.04 ohms for typical ACSR conductor
    const resistancePerMile = 0.04;
    const totalResistance = resistancePerMile * distanceMi;
    const voltageV = voltageKV * 1000;
    const powerW = powerMW * 1e6;
    const current = powerW / voltageV;
    const lossW = current * current * totalResistance;
    const lossPercent = (lossW / powerW) * 100;
    return Math.min(lossPercent, 100);
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
    textMuted: '#a8b8c8',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'transformer-timeline',
        gameTitle: 'Transformer Timeline',
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

  // Current loss calculations
  const lossPercent = calculateLossPercent(transmissionVoltage, distance);
  const lowVoltageLoss = calculateLossPercent(13.8, distance);

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
        background: `linear-gradient(90deg, ${colors.accent}, #EF4444)`,
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
    background: `linear-gradient(135deg, ${colors.accent}, #EF4444)`,
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
  // Transmission Path SVG Visualization (complexity >= 15 elements)
  // -------------------------------------------------------------------------
  const TransmissionVisualization = () => {
    const width = isMobile ? 340 : 560;
    const height = 380;
    const voltageNorm = (transmissionVoltage - 69) / (765 - 69);
    const currentLoss = calculateLossPercent(transmissionVoltage, distance);
    const heatGlow = Math.min(1, currentLoss / 30);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Transformer Timeline visualization">
        <defs>
          {/* Voltage gradient - low to high */}
          <linearGradient id="voltGradLow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="voltGradHigh" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="voltGradDown" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a2e" />
            <stop offset="100%" stopColor="#12121a" />
          </linearGradient>
          {/* Heat glow filter */}
          <filter id="heatGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={2 + heatGlow * 4} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="towerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#skyGrad)" rx="12" />

        {/* Grid lines */}
        <line x1="30" y1="40" x2={width - 30} y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="280" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Transmission Path: Generator to Home
        </text>

        {/* Ground line */}
        <line x1="20" y1="200" x2={width - 20} y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* === GENERATOR (left) === */}
        <g>
          <rect x="25" y="155" width="40" height="40" rx="4" fill="#22c55e" opacity="0.8" />
          <text x="45" y="178" fill="white" fontSize="11" fontWeight="700" textAnchor="middle">GEN</text>
          <text x="45" y="215" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="600">13.8kV</text>
          <circle cx="45" cy="148" r="5" fill="#22c55e" opacity="0.8" />
        </g>

        {/* === STEP-UP TRANSFORMER === */}
        <g>
          <path d={`M 65 175 L 85 175`} stroke="#22c55e" strokeWidth="2" />
          <rect x="85" y="155" width="35" height="40" rx="3" fill="#F97316" opacity="0.9" />
          <text x="102" y="170" fill="white" fontSize="11" fontWeight="700" textAnchor="middle">STEP</text>
          <text x="102" y="185" fill="white" fontSize="11" fontWeight="700" textAnchor="middle">UP</text>
          <text x="102" y="215" fill="#F97316" fontSize="11" textAnchor="middle" fontWeight="600">{transmissionVoltage}kV</text>
          <circle cx="102" cy="148" r="5" fill="#F97316" opacity="0.8" />
        </g>

        {/* === HV TRANSMISSION LINES (with heat glow showing losses) === */}
        <g>
          {/* Main transmission line */}
          <path
            d={`M 120 165 L ${width / 2 - 30} 60 L ${width / 2 + 30} 60 L ${width - 160} 165`}
            stroke={currentLoss > 20 ? '#EF4444' : currentLoss > 10 ? '#F59E0B' : '#F97316'}
            strokeWidth="3"
            fill="none"
            filter="url(#heatGlow)"
            opacity={0.9}
          />
          {/* Tower 1 */}
          <line x1={width / 2 - 50} y1="55" x2={width / 2 - 50} y2="200" stroke="#6b7280" strokeWidth="2" />
          <line x1={width / 2 - 65} y1="70" x2={width / 2 - 35} y2="70" stroke="#6b7280" strokeWidth="2" />
          <circle cx={width / 2 - 50} cy="53" r="5" fill={colors.accent} opacity="0.8" />
          {/* Tower 2 */}
          <line x1={width / 2 + 50} y1="55" x2={width / 2 + 50} y2="200" stroke="#6b7280" strokeWidth="2" />
          <line x1={width / 2 + 35} y1="70" x2={width / 2 + 65} y2="70" stroke="#6b7280" strokeWidth="2" />
          <circle cx={width / 2 + 50} cy="53" r="5" fill={colors.accent} opacity="0.8" />
          {/* Distance label */}
          <text x={width / 2} y="48" fill="#cbd5e1" fontSize="11" textAnchor="middle">{distance} miles</text>
          {/* Loss heat indicator */}
          {currentLoss > 5 && (
            <text x={width / 2} y="85" fill={currentLoss > 20 ? '#EF4444' : '#F59E0B'} fontSize="11" textAnchor="middle" fontWeight="600">
              {currentLoss.toFixed(1)}% loss as heat
            </text>
          )}
        </g>

        {/* === STEP-DOWN SUBSTATION === */}
        <g>
          <rect x={width - 160} y="150" width="44" height="44" rx="3" fill="#F59E0B" opacity="0.9" />
          <text x={width - 138} y="176" fill="white" fontSize="11" fontWeight="700" textAnchor="middle">SUB</text>
          <text x={width - 138} y="228" fill="#F59E0B" fontSize="11" textAnchor="middle" fontWeight="600">69kV</text>
          <circle cx={width - 138} cy="142" r="5" fill="#F59E0B" opacity="0.8" />
        </g>

        {/* === DISTRIBUTION LINE === */}
        <g>
          <path d={`M ${width - 116} 172 L ${width - 106} 172`} stroke="#3B82F6" strokeWidth="2" />
          <rect x={width - 106} y="155" width="36" height="34" rx="3" fill="#3B82F6" opacity="0.8" />
          <text x={width - 88} y="176" fill="white" fontSize="11" fontWeight="600" textAnchor="middle">DIST</text>
          <text x={width - 88} y="248" fill="#3B82F6" fontSize="11" textAnchor="middle" fontWeight="600">13.2kV</text>
        </g>

        {/* === POLE TRANSFORMER === */}
        <g>
          <path d={`M ${width - 70} 172 L ${width - 60} 172`} stroke="#8B5CF6" strokeWidth="1.5" />
          <rect x={width - 60} y="158" width="26" height="28" rx="2" fill="#8B5CF6" opacity="0.8" />
          <text x={width - 47} y="176" fill="white" fontSize="11" fontWeight="600" textAnchor="middle">XF</text>
          <text x={width - 47} y="268" fill="#8B5CF6" fontSize="11" textAnchor="middle" fontWeight="600">240V</text>
        </g>

        {/* === HOME === */}
        <g>
          <path d={`M ${width - 34} 172 L ${width - 28} 172`} stroke="#10B981" strokeWidth="1.5" />
          {/* House shape */}
          <polygon points={`${width - 32},175 ${width - 22},165 ${width - 12},175`} fill="#10B981" opacity="0.8" />
          <rect x={width - 29} y="175" width="14" height="14" rx="1" fill="#10B981" opacity="0.6" />
          <text x={width - 22} y="288" fill="#10B981" fontSize="11" textAnchor="middle" fontWeight="600">120V</text>
          <circle cx={width - 22} cy="157" r="5" fill="#10B981" opacity="0.8" />
        </g>

        {/* === LOSS BAR (bottom section) === */}
        <g>
          <text x={width / 2} y="240" fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">
            Transmission Loss at {transmissionVoltage}kV
          </text>
          <rect x="40" y="248" width={width - 80} height="14" rx="7" fill={colors.border} />
          <rect
            x="40"
            y="248"
            width={Math.max(2, (width - 80) * Math.min(1, currentLoss / 100))}
            height="14"
            rx="7"
            fill="url(#lossGrad)"
            filter={currentLoss > 20 ? 'url(#heatGlow)' : undefined}
          />
          <circle
            cx={40 + (width - 80) * Math.min(1, currentLoss / 100)}
            cy="255"
            r="8"
            fill={currentLoss > 20 ? colors.error : currentLoss > 10 ? colors.warning : colors.success}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#towerGlow)"
          />
          <text x={width / 2} y="280" fill={currentLoss > 20 ? colors.error : currentLoss > 10 ? colors.warning : colors.success} fontSize="12" fontWeight="700" textAnchor="middle">
            {currentLoss.toFixed(1)}% power lost
          </text>
        </g>

        {/* Comparison text */}
        <g>
          <text x={width / 2} y="300" fill="#94a3b8" fontSize="11" textAnchor="middle">
            At generator voltage (13.8kV): {lowVoltageLoss > 100 ? '>100' : lowVoltageLoss.toFixed(1)}% loss
          </text>
        </g>

        {/* Formula */}
        <rect x={width / 2 - 130} y={height - 60} width="260" height="22" rx="4" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.3)" />
        <text x={width / 2} y={height - 44} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          P_loss = I\u00B2R = P\u00B2R / V\u00B2
        </text>

        {/* Legend */}
        <g>
          <circle cx={50} cy={height - 18} r="4" fill="#22c55e" />
          <text x={60} y={height - 14} fill="#94a3b8" fontSize="11">Gen</text>
          <circle cx={100} cy={height - 18} r="4" fill="#F97316" />
          <text x={110} y={height - 14} fill="#94a3b8" fontSize="11">HV</text>
          <circle cx={145} cy={height - 18} r="4" fill="#3B82F6" />
          <text x={155} y={height - 14} fill="#94a3b8" fontSize="11">Dist</text>
          <circle cx={195} cy={height - 18} r="4" fill="#10B981" />
          <text x={205} y={height - 14} fill="#94a3b8" fontSize="11">Home</text>
          <rect x={245} y={height - 22} width="12" height="8" rx="2" fill="url(#lossGrad)" />
          <text x={262} y={height - 14} fill="#94a3b8" fontSize="11">Loss</text>
        </g>
      </svg>
    );
  };

  // -------------------------------------------------------------------------
  // HVDC Twist Visualization
  // -------------------------------------------------------------------------
  const HVDCVisualization = () => {
    const width = isMobile ? 340 : 560;
    const height = 320;
    const acLoss = calculateLossPercent(twistVoltage, twistDistance);
    // HVDC model: ~30% less loss than AC at same voltage due to no reactive losses
    const dcLoss = calculateLossPercent(twistVoltage, twistDistance) * 0.65;
    const displayLoss = useHVDC ? dcLoss : acLoss;
    const criticalThreshold = 15;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="acLossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="dcLossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter id="dcGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={24} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          AC vs HVDC at {twistDistance} miles
        </text>

        {/* Grid */}
        <line x1="40" y1="50" x2={width - 40} y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
        <line x1="40" y1="110" x2={width - 40} y2="110" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />

        {/* AC bar */}
        <text x="50" y="52" fill="#F59E0B" fontSize="11" fontWeight="600">AC Line</text>
        <rect x="50" y="58" width={width - 100} height="18" rx="9" fill={colors.border} />
        <rect x="50" y="58" width={Math.max(2, (width - 100) * Math.min(1, acLoss / 50))} height="18" rx="9" fill="url(#acLossGrad)" />
        <text x={width - 45} y="72" fill="#F59E0B" fontSize="11" fontWeight="700" textAnchor="end">{acLoss.toFixed(1)}%</text>
        <circle cx={50 + (width - 100) * Math.min(1, acLoss / 50)} cy="67" r="7" fill="#F59E0B" stroke="white" strokeWidth="1.5" filter="url(#dcGlow)" />

        {/* DC bar */}
        <text x="50" y="108" fill="#3B82F6" fontSize="11" fontWeight="600">HVDC Line</text>
        <rect x="50" y="114" width={width - 100} height="18" rx="9" fill={colors.border} />
        <rect x="50" y="114" width={Math.max(2, (width - 100) * Math.min(1, dcLoss / 50))} height="18" rx="9" fill="url(#dcLossGrad)" />
        <text x={width - 45} y="128" fill="#3B82F6" fontSize="11" fontWeight="700" textAnchor="end">{dcLoss.toFixed(1)}%</text>
        <circle cx={50 + (width - 100) * Math.min(1, dcLoss / 50)} cy="123" r="7" fill="#3B82F6" stroke="white" strokeWidth="1.5" filter="url(#dcGlow)" />

        {/* Savings */}
        <rect x={width / 2 - 100} y="148" width="200" height="24" rx="12" fill={useHVDC ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)'} stroke={useHVDC ? 'rgba(16,185,129,0.4)' : 'rgba(249,115,22,0.4)'} />
        <text x={width / 2} y="164" fill={useHVDC ? colors.success : colors.accent} fontSize="11" fontWeight="700" textAnchor="middle">
          {useHVDC ? `HVDC saves ${(acLoss - dcLoss).toFixed(1)}% loss` : `Current: AC at ${acLoss.toFixed(1)}% loss`}
        </text>

        {/* Distance curve showing where HVDC becomes better */}
        <text x={width / 2} y="195" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="600">
          Loss vs Distance (at {twistVoltage}kV)
        </text>
        {/* Compute max loss for adaptive scaling */}
        {(() => {
          const maxAcLoss = calculateLossPercent(twistVoltage, 500);
          const curveHeight = 130;
          const scaleFactor = maxAcLoss > 0 ? curveHeight / maxAcLoss : 1;
          return (
            <>
              {/* AC curve */}
              <path
                d={`M 50 290 ${Array.from({length: 10}, (_, i) => {
                  const d = 50 + i * 50;
                  const loss = calculateLossPercent(twistVoltage, d);
                  const x = 50 + ((width - 100) / 9) * i;
                  const y = 290 - loss * scaleFactor;
                  return `L ${x} ${y}`;
                }).join(' ')}`}
                stroke="#F59E0B"
                fill="none"
                strokeWidth="2"
                opacity="0.7"
              />
              {/* DC curve */}
              <path
                d={`M 50 290 ${Array.from({length: 10}, (_, i) => {
                  const d = 50 + i * 50;
                  const loss = calculateLossPercent(twistVoltage, d) * 0.65;
                  const x = 50 + ((width - 100) / 9) * i;
                  const y = 290 - loss * scaleFactor;
                  return `L ${x} ${y}`;
                }).join(' ')}`}
                stroke="#3B82F6"
                fill="none"
                strokeWidth="2"
                opacity="0.7"
              />
              {/* Current position marker */}
              <circle
                cx={50 + ((width - 100) / 500) * twistDistance}
                cy={290 - displayLoss * scaleFactor}
                r="8"
                fill={useHVDC ? '#3B82F6' : '#F59E0B'}
                stroke="white"
                strokeWidth="2"
                filter="url(#dcGlow)"
              />
            </>
          );
        })()}

        {/* Axis labels */}
        <text x="50" y={height - 8} fill="#94a3b8" fontSize="11">50mi</text>
        <text x={width - 50} y={height - 8} fill="#94a3b8" fontSize="11" textAnchor="end">500mi</text>
        <text x={width / 2} y={height - 8} fill="#94a3b8" fontSize="11" textAnchor="middle">Distance</text>

        {/* Legend */}
        <line x1="50" y1={height - 22} x2="70" y2={height - 22} stroke="#F59E0B" strokeWidth="2" />
        <text x="75" y={height - 18} fill="#94a3b8" fontSize="11">AC</text>
        <line x1="110" y1={height - 22} x2="130" y2={height - 22} stroke="#3B82F6" strokeWidth="2" />
        <text x="135" y={height - 18} fill="#94a3b8" fontSize="11">HVDC</text>
        <circle cx="175" cy={height - 22} r="4" fill={useHVDC ? '#3B82F6' : '#F59E0B'} />
        <text x="184" y={height - 18} fill="#94a3b8" fontSize="11">Current</text>
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
            {'\u26A1\uD83D\uDD04'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Transformer Timeline
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"\"Electricity leaves the power plant at 13,800 volts. By the time it reaches those giant towers, it's been "}
            <span style={{ color: colors.accent }}>boosted to 765,000 volts</span>
            {" \u2014 enough to arc across 6 feet of air. Why do we take this dangerous step? Because the alternative wastes almost all the power as heat.\""}
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
              {'"The transformer is the unsung hero of the electrical grid. Without it, you\'d need a power plant on every block. With it, a single plant can serve a million homes hundreds of miles away."'}
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Power Systems Engineering
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
      { id: 'a', text: 'About 5% \u2014 wires are pretty good conductors' },
      { id: 'b', text: 'About 25% \u2014 significant but manageable' },
      { id: 'c', text: 'Over 90% \u2014 almost all of it would be lost as heat' },
      { id: 'd', text: 'Zero \u2014 wires are perfect conductors' },
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
              A power plant generates at 13.8kV. If we transmitted at this voltage over 500 miles, what fraction of power would be lost?
            </h2>

            {/* Static SVG showing the question */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictGenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <linearGradient id="predictLossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Power Plant to City: 500 miles at 13.8kV</text>
                {/* Generator */}
                <rect x="30" y="50" width="60" height="40" rx="6" fill="url(#predictGenGrad)" />
                <text x="60" y="75" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">13.8kV</text>
                {/* Long wire */}
                <line x1="90" y1="70" x2="310" y2="70" stroke="#F97316" strokeWidth="3" strokeDasharray="8,4" />
                <text x="200" y="60" textAnchor="middle" fill="#F59E0B" fontSize="11">500 miles of wire</text>
                {/* City */}
                <rect x="310" y="50" width="60" height="40" rx="6" fill="#3B82F6" opacity="0.5" />
                <text x="340" y="75" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">??? kW</text>
                {/* Heat arrows */}
                <text x="150" y="105" textAnchor="middle" fill="#EF4444" fontSize="20">{'\u{1F525}'}</text>
                <text x="200" y="105" textAnchor="middle" fill="#EF4444" fontSize="20">{'\u{1F525}'}</text>
                <text x="250" y="105" textAnchor="middle" fill="#EF4444" fontSize="20">{'\u{1F525}'}</text>
                <text x="200" y="130" textAnchor="middle" fill="#EF4444" fontSize="11" fontWeight="600">Heat losses = I{'\u00B2'}R</text>
                <text x="200" y="165" textAnchor="middle" fill="#94a3b8" fontSize="11">How much power actually reaches the city?</text>
                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">P_loss = P{'\u00B2'} x R / V{'\u00B2'}</text>
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

  // PLAY PHASE - Interactive Transmission Path Visualizer
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
              Transmission Path Visualizer
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> About 5% of all electricity generated in the US is lost during transmission. Raising voltage dramatically cuts these losses because P_loss = I{'\u00B2'}R = P{'\u00B2'}R/V{'\u00B2'}. Doubling voltage cuts losses to one quarter.
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
                <strong style={{ color: colors.textPrimary }}>Transformer</strong> is a device that changes AC voltage using electromagnetic induction. Turns ratio determines the voltage change: V_out/V_in = N_out/N_in.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>I{'\u00B2'}R Losses</strong> refer to power dissipated as heat in transmission lines. Since P = IV, higher voltage means lower current for the same power, and losses drop as current squared.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: '#EF4444' }}>Transmission Voltage</strong> ranges from 69kV (sub-transmission) to 765kV (extra-high voltage). Higher is more efficient but more expensive infrastructure.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Adjust the transmission voltage slider and watch how losses change. The visualization shows the complete path from generator to your home, with heat glow indicating where power is wasted.
            </p>

            {/* Side-by-side layout */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <TransmissionVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Grid stage selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Grid Stage</span>
                      <span style={{ ...typo.small, color: gridStages[selectedStage].color, fontWeight: 600 }}>
                        {gridStages[selectedStage].name} ({gridStages[selectedStage].voltage}{gridStages[selectedStage].unit})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {gridStages.map((stage, i) => (
                        <button
                          key={stage.name}
                          onClick={() => { playSound('click'); setSelectedStage(i); }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: selectedStage === i ? `2px solid ${stage.color}` : `1px solid ${colors.border}`,
                            background: selectedStage === i ? `${stage.color}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '12px',
                            minHeight: '44px',
                          }}
                        >
                          {stage.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transmission Voltage slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Transmission Voltage</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {transmissionVoltage} kV
                      </span>
                    </div>
                    <input
                      type="range"
                      min="69"
                      max="765"
                      step="1"
                      value={transmissionVoltage}
                      onChange={(e) => setTransmissionVoltage(parseInt(e.target.value))}
                      onInput={(e) => setTransmissionVoltage(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Transmission Voltage"
                      style={sliderStyle(colors.accent, transmissionVoltage, 69, 765)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>69kV</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>345kV</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>765kV</span>
                    </div>
                  </div>

                  {/* Distance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Distance</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                        {distance} miles
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={distance}
                      onChange={(e) => setDistance(parseInt(e.target.value))}
                      onInput={(e) => setDistance(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Distance"
                      style={sliderStyle(colors.warning, distance, 10, 500)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>10 mi</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>250 mi</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500 mi</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{transmissionVoltage}kV</div>
                      <div style={{ ...typo.small, color: colors.textSecondary }}>Voltage</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: lossPercent > 20 ? colors.error : lossPercent > 10 ? colors.warning : colors.success }}>
                        {lossPercent.toFixed(1)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textSecondary }}>Power Lost</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>
                        {(1000 / (transmissionVoltage * 1000)).toFixed(1)}A
                      </div>
                      <div style={{ ...typo.small, color: colors.textSecondary }}>Current (1GW)</div>
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
              Understand the Physics
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
              The Physics of Voltage Transformation
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! At 13.8kV over 500 miles, the current is enormous and I\u00B2R losses consume virtually all the power. This is exactly why we step up to hundreds of thousands of volts.'
                : 'As you observed in the experiment, transmitting at low voltage over long distances is catastrophically wasteful. The I\u00B2R relationship means losses scale with the square of the current.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>P_loss = I{'\u00B2'}R = P{'\u00B2'}R / V{'\u00B2'}</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Power loss equals the <span style={{ color: '#EF4444' }}>current squared</span> times <span style={{ color: colors.warning }}>resistance</span>. Since P = IV, we can substitute I = P/V, giving P_loss = P{'\u00B2'}R/V{'\u00B2'}. This means <span style={{ color: colors.accent }}>doubling voltage cuts losses to one quarter</span>.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  At 13.8kV: I = 1GW/13.8kV = 72,464A {'\u2192'} Massive losses<br />
                  At 765kV: I = 1GW/765kV = 1,307A {'\u2192'} <strong>Losses drop ~3,000x</strong>
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
                How Transformers Work
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                A transformer uses two coils wound around an iron core. AC current in the primary coil creates a changing magnetic field that induces voltage in the secondary coil. The voltage ratio equals the turns ratio: V_out/V_in = N_secondary/N_primary. Energy is conserved, so when voltage goes up, current goes down proportionally.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                The Voltage Journey
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                {gridStages.map(stage => (
                  <div key={stage.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    borderTop: `3px solid ${stage.color}`,
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, fontSize: '12px' }}>{stage.name}</div>
                    <div style={{ ...typo.h3, color: stage.color }}>{stage.voltage >= 1 ? `${stage.voltage}kV` : `${stage.voltage * 1000}V`}</div>
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
      { id: 'a', text: 'Thicker wires \u2014 more copper means less resistance' },
      { id: 'b', text: 'HVDC \u2014 converting to DC eliminates reactive losses and skin effect' },
      { id: 'c', text: 'Higher frequency AC \u2014 faster oscillation means more power' },
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
                New Variable: Distance Doubles
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              At 500 miles, even 765kV AC has significant losses from reactive power, skin effect, and capacitance. What technology solves this?
            </h2>

            {/* Static SVG showing the challenge */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistWarnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="700">500 Miles at 765kV AC</text>
                <rect x="30" y="40" width="340" height="30" rx="6" fill="url(#twistWarnGrad)" opacity="0.7" />
                <text x="200" y="60" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Reactive losses + Skin effect + Capacitance</text>
                <text x="200" y="95" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">AC has hidden losses that grow with distance...</text>
                <text x="200" y="120" textAnchor="middle" fill="#94a3b8" fontSize="11">What technology can overcome this at extreme distances?</text>
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
                Explore HVDC
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - AC vs HVDC Comparison
  if (phase === 'twist_play') {
    const acLoss = calculateLossPercent(twistVoltage, twistDistance);
    const dcLoss = calculateLossPercent(twistVoltage, twistDistance) * 0.65;

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
              AC vs HVDC Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Compare AC and DC transmission at long distances
            </p>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}>
                <strong style={{ color: colors.accent }}>What you're seeing:</strong> This visualization compares AC and HVDC transmission losses across different distances and voltages, showing how DC eliminates reactive power losses and skin effect that plague long-distance AC lines.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}>
                <strong style={{ color: colors.success }}>Cause and Effect:</strong> As you increase distance or decrease voltage, AC losses grow faster than HVDC losses. Toggling to HVDC shows the savings from eliminating reactive and capacitive losses that scale with line length.
              </p>
            </div>

            {/* Side-by-side layout */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <HVDCVisualization />
                  </div>
                </div>
              </div>

              {/* Right: Controls panel */}
              <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '16px',
                }}>
                  {/* Distance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Distance</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{twistDistance} miles</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={twistDistance}
                      onChange={(e) => setTwistDistance(parseInt(e.target.value))}
                      onInput={(e) => setTwistDistance(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Distance"
                      style={sliderStyle(colors.warning, twistDistance, 50, 500)}
                    />
                  </div>

                  {/* Voltage slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Voltage</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistVoltage} kV</span>
                    </div>
                    <input
                      type="range"
                      min="345"
                      max="1100"
                      step="5"
                      value={twistVoltage}
                      onChange={(e) => setTwistVoltage(parseInt(e.target.value))}
                      onInput={(e) => setTwistVoltage(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Voltage"
                      style={sliderStyle(colors.accent, twistVoltage, 345, 1100)}
                    />
                  </div>

                  {/* AC/DC toggle */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <button
                      onClick={() => { playSound('click'); setUseHVDC(false); }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: !useHVDC ? `2px solid #F59E0B` : `1px solid ${colors.border}`,
                        background: !useHVDC ? 'rgba(245,158,11,0.15)' : colors.bgSecondary,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      AC Transmission
                    </button>
                    <button
                      onClick={() => { playSound('click'); setUseHVDC(true); }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: useHVDC ? `2px solid #3B82F6` : `1px solid ${colors.border}`,
                        background: useHVDC ? 'rgba(59,130,246,0.15)' : colors.bgSecondary,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                    >
                      HVDC Transmission
                    </button>
                  </div>

                  {/* Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#F59E0B' }}>{acLoss.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>AC Loss</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: '#3B82F6' }}>{dcLoss.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>HVDC Loss</div>
                    </div>
                  </div>

                  {/* HVDC advantages */}
                  <div style={{
                    background: useHVDC ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${useHVDC ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      {useHVDC
                        ? 'HVDC eliminates reactive power, skin effect, and capacitive charging. Only 2 conductors needed (vs 3 for AC).'
                        : 'AC suffers from reactive losses, skin effect, and capacitive charging that worsen with distance.'}
                    </p>
                    <div style={{
                      ...typo.h3,
                      color: useHVDC ? '#3B82F6' : '#F59E0B'
                    }}>
                      {useHVDC ? `Saving ${(acLoss - dcLoss).toFixed(1)}% vs AC` : `${acLoss.toFixed(1)}% total loss`}
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
              Understand HVDC
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
              HVDC: The Long-Distance Solution
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why AC Struggles at Distance</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  AC transmission has three hidden loss mechanisms that grow with distance: <strong style={{ color: '#F59E0B' }}>reactive power</strong> (inductance and capacitance shift current out of phase with voltage), <strong style={{ color: '#EF4444' }}>skin effect</strong> (current crowds to the wire surface, increasing resistance), and <strong style={{ color: colors.accent }}>capacitive charging</strong> (the cable itself draws current). Beyond ~400 miles, these make AC increasingly impractical.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>How HVDC Works</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  HVDC converter stations use massive thyristor or IGBT valves to rectify AC to DC at the sending end, then invert DC back to AC at the receiving end. DC has no frequency, so there is no reactive power, no skin effect, and no capacitive charging current. Only 2 conductors are needed instead of 3, and the right-of-way is narrower.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Crossover Point</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  HVDC converter stations are expensive (~$200M each), but the line itself is cheaper per mile. The "break-even distance" is about 400-600 miles for overhead lines and only ~50-80km for submarine cables (where capacitive charging is much worse). Beyond these distances, HVDC wins on total cost and efficiency.
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
        conceptName="E L O N_ Transformer Timeline"
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
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
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
                      const nextIdx = newCompleted.findIndex(c => !c);
                      if (nextIdx === -1) {
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextIdx);
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
                {passed ? 'You understand voltage transformation and transmission losses!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Transformer Timeline
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of voltage transformation, I{'\u00B2'}R losses, HVDC, and grid engineering to real-world scenarios. Consider how P_loss = P{'\u00B2'}R/V{'\u00B2'} governs every decision in power transmission as you work through each problem.
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
            Transformer Timeline Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why we step voltage up to 765,000 volts for transmission, how transformers make the modern grid possible, and when HVDC beats AC.
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
                'P_loss = I\u00B2R = P\u00B2R/V\u00B2 \u2014 why voltage matters',
                'Transformer turns ratio: V_out/V_in = N_out/N_in',
                'Grid voltage journey: 13.8kV \u2192 765kV \u2192 120V',
                'HVDC eliminates reactive losses for long distances',
                'Corona discharge, skin effect, and capacitive charging',
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

export default ELON_TransformerTimelineRenderer;
