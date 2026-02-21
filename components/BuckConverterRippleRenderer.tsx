'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Buck Converter Ripple - Complete 10-Phase Game (#265)
// How output voltage ripple depends on L, C, f_sw, and load current
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

interface BuckConverterRippleRendererProps {
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
    scenario: "A 12V-to-3.3V buck converter is producing 80mV peak-to-peak output ripple. The design uses a 10uH inductor, 22uF output capacitor, and switches at 500kHz.",
    question: "Which single change would most effectively reduce the ripple?",
    options: [
      { id: 'a', label: "Increase the input voltage to 24V" },
      { id: 'b', label: "Increase the output capacitance to 100uF", correct: true },
      { id: 'c', label: "Decrease the inductor value to 4.7uH" },
      { id: 'd', label: "Decrease the switching frequency to 200kHz" }
    ],
    explanation: "Output voltage ripple is inversely proportional to output capacitance: Vripple = deltaIL / (8 * f * Cout). Increasing Cout from 22uF to 100uF reduces ripple by ~4.5x. Decreasing L or f would increase ripple, and input voltage has a secondary effect through inductor current ripple."
  },
  {
    scenario: "An engineer doubles the switching frequency of a buck converter from 500kHz to 1MHz while keeping all other components the same.",
    question: "What happens to the output voltage ripple?",
    options: [
      { id: 'a', label: "Ripple doubles because the switching is faster" },
      { id: 'b', label: "Ripple is approximately halved because both deltaIL and the filtering improve", correct: true },
      { id: 'c', label: "Ripple stays the same since L and C are unchanged" },
      { id: 'd', label: "Ripple quadruples due to increased switching losses" }
    ],
    explanation: "Doubling frequency halves the inductor current ripple (deltaIL = Vout*(1-D)/(L*f)) AND the ripple formula has f in the denominator. The net effect: Vripple is proportional to 1/f^2 when considering both effects, so ripple drops to approximately 1/4. In the simplified formula Vripple = deltaIL/(8*f*Cout), since deltaIL itself halves, the total effect is roughly quartering."
  },
  {
    scenario: "A portable device's 3.3V rail shows clean output under full load (500mA) but exhibits large voltage spikes when the load drops to 10mA.",
    question: "What is most likely causing the voltage spikes at light load?",
    options: [
      { id: 'a', label: "The output capacitors are failing at low current" },
      { id: 'b', label: "The converter enters discontinuous conduction mode (DCM), causing inductor current to ring", correct: true },
      { id: 'c', label: "The input voltage is sagging" },
      { id: 'd', label: "Thermal effects are changing component values" }
    ],
    explanation: "At light loads, the average inductor current drops below half the ripple current, causing the inductor current to reach zero each cycle. The converter enters DCM, where the switch node rings due to the LC resonance of the inductor and parasitic capacitances, causing voltage spikes on the output."
  },
  {
    scenario: "A buck converter datasheet recommends a minimum output capacitance of 47uF with ESR less than 20 milliohms for a 3A output design.",
    question: "Why is the ESR specification critical for ripple performance?",
    options: [
      { id: 'a', label: "ESR only affects the capacitor's temperature rating" },
      { id: 'b', label: "The inductor ripple current flowing through ESR creates an additional ripple component: V_ESR = deltaIL * ESR", correct: true },
      { id: 'c', label: "ESR determines the DC output voltage level" },
      { id: 'd', label: "Lower ESR means the capacitor charges faster" }
    ],
    explanation: "Total output ripple has two components: capacitive ripple (1/(8*f*Cout)) and ESR ripple (deltaIL * ESR). In many practical designs, ESR ripple dominates. A 1A ripple current through 50 milliohm ESR creates 50mV of ripple regardless of capacitance value."
  },
  {
    scenario: "A designer is choosing between a single 100uF capacitor and ten 10uF capacitors in parallel for the output of a buck converter.",
    question: "What advantage do the parallel capacitors provide?",
    options: [
      { id: 'a', label: "No advantage - total capacitance is the same" },
      { id: 'b', label: "Lower effective ESR and ESL, better high-frequency filtering and ripple current handling", correct: true },
      { id: 'c', label: "Higher voltage rating" },
      { id: 'd', label: "Better temperature stability" }
    ],
    explanation: "Parallel capacitors divide the ESR and ESL by the number of capacitors (10x reduction with 10 caps). This dramatically improves high-frequency impedance and distributes ripple current heating. The RMS ripple current rating also increases by sqrt(N)."
  },
  {
    scenario: "A 5V-to-1.8V buck converter operates at 65% efficiency. Analysis shows the inductor has 2A peak-to-peak current ripple at 300kHz switching.",
    question: "What is the primary reason for the poor efficiency?",
    options: [
      { id: 'a', label: "The output voltage is too low" },
      { id: 'b', label: "Excessive inductor current ripple increases RMS current and core losses, and the MOSFET switching losses are high", correct: true },
      { id: 'c', label: "The input voltage is too high" },
      { id: 'd', label: "The output capacitor is too large" }
    ],
    explanation: "Large ripple current (relative to DC load current) increases inductor RMS current (I_rms = sqrt(I_dc^2 + (deltaI/sqrt(12))^2)), causing higher I^2*R losses. The large ripple also indicates the inductor may be too small, increasing core losses. Switching losses at 300kHz compound the problem."
  },
  {
    scenario: "A buck converter uses ceramic capacitors (MLCC) for the output. At room temperature the ripple is 5mV, but at 85 degrees Celsius the ripple increases to 15mV.",
    question: "What causes this ripple increase with temperature?",
    options: [
      { id: 'a', label: "The switching frequency decreases with temperature" },
      { id: 'b', label: "X5R/X7R ceramic capacitors lose significant capacitance at high temperatures and DC bias", correct: true },
      { id: 'c', label: "The inductor becomes more efficient at high temperature" },
      { id: 'd', label: "The load current automatically increases" }
    ],
    explanation: "X5R ceramics can lose 15-20% capacitance at 85C, and X7R can lose 10-15%. Combined with DC bias derating (a 10uF cap at rated voltage may only provide 4-5uF), the effective capacitance drops dramatically. Always derate ceramic capacitors for temperature AND DC bias in ripple calculations."
  },
  {
    scenario: "Two buck converter designs produce the same 10mV ripple. Design A uses 1MHz/4.7uH/22uF. Design B uses 250kHz/47uH/100uF.",
    question: "Which design likely has better transient response to sudden load changes?",
    options: [
      { id: 'a', label: "Design B because it has more capacitance and inductance" },
      { id: 'b', label: "Design A because the smaller inductor allows faster current slew rate and higher bandwidth", correct: true },
      { id: 'c', label: "Both are identical since they have the same ripple" },
      { id: 'd', label: "Neither - transient response is independent of L and C" }
    ],
    explanation: "Transient response depends on how fast the inductor current can change: di/dt = (Vin-Vout)/L. Design A with 4.7uH allows ~10x faster current changes than Design B with 47uH. The higher switching frequency also enables faster control loop response. Same ripple does not mean same dynamics."
  },
  {
    scenario: "A POL (Point of Load) regulator for an FPGA has a spec: output ripple must be below 10mV at 1.0V output, with 20A load current and 500kHz switching.",
    question: "What inductor value keeps the ripple current to about 30% of the load current?",
    options: [
      { id: 'a', label: "100nH - too small, would create excessive ripple" },
      { id: 'b', label: "Approximately 330nH, calculated from L = Vout*(1-D)/(deltaI*f)", correct: true },
      { id: 'c', label: "10uH - standard value works for all applications" },
      { id: 'd', label: "1uH - closest standard value" }
    ],
    explanation: "Target ripple current: 30% of 20A = 6A. With Vout=1V, Vin=12V (typical), D=1/12=0.083. L = Vout*(1-D)/(deltaI*f) = 1*(1-0.083)/(6*500000) = 306nH. The nearest standard value is 330nH. This yields ~5.5A ripple, which the output capacitors must then filter to below 10mV."
  },
  {
    scenario: "A battery-powered IoT device uses a buck converter that has excellent efficiency at 100mA load but drops to 40% efficiency at 1mA load (sleep mode).",
    question: "What technique would most improve light-load efficiency?",
    options: [
      { id: 'a', label: "Increasing the switching frequency" },
      { id: 'b', label: "Using pulse-frequency modulation (PFM) or pulse-skipping mode at light loads", correct: true },
      { id: 'c', label: "Adding more output capacitance" },
      { id: 'd', label: "Increasing the inductor value" }
    ],
    explanation: "At light loads, fixed-frequency switching wastes energy because each switching cycle has a fixed overhead (gate drive, switching losses) regardless of the power delivered. PFM reduces the number of switching events, only pulsing when Vout droops. This dramatically improves light-load efficiency at the cost of variable output ripple frequency."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📱',
    title: 'Smartphone Power Management',
    short: 'Dozens of buck converters in every phone',
    tagline: 'Millivolts matter when powering processors',
    description: 'A modern smartphone contains 10-20 buck converters generating different voltage rails for the CPU, GPU, memory, display, and radios. Each must meet strict ripple specifications to avoid interfering with sensitive analog circuits like the cellular modem and GPS receiver.',
    connection: 'Output ripple on the CPU rail directly affects clock jitter and maximum frequency. Ripple on the RF rail creates spurious emissions that violate FCC limits. Every millivolt of unnecessary ripple wastes energy and degrades performance.',
    howItWorks: 'Phone PMICs (Power Management ICs) integrate multiple buck converters with adaptive voltage scaling. They switch at 2-4MHz to allow tiny inductors (0.47-1uH) and ceramic capacitors (10-22uF). Ripple budgets are typically 10-30mV depending on the rail.',
    stats: [
      { value: '10-20', label: 'Buck converters per phone', icon: '🔌' },
      { value: '<15mV', label: 'Typical ripple spec', icon: '📉' },
      { value: '2-4MHz', label: 'Switching frequency', icon: '⚡' }
    ],
    examples: ['Qualcomm PM8550 PMIC', 'Apple custom PMICs', 'Samsung S2MPS platforms', 'MediaTek MT6373'],
    companies: ['Qualcomm', 'Apple', 'Samsung LSI', 'MediaTek'],
    futureImpact: 'Chiplet architectures will require even more voltage rails with tighter ripple budgets as core voltages drop below 0.5V.',
    color: '#3B82F6'
  },
  {
    icon: '🖥️',
    title: 'Server & Data Center VRMs',
    short: 'Powering the cloud with multi-phase bucks',
    tagline: 'Hundreds of amps with millivolt precision',
    description: 'Server CPUs demand 200-500A at sub-1V. Multi-phase buck converters (6-16 phases) interleave their switching to cancel ripple. The output capacitor bank must handle enormous ripple currents while maintaining voltage within a 20mV window.',
    connection: 'Voltage ripple directly limits CPU boost clocks and overclocking headroom. Server workloads that fluctuate rapidly (like search queries) create massive load transients. The VRM must respond in microseconds while keeping ripple in spec.',
    howItWorks: 'Multi-phase designs interleave switching at 120/N degree phase offsets, reducing output capacitor ripple current by up to 1/N. Smart power stages (DrMOS) integrate drivers and MOSFETs. Polymer and ceramic capacitors handle different frequency ranges of the ripple spectrum.',
    stats: [
      { value: '12-16', label: 'Phases per CPU VRM', icon: '🔄' },
      { value: '300A+', label: 'Total output current', icon: '⚡' },
      { value: '<10mV', label: 'Ripple requirement', icon: '📊' }
    ],
    examples: ['Intel VR14 specification', 'AMD SVI3 interface', 'Nvidia GPU VRMs', 'ARM server PMICs'],
    companies: ['Infineon', 'MPS', 'Renesas', 'Texas Instruments'],
    futureImpact: 'Vertical power delivery (backside power) will move VRMs beneath the chip, requiring new ripple management approaches with 3D packaging.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Automotive Power Systems',
    short: 'Buck converters in extreme environments',
    tagline: 'From 48V mild-hybrid to 1V ADAS processors',
    description: 'Modern vehicles use buck converters at every level: 48V-to-12V for mild hybrid systems, 12V-to-5V/3.3V for ECUs, and sub-1V for ADAS processors. Automotive buck converters must handle wide input voltage swings (6V during cranking to 42V during load dump) while maintaining tight ripple specs.',
    connection: 'Ripple on sensor supply rails corrupts ADC readings for safety-critical systems like collision avoidance. EMI from switching must meet CISPR 25 automotive standards. The hostile thermal environment (-40 to +150C) degrades capacitor performance.',
    howItWorks: 'Automotive bucks use spread-spectrum frequency modulation to reduce EMI peaks. AEC-Q100 qualified controllers with fault detection ensure reliability. Ceramic capacitors must be derated for temperature and vibration. Multi-phase designs serve high-current ADAS loads.',
    stats: [
      { value: '50+', label: 'Regulators per vehicle', icon: '🔋' },
      { value: '-40/+150C', label: 'Temperature range', icon: '🌡️' },
      { value: 'CISPR 25', label: 'EMI standard', icon: '📡' }
    ],
    examples: ['48V-12V DC-DC converters', 'ADAS processor power', 'Infotainment system regulators', 'LED driver bucks'],
    companies: ['Infineon', 'NXP', 'Texas Instruments', 'STMicroelectronics'],
    futureImpact: '800V EV architectures will require new buck topologies to step down to 12V and sub-1V with high efficiency across a massive voltage ratio.',
    color: '#F59E0B'
  },
  {
    icon: '🛰️',
    title: 'Aerospace & Satellite Power',
    short: 'Radiation-hardened converters in space',
    tagline: 'Zero-failure power in the vacuum of space',
    description: 'Satellite power systems convert solar panel voltage (28-100V) down to logic levels. Radiation can flip MOSFET switches randomly (single-event effects). Output ripple must be ultra-low for sensitive scientific instruments and communication systems.',
    connection: 'Voltage ripple on instrument power rails creates noise floors that limit scientific measurements. Communication systems require clean power to maintain signal integrity over millions of miles. Any converter failure is catastrophic with no possibility of repair.',
    howItWorks: 'Space-grade buck converters use radiation-hardened MOSFETs and controllers with redundant gate drive circuits. Ceramic capacitors rated for vacuum operation replace electrolytics (which outgas). LC filter design includes margin for component degradation over 15+ year missions.',
    stats: [
      { value: '15+ yr', label: 'Mission lifetime', icon: '🕐' },
      { value: '<1mV', label: 'Science instrument ripple', icon: '🔬' },
      { value: '100 krad', label: 'Radiation tolerance', icon: '☢️' }
    ],
    examples: ['James Webb Space Telescope', 'Mars rovers', 'Starlink satellites', 'GPS constellation'],
    companies: ['BAE Systems', 'Microchip (Microsemi)', 'Cobham', 'Vicor'],
    futureImpact: 'Deep-space missions and lunar bases will need autonomous power management with AI-driven ripple optimization and self-healing converter topologies.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BuckConverterRippleRenderer: React.FC<BuckConverterRippleRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [vinput, setVinput] = useState(12);        // V
  const [voutput, setVoutput] = useState(3.3);      // V
  const [switchFreq, setSwitchFreq] = useState(500); // kHz
  const [inductance, setInductance] = useState(10);  // uH
  const [outputCap, setOutputCap] = useState(22);    // uF
  const [loadCurrent, setLoadCurrent] = useState(1); // A
  const [animFrame, setAnimFrame] = useState(0);

  // Twist state - light load exploration
  const [twistLoad, setTwistLoad] = useState(1.0); // A

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // ── Derived calculations ──────────────────────────────────────────────────
  const dutyCycle = Math.min(0.95, Math.max(0.05, voutput / vinput));
  const period_us = 1000 / switchFreq; // period in us
  const tOn = dutyCycle * period_us;
  const tOff = (1 - dutyCycle) * period_us;

  // Inductor current ripple: deltaIL = Vout * (1 - D) / (L * f)
  const deltaIL = (voutput * (1 - dutyCycle)) / (inductance * 1e-6 * switchFreq * 1e3);

  // CCM/DCM boundary: CCM when Iload > deltaIL/2
  const isCCM = loadCurrent > deltaIL / 2;
  const boundaryLoad = deltaIL / 2;

  // Output voltage ripple: Vripple = deltaIL / (8 * f * Cout)
  const vRipple_mV = (deltaIL / (8 * switchFreq * 1e3 * outputCap * 1e-6)) * 1000;

  // Ripple percentage
  const ripplePercent = (vRipple_mV / (voutput * 1000)) * 100;

  // Twist phase calculations
  const twistDeltaIL = (voutput * (1 - dutyCycle)) / (inductance * 1e-6 * switchFreq * 1e3);
  const twistIsCCM = twistLoad > twistDeltaIL / 2;
  const twistRipple_mV = twistIsCCM
    ? (twistDeltaIL / (8 * switchFreq * 1e3 * outputCap * 1e-6)) * 1000
    : (twistDeltaIL / (8 * switchFreq * 1e3 * outputCap * 1e-6)) * 1000 * 1.5; // DCM has ~50% worse ripple

  // Animation
  useEffect(() => {
    if (phase !== 'hook' && phase !== 'play' && phase !== 'twist_play') return;
    const timer = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, [phase]);

  // Emit events
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'buck_converter_ripple',
      gameTitle: 'Buck Converter Ripple',
      details,
      timestamp: Date.now()
    });
  }, [onGameEvent]);

  useEffect(() => {
    emitEvent('game_started');
  }, [emitEvent]);

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
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
    hook: 'Hook', predict: 'Predict', play: 'Explore', review: 'Review',
    twist_predict: 'Twist', twist_play: 'Deep Dive', twist_review: 'Insight',
    transfer: 'Real World', test: 'Knowledge Test', mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    emitEvent('phase_changed', { from: phase, to: p });
    setPhase(p);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ── SVG: Buck Converter Schematic ─────────────────────────────────────────
  const renderBuckSchematic = (width: number, height: number, showWaveforms: boolean, highlightRipple: boolean) => {
    const t = animFrame / 360; // 0..1 animation cycle
    const switchOn = (t % 1) < dutyCycle;

    // Schematic coordinates
    const schH = showWaveforms ? height * 0.35 : height * 0.6;
    const waveH = height - schH - 20;
    const waveY = schH + 20;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgSecondary, borderRadius: '12px' }}>
        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="600" textAnchor="middle">
          Buck Converter Topology
        </text>

        {/* Input voltage source */}
        <rect x={20} y={40} width={40} height={schH - 80} rx={4} fill="none" stroke={colors.warning} strokeWidth={1.5} />
        <text x={40} y={schH / 2 + 5} fill={colors.warning} fontSize="11" fontWeight="600" textAnchor="middle">
          {vinput}V
        </text>
        <text x={40} y={schH / 2 + 18} fill={colors.textMuted} fontSize="9" textAnchor="middle">Vin</text>

        {/* MOSFET switch */}
        <line x1={60} y1={45} x2={110} y2={45} stroke={switchOn ? colors.success : colors.error} strokeWidth={2} />
        <rect x={100} y={30} width={40} height={30} rx={4} fill={switchOn ? `${colors.success}33` : `${colors.error}22`} stroke={switchOn ? colors.success : colors.error} strokeWidth={1.5} />
        <text x={120} y={50} fill={switchOn ? colors.success : colors.error} fontSize="9" fontWeight="600" textAnchor="middle">
          {switchOn ? 'ON' : 'OFF'}
        </text>
        <text x={120} y={24} fill={colors.textMuted} fontSize="8" textAnchor="middle">Q1 (MOSFET)</text>

        {/* Switch node label */}
        <circle cx={155} cy={45} r={3} fill={colors.accent} />
        <text x={155} y={38} fill={colors.accent} fontSize="8" textAnchor="middle">SW</text>

        {/* Inductor */}
        <line x1={140} y1={45} x2={165} y2={45} stroke={colors.textSecondary} strokeWidth={1.5} />
        {/* Coil shape */}
        {[0, 1, 2, 3].map(i => (
          <path
            key={i}
            d={`M ${170 + i * 18} 45 Q ${179 + i * 18} 30, ${188 + i * 18} 45`}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
          />
        ))}
        <line x1={242} y1={45} x2={265} y2={45} stroke={colors.textSecondary} strokeWidth={1.5} />
        <text x={205} y={70} fill={colors.accent} fontSize="10" fontWeight="600" textAnchor="middle">
          L={inductance}uH
        </text>

        {/* Output capacitor */}
        <line x1={280} y1={45} x2={280} y2={60} stroke={colors.textSecondary} strokeWidth={1.5} />
        <line x1={268} y1={62} x2={292} y2={62} stroke="#8B5CF6" strokeWidth={2.5} />
        <line x1={268} y1={70} x2={292} y2={70} stroke="#8B5CF6" strokeWidth={2.5} />
        <line x1={280} y1={72} x2={280} y2={schH - 40} stroke={colors.textSecondary} strokeWidth={1.5} />
        <text x={280} y={90} fill="#8B5CF6" fontSize="9" fontWeight="600" textAnchor="middle">
          {outputCap}uF
        </text>

        {/* Load resistor */}
        <line x1={330} y1={45} x2={330} y2={55} stroke={colors.textSecondary} strokeWidth={1.5} />
        <rect x={322} y={55} width={16} height={schH - 110} rx={2} fill="none" stroke={colors.warning} strokeWidth={1.5} />
        <text x={330} y={schH / 2 + 10} fill={colors.warning} fontSize="8" fontWeight="600" textAnchor="middle" transform={`rotate(-90 330 ${schH / 2 + 10})`}>
          LOAD
        </text>
        <line x1={330} y1={schH - 55} x2={330} y2={schH - 40} stroke={colors.textSecondary} strokeWidth={1.5} />

        {/* Connection lines top */}
        <line x1={265} y1={45} x2={340} y2={45} stroke={colors.textSecondary} strokeWidth={1.5} />

        {/* Diode */}
        <line x1={155} y1={45} x2={155} y2={schH - 55} stroke={colors.textSecondary} strokeWidth={1.5} />
        <polygon points={`145,${schH - 65} 165,${schH - 65} 155,${schH - 50}`} fill={!switchOn ? colors.success : colors.textMuted} stroke={!switchOn ? colors.success : colors.textMuted} strokeWidth={1} />
        <line x1={145} y1={schH - 50} x2={165} y2={schH - 50} stroke={!switchOn ? colors.success : colors.textMuted} strokeWidth={2} />
        <text x={155} y={schH - 30} fill={colors.textMuted} fontSize="8" textAnchor="middle">D1</text>

        {/* Ground lines */}
        <line x1={20} y1={schH - 40} x2={340} y2={schH - 40} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="4,2" />
        <text x={width / 2} y={schH - 26} fill={colors.textMuted} fontSize="8" textAnchor="middle">GND</text>

        {/* Output voltage label */}
        <line x1={340} y1={45} x2={width - 20} y2={45} stroke={colors.success} strokeWidth={1.5} />
        <rect x={width - 75} y={32} width={55} height={26} rx={6} fill={`${colors.success}22`} stroke={colors.success} strokeWidth={1} />
        <text x={width - 48} y={49} fill={colors.success} fontSize="11" fontWeight="700" textAnchor="middle">
          {voutput.toFixed(1)}V
        </text>

        {/* Ripple indicator on output */}
        {highlightRipple && (
          <>
            <line x1={width - 90} y1={35} x2={width - 90} y2={55} stroke={colors.error} strokeWidth={1} strokeDasharray="2,2" />
            <text x={width - 90} y={65} fill={colors.error} fontSize="8" fontWeight="600" textAnchor="middle">
              {vRipple_mV.toFixed(1)}mV pp
            </text>
          </>
        )}

        {/* CCM/DCM indicator */}
        <rect x={width - 85} y={schH - 22} width={70} height={18} rx={9} fill={isCCM ? `${colors.success}33` : `${colors.warning}33`} stroke={isCCM ? colors.success : colors.warning} strokeWidth={1} />
        <text x={width - 50} y={schH - 10} fill={isCCM ? colors.success : colors.warning} fontSize="9" fontWeight="600" textAnchor="middle">
          {isCCM ? 'CCM' : 'DCM'}
        </text>

        {/* ── Waveform plots ─────────────────────────────────────────────── */}
        {showWaveforms && (
          <g>
            {/* Switch node voltage waveform */}
            {(() => {
              const wy = waveY;
              const wh = waveH * 0.28;
              const ww = width - 60;
              const wx = 40;
              const cycles = 3;

              // Build square wave path
              let swPath = `M ${wx} ${wy + wh}`;
              for (let c = 0; c < cycles; c++) {
                const cx0 = wx + (c / cycles) * ww;
                const cxOn = wx + ((c + dutyCycle) / cycles) * ww;
                const cx1 = wx + ((c + 1) / cycles) * ww;
                swPath += ` L ${cx0} ${wy + wh} L ${cx0} ${wy + 4} L ${cxOn} ${wy + 4} L ${cxOn} ${wy + wh} L ${cx1} ${wy + wh}`;
              }

              return (
                <g>
                  <text x={15} y={wy + wh / 2 + 4} fill={colors.warning} fontSize="9" fontWeight="600" textAnchor="middle" transform={`rotate(-90 15 ${wy + wh / 2 + 4})`}>
                    V_SW
                  </text>
                  <rect x={wx - 2} y={wy - 2} width={ww + 4} height={wh + 8} rx={4} fill={`${colors.bgPrimary}`} stroke={colors.border} strokeWidth={0.5} />
                  <path d={swPath} fill="none" stroke={colors.warning} strokeWidth={1.5} />
                  <text x={wx + ww + 5} y={wy + 10} fill={colors.textMuted} fontSize="7">{vinput}V</text>
                  <text x={wx + ww + 5} y={wy + wh} fill={colors.textMuted} fontSize="7">0V</text>
                </g>
              );
            })()}

            {/* Inductor current waveform */}
            {(() => {
              const wy2 = waveY + waveH * 0.34;
              const wh2 = waveH * 0.28;
              const ww = width - 60;
              const wx = 40;
              const cycles = 3;

              // Current values
              const iAvg = loadCurrent;
              const iMax = isCCM ? iAvg + deltaIL / 2 : deltaIL;
              const iMin = isCCM ? iAvg - deltaIL / 2 : 0;
              const scaleMax = Math.max(iMax * 1.2, 0.5);

              const yForI = (i: number) => wy2 + wh2 - (i / scaleMax) * wh2;

              let ilPath = `M ${wx} ${yForI(isCCM ? iMin : 0)}`;
              for (let c = 0; c < cycles; c++) {
                const cx0 = wx + (c / cycles) * ww;
                const cxOn = wx + ((c + dutyCycle) / cycles) * ww;
                const cx1 = wx + ((c + 1) / cycles) * ww;
                if (isCCM) {
                  ilPath += ` L ${cx0} ${yForI(iMin)} L ${cxOn} ${yForI(iMax)} L ${cx1} ${yForI(iMin)}`;
                } else {
                  // DCM: rises during tOn, falls during part of tOff, stays at zero
                  const fallEnd = cxOn + (cx1 - cxOn) * 0.6;
                  ilPath += ` L ${cx0} ${yForI(0)} L ${cxOn} ${yForI(iMax)} L ${fallEnd} ${yForI(0)} L ${cx1} ${yForI(0)}`;
                }
              }

              return (
                <g>
                  <text x={15} y={wy2 + wh2 / 2 + 4} fill={colors.accent} fontSize="9" fontWeight="600" textAnchor="middle" transform={`rotate(-90 15 ${wy2 + wh2 / 2 + 4})`}>
                    I_L
                  </text>
                  <rect x={wx - 2} y={wy2 - 2} width={ww + 4} height={wh2 + 8} rx={4} fill={`${colors.bgPrimary}`} stroke={colors.border} strokeWidth={0.5} />
                  {/* DC average line */}
                  <line x1={wx} y1={yForI(iAvg)} x2={wx + ww} y2={yForI(iAvg)} stroke={colors.accent} strokeWidth={0.5} strokeDasharray="4,3" />
                  <path d={ilPath} fill="none" stroke={colors.accent} strokeWidth={1.5} />
                  <text x={wx + ww + 5} y={yForI(iMax) + 4} fill={colors.textMuted} fontSize="7">{iMax.toFixed(2)}A</text>
                  <text x={wx + ww + 5} y={yForI(iMin) + 4} fill={colors.textMuted} fontSize="7">{iMin.toFixed(2)}A</text>
                  {/* deltaIL label */}
                  {highlightRipple && (
                    <>
                      <line x1={wx + ww * 0.85} y1={yForI(iMax)} x2={wx + ww * 0.85} y2={yForI(iMin)} stroke={colors.error} strokeWidth={1} markerEnd="url(#arrowDown)" markerStart="url(#arrowUp)" />
                      <text x={wx + ww * 0.85 - 4} y={yForI(iAvg) + 3} fill={colors.error} fontSize="8" fontWeight="600" textAnchor="end">
                        dI={deltaIL.toFixed(2)}A
                      </text>
                    </>
                  )}
                </g>
              );
            })()}

            {/* Output voltage waveform (ripple) */}
            {(() => {
              const wy3 = waveY + waveH * 0.68;
              const wh3 = waveH * 0.28;
              const ww = width - 60;
              const wx = 40;
              const cycles = 3;
              const rippleScale = Math.max(vRipple_mV * 3, 10); // mV full scale

              const yForV = (mvOffset: number) => wy3 + wh3 / 2 - (mvOffset / rippleScale) * (wh3 / 2);

              // Output ripple is approximately a triangle wave
              let voutPath = `M ${wx} ${yForV(0)}`;
              for (let c = 0; c < cycles; c++) {
                const cx0 = wx + (c / cycles) * ww;
                const cxMid = wx + ((c + 0.5) / cycles) * ww;
                const cx1 = wx + ((c + 1) / cycles) * ww;
                voutPath += ` L ${cx0} ${yForV(-vRipple_mV / 2)} L ${cxMid} ${yForV(vRipple_mV / 2)} L ${cx1} ${yForV(-vRipple_mV / 2)}`;
              }

              return (
                <g>
                  <text x={15} y={wy3 + wh3 / 2 + 4} fill={colors.success} fontSize="9" fontWeight="600" textAnchor="middle" transform={`rotate(-90 15 ${wy3 + wh3 / 2 + 4})`}>
                    V_out
                  </text>
                  <rect x={wx - 2} y={wy3 - 2} width={ww + 4} height={wh3 + 8} rx={4} fill={`${colors.bgPrimary}`} stroke={colors.border} strokeWidth={0.5} />
                  {/* DC level */}
                  <line x1={wx} y1={yForV(0)} x2={wx + ww} y2={yForV(0)} stroke={colors.success} strokeWidth={0.5} strokeDasharray="4,3" />
                  <path d={voutPath} fill="none" stroke={colors.success} strokeWidth={1.5} />

                  {/* Ripple amplitude arrow */}
                  {highlightRipple && (
                    <>
                      <line x1={wx + 20} y1={yForV(vRipple_mV / 2)} x2={wx + 20} y2={yForV(-vRipple_mV / 2)} stroke={colors.error} strokeWidth={1.5} />
                      <line x1={wx + 16} y1={yForV(vRipple_mV / 2)} x2={wx + 24} y2={yForV(vRipple_mV / 2)} stroke={colors.error} strokeWidth={1} />
                      <line x1={wx + 16} y1={yForV(-vRipple_mV / 2)} x2={wx + 24} y2={yForV(-vRipple_mV / 2)} stroke={colors.error} strokeWidth={1} />
                      <text x={wx + 30} y={yForV(0) + 3} fill={colors.error} fontSize="9" fontWeight="700">
                        {vRipple_mV.toFixed(1)}mV
                      </text>
                    </>
                  )}
                  <text x={wx + ww + 5} y={wy3 + wh3 / 2 + 3} fill={colors.success} fontSize="7">{voutput.toFixed(1)}V</text>
                </g>
              );
            })()}

            {/* Arrow marker definitions */}
            <defs>
              <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
                <path d="M 0 6 L 3 0 L 6 6" fill={colors.error} />
              </marker>
              <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
                <path d="M 0 0 L 3 6 L 6 0" fill={colors.error} />
              </marker>
            </defs>
          </g>
        )}
      </svg>
    );
  };

  // ── Progress bar ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <nav style={{
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
        background: `linear-gradient(90deg, ${colors.accent}, #0891B2)`,
        transition: 'width 0.5s ease',
      }} />
    </nav>
  );

  // ── Nav dots ──────────────────────────────────────────────────────────────
  const renderNavDots = () => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: `linear-gradient(to top, ${colors.bgPrimary}, ${colors.bgPrimary}ee)`,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 1000,
      borderTop: `1px solid ${colors.border}`,
    }}>
      <button
        onClick={() => { const ci = phaseOrder.indexOf(phase); if (ci > 0) goToPhase(phaseOrder[ci - 1]); }}
        disabled={phaseOrder.indexOf(phase) === 0}
        style={{
          background: 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '8px 12px',
          color: phaseOrder.indexOf(phase) === 0 ? colors.border : colors.textSecondary,
          cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
      >
        &larr;
      </button>
      <div style={{
        display: 'flex',
        gap: '4px',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
      }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px 4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
            title={phaseLabels[p]}
          >
            <div style={{
              width: p === phase ? '12px' : '8px',
              height: p === phase ? '12px' : '8px',
              borderRadius: '50%',
              background: i <= phaseOrder.indexOf(phase) ? colors.accent : colors.border,
              transition: 'all 0.3s ease',
            }} />
          </button>
        ))}
      </div>
      <button
        onClick={() => { const ci = phaseOrder.indexOf(phase); if (ci < phaseOrder.length - 1) { playSound('transition'); goToPhase(phaseOrder[ci + 1]); } }}
        disabled={phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test'}
        style={{
          background: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? colors.border : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'white',
          cursor: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
      >
        &rarr;
      </button>
    </nav>
  );

  // ── Primary button style ──────────────────────────────────────────────────
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    minHeight: '44px',
    borderRadius: '12px',
    fontSize: isMobile ? '15px' : '17px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  };

  // ── Slider component ─────────────────────────────────────────────────────
  const Slider = ({ label, value, min, max, step, unit, onChange, color: sliderColor }: {
    label: string; value: number; min: number; max: number; step: number; unit: string;
    onChange: (v: number) => void; color?: string;
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: sliderColor || colors.accent, fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => { onChange(parseFloat(e.target.value)); emitEvent('slider_changed', { label, value: parseFloat(e.target.value) }); }}
        style={{ touchAction: 'pan-y', width: '100%', height: '20px', borderRadius: '4px', WebkitAppearance: 'none' as const, accentColor: sliderColor || colors.accent, cursor: 'pointer' }}
      />
    </div>
  );

  // =========================================================================
  // HOOK PHASE
  // =========================================================================
  if (phase === 'hook') {
    const rippleOffset = Math.sin(animFrame * 0.15) * 3;
    return (
      <div style={{
        minHeight: '100dvh',
        background: `radial-gradient(ellipse at center, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
          <span role="img" aria-label="voltage">&#9889;</span>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Your 3.3V Rail Is Wobbling
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '24px' }}>
          You designed a perfect 3.3V power supply. But zoom in on the oscilloscope and you see it:
          <span style={{ color: colors.error, fontWeight: 700 }}> +/- 50mV of ripple</span>,
          dancing at the switching frequency. Your ADC is reading noise, your PLL is jittering, and your RF frontend is spraying spurious emissions.
        </p>

        {/* Animated ripple visualization */}
        <svg width={Math.min(400, isMobile ? 320 : 400)} height={120} viewBox="0 0 400 120" style={{ marginBottom: '24px' }}>
          <rect width={400} height={120} rx={12} fill={colors.bgSecondary} />
          {/* DC level */}
          <line x1={20} y1={60} x2={380} y2={60} stroke={colors.success} strokeWidth={1} strokeDasharray="6,3" />
          <text x={15} y={55} fill={colors.success} fontSize="10" textAnchor="end">3.3V</text>
          {/* Ripple waveform */}
          <path
            d={Array.from({ length: 40 }, (_, i) => {
              const x = 20 + i * 9;
              const y = 60 + Math.sin((i * 0.5) + animFrame * 0.1) * (12 + rippleOffset);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none" stroke={colors.error} strokeWidth={2}
          />
          <text x={200} y={105} fill={colors.error} fontSize="12" fontWeight="700" textAnchor="middle">
            +/- {(25 + rippleOffset * 5).toFixed(0)}mV ripple
          </text>
          <text x={200} y={18} fill={colors.textMuted} fontSize="10" textAnchor="middle">
            Oscilloscope: Output Voltage (AC-coupled, 20mV/div)
          </text>
        </svg>

        <p style={{ ...typo.body, color: colors.accent, maxWidth: '500px', marginBottom: '32px', fontWeight: 600 }}>
          Where does this ripple come from? Can you tame it?
        </p>

        <div style={{ width: '80px', height: '2px', background: `rgba(6, 182, 212, 0.6)`, margin: '0 auto 24px' }} />

        <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
          Investigate the Ripple &rarr;
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // PREDICT PHASE
  // =========================================================================
  if (phase === 'predict') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A buck converter produces output voltage ripple because the inductor current is a triangle wave, and the output capacitor must absorb/supply the AC component. The ripple depends on inductor value, capacitance, and switching frequency.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            Make Your Prediction
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '16px', fontWeight: 600 }}>
              Your buck converter has excessive output ripple. Which single change will reduce ripple more?
            </p>
            <div style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Starting conditions: Vin=12V, Vout=3.3V, L=10uH, Cout=22uF, f_sw=500kHz
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              { id: 'a', label: 'Doubling the switching frequency (500kHz to 1MHz) reduces ripple more' },
              { id: 'b', label: 'Doubling the output capacitance (22uF to 44uF) reduces ripple more' },
              { id: 'c', label: 'Both changes reduce ripple by exactly the same amount' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  emitEvent('prediction_made', { prediction: opt.id });
                }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '28px', marginRight: '12px',
                  fontSize: '13px', fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Test My Prediction &rarr;
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // PLAY PHASE - Interactive Buck Converter Simulation
  // =========================================================================
  if (phase === 'play') {
    const meetsSpec = vRipple_mV < 10;
    const svgW = isMobile ? 360 : 440;
    const svgH = isMobile ? 380 : 420;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '900px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Design for Low Ripple
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px', textAlign: 'center' }}>
            Adjust the buck converter parameters to achieve &lt;10mV output ripple
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '24px',
            marginBottom: '24px',
          }}>
            {/* SVG on left */}
            <div style={{ flex: isMobile ? 'none' : '1 1 55%', minWidth: 0 }}>
              {renderBuckSchematic(svgW, svgH, true, true)}
            </div>

            {/* Controls on right */}
            <div style={{
              flex: isMobile ? 'none' : '1 1 45%',
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Parameters</h3>

              <Slider label="Input Voltage (Vin)" value={vinput} min={5} max={48} step={1} unit="V" onChange={setVinput} color={colors.warning} />
              <Slider label="Output Voltage (Vout)" value={voutput} min={0.8} max={vinput - 0.5} step={0.1} unit="V" onChange={(v) => setVoutput(Math.min(v, vinput - 0.5))} color={colors.success} />

              <div style={{
                background: `${colors.accent}11`, borderRadius: '8px', padding: '8px 12px', marginBottom: '16px',
              }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Duty Cycle (D = Vout/Vin): </span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>{(dutyCycle * 100).toFixed(1)}%</span>
              </div>

              <Slider label="Switching Frequency" value={switchFreq} min={100} max={2000} step={50} unit=" kHz" onChange={setSwitchFreq} />
              <Slider label="Inductance (L)" value={inductance} min={1} max={100} step={0.5} unit=" uH" onChange={setInductance} color={colors.accent} />
              <Slider label="Output Capacitance (Cout)" value={outputCap} min={1} max={200} step={1} unit=" uF" onChange={setOutputCap} color="#8B5CF6" />
              <Slider label="Load Current" value={loadCurrent} min={0.01} max={5} step={0.01} unit=" A" onChange={setLoadCurrent} color={colors.warning} />

              {/* Results grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: meetsSpec ? colors.success : colors.error }}>
                    {vRipple_mV.toFixed(1)}mV
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Output Ripple</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>
                    {deltaIL.toFixed(2)}A
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Inductor Ripple (dI)</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: isCCM ? colors.success : colors.warning }}>
                    {isCCM ? 'CCM' : 'DCM'}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Conduction Mode</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: ripplePercent < 0.5 ? colors.success : ripplePercent < 1 ? colors.warning : colors.error }}>
                    {ripplePercent.toFixed(2)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Ripple %</div>
                </div>
              </div>
            </div>
          </div>

          {/* Spec status */}
          {meetsSpec && (
            <div style={{
              background: `${colors.success}22`, border: `1px solid ${colors.success}`,
              borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0, fontWeight: 600 }}>
                Ripple spec met! Output ripple is below 10mV. Notice how L, C, and f_sw all contribute to filtering.
              </p>
            </div>
          )}

          {/* Formulas */}
          <div style={{
            background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`,
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Key Formulas:</strong> {' '}
              dI_L = Vout(1-D) / (L * f_sw) = {deltaIL.toFixed(3)}A {' | '}
              V_ripple = dI_L / (8 * f * Cout) = {vRipple_mV.toFixed(2)}mV {' | '}
              CCM boundary: I_load &gt; dI_L/2 = {boundaryLoad.toFixed(3)}A
            </p>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Understand the Physics &rarr;
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // REVIEW PHASE
  // =========================================================================
  if (phase === 'review') {
    const predCorrect = prediction === 'a'; // Doubling frequency reduces ripple more (1/f^2 vs 1/C)
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Buck Converter Ripple
          </h2>

          {/* Prediction review */}
          <div style={{
            background: predCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${predCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: predCorrect ? colors.success : colors.warning, margin: 0 }}>
              {prediction
                ? (predCorrect
                  ? "Correct! Doubling frequency is more effective. It reduces the inductor ripple current AND improves the capacitor filtering, giving roughly a 4x reduction vs 2x for doubling capacitance."
                  : "Interesting prediction! Actually, doubling frequency reduces ripple by ~4x (since both dI_L and the filter improve), while doubling capacitance only reduces it by 2x. Frequency is the stronger lever.")
                : "The key insight is that increasing switching frequency has a compounding effect on ripple reduction."}
            </p>
          </div>

          {/* LC Filter concept */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Buck Converter as an LC Low-Pass Filter</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The switch creates a <span style={{ color: colors.warning }}>square wave</span> at the switch node. The inductor and output capacitor form a second-order low-pass filter that extracts the DC component and attenuates the switching-frequency ripple.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.accent }}>Step 1 - Inductor Current Ripple:</strong><br />
                dI_L = V_out * (1 - D) / (L * f_sw)<br />
                The inductor smooths the current, but a triangle-wave ripple remains. Larger L or higher f reduces this ripple.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#8B5CF6' }}>Step 2 - Capacitor Filtering:</strong><br />
                V_ripple = dI_L / (8 * f_sw * C_out)<br />
                The output capacitor absorbs the AC component of inductor current. The 1/(8*f*C) factor comes from integrating the triangle wave.
              </p>
              <p>
                <strong style={{ color: colors.success }}>Combined Effect:</strong><br />
                V_ripple = V_out * (1-D) / (8 * L * f_sw^2 * C_out)<br />
                Ripple is proportional to <span style={{ color: colors.error, fontWeight: 700 }}>1/f^2</span> - this is why frequency is such a powerful lever!
              </p>
            </div>
          </div>

          {/* Key takeaways */}
          <div style={{
            background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`,
            borderRadius: '12px', padding: '20px', marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Takeaways</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Higher switching frequency reduces ripple quadratically (1/f^2)',
                'Larger inductance reduces inductor current ripple linearly',
                'Larger output capacitance reduces voltage ripple linearly',
                'Duty cycle (Vin/Vout ratio) affects ripple through the (1-D) term',
                'In practice, ESR of the capacitor often dominates ripple at high frequencies',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: colors.success, marginTop: '2px' }}>&#10003;</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Explore the Twist &rarr;
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // TWIST PREDICT PHASE
  // =========================================================================
  if (phase === 'twist_predict') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`, borderRadius: '12px', padding: '16px',
            marginBottom: '24px', borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.warning }}>New scenario:</strong> Your buck converter works perfectly at full load (1A).
              But the system enters sleep mode and the load drops to just 10mA.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            What Happens at Light Load?
          </h2>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
              When the load current drops from 1A to 10mA, what happens to the inductor current and output behavior?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              { id: 'a', label: 'Nothing changes - the converter keeps switching normally with lower average current' },
              { id: 'b', label: 'The inductor current reaches zero each cycle, entering discontinuous conduction mode (DCM)' },
              { id: 'c', label: 'The output voltage collapses because there is not enough load' },
              { id: 'd', label: 'The switching frequency automatically increases to compensate' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  setTwistPrediction(opt.id);
                  emitEvent('prediction_made', { twistPrediction: opt.id });
                }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px', padding: '16px', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontSize: '13px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              See What Really Happens &rarr;
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // TWIST PLAY PHASE - CCM vs DCM exploration
  // =========================================================================
  if (phase === 'twist_play') {
    const twistSvgW = isMobile ? 360 : 440;
    const twistSvgH = isMobile ? 300 : 340;

    // DCM waveform rendering
    const renderDCMComparison = () => {
      const w = twistSvgW;
      const h = twistSvgH;
      const twistDelta = twistDeltaIL;
      const twistBoundary = twistDelta / 2;

      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: colors.bgSecondary, borderRadius: '12px' }}>
          <text x={w / 2} y={18} fill={colors.textPrimary} fontSize="12" fontWeight="600" textAnchor="middle">
            Inductor Current: CCM vs DCM
          </text>

          {/* CCM waveform (top half) */}
          <text x={15} y={50} fill={colors.success} fontSize="10" fontWeight="600">CCM (I_load &gt; {twistBoundary.toFixed(2)}A)</text>
          <rect x={20} y={55} width={w - 40} height={h * 0.35} rx={4} fill={colors.bgPrimary} stroke={colors.border} strokeWidth={0.5} />
          {(() => {
            const cy = 55 + h * 0.175;
            const ch = h * 0.3;
            const cw = w - 60;
            const cx = 30;
            const iHigh = 1 + twistDelta / 2;
            const iLow = 1 - twistDelta / 2;
            const scale = Math.max(iHigh * 1.3, 1);
            const yFor = (i: number) => cy + ch / 2 - (i / scale) * (ch / 2);
            let path = `M ${cx} ${yFor(iLow)}`;
            for (let c = 0; c < 3; c++) {
              const x0 = cx + (c / 3) * cw;
              const xM = cx + ((c + dutyCycle) / 3) * cw;
              const x1 = cx + ((c + 1) / 3) * cw;
              path += ` L ${x0} ${yFor(iLow)} L ${xM} ${yFor(iHigh)} L ${x1} ${yFor(iLow)}`;
            }
            return (
              <g>
                <line x1={cx} y1={yFor(1)} x2={cx + cw} y2={yFor(1)} stroke={colors.success} strokeWidth={0.5} strokeDasharray="3,3" />
                <path d={path} fill="none" stroke={colors.success} strokeWidth={2} />
                <text x={cx + cw + 5} y={yFor(1) + 3} fill={colors.textMuted} fontSize="8">1A avg</text>
              </g>
            );
          })()}

          {/* DCM waveform (bottom half) */}
          <text x={15} y={55 + h * 0.38 + 15} fill={colors.warning} fontSize="10" fontWeight="600">DCM (I_load = {twistLoad.toFixed(2)}A)</text>
          <rect x={20} y={55 + h * 0.38 + 20} width={w - 40} height={h * 0.35} rx={4} fill={colors.bgPrimary} stroke={colors.border} strokeWidth={0.5} />
          {(() => {
            const by = 55 + h * 0.38 + 20 + h * 0.175;
            const bh = h * 0.3;
            const bw = w - 60;
            const bx = 30;
            const iPeak = twistIsCCM ? twistLoad + twistDelta / 2 : twistDelta;
            const scale = Math.max(iPeak * 1.3, 0.5);
            const yFor = (i: number) => by + bh / 2 - (i / scale) * (bh / 2);

            let path = `M ${bx} ${yFor(0)}`;
            for (let c = 0; c < 3; c++) {
              const x0 = bx + (c / 3) * bw;
              const xM = bx + ((c + dutyCycle) / 3) * bw;
              const x1 = bx + ((c + 1) / 3) * bw;
              if (twistIsCCM) {
                const iL = twistLoad - twistDelta / 2;
                const iH = twistLoad + twistDelta / 2;
                path += ` L ${x0} ${yFor(iL)} L ${xM} ${yFor(iH)} L ${x1} ${yFor(iL)}`;
              } else {
                const fallEnd = xM + (x1 - xM) * 0.5;
                path += ` L ${x0} ${yFor(0)} L ${xM} ${yFor(iPeak)} L ${fallEnd} ${yFor(0)} L ${x1} ${yFor(0)}`;
              }
            }
            return (
              <g>
                <line x1={bx} y1={yFor(0)} x2={bx + bw} y2={yFor(0)} stroke={colors.warning} strokeWidth={0.5} strokeDasharray="3,3" />
                <path d={path} fill="none" stroke={colors.warning} strokeWidth={2} />
                {!twistIsCCM && (
                  <text x={bx + bw * 0.75} y={yFor(0) - 5} fill={colors.error} fontSize="9" fontWeight="600">
                    I_L = 0 (dead time)
                  </text>
                )}
                <text x={bx + bw + 5} y={yFor(twistLoad) + 3} fill={colors.textMuted} fontSize="8">{twistLoad.toFixed(2)}A</text>
              </g>
            );
          })()}

          {/* Mode indicator */}
          <rect x={w / 2 - 50} y={h - 22} width={100} height={18} rx={9} fill={twistIsCCM ? `${colors.success}33` : `${colors.warning}33`} stroke={twistIsCCM ? colors.success : colors.warning} strokeWidth={1} />
          <text x={w / 2} y={h - 10} fill={twistIsCCM ? colors.success : colors.warning} fontSize="10" fontWeight="600" textAnchor="middle">
            {twistIsCCM ? 'CCM' : 'DCM'}
          </text>
        </svg>
      );
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '900px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            CCM vs DCM: The Light-Load Transition
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px', textAlign: 'center' }}>
            Reduce the load current and watch the inductor current behavior change
          </p>

          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '24px',
            marginBottom: '24px',
          }}>
            {/* Waveform comparison */}
            <div style={{ flex: isMobile ? 'none' : '1 1 55%', minWidth: 0 }}>
              {renderDCMComparison()}
            </div>

            {/* Controls */}
            <div style={{
              flex: isMobile ? 'none' : '1 1 45%',
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Load Current</h3>

              <Slider label="Load Current" value={twistLoad} min={0.01} max={2} step={0.01} unit=" A" onChange={setTwistLoad} color={colors.warning} />

              <div style={{
                background: colors.bgSecondary, borderRadius: '10px', padding: '12px', marginBottom: '16px',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>CCM/DCM Boundary</div>
                <div style={{ ...typo.h3, color: colors.accent }}>
                  {(twistDeltaIL / 2).toFixed(3)} A
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>
                  Load {twistIsCCM ? '>' : '<'} dI_L/2 = {twistIsCCM ? 'Continuous (CCM)' : 'Discontinuous (DCM)'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: twistIsCCM ? colors.success : colors.warning }}>
                    {twistIsCCM ? 'CCM' : 'DCM'}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Mode</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: twistRipple_mV > 20 ? colors.error : colors.accent }}>
                    {twistRipple_mV.toFixed(1)}mV
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Output Ripple</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>
                    {twistDeltaIL.toFixed(2)}A
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>dI_L</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>
                    {(dutyCycle * 100).toFixed(1)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Duty Cycle</div>
                </div>
              </div>

              {!twistIsCCM && (
                <div style={{
                  background: `${colors.warning}22`, border: `1px solid ${colors.warning}`,
                  borderRadius: '10px', padding: '12px', marginTop: '16px',
                }}>
                  <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                    <strong>DCM detected!</strong> The inductor current reaches zero during each switching cycle.
                    The switch node rings due to LC resonance, and the converter's behavior changes fundamentally.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Understand CCM vs DCM &rarr;
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // TWIST REVIEW PHASE
  // =========================================================================
  if (phase === 'twist_review') {
    const twistCorrect = twistPrediction === 'b';
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            CCM vs DCM: Why It Matters
          </h2>

          <div style={{
            background: twistCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${twistCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px', padding: '16px', marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: twistCorrect ? colors.success : colors.warning, margin: 0 }}>
              {twistPrediction
                ? (twistCorrect
                  ? "Correct! When load current drops below dI_L/2, the inductor current must reach zero each cycle, entering Discontinuous Conduction Mode (DCM)."
                  : "The key insight is that the inductor current cannot go negative in a standard buck converter (the diode blocks it). When the average current is less than half the ripple, current reaches zero - that's DCM.")
                : "The transition from CCM to DCM is one of the most important concepts in switching converter design."}
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>CCM vs DCM Comparison</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}33` }}>
                <h4 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>CCM</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    'Inductor current never reaches zero',
                    'Vout = D * Vin (simple relationship)',
                    'Lower RMS currents, higher efficiency',
                    'Predictable, fixed-frequency behavior',
                    'Easier to design the control loop',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ color: colors.success }}>&#8226;</span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: `${colors.warning}11`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.warning}33` }}>
                <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>DCM</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    'Inductor current reaches zero each cycle',
                    'Vout depends on load (not just D)',
                    'Higher peak currents, more loss',
                    'Switch node rings (LC resonance)',
                    'Output voltage tends to rise without load',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ color: colors.warning }}>&#8226;</span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`,
            borderRadius: '12px', padding: '20px', marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Efficiency Implications</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              At light loads, fixed-frequency CCM operation wastes energy because switching losses are constant regardless of power delivered.
              Modern controllers use <strong style={{ color: colors.textPrimary }}>PFM (Pulse Frequency Modulation)</strong> or
              <strong style={{ color: colors.textPrimary }}> pulse-skipping</strong> at light loads, intentionally entering DCM to reduce switching events.
              This trades ripple quality for dramatically better light-load efficiency - critical for battery-powered devices where the system spends most of its time in sleep mode.
            </p>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            See Real-World Applications &rarr;
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // =========================================================================
  // TRANSFER PHASE
  // =========================================================================
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Buck Converter Ripple"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  // =========================================================================
  // TEST PHASE
  // =========================================================================
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingBottom: '16px',
          overflowY: 'auto',
          flex: 1,
          paddingTop: '60px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '700px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '&#127881;' : '&#128218;'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              {passed
                ? `You've mastered Buck Converter Ripple!`
                : 'Review the concepts and try again.'}
            </p>

            {/* Grade */}
            <div style={{
              display: 'inline-block', padding: '8px 24px', borderRadius: '20px', marginBottom: '16px',
              background: testScore >= 9 ? `${colors.success}33` : testScore >= 7 ? `${colors.accent}33` : `${colors.warning}33`,
              border: `1px solid ${testScore >= 9 ? colors.success : testScore >= 7 ? colors.accent : colors.warning}`,
            }}>
              <span style={{ ...typo.h3, color: testScore >= 9 ? colors.success : testScore >= 7 ? colors.accent : colors.warning }}>
                Grade: {testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'Needs Review'}
              </span>
            </div>

            {/* Answer indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const isCorrect = testAnswers[i] === correctId;
                return (
                  <div key={i} style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isCorrect ? colors.success : colors.error,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700,
                  }}>
                    {isCorrect ? '\u2713' : '\u2717'}
                  </div>
                );
              })}
            </div>

            {/* Rich answer key */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
                Answer Key
              </h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const isCorrect = testAnswers[i] === correctId;
                const userAnswer = q.options.find(o => o.id === testAnswers[i]);
                const correctAnswer = q.options.find(o => o.correct);
                return (
                  <div key={i} style={{
                    background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                    border: `1px solid ${isCorrect ? colors.success : colors.error}33`,
                    borderRadius: '10px', padding: '14px', marginBottom: '10px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                        Q{i + 1}: {q.question.substring(0, 60)}...
                      </span>
                      <span style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, fontWeight: 700 }}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ ...typo.small, color: colors.error }}>Your answer: {userAnswer?.label?.substring(0, 80)}...</span>
                      </div>
                    )}
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>Correct: {correctAnswer?.label}</span>
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, margin: 0, fontStyle: 'italic' }}>
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {passed ? (
                <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
                  Complete Lesson &rarr;
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
                  Review &amp; Try Again
                </button>
              )}
              <a href="/games" style={{
                padding: '14px 28px', minHeight: '44px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}>
                Return to Games
              </a>
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Test question display
    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px',
            marginBottom: '16px', borderLeft: `3px solid ${colors.accent}`,
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
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button onClick={() => setCurrentQuestion(currentQuestion - 1)} style={{
                flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, cursor: 'pointer',
              }}>
                &larr; Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed', fontWeight: 600,
                }}
              >
                Next Question
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
                  emitEvent('game_completed', { score, total: 10 });
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', fontWeight: 600,
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

  // =========================================================================
  // MASTERY PHASE
  // =========================================================================
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
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '60px',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          &#127942;
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Buck Converter Ripple Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '16px' }}>
          You now understand how output voltage ripple is generated in buck converters and how to minimize it through proper component selection and operating conditions.
        </p>

        {/* Score summary */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px',
          maxWidth: '400px', width: '100%',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...typo.h2, color: colors.accent }}>{testScore}/10</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Test Score</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...typo.h2, color: colors.success }}>
                {testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : 'C'}
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Grade</div>
            </div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px',
          marginBottom: '32px', maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>You Learned:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'How the LC filter creates output voltage from a switch node square wave',
              'Ripple formula: Vripple = dIL / (8 * f * Cout)',
              'Frequency has a quadratic effect on ripple reduction',
              'CCM vs DCM transition and its implications',
              'ESR effects and capacitor selection for low ripple',
              'Light-load efficiency strategies (PFM, pulse-skipping)',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: colors.success, marginTop: '2px' }}>&#10003;</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => goToPhase('hook')} style={{
            padding: '14px 28px', minHeight: '44px', borderRadius: '10px',
            border: `1px solid ${colors.border}`, background: 'transparent',
            color: colors.textSecondary, cursor: 'pointer',
          }}>
            Play Again
          </button>
          <button
            onClick={() => {
              playSound('complete');
              emitEvent('game_completed', { score: testScore, total: 10, mastery: true });
              onGameEvent?.({
                eventType: 'achievement_unlocked',
                gameType: 'buck_converter_ripple',
                gameTitle: 'Buck Converter Ripple',
                details: { type: 'mastery_achieved', score: testScore, total: 10 },
                timestamp: Date.now()
              });
              window.location.href = '/games';
            }}
            style={{ ...primaryButtonStyle, textDecoration: 'none' }}
          >
            Complete Game
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default BuckConverterRippleRenderer;
