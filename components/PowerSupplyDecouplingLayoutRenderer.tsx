'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Power Supply Decoupling Layout - Complete 10-Phase Game (#252)
// PCB layout best practices: cap placement, via inductance, ground planes,
// and how bad layout negates even the best capacitor selection.
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

interface PowerSupplyDecouplingLayoutRendererProps {
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
    scenario: 'An engineer places a 100nF decoupling capacitor 15mm away from an IC power pin. The design works at 10 MHz but fails at 100 MHz with severe voltage droops.',
    question: 'What is the primary reason the layout fails at higher frequencies?',
    options: [
      { id: 'a', text: 'The 100nF capacitor is too large for 100 MHz operation' },
      { id: 'b', text: 'The 15mm trace adds ~15nH of loop inductance, increasing impedance at high frequencies beyond what the cap can compensate', correct: true },
      { id: 'c', text: 'The IC draws more current at higher frequencies' },
      { id: 'd', text: 'The capacitor has degraded from thermal cycling' },
    ],
    explanation: 'PCB traces add approximately 1nH per mm of inductance. At 100 MHz, 15nH of trace inductance contributes Z = 2*pi*f*L = 9.4 ohms of impedance, completely dominating the capacitor\'s low impedance at resonance. Moving the cap to within 2-3mm dramatically reduces this parasitic inductance.'
  },
  {
    scenario: 'Two PCB layouts use identical 100nF capacitors. Layout A places the cap on the same side as the IC with short traces. Layout B places it on the back side with vias connecting to the IC pins.',
    question: 'Why does Layout B show 30% higher impedance than Layout A?',
    options: [
      { id: 'a', text: 'The vias add parasitic inductance to the current loop' , correct: true },
      { id: 'b', text: 'The back side of the PCB has higher temperature' },
      { id: 'c', text: 'Through-hole vias have higher resistance than traces' },
      { id: 'd', text: 'The capacitor works differently when mounted upside down' },
    ],
    explanation: 'Each via adds approximately 0.5-1.5nH of inductance depending on the via diameter, pad size, and board thickness. Two vias (power and ground) in Layout B add 1-3nH total. For a 1.6mm board with 0.3mm vias, each via contributes roughly 1nH. This extra inductance raises the effective loop impedance.'
  },
  {
    scenario: 'A designer routes a power trace 0.2mm wide for 8mm from the capacitor to the IC pin, then uses a separate 0.2mm ground return trace running 5mm away on the same layer.',
    question: 'What is the biggest layout mistake in this design?',
    options: [
      { id: 'a', text: 'The trace width is too narrow for the current' },
      { id: 'b', text: 'The power and ground traces are too far apart, creating a large current loop area and high inductance', correct: true },
      { id: 'c', text: 'The trace length exceeds the maximum allowed' },
      { id: 'd', text: 'Using the same layer for both traces causes crosstalk' },
    ],
    explanation: 'Loop inductance is proportional to the enclosed area of the current path. With power and ground traces 5mm apart over 8mm, the loop area is 40mm squared. Routing them as a closely-spaced pair (0.2mm apart) reduces the area to 1.6mm squared -- a 25x reduction in loop inductance. Always minimize the current loop area.'
  },
  {
    scenario: 'A 4-layer PCB has the following stackup: Signal, Ground, Power, Signal. The designer places decoupling caps on the top signal layer with vias to the power plane on layer 3.',
    question: 'What is wrong with this via strategy?',
    options: [
      { id: 'a', text: 'Vias should never penetrate ground planes' },
      { id: 'b', text: 'The via for the ground pin must travel through the power plane to reach the ground plane on layer 2, adding unnecessary inductance', correct: true },
      { id: 'c', text: 'Layer 3 power planes cannot carry enough current' },
      { id: 'd', text: 'Signal integrity is compromised on layer 4' },
    ],
    explanation: 'The ground via must pass through the power plane (layer 3) to reach the ground plane (layer 2), adding extra via stub length. A better stackup would place ground on layer 2 and power on layer 3 with caps vias going to their nearest respective planes, or use a Signal-Ground-Power-Signal arrangement with blind vias.'
  },
  {
    scenario: 'A ground plane under a BGA IC has a slot cut through it for a signal trace routing channel. The decoupling capacitors are on the opposite side of the slot from the IC power pins.',
    question: 'How does the ground plane slot affect decoupling performance?',
    options: [
      { id: 'a', text: 'It has no effect since the ground plane still provides a return path' },
      { id: 'b', text: 'The slot forces return current to flow around it, dramatically increasing the effective loop inductance', correct: true },
      { id: 'c', text: 'It only affects signals above 1 GHz' },
      { id: 'd', text: 'The slot improves thermal dissipation, helping capacitor performance' },
    ],
    explanation: 'Return current flows directly beneath the signal trace on the ground plane. A slot forces this current to detour around the slot, creating a much larger loop area. This can increase loop inductance by 5-10x. The rule is: never split the ground plane under or between an IC and its decoupling capacitors.'
  },
  {
    scenario: 'A designer uses a single large via (0.5mm drill) for connecting a decoupling capacitor pad to the ground plane. A colleague suggests using four smaller vias (0.2mm drill) instead.',
    question: 'Why are multiple smaller vias preferred over one large via?',
    options: [
      { id: 'a', text: 'Multiple vias provide lower total inductance due to parallel inductance reduction', correct: true },
      { id: 'b', text: 'Smaller vias have better thermal conductivity' },
      { id: 'c', text: 'A single large via creates a short circuit risk' },
      { id: 'd', text: 'Multiple vias are cheaper to manufacture' },
    ],
    explanation: 'Inductance of parallel conductors: L_total = L_single / N (approximately, for well-spaced vias). Four 0.2mm vias in parallel yield roughly 1/4 the inductance of a single via. Each 0.2mm via has about 1nH inductance; four in parallel give ~0.25nH vs ~0.7nH for one 0.5mm via. This is a standard technique in high-speed PCB design.'
  },
  {
    scenario: 'An FPGA design uses 50 identical 100nF capacitors placed in a grid pattern 5mm from the IC. All caps are the same distance from the IC and use identical via structures.',
    question: 'What layout improvement would most reduce power distribution impedance?',
    options: [
      { id: 'a', text: 'Add more identical 100nF capacitors' },
      { id: 'b', text: 'Move capacitors as close as possible to BGA power pins with individual optimized routing to each pin cluster', correct: true },
      { id: 'c', text: 'Replace all with a single 5uF capacitor' },
      { id: 'd', text: 'Connect all capacitors in series for higher voltage rating' },
    ],
    explanation: 'Placing caps at a uniform 5mm distance wastes their potential. Each cap should be placed as close as possible to its corresponding IC power/ground pin pair, ideally directly under the BGA on the back side with short vias. This creates dozens of independent, low-inductance current paths instead of one distributed network.'
  },
  {
    scenario: 'A PCB layout review finds that decoupling capacitor pads use thermal relief connections to the ground plane instead of direct connections.',
    question: 'How do thermal reliefs affect decoupling performance?',
    options: [
      { id: 'a', text: 'They improve performance by preventing thermal damage to the capacitor' },
      { id: 'b', text: 'Thermal reliefs add inductance due to narrow spoke connections, degrading high-frequency decoupling', correct: true },
      { id: 'c', text: 'They have no electrical effect, only thermal' },
      { id: 'd', text: 'They reduce capacitance by limiting charge flow' },
    ],
    explanation: 'Thermal reliefs use narrow spokes (typically 0.25mm wide) connecting the pad to the plane. These spokes act as inductors at high frequencies. For decoupling capacitors, direct plane connections (no thermal relief) reduce pad inductance by 50-70%. The trade-off is harder soldering, but for critical decoupling it is essential.'
  },
  {
    scenario: 'A 1.0V core voltage rail for a processor shows 50mV of ripple. The designer has placed 10nF capacitors within 2mm of the BGA power pins, but impedance measurements still show a resonant peak at 200 MHz.',
    question: 'What layout technique can address this 200 MHz resonant peak?',
    options: [
      { id: 'a', text: 'Add more 10nF capacitors at the same locations' },
      { id: 'b', text: 'Use embedded planar capacitance with tightly-coupled power-ground plane pairs in the PCB stackup', correct: true },
      { id: 'c', text: 'Replace 10nF with 100nF capacitors' },
      { id: 'd', text: 'Increase the trace width from cap to IC' },
    ],
    explanation: 'Above 100-200 MHz, discrete capacitors become ineffective due to via and pad inductance. Tightly-coupled power-ground plane pairs (2-4 mil dielectric spacing) provide distributed planar capacitance with extremely low inductance. A 4-mil FR4 gap provides ~100pF per square inch, effective into the GHz range.'
  },
  {
    scenario: 'An engineer must place decoupling for a 400-pin BGA with 80 power/ground pin pairs. The BGA pitch is 1mm. Available cap package is 0402 (1.0 x 0.5mm).',
    question: 'What is the optimal placement strategy?',
    options: [
      { id: 'a', text: 'Place all caps in a ring around the BGA perimeter' },
      { id: 'b', text: 'Place caps directly under the BGA on the opposite side, aligned with power pin clusters, using short blind vias', correct: true },
      { id: 'c', text: 'Place caps on a separate daughter board connected by headers' },
      { id: 'd', text: 'Use only embedded capacitance, no discrete caps needed' },
    ],
    explanation: 'Back-side placement directly under power pin clusters minimizes via length and trace routing. 0402 caps fit within a 1mm BGA pitch grid. Blind vias from layer 1 to layer 2 provide the shortest possible connection. This approach provides the lowest possible loop inductance for each power pin cluster.'
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🖥️',
    title: 'High-Performance CPU/GPU Boards',
    short: 'Powering billion-transistor processors with sub-milliohm impedance',
    tagline: 'Layout is the bottleneck, not the capacitor',
    description: 'Modern processor boards require hundreds of capacitors with placement accuracy within 0.1mm. The PCB stackup, via structures, and plane integrity determine whether the power delivery network meets its impedance target.',
    connection: 'A CPU demanding 200A at 1.0V with 100A/us slew rate needs sub-milliohm impedance from DC to 1GHz. Without precise layout -- back-side BGA placement, optimized via arrays, and unbroken planes -- no amount of capacitance can achieve this.',
    howItWorks: 'Multiple decoupling tiers: bulk capacitors (100uF+) on the board periphery, mid-frequency MLCCs (1-10uF) near the socket, and high-frequency MLCCs (10-100nF) directly under the BGA with blind vias. Power-ground plane pairs provide GHz-range decoupling.',
    stats: [
      { value: '200+', label: 'Caps per processor', icon: '🔌' },
      { value: '<0.5mOhm', label: 'Target impedance', icon: '📉' },
      { value: '14+ layers', label: 'PCB stackup', icon: '📐' },
    ],
    examples: ['Server motherboards', 'GPU cards', 'AI accelerator boards', 'Game consoles'],
    companies: ['NVIDIA', 'AMD', 'Intel', 'Apple'],
    futureImpact: 'Chiplet and 3D packaging will embed decoupling into the package substrate, but PCB layout will remain critical for bulk and mid-frequency decoupling.',
    color: '#3B82F6',
  },
  {
    icon: '📡',
    title: 'RF/Wireless Base Stations',
    short: 'Clean power layout for sensitive radio circuits',
    tagline: 'Every nanohenry of stray inductance degrades signal quality',
    description: 'RF power amplifiers and sensitive receivers require decoupling layouts that minimize coupling between digital noise and analog circuits. Ground plane partitioning and strategic cap placement prevent spurious emissions.',
    connection: 'A 5G base station transmitting at 3.5GHz cannot tolerate power supply noise modulating its carrier. The PCB layout must isolate digital switching noise from RF stages using segmented planes, ferrite bead filtering, and precisely-placed local decoupling with minimal loop area.',
    howItWorks: 'Star-point grounding with isolated analog and digital ground regions joined at a single point. Decoupling caps placed at the exact boundary between regions. RF sections use low-inductance connections with multiple vias and direct plane access.',
    stats: [
      { value: '-80dBc', label: 'Spurious requirement', icon: '📶' },
      { value: '<0.5nH', label: 'Via inductance target', icon: '⚡' },
      { value: '6+ layers', label: 'Typical stackup', icon: '📋' },
    ],
    examples: ['5G mmWave arrays', 'Satellite transponders', 'Radar modules', 'WiFi 7 routers'],
    companies: ['Qualcomm', 'Ericsson', 'Nokia', 'Broadcom'],
    futureImpact: 'Sub-6GHz and mmWave convergence demands layout techniques that work across decades of frequency, from DC power management to 40GHz+ RF.',
    color: '#8B5CF6',
  },
  {
    icon: '🚗',
    title: 'Automotive ECU Design',
    short: 'Surviving harsh EMC environments through layout discipline',
    tagline: 'Pass EMC testing or redesign the board',
    description: 'Automotive electronic control units must pass stringent EMC tests (CISPR 25, ISO 11452). Proper decoupling layout is the first line of defense against both radiated emissions and susceptibility to external interference.',
    connection: 'A poorly laid out decoupling network radiates electromagnetic energy from large current loops. In automotive EMC testing, even 3dB over the limit means a complete PCB respin. Strategic layout with minimal loop areas and unbroken ground planes passes on the first attempt.',
    howItWorks: 'Compact cap placement with wide, short traces. Ground pour floods on all signal layers. Via stitching around board edges and between ground islands. Multi-layer stackups with dedicated power-ground plane pairs for each voltage rail.',
    stats: [
      { value: 'CISPR 25', label: 'EMC standard', icon: '📋' },
      { value: '-40 to 150C', label: 'Operating range', icon: '🌡️' },
      { value: '$50K+', label: 'Cost of respin', icon: '💰' },
    ],
    examples: ['Engine control modules', 'ADAS processors', 'BMS controllers', 'Infotainment SoCs'],
    companies: ['Bosch', 'Continental', 'Denso', 'Tesla'],
    futureImpact: 'Electric vehicles with 800V bus architectures require new isolation techniques and decoupling strategies for safety-critical systems.',
    color: '#10B981',
  },
  {
    icon: '🏥',
    title: 'Medical Imaging Electronics',
    short: 'Ultra-low-noise power delivery for precision ADCs',
    tagline: 'Microvolts of noise obscure diagnostic signals',
    description: 'MRI gradient amplifiers, CT detector arrays, and ultrasound front-ends need power supply noise below 10uV RMS. The PCB layout determines whether the decoupling network achieves this extraordinary cleanliness.',
    connection: 'A 16-bit ADC resolving 76uV per LSB requires power supply noise well below one LSB. Even with perfect capacitor selection, a layout with 3mm traces and split ground planes can introduce 100uV+ of noise, destroying effective resolution.',
    howItWorks: 'Dedicated low-noise power planes isolated from digital sections. Ferrite bead boundaries between power domains. Decoupling caps placed within 1mm of ADC power pins with direct plane connections (no thermal relief). Multiple via stitching ensures plane continuity.',
    stats: [
      { value: '<10uV', label: 'Noise floor target', icon: '📉' },
      { value: 'IEC 60601', label: 'Safety standard', icon: '✅' },
      { value: '16-24 bit', label: 'ADC resolution', icon: '🔬' },
    ],
    examples: ['MRI receiver coils', 'CT detector boards', 'Ultrasound front-ends', 'Patient monitors'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Medtronic'],
    futureImpact: 'Portable and wearable medical devices will need the same noise performance in much smaller form factors, demanding advanced embedding and 3D packaging.',
    color: '#F59E0B',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PowerSupplyDecouplingLayoutRenderer: React.FC<PowerSupplyDecouplingLayoutRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Play phase simulation state
  const [capDistance, setCapDistance] = useState(10); // mm from IC
  const [traceWidth, setTraceWidth] = useState(0.25); // mm
  const [numCaps, setNumCaps] = useState(1);
  const [viaCount, setViaCount] = useState(1); // vias per pad
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase state
  const [groundPlaneIntact, setGroundPlaneIntact] = useState(true);
  const [planeStitchingEnabled, setPlaneStitchingEnabled] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    if (phase !== 'play' && phase !== 'twist_play' && phase !== 'hook') return;
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 60);
    return () => clearInterval(timer);
  }, [phase]);

  // Colors - dark theme electronics look
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981',       // PCB green
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    copper: '#D4A574',       // Copper traces
    copperDark: '#A67C52',
    gold: '#FFD700',
    success: '#22c55e',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#2a2a3a',
    pcbGreen: '#1a5c32',
    pcbDark: '#0d3b1e',
    solder: '#C0C0C0',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Ground Planes',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'power_supply_decoupling_layout',
      gameTitle: 'Power Supply Decoupling Layout',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitEvent('phase_changed', { phase: p });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = validPhases.indexOf(phase);
    if (currentIndex < validPhases.length - 1) {
      goToPhase(validPhases[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─── PHYSICS CALCULATIONS ──────────────────────────────────────────────────

  // Trace inductance: approximately 1nH per mm for a microstrip
  const traceInductance = capDistance * 1.0; // nH
  // Via inductance: approximately 0.7nH per via (standard 0.3mm drill in 1.6mm board)
  const viaInductance = 0.7; // nH per via
  // Effective via inductance (parallel vias reduce inductance)
  const effectiveViaInductance = viaInductance / viaCount; // nH
  // Loop area: distance * trace separation (assume 0.5mm typical)
  const loopArea = capDistance * 0.5; // mm^2
  // Total loop inductance
  const totalLoopInductance = (traceInductance + effectiveViaInductance * 2) / numCaps; // nH

  // Ground plane effect on inductance
  const planeMultiplier = groundPlaneIntact ? 1.0 : (planeStitchingEnabled ? 1.8 : 5.0);
  const effectiveInductance = totalLoopInductance * planeMultiplier;

  // Voltage ripple calculation (V = L * di/dt)
  // Assume 500mA transient with 5ns edge
  const diDt = 0.5 / 5e-9; // A/s = 1e8
  const voltageRipple = Math.min(effectiveInductance * 1e-9 * diDt, 3.3); // V
  const ripplePercent = (voltageRipple / 3.3) * 100;

  // Impedance at 100 MHz
  const impedance100MHz = 2 * Math.PI * 100e6 * effectiveInductance * 1e-9;

  const getQuality = () => {
    if (ripplePercent < 3) return { label: 'Excellent', color: colors.success, grade: 'A' };
    if (ripplePercent < 8) return { label: 'Good', color: '#6ee7b7', grade: 'B' };
    if (ripplePercent < 15) return { label: 'Marginal', color: colors.warning, grade: 'C' };
    return { label: 'Poor', color: colors.error, grade: 'F' };
  };
  const quality = getQuality();

  // ─── PRIMARY BUTTON STYLE ─────────────────────────────────────────────────
  const primaryButtonStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
    color: 'white',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'all 0.2s',
    boxShadow: `0 4px 14px ${colors.accentGlow}`,
  };

  // ─── PROGRESS BAR ────────────────────────────────────────────────────────
  const renderProgressBar = () => {
    const currentIndex = validPhases.indexOf(phase);
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${colors.border}`, padding: '12px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '800px', margin: '0 auto' }}>
          {validPhases.map((p, i) => (
            <div key={p} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                onClick={() => i <= currentIndex && goToPhase(p)}
                style={{
                  width: '100%', height: '4px', borderRadius: '2px',
                  background: i <= currentIndex ? colors.accent : colors.border,
                  cursor: i <= currentIndex ? 'pointer' : 'default',
                  transition: 'background 0.3s',
                }}
              />
              {!isMobile && (
                <span style={{ fontSize: '9px', color: i === currentIndex ? colors.accent : colors.textMuted, whiteSpace: 'nowrap' }}>
                  {phaseLabels[p]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── NAV DOTS ─────────────────────────────────────────────────────────────
  const renderNavDots = () => {
    const currentIndex = validPhases.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px', paddingBottom: '20px' }}>
        {validPhases.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIndex && goToPhase(p)}
            style={{
              width: i === currentIndex ? '24px' : '8px', height: '8px', borderRadius: '4px',
              background: i <= currentIndex ? colors.accent : colors.border,
              cursor: i <= currentIndex ? 'pointer' : 'default',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    );
  };

  // ─── PCB LAYOUT SVG ───────────────────────────────────────────────────────
  const PCBLayoutSVG = ({ showPlane = true, interactive = false, split = false, stitched = false }: {
    showPlane?: boolean; interactive?: boolean; split?: boolean; stitched?: boolean;
  }) => {
    const w = isMobile ? 340 : 460;
    const h = isMobile ? 320 : 380;
    const icX = w / 2;
    const icY = h * 0.35;
    const icW = isMobile ? 60 : 80;
    const icH = isMobile ? 60 : 80;

    // Cap position scales with distance slider
    const capOffsetPx = 30 + (capDistance / 25) * (isMobile ? 80 : 120);
    const capX = icX - icW / 2 - capOffsetPx;
    const capY = icY;
    const capW = isMobile ? 14 : 18;
    const capH = isMobile ? 8 : 10;

    const animT = animationFrame * 0.05;
    // Current flow dot position along trace
    const flowProgress = (Math.sin(animT) + 1) / 2;
    const flowX = capX + capW + flowProgress * (icX - icW / 2 - capX - capW);
    const flowY = icY - 8;

    // Waveform region
    const waveY0 = h * 0.65;
    const waveH = h * 0.28;
    const waveW = w - 60;
    const waveLeft = 40;

    // Ripple waveform
    const wavePoints: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = waveLeft + t * waveW;
      // Transient events at t=0.3 and t=0.7
      const droop1 = Math.exp(-Math.pow((t - 0.3) / 0.05, 2));
      const droop2 = Math.exp(-Math.pow((t - 0.7) / 0.05, 2));
      const noise = Math.sin(t * 80 + animT * 2) * 0.001 * effectiveInductance;
      const v = 3.3 - voltageRipple * (droop1 + droop2 * 0.7) - noise;
      const clampedV = Math.max(0, Math.min(3.3, v));
      const yFrac = (clampedV - 2.5) / 0.9; // Map 2.5V-3.4V to 0-1
      const y = waveY0 + waveH - yFrac * waveH;
      wavePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: `${w}px`, background: colors.bgCard, borderRadius: '12px' }}
        role="img" aria-label="PCB Decoupling Layout Visualization">
        <title>PCB Decoupling Layout - Top Down View</title>
        <defs>
          <linearGradient id="copperGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.copper} />
            <stop offset="100%" stopColor={colors.copperDark} />
          </linearGradient>
          <radialGradient id="viaGrad">
            <stop offset="0%" stopColor={colors.solder} />
            <stop offset="60%" stopColor="#888" />
            <stop offset="100%" stopColor="#555" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="pcbPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill={colors.pcbGreen} />
            <circle cx="5" cy="5" r="0.5" fill={colors.pcbDark} opacity="0.3" />
          </pattern>
        </defs>

        {/* PCB Board background */}
        <rect x="10" y="10" width={w - 20} height={h * 0.52} rx="6" fill="url(#pcbPattern)" stroke="#2d7a47" strokeWidth="1.5" />

        {/* Ground plane layer (semi-transparent) */}
        {showPlane && (
          <>
            <rect x="14" y="14" width={w - 28} height={h * 0.52 - 8} rx="4"
              fill={split ? 'transparent' : `rgba(180, 130, 70, 0.12)`}
              stroke="none" />
            {split && !stitched && (
              <>
                {/* Left half of plane */}
                <rect x="14" y="14" width={(w - 28) * 0.42} height={h * 0.52 - 8} rx="4"
                  fill="rgba(180, 130, 70, 0.12)" />
                {/* Right half of plane */}
                <rect x={14 + (w - 28) * 0.58} y="14" width={(w - 28) * 0.42} height={h * 0.52 - 8} rx="4"
                  fill="rgba(180, 130, 70, 0.12)" />
                {/* Slot/gap indicator */}
                <rect x={14 + (w - 28) * 0.42} y="14" width={(w - 28) * 0.16} height={h * 0.52 - 8}
                  fill="rgba(239, 68, 68, 0.15)" stroke={colors.error} strokeWidth="1" strokeDasharray="4 3" />
                <text x={w / 2} y={h * 0.52 + 2} fill={colors.error} fontSize="10" textAnchor="middle" fontWeight="bold">
                  GROUND PLANE SPLIT
                </text>
              </>
            )}
            {split && stitched && (
              <>
                {/* Full plane restored with stitching vias */}
                <rect x="14" y="14" width={w - 28} height={h * 0.52 - 8} rx="4"
                  fill="rgba(180, 130, 70, 0.12)" />
                {/* Stitching vias across the former gap */}
                {Array.from({ length: 6 }).map((_, i) => {
                  const sy = 20 + i * ((h * 0.52 - 16) / 5);
                  return (
                    <circle key={`stitch-${i}`} cx={w / 2} cy={sy} r="3"
                      fill={colors.solder} stroke={colors.copper} strokeWidth="1" />
                  );
                })}
                <text x={w / 2} y={h * 0.52 + 2} fill={colors.success} fontSize="10" textAnchor="middle" fontWeight="bold">
                  STITCHED - PLANE RESTORED
                </text>
              </>
            )}
          </>
        )}

        {/* IC Package */}
        <rect x={icX - icW / 2} y={icY - icH / 2} width={icW} height={icH} rx="4"
          fill="#1a1a2e" stroke="#555" strokeWidth="1.5" />
        {/* IC pin 1 dot */}
        <circle cx={icX - icW / 2 + 8} cy={icY - icH / 2 + 8} r="3" fill={colors.warning} />
        {/* IC label */}
        <text x={icX} y={icY - 4} fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="bold">IC</text>
        <text x={icX} y={icY + 10} fill={colors.textMuted} fontSize="9" textAnchor="middle">U1</text>

        {/* IC Pins (power pins on left side) */}
        {[-2, -1, 0, 1, 2].map(i => (
          <React.Fragment key={`pin-${i}`}>
            <rect x={icX - icW / 2 - 6} y={icY + i * 10 - 3} width="6" height="3" fill={colors.copper} rx="0.5" />
            {i === -2 && <text x={icX - icW / 2 - 10} y={icY + i * 10 + 1} fill={colors.success} fontSize="7" textAnchor="end">VCC</text>}
            {i === 2 && <text x={icX - icW / 2 - 10} y={icY + i * 10 + 1} fill={colors.textMuted} fontSize="7" textAnchor="end">GND</text>}
          </React.Fragment>
        ))}

        {/* Power trace from cap to IC */}
        <line x1={capX + capW} y1={icY - 8} x2={icX - icW / 2 - 6} y2={icY - 8}
          stroke={colors.copper} strokeWidth={Math.max(1.5, traceWidth * 6)} strokeLinecap="round" />
        {/* Ground trace */}
        <line x1={capX + capW} y1={icY + 8} x2={icX - icW / 2 - 6} y2={icY + 8}
          stroke={colors.copperDark} strokeWidth={Math.max(1.5, traceWidth * 6)} strokeLinecap="round" />

        {/* Distance measurement */}
        <line x1={capX + capW + 2} y1={icY + icH / 2 + 12} x2={icX - icW / 2 - 8} y2={icY + icH / 2 + 12}
          stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="3 2" />
        <line x1={capX + capW + 2} y1={icY + icH / 2 + 8} x2={capX + capW + 2} y2={icY + icH / 2 + 16}
          stroke={colors.textMuted} strokeWidth="0.5" />
        <line x1={icX - icW / 2 - 8} y1={icY + icH / 2 + 8} x2={icX - icW / 2 - 8} y2={icY + icH / 2 + 16}
          stroke={colors.textMuted} strokeWidth="0.5" />
        <text x={(capX + capW + icX - icW / 2) / 2} y={icY + icH / 2 + 22} fill={colors.warning}
          fontSize="10" textAnchor="middle" fontWeight="bold">
          {capDistance}mm
        </text>

        {/* Capacitor(s) */}
        {Array.from({ length: numCaps }).map((_, ci) => {
          const cOffsetY = ci * (capH + 6) - ((numCaps - 1) * (capH + 6)) / 2;
          return (
            <React.Fragment key={`cap-${ci}`}>
              {/* Cap body */}
              <rect x={capX} y={capY - capH / 2 + cOffsetY} width={capW} height={capH} rx="1.5"
                fill="#8B6914" stroke={colors.copper} strokeWidth="1" />
              {/* Cap terminals */}
              <rect x={capX - 3} y={capY - 2 + cOffsetY} width="3" height="4" fill={colors.solder} rx="0.5" />
              <rect x={capX + capW} y={capY - 2 + cOffsetY} width="3" height="4" fill={colors.solder} rx="0.5" />
              {/* Cap label */}
              <text x={capX + capW / 2} y={capY + 2 + cOffsetY} fill="#fff" fontSize="6" textAnchor="middle" fontWeight="bold">
                100n
              </text>
              {/* Vias for this cap */}
              {Array.from({ length: viaCount }).map((_, vi) => {
                const vx = capX - 8 - vi * 6;
                return (
                  <circle key={`via-${ci}-${vi}`} cx={vx} cy={capY + cOffsetY} r="3"
                    fill="url(#viaGrad)" stroke={colors.copper} strokeWidth="0.8" />
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Current flow animation dot */}
        <circle cx={flowX} cy={flowY} r="3" fill={colors.accent} filter="url(#glowFilter)">
          <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite" />
        </circle>
        {/* Return current dot */}
        <circle cx={capX + capW + (1 - flowProgress) * (icX - icW / 2 - capX - capW)} cy={icY + 8} r="2.5"
          fill={colors.warning} filter="url(#glowFilter)">
          <animate attributeName="opacity" values="1;0.4;1" dur="0.6s" repeatCount="indefinite" />
        </circle>

        {/* Loop inductance label */}
        <rect x={w - (isMobile ? 120 : 150)} y="18" width={isMobile ? 106 : 136} height="40" rx="6"
          fill="rgba(0,0,0,0.6)" stroke={quality.color} strokeWidth="1" />
        <text x={w - (isMobile ? 67 : 82)} y="34" fill={colors.textMuted} fontSize="9" textAnchor="middle">Loop L</text>
        <text x={w - (isMobile ? 67 : 82)} y="50" fill={quality.color} fontSize="14" textAnchor="middle" fontWeight="bold">
          {effectiveInductance.toFixed(1)} nH
        </text>

        {/* Impedance label */}
        <rect x={w - (isMobile ? 120 : 150)} y="64" width={isMobile ? 106 : 136} height="36" rx="6"
          fill="rgba(0,0,0,0.6)" stroke={colors.textMuted} strokeWidth="0.5" />
        <text x={w - (isMobile ? 67 : 82)} y="78" fill={colors.textMuted} fontSize="9" textAnchor="middle">Z @ 100MHz</text>
        <text x={w - (isMobile ? 67 : 82)} y="93" fill={colors.copper} fontSize="12" textAnchor="middle" fontWeight="bold">
          {impedance100MHz.toFixed(2)} ohm
        </text>

        {/* Voltage ripple waveform section */}
        <rect x={waveLeft - 6} y={waveY0 - 16} width={waveW + 16} height={waveH + 34} rx="8"
          fill="rgba(0,0,0,0.4)" stroke={colors.border} strokeWidth="0.5" />
        <text x={waveLeft} y={waveY0 - 4} fill={colors.textMuted} fontSize="10">Voltage at IC Pin (V)</text>

        {/* Y-axis labels */}
        <text x={waveLeft - 4} y={waveY0 + 4} fill={colors.textMuted} fontSize="8" textAnchor="end">3.3</text>
        <text x={waveLeft - 4} y={waveY0 + waveH / 2} fill={colors.textMuted} fontSize="8" textAnchor="end">2.9</text>
        <text x={waveLeft - 4} y={waveY0 + waveH} fill={colors.textMuted} fontSize="8" textAnchor="end">2.5</text>

        {/* Nominal voltage line */}
        <line x1={waveLeft} y1={waveY0} x2={waveLeft + waveW} y2={waveY0}
          stroke={colors.success} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />

        {/* Waveform path */}
        <path d={wavePoints.join(' ')} fill="none" stroke={quality.color} strokeWidth="2" />

        {/* Ripple annotation */}
        <text x={waveLeft + waveW - 4} y={waveY0 + waveH + 14} fill={quality.color} fontSize="11"
          textAnchor="end" fontWeight="bold">
          Ripple: {(voltageRipple * 1000).toFixed(0)}mV ({ripplePercent.toFixed(1)}%)
        </text>
      </svg>
    );
  };

  // ─── HOOK PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', paddingTop: '80px', textAlign: 'center', overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '14px', color: colors.accent, textTransform: 'uppercase' as const, letterSpacing: '2px',
          marginBottom: '16px', fontWeight: 600,
        }}>
          PCB Design Challenge
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '20px', maxWidth: '600px' }}>
          Your Capacitors Are Perfect.<br />
          <span style={{ color: colors.error }}>Your Layout Ruins Them.</span>
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '550px', marginBottom: '32px' }}>
          Two engineers select identical decoupling capacitors. One board works flawlessly. The other has mysterious crashes, noise, and EMI failures. The only difference? <span style={{ color: colors.accent, fontWeight: 600 }}>PCB layout.</span>
        </p>

        {/* Side-by-side good vs bad layout preview */}
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' as const, justifyContent: 'center',
        }}>
          {/* Good layout */}
          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}33`,
            width: isMobile ? '140px' : '180px',
          }}>
            <svg width="100%" height="100" viewBox="0 0 120 100">
              <rect x="5" y="5" width="110" height="90" rx="4" fill={colors.pcbGreen} stroke="#2d7a47" strokeWidth="1" />
              <rect x="50" y="30" width="30" height="30" rx="2" fill="#1a1a2e" stroke="#555" strokeWidth="1" />
              <text x="65" y="49" fill="#fff" fontSize="8" textAnchor="middle">IC</text>
              {/* Cap close */}
              <rect x="36" y="40" width="10" height="6" rx="1" fill="#8B6914" stroke={colors.copper} strokeWidth="0.5" />
              <line x1="46" y1="42" x2="50" y2="42" stroke={colors.copper} strokeWidth="1.5" />
              <circle cx="33" cy="43" r="2.5" fill={colors.solder} stroke={colors.copper} strokeWidth="0.5" />
              <text x="60" y="78" fill={colors.success} fontSize="8" textAnchor="middle" fontWeight="bold">2mm - GOOD</text>
            </svg>
            <div style={{ ...typo.small, color: colors.success, textAlign: 'center', marginTop: '4px', fontWeight: 600 }}>
              Low Inductance
            </div>
          </div>

          {/* Bad layout */}
          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}33`,
            width: isMobile ? '140px' : '180px',
          }}>
            <svg width="100%" height="100" viewBox="0 0 120 100">
              <rect x="5" y="5" width="110" height="90" rx="4" fill={colors.pcbGreen} stroke="#2d7a47" strokeWidth="1" />
              <rect x="70" y="30" width="30" height="30" rx="2" fill="#1a1a2e" stroke="#555" strokeWidth="1" />
              <text x="85" y="49" fill="#fff" fontSize="8" textAnchor="middle">IC</text>
              {/* Cap far */}
              <rect x="15" y="40" width="10" height="6" rx="1" fill="#8B6914" stroke={colors.copper} strokeWidth="0.5" />
              <line x1="25" y1="42" x2="70" y2="42" stroke={colors.copper} strokeWidth="1" strokeDasharray="2 1" />
              <circle cx="12" cy="43" r="2.5" fill={colors.solder} stroke={colors.copper} strokeWidth="0.5" />
              <text x="60" y="78" fill={colors.error} fontSize="8" textAnchor="middle" fontWeight="bold">20mm - BAD</text>
            </svg>
            <div style={{ ...typo.small, color: colors.error, textAlign: 'center', marginTop: '4px', fontWeight: 600 }}>
              High Inductance
            </div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '32px',
          maxWidth: '500px', border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "The best capacitor in the world, placed 20mm from the IC with thin traces and no ground plane, performs worse than a mediocre capacitor placed 1mm away with proper layout."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            -- PCB Power Integrity Design Guide
          </p>
        </div>

        <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
          Learn Why Layout Matters
        </button>
        {renderNavDots()}
      </div>
    );
  }

  // ─── PREDICT PHASE ──────────────────────────────────────────────────────────
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Layout A (cap 2mm from IC) will have less noise because shorter traces have lower inductance', correct: true },
      { id: 'b', text: 'Layout B (cap 20mm from IC) will have less noise because the longer trace acts as a filter' },
      { id: 'c', text: 'Both layouts will perform identically since the capacitor value is the same' },
    ];

    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px',
        overflowY: 'auto', flex: 1, paddingTop: '60px',
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Two identical 100nF capacitors are placed at different distances from an IC. Which layout produces less power supply noise?
          </h2>

          <div style={{
            background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center',
          }}>
            <svg width="100%" height="100" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '400px' }}>
              {/* Layout A */}
              <rect x="10" y="10" width="170" height="80" rx="6" fill={colors.pcbGreen} stroke="#2d7a47" strokeWidth="1" />
              <text x="95" y="22" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">Layout A</text>
              <rect x="100" y="35" width="40" height="35" rx="3" fill="#1a1a2e" stroke="#555" strokeWidth="1" />
              <text x="120" y="56" fill="#fff" fontSize="9" textAnchor="middle">IC</text>
              <rect x="80" y="46" width="14" height="8" rx="1" fill="#8B6914" stroke={colors.copper} strokeWidth="0.5" />
              <line x1="94" y1="50" x2="100" y2="50" stroke={colors.copper} strokeWidth="2" />
              <text x="87" y="42" fill={colors.accent} fontSize="8" textAnchor="middle">2mm</text>

              {/* Layout B */}
              <rect x="220" y="10" width="170" height="80" rx="6" fill={colors.pcbGreen} stroke="#2d7a47" strokeWidth="1" />
              <text x="305" y="22" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">Layout B</text>
              <rect x="330" y="35" width="40" height="35" rx="3" fill="#1a1a2e" stroke="#555" strokeWidth="1" />
              <text x="350" y="56" fill="#fff" fontSize="9" textAnchor="middle">IC</text>
              <rect x="240" y="46" width="14" height="8" rx="1" fill="#8B6914" stroke={colors.copper} strokeWidth="0.5" />
              <line x1="254" y1="50" x2="330" y2="50" stroke={colors.copper} strokeWidth="1.5" strokeDasharray="3 2" />
              <text x="292" y="42" fill={colors.warning} fontSize="8" textAnchor="middle">20mm</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); emitEvent('prediction_made', { prediction: opt.id }); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Test My Prediction
            </button>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── PLAY PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px',
        overflowY: 'auto', flex: 1, paddingTop: '60px',
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '900px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Optimize Your PCB Layout
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
            Adjust capacitor placement, via count, and trace width. Watch how layout choices affect loop inductance and voltage ripple.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            V = L x di/dt: Lower inductance means lower voltage droops during current transients.
          </p>

          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '24px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            {/* Left: SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px' }}>
                <PCBLayoutSVG showPlane={true} interactive={true} />
              </div>
            </div>

            {/* Right: Controls */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px' }}>

                {/* Quality indicator */}
                <div style={{
                  textAlign: 'center', marginBottom: '20px', padding: '12px', borderRadius: '10px',
                  background: `${quality.color}15`, border: `1px solid ${quality.color}44`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Layout Quality</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: quality.color }}>{quality.grade}</div>
                  <div style={{ ...typo.small, color: quality.color, fontWeight: 600 }}>{quality.label}</div>
                </div>

                {/* Cap Distance slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Cap Distance</span>
                    <span style={{ ...typo.small, color: capDistance <= 3 ? colors.success : capDistance > 15 ? colors.error : colors.warning, fontWeight: 600 }}>
                      {capDistance}mm
                    </span>
                  </div>
                  <input type="range" min="1" max="25" value={capDistance}
                    onChange={(e) => { setCapDistance(parseInt(e.target.value)); emitEvent('slider_changed', { param: 'capDistance', value: parseInt(e.target.value) }); }}
                    style={{
                      touchAction: 'pan-y', width: '100%', height: '20px', borderRadius: '4px',
                      WebkitAppearance: 'none' as const, accentColor: colors.accent,
                      background: `linear-gradient(to right, ${colors.accent} ${(capDistance / 25) * 100}%, ${colors.border} ${(capDistance / 25) * 100}%)`,
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '10px', color: colors.textMuted }}>1mm</span>
                    <span style={{ fontSize: '10px', color: colors.textMuted }}>25mm</span>
                  </div>
                </div>

                {/* Trace Width slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Trace Width</span>
                    <span style={{ ...typo.small, color: colors.copper, fontWeight: 600 }}>{traceWidth.toFixed(2)}mm</span>
                  </div>
                  <input type="range" min="10" max="100" value={traceWidth * 100}
                    onChange={(e) => setTraceWidth(parseInt(e.target.value) / 100)}
                    style={{
                      touchAction: 'pan-y', width: '100%', height: '20px', borderRadius: '4px',
                      WebkitAppearance: 'none' as const, accentColor: colors.copper,
                      background: `linear-gradient(to right, ${colors.copper} ${traceWidth * 100}%, ${colors.border} ${traceWidth * 100}%)`,
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Number of Caps */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Number of Caps</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{numCaps}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} onClick={() => { setNumCaps(n); playSound('click'); }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', border: `2px solid ${numCaps === n ? colors.accent : colors.border}`,
                          background: numCaps === n ? `${colors.accent}22` : 'transparent',
                          color: numCaps === n ? colors.accent : colors.textMuted, cursor: 'pointer',
                          fontWeight: 700, fontSize: '14px',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vias per Pad */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Vias per Pad</span>
                    <span style={{ ...typo.small, color: colors.solder, fontWeight: 600 }}>{viaCount}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 4].map(n => (
                      <button key={n} onClick={() => { setViaCount(n); playSound('click'); }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', border: `2px solid ${viaCount === n ? colors.accent : colors.border}`,
                          background: viaCount === n ? `${colors.accent}22` : 'transparent',
                          color: viaCount === n ? colors.accent : colors.textMuted, cursor: 'pointer',
                          fontWeight: 700, fontSize: '14px',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inductance Breakdown */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px',
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 600 }}>
                    Inductance Breakdown
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Trace ({capDistance}mm)</span>
                    <span style={{ fontSize: '12px', color: colors.copper }}>{traceInductance.toFixed(1)} nH</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Vias ({viaCount}x parallel)</span>
                    <span style={{ fontSize: '12px', color: colors.solder }}>{(effectiveViaInductance * 2).toFixed(1)} nH</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Caps ({numCaps}x parallel)</span>
                    <span style={{ fontSize: '12px', color: colors.accent }}>/{numCaps}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: 600 }}>Total Loop L</span>
                    <span style={{ fontSize: '13px', color: quality.color, fontWeight: 700 }}>{effectiveInductance.toFixed(1)} nH</span>
                  </div>
                </div>

                <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  Continue to Review
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── REVIEW PHASE ────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const concepts = [
      {
        title: 'Loop Inductance',
        icon: '🔄',
        content: 'The current loop formed by the power trace, IC, ground return, and capacitor determines the total inductance. Inductance is proportional to the enclosed loop area. Minimizing this area by placing caps close to IC pins and using adjacent power/ground traces is the single most important layout rule.',
        formula: 'L_loop proportional to Area / Width',
      },
      {
        title: 'Via Inductance',
        icon: '🔩',
        content: 'Each via contributes approximately 0.5-1.5nH of inductance. Using multiple smaller vias in parallel reduces this: N vias yield roughly L_single/N total inductance. For critical decoupling, use 2-4 vias per pad with no thermal relief on plane connections.',
        formula: 'L_total = L_via / N_vias',
      },
      {
        title: 'Trace Impedance',
        icon: '📏',
        content: 'PCB traces add approximately 1nH per mm of length. At 100 MHz, just 10mm of trace contributes over 6 ohms of impedance. Wider traces have slightly lower inductance, but trace length dominates. The key is placing caps as close as possible to IC power pins.',
        formula: 'Z = 2 * pi * f * L (inductive impedance)',
      },
      {
        title: 'Return Current Path',
        icon: '↩️',
        content: 'Return current flows on the ground plane directly beneath the power trace. Any discontinuity -- slots, splits, or missing copper -- forces current to detour, dramatically increasing the effective loop area and inductance. Always maintain an unbroken ground plane under decoupling networks.',
        formula: 'Return current follows the path of least inductance',
      },
    ];

    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Layout Physics Explained
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
            Understanding the electromagnetic principles that make layout critical.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {concepts.map((c, i) => (
              <div key={i} style={{
                background: colors.bgCard, borderRadius: '16px', padding: '20px',
                border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.accent}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{c.icon}</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{c.title}</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0, marginBottom: '12px' }}>
                  {c.content}
                </p>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '10px',
                  border: `1px solid ${colors.accent}33`,
                }}>
                  <code style={{ fontSize: '13px', color: colors.accent, fontFamily: 'monospace' }}>
                    {c.formula}
                  </code>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Now Add a Twist
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── TWIST PREDICT PHASE ─────────────────────────────────────────────────────
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'a', text: 'The split has no effect since the capacitors are on the same side as the IC' },
      { id: 'b', text: 'The split forces return current to detour around it, massively increasing loop inductance and noise', correct: true },
      { id: 'c', text: 'The split improves performance by isolating digital and analog grounds' },
    ];

    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingTop: '60px',
        overflowY: 'auto', flex: 1,
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>
              New Variable: Ground Plane Integrity
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            What if the ground plane has a <span style={{ color: colors.error }}>slot cut</span> between the capacitor and the IC?
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            A signal routing channel cuts through the ground plane directly between the IC power pins and the decoupling capacitors. The cap is still only 3mm from the IC.
          </p>

          <div style={{
            background: colors.bgCard, borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'center',
          }}>
            <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '300px' }}>
              <rect x="10" y="10" width="280" height="80" rx="4" fill={colors.pcbGreen} stroke="#2d7a47" strokeWidth="1" />
              {/* Ground plane with slot */}
              <rect x="15" y="15" width="115" height="70" rx="2" fill="rgba(180,130,70,0.12)" />
              <rect x="170" y="15" width="115" height="70" rx="2" fill="rgba(180,130,70,0.12)" />
              <rect x="130" y="15" width="40" height="70" fill="rgba(239,68,68,0.2)" stroke={colors.error} strokeWidth="0.5" strokeDasharray="3 2" />
              <text x="150" y="85" fill={colors.error} fontSize="8" textAnchor="middle">SLOT</text>
              {/* Cap */}
              <rect x="90" y="42" width="14" height="8" rx="1" fill="#8B6914" stroke={colors.copper} strokeWidth="0.5" />
              {/* IC */}
              <rect x="190" y="35" width="35" height="25" rx="2" fill="#1a1a2e" stroke="#555" strokeWidth="1" />
              <text x="207" y="52" fill="#fff" fontSize="8" textAnchor="middle">IC</text>
              {/* Trace */}
              <line x1="104" y1="46" x2="190" y2="46" stroke={colors.copper} strokeWidth="1.5" />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {twistOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); emitEvent('prediction_made', { twist: opt.id }); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px', padding: '16px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Explore Ground Planes
            </button>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── TWIST PLAY PHASE ────────────────────────────────────────────────────────
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingBottom: '16px',
        overflowY: 'auto', flex: 1, paddingTop: '60px',
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '900px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Ground Plane Continuity
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle the ground plane split and stitching to see how return current paths affect decoupling performance.
          </p>

          <div style={{
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '16px' : '24px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            {/* Left: SVG */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '16px' }}>
                <PCBLayoutSVG showPlane={true} split={!groundPlaneIntact} stitched={planeStitchingEnabled} />
              </div>
            </div>

            {/* Right: Controls */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px' }}>

                {/* Ground Plane Toggle */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px', fontWeight: 600 }}>
                    Ground Plane
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ ...typo.small, color: !groundPlaneIntact ? colors.error : colors.textMuted }}>Split</span>
                    <button
                      onClick={() => { setGroundPlaneIntact(!groundPlaneIntact); if (!groundPlaneIntact) setPlaneStitchingEnabled(false); playSound('click'); }}
                      style={{
                        width: '60px', height: '30px', borderRadius: '15px', border: 'none',
                        background: groundPlaneIntact ? colors.success : colors.error, cursor: 'pointer',
                        position: 'relative', transition: 'background 0.3s',
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', background: 'white',
                        position: 'absolute', top: '3px', left: groundPlaneIntact ? '33px' : '3px',
                        transition: 'left 0.3s',
                      }} />
                    </button>
                    <span style={{ ...typo.small, color: groundPlaneIntact ? colors.success : colors.textMuted, fontWeight: groundPlaneIntact ? 600 : 400 }}>
                      Intact
                    </span>
                  </div>
                </div>

                {/* Stitching Toggle - only when split */}
                {!groundPlaneIntact && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px', fontWeight: 600 }}>
                      Via Stitching (Repair)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>Off</span>
                      <button
                        onClick={() => { setPlaneStitchingEnabled(!planeStitchingEnabled); playSound('click'); }}
                        style={{
                          width: '60px', height: '30px', borderRadius: '15px', border: 'none',
                          background: planeStitchingEnabled ? colors.success : colors.border, cursor: 'pointer',
                          position: 'relative', transition: 'background 0.3s',
                        }}
                      >
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '3px', left: planeStitchingEnabled ? '33px' : '3px',
                          transition: 'left 0.3s',
                        }} />
                      </button>
                      <span style={{ ...typo.small, color: planeStitchingEnabled ? colors.success : colors.textMuted, fontWeight: planeStitchingEnabled ? 600 : 400 }}>
                        Stitched
                      </span>
                    </div>
                  </div>
                )}

                {/* Inductance comparison */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '16px',
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', fontWeight: 600 }}>
                    Ground Plane Effect
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Plane multiplier</span>
                    <span style={{ fontSize: '12px', color: planeMultiplier > 2 ? colors.error : planeMultiplier > 1.2 ? colors.warning : colors.success, fontWeight: 600 }}>
                      x{planeMultiplier.toFixed(1)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Effective L</span>
                    <span style={{ fontSize: '12px', color: quality.color, fontWeight: 700 }}>
                      {effectiveInductance.toFixed(1)} nH
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Voltage ripple</span>
                    <span style={{ fontSize: '12px', color: quality.color, fontWeight: 700 }}>
                      {(voltageRipple * 1000).toFixed(0)} mV
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <div style={{
                  background: `${!groundPlaneIntact && !planeStitchingEnabled ? colors.error : colors.success}15`,
                  borderRadius: '10px', padding: '12px', marginBottom: '20px',
                  border: `1px solid ${!groundPlaneIntact && !planeStitchingEnabled ? colors.error : colors.success}33`,
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {groundPlaneIntact
                      ? 'Intact ground plane: return current flows directly beneath the power trace, minimizing loop area.'
                      : planeStitchingEnabled
                        ? 'Via stitching partially restores the ground path but adds some inductance. Best practice: avoid splits entirely.'
                        : 'Split plane forces return current around the gap -- loop area increases 5x or more. This is the #1 PCB layout mistake.'}
                  </p>
                </div>

                <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  Continue to Review
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── TWIST REVIEW PHASE ──────────────────────────────────────────────────────
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Return Current & Plane Integrity
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
            The invisible return current path determines whether your layout works or fails.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {[
              {
                title: 'Return Current Follows the Signal',
                content: 'At high frequencies, return current does not spread evenly across the ground plane. It flows directly beneath the signal trace in a narrow strip, following the path of least inductance (not least resistance). This is why ground plane continuity directly under the trace is critical.',
                color: colors.accent,
              },
              {
                title: 'Slots and Splits Are Inductance Multipliers',
                content: 'A slot in the ground plane under a power trace forces return current to flow around the slot. If the slot is 10mm wide and the trace is 20mm long, the return current path may increase from 20mm to 50mm+, with a much larger enclosed loop area. Inductance can increase by 5-10x.',
                color: colors.error,
              },
              {
                title: 'Via Stitching as Damage Control',
                content: 'When a ground plane split is unavoidable (different voltage domains, for example), via stitching across the gap provides a localized return current path. Place stitching vias at every point where a signal or power trace crosses the gap. This reduces but does not eliminate the inductance penalty.',
                color: colors.warning,
              },
              {
                title: 'Best Practices Summary',
                content: 'Never route signals or place splits under or between an IC and its decoupling capacitors. Use solid, unbroken ground planes. If multiple ground regions exist, join them with wide copper bridges or dense via arrays at the boundaries. Check return current paths in simulation.',
                color: colors.success,
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.bgCard, borderRadius: '16px', padding: '20px',
                borderLeft: `4px solid ${item.color}`, border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '10px' }}>{item.title}</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{item.content}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              See Real-World Applications
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── TRANSFER PHASE ──────────────────────────────────────────────────────────
  if (phase === 'transfer') {
    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, paddingTop: '60px', overflowY: 'auto',
      }}>
        {renderProgressBar()}
        <div style={{ padding: '20px' }}>
          <TransferPhaseView
            conceptName="Power Supply Decoupling Layout"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={{
              primary: colors.accent,
              primaryDark: '#059669',
              accent: colors.copper,
              secondary: colors.success,
              success: colors.success,
              danger: colors.error,
              bgDark: colors.bgPrimary,
              bgCard: colors.bgCard,
              bgCardLight: colors.bgSecondary,
              textPrimary: colors.textPrimary,
              textSecondary: colors.textSecondary,
              textMuted: colors.textMuted,
              border: colors.border,
            }}
          />
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── TEST PHASE ───────────────────────────────────────────────────────────────
  if (phase === 'test') {
    const handleTestAnswer = (questionIndex: number, answerId: string) => {
      const newAnswers = [...testAnswers];
      newAnswers[questionIndex] = answerId;
      setTestAnswers(newAnswers);
      playSound('click');
      emitEvent('answer_submitted', { question: questionIndex, answer: answerId });
    };

    const handleSubmitTest = () => {
      let score = 0;
      testQuestions.forEach((q, i) => {
        const correctOpt = q.options.find(o => o.correct);
        if (correctOpt && testAnswers[i] === correctOpt.id) score++;
      });
      setTestScore(score);
      setTestSubmitted(true);
      playSound(score >= 7 ? 'complete' : 'failure');
      emitEvent('game_completed', { score, total: 10 });
    };

    const allAnswered = testAnswers.every(a => a !== null);
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{
        minHeight: '100dvh', background: colors.bgPrimary, padding: '24px', paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}
        <div style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Knowledge Assessment
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            {testSubmitted ? `You scored ${testScore}/10` : `Question ${currentQuestion + 1} of 10`}
          </p>

          {!testSubmitted ? (
            <>
              {/* Question navigation */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' as const }}>
                {testQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestion(i)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: `2px solid ${currentQuestion === i ? colors.accent : testAnswers[i] ? colors.success : colors.border}`,
                      background: testAnswers[i] ? `${colors.success}22` : 'transparent',
                      color: currentQuestion === i ? colors.accent : colors.textSecondary,
                      cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Current question */}
              <div style={{
                background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  background: `${colors.accent}15`, borderRadius: '10px', padding: '14px', marginBottom: '16px',
                  border: `1px solid ${colors.accent}33`,
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
                    {testQuestions[currentQuestion].scenario}
                  </p>
                </div>

                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                  {testQuestions[currentQuestion].question}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {testQuestions[currentQuestion].options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleTestAnswer(currentQuestion, opt.id)}
                      style={{
                        background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : 'transparent',
                        border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                        borderRadius: '10px', padding: '12px 16px', textAlign: 'left',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <span style={{
                        display: 'inline-block', width: '26px', height: '26px', borderRadius: '50%',
                        background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                        color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textMuted,
                        textAlign: 'center', lineHeight: '26px', marginRight: '10px', fontWeight: 700, fontSize: '13px',
                      }}>
                        {opt.id.toUpperCase()}
                      </span>
                      <span style={{ ...typo.small, color: colors.textPrimary }}>{opt.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question navigation buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {currentQuestion > 0 && (
                  <button onClick={() => setCurrentQuestion(currentQuestion - 1)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${colors.border}`,
                      background: 'transparent', color: colors.textSecondary, cursor: 'pointer', fontSize: '14px',
                    }}>
                    Previous
                  </button>
                )}
                {currentQuestion < 9 && (
                  <button onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${colors.accent}`,
                      background: `${colors.accent}22`, color: colors.accent, cursor: 'pointer',
                      fontSize: '14px', fontWeight: 600,
                    }}>
                    Next
                  </button>
                )}
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmitTest}
                disabled={!allAnswered}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '18px',
                  transition: 'all 0.3s', border: 'none', minHeight: '44px',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                  background: allAnswered ? `linear-gradient(135deg, ${colors.accent}, #059669)` : '#334155',
                  color: allAnswered ? '#ffffff' : '#475569',
                  boxShadow: allAnswered ? `0 4px 14px ${colors.accentGlow}` : 'none',
                }}
              >
                {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
              </button>
            </>
          ) : (
            <div style={{ paddingTop: '16px' }}>
              {/* Score display */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '96px', height: '96px', borderRadius: '50%', marginBottom: '24px',
                  background: testScore >= 7 ? `linear-gradient(135deg, ${colors.accent}, #059669)` : 'linear-gradient(135deg, #475569, #334155)',
                }}>
                  <span style={{ fontSize: '48px' }}>{testScore >= 7 ? '🏆' : '📚'}</span>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>
                  {testScore}/10 Correct
                </h3>
                <p style={{ color: colors.textSecondary, marginBottom: '16px', fontSize: '16px' }}>
                  {testScore >= 9 ? 'Outstanding! You are a PCB layout expert!'
                    : testScore >= 7 ? 'Great work! You understand decoupling layout principles.'
                    : 'Review the concepts and try again.'}
                </p>
              </div>

              {/* Rich Answer Key */}
              <div style={{
                padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.8)',
                marginBottom: '24px',
              }}>
                <h4 style={{ fontWeight: 700, color: colors.textPrimary, marginBottom: '16px', fontSize: '16px' }}>
                  Answer Key
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {testQuestions.map((q, qIndex) => {
                    const userAnswer = testAnswers[qIndex];
                    const correctOpt = q.options.find(o => o.correct);
                    const isCorrect = userAnswer === correctOpt?.id;
                    const userOpt = q.options.find(o => o.id === userAnswer);
                    return (
                      <div key={qIndex} style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                      }}>
                        <p style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 'bold', marginBottom: '8px' }}>
                          {qIndex + 1}. {q.question}
                        </p>
                        {!isCorrect && userOpt && (
                          <div style={{
                            padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.2)', color: colors.error, fontSize: '13px',
                          }}>
                            Your answer: {userOpt.text}
                          </div>
                        )}
                        <div style={{
                          padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                          background: 'rgba(34, 197, 94, 0.2)', color: colors.success, fontSize: '13px',
                        }}>
                          Correct: {correctOpt?.text}
                        </div>
                        <div style={{
                          padding: '6px 10px', marginTop: '6px', borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.15)', color: colors.warning,
                          fontSize: '12px', lineHeight: 1.5,
                        }}>
                          {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {testScore >= 7 ? (
                <button onClick={() => { playSound('complete'); goToPhase('mastery'); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(new Array(10).fill(null));
                    setCurrentQuestion(0);
                  }}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 600, fontSize: '18px',
                    border: 'none', cursor: 'pointer', backgroundColor: '#334155', color: '#e2e8f0',
                    minHeight: '44px',
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ─── MASTERY PHASE ──────────────────────────────────────────────────────────
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', paddingTop: '80px', paddingBottom: '100px', textAlign: 'center', overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '96px', height: '96px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
            boxShadow: `0 20px 40px ${colors.accentGlow}`, marginBottom: '24px',
          }}>
            <span style={{ fontSize: '48px' }}>🏆</span>
          </div>
        </div>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          PCB Layout Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how PCB layout determines decoupling performance. Your boards will have lower noise, better EMC, and fewer mysterious failures.
        </p>

        <div style={{
          background: `linear-gradient(135deg, ${colors.accent}15, #05966915)`,
          border: `1px solid ${colors.accent}44`, borderRadius: '16px', padding: '24px',
          marginBottom: '32px', textAlign: 'left', maxWidth: '500px',
        }}>
          <h3 style={{ fontWeight: 700, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center', fontSize: '16px' }}>
            Key Takeaways
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'Place caps as close as possible to IC power pins (< 3mm)',
              'Minimize current loop area with adjacent power/ground routing',
              'Use multiple vias per pad for lower inductance',
              'Never split the ground plane under decoupling networks',
              'Via stitching can partially repair plane discontinuities',
              'Trace inductance (~1nH/mm) dominates at high frequencies',
              'Thermal reliefs on cap pads add unwanted inductance',
              'Use tightly-coupled plane pairs for GHz-range decoupling',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{
                  flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: colors.accent, color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                }}>
                  ✓
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.6, color: '#e2e8f0' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Score recap */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '32px',
          maxWidth: '400px', width: '100%',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...typo.body, color: colors.textSecondary }}>Test Score</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: colors.success }}>{testScore}/10</span>
          </div>
          <div style={{
            marginTop: '12px', height: '8px', borderRadius: '4px', background: colors.border, overflow: 'hidden',
          }}>
            <div style={{
              width: `${testScore * 10}%`, height: '100%', borderRadius: '4px',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
              transition: 'width 0.5s',
            }} />
          </div>
          <div style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', textAlign: 'center' }}>
            {testScore >= 9 ? 'Expert Level' : testScore >= 7 ? 'Proficient' : 'Developing'}
          </div>
        </div>

        {/* Complete Game button */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderTop: `1px solid ${colors.accent}44`, zIndex: 1000,
        }}>
          <button
            onClick={() => {
              onGameEvent?.({ type: 'mastery_achieved', details: {} } as unknown as GameEvent);
              emitEvent('game_completed', { score: testScore, total: 10, mastered: true });
              window.location.href = '/games';
            }}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              background: `linear-gradient(135deg, ${colors.accent}, #059669)`,
              color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
              minHeight: '44px', boxShadow: `0 4px 14px ${colors.accentGlow}`,
            }}
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

export default PowerSupplyDecouplingLayoutRenderer;
