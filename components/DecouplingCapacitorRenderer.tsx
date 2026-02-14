'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Decoupling Capacitors - Complete 10-Phase Game
// Why local energy reservoirs matter for stable digital circuits
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

interface DecouplingCapacitorRendererProps {
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
    scenario: "A microcontroller randomly resets during high-current operations like activating a motor. The power supply measures fine at the source, but voltage at the IC pins shows brief 0.5V drops.",
    question: "What is the most likely cause of these resets?",
    options: [
      { id: 'a', label: "The microcontroller is defective and needs replacement" },
      { id: 'b', label: "Insufficient decoupling capacitors near the IC pins causing voltage drops during current transients", correct: true },
      { id: 'c', label: "The motor is creating electromagnetic interference" },
      { id: 'd', label: "The power supply voltage is set too low" }
    ],
    explanation: "When an IC suddenly demands current (during switching or activating outputs), trace inductance causes voltage drops. Decoupling capacitors act as local energy reservoirs, supplying instantaneous current until the power supply can respond."
  },
  {
    scenario: "An engineer places a single 10uF capacitor at the power input of a PCB. High-speed signals on the board still show excessive noise, especially during fast clock edges.",
    question: "Why doesn't the bulk capacitor eliminate high-frequency noise?",
    options: [
      { id: 'a', label: "10uF is not large enough for any application" },
      { id: 'b', label: "Large capacitors have high ESL (inductance) that limits their effectiveness at high frequencies", correct: true },
      { id: 'c', label: "The capacitor is defective" },
      { id: 'd', label: "High-frequency noise cannot be filtered by any capacitor" }
    ],
    explanation: "Every capacitor has parasitic inductance (ESL) that makes it less effective at high frequencies. The impedance of a capacitor is Z = ESR + |1/(2*pi*f*C) - 2*pi*f*ESL|. At high frequencies, ESL dominates, making large capacitors poor high-frequency filters."
  },
  {
    scenario: "A designer uses 0.1uF ceramic capacitors for decoupling. The design works well at 10MHz but shows power integrity issues when upgraded to a 100MHz clock.",
    question: "What additional capacitors should be added?",
    options: [
      { id: 'a', label: "More 0.1uF capacitors in parallel" },
      { id: 'b', label: "Smaller value capacitors (1nF, 10nF) for higher frequency decoupling", correct: true },
      { id: 'c', label: "Only larger electrolytic capacitors" },
      { id: 'd', label: "No capacitors work above 50MHz" }
    ],
    explanation: "Higher frequencies require smaller capacitors because they have lower ESL and reach their self-resonant frequency at higher points. A combination of 10nF, 1nF, and 100pF capacitors extends effective decoupling to GHz frequencies."
  },
  {
    scenario: "Two identical circuits are built: one with decoupling capacitors 5mm from IC pins, another with capacitors 25mm away. The closer placement shows 60% less voltage ripple.",
    question: "Why does capacitor placement matter so dramatically?",
    options: [
      { id: 'a', label: "Longer traces have higher resistance only" },
      { id: 'b', label: "PCB trace inductance increases with length, limiting how fast the capacitor can supply current", correct: true },
      { id: 'c', label: "The IC generates more heat with distant capacitors" },
      { id: 'd', label: "Electromagnetic fields are stronger near the IC" }
    ],
    explanation: "PCB traces have approximately 1nH per mm of inductance. At fast edges, V = L*di/dt means longer traces cause larger voltage drops. Placing capacitors as close as possible to IC power pins minimizes this inductance."
  },
  {
    scenario: "A power supply design uses multiple decoupling capacitors: 100uF electrolytic, 10uF ceramic, 0.1uF ceramic, and 0.01uF ceramic. Each serves a different purpose.",
    question: "What is the role of the 100uF electrolytic capacitor?",
    options: [
      { id: 'a', label: "Filtering the highest frequency noise" },
      { id: 'b', label: "Acting as bulk energy storage for low-frequency transients and initial power-up", correct: true },
      { id: 'c', label: "Protecting against ESD" },
      { id: 'd', label: "Reducing DC resistance in the power path" }
    ],
    explanation: "Bulk capacitors (electrolytic or large ceramic) store significant energy for low-frequency events: power-up surges, motor starts, and slow load changes. They're too slow (high ESL) for high-frequency decoupling but essential for overall power stability."
  },
  {
    scenario: "An FPGA board uses many 0.1uF capacitors, but simulation shows a problematic impedance peak at 50MHz where the capacitors' individual resonances combine destructively.",
    question: "How can this impedance peak be reduced?",
    options: [
      { id: 'a', label: "Remove half the capacitors" },
      { id: 'b', label: "Use capacitors with different values to spread out resonant frequencies", correct: true },
      { id: 'c', label: "Add longer traces to the capacitors" },
      { id: 'd', label: "Replace all capacitors with larger values" }
    ],
    explanation: "When many identical capacitors are used, their self-resonant frequencies align, creating anti-resonance peaks. Using varied capacitor values (47nF, 100nF, 220nF) spreads the resonant frequencies, flattening the overall impedance response."
  },
  {
    scenario: "A high-speed ADC datasheet specifies placing ferrite beads between bulk and local decoupling capacitors. Without the ferrite, noise performance degrades significantly.",
    question: "What purpose do ferrite beads serve in the decoupling network?",
    options: [
      { id: 'a', label: "They increase the total capacitance" },
      { id: 'b', label: "They act as frequency-dependent resistors, damping resonances and isolating noise", correct: true },
      { id: 'c', label: "They provide ESD protection" },
      { id: 'd', label: "They reduce power consumption" }
    ],
    explanation: "Ferrite beads appear as inductors at low frequencies but become resistive at high frequencies, absorbing noise energy as heat. They isolate sensitive circuits from noisy power rails and damp LC resonances in decoupling networks."
  },
  {
    scenario: "A debug session reveals that a processor's internal voltage regulator shows 200mV of ripple. The 3.3V input power is clean, but internal 1.0V core voltage oscillates.",
    question: "What type of capacitor is most critical for on-die voltage regulators?",
    options: [
      { id: 'a', label: "Large through-hole electrolytics" },
      { id: 'b', label: "High-capacitance, low-ESR MLCCs placed directly at regulator output pins", correct: true },
      { id: 'c', label: "Any type of capacitor will work equally well" },
      { id: 'd', label: "Film capacitors for better temperature stability" }
    ],
    explanation: "Modern processor voltage regulators need very fast transient response. MLCCs (Multi-Layer Ceramic Capacitors) offer the lowest ESR and ESL, enabling fast charge delivery. X5R or X7R dielectrics with values from 10uF to 100uF are typical."
  },
  {
    scenario: "A student measures the impedance of their decoupling network and finds it looks like a 'bathtub curve' - high impedance at very low and very high frequencies with a low point in between.",
    question: "What causes the high impedance at very low frequencies?",
    options: [
      { id: 'a', label: "The capacitors are defective" },
      { id: 'b', label: "Capacitive reactance (1/2*pi*f*C) is large at low frequencies", correct: true },
      { id: 'c', label: "The measurement equipment is wrong" },
      { id: 'd', label: "Temperature effects on the capacitors" }
    ],
    explanation: "At low frequencies, capacitor impedance is dominated by capacitive reactance Xc = 1/(2*pi*f*C), which approaches infinity as frequency approaches zero. This is why bulk capacitors are needed - their large C values lower impedance at low frequencies."
  },
  {
    scenario: "A DDR4 memory interface requires target impedance below 10 milliohms from DC to 1GHz. The current design shows 50 milliohms at 500MHz.",
    question: "What is the most effective way to reduce power distribution impedance at high frequencies?",
    options: [
      { id: 'a', label: "Add more bulk electrolytic capacitors" },
      { id: 'b', label: "Use closely spaced power/ground plane pairs in the PCB stackup", correct: true },
      { id: 'c', label: "Increase the trace width of power rails" },
      { id: 'd', label: "Use thicker PCB copper" }
    ],
    explanation: "At very high frequencies (>100MHz), discrete capacitors become ineffective. Closely spaced power-ground plane pairs act as distributed capacitance throughout the PCB. A 4-mil separation can provide 100pF/sq inch of planar capacitance with extremely low inductance."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💻',
    title: 'High-Performance Computing',
    short: 'Powering processors with billions of transistors',
    tagline: 'Nanosecond response for teraflop demands',
    description: 'Modern CPUs and GPUs can demand 100+ amps with current slew rates exceeding 1000 A/microsecond. Decoupling networks with hundreds of capacitors and advanced PCB design ensure stable voltage despite these extreme transients.',
    connection: 'Every clock cycle, millions of transistors switch simultaneously, creating massive current spikes. Without proper decoupling, voltage droops would cause timing violations and data corruption. The "power delivery network" is as critical as the processor itself.',
    howItWorks: 'Voltage Regulator Modules (VRMs) provide bulk current. Multi-layer PCBs with embedded capacitance carry power to the chip. On-package capacitors (placed on the processor substrate) handle the fastest transients. The total solution provides sub-milliohm impedance.',
    stats: [
      { value: '500+', label: 'Capacitors per CPU', icon: '🔌' },
      { value: '<1mΩ', label: 'Target impedance', icon: '📉' },
      { value: '100A+', label: 'Peak current demand', icon: '⚡' }
    ],
    examples: ['AMD Ryzen processors', 'Intel Core CPUs', 'NVIDIA GPUs', 'Apple M-series chips'],
    companies: ['AMD', 'Intel', 'NVIDIA', 'Apple'],
    futureImpact: 'Chiplet designs and 3D stacking will require new decoupling strategies with capacitors integrated directly into the silicon.',
    color: '#3B82F6'
  },
  {
    icon: '📡',
    title: 'RF and Wireless Systems',
    short: 'Clean power for sensitive radio circuits',
    tagline: 'Every microvolt of noise matters',
    description: 'Radio frequency circuits require extremely clean power supplies. Even small voltage ripples modulate the carrier frequency, creating spurious emissions and reducing receiver sensitivity. Decoupling design becomes an art form.',
    connection: 'Power supply noise directly appears in the RF output as phase noise and spurious signals. A noisy 5G transmitter fails regulatory tests. Proper decoupling networks provide isolation exceeding 60dB across frequency bands of interest.',
    howItWorks: 'Multiple stages of filtering: bulk capacitors at power entry, LC filters for each stage, and local MLCC decoupling at every active device. Ferrite beads isolate sensitive stages. Layout uses star-point grounding to prevent ground loops.',
    stats: [
      { value: '-60dB', label: 'Power isolation needed', icon: '📶' },
      { value: '10pF-10uF', label: 'Capacitor range', icon: '🔬' },
      { value: 'GHz', label: 'Operating frequencies', icon: '📻' }
    ],
    examples: ['5G base stations', 'WiFi routers', 'Satellite communications', 'GPS receivers'],
    companies: ['Qualcomm', 'Ericsson', 'Nokia', 'Broadcom'],
    futureImpact: '6G and beyond will push to higher frequencies where traditional capacitors fail, requiring new on-chip decoupling solutions.',
    color: '#8B5CF6'
  },
  {
    icon: '🏥',
    title: 'Medical Electronics',
    short: 'Reliability where lives depend on it',
    tagline: 'No margin for power integrity failures',
    description: 'Medical devices demand extreme reliability and noise immunity. Pacemakers, insulin pumps, and diagnostic equipment must operate flawlessly. Decoupling design follows strict standards to ensure patient safety.',
    connection: 'A voltage glitch in a pacemaker could cause a missed heartbeat. An ADC measuring ECG signals needs clean references. Medical-grade decoupling uses redundant capacitors, careful material selection, and extensive validation.',
    howItWorks: 'Medical devices use ultra-low-noise regulators with ceramic capacitors rated for medical applications. Designs include redundant decoupling, use automotive-grade components, and undergo extensive EMC testing. Critical paths have isolated power domains.',
    stats: [
      { value: '10+ years', label: 'Required lifetime', icon: '⏱️' },
      { value: '0 PPM', label: 'Failure tolerance', icon: '✅' },
      { value: 'IEC 60601', label: 'Safety standard', icon: '📋' }
    ],
    examples: ['Pacemakers', 'MRI machines', 'Patient monitors', 'Surgical robots'],
    companies: ['Medtronic', 'Siemens Healthineers', 'Philips Healthcare', 'Boston Scientific'],
    futureImpact: 'Implantable devices will shrink further, requiring new miniaturized decoupling solutions with exceptional reliability.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Surviving the harshest electrical environment',
    tagline: 'Stable power despite cranking, spikes, and transients',
    description: 'Automotive systems face extreme conditions: 12V battery voltage varies from 6V during cranking to 40V+ during load dump. Decoupling must handle these transients while protecting sensitive MCUs and sensors.',
    connection: 'When starter motors engage, battery voltage can drop to 6V. When alternators disconnect, inductive loads create 40V+ spikes. Automotive decoupling uses TVS diodes for protection and capacitors rated for -40°C to +125°C operation.',
    howItWorks: 'Automotive power architectures include TVS protection, reverse polarity diodes, and multi-stage filtering. AEC-Q200 qualified capacitors ensure reliability. Local decoupling at each ECU prevents noise coupling between systems.',
    stats: [
      { value: '-40 to +125°C', label: 'Temperature range', icon: '🌡️' },
      { value: 'AEC-Q200', label: 'Qualification standard', icon: '🏆' },
      { value: '6V-40V', label: 'Voltage range', icon: '🔋' }
    ],
    examples: ['Engine control units', 'ADAS sensors', 'Infotainment systems', 'Battery management'],
    companies: ['Bosch', 'Continental', 'Denso', 'Tesla'],
    futureImpact: 'Electric vehicles with 800V architectures require new approaches to decoupling and power distribution for safety and efficiency.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DecouplingCapacitorRenderer: React.FC<DecouplingCapacitorRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [capacitorValue, setCapacitorValue] = useState(100); // nF
  const [esr, setEsr] = useState(10); // mOhms
  const [loadTransient, setLoadTransient] = useState(500); // mA
  const [distanceFromIC, setDistanceFromIC] = useState(5); // mm
  const [decouplingEnabled, setDecouplingEnabled] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [transientActive, setTransientActive] = useState(false);

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

  // Animation loop - only run during phases that need it
  useEffect(() => {
    if (phase !== 'play' && phase !== 'twist_play') return;
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, [phase]);

  // Trigger transient periodically in play phase
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      const transientTimer = setInterval(() => {
        setTransientActive(true);
        setTimeout(() => setTransientActive(false), 200);
      }, 2000);
      return () => clearInterval(transientTimer);
    }
  }, [phase]);

  // Premium design colors (high contrast for accessibility)
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for electronics theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast for accessibility (brightness >= 180)
    textMuted: '#cbd5e1', // Muted text with high contrast
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
    twist_play: 'Explore Frequency',
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

  // Calculate voltage ripple based on parameters
  const calculateRipple = useCallback(() => {
    // V = I * Z where Z depends on capacitor, ESR, and trace inductance
    const traceInductance = distanceFromIC * 1; // ~1nH per mm
    const capacitanceF = capacitorValue * 1e-9; // Convert nF to F
    const esrOhms = esr / 1000; // Convert mOhm to Ohms
    const currentA = loadTransient / 1000; // Convert mA to A

    // For fast transients, inductance dominates: V = L * di/dt
    // Assume 10ns rise time for modern digital ICs
    const diDt = currentA / 10e-9; // A/s
    const inductiveVoltage = traceInductance * 1e-9 * diDt; // Convert nH to H

    // ESR contribution
    const esrVoltage = esrOhms * currentA;

    // Capacitor voltage change over transient (simplified)
    const chargeTime = 100e-9; // 100ns typical
    const capacitorVoltage = (currentA * chargeTime) / capacitanceF;

    // Total ripple (simplified model)
    let totalRipple = inductiveVoltage + esrVoltage + capacitorVoltage * 0.1;

    if (!decouplingEnabled) {
      totalRipple *= 10; // Much worse without decoupling
    }

    return Math.min(totalRipple, 3.3); // Cap at supply voltage
  }, [capacitorValue, esr, loadTransient, distanceFromIC, decouplingEnabled]);

  const voltageRipple = calculateRipple();
  const supplyVoltage = 3.3;
  const minVoltage = supplyVoltage - (transientActive ? voltageRipple : 0);
  const ripplePercent = (voltageRipple / supplyVoltage) * 100;

  // Determine IC health status
  const getICStatus = () => {
    if (ripplePercent < 5) return { status: 'healthy', color: colors.success, text: 'Stable Operation' };
    if (ripplePercent < 10) return { status: 'warning', color: colors.warning, text: 'Marginal Stability' };
    return { status: 'critical', color: colors.error, text: 'Risk of Malfunction' };
  };

  const icStatus = getICStatus();

  // IC and Decoupling Visualization SVG Component
  const ICVisualization = ({ showDecoupling = true, interactive = false }: { showDecoupling?: boolean; interactive?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const viewBox = `0 0 ${width} ${height}`;

    // Calculate positions
    const icCenterX = width / 2;
    const icCenterY = height * 0.3;
    const icSize = isMobile ? 80 : 100;

    // Capacitor position based on distance slider
    const capDistance = 30 + (distanceFromIC / 25) * (isMobile ? 60 : 80);

    // Voltage waveform area - uses significant portion of SVG
    const waveformTop = height * 0.45;
    const waveformBottom = height - 25;
    const waveformHeight = waveformBottom - waveformTop;
    const waveformWidth = isMobile ? 280 : 400;
    const waveformLeft = 50;

    // Zoomed Y-axis: map voltage range for visible droop
    // Use a range that always shows significant vertical spread
    // Zoomed Y-axis: tight range to show ripple clearly (>= 25% vertical utilization)
    const rippleDisplay = Math.max(voltageRipple, 0.1);
    const vMax = supplyVoltage + rippleDisplay * 0.3;
    const vMin = supplyVoltage - rippleDisplay * 1.3;
    const voltToY = (v: number) => {
      const frac = (v - vMin) / (vMax - vMin);
      return waveformBottom - frac * waveformHeight;
    };

    // Generate voltage waveform with visible droop
    const waveformPoints: string[] = [];
    for (let i = 0; i < 50; i++) {
      const x = waveformLeft + (i / 50) * waveformWidth;
      const t = i / 50;
      // Create a visible voltage droop in the middle region
      const droopCenter = 0.55;
      const droopWidth = 0.15;
      const droopFactor = Math.exp(-Math.pow((t - droopCenter) / droopWidth, 2));
      const droop = voltageRipple * droopFactor;
      const voltage = supplyVoltage - droop;
      const y = voltToY(voltage);
      waveformPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Interactive marker: shows current operating point at droop
    const markerX = waveformLeft + 0.55 * waveformWidth;
    const markerVoltage = supplyVoltage - voltageRipple;
    const markerY = voltToY(markerVoltage);

    return (
      <svg width="100%" height={height} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: `${width}px`, background: colors.bgCard, borderRadius: '12px' }}>
        <title>Decoupling Capacitor Circuit Visualization</title>
        <defs>
          <linearGradient id="powerTraceGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="waveformGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <radialGradient id="markerGlow">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="chipShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
          </filter>
        </defs>

        {/* Power Supply */}
        <rect x="20" y={icCenterY - 25} width="40" height="50" rx="4" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
        <text x="40" y={icCenterY - 5} fill={colors.textPrimary} fontSize="11" textAnchor="middle">VCC</text>
        <text x="40" y={icCenterY + 10} fill={colors.accent} fontSize="12" textAnchor="middle">3.3V</text>

        {/* Power trace to capacitor/IC */}
        <line x1="60" y1={icCenterY} x2={icCenterX - icSize/2 - capDistance} y2={icCenterY} stroke="url(#powerTraceGrad)" strokeWidth="3" />

        {/* Ground trace */}
        <line x1="60" y1={icCenterY + 40} x2={width - 40} y2={icCenterY + 40} stroke={colors.textMuted} strokeWidth="2" />
        <text x={width - 30} y={icCenterY + 44} fill={colors.textMuted} fontSize="11">GND</text>

        {/* Decoupling Capacitor */}
        {showDecoupling && decouplingEnabled && (
          <>
            <rect x={icCenterX - icSize/2 - capDistance - 8} y={icCenterY - 15} width="16" height="30" rx="2" fill={colors.warning} stroke={colors.textPrimary} strokeWidth="1" />
            <line x1={icCenterX - icSize/2 - capDistance} y1={icCenterY - 15} x2={icCenterX - icSize/2 - capDistance} y2={icCenterY - 25} stroke={colors.accent} strokeWidth="2" />
            <line x1={icCenterX - icSize/2 - capDistance} y1={icCenterY + 15} x2={icCenterX - icSize/2 - capDistance} y2={icCenterY + 40} stroke={colors.textMuted} strokeWidth="2" />
            <text x={icCenterX - icSize/2 - capDistance} y={icCenterY + 28} fill={colors.textSecondary} fontSize="11" textAnchor="middle">{capacitorValue}nF</text>

            {/* Capacitor charge indicator */}
            <rect
              x={icCenterX - icSize/2 - capDistance - 6}
              y={icCenterY - 13 + (transientActive ? 8 : 0)}
              width="12"
              height={26 - (transientActive ? 8 : 0)}
              fill={colors.accent}
              opacity="0.6"
              style={{ transition: 'all 0.1s' }}
            />
          </>
        )}

        {/* Power trace from cap to IC */}
        {showDecoupling && decouplingEnabled && (
          <line
            x1={icCenterX - icSize/2 - capDistance + 8}
            y1={icCenterY}
            x2={icCenterX - icSize/2 - 5}
            y2={icCenterY}
            stroke={colors.accent}
            strokeWidth="2"
            strokeDasharray={distanceFromIC > 15 ? "4 2" : "none"}
          />
        )}

        {/* Trace inductance indicator */}
        {distanceFromIC > 10 && (
          <>
            <path
              d={`M ${icCenterX - icSize/2 - capDistance/2 - 10} ${icCenterY - 35} Q ${icCenterX - icSize/2 - capDistance/2 - 5} ${icCenterY - 43} ${icCenterX - icSize/2 - capDistance/2} ${icCenterY - 35} Q ${icCenterX - icSize/2 - capDistance/2 + 5} ${icCenterY - 27} ${icCenterX - icSize/2 - capDistance/2 + 10} ${icCenterY - 35}`}
              fill="none"
              stroke={colors.warning}
              strokeWidth="1.5"
            />
            <text x={icCenterX - icSize/2 - capDistance/2} y={icCenterY - 48} fill={colors.warning} fontSize="11" textAnchor="middle">L={distanceFromIC}nH</text>
          </>
        )}

        {/* IC Chip */}
        <rect
          x={icCenterX - icSize/2}
          y={icCenterY - icSize/2}
          width={icSize}
          height={icSize}
          rx="8"
          fill={colors.bgSecondary}
          stroke={ripplePercent > 10 ? '#EF4444' : ripplePercent > 5 ? '#F59E0B' : '#10B981'}
          strokeWidth="3"
          filter="url(#chipShadow)"
          style={{ transition: 'all 0.1s' }}
        />

        {/* IC pins */}
        {[-1, 0, 1].map(i => (
          <g key={`pin-${i}`}>
            <rect x={icCenterX - icSize/2 - 8} y={icCenterY + i * 15 - 4} width="8" height="8" fill={colors.textMuted} />
            <rect x={icCenterX + icSize/2} y={icCenterY + i * 15 - 4} width="8" height="8" fill={colors.textMuted} />
          </g>
        ))}

        {/* VCC/GND pins highlighted */}
        <rect x={icCenterX - icSize/2 - 8} y={icCenterY - icSize/2 + 5} width="8" height="8" fill={colors.accent} />
        <rect x={icCenterX - icSize/2 - 8} y={icCenterY + icSize/2 - 13} width="8" height="8" fill={colors.textMuted} />

        {/* IC label */}
        <text x={icCenterX} y={icCenterY - 5} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">IC Chip</text>
        <text x={icCenterX} y={icCenterY + 12} fill={colors.textSecondary} fontSize="11" textAnchor="middle">MCU</text>

        {/* Status indicator */}
        <circle cx={icCenterX + icSize/2 - 12} cy={icCenterY - icSize/2 + 12} r="8" fill={icStatus.color} stroke="white">
          {transientActive && ripplePercent > 10 && (
            <animate attributeName="opacity" values="1;0.3;1" dur="0.2s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Formula display */}
        <text x={width - 15} y={icCenterY - icSize/2 - 5} fill={colors.accent} fontSize="13" fontWeight="700" textAnchor="end">
          V = L × di/dt
        </text>

        {/* Voltage waveform section */}
        {/* Waveform Y-axis */}
        <line x1={waveformLeft} y1={waveformTop} x2={waveformLeft} y2={waveformBottom} stroke={colors.textSecondary} strokeWidth="2" />
        {/* Waveform X-axis */}
        <line x1={waveformLeft} y1={waveformBottom} x2={waveformLeft + waveformWidth} y2={waveformBottom} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={`wgrid-${frac}`}
            x1={waveformLeft}
            y1={waveformTop + frac * waveformHeight}
            x2={waveformLeft + waveformWidth}
            y2={waveformTop + frac * waveformHeight}
            stroke={colors.border}
            strokeDasharray="3 3"
            opacity="0.5"
          />
        ))}

        {/* Y-axis label */}
        <text x={waveformLeft - 30} y={(waveformTop + waveformBottom) / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, ${waveformLeft - 30}, ${(waveformTop + waveformBottom) / 2})`}>Voltage (V)</text>

        {/* Y-axis value labels */}
        <text x={waveformLeft - 5} y={voltToY(vMax) + 4} fill="#10B981" fontSize="11" textAnchor="end">{vMax.toFixed(1)}V</text>
        <text x={waveformLeft - 5} y={voltToY((vMax + vMin) / 2) + 4} fill={colors.textSecondary} fontSize="11" textAnchor="end">{((vMax + vMin) / 2).toFixed(1)}V</text>
        <text x={waveformLeft - 5} y={voltToY(vMin) + 4} fill="#EF4444" fontSize="11" textAnchor="end">{vMin.toFixed(1)}V</text>

        {/* Safe threshold line */}
        <line x1={waveformLeft} y1={voltToY(2.7)} x2={waveformLeft + waveformWidth} y2={voltToY(2.7)} stroke="#EF4444" strokeDasharray="4 2" opacity="0.7" />
        <text x={waveformLeft + waveformWidth + 5} y={voltToY(2.7) + 4} fill="#EF4444" fontSize="11">Min safe</text>

        {/* Waveform path */}
        <path d={waveformPoints.join(' ')} fill="none" stroke="url(#waveformGrad)" strokeWidth="2.5" />

        {/* Interactive marker circle with glow */}
        <circle cx={markerX} cy={markerY} r="12" fill="url(#markerGlow)" />
        <circle cx={markerX} cy={markerY} r="8" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#glow)" />

        {/* X-axis / waveform title */}
        <text x={waveformLeft + waveformWidth / 2} y={waveformBottom + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Time — voltage ripple: {(voltageRipple * 1000).toFixed(0)}mV ({ripplePercent.toFixed(1)}%)
        </text>
      </svg>
    );
  };

  // Frequency response visualization for twist phase
  const FrequencyResponseVisualization = () => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 200 : 240;
    const viewBox = `0 0 ${width} ${height}`;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate impedance curve for different capacitor values
    const frequencies = [];
    for (let f = 1e3; f <= 1e9; f *= 1.5) {
      frequencies.push(f);
    }

    const getImpedance = (f: number, c: number, esrVal: number) => {
      const esl = 1e-9; // 1nH typical ESL
      const omega = 2 * Math.PI * f;
      const xc = 1 / (omega * c);
      const xl = omega * esl;
      const z = Math.sqrt(Math.pow(esrVal, 2) + Math.pow(xc - xl, 2));
      return z;
    };

    const capValues = [1e-9, 10e-9, 100e-9]; // 1nF, 10nF, 100nF
    const capColors = [colors.error, colors.warning, colors.success];
    const capLabels = ['1nF', '10nF', '100nF'];

    return (
      <svg width="100%" height={height} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: `${width}px`, background: colors.bgCard, borderRadius: '12px' }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <g key={`grid-${frac}`}>
            <line
              x1={padding.left}
              y1={padding.top + frac * plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + frac * plotHeight}
              stroke={colors.border}
              strokeDasharray="3,3"
            />
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Frequency (Hz)</text>
        <text x={15} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`}>Impedance (Ohms)</text>

        {/* Frequency labels */}
        {['1k', '1M', '1G'].map((label, i) => (
          <text key={label} x={padding.left + (i * plotWidth / 2)} y={padding.top + plotHeight + 15} fill={colors.textMuted} fontSize="11" textAnchor="middle">{label}</text>
        ))}

        {/* Draw curves for each capacitor value */}
        {capValues.map((c, capIndex) => {
          const points: string[] = [];
          frequencies.forEach((f, i) => {
            const z = getImpedance(f, c, esr / 1000);
            const x = padding.left + (Math.log10(f) - 3) / 6 * plotWidth;
            const y = padding.top + plotHeight - (Math.log10(z) + 3) / 6 * plotHeight;
            const clampedY = Math.max(padding.top, Math.min(padding.top + plotHeight, y));
            points.push(`${i === 0 ? 'M' : 'L'} ${x} ${clampedY}`);
          });
          return (
            <g key={`cap-${capIndex}`}>
              <path d={points.join(' ')} fill="none" stroke={capColors[capIndex]} strokeWidth="2" />
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left + 10}, ${padding.top + 5})`}>
          {capLabels.map((label, i) => (
            <g key={label} transform={`translate(${i * 60}, 0)`}>
              <rect x="0" y="0" width="20" height="3" fill={capColors[i]} />
              <text x="25" y="4" fill={colors.textSecondary} fontSize="11">{label}</text>
            </g>
          ))}
        </g>

        {/* Self-resonant frequency indicators */}
        <text x={padding.left + plotWidth - 10} y={padding.top + 20} fill={colors.accent} fontSize="11" textAnchor="end">
          Smaller caps: better at high freq
        </text>
      </svg>
    );
  };

  // Progress bar component (fixed at top)
  const renderProgressBar = () => (
    <nav style={{
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </nav>
  );

  // Fixed bottom navigation bar
  const renderNavDots = () => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
      padding: '12px 16px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    }}>
      {/* Back button */}
      <button
        onClick={() => {
          const currentIndex = phaseOrder.indexOf(phase);
          if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
        }}
        disabled={phaseOrder.indexOf(phase) === 0}
        style={{
          background: 'transparent',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '10px 16px',
          minHeight: '44px',
          color: phaseOrder.indexOf(phase) === 0 ? colors.border : colors.textSecondary,
          cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        ← Back
      </button>

      {/* Phase dots - wrapped for tap target */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '4px',
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
              minHeight: '44px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            aria-label={phaseLabels[p]}
          >
            <div style={{
              width: phase === p ? '20px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
              transition: 'all 0.3s ease',
            }} />
          </button>
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={() => {
          const currentIndex = phaseOrder.indexOf(phase);
          if (currentIndex < phaseOrder.length - 1) {
            playSound('transition');
            goToPhase(phaseOrder[currentIndex + 1]);
          }
        }}
        disabled={phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test'}
        style={{
          background: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? colors.border : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          minHeight: '44px',
          color: 'white',
          cursor: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        Next →
      </button>
    </nav>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    minHeight: '44px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingBottom: '100px',
        textAlign: 'center',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          <span role="img" aria-label="chip">🔌</span><span role="img" aria-label="capacitor">⚡</span>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Decoupling Capacitors
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why does a tiny ceramic capacitor placed 2mm closer to a chip prevent mysterious crashes? The answer reveals how <span style={{ color: colors.accent }}>local energy storage</span> saves digital circuits from power starvation."
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
            "Every digital IC is a demanding customer—it wants power NOW, not in a few nanoseconds. The power supply is too far away to respond in time."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Power Integrity Engineering Principle
          </p>
        </div>

        <div style={{ width: '80px', height: '2px', background: `rgba(6, 182, 212, 0.6)`, margin: '0 auto 24px' }} />

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Power Delivery →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The capacitor slows down the digital signals to prevent noise' },
      { id: 'b', text: 'The capacitor stores energy locally to supply instant current when the IC demands it', correct: true },
      { id: 'c', text: 'The capacitor blocks DC power and only passes AC signals' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
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
            An engineer adds a small ceramic capacitor between VCC and GND pins of a microcontroller. Random resets stop occurring. Why?
          </h2>

          {/* Simple diagram with SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '400px' }}>
              {/* Power Supply */}
              <rect x="20" y="30" width="60" height="60" rx="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
              <text x="50" y="55" fill={colors.textPrimary} fontSize="12" textAnchor="middle">VCC</text>
              <text x="50" y="75" fill={colors.accent} fontSize="14" textAnchor="middle">3.3V</text>

              {/* Arrow 1 */}
              <line x1="85" y1="60" x2="120" y2="60" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="120,55 130,60 120,65" fill={colors.textMuted} />

              {/* Capacitor */}
              <rect x="140" y="35" width="50" height="50" rx="6" fill={colors.warning + '33'} stroke={colors.warning} strokeWidth="2" />
              <text x="165" y="55" fill={colors.textPrimary} fontSize="16" textAnchor="middle">| |</text>
              <text x="165" y="72" fill={colors.textPrimary} fontSize="11" textAnchor="middle">Cap</text>

              {/* Arrow 2 */}
              <line x1="195" y1="60" x2="230" y2="60" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="230,55 240,60 230,65" fill={colors.textMuted} />

              {/* Microcontroller */}
              <rect x="250" y="25" width="80" height="70" rx="8" fill={colors.accent + '33'} stroke={colors.accent} strokeWidth="2" />
              <rect x="265" y="40" width="50" height="40" rx="4" fill={colors.bgSecondary} />
              <text x="290" y="65" fill={colors.textPrimary} fontSize="11" textAnchor="middle">MCU</text>

              {/* Labels */}
              <text x="50" y="110" fill={colors.textMuted} fontSize="11" textAnchor="middle">Power Supply</text>
              <text x="165" y="110" fill={colors.textMuted} fontSize="11" textAnchor="middle">Capacitor</text>
              <text x="290" y="110" fill={colors.textMuted} fontSize="11" textAnchor="middle">Microcontroller</text>
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
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Decoupling Simulation
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Stabilize the Power Supply
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            This visualization displays how the decoupling capacitor affects voltage stability at the IC pins.
            Try adjusting the sliders and observe how each parameter impacts the waveform.
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            Voltage ripple is calculated as V = L × di/dt. When you increase distance, trace inductance causes larger voltage drops.
            When you decrease capacitance, the local energy reservoir is the measure of how quickly power can be delivered.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ICVisualization showDecoupling={true} interactive={true} />
            </div>

            {/* Decoupling toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>No Decoupling</span>
              <button
                onClick={() => setDecouplingEnabled(!decouplingEnabled)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: decouplingEnabled ? colors.success : colors.border,
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
                  left: decouplingEnabled ? '33px' : '3px',
                  transition: 'left 0.3s',
                }} />
              </button>
              <span style={{ ...typo.small, color: decouplingEnabled ? colors.success : colors.textSecondary, fontWeight: decouplingEnabled ? 600 : 400 }}>
                Decoupling Enabled
              </span>
            </div>

            {/* Capacitor Value slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Capacitor Value</span>
                <span style={{ height: '20px', ...typo.small, color: colors.accent, fontWeight: 600 }}>{capacitorValue}nF</span>
              </div>
              <input
                type="range"
                min="1"
                max="1000"
                step="10"
                value={capacitorValue}
                onChange={(e) => setCapacitorValue(parseInt(e.target.value))}
                disabled={!decouplingEnabled}
                style={{ touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                  background: `linear-gradient(to right, ${colors.accent} ${(capacitorValue / 1000) * 100}%, ${colors.border} ${(capacitorValue / 1000) * 100}%)`,
                  cursor: decouplingEnabled ? 'pointer' : 'not-allowed',
                  opacity: decouplingEnabled ? 1 : 0.5,
                }}
              />
            </div>

            {/* Distance from IC slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Distance from IC</span>
                <span style={{ ...typo.small, color: distanceFromIC > 15 ? colors.warning : colors.success, fontWeight: 600 }}>
                  {distanceFromIC}mm ({distanceFromIC}nH inductance)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={distanceFromIC}
                onChange={(e) => setDistanceFromIC(parseInt(e.target.value))}
                disabled={!decouplingEnabled}
                style={{ touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                  cursor: decouplingEnabled ? 'pointer' : 'not-allowed',
                  opacity: decouplingEnabled ? 1 : 0.5,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.success }}>Close (1mm)</span>
                <span style={{ ...typo.small, color: colors.warning }}>Far (25mm)</span>
              </div>
            </div>

            {/* Load Transient slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Load Current Transient</span>
                <span style={{ ...typo.small, color: loadTransient > 700 ? colors.error : colors.accent, fontWeight: 600 }}>
                  {loadTransient}mA
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={loadTransient}
                onChange={(e) => setLoadTransient(parseInt(e.target.value))}
                style={{ touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                }}
              />
            </div>

            {/* Status display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: icStatus.color }}>{(voltageRipple * 1000).toFixed(0)}mV</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Voltage Ripple</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: ripplePercent < 5 ? colors.success : ripplePercent < 10 ? colors.warning : colors.error }}>
                  {ripplePercent.toFixed(1)}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>% of VCC</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: icStatus.color }}>
                  {icStatus.text}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>IC Status</div>
              </div>
            </div>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Real-world relevance:</strong> Every smartphone, computer, and electronic device uses decoupling capacitors to ensure stable power delivery. Without proper decoupling, processors would crash, sensors would give false readings, and wireless chips would fail to connect.
            </p>
          </div>

          {/* Discovery prompt */}
          {ripplePercent < 5 && decouplingEnabled && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Excellent! Low ripple achieved. Notice how placement and capacitor value both matter.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionCorrect = prediction === 'b';
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Local Energy Storage Matters
          </h2>

          {/* Reference user's prediction */}
          <div style={{
            background: predictionCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${predictionCorrect ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: predictionCorrect ? colors.success : colors.warning, margin: 0 }}>
              {prediction
                ? (predictionCorrect
                  ? "Your prediction was correct! The capacitor does store energy locally to supply instant current."
                  : "Your prediction highlighted a common misconception. Let's see why the correct answer is about local energy storage.")
                : "As you observed in the experiment, the result shows that your prediction about decoupling is key to understanding power integrity."}
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
                <strong style={{ color: colors.textPrimary }}>The Problem: Power Supply is Too Far Away</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When a digital IC switches states, it demands current <span style={{ color: colors.accent }}>instantly</span>—within nanoseconds.
                But the power supply might be centimeters away. This causes voltage drops because at high frequencies, even short traces act as inductors.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>V = L × di/dt</strong>
              </p>
              <p>
                A 10nH trace inductance with 100mA/ns current change creates a <span style={{ color: colors.error }}>1V voltage drop</span>—enough
                to crash a 3.3V microcontroller!
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
              The Solution: Local Energy Reservoir
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A decoupling capacitor placed <strong>right at the IC pins</strong> acts as a local battery.
              It supplies the instant current demand while the power supply "catches up."
              The closer the capacitor, the lower the inductance, and the faster it can respond.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📏</div>
              <h4 style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Placement Matters</h4>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                Every mm of trace adds ~1nH. Place capacitors as close as possible to IC power pins.
              </p>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
              <h4 style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>ESR and ESL</h4>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                Real capacitors have parasitic resistance (ESR) and inductance (ESL) that limit performance.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Frequency Effects →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Bigger capacitors are always better—use the largest value possible' },
      { id: 'b', text: 'Different capacitor values are needed for different frequencies', correct: true },
      { id: 'c', text: 'Capacitor value doesn\'t matter as long as placement is correct' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Frequency Response
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A 100MHz digital system shows power noise even with 100uF bulk capacitors. Adding small 0.1uF ceramics helps. Why?
          </h2>

          {/* Static frequency diagram */}
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '400px' }}>
              <title>Capacitor Frequency Response</title>
              <text x="200" y="15" fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">Impedance vs Frequency</text>
              {/* Axes */}
              <line x1="50" y1="100" x2="370" y2="100" stroke={colors.textSecondary} strokeWidth="2" />
              <line x1="50" y1="25" x2="50" y2="100" stroke={colors.textSecondary} strokeWidth="2" />
              <text x="210" y="115" fill={colors.textMuted} fontSize="11" textAnchor="middle">Frequency (Hz)</text>
              <text x="15" y="65" fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90, 15, 65)">Z (Ohms)</text>
              {/* Bulk cap curve - high impedance at high freq */}
              <path d="M 60 90 L 100 80 L 140 55 L 180 40 L 220 50 L 260 65 L 300 80 L 340 90" fill="none" stroke="#EF4444" strokeWidth="2" />
              <text x="350" y="93" fill="#EF4444" fontSize="11">100uF</text>
              {/* Small cap curve - high impedance at low freq */}
              <path d="M 60 35 L 100 50 L 140 65 L 180 78 L 220 65 L 260 50 L 300 35 L 340 28" fill="none" stroke="#10B981" strokeWidth="2" />
              <text x="350" y="30" fill="#10B981" fontSize="11">0.1uF</text>
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
              See the Frequency Response →
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Capacitor Frequency Response
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Each capacitor has a "sweet spot" frequency where impedance is lowest
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <FrequencyResponseVisualization />
            </div>

            {/* ESR slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Capacitor ESR</span>
                <span style={{ ...typo.small, color: esr > 50 ? colors.warning : colors.success, fontWeight: 600 }}>
                  {esr} mOhm
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={esr}
                onChange={(e) => setEsr(parseInt(e.target.value))}
                style={{ touchAction: 'pan-y',
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.success }}>Low ESR (MLCC)</span>
                <span style={{ ...typo.small, color: colors.warning }}>High ESR (Electrolytic)</span>
              </div>
            </div>

            {/* Explanation cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.success}`,
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>100nF</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Low freq: 1kHz-10MHz</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.warning}`,
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>10nF</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Mid freq: 10MHz-100MHz</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.error}`,
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>1nF</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>High freq: 100MHz-1GHz</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Multi-Value Strategy →
          </button>
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
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Art of Decoupling Network Design
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔋</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Bulk Capacitors (10uF - 1000uF)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Handle <span style={{ color: colors.success }}>low-frequency</span> transients and power-up surges.
                Typically electrolytic or large ceramics near the power input.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Local Decoupling (100nF - 1uF)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Standard ceramic capacitors at each IC. Handle <span style={{ color: colors.warning }}>mid-range frequencies</span> from
                digital switching. Place as close to power pins as possible.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>High-Frequency Decoupling (1nF - 100pF)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Small ceramics for <span style={{ color: colors.error }}>high-speed signals</span> and GHz noise.
                Essential for RF circuits, FPGAs, and high-speed interfaces.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Design Strategy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Use <strong>multiple capacitor values</strong> in parallel to create a low-impedance path across
                all frequencies. Combine bulk storage, local decoupling, and high-frequency filtering for complete coverage.
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} explored)
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
                How Decoupling Connects:
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
          </div>

          {/* Got It button for current app */}
          {!completedApps[selectedApp] ? (
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{ ...primaryButtonStyle, width: '100%', marginBottom: '16px' }}
            >
              Got It! Mark as Explored
            </button>
          ) : (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
                Application explored. {allAppsCompleted ? 'All applications completed!' : `${realWorldApps.length - completedCount} more to explore.`}
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
          padding: '24px',
          paddingBottom: '100px',
          overflowY: 'auto',
          flex: 1,
          paddingTop: '48px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {passed
                ? 'You\'ve mastered Decoupling Capacitors!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const isCorrect = testAnswers[i] === correctId;
                return (
                  <div key={i} style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCorrect ? colors.success : colors.error,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}>
                    {isCorrect ? '✓' : '✗'}
                  </div>
                );
              })}
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '32px' }}>
              Your answer review: {testScore} correct answers out of 10
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
              <a
                href="/"
                style={{
                  padding: '14px 28px',
                  minHeight: '44px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
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

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '100px',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
                  minHeight: '44px',
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
                  minHeight: '44px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
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
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  minHeight: '44px',
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

        {renderNavDots()}
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingBottom: '100px',
        textAlign: 'center',
        overflowY: 'auto',
        flex: 1,
        paddingTop: '48px',
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
          Decoupling Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how decoupling capacitors provide local energy storage for stable power delivery in electronic circuits.
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
              'Why ICs need local energy reservoirs',
              'How trace inductance causes voltage drops',
              'The importance of capacitor placement',
              'Different capacitor values for different frequencies',
              'ESR, ESL, and real-world design tradeoffs',
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
              minHeight: '44px',
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

export default DecouplingCapacitorRenderer;
