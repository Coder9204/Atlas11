'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Series vs Parallel PV Wiring - Complete 10-Phase Game
// Why wiring configuration matters for solar array performance
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

interface SeriesParallelPVRendererProps {
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
    scenario: "A homeowner has four 40V, 10A solar panels. They wire them all in series to reach 160V for their inverter. On a sunny day, a bird lands on one panel, casting a small shadow.",
    question: "What happens to the total system output when one panel is partially shaded?",
    options: [
      { id: 'a', label: "Only the shaded panel's output drops; the others maintain full power" },
      { id: 'b', label: "All panels are limited to the current of the weakest (shaded) panel", correct: true },
      { id: 'c', label: "The system automatically bypasses the shaded panel" },
      { id: 'd', label: "Voltage increases to compensate for the reduced current" }
    ],
    explanation: "In a series string, all panels share the same current. The shaded panel acts as a bottleneck, limiting current through the entire string. This is why partial shading in series configurations causes disproportionate power loss."
  },
  {
    scenario: "An installer is designing a system for a roof with trees that shade different sections at different times of day. They're deciding between one long series string or multiple parallel strings.",
    question: "Which configuration minimizes shading losses?",
    options: [
      { id: 'a', label: "One series string—simpler wiring means fewer connection losses" },
      { id: 'b', label: "Multiple parallel strings—each string operates independently", correct: true },
      { id: 'c', label: "Configuration doesn't matter; bypass diodes solve all shading issues" },
      { id: 'd', label: "Series configuration—higher voltage overcomes shading effects" }
    ],
    explanation: "Parallel strings operate independently—if one string is shaded, others continue at full power. In a series configuration, shading any panel in the string affects the entire string's current output."
  },
  {
    scenario: "A solar array has 12 panels: 4 strings of 3 panels in series, with strings wired in parallel. Each panel is rated 40V, 10A. What are the array's voltage and current ratings?",
    question: "What are the total voltage and current of this array?",
    options: [
      { id: 'a', label: "480V, 10A" },
      { id: 'b', label: "120V, 40A", correct: true },
      { id: 'c', label: "40V, 120A" },
      { id: 'd', label: "160V, 30A" }
    ],
    explanation: "In series, voltages add (3 × 40V = 120V). In parallel, currents add (4 × 10A = 40A). The array produces 120V × 40A = 4,800W, which equals 12 panels × 400W each."
  },
  {
    scenario: "A marine solar installation uses 12V panels to charge 12V batteries. The installer is choosing between wiring two panels in series (24V output) or in parallel (12V output).",
    question: "Why might parallel wiring be better for this 12V battery system?",
    options: [
      { id: 'a', label: "Parallel wiring produces more total power" },
      { id: 'b', label: "Parallel maintains 12V output, matching the battery voltage directly", correct: true },
      { id: 'c', label: "Series connections don't work on boats" },
      { id: 'd', label: "Parallel wiring is more efficient in all cases" }
    ],
    explanation: "Without an MPPT charge controller, the panel voltage should match the battery voltage. Parallel wiring keeps the output at 12V for direct compatibility. Series would require a DC-DC converter or MPPT controller to step down 24V to 12V."
  },
  {
    scenario: "An engineer notices that a series string of 10 panels produces only 60% of expected power, but each panel tests normally in isolation. The issue persists even with new wiring.",
    question: "What's the most likely cause of this performance gap?",
    options: [
      { id: 'a', label: "The panels are counterfeit with false ratings" },
      { id: 'b', label: "Panel mismatch—slight differences in current capacity compound in series", correct: true },
      { id: 'c', label: "Series strings can never match individual panel performance" },
      { id: 'd', label: "The inverter is undersized for the array" }
    ],
    explanation: "In series, the string current is limited by the lowest-performing panel. Even 5% variation between panels can cause significant losses when compounded across a long string. This is called 'mismatch loss'."
  },
  {
    scenario: "A large solar farm uses central inverters that require 600-1000V input. The designer must choose between longer series strings or more parallel connections.",
    question: "Why do utility-scale systems favor longer series strings?",
    options: [
      { id: 'a', label: "Higher voltage means lower current, reducing wire size and losses", correct: true },
      { id: 'b', label: "Series strings are easier to install on large sites" },
      { id: 'c', label: "Parallel connections aren't allowed above 100kW" },
      { id: 'd', label: "Central inverters only work with series configurations" }
    ],
    explanation: "Power loss in wires equals I²R. Higher voltage means lower current for the same power, dramatically reducing wire losses. A 1000V system at 100A loses far less power in transmission than a 100V system at 1000A."
  },
  {
    scenario: "A DIY installer connects three different panel brands in series: one 40V/10A, one 36V/9A, and one 38V/8A. The system underperforms expectations significantly.",
    question: "What electrical principle explains the poor performance?",
    options: [
      { id: 'a', label: "The voltage ratings are incompatible" },
      { id: 'b', label: "In series, current is limited to 8A (the lowest), wasting capacity", correct: true },
      { id: 'c', label: "Different brands create impedance mismatch" },
      { id: 'd', label: "The voltage adds incorrectly with mixed panels" }
    ],
    explanation: "In series, the string current equals the minimum panel current—8A here. The 10A panel can only output 8A, wasting 20% of its capacity. Always match current ratings in series strings, or use microinverters/optimizers."
  },
  {
    scenario: "During a cloudy day, a homeowner notices their 10-panel series string with bypass diodes produces about 70% of normal power, while their neighbor's identical parallel configuration produces 85%.",
    question: "Why does parallel outperform series under uniform low-light conditions?",
    options: [
      { id: 'a', label: "Parallel panels run cooler in low light" },
      { id: 'b', label: "Series voltage drop across bypass diodes causes additional losses", correct: true },
      { id: 'c', label: "Inverters are more efficient with parallel configurations" },
      { id: 'd', label: "The comparison is coincidental; performance should be identical" }
    ],
    explanation: "When bypass diodes activate (even partially), they drop about 0.5V each. In a long series string with many diodes conducting, these losses add up. Parallel configurations don't have this cascading voltage drop effect."
  },
  {
    scenario: "An RV owner wants to expand their 200W solar setup by adding another 200W panel. Their charge controller accepts 12-50V input.",
    question: "What's the advantage of wiring the new panel in series rather than parallel?",
    options: [
      { id: 'a', label: "Doubles the current, charging batteries faster" },
      { id: 'b', label: "Higher voltage improves MPPT efficiency and allows thinner wiring", correct: true },
      { id: 'c', label: "Series is always better for mobile applications" },
      { id: 'd', label: "There's no advantage; parallel is always preferred" }
    ],
    explanation: "Series doubles voltage (same current), allowing thinner wires for the same power. Higher panel voltage also gives MPPT controllers more 'headroom' to efficiently step down to battery voltage. This is particularly valuable in space-constrained RVs."
  },
  {
    scenario: "A commercial rooftop has panels facing east and west. The installer proposes separate series strings for each orientation, connected in parallel to the inverter.",
    question: "Why separate strings by orientation rather than mixing them?",
    options: [
      { id: 'a', label: "Building codes require separation by orientation" },
      { id: 'b', label: "Panels receiving different light produce different currents; mixing in series causes mismatch losses", correct: true },
      { id: 'c', label: "East and west panels have different wiring standards" },
      { id: 'd', label: "The inverter can't handle mixed orientations in one string" }
    ],
    explanation: "When the sun is in the east, west-facing panels produce less current. If mixed in a series string, the entire string is limited by the lower-current west panels. Separate strings let each orientation operate at its optimal current."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏭',
    title: 'Utility-Scale Solar Farms',
    short: 'Megawatt arrays with optimized wiring',
    tagline: 'Where every percentage point means millions',
    description: 'Utility-scale solar farms spanning hundreds of acres must balance voltage requirements, wire costs, and shading resilience. Engineers carefully design series/parallel combinations to meet inverter specifications while minimizing losses.',
    connection: 'Series/parallel configuration determines transmission losses, inverter compatibility, and fault tolerance. A 100MW farm might use 500V strings of 12-14 panels each, with hundreds of strings in parallel.',
    howItWorks: 'High-voltage series strings (600-1500V) minimize current and wire losses over long distances. Parallel connection of strings provides redundancy—one failed string doesn\'t take down the whole array.',
    stats: [
      { value: '1500V', label: 'Max string voltage', icon: '⚡' },
      { value: '$2M', label: 'Cost per 1% efficiency', icon: '💰' },
      { value: '25+ years', label: 'Design lifetime', icon: '📅' }
    ],
    examples: ['Topaz Solar Farm (California)', 'Bhadla Solar Park (India)', 'Benban Solar Park (Egypt)', 'Longyangxia Dam Solar Park (China)'],
    companies: ['First Solar', 'SunPower', 'JinkoSolar', 'LONGi Green Energy'],
    futureImpact: 'Bifacial panels and tracking systems are pushing farms toward higher voltage strings, with AI optimizing configuration dynamically based on conditions.',
    color: '#F59E0B'
  },
  {
    icon: '🏠',
    title: 'Residential Rooftop Systems',
    short: 'Home solar optimized for partial shading',
    tagline: 'Making every roof work, no matter its quirks',
    description: 'Home rooftops face unique challenges: chimneys, vents, trees, and varying orientations. Modern residential systems use smart combinations of series strings, microinverters, or power optimizers to maximize production.',
    connection: 'Residential systems balance voltage requirements (string inverter minimum) with shading resilience. Too few panels in series means low voltage; too many means severe shading losses.',
    howItWorks: 'String inverters require 300-500V, dictating series string length. Microinverters eliminate series limitations by optimizing each panel independently. Power optimizers provide panel-level optimization with central inverters.',
    stats: [
      { value: '97%', label: 'Microinverter efficiency', icon: '📈' },
      { value: '25%', label: 'Gain vs simple series', icon: '⚡' },
      { value: '20-25yr', label: 'Warranty period', icon: '🛡️' }
    ],
    examples: ['SolarEdge HD-Wave systems', 'Enphase IQ8 installations', 'Tesla Solar Roof', 'SunPower Equinox'],
    companies: ['Enphase', 'SolarEdge', 'Tesla', 'SunPower'],
    futureImpact: 'Smart panels with integrated power electronics will make series/parallel decisions automatic, adapting in real-time to shading and panel aging.',
    color: '#10B981'
  },
  {
    icon: '🚐',
    title: 'Mobile and Off-Grid Systems',
    short: 'RVs, boats, and remote installations',
    tagline: 'Power anywhere, configured for your needs',
    description: 'Mobile installations on RVs, boats, and remote cabins must work with limited space, varying battery voltages, and no grid backup. Wiring configuration directly impacts charging efficiency and system flexibility.',
    connection: 'Series wiring increases voltage for efficient MPPT charging; parallel wiring maintains lower voltage for simpler charge controllers. The choice depends on charge controller capability and wire run lengths.',
    howItWorks: 'Series doubles voltage (same current) for thinner wires and better MPPT efficiency. Parallel doubles current, requiring thicker wires but providing redundancy. Many use series-parallel hybrids.',
    stats: [
      { value: '12-48V', label: 'Common battery voltages', icon: '🔋' },
      { value: '30%', label: 'Wire loss reduction (series)', icon: '⚡' },
      { value: '50%', label: 'RVs with solar by 2025', icon: '🚐' }
    ],
    examples: ['Airstream solar packages', 'Marine solar systems', 'Off-grid cabin setups', 'Overland vehicle builds'],
    companies: ['Victron', 'Renogy', 'Battle Born Batteries', 'Go Power!'],
    futureImpact: 'Flexible solar panels and integrated battery-inverter systems will simplify mobile installations, with smart controllers automatically optimizing configuration.',
    color: '#3B82F6'
  },
  {
    icon: '🛰️',
    title: 'Spacecraft Power Arrays',
    short: 'Solar wings with zero margin for error',
    tagline: 'Redundancy is survival',
    description: 'Spacecraft solar arrays operate in extreme conditions with no possibility of repair. Wiring architecture must survive component failures, radiation damage, and provide precise voltage regulation for sensitive electronics.',
    connection: 'Spacecraft use complex series-parallel matrices with cross-strapping that allows current to route around failed cells. Block redundancy and string isolation prevent single-point failures.',
    howItWorks: 'Multi-junction cells in series-parallel groups feed power buses through blocking diodes. Cross-ties between parallel strings create meshes that survive cell failures. Shunt regulators manage excess power.',
    stats: [
      { value: '30%', label: 'Cell efficiency', icon: '⚡' },
      { value: '15+ years', label: 'Mission duration', icon: '🛰️' },
      { value: '99.99%', label: 'Reliability requirement', icon: '🎯' }
    ],
    examples: ['International Space Station arrays', 'Mars Rover solar wings', 'Hubble Space Telescope', 'Communication satellites'],
    companies: ['Boeing', 'Lockheed Martin', 'Northrop Grumman', 'Airbus Defence and Space'],
    futureImpact: 'Lunar and Mars bases will use deployable arrays with autonomous fault detection and reconfiguration capabilities.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SeriesParallelPVRenderer: React.FC<SeriesParallelPVRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [wiringMode, setWiringMode] = useState<'series' | 'parallel'>('series');
  const [numPanels, setNumPanels] = useState(2);
  const [shadedPanel, setShadedPanel] = useState<number | null>(null);
  const [shadeLevel, setShadeLevel] = useState(50); // 0-100%
  const [animationFrame, setAnimationFrame] = useState(0);

  // Panel specs (per panel)
  const panelVoltage = 40; // V
  const panelCurrent = 10; // A
  const panelPower = panelVoltage * panelCurrent; // 400W

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

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6', // Electric blue for circuits
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
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
    twist_predict: 'Twist Challenge',
    twist_play: 'Twist Lab',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate system outputs
  const calculateOutput = useCallback(() => {
    // No shading case
    if (shadedPanel === null || shadeLevel === 0) {
      if (wiringMode === 'series') {
        return {
          voltage: panelVoltage * numPanels,
          current: panelCurrent,
          power: panelPower * numPanels
        };
      } else {
        return {
          voltage: panelVoltage,
          current: panelCurrent * numPanels,
          power: panelPower * numPanels
        };
      }
    }

    // With shading
    const shadeMultiplier = (100 - shadeLevel) / 100;
    const shadedCurrent = panelCurrent * shadeMultiplier;

    if (wiringMode === 'series') {
      // Series: current limited by weakest panel
      const limitedCurrent = Math.min(panelCurrent, shadedCurrent);
      return {
        voltage: panelVoltage * numPanels,
        current: limitedCurrent,
        power: panelVoltage * numPanels * limitedCurrent
      };
    } else {
      // Parallel: only shaded panel affected
      const fullPanelsCurrent = panelCurrent * (numPanels - 1);
      const totalCurrent = fullPanelsCurrent + shadedCurrent;
      return {
        voltage: panelVoltage,
        current: totalCurrent,
        power: panelVoltage * totalCurrent
      };
    }
  }, [wiringMode, numPanels, shadedPanel, shadeLevel]);

  const output = calculateOutput();
  const maxPower = panelPower * numPanels;
  const efficiency = maxPower > 0 ? (output.power / maxPower) * 100 : 0;

  // Circuit Diagram Component
  const CircuitDiagram = ({ showCurrentFlow = true }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 280 : 320;
    const panelW = isMobile ? 50 : 70;
    const panelH = isMobile ? 80 : 100;
    const gap = isMobile ? 15 : 20;

    const panels = Array.from({ length: numPanels }, (_, i) => i);

    if (wiringMode === 'series') {
      // Series: panels in a row with current flowing through all
      const startX = (width - (numPanels * panelW + (numPanels - 1) * gap)) / 2;
      const startY = (height - panelH) / 2;

      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
          {/* Filter definitions for glow effects */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6"/>
              <stop offset="50%" stopColor={colors.accent} stopOpacity="1"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          {/* Wires - top rail */}
          <line
            x1={startX - 20}
            y1={startY + 15}
            x2={startX + numPanels * panelW + (numPanels - 1) * gap + 20}
            y2={startY + 15}
            stroke={colors.accent}
            strokeWidth="3"
          />
          {/* Wires - bottom rail (series connections) */}
          {panels.map((i) => {
            if (i < numPanels - 1) {
              return (
                <line
                  key={`wire-${i}`}
                  x1={startX + i * (panelW + gap) + panelW}
                  y1={startY + panelH - 15}
                  x2={startX + (i + 1) * (panelW + gap)}
                  y2={startY + panelH - 15}
                  stroke={colors.accent}
                  strokeWidth="3"
                />
              );
            }
            return null;
          })}

          {/* Panels */}
          {panels.map((i) => {
            const x = startX + i * (panelW + gap);
            const isShaded = shadedPanel === i;
            const panelEfficiency = isShaded ? (100 - shadeLevel) / 100 : 1;

            return (
              <g key={i}>
                {/* Panel body */}
                <rect
                  x={x}
                  y={startY}
                  width={panelW}
                  height={panelH}
                  fill={isShaded ? `${colors.warning}33` : colors.bgSecondary}
                  stroke={isShaded ? colors.warning : colors.border}
                  strokeWidth="2"
                  rx="4"
                  filter={isShaded ? "url(#glow)" : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShadedPanel(shadedPanel === i ? null : i)}
                />
                {/* Panel cells */}
                <rect x={x + 5} y={startY + 5} width={panelW - 10} height={(panelH - 10) * 0.48} fill={colors.accent + '44'} rx="2" />
                <rect x={x + 5} y={startY + panelH * 0.52} width={panelW - 10} height={(panelH - 10) * 0.48} fill={colors.accent + '44'} rx="2" />
                {/* + and - terminals */}
                <circle cx={x + panelW / 2 - 10} cy={startY + 15} r="5" fill={colors.error} />
                <circle cx={x + panelW / 2 + 10} cy={startY + panelH - 15} r="5" fill={colors.textSecondary} />
                {/* Shade overlay */}
                {isShaded && (
                  <rect
                    x={x}
                    y={startY}
                    width={panelW}
                    height={panelH * (shadeLevel / 100)}
                    fill="rgba(0,0,0,0.5)"
                    rx="4"
                  />
                )}
                {/* Panel label */}
                <text x={x + panelW / 2} y={startY + panelH + 16} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
                  P{i + 1}
                </text>
                {isShaded && (
                  <text x={x + panelW / 2} y={startY + panelH / 2} fill={colors.warning} fontSize="11" textAnchor="middle" fontWeight="600">
                    {(panelEfficiency * 100).toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Axis labels */}
          <text x="20" y={height / 2} fill={colors.textMuted} fontSize="11" textAnchor="start">Voltage</text>
          <text x={width / 2} y={height - 5} fill={colors.textMuted} fontSize="11" textAnchor="middle">Current →</text>

          {/* Grid lines for reference */}
          <line x1={startX - 20} y1={startY + panelH / 2} x2={startX + numPanels * panelW + (numPanels - 1) * gap + 20} y2={startY + panelH / 2} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          <line x1={startX - 20} y1={startY + panelH * 0.25} x2={startX + numPanels * panelW + (numPanels - 1) * gap + 20} y2={startY + panelH * 0.25} stroke={colors.border} strokeDasharray="4 4" opacity="0.2" />
          <line x1={startX - 20} y1={startY + panelH * 0.75} x2={startX + numPanels * panelW + (numPanels - 1) * gap + 20} y2={startY + panelH * 0.75} stroke={colors.border} strokeDasharray="4 4" opacity="0.2" />

          {/* Current flow animation - highlighted active values */}
          {showCurrentFlow && (
            <g filter="url(#glow)">
              {[0, 1, 2].map((i) => {
                const offset = (animationFrame * 3 + i * 30) % (width - 40);
                return (
                  <circle
                    key={i}
                    cx={startX - 20 + offset}
                    cy={startY + 15}
                    r="4"
                    fill={colors.warning}
                    style={{ opacity: 0.8 }}
                  />
                );
              })}
            </g>
          )}

          {/* Labels */}
          <text x={width / 2} y={height - 20} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">
            SERIES: V = {output.voltage}V, I = {output.current.toFixed(1)}A
          </text>
          <text x={width / 2} y={30} fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="700">
            + {output.voltage}V −
          </text>
        </svg>
      );
    } else {
      // Parallel: panels stacked vertically with common rails
      const startX = (width - panelW) / 2;
      const totalH = numPanels * (panelH / 2) + (numPanels - 1) * (gap / 2);
      const startY = (height - totalH) / 2;
      const miniH = panelH / 2;

      return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
          {/* Left rail (positive) */}
          <line
            x1={startX - 30}
            y1={startY - 10}
            x2={startX - 30}
            y2={startY + totalH + 10}
            stroke={colors.error}
            strokeWidth="4"
          />
          {/* Right rail (negative) */}
          <line
            x1={startX + panelW + 30}
            y1={startY - 10}
            x2={startX + panelW + 30}
            y2={startY + totalH + 10}
            stroke={colors.textSecondary}
            strokeWidth="4"
          />

          {/* Panels */}
          {panels.map((i) => {
            const y = startY + i * (miniH + gap / 2);
            const isShaded = shadedPanel === i;

            return (
              <g key={i}>
                {/* Wires to rails */}
                <line x1={startX - 30} y1={y + miniH / 2} x2={startX} y2={y + miniH / 2} stroke={colors.error} strokeWidth="2" />
                <line x1={startX + panelW} y1={y + miniH / 2} x2={startX + panelW + 30} y2={y + miniH / 2} stroke={colors.textSecondary} strokeWidth="2" />

                {/* Panel body */}
                <rect
                  x={startX}
                  y={y}
                  width={panelW}
                  height={miniH}
                  fill={isShaded ? `${colors.warning}33` : colors.bgSecondary}
                  stroke={isShaded ? colors.warning : colors.border}
                  strokeWidth="2"
                  rx="4"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShadedPanel(shadedPanel === i ? null : i)}
                />
                {/* Panel cells */}
                <rect x={startX + 4} y={y + 4} width={panelW - 8} height={miniH - 8} fill={colors.accent + '44'} rx="2" />
                {/* Shade overlay */}
                {isShaded && (
                  <rect
                    x={startX}
                    y={y}
                    width={panelW * (shadeLevel / 100)}
                    height={miniH}
                    fill="rgba(0,0,0,0.5)"
                    rx="4"
                  />
                )}
                {/* Panel label */}
                <text x={startX + panelW + 45} y={y + miniH / 2 + 4} fill={colors.textSecondary} fontSize="11">
                  P{i + 1}: {isShaded ? ((100 - shadeLevel) / 100 * panelCurrent).toFixed(1) : panelCurrent}A
                </text>
              </g>
            );
          })}

          {/* Labels */}
          <text x={width / 2} y={height - 15} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">
            PARALLEL: V = {output.voltage}V, I = {output.current.toFixed(1)}A
          </text>
          <text x={startX - 30} y={startY - 20} fill={colors.error} fontSize="11" textAnchor="middle">+</text>
          <text x={startX + panelW + 30} y={startY - 20} fill={colors.textSecondary} fontSize="11" textAnchor="middle">−</text>
          {/* Axis labels */}
          <text x={10} y={height / 2} fill={colors.textMuted} fontSize="11" textAnchor="start">Voltage</text>
          <text x={width / 2} y={height - 5} fill={colors.textMuted} fontSize="11" textAnchor="middle">Current →</text>
          {/* Grid reference lines */}
          <line x1={startX - 25} y1={startY + totalH / 2} x2={startX + panelW + 60} y2={startY + totalH / 2} stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
          <line x1={startX - 25} y1={startY + totalH * 0.25} x2={startX + panelW + 60} y2={startY + totalH * 0.25} stroke={colors.border} strokeDasharray="4 4" opacity="0.2" />
        </svg>
      );
    }
  };

  // Legend component for SVG elements
  const renderLegend = () => (
    <div data-testid="legend" style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      justifyContent: 'center',
      padding: '12px 16px',
      background: colors.bgSecondary,
      borderRadius: '8px',
      marginTop: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '16px', height: '16px', background: colors.bgSecondary, border: `2px solid ${colors.border}`, borderRadius: '2px' }} />
        <span style={{ ...typo.small, color: colors.textSecondary }}>Solar Panel</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '16px', height: '16px', background: `${colors.warning}33`, border: `2px solid ${colors.warning}`, borderRadius: '2px' }} />
        <span style={{ ...typo.small, color: colors.textSecondary }}>Shaded Panel</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '12px', height: '12px', background: colors.error, borderRadius: '50%' }} />
        <span style={{ ...typo.small, color: colors.textSecondary }}>Positive (+)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '12px', height: '12px', background: colors.textMuted, borderRadius: '50%' }} />
        <span style={{ ...typo.small, color: colors.textSecondary }}>Negative (-)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '16px', height: '4px', background: colors.accent, borderRadius: '2px' }} />
        <span style={{ ...typo.small, color: colors.textSecondary }}>Wire</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '10px', height: '10px', background: colors.warning, borderRadius: '50%' }} />
        <span style={{ ...typo.small, color: colors.textSecondary }}>Current Flow</span>
      </div>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation bar with Back/Next buttons and dots
  const renderNavDots = (canProceed: boolean = true, nextText: string = 'Next →') => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: colors.bgPrimary,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 1000,
      }}>
        <button
          onClick={() => {
            if (currentIdx > 0) goToPhase(phaseOrder[currentIdx - 1]);
          }}
          disabled={currentIdx === 0}
          style={{
            padding: '10px 16px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 400,
            opacity: currentIdx > 0 ? 1 : 0.4,
            transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              aria-label={phaseLabels[p]}
              title={phaseLabels[p]}
              style={{
                minHeight: '44px',
                minWidth: '20px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
              }}
            >
              <span style={{
                display: 'block',
                width: phase === p ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: currentIdx >= i ? colors.accent : colors.border,
                transition: 'all 0.3s ease',
              }} />
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (canProceed && currentIdx < phaseOrder.length - 1) {
              playSound('transition');
              goToPhase(phaseOrder[currentIdx + 1]);
            }
          }}
          disabled={!canProceed}
          style={{
            padding: '10px 16px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : colors.border,
            color: 'white',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 700,
            opacity: canProceed ? 1 : 0.5,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {nextText}
        </button>
      </div>
    );
  };

  // Primary button style
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 100px 24px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔌⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Series vs Parallel Wiring
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Two identical solar arrays. Same panels. Same sunlight. But one loses <span style={{ color: colors.error }}>80% of its power</span> when a single leaf falls on one panel. The other barely notices."
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
            "The way you connect your panels isn't just about voltage—it's about resilience, efficiency, and making every watt count."
          </p>
          <p style={{ ...typo.small, color: 'rgba(107, 114, 128, 0.7)', marginTop: '8px' }}>
            — Solar System Design Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Difference →
        </button>
        </div>

        {renderNavDots(true, 'Next →')}
      </div>
    );
  }

  // Static diagram for predict phase
  const PredictDiagram = () => {
    const width = isMobile ? 320 : 400;
    const height = 180;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Series row */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="600">Series vs Parallel Wiring</text>

        {/* Series diagram */}
        <text x={20} y={55} fill={colors.warning} fontSize="11" fontWeight="600">SERIES</text>
        {[0, 1, 2, 3].map(i => (
          <g key={`s-${i}`}>
            <rect x={60 + i * 50} y={40} width={40} height={30} fill={colors.bgSecondary} stroke={colors.border} strokeWidth="2" rx="3" />
            <text x={80 + i * 50} y={60} fill={colors.accent} fontSize="11" textAnchor="middle">40V</text>
            {i < 3 && <line x1={100 + i * 50} y1={55} x2={110 + i * 50} y2={55} stroke={colors.accent} strokeWidth="2" />}
          </g>
        ))}
        <text x={280} y={60} fill={colors.textPrimary} fontSize="11" fontWeight="600">= 160V</text>

        {/* Parallel diagram */}
        <text x={20} y={110} fill={colors.success} fontSize="11" fontWeight="600">PARALLEL</text>
        {[0, 1, 2, 3].map(i => (
          <g key={`p-${i}`}>
            <rect x={60 + i * 50} y={95} width={40} height={30} fill={colors.bgSecondary} stroke={colors.border} strokeWidth="2" rx="3" />
            <text x={80 + i * 50} y={115} fill={colors.accent} fontSize="11" textAnchor="middle">10A</text>
          </g>
        ))}
        {/* Parallel bus bars */}
        <line x1={60} y1={130} x2={260} y2={130} stroke={colors.success} strokeWidth="3" />
        <line x1={60} y1={90} x2={260} y2={90} stroke={colors.success} strokeWidth="3" />
        {[0, 1, 2, 3].map(i => (
          <g key={`pv-${i}`}>
            <line x1={80 + i * 50} y1={90} x2={80 + i * 50} y2={95} stroke={colors.success} strokeWidth="2" />
            <line x1={80 + i * 50} y1={125} x2={80 + i * 50} y2={130} stroke={colors.success} strokeWidth="2" />
          </g>
        ))}
        <text x={280} y={115} fill={colors.textPrimary} fontSize="11" fontWeight="600">= 40A</text>

        {/* Bottom labels */}
        <text x={width / 4} y={165} fill={colors.warning} fontSize="11" textAnchor="middle">160V x 10A = 1600W</text>
        <text x={3 * width / 4} y={165} fill={colors.success} fontSize="11" textAnchor="middle">40V x 40A = 1600W</text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Series produces more total power because voltage adds up' },
      { id: 'b', text: 'Parallel produces more total power because current adds up' },
      { id: 'c', text: 'Both produce the same total power—P = V x I is equal either way' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '700px', margin: '0 auto' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            You have four identical 400W solar panels. Does wiring them in series or parallel produce more power?
          </h2>

          {/* SVG diagram for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <PredictDiagram />
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
        </div>
        {renderNavDots(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE - Interactive Circuit
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Compare Series vs Parallel
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Toggle between configurations to see how voltage and current change
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Watch how: Series adds voltages (V₁+V₂+...), while Parallel adds currents (I₁+I₂+...). Notice the power calculation remains constant.
          </p>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}>
            <button
              onClick={() => { playSound('click'); setWiringMode('series'); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${wiringMode === 'series' ? colors.accent : colors.border}`,
                background: wiringMode === 'series' ? `${colors.accent}22` : 'transparent',
                color: wiringMode === 'series' ? colors.accent : colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Series
            </button>
            <button
              onClick={() => { playSound('click'); setWiringMode('parallel'); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${wiringMode === 'parallel' ? colors.accent : colors.border}`,
                background: wiringMode === 'parallel' ? `${colors.accent}22` : 'transparent',
                color: wiringMode === 'parallel' ? colors.accent : colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Parallel
            </button>
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
                  <CircuitDiagram showCurrentFlow={true} />
                </div>
                {renderLegend()}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Number of panels slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Number of voltage panels (current count)</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{numPanels}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    value={numPanels}
                    onChange={(e) => {
                      setNumPanels(parseInt(e.target.value));
                      setShadedPanel(null);
                    }}
                    onInput={(e) => {
                      setNumPanels(parseInt((e.target as HTMLInputElement).value));
                      setShadedPanel(null);
                    }}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      accentColor: colors.accent,
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    }}
                  />
                </div>

                {/* Output display */}
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
                    <div style={{ ...typo.h3, color: colors.warning }}>{output.voltage}V</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Voltage</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{output.current.toFixed(1)}A</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Current</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                    gridColumn: 'span 2',
                  }}>
                    <div style={{ ...typo.h3, color: colors.success }}>{output.power.toFixed(0)}W</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Power</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              💡 {output.power.toFixed(0)}W either way! Series increases voltage, parallel increases current, but total power (V × I) is the same.
            </p>
          </div>

          {/* Educational guidance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              💡 <strong style={{ color: colors.accent }}>Why this matters:</strong> Understanding series vs parallel is crucial for solar system design, battery configurations, and electrical safety. The wiring choice affects voltage requirements, current capacity, and system resilience.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Math →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Total Power Stays the Same
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '12px', color: colors.textMuted, fontSize: '13px' }}>
                Your prediction: {prediction === 'a' ? '"Series produces more power"' : prediction === 'b' ? '"Parallel produces more power"' : prediction === 'c' ? '"Both produce the same power"' : 'None made'}
                {prediction === 'c' ? <span style={{ color: colors.success }}> — You predicted this correctly! ✓</span> : prediction ? <span style={{ color: colors.warning }}> — As you observed, both are equal!</span> : ''}
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Because power depends on both voltage and current:</strong> When you increase one, you proportionally decrease the other. This is why P = V × I gives the same result regardless of configuration.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <h4 style={{ color: colors.warning, margin: '0 0 8px 0' }}>Series</h4>
                  <p style={{ margin: '4px 0', color: colors.textSecondary }}>V = V₁ + V₂ + V₃ + V₄</p>
                  <p style={{ margin: '4px 0', color: colors.textSecondary }}>I = I (same through all)</p>
                  <p style={{ margin: '8px 0 0 0', color: colors.accent, fontWeight: 600 }}>160V × 10A = 1600W</p>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <h4 style={{ color: colors.accent, margin: '0 0 8px 0' }}>Parallel</h4>
                  <p style={{ margin: '4px 0', color: colors.textSecondary }}>V = V (same across all)</p>
                  <p style={{ margin: '4px 0', color: colors.textSecondary }}>I = I₁ + I₂ + I₃ + I₄</p>
                  <p style={{ margin: '8px 0 0 0', color: colors.accent, fontWeight: 600 }}>40V × 40A = 1600W</p>
                </div>
              </div>
              <p>
                <strong style={{ color: colors.textPrimary }}>The reason this works:</strong> Energy is conserved! You're trading voltage for current (or vice versa), but the total power—what actually does work—remains constant. {prediction === 'c' ? <span style={{ color: colors.success }}>You predicted this correctly! ✓</span> : ''}
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
              🤔 So Why Does Configuration Matter?
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              If total power is the same, why do solar installers care so much about series vs parallel? The answer lies in what happens under <strong style={{ color: colors.warning }}>non-ideal conditions</strong>—like partial shading.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore the Shading Problem →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Series loses more power—the shaded panel limits current through all panels' },
      { id: 'b', text: 'Parallel loses more power—all panels share the reduced voltage' },
      { id: 'c', text: 'Both lose the same amount—25% shade means 25% power loss' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🌥️ New Variable: Partial Shading
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A leaf shades ONE panel by 50%. Which configuration loses more power?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {/* Static SVG diagram showing shading scenario */}
            <svg width="320" height="120" viewBox="0 0 320 120" style={{ background: colors.bgSecondary, borderRadius: '8px', marginBottom: '12px' }}>
              {/* Series string with shaded panel */}
              <text x="160" y="15" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="600">Series vs Parallel: Shading Effect</text>
              {/* 4 panels in series */}
              {[0, 1, 2, 3].map(i => (
                <g key={i}>
                  <rect x={30 + i * 55} y={25} width={45} height={35} fill={i === 1 ? `${colors.warning}44` : colors.bgCard} stroke={i === 1 ? colors.warning : colors.border} strokeWidth="2" rx="3" />
                  <text x={52 + i * 55} y={47} fill={i === 1 ? colors.warning : colors.textMuted} fontSize="10" textAnchor="middle">{i === 1 ? '50%' : '40V'}</text>
                  {i < 3 && <line x1={75 + i * 55} y1={42} x2={85 + i * 55} y2={42} stroke={colors.accent} strokeWidth="2" />}
                </g>
              ))}
              <text x="270" y="47" fill={colors.error} fontSize="10" fontWeight="600">LOSS</text>
              {/* Voltage label */}
              <text x="160" y="72" fill={colors.textMuted} fontSize="10" textAnchor="middle">Voltage: series adds panels, shading reduces current</text>
              <text x="160" y="85" fill={colors.warning} fontSize="10" textAnchor="middle" fontWeight="600">Which loses more power when 1 panel is 50% shaded?</text>
              {/* Axis reference */}
              <text x="10" y="105" fill={colors.textMuted} fontSize="9">Current →</text>
              <line x1="30" y1="98" x2="290" y2="98" stroke={colors.border} strokeDasharray="3 3" opacity="0.4" />
            </svg>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              4 panels, 1 partially shaded (50% blocked)
            </p>
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
              onClick={() => { playSound('success'); setShadedPanel(0); setShadeLevel(50); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Difference →
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Shading Impact: Series vs Parallel
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Click a panel to shade it, then compare configurations
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Observe: In series, watch how one shaded panel limits the entire string's current. In parallel, notice each panel operates independently.
          </p>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}>
            <button
              onClick={() => { playSound('click'); setWiringMode('series'); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${wiringMode === 'series' ? colors.warning : colors.border}`,
                background: wiringMode === 'series' ? `${colors.warning}22` : 'transparent',
                color: wiringMode === 'series' ? colors.warning : colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Series
            </button>
            <button
              onClick={() => { playSound('click'); setWiringMode('parallel'); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${wiringMode === 'parallel' ? colors.success : colors.border}`,
                background: wiringMode === 'parallel' ? `${colors.success}22` : 'transparent',
                color: wiringMode === 'parallel' ? colors.success : colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Parallel
            </button>
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
                  <CircuitDiagram showCurrentFlow={true} />
                </div>
                {renderLegend()}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Shade level slider */}
                {shadedPanel !== null && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>🌥️ Shade Level on P{shadedPanel + 1}</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{shadeLevel}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={shadeLevel}
                      onChange={(e) => setShadeLevel(parseInt(e.target.value))}
                      onInput={(e) => setShadeLevel(parseInt((e.target as HTMLInputElement).value))}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                        accentColor: '#3b82f6',
                      }}
                    />
                  </div>
                )}

                {/* Clear shading button */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <button
                    onClick={() => setShadedPanel(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Clear Shading
                  </button>
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
                    <div style={{ ...typo.h3, color: colors.success }}>{output.power.toFixed(0)}W</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Output Power</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.textMuted }}>{maxPower}W</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Max Possible</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    gridColumn: 'span 2',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: efficiency > 90 ? colors.success : efficiency > 70 ? colors.warning : colors.error
                    }}>
                      {efficiency.toFixed(0)}%
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Efficiency</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison insight */}
          {shadedPanel !== null && shadeLevel > 0 && (
            <div style={{
              background: wiringMode === 'series' ? `${colors.error}22` : `${colors.success}22`,
              border: `1px solid ${wiringMode === 'series' ? colors.error : colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: wiringMode === 'series' ? colors.error : colors.success, margin: 0 }}>
                {wiringMode === 'series'
                  ? `⚠️ Series: Shaded panel limits entire string to ${((100 - shadeLevel) / 100 * panelCurrent).toFixed(1)}A!`
                  : `✓ Parallel: Only P${shadedPanel + 1} is affected. Other panels maintain full 10A output.`
                }
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Current Bottleneck Problem
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.error}44`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⛓️</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>Series: Chain is Only as Strong as Weakest Link</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In series, <strong style={{ color: colors.textPrimary }}>all panels share the same current</strong>. When one panel is shaded, its maximum current drops—and that limits the current through every panel in the string.
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
              }}>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  50% shade on 1 of 4 panels → 5A limit on all 4 → <span style={{ color: colors.error }}>50% total power loss</span>
                </p>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}44`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔀</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Parallel: Independent Operation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In parallel, <strong style={{ color: colors.textPrimary }}>each panel operates independently</strong>. A shaded panel produces less current, but the others continue at full capacity unaffected.
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
              }}>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  50% shade on 1 of 4 panels → 3 full + 1 half → <span style={{ color: colors.success }}>only 12.5% total power loss</span>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>The Trade-off</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Series gives <strong>higher voltage</strong> (needed for inverters, reduces wire losses) but is vulnerable to shading. Parallel provides <strong>shading resilience</strong> but requires thicker wires and may not meet inverter voltage requirements.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Solutions →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
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
                Series/Parallel in This Application:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 12px 0' }}>
                {app.connection}
              </p>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 12px 0' }}>
                {app.howItWorks}
              </p>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
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

            {/* Got It button for each app */}
            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  playSound('success');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${app.color}`,
                  background: 'transparent',
                  color: app.color,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                Got It
              </button>
            )}
            {completedApps[selectedApp] && (
              <p style={{ ...typo.small, color: colors.success, marginTop: '12px' }}>✓ Application explored</p>
            )}
          </div>

          {/* Progress indicator */}
          {!allAppsCompleted && (
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                👆 Explore all {realWorldApps.length} applications to continue
              </p>
            </div>
          )}

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
            </button>
          )}
        </div>
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
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '48px',
            paddingBottom: '100px',
          }}>
          <div style={{ padding: '0 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
                ? 'You\'ve mastered Series vs Parallel PV Wiring!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer Review */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
                Answer Review
              </h3>
              {testQuestions.map((q, i) => {
                const userAnswer = testAnswers[i];
                const correctAnswer = q.options.find(o => o.correct)?.id;
                const isCorrect = userAnswer === correctAnswer;
                return (
                  <div key={i} style={{
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: i < testQuestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '18px',
                        color: isCorrect ? colors.success : colors.error
                      }}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>
                        Question {i + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

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
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
        <div style={{ padding: '0 24px', maxWidth: '700px', margin: '0 auto' }}>
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
                Next Question →
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

        {renderNavDots(false, 'Next →')}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 100px 24px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Wiring Configuration Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how series and parallel wiring affects solar array performance and can make informed decisions about system design.
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
              'Series adds voltage, parallel adds current',
              'Total power is the same in ideal conditions',
              'Series is vulnerable to partial shading',
              'Parallel provides shading resilience',
              'Real-world systems balance both approaches',
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
        </div>

        {renderNavDots(true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default SeriesParallelPVRenderer;
